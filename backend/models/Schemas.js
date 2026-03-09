const mongoose = require('mongoose');

// --- 1. USER SCHEMA ---
const userSchema = new mongoose.Schema({
    name:         { type: String, required: true },
    username:     { type: String },
    email:        { type: String, required: true, unique: true },
    password:     { type: String, required: true },
    role:         { type: String, default: 'staff' },
    employeeId:   { type: String },
    isActive:     { type: Boolean, default: true },
    phone:        { type: String },
    address:      { type: String },
    city:         { type: String },   // ← ADDED: for staff profile city
    photo:        { type: String },   // ← ADDED: profile photo URL or base64
    isFirstLogin: { type: Boolean, default: true },
    createdAt:    { type: Date, default: Date.now }
});

// --- 2. PRODUCT SCHEMA ---
const productSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    category:    { type: String, required: true },
    price:       { type: Number, required: true },
    stock:       { type: Number, required: true },
    image:       { type: String },
    isAvailable: { type: Boolean, default: true },
    createdAt:   { type: Date, default: Date.now }
});

// --- 3. SALE SCHEMA ---
const saleSchema = new mongoose.Schema({
    invoiceId: { type: String },
    items: [
        {
            productId: { type: String },
            name:      { type: String },
            price:     { type: Number },
            quantity:  { type: Number }
        }
    ],

    // Money
    subtotal:    { type: Number, default: 0 },
    discount:    { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Customer
    customerName:    { type: String },
    customerPhone:   { type: String },
    customerAddress: { type: String },
    storeLocation:   { type: String },

    // Staff — all three fields needed for admin dashboard
    soldBy:    { type: String },  // MongoDB _id (used for .populate() & history queries)
    staffId:   { type: String },  // employeeId e.g. "Staff05", "STAFF01"
    staffName: { type: String },  // display name e.g. "Meet", "Rahul Staff"

    // Time
    date: { type: Date, default: Date.now }
});

// --- 4. EXPORT ---
const User    = mongoose.models.User    || mongoose.model('User',    userSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Sale    = mongoose.models.Sale    || mongoose.model('Sale',    saleSchema);

module.exports = { User, Product, Sale };