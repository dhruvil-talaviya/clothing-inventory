const express = require('express');
const router = express.Router();

// FIX: Changed 'Discount' to 'discount' to match your actual filename!
const Discount = require('../models/Discount');

// GET ALL OFFERS
router.get('/', async (req, res) => {
    try {
        const discounts = await Discount.find().sort({ createdAt: -1 });
        res.json(discounts);
    } catch (err) {
        res.status(500).json({ message: "Error fetching coupons" });
    }
});

// CREATE NEW OFFER
router.post('/', async (req, res) => {
    try {
        const { name, code, discountPercent, minOrderValue, validUntil } = req.body;

        // Translation: Mapping Frontend -> Database fields
        const newDiscount = new Discount({
            description: name,           // 'name' becomes 'description'
            code: code.toUpperCase(),
            value: Number(discountPercent), // 'discountPercent' becomes 'value'
            minOrder: Number(minOrderValue), // 'minOrderValue' becomes 'minOrder'
            validUntil: validUntil
        });

        await newDiscount.save();
        res.status(201).json({ success: true, message: "Coupon created successfully!" });
    } catch (err) {
        console.error("Save Error:", err);
        // Specifically check for duplicate code (Error 11000)
        if (err.code === 11000) {
            return res.status(400).json({ message: "This coupon code already exists!" });
        }
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
});

// DELETE OFFER
router.delete('/:id', async (req, res) => {
    try {
        await Discount.findByIdAndDelete(req.params.id);
        res.json({ message: "Coupon deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
});

module.exports = router;