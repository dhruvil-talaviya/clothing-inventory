const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Product, Sale } = require('../models/Schemas');
const Discount = require('../models/discount');
const Event = require('../models/Event');

// ===============================
// 1️⃣ DASHBOARD STATS
// ===============================
router.get('/stats', async (req, res) => {
    try {
        const totalRevenueAgg = await Sale.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: { $ifNull: ["$totalAmount", 0] } }
                }
            }
        ]);

        const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;
        const salesCount = await Sale.countDocuments();
        const productsCount = await Product.countDocuments();

        const chartData = await Sale.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $ifNull: ["$date", "$createdAt"] }
                        }
                    },
                    revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
                    sales: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            revenue: totalRevenue,
            salesCount,
            productsCount,
            chartData: chartData.reverse().map(d => ({
                date: d._id,
                revenue: d.revenue,
                sales: d.sales
            }))
        });

    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ message: "Error loading dashboard stats" });
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
            _id: sale._id,
            invoiceId: sale.invoiceId,
            date: sale.date || sale.createdAt,
            staffId:   sale.staffId   || sale.soldBy?.employeeId || "N/A",
            staffName: sale.staffName || sale.soldBy?.name       || "N/A",
            customerName:  sale.customerName  || "Walk-in",
            customerPhone: sale.customerPhone || "--",
            items:    sale.items    || [],
            subtotal: sale.subtotal || 0,
            discount: sale.discount || 0,
            totalAmount:  sale.totalAmount  || 0,
            couponApplied: sale.discount > 0
        }));

        res.json(formattedSales);

    } catch (err) {
        console.error("Sales History Error:", err);
        res.status(500).json({ message: "Failed to load sales history" });
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
        res.status(500).json({ message: "Error fetching staff list" });
    }
});

router.post('/add-staff', async (req, res) => {
    try {
        const { name, username, employeeId, email, password } = req.body;
        const finalName = name || username;

        if (!finalName || !employeeId || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ $or: [{ employeeId }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "Employee ID or Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStaff = new User({
            name: finalName,
            employeeId,
            email,
            password: hashedPassword,
            role: 'staff',
            isActive: true,
            isFirstLogin: true
        });

        await newStaff.save();
        res.status(201).json({ message: "Staff Account Created Successfully" });

    } catch (err) {
        console.error("Create Staff Error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.put('/staff-status/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isActive = !user.isActive;
        await user.save();

        res.json({ message: "Status updated", isActive: user.isActive });
    } catch (err) {
        console.error("Toggle Status Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

router.delete('/delete-staff/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: "User not found" });

        res.json({ message: "Staff account permanently deleted." });
    } catch (err) {
        console.error("Delete Staff Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ===============================
// 4️⃣ INVENTORY & DISCOUNTS
// ===============================
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

router.post('/add-product', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.json({ message: "Product Added", product: newProduct });
    } catch (err) {
        console.error("Add Product Error:", err);
        res.status(500).json({ message: "Error adding product" });
    }
});

router.put('/edit-product/:id', async (req, res) => {
    try {
        const { name, sku, category, costPrice, price, stock } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { name, sku, category, costPrice, price, stock },
            { new: true }
        );
        if (!updatedProduct) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product updated successfully", product: updatedProduct });
    } catch (err) {
        console.error("Edit Product Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

router.put('/product-status/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        product.isAvailable = product.isAvailable === false ? true : false;
        await product.save();

        res.json({ message: "Visibility updated", isAvailable: product.isAvailable });
    } catch (err) {
        console.error("Product Status Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

router.delete('/delete-product/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error("Delete Product Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

router.get('/discounts', async (req, res) => {
    try {
        const discounts = await Discount.find().sort({ createdAt: -1 });
        res.json(discounts);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// ===============================
// 5️⃣ EVENTS MANAGEMENT
// ===============================

// Helper: compute live status from startDate + endDate (never stored)
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

// Format event for response — always attaches computed live status
const formatEvent = (event) => {
    const obj = event.toObject ? event.toObject() : { ...event };
    obj.status = computeEventStatus(obj);   // ✅ always live, never stale
    return obj;
};

// GET all events — sorted by startDate ascending (upcoming first)
router.get('/events', async (req, res) => {
    try {
        const events = await Event.find().sort({ startDate: 1, date: 1 });
        res.json(events.map(formatEvent));
    } catch (err) {
        res.status(500).json({ message: "Failed to load events" });
    }
});

// POST create event — only saves startDate, endDate, and content fields
router.post('/events', async (req, res) => {
    try {
        const { title, startDate, endDate, location, description, saleOffer } = req.body;

        if (!title || !startDate || !endDate) {
            return res.status(400).json({ message: "Title, start date and end date are required" });
        }

        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ message: "End date cannot be before start date" });
        }

        const newEvent = new Event({
            title,
            startDate: new Date(startDate),
            endDate:   new Date(endDate),
            // Keep legacy date field = startDate for backward compat
            date:      new Date(startDate),
            location:  location || 'In-Store',
            description,
            saleOffer:  saleOffer || '',
        });

        await newEvent.save();
        res.status(201).json(formatEvent(newEvent));
    } catch (err) {
        console.error("Create Event Error:", err);
        res.status(500).json({ message: "Failed to create event" });
    }
});

// PUT update event
router.put('/events/:id', async (req, res) => {
    try {
        const { title, startDate, endDate, location, description, saleOffer } = req.body;

        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ message: "End date cannot be before start date" });
        }

        const updatePayload = {
            ...(title       && { title }),
            ...(startDate   && { startDate: new Date(startDate), date: new Date(startDate) }),
            ...(endDate     && { endDate:   new Date(endDate) }),
            ...(location    && { location }),
            ...(description !== undefined && { description }),
            ...(saleOffer   !== undefined && { saleOffer }),
        };

        const updated = await Event.findByIdAndUpdate(
            req.params.id,
            updatePayload,
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Event not found" });
        res.json(formatEvent(updated));
    } catch (err) {
        console.error("Update Event Error:", err);
        res.status(500).json({ message: "Failed to update event" });
    }
});

// DELETE event
router.delete('/events/:id', async (req, res) => {
    try {
        const deleted = await Event.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Event not found" });
        res.json({ message: "Event deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete event" });
    }
});

module.exports = router;