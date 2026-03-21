const mongoose = require('mongoose');

// ─── 1. USER SCHEMA ───────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name:         { type: String, required: true },
    username:     { type: String, default: '' },
    email:        { type: String, required: true, unique: true },
    password:     { type: String, required: true },
    role:         { type: String, default: 'staff', enum: ['admin', 'staff'] },
    employeeId:   { type: String, default: '' },
    isActive:     { type: Boolean, default: true },
    phone:        { type: String, default: '' },   // ← required for OTP login
    address:      { type: String, default: '' },
    city:         { type: String, default: '' },
    photo:        { type: String, default: '' },
    isFirstLogin: { type: Boolean, default: true },
    createdAt:    { type: Date, default: Date.now },
});

// ─── 2. PRODUCT SCHEMA ────────────────────────────────────────────────────────
const variantSchema = new mongoose.Schema({
    size:  { type: String, required: true },  // 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
    sku:   { type: String, default: '' },
    stock: { type: Number, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    category:    { type: String, required: true },
    price:       { type: Number, required: true },
    costPrice:   { type: Number, default: 0 },
    color:       { type: String, default: '' },
    description: { type: String, default: '' },

    // Flat stock (watches, accessories — no size variants)
    stock:       { type: Number, default: 0 },
    sku:         { type: String, default: '' },

    // Size variants (shirts, jeans, etc.)
    variants:    { type: [variantSchema], default: [] },

    // Computed total — kept in sync via pre-save hook
    totalStock:  { type: Number, default: 0 },

    image:       { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    createdAt:   { type: Date, default: Date.now },
});

// Auto-sync totalStock before every save
productSchema.pre('save', function (next) {
    if (this.variants && this.variants.length > 0) {
        this.totalStock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        this.stock      = this.totalStock; // keep flat field in sync
    } else {
        this.totalStock = this.stock || 0;
    }
    next();
});

// ─── 3. SALE SCHEMA ───────────────────────────────────────────────────────────
const saleItemSchema = new mongoose.Schema({
    productId: { type: String, default: '' },
    name:      { type: String, default: '' },
    price:     { type: Number, default: 0 },
    quantity:  { type: Number, default: 1 },
    size:      { type: String, default: 'OS' },
    sku:       { type: String, default: '' },
}, { _id: false });

const saleSchema = new mongoose.Schema({
    invoiceId: { type: String },

    items: { type: [saleItemSchema], default: [] },

    // ── Money ──
    subtotal:    { type: Number, default: 0 },
    discount:    { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // ── Customer ──
    customerName:    { type: String, default: 'Walk-in Customer' },
    customerPhone:   { type: String, default: '' },
    customerEmail:   { type: String, default: '' },  // ← WAS MISSING — needed for invoice emails
    customerAddress: { type: String, default: '' },
    storeLocation:   { type: String, default: '' },

    // ── Payment ──
    paymentMethod:     { type: String, default: 'cash', enum: ['cash', 'upi', 'card'] }, // ← WAS MISSING
    razorpayOrderId:   { type: String, default: '' },   // ← WAS MISSING — Razorpay order ref
    razorpayPaymentId: { type: String, default: '' },   // ← WAS MISSING — Razorpay payment ref

    // ── Staff ──
    soldBy:    { type: String, default: '' },
    staffId:   { type: String, default: '' },
    staffName: { type: String, default: '' },

    // ── Time ──
    date:      { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },  // ← added so history sorts correctly
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

// ─── 4. EXPORT ────────────────────────────────────────────────────────────────
const User    = mongoose.models.User    || mongoose.model('User',    userSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Sale    = mongoose.models.Sale    || mongoose.model('Sale',    saleSchema);

module.exports = { User, Product, Sale };