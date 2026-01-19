require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models/Schemas'); 

const runDiagnosis = async () => {
    try {
        console.log("------------------------------------------------");
        console.log("🔍 DIAGNOSTIC TOOL STARTED");
        console.log("------------------------------------------------");
        
        // 1. Check Connection
        console.log("📡 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected successfully.");

        // 2. Find All Users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users in the database.`);

        if (users.length === 0) {
            console.log("❌ ERROR: Database is empty! The seed script did not save data.");
        } else {
            console.log("\n📋 USER LIST:");
            for (const user of users) {
                console.log("---------------------------------------");
                console.log(`👤 Name:      ${user.name}`);
                console.log(`📧 Email:     ${user.email}`); // COPY THIS EXACTLY FOR LOGIN
                console.log(`🆔 Login ID:  ${user.employeeId}`); // OR COPY THIS
                
                // 3. Test Password
                const isMatch = await bcrypt.compare("admin123", user.password);
                console.log(`🔑 Password 'admin123' works?  ${isMatch ? "✅ YES" : "❌ NO"}`);
            }
        }
        console.log("------------------------------------------------\n");
        process.exit();

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
        process.exit(1);
    }
};

runDiagnosis();