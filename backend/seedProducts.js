const mongoose = require('mongoose');
const { Product } = require('./models/Schemas');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🌱 Connected to DB...');
    await Product.deleteMany({}); 
    const products = [
      { name: 'Slim Fit Chinos - Beige', sku: 'ZUD-001', category: 'Pants', price: 29.99, stock: 50 },
      { name: 'Oversized T-Shirt - Black', sku: 'ZUD-002', category: 'T-Shirts', price: 15.00, stock: 100 },
      { name: 'Denim Jacket - Blue', sku: 'ZUD-003', category: 'Jackets', price: 45.50, stock: 20 },
      { name: 'Casual Sneakers - White', sku: 'ZUD-004', category: 'Shoes', price: 35.00, stock: 15 },
      { name: 'Cotton Shirt - Olive', sku: 'ZUD-005', category: 'Shirts', price: 22.00, stock: 40 },
    ];
    await Product.insertMany(products);
    console.log('Fake Products Added!');
    process.exit();
  })
  .catch(err => { console.log(err); process.exit(1); });
