const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// ---------------------------------------------------
// 1. IMPORTS (Ensure these match your file structure)
// ---------------------------------------------------
const { User, Product, Sale } = require('../models/Schemas'); // Or require('../models/User'), etc.
const Discount = require('../models/Discount'); 

// ---------------------------------------------------
// 2. ADMIN DASHBOARD STATS (The "Crash-Proof" Version)
// ---------------------------------------------------
// --- ADMIN STATS ROUTE ---
// --- ADMIN STATS ROUTE ---
router.get('/stats', async (req, res) => {
    try {
        // 1. Fetch ALL sales (Newest first)
        const sales = await Sale.find().sort({ date: -1 });
        const products = await Product.find();

        // 2. Calculate Totals
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startYear = new Date(now.getFullYear(), 0, 1);

        let today = 0, month = 0, year = 0, total = 0;

        sales.forEach(s => {
            const amount = s.totalAmount || 0;
            const d = new Date(s.date || s.createdAt);
            
            total += amount;
            if (d >= startToday) today += amount;
            if (d >= startMonth) month += amount;
            if (d >= startYear) year += amount;
        });

        // 3. Prepare Charts
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const chartData = last7Days.map(dateStr => {
            return sales
                .filter(s => new Date(s.date || s.createdAt).toISOString().split('T')[0] === dateStr)
                .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        });

        const categoryMap = {};
        products.forEach(p => {
            const cat = p.category || "Other";
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });

        // 4. SEND RESPONSE (CRITICAL PART)
        // Ensure 'allSales' is included here!
      // ... inside the router.get('/stats', ...) function

        // 4. SEND RESPONSE
        res.json({
            today, 
            month, 
            year, 
            total,
            chart: { labels: last7Days, data: chartData },
            pie: { labels: Object.keys(categoryMap), data: Object.values(categoryMap) },
            recentActivity: sales.slice(0, 5),
            allSales: sales // <--- THIS LINE IS CRITICAL. MUST BE HERE.
        });

    } catch (err) {
        console.error("Stats Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ---------------------------------------------------
// 3. STAFF MANAGEMENT
// ---------------------------------------------------
router.get('/staff', async (req, res) => { 
    try { 
        const staff = await User.find({ role: 'staff' }).select('-password'); 
        res.json(staff); 
    } catch (err) { res.status(500).json({ error: err.message }); } 
});

router.post('/create-staff', async (req, res) => { 
    try { 
        const { name, employeeId, email, password } = req.body; 
        if(await User.findOne({ employeeId })) return res.status(400).json({ message: "ID Taken" }); 
        
        const hashedPassword = await bcrypt.hash(password, 10); 
        const newStaff = new User({ 
            name, employeeId, email, 
            password: hashedPassword, 
            role: 'staff', isActive: true, isFirstLogin: true 
        });
        
        await newStaff.save(); 
        res.json({ message: "Staff Created" }); 
    } catch (err) { res.status(500).json({ error: err.message }); } 
});

router.put('/toggle-status/:id', async (req, res) => { 
    try { 
        const user = await User.findById(req.params.id); 
        user.isActive = !user.isActive; 
        await user.save(); 
        res.json({ message: "Status Updated" }); 
    } catch (err) { res.status(500).json({ error: err.message }); } 
});

router.delete('/delete-staff/:id', async (req, res) => { 
    try { 
        await User.findByIdAndDelete(req.params.id); 
        res.json({ message: "Deleted" }); 
    } catch(e){ res.status(500).json({ message: "Error deleting staff" }); } 
});

// ---------------------------------------------------
// 4. PRODUCT MANAGEMENT
// ---------------------------------------------------
router.post('/add-product', async (req, res) => { 
    try { 
        await new Product(req.body).save(); 
        res.json({ message: "Added" }); 
    } catch(e){ res.status(500).json({ message: "Error adding product" }); } 
});

router.put('/product-status/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        product.isAvailable = !product.isAvailable; 
        await product.save();
        res.json({ message: "Status Updated", product });
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
});

router.put('/update-stock/:id', async (req, res) => {
    try {
        const { newStock } = req.body;
        await Product.findByIdAndUpdate(req.params.id, { stock: newStock });
        res.json({ message: "Stock Updated Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------------------------------------------------
// 5. DISCOUNT MANAGEMENT
// ---------------------------------------------------
router.get('/discounts', async (req, res) => {
    try {
        const discounts = await Discount.find().sort({ createdAt: -1 });
        res.json(discounts);
    } catch (err) { res.status(500).json({ message: "Server Error", error: err.message }); }
});

router.post('/create-discount', async (req, res) => {
    try {
        const { code, type, value, minOrder, description } = req.body;
        
        const existing = await Discount.findOne({ code });
        if (existing) return res.status(400).json({ message: `Code '${code}' exists.` });

        const newDiscount = new Discount({ code, type, value, minOrder, description, isActive: true });
        await newDiscount.save();
        
        res.status(201).json({ message: "Discount Created", discount: newDiscount });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/toggle-discount/:id', async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id);
        if (!discount) return res.status(404).json({ message: "Not found" });
        discount.isActive = !discount.isActive;
        await discount.save();
        res.json({ message: "Status Toggled", discount });
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
});

router.delete('/delete-discount/:id', async (req, res) => {
    try {
        await Discount.findByIdAndDelete(req.params.id);
        res.json({ message: "Discount deleted" });
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
});

// ---------------------------------------------------
// 6. EXPORT / MISC
// ---------------------------------------------------
router.get('/export-sales', async (req, res) => { 
    try {
        const sales = await Sale.find().sort({date:-1}); 
        let csv="ID,Date,Customer,Staff,Amount\n"; 
        sales.forEach(s=> csv+=`${s._id},${s.date},${s.customerName},${s.soldBy},${s.totalAmount}\n`); 
        res.header('Content-Type', 'text/csv');
        res.attachment('sales.csv'); 
        res.send(csv); 
    } catch (err) {
        res.status(500).json({ message: "Export Failed" });
    }
});

module.exports = router;