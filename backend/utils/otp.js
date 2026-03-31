// utils/otp.js
const twilio = require('twilio');

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

    // ── Twilio SMS ────────────────────────────────────────────────────────────
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('⚠️  Twilio env vars not set — OTP only in console (dev mode)');
        return { success: true, message: 'OTP generated (console only)' };
    }

    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const message = await client.messages.create({
            body: `Your verification code is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to:   `+91${cleanPhone}`, // Indian number
        });

        console.log(`✅ SMS sent to ${cleanPhone} | SID: ${message.sid}`);
        return { success: true, sid: message.sid };

    } catch (err) {
        console.error('❌ Twilio error:', err.message);
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