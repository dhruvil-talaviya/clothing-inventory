require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Product, Sale } = require('./models/Schemas'); 

const seedFinal = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ DB Connected");

        
        await User.deleteMany({});
        await Product.deleteMany({});
        await Sale.deleteMany({});
        console.log("🗑️  Old data cleared");

        
        const hash = await bcrypt.hash("123456", 10);

        const admin = new User({
            name: "Super Admin",
            email: "admin@stylesync.com",
            employeeId: "ADMIN01",
            password: hash,
            role: "admin",
            isActive: true
        });

        const staff1 = new User({
            name: "Rahul Staff",
            email: "rahul@stylesync.com",
            employeeId: "STAFF01",
            password: hash,
            role: "staff",
            isActive: true
        });

        const staff2 = new User({
            name: "Priya Staff",
            email: "priya@stylesync.com",
            employeeId: "STAFF02",
            password: hash,
            role: "staff",
            isActive: true
        });

        await User.insertMany([admin, staff1, staff2]);
        console.log("👥 Users Created (Pass: 123456)");

        // 3. CREATE 15 PRODUCTS
        const products = [
            { name: "Cotton Polo - Navy", sku: "TSH-001", category: "T-Shirt", costPrice: 200, price: 599, stock: 50, isAvailable: true },
            { name: "Cotton Polo - Red", sku: "TSH-002", category: "T-Shirt", costPrice: 200, price: 599, stock: 50, isAvailable: true },
            { name: "Cotton Polo - Black", sku: "TSH-003", category: "T-Shirt", costPrice: 200, price: 599, stock: 50, isAvailable: true },
            { name: "Slim Fit Jeans - Blue", sku: "JNS-001", category: "Jeans", costPrice: 500, price: 1299, stock: 30, isAvailable: true },
            { name: "Slim Fit Jeans - Black", sku: "JNS-002", category: "Jeans", costPrice: 500, price: 1299, stock: 30, isAvailable: true },
            { name: "Formal Shirt - White", sku: "SHR-001", category: "Shirt", costPrice: 300, price: 899, stock: 40, isAvailable: true },
            { name: "Formal Shirt - Blue", sku: "SHR-002", category: "Shirt", costPrice: 300, price: 899, stock: 40, isAvailable: true },
            { name: "Chinos - Khaki", sku: "TRS-001", category: "Trousers", costPrice: 400, price: 999, stock: 35, isAvailable: true },
            { name: "Chinos - Grey", sku: "TRS-002", category: "Trousers", costPrice: 400, price: 999, stock: 35, isAvailable: true },
            { name: "Sneakers - White", sku: "SHO-001", category: "Shoes", costPrice: 600, price: 1499, stock: 20, isAvailable: true },
            { name: "Running Shoes - Red", sku: "SHO-002", category: "Shoes", costPrice: 700, price: 1999, stock: 15, isAvailable: true },
            { name: "Denim Jacket", sku: "JKT-001", category: "Jacket", costPrice: 800, price: 2499, stock: 10, isAvailable: true },
            { name: "Bomber Jacket", sku: "JKT-002", category: "Jacket", costPrice: 900, price: 2999, stock: 10, isAvailable: true },
            { name: "Leather Belt", sku: "ACC-001", category: "Accessories", costPrice: 150, price: 499, stock: 60, isAvailable: true },
            { name: "Sports Cap", sku: "ACC-002", category: "Accessories", costPrice: 100, price: 299, stock: 100, isAvailable: true }
        ];

        await Product.insertMany(products);
        console.log("📦 15 Products Added");

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedFinal();