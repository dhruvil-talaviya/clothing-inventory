const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const dotenv       = require('dotenv');
const path         = require('path');
const fs           = require('fs');
const cookieParser = require('cookie-parser'); // ← NEW: for httpOnly refresh token cookie

dotenv.config();

const app = express();


app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // ← NEW: must be before routes so req.cookies works in auth.js

// Serve uploaded profile photos as static files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));


const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clothing_db';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected');

        try {
            const { User } = require('./models/Schemas');
            const result = await User.updateMany({}, { $set: { refreshToken: null } });
            console.log(`🔄 Cleared refresh tokens for ${result.modifiedCount} users — all sessions invalidated`);
        } catch (err) {
            console.error('⚠️  Could not clear refresh tokens:', err.message);
            // Non-fatal — server still starts
        }
    })
    .catch((err) => {
        console.error('❌ DB Connection Error:', err.message);
        process.exit(1);
    });

const authRoutes   = require('./routes/auth');
const adminRoutes  = require('./routes/admin');
const staffRoutes  = require('./routes/staff');
const offersRoutes = require('./routes/offers');


app.use('/api/auth',   authRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/staff',  staffRoutes);
app.use('/api/offers', offersRoutes);


app.get('/', (req, res) => {
    res.json({ message: 'StyleSync API is running...' });
});


app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);

    if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ message: 'File too large. Max 3MB allowed.' });

    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});