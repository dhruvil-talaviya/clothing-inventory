require('dotenv').config();
const mongoose = require('mongoose');
// Adjust path if your models are in a different folder
const { User, Product, Sale, Discount } = require('./models/Schemas'); 
// Added Discount import just in case you have that model too

const clearData = async () => {
    try {
        // 1. Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to Database...");

        // 2. DELETE ALL EXISTING DATA
        await User.deleteMany({});
        await Product.deleteMany({});
        await Sale.deleteMany({});
        // await Discount.deleteMany({}); // Uncomment if you have a Discount model

        console.log("🗑️  SUCCESS: All data (Users, Products, Sales) has been deleted.");
        console.log("⚠️  The database is now empty.");
        
        process.exit();

    } catch (error) {
        console.error("❌ Error clearing data:", error);
        process.exit(1);
    }
};

clearData();