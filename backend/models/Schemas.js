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
    city:         { type: String },
    photo:        { type: String },
    isFirstLogin: { type: Boolean, default: true },
    createdAt:    { type: Date, default: Date.now }
});

// --- 2. PRODUCT SCHEMA ---
const variantSchema = new mongoose.Schema({
    size:  { type: String, required: true },   // 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
    sku:   { type: String },
    stock: { type: Number, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    category:    { type: String, required: true },
    price:       { type: Number, required: true },
    costPrice:   { type: Number, default: 0 },
    color:       { type: String },
    description: { type: String },

    // ── Flat stock (used when no variants, e.g. watches/accessories) ──
    stock:       { type: Number, default: 0 },
    sku:         { type: String },

    // ── Size variants (shirts, jeans, etc.) ──
    variants:    { type: [variantSchema], default: [] },

    // ── Computed total — always kept in sync on save ──
    totalStock:  { type: Number, default: 0 },

    image:       { type: String },
    isAvailable: { type: Boolean, default: true },
    createdAt:   { type: Date, default: Date.now }
});

// Auto-sync totalStock before every save
productSchema.pre('save', function (next) {
    if (this.variants && this.variants.length > 0) {
        this.totalStock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        this.stock      = this.totalStock; // keep flat field in sync too
    } else {
        this.totalStock = this.stock || 0;
    }
    next();
});

// --- 3. SALE SCHEMA ---
const saleItemSchema = new mongoose.Schema({
    productId: { type: String },
    name:      { type: String },
    price:     { type: Number },
    quantity:  { type: Number },
    size:      { type: String, default: 'OS' },  // ← size selected at billing
    sku:       { type: String },                  // ← variant SKU scanned/used
}, { _id: false });

const saleSchema = new mongoose.Schema({
    invoiceId: { type: String },

    items: { type: [saleItemSchema], default: [] },

    // Money
    subtotal:    { type: Number, default: 0 },
    discount:    { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Customer
    customerName:    { type: String },
    customerPhone:   { type: String },
    customerAddress: { type: String },
    storeLocation:   { type: String },

    // Staff
    soldBy:    { type: String },
    staffId:   { type: String },
    staffName: { type: String },

    // Time
    date: { type: Date, default: Date.now }
});

// Auto-generate invoiceId if not provided
saleSchema.pre('save', function (next) {
    if (!this.invoiceId) {
        const stamp = Date.now().toString(36).toUpperCase();
        const rand  = Math.random().toString(36).substring(2, 5).toUpperCase();
        this.invoiceId = `INV-${stamp}-${rand}`;
    }
    next();
});

// --- 4. EXPORT ---
const User    = mongoose.models.User    || mongoose.model('User',    userSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Sale    = mongoose.models.Sale    || mongoose.model('Sale',    saleSchema);

module.exports = { User, Product, Sale };