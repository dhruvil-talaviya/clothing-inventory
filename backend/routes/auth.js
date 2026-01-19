const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/Schemas');


router.post('/login', async (req, res) => {
    console.log("🔹 LOGIN ATTEMPT:", req.body); // 

    try {
    
        const inputId = req.body.loginId || req.body.identifier || req.body.email || req.body.employeeId;
        const inputPass = req.body.password;

        if (!inputId || !inputPass) {
            console.log("❌ Missing fields: Input ID or Password is empty");
            return res.status(400).json({ message: "Missing email or password" });
        }

        const user = await User.findOne({ 
            $or: [
                { email: { $regex: new RegExp(`^${inputId}$`, 'i') } }, 
                { employeeId: { $regex: new RegExp(`^${inputId}$`, 'i') } }
            ] 
        });

        if (!user) {
            console.log("❌ User not found in DB");
            return res.status(404).json({ message: "User not found" });
        }

     
        const isMatch = await bcrypt.compare(inputPass, user.password);
        if (!isMatch) {
            console.log("❌ Password did not match hash");
            return res.status(400).json({ message: "Invalid Password" });
        }

      
        console.log("✅ Login Successful for:", user.name);
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            "secret_key", 
            { expiresIn: "1d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                storeId: user.employeeId
            }
        });

    } catch (err) {
        console.error("🔥 Server Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- 2. First Login) ---
router.post('/force-change-password', async (req, res) => {
    try {
        const { id, newPassword } = req.body;
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await User.findByIdAndUpdate(id, { 
            password: hashedPassword, 
            isFirstLogin: false 
        });
        
        res.json({ message: "Password Set Successfully" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- 3. SEND OTP (For Forgot Password) ---
router.post('/send-otp', async (req, res) => {
    const { employeeId, email } = req.body;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[employeeId] = otp;

    console.log(`[DEV MODE] OTP for ${employeeId}: ${otp}`); 

    try {
        // Try sending email
        await transporter.sendMail({
            from: '"StyleSync Security" <security@stylesync.com>',
            to: email,
            subject: 'Password Reset Code',
            text: `Your Verification Code is: ${otp}`
        });
        res.json({ message: "OTP sent to email!" });
    } catch (error) {
        // Fallback for development if email fails
        console.log("Email failed (using console log instead):", error.message);
        res.json({ message: `OTP Generated (Check Server Console): ${otp}` }); 
    }
});

// --- 4. RESET PASSWORD (Verify OTP) ---
router.post('/reset-password', async (req, res) => {
    const { employeeId, otp, newPassword } = req.body;

    // Verify OTP
    if (!otpStore[employeeId] || otpStore[employeeId] !== otp) {
        return res.status(400).json({ message: "Invalid or Expired OTP" });
    }

    try {
        const user = await User.findOne({ employeeId });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update Password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Clear OTP after success
        delete otpStore[employeeId]; 
        
        res.json({ message: "Password Updated! Please Login again." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// --- SINGLE EXPORT AT THE END ---
module.exports = router;