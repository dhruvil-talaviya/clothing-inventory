const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  isFirstLogin: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});


const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  costPrice: { type: Number, default: 0 },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  isAvailable: { type: Boolean, default: true } // 
});


const saleSchema = new mongoose.Schema({
  items: [
      {
          productId: String,
          name: String,
          price: Number,
          quantity: Number
      }
  ],
  soldBy: String,
  customerName: String,
  customerPhone: String,
  customerAddress: String,
  storeLocation: String,
  subtotal: Number,
  discount: Object, // Can store { code: String, amount: Number }
  totalAmount: Number,
  date: { type: Date, default: Date.now }
});


const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Sale = mongoose.model('Sale', saleSchema);

module.exports = { User, Product, Sale };