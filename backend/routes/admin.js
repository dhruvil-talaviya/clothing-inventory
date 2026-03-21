const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const { User, Product, Sale } = require('../models/Schemas');
const Discount = require('../models/discount');
const Event    = require('../models/Event');

// ─── MULTER SETUP ────────────────
// Saves uploaded product images to /uploads/products/
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `product-${unique}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext  = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Helper: build public image URL from saved filename
const imageUrl = (req, filename) =>
    filename ? `${req.protocol}://${req.get('host')}/uploads/products/${filename}` : null;

// ===============================
// 1️⃣ DASHBOARD STATS
// ===============================
router.get('/stats', async (req, res) => {
    try {
        const totalRevenueAgg = await Sale.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: { $ifNull: ['$totalAmount', 0] } },
                },
            },
        ]);

        const totalRevenue  = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;
        const salesCount    = await Sale.countDocuments();
        const productsCount = await Product.countDocuments();

        const chartData = await Sale.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: { $ifNull: ['$date', '$createdAt'] },
                        },
                    },
                    revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                    sales:   { $sum: 1 },
                },
            },
            { $sort: { _id: -1 } },
            { $limit: 10 },
        ]);

        res.json({
            revenue: totalRevenue,
            salesCount,
            productsCount,
            chartData: chartData.reverse().map(d => ({
                date:    d._id,
                revenue: d.revenue,
                sales:   d.sales,
            })),
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ message: 'Error loading dashboard stats' });
    }
});

// ===============================
// 2️⃣ SALES HISTORY
// ===============================
router.get('/sales-history', async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('soldBy', 'name employeeId')
            .sort({ date: -1, createdAt: -1 });

        const formattedSales = sales.map(sale => ({
            _id:           sale._id,
            invoiceId:     sale.invoiceId,
            date:          sale.date || sale.createdAt,
            staffId:       sale.staffId   || sale.soldBy?.employeeId || 'N/A',
            staffName:     sale.staffName || sale.soldBy?.name       || 'N/A',
            customerName:  sale.customerName  || 'Walk-in',
            customerPhone: sale.customerPhone || '--',
            items:         sale.items    || [],
            subtotal:      sale.subtotal || 0,
            discount:      sale.discount || 0,
            totalAmount:   sale.totalAmount  || 0,
            couponApplied: sale.discount > 0,
        }));

        res.json(formattedSales);
    } catch (err) {
        console.error('Sales History Error:', err);
        res.status(500).json({ message: 'Failed to load sales history' });
    }
});

// ===============================
// 3️⃣ STAFF MANAGEMENT
// ===============================
router.get('/staff', async (req, res) => {
    try {
        const staff = await User.find({ role: 'staff' })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching staff list' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// REPLACE your existing router.post('/add-staff') in admin.js with this:
// ─────────────────────────────────────────────────────────────────────────────

router.post('/add-staff', async (req, res) => {
    try {
        const { name, username, employeeId, email, password, phone } = req.body;
        const finalName = name || username;

        // ── Validate required fields ──────────────────────────────────────────
        if (!finalName)    return res.status(400).json({ message: 'Name is required.' });
        if (!employeeId)   return res.status(400).json({ message: 'Employee ID is required.' });
        if (!email)        return res.status(400).json({ message: 'Email is required.' });
        if (!password)     return res.status(400).json({ message: 'Password is required.' });
        if (!phone)        return res.status(400).json({ message: 'Phone number is required.' });
        if (!/^\d{10}$/.test(phone.toString().trim()))
            return res.status(400).json({ message: 'Enter a valid 10-digit phone number.' });

        // ── Check uniqueness ──────────────────────────────────────────────────
        const existingUser = await User.findOne({
            $or: [{ employeeId }, { email }, { phone: phone.toString().trim() }]
        });
        if (existingUser) {
            if (existingUser.employeeId === employeeId)
                return res.status(400).json({ message: 'Employee ID already exists.' });
            if (existingUser.email === email)
                return res.status(400).json({ message: 'Email already exists.' });
            if (existingUser.phone === phone.toString().trim())
                return res.status(400).json({ message: 'Phone number already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStaff = new User({
            name:         finalName,
            employeeId,
            email,
            phone:        phone.toString().trim(),   // ← required for OTP login
            password:     hashedPassword,
            role:         'staff',
            isActive:     true,
            isFirstLogin: true,
        });

        await newStaff.save();
        res.status(201).json({ message: 'Staff Account Created Successfully' });

    } catch (err) {
        console.error('Create Staff Error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ── ADMIN PROFILE UPDATE (missing — AdminSettings.jsx calls this) ──
router.put('/profile/:id', async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.params.id;

        if (!name || !name.trim())
            return res.status(400).json({ message: 'Name cannot be empty.' });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { name: name.trim(), email: email?.trim() || '' } },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser)
            return res.status(404).json({ message: 'User not found.' });

        res.json({
            message: 'Profile updated successfully',
            user: {
                id:         updatedUser._id,
                name:       updatedUser.name       || '',
                email:      updatedUser.email      || '',
                phone:      updatedUser.phone      || '',
                employeeId: updatedUser.employeeId || '',
                role:       updatedUser.role,
            }
        });
    } catch (err) {
        console.error('Admin profile update error:', err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

router.put('/staff-status/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isActive = !user.isActive;
        await user.save();
        res.json({ message: 'Status updated', isActive: user.isActive });
    } catch (err) {
        console.error('Toggle Status Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.delete('/delete-staff/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Staff account permanently deleted.' });
    } catch (err) {
        console.error('Delete Staff Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ===============================
// 4️⃣ INVENTORY & PRODUCTS
// ===============================
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── ADD PRODUCT (supports image upload via multipart/form-data) ──
router.post('/add-product', upload.single('image'), async (req, res) => {
    try {
        // variants comes as a JSON string when sent via FormData
        let variants = req.body.variants;
        if (typeof variants === 'string') {
            try { variants = JSON.parse(variants); } catch { variants = []; }
        }

        const computedTotal = Array.isArray(variants) && variants.length > 0
            ? variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
            : Number(req.body.stock || 0);

        const productData = {
            name:        req.body.name,
            category:    req.body.category,
            price:       Number(req.body.price       || 0),
            costPrice:   Number(req.body.costPrice   || 0),
            color:       req.body.color        || '',
            description: req.body.description  || '',
            sku:         req.body.sku          || '',
            stock:       computedTotal,
            totalStock:  computedTotal,
            isAvailable: req.body.isAvailable !== 'false',
            ...(Array.isArray(variants) && variants.length > 0 && { variants }),
        };

        // Attach image URL if a file was uploaded
        if (req.file) {
            productData.image = imageUrl(req, req.file.filename);
        }

        const newProduct = new Product(productData);
        await newProduct.save();
        res.json({ message: 'Product Added', product: newProduct });
    } catch (err) {
        // If multer threw a file-type/size error
        if (err.message && err.message.includes('Only image')) {
            return res.status(400).json({ message: err.message });
        }
        console.error('Add Product Error:', err);
        res.status(500).json({ message: 'Error adding product' });
    }
});

// ── EDIT PRODUCT (supports image upload / removal via multipart/form-data) ──
router.put('/edit-product/:id', upload.single('image'), async (req, res) => {
    try {
        let variants = req.body.variants;
        if (typeof variants === 'string') {
            try { variants = JSON.parse(variants); } catch { variants = []; }
        }

        const computedTotal = Array.isArray(variants) && variants.length > 0
            ? variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
            : Number(req.body.stock || 0);

        const updatePayload = {
            name:        req.body.name,
            category:    req.body.category,
            price:       Number(req.body.price       || 0),
            costPrice:   Number(req.body.costPrice   || 0),
            color:       req.body.color        || '',
            description: req.body.description  || '',
            sku:         req.body.sku          || '',
            stock:       computedTotal,
            totalStock:  computedTotal,
            ...(Array.isArray(variants) && { variants }),
            ...(req.body.isAvailable !== undefined && {
                isAvailable: req.body.isAvailable !== 'false',
            }),
        };

        // New image uploaded → save URL and delete old file
        if (req.file) {
            updatePayload.image = imageUrl(req, req.file.filename);

            // Delete old image from disk if it exists
            const existing = await Product.findById(req.params.id).select('image');
            if (existing?.image) {
                const oldFilename = existing.image.split('/uploads/products/')[1];
                if (oldFilename) {
                    const oldPath = path.join(uploadDir, oldFilename);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }
        }

        // Frontend signalled to remove image (user clicked Remove)
        if (req.body.removeImage === 'true') {
            updatePayload.image = null;

            const existing = await Product.findById(req.params.id).select('image');
            if (existing?.image) {
                const oldFilename = existing.image.split('/uploads/products/')[1];
                if (oldFilename) {
                    const oldPath = path.join(uploadDir, oldFilename);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updatePayload,
            { new: true, runValidators: true }
        );

        if (!updatedProduct)
            return res.status(404).json({ message: 'Product not found' });

        res.json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (err) {
        if (err.message && err.message.includes('Only image')) {
            return res.status(400).json({ message: err.message });
        }
        console.error('Edit Product Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/product-status/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        product.isAvailable = product.isAvailable === false ? true : false;
        await product.save();
        res.json({ message: 'Visibility updated', isAvailable: product.isAvailable });
    } catch (err) {
        console.error('Product Status Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.delete('/delete-product/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct)
            return res.status(404).json({ message: 'Product not found' });

        // Delete associated image from disk
        if (deletedProduct.image) {
            const filename = deletedProduct.image.split('/uploads/products/')[1];
            if (filename) {
                const filePath = path.join(uploadDir, filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Delete Product Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/discounts', async (req, res) => {
    try {
        const discounts = await Discount.find().sort({ createdAt: -1 });
        res.json(discounts);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// ===============================
// 5️⃣ EVENTS MANAGEMENT
// ===============================
const computeEventStatus = (event) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = event.startDate ? new Date(event.startDate) : (event.date ? new Date(event.date) : null);
    const end   = event.endDate   ? new Date(event.endDate)   : start;

    if (!start) return 'Upcoming';

    const startDay = new Date(start); startDay.setHours(0, 0, 0, 0);
    const endDay   = new Date(end);   endDay.setHours(0, 0, 0, 0);

    if (today < startDay) return 'Upcoming';
    if (today > endDay)   return 'Completed';
    return 'Active';
};

const formatEvent = (event) => {
    const obj = event.toObject ? event.toObject() : { ...event };
    obj.status = computeEventStatus(obj);
    return obj;
};

router.get('/events', async (req, res) => {
    try {
        const events = await Event.find().sort({ startDate: 1, date: 1 });
        res.json(events.map(formatEvent));
    } catch (err) {
        res.status(500).json({ message: 'Failed to load events' });
    }
});

router.post('/events', async (req, res) => {
    try {
        const { title, startDate, endDate, location, description, saleOffer } = req.body;

        if (!title || !startDate || !endDate)
            return res.status(400).json({ message: 'Title, start date and end date are required' });

        if (new Date(endDate) < new Date(startDate))
            return res.status(400).json({ message: 'End date cannot be before start date' });

        const newEvent = new Event({
            title,
            startDate:   new Date(startDate),
            endDate:     new Date(endDate),
            date:        new Date(startDate),
            location:    location || 'In-Store',
            description,
            saleOffer:   saleOffer || '',
        });

        await newEvent.save();
        res.status(201).json(formatEvent(newEvent));
    } catch (err) {
        console.error('Create Event Error:', err);
        res.status(500).json({ message: 'Failed to create event' });
    }
});

router.put('/events/:id', async (req, res) => {
    try {
        const { title, startDate, endDate, location, description, saleOffer } = req.body;

        if (startDate && endDate && new Date(endDate) < new Date(startDate))
            return res.status(400).json({ message: 'End date cannot be before start date' });

        const updatePayload = {
            ...(title       && { title }),
            ...(startDate   && { startDate: new Date(startDate), date: new Date(startDate) }),
            ...(endDate     && { endDate:   new Date(endDate) }),
            ...(location    && { location }),
            ...(description !== undefined && { description }),
            ...(saleOffer   !== undefined && { saleOffer }),
        };

        const updated = await Event.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
        if (!updated) return res.status(404).json({ message: 'Event not found' });
        res.json(formatEvent(updated));
    } catch (err) {
        console.error('Update Event Error:', err);
        res.status(500).json({ message: 'Failed to update event' });
    }
});

router.delete('/events/:id', async (req, res) => {
    try {
        const deleted = await Event.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete event' });
    }
});

// ─── UPDATE ADMIN PROFILE (name, email, phone) ───────────────────────────────
// Add this route to your existing routes/admin.js file
// PUT /api/admin/profile/:id

router.put('/profile/:id', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const { id } = req.params;

        if (!name?.trim())
            return res.status(400).json({ message: 'Name is required.' });

        if (phone && !/^\d{10}$/.test(phone.toString().trim()))
            return res.status(400).json({ message: 'Enter a valid 10-digit phone number.' });

        const updateFields = {
            name:  name.trim(),
            email: email?.trim() || '',
            phone: phone?.trim() || '',
        };

        const user = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        );

        if (!user)
            return res.status(404).json({ message: 'User not found.' });

        console.log(`✅ Profile updated for: ${user.employeeId || user.name}`);

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            user: {
                id:         user._id,
                name:       user.name,
                email:      user.email      || '',
                phone:      user.phone      || '',
                employeeId: user.employeeId || '',
                role:       user.role,
            }
        });

    } catch (err) {
        console.error('🔥 Profile update error:', err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

module.exports = router;