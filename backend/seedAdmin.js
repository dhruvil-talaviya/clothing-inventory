require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// Ensure this path points to where your User model is defined
const { User } = require('./models/Schemas'); 

const seedAdmin = async () => {
    try {
        // 1. Connect to Database
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB...");

        // 2. CLEAR DATA (Deletes all existing users)
        await User.deleteMany({});
        console.log("🗑️  Existing users cleared.");

        // 3. Create New Admin
        const hashedPassword = await bcrypt.hash("admin123", 10); // Change password if needed

        const adminUser = new User({
            name: "Super Admin",
            email: "admin@stylesync.com", // <--- THIS WAS MISSING
            employeeId: "ADMIN01",        
            password: hashedPassword,
            role: "admin",
            isActive: true
        });

        await adminUser.save();
        console.log("🚀 Admin Created Successfully!");
        
        // 4. Exit
        process.exit();

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

seedAdmin();
