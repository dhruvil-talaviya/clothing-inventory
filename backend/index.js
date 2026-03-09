const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// ===============================
// MIDDLEWARES
// ===============================
app.use(cors());
app.use(express.json({ limit: '10mb' }));         // allow base64 photos in JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded profile photos as static files
// e.g. GET http://localhost:5001/uploads/photo.jpg
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ===============================
// DATABASE CONNECTION
// ===============================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clothing_db';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => {
        console.error('❌ DB Connection Error:', err.message);
        process.exit(1);
    });

// ===============================
// ROUTES IMPORT
// ===============================
const authRoutes   = require('./routes/auth');
const adminRoutes  = require('./routes/admin');
const staffRoutes  = require('./routes/staff');
const offersRoutes = require('./routes/offers');

// ===============================
// ROUTES REGISTER
// ===============================
app.use('/api/auth',   authRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/staff',  staffRoutes);
app.use('/api/offers', offersRoutes);

// ===============================
// TEST ROUTE
// ===============================
app.get('/', (req, res) => {
    res.json({ message: "StyleSync API is running..." });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err.stack);

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Max 3MB allowed.' });
    }

    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message
    });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});