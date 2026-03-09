const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { Product, Sale, User } = require('../models/Schemas');

// ─── MULTER SETUP (profile photo uploads) ────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `staff_${req.params.id}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        const validExt  = allowed.test(path.extname(file.originalname).toLowerCase());
        const validMime = allowed.test(file.mimetype);
        if (validExt && validMime) cb(null, true);
        else cb(new Error('Only JPG, PNG, WEBP images are allowed'));
    }
});

// ─── 1. GET ALL PRODUCTS ──────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find({ isAvailable: true, stock: { $gt: 0 } });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Error fetching products" });
    }
});

// ─── 2. CREATE NEW SALE ───────────────────────────────────────────────────────
router.post('/create-sale', async (req, res) => {
    try {
        const {
            items,
            soldBy,
            staffId,
            staffName,
            customerName, customerPhone, customerAddress, storeLocation,
            subtotal, discount, totalAmount
        } = req.body;

        if (!soldBy || !items || items.length === 0) {
            return res.status(400).json({ message: "Invalid sale data. Check items and staff ID." });
        }

        // Check stock availability BEFORE processing
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${item.name}` });
            }
        }

        // Deduct stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }

        const newSale = new Sale({
            invoiceId:       `INV-${Date.now().toString().slice(-6).toUpperCase()}`,
            items,
            soldBy:          soldBy.toString(),
            staffId:         staffId   || 'N/A',
            staffName:       staffName || 'Staff',
            customerName:    customerName || 'Walk-in Customer',
            customerPhone,
            customerAddress,
            storeLocation,
            subtotal,
            discount,
            totalAmount,
            date: new Date()
        });

        await newSale.save();
        res.status(201).json({ message: "Sale successful", sale: newSale });

    } catch (err) {
        console.error("Sale Transaction Error:", err);
        res.status(500).json({ message: "Checkout Failed: " + err.message });
    }
});

// ─── 3. GET DAILY STATS ───────────────────────────────────────────────────────
router.get('/daily-stats/:staffId', async (req, res) => {
    try {
        const { staffId } = req.params;
        const start = new Date(); start.setHours(0,  0,  0,   0);
        const end   = new Date(); end.setHours(23,  59, 59, 999);

        const todaySales = await Sale.find({
            $or: [{ soldBy: staffId }, { staffId: staffId }],
            date: { $gte: start, $lte: end }
        });

        const revenue = todaySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
        res.json({ revenue, count: todaySales.length });
    } catch (err) {
        res.status(500).json({ revenue: 0, count: 0 });
    }
});

// ─── 4. GET FULL SALES HISTORY ────────────────────────────────────────────────
router.get('/history/:staffId', async (req, res) => {
    try {
        const { staffId } = req.params;
        const history = await Sale.find({
            $or: [{ soldBy: staffId }, { staffId: staffId }]
        }).sort({ date: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json([]);
    }
});

// ─── 5. UPDATE PROFILE (with optional photo upload) ───────────────────────────
router.put('/profile/:id', upload.single('photo'), async (req, res) => {
    try {
        const { name, phone, address, email, city } = req.body;
        const userId = req.params.id;

        // Build update object — only include fields that were actually sent
        const updateData = {};
        if (name    !== undefined) updateData.name    = name.trim();
        if (phone   !== undefined) updateData.phone   = phone.trim();
        if (address !== undefined) updateData.address = address.trim();
        if (email   !== undefined) updateData.email   = email.trim();
        if (city    !== undefined) updateData.city    = city.trim();

        // If a new photo was uploaded, save its public URL
        if (req.file) {
            updateData.photo = `http://localhost:5001/uploads/${req.file.filename}`;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password'); // never return hashed password

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id:         updatedUser._id,
                name:       updatedUser.name       || '',
                email:      updatedUser.email      || '',
                phone:      updatedUser.phone      || '',
                address:    updatedUser.address    || '',
                city:       updatedUser.city       || '',
                photo:      updatedUser.photo      || '',
                employeeId: updatedUser.employeeId || '',
                role:       updatedUser.role,
            }
        });

    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: err.message || 'Failed to update profile' });
    }
});

// ─── 6. CHANGE PASSWORD (security tab — requires current password) ────────────
router.post('/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        console.log(`✅ Password changed for: ${user.employeeId}`);
        res.json({ success: true, message: 'Password changed successfully.' });

    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

module.exports = router;