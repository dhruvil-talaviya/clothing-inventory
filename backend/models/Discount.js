const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ['PERCENTAGE', 'FLAT'], required: true }, 
    value: { type: Number, required: true }, 
    minOrder: { type: Number, default: 0 }, 
    description: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Discount', discountSchema);