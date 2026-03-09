const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    // Compass: "description" (Frontend: "name")
    description: { type: String },
    
    // Compass: "code"
    code: { type: String, required: true, unique: true, uppercase: true },
    
    // Compass: "value" (Frontend: "discountPercent")
    value: { type: Number, required: true },
    
    // Compass: "minOrder" (Frontend: "minOrderValue")
    minOrder: { type: Number, default: 0 },
    
    type: { type: String, default: "PERCENTAGE" },
    isActive: { type: Boolean, default: true },
    validUntil: { type: Date },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'discounts' }); // <--- Matches your Compass screenshot

module.exports = mongoose.models.Discount || mongoose.model('Discount', discountSchema);