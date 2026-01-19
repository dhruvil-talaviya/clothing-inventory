const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');

dotenv.config();
const app = express();

// --- 1. MIDDLEWARES (MUST BE AT THE TOP) ---
app.use(cors()); 
app.use(express.json()); // <--- THIS ALLOWS SERVER TO READ JSON DATA

// --- 2. DB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.log('❌ DB Connection Error:', err));

// --- 3. ROUTES (MUST BE AFTER MIDDLEWARE) ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});