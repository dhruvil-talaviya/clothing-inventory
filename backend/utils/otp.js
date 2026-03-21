// utils/otp.js
const axios = require('axios');

const otpStore = new Map(); // { phone: { otp, expiresAt, attempts } }

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(phone) {
    // ── Validate phone ────────────────────────────────────────────────────────
    const cleanPhone = phone.toString().trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
        throw new Error('Invalid phone number format.');
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const existing = otpStore.get(cleanPhone);
    if (existing && Date.now() < existing.expiresAt - 4 * 60 * 1000) {
        throw new Error('Please wait before requesting another OTP.');
    }

    const otp       = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(cleanPhone, { otp, expiresAt, attempts: 0 });

    // ── Always log OTP to console so you can test even if SMS fails ───────────
    console.log(`\n🔐 OTP for ${cleanPhone}: ${otp} (valid 5 min)\n`);

    // ── Try Fast2SMS — if it fails, still succeed (OTP is in console) ─────────
    if (!process.env.FAST2SMS_API_KEY) {
        console.warn('⚠️  FAST2SMS_API_KEY not set — OTP only in console (dev mode)');
        return { success: true, message: 'OTP generated (console only)' };
    }

    try {
        const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            params: {
                authorization: process.env.FAST2SMS_API_KEY,
                message:       `Your StyleSync verification code is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
                route:         'q',
                numbers:       cleanPhone,
            },
            timeout: 10000,
        });

        console.log('📨 Fast2SMS raw response:', JSON.stringify(response.data));

        if (response.data?.return === true) {
            console.log(`✅ SMS sent to ${cleanPhone}`);
        } else {
            // SMS failed but OTP is stored — user can still get code from console in dev
            console.warn('⚠️  Fast2SMS did not return success:', JSON.stringify(response.data));
            // In production you'd throw here; for now we let it pass so dev can still test
        }

        return response.data;

    } catch (err) {
        // Log details but DO NOT delete OTP from store — let user verify via console
        if (err.response) {
            console.error('❌ Fast2SMS HTTP', err.response.status, JSON.stringify(err.response.data));
        } else if (err.request) {
            console.error('❌ Fast2SMS — no response (network/timeout)');
        } else {
            console.error('❌ Fast2SMS error:', err.message);
        }

        // ── IMPORTANT: In dev/test, don't crash — OTP is still valid in memory ──
        // Comment out the throw below once SMS is working, keep it for production
        // throw new Error('Failed to send SMS. OTP is logged to server console.');

        // For now: silently succeed so you can test the full flow
        console.warn('⚠️  SMS failed — use the OTP printed above to test.');
        return { success: true, message: 'OTP generated (SMS failed — check server console)' };
    }
}

function verifyOTP(phone, inputOtp) {
    const cleanPhone = phone.toString().trim();
    const record     = otpStore.get(cleanPhone);

    if (!record)
        return { valid: false, message: 'OTP not found. Please request a new one.' };

    if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanPhone);
        return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (record.attempts >= 5) {
        otpStore.delete(cleanPhone);
        return { valid: false, message: 'Too many wrong attempts. Request a new OTP.' };
    }

    if (record.otp !== inputOtp.toString().trim()) {
        record.attempts += 1;
        otpStore.set(cleanPhone, record);
        return { valid: false, message: `Invalid OTP. ${5 - record.attempts} attempts left.` };
    }

    otpStore.delete(cleanPhone); // one-time use
    return { valid: true };
}

module.exports = { sendOTP, verifyOTP };