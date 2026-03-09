const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/Schemas');

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        console.log("🔹 Login Request:", req.body);

        const inputId   = req.body.loginId || req.body.email;
        const inputPass = req.body.password;

        if (!inputId || !inputPass) {
            return res.status(400).json({ message: "Please enter ID and Password" });
        }

        const user = await User.findOne({
            $or: [
                { email:      { $regex: new RegExp(`^${inputId}$`, 'i') } },
                { employeeId: { $regex: new RegExp(`^${inputId}$`, 'i') } },
                { username:   { $regex: new RegExp(`^${inputId}$`, 'i') } }
            ]
        });

        if (!user) {
            console.log("❌ User not found in DB:", inputId);
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isActive === false) {
            console.log("🔒 Locked Account Login Attempt:", inputId);
            return res.status(403).json({
                message: "Your account is LOCKED. Please contact the Admin."
            });
        }

        const isMatch = await bcrypt.compare(inputPass, user.password);
        if (!isMatch) {
            console.log("❌ Wrong Password for:", user.employeeId);
            return res.status(400).json({ message: "Invalid Password" });
        }

        console.log("✅ Login Success:", user.employeeId);
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "inventory_secret",
            { expiresIn: "1d" }
        );

        res.json({
            success: true,
            token,
            user: {
                id:           user._id,
                name:         user.name,
                role:         user.role,
                employeeId:   user.employeeId,
                email:        user.email,
                phone:        user.phone        || '',
                address:      user.address      || '',
                city:         user.city         || '',
                photo:        user.photo        || '',
                isFirstLogin: user.isFirstLogin
            }
        });

    } catch (err) {
        console.error("🔥 Server Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── FORCE CHANGE PASSWORD (first login) ─────────────────────────────────────
router.post('/force-change-password', async (req, res) => {
    try {
        const { id, newPassword } = req.body;

        if (!id || !newPassword) {
            return res.status(400).json({ message: "User ID and new password are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.password     = await bcrypt.hash(newPassword, 10);
        user.isFirstLogin = false;
        await user.save();

        // Re-fetch to confirm it actually saved
        const saved = await User.findById(id);
        console.log(`✅ Password changed for: ${user.employeeId} — isFirstLogin is now → ${saved.isFirstLogin}`);

        res.json({
            success: true,
            message: "Password updated successfully.",
            user: {
                id:           saved._id,
                name:         saved.name,
                role:         saved.role,
                employeeId:   saved.employeeId,
                email:        saved.email,
                phone:        saved.phone     || '',
                address:      saved.address   || '',
                city:         saved.city      || '',
                photo:        saved.photo     || '',
                isFirstLogin: saved.isFirstLogin
            }
        });

    } catch (err) {
        console.error("🔥 Force-change-password error:", err);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

// ✅ THIS WAS MISSING — caused "Router.use() requires a middleware function" error
module.exports = router;