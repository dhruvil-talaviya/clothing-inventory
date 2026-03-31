// ─── routes/auth.js ───────────────────────────────────────────────────────────
const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { User }   = require('../models/Schemas');
const { sendOTP, verifyOTP } = require('../utils/otp');

// ─── JWT SECRETS ──────────────────────────────────────────────────────────────
const ACCESS_SECRET  = process.env.JWT_SECRET         || 'inventory_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'inventory_refresh_secret';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const signAccess  = (id, role) =>
    jwt.sign({ id, role }, ACCESS_SECRET,  { expiresIn: '15m' });

const signRefresh = (id) =>
    jwt.sign({ id },       REFRESH_SECRET, { expiresIn: '7d'  });

const setRefreshCookie = (res, token) =>
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure:   false,  // false for localhost (no HTTPS in dev)
        sameSite: 'lax',
        maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    });

// ─── VALIDATE ─────────────────────────────────────────────────────────────────
router.get('/validate', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer '))
            return res.status(401).json({ message: 'No token provided.' });

        const token   = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, ACCESS_SECRET);

        const user = await User.findById(decoded.id).select('role isActive');
        if (!user || user.isActive === false)
            return res.status(401).json({ message: 'Account inactive or not found.' });

        res.json({ valid: true, role: user.role });
    } catch {
        return res.status(401).json({ message: 'Token expired or invalid.' });
    }
});

// ─── REFRESH ──────────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token)
            return res.status(401).json({ message: 'No refresh token.' });

        const decoded = jwt.verify(token, REFRESH_SECRET);

        const user = await User.findById(decoded.id).select('role isActive refreshToken');
        if (!user || user.isActive === false)
            return res.status(401).json({ message: 'Account inactive or not found.' });

        if (user.refreshToken !== token)
            return res.status(401).json({ message: 'Session expired. Please log in again.' });

        const newAccessToken = signAccess(user._id, user.role);
        res.json({ token: newAccessToken, role: user.role });

    } catch {
        return res.status(401).json({ message: 'Refresh token expired. Please log in again.' });
    }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, REFRESH_SECRET);
                await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
            } catch { /* token already expired — still clear cookie */ }
        }
    } catch { /* ignore */ }

    res.clearCookie('refreshToken');
    res.json({ success: true });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// NOTE: Cloudflare Turnstile removed — captcha is now handled client-side
//       via a local math captcha (no token needed server-side).
router.post('/login', async (req, res) => {
    try {
        const inputId   = req.body.phone || req.body.loginId || req.body.email;
        const inputPass = req.body.password;

        if (!inputId || !inputPass)
            return res.status(400).json({ message: 'Please enter credentials.' });

        // ── Find user by phone / email / employeeId / username ────────────────
        const user = await User.findOne({
            $or: [
                { phone:      inputId.toString() },
                { email:      { $regex: new RegExp(`^${inputId}$`, 'i') } },
                { employeeId: { $regex: new RegExp(`^${inputId}$`, 'i') } },
                { username:   { $regex: new RegExp(`^${inputId}$`, 'i') } },
            ]
        });

        if (!user)
            return res.status(404).json({ message: 'User not found.' });
        if (user.isActive === false)
            return res.status(403).json({ message: 'Your account is LOCKED. Contact Admin.' });

        const isMatch = await bcrypt.compare(inputPass, user.password);
        if (!isMatch)
            return res.status(400).json({ message: 'Invalid password.' });

        // ── Issue tokens ──────────────────────────────────────────────────────
        const accessToken  = signAccess(user._id, user.role);
        const refreshToken = signRefresh(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        setRefreshCookie(res, refreshToken);

        console.log(`✅ Login: ${user.employeeId || user.phone}`);
        res.json({
            success: true,
            token: accessToken,
            user: {
                id:           user._id,
                name:         user.name,
                role:         user.role,
                employeeId:   user.employeeId  || '',
                email:        user.email       || '',
                phone:        user.phone       || '',
                address:      user.address     || '',
                city:         user.city        || '',
                photo:        user.photo       || '',
                isFirstLogin: user.isFirstLogin,
            }
        });

    } catch (err) {
        console.error('🔥 Login error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ─── SEND OTP ─────────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !/^\d{10}$/.test(phone.toString().trim()))
            return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });

        const cleanPhone = phone.toString().trim();
        const user = await User.findOne({ phone: cleanPhone });

        if (!user)
            return res.status(404).json({ message: 'No account found with this mobile number.' });
        if (user.isActive === false)
            return res.status(403).json({ message: 'Your account is LOCKED. Contact Admin.' });

        await sendOTP(cleanPhone);
        res.json({ success: true, message: `OTP sent to +91 ${cleanPhone}` });

    } catch (err) {
        console.error('🔥 Send OTP error:', err.message);
        res.status(500).json({ message: typeof err.message === 'string' ? err.message : 'Failed to send OTP.' });
    }
});

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp)
            return res.status(400).json({ message: 'Phone and OTP are required.' });

        const result = verifyOTP(phone.toString().trim(), otp.toString().trim());
        if (!result.valid)
            return res.status(400).json({ message: result.message });

        res.json({ success: true, message: 'OTP verified.' });
    } catch (err) {
        console.error('🔥 Verify OTP error:', err.message);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        if (!phone || !newPassword)
            return res.status(400).json({ message: 'Phone and new password are required.' });
        if (newPassword.length < 6)
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });

        const cleanPhone = phone.toString().trim();
        const user = await User.findOne({ phone: cleanPhone });
        if (!user)
            return res.status(404).json({ message: 'No account found with this number.' });

        user.password     = await bcrypt.hash(newPassword, 10);
        user.isFirstLogin = false;
        await user.save();

        console.log(`✅ Password reset via phone: ${user.employeeId || cleanPhone}`);
        res.json({ success: true, message: 'Password reset successfully.' });

    } catch (err) {
        console.error('🔥 Forgot password error:', err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// ─── FORCE CHANGE PASSWORD (first login) ─────────────────────────────────────
router.post('/force-change-password', async (req, res) => {
    try {
        const { id, newPassword } = req.body;
        if (!id || !newPassword)
            return res.status(400).json({ message: 'User ID and new password are required.' });
        if (newPassword.length < 6)
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });

        const user = await User.findById(id);
        if (!user)
            return res.status(404).json({ message: 'User not found.' });

        user.password     = await bcrypt.hash(newPassword, 10);
        user.isFirstLogin = false;
        await user.save();

        console.log(`✅ First-login password changed: ${user.employeeId}`);
        res.json({
            success: true,
            message: 'Password updated successfully.',
            user: {
                id:           user._id,
                name:         user.name,
                role:         user.role,
                employeeId:   user.employeeId  || '',
                email:        user.email       || '',
                phone:        user.phone       || '',
                address:      user.address     || '',
                city:         user.city        || '',
                photo:        user.photo       || '',
                isFirstLogin: user.isFirstLogin,
            }
        });

    } catch (err) {
        console.error('🔥 Force-change-password error:', err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

module.exports = router;