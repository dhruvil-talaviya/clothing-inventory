require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// Adjust path if your models are in a different folder
const { User } = require('./models/Schemas'); 

const fixLogin = async () => {
    try {
        // 1. Connect
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB...");

        // 2. DELETE ALL USERS (Removes the conflict)
        await User.deleteMany({});
        console.log("🗑️  All users deleted. Cleaning up conflicts...");

        // 3. CREATE YOUR SPECIFIC ADMIN
        const hashedPassword = await bcrypt.hash("admin123", 10); 

        const myAdmin = new User({
            name: "Dhruvil Talaviya",
            employeeId: "ADMIN01",           // Only ONE user will have this now
            email: "talaviyad380@gmail.com", // Your email
            password: hashedPassword,        // Password: admin123
            role: "admin",
            isActive: true,
            isFirstLogin: false
        });

        await myAdmin.save();
        console.log("\n=======================================");
        console.log("✅ ACCOUNT FIXED SUCCESSFULLY");
        console.log("---------------------------------------");
        console.log("👤 Email:     talaviyad380@gmail.com");
        console.log("🔑 Password:  admin123");
        console.log("=======================================\n");
        
        process.exit();

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

fixLogin();