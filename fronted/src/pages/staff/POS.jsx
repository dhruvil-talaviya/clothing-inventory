import React, { useState } from 'react';
import axios from 'axios';
import { FiSearch, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';

// Categories for filtering
const CATEGORIES = ["All", "Shirt", "T-Shirt", "Jeans", "Shoes", "Jacket", "Watch", "Accessories"];

const POS = ({ products, cart, setCart, discounts, addToCart, onCheckoutSuccess }) => {
    // State
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [showBillModal, setShowBillModal] = useState(false);
    
    // Customer State
    const [customer, setCustomer] = useState({ 
        name: '', 
        phone: '', 
        address: '', 
        city: '' 
    });

    // --- CALCULATIONS ---
    const subtotal = cart.reduce((a, c) => a + c.price * (Number(c.qty) || 1), 0);
    
    const discountAmount = selectedDiscount 
        ? (selectedDiscount.type === 'percentage' 
            ? (subtotal * selectedDiscount.value / 100) 
            : selectedDiscount.value)
        : 0;

    const finalTotal = Math.max(0, subtotal - discountAmount);

    // --- HANDLE CHECKOUT ---
    const handleCheckout = async (e) => {
        e.preventDefault();

        // 1. Validation
        if(customer.phone.length !== 10) return alert("Invalid Phone Number (Must be 10 digits)");

        // 2. Get User Info (Staff ID) from LocalStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo) return alert("Session Expired. Please Login.");

        // --- FIX STARTS HERE ---
        // Define staffName so it is not undefined
        const staffName = userInfo.username || userInfo.name || userInfo.email || "Unknown Staff";
        // --- FIX ENDS HERE ---

        // 3. Format Items for Backend Schema
        const formattedItems = cart.map(item => ({
            productId: item._id,
            name: item.name,
            price: item.price,
            quantity: item.qty
        }));

        // 4. Prepare Payload
        const saleData = {
            items: formattedItems,
            soldBy:req.body.soldBy || req.user.username || "Staff",
            customerName: customer.name,
            customerPhone: customer.phone,
            customerAddress: customer.address,
            storeLocation: customer.city,
            subtotal: subtotal,
            discount: selectedDiscount ? { code: selectedDiscount.code, amount: discountAmount } : null,
            totalAmount: finalTotal
        };

        try {
            // 5. Send Request with Token
            const config = {
                headers: { Authorization: `Bearer ${userInfo.token}` }
            };

            const res = await axios.post('http://localhost:5001/api/sales/add', saleData, config);
            
            // 6. Success Handling
            onCheckoutSuccess({ ...saleData, _id: res.data._id, date: new Date() });
            
            // Reset Form
            setCart([]); 
            setShowBillModal(false); 
            setCustomer({ name: '', phone: '', address: '', city: '' });
            alert("Sale Successful!");

        } catch(err) { 
            console.error("Checkout Error:", err);
            alert("Checkout Failed. Check console for details."); 
        }
    };

    // --- HELPER: Get Image ---
    const getImage = (name) => {
        const n = name.toLowerCase();
        if(n.includes('shirt')) return "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80";
        if(n.includes('shoe')) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80";
        if(n.includes('watch')) return "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80";
        return "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=500&q=80";
    };

    // Filter Products
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(search) && 
        (category === 'All' || p.category === category || p.name.toLowerCase().includes(category.toLowerCase()))
    );

    return (
        <div className="flex h-full animate-fade-in">
            {/* --- LEFT SIDE: PRODUCTS --- */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
                <header className="mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-white tracking-tight">POS Terminal</h1>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                className="bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white w-72 outline-none focus:border-indigo-500 transition-colors" 
                                onChange={e=>setSearch(e.target.value.toLowerCase())}
                            />
                        </div>
                    </div>
                    {/* Categories */}
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {CATEGORIES.map(c => (
                            <button 
                                key={c} 
                                onClick={()=>setCategory(c)} 
                                className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                                    category===c 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Product Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(p => (
                        <div 
                            key={p._id} 
                            onClick={()=>addToCart(p)} 
                            className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-indigo-500 cursor-pointer transition-all group hover:shadow-xl hover:-translate-y-1"
                        >
                            <div className="h-40 w-full overflow-hidden">
                                <img 
                                    src={p.image || getImage(p.name)} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                    alt={p.name}
                                />
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-white text-sm truncate">{p.name}</h4>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="font-bold text-emerald-400 text-lg">${p.price}</span>
                                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-colors">ADD +</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- RIGHT SIDE: CART --- */}
            <div className="w-96 bg-slate-900 border-l border-slate-800 p-6 flex flex-col shadow-2xl z-20">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg"><FiShoppingCart className="text-white"/></div>
                    Current Order
                </h2>

                {/* Discount Select */}
                <div className="mb-4">
                    <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Apply Discount</label>
                    <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" 
                        onChange={e=>setSelectedDiscount(discounts.find(d=>d._id===e.target.value)||null)}
                    >
                        <option value="">Select Offer...</option>
                        {discounts.map(d=>(
                            <option key={d._id} value={d._id}>
                                {d.code} ({d.value}{d.type==='percentage'?'%':'$'} OFF)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {cart.length === 0 ? (
                        <div className="text-center text-slate-500 mt-10">Cart is empty</div>
                    ) : (
                        cart.map(c => (
                            <div key={c._id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                <div className="flex items-center gap-3">
                                    <img src={c.image||getImage(c.name)} className="w-12 h-12 rounded-lg object-cover" alt="" />
                                    <div>
                                        <p className="text-sm font-bold text-white w-32 truncate">{c.name}</p>
                                        <p className="text-xs text-indigo-400 font-mono">${c.price} x {c.qty}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={()=>setCart(cart.filter(x=>x._id!==c._id))} 
                                    className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors"
                                >
                                    <FiTrash2 size={18}/>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals */}
                <div className="pt-6 border-t border-slate-800 space-y-3 mt-4">
                    <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-emerald-400"><span>Discount</span><span>-${discountAmount.toFixed(2)}</span></div>
                    
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-300 font-bold">Total Payable</span>
                        <span className="text-2xl font-black text-white">${finalTotal.toFixed(2)}</span>
                    </div>

                    <button 
                        onClick={()=>setShowBillModal(true)} 
                        disabled={!cart.length} 
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 py-4 rounded-xl text-white font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        Proceed to Checkout
                    </button>
                </div>
            </div>

            {/* --- CHECKOUT MODAL --- */}
            {showBillModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Customer Details</h2>
                            <button onClick={()=>setShowBillModal(false)} className="text-slate-400 hover:text-white"><FiX size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleCheckout} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                                <input type="text" required className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 mt-1" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                                <input type="text" required className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 mt-1" value={customer.phone} onChange={e=>{if(/^\d{0,10}$/.test(e.target.value)) setCustomer({...customer, phone:e.target.value})}}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">City</label>
                                <input type="text" required className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 mt-1" value={customer.city} onChange={e=>setCustomer({...customer, city:e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Address</label>
                                <textarea required className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 mt-1" rows="2" value={customer.address} onChange={e=>setCustomer({...customer, address:e.target.value})}/>
                            </div>
                            
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 py-3 rounded-xl text-white font-bold shadow-lg shadow-emerald-500/20 transition-all">
                                    Confirm Sale (${finalTotal.toFixed(2)})
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;