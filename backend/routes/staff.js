const express = require('express');
const router = express.Router();
const { Product, Sale, User } = require('../models/Schemas');


const { verifyToken } = require('../middleware/auth'); 

router.get('/dashboard-stats', verifyToken, async (req, res) => {
    try {
        // Your logic for dashboard stats...
        res.json({ message: "Stats loaded" }); // (Replace with your actual logic)
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});




// --- 1. GET ALL PRODUCTS ---
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: "Error fetching products" });
    }
});

// --- 2. CREATE SALE ---
router.post('/create-sale', async (req, res) => {
    const { items, soldBy, customerName, customerPhone, customerAddress, storeLocation, subtotal, discount, totalAmount } = req.body;

    try {
        if (!items || items.length === 0) return res.status(400).json({ message: "Cart is empty" });

        // Update Stock
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
                await product.save();
            }
        }

        // Save Sale
        const newSale = new Sale({
            items, // Stores new format
            soldBy,
            customerName: customerName || "Walk-in",
            customerPhone: customerPhone || "N/A",
            customerAddress,
            storeLocation,
            subtotal,
            discount,
            totalAmount,
            date: new Date()
        });

        await newSale.save();
        res.status(201).json({ message: "Sale Success", sale: newSale });

    } catch (err) {
        console.error("Sale Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- 3. GET STATS & HISTORY (THE FIX) ---
router.get('/stats/:id', async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0,0,0,0));
        
        // FIX: Remove { soldBy: id } to show ALL store history
        // We fetch the last 50 sales regardless of who sold them
        const sales = await Sale.find()
            .sort({ date: -1 }) 
            .limit(50); 
        
        // Calculate Today's Stats (Store Wide)
        const todaySales = sales.filter(s => {
            const saleDate = new Date(s.date || s.createdAt);
            return saleDate >= startOfDay;
        });

        const todayRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        
        // FIX: Handle both 'items' (new) and 'products' (old)
        const todayCount = todaySales.reduce((sum, s) => {
            const list = s.items || s.products || [];
            return sum + list.length;
        }, 0);

        res.json({ 
            todayRevenue, 
            todayCount, 
            history: sales // Returns mixed old/new data
        });

    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: "Stats Error" });
    }
});

// ... imports ...

// GET PERSONAL STATS (Fixes the "Seeing other staff sales" error)
router.get('/stats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const startOfDay = new Date(now.setHours(0,0,0,0));

        // 1. Fetch ONLY sales sold by THIS staff ID
        const mySales = await Sale.find({ soldBy: id }).sort({ date: -1 });

        // 2. Calculate Personal Stats
        const todaySales = mySales.filter(s => new Date(s.date) >= startOfDay);
        
        const todayRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const todayCount = todaySales.length;

        res.json({ 
            todayRevenue, 
            todayCount, 
            history: mySales // Only returns THEIR history
        });

    } catch (err) {
        res.status(500).json({ message: "Stats Error" });
    }
});


router.put('/profile/:id', async (req, res) => {
    try {
        const { name, phone, address, password } = req.body;
        
        const updateData = { name, phone, address };
        // Only update password if sent (and not empty)
        if (password && password.trim() !== "") {
            updateData.password = password; // In real app, hash this!
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ message: "Profile Updated", user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: "Update Failed" });
    
    }
});





router.get('/sales-history', async (req, res) => {
    try {
        // Fetch all sales, sorted by newest first
        const sales = await Sale.find().sort({ createdAt: -1 });
        res.status(200).json(sales);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});


module.exports = router;