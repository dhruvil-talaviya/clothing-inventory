import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
    FiHome, FiSearch, FiShoppingCart, FiTrash2, FiLogOut, 
    FiGrid, FiSettings, FiX, FiPackage, FiClock,
    FiFileText, FiUser, FiPhone, FiCheckCircle, FiEdit2,
    FiPlus, FiMinus, FiTag, FiCreditCard, FiAlertTriangle, FiEye, FiMapPin, FiShield, FiLock, FiTrendingUp, FiSave
} from 'react-icons/fi';

import { Invoice } from "../components/Invoice";

// --- STATIC DATA ---
const INDIAN_CITIES = [ "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Mysore", "Gurgaon" ];
const CATEGORIES = ["All", "Shirt", "T-Shirt", "Jeans", "Trousers", "Shoes", "Jacket", "Kurta", "Saree", "Watch", "Accessories"];

const StaffDashboard = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('pos'); 
    
    // --- 1. SAFE USER LOADING ---
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    
    // Data States
    const [products, setProducts] = useState([]);
    const [activeOffers, setActiveOffers] = useState([]);
    const [stats, setStats] = useState({ todayRevenue: 0, todayCount: 0, history: [] }); 
    const [salesHistory, setSalesHistory] = useState([]); // Explicit state for history view

    // Filters & Cart
    const [search, setSearch] = useState(''); 
    const [category, setCategory] = useState('All'); 
    const [historySearch, setHistorySearch] = useState(''); 
    const [cart, setCart] = useState([]);
    const [selectedDiscount, setSelectedDiscount] = useState(null);

    // Modals
    const [selectedSale, setSelectedSale] = useState(null); 
    const [showBillModal, setShowBillModal] = useState(false);

    // Settings State
    const [activeSettingTab, setActiveSettingTab] = useState('profile');
    const [profileForm, setProfileForm] = useState({ 
        name: user?.name || '', 
        phone: user?.phone || '', 
        address: user?.address || '',
        newPassword: ''
    });

    // UI States
    const [msg, setMsg] = useState(''); 
    const [currentTime, setCurrentTime] = useState(new Date()); 
    const [shiftStart] = useState(new Date()); 

    // Forms
    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', homeAddress: '', city: '' });
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [filteredCities, setFilteredCities] = useState([]);

    // Printing
    const [printData, setPrintData] = useState(null);
    const invoiceRef = useRef();
    const handlePrint = useReactToPrint({ 
        content: () => invoiceRef.current,
        onAfterPrint: () => setPrintData(null)
    });

    const getProductImage = (productName, cat) => {
        const name = productName ? productName.toLowerCase() : "";
        if (name.includes('t-shirt')) return "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80";
        if (name.includes('shirt')) return "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80";
        if (name.includes('jean') || name.includes('denim')) return "https://images.unsplash.com/photo-1542272617-08f08630329e?auto=format&fit=crop&w=400&q=80";
        if (name.includes('shoe')) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80";
        return "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&q=80"; 
    };

    const showNotification = (message, type = 'success') => { 
        setMsg({ text: message, type }); 
        setTimeout(() => setMsg(''), 3000); 
    };

    // --- DATA SYNC ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchDashboardData();
        const dataInterval = setInterval(fetchDashboardData, 5000); 
        return () => { clearInterval(timer); clearInterval(dataInterval); };
    }, []);

    const fetchDashboardData = async () => {
        const userId = user?.id || user?._id;
        if (!userId) return; 

        try {
            // Fetch Products, Stats, Offers, and ALL Sales History
            const [prodRes, statRes, offerRes, salesRes] = await Promise.all([
                axios.get('http://localhost:5001/api/staff/products').catch(() => ({ data: [] })),
                axios.get(`http://localhost:5001/api/staff/stats/${userId}`).catch(() => ({ data: {} })),
                axios.get('http://localhost:5001/api/admin/discounts').catch(() => ({ data: [] })),
                axios.get('http://localhost:5001/api/staff/sales-history').catch(() => ({ data: [] }))
            ]);

            // 1. Filter hidden products
            const rawProducts = Array.isArray(prodRes.data) ? prodRes.data : [];
            setProducts(rawProducts.filter(p => p.isAvailable !== false && p.isAvailable !== "false"));
            
            // 2. Set Stats
            const safeStats = statRes.data || {};
            setStats({
                todayRevenue: safeStats.todayRevenue || 0,
                todayCount: safeStats.todayCount || 0,
                history: Array.isArray(safeStats.history) ? safeStats.history : []
            });

            // 3. Set Active Offers
            setActiveOffers(Array.isArray(offerRes.data) ? offerRes.data.filter(o => o.isActive) : []);

            // 4. FILTER SALES HISTORY (Security Check)
            // Ensure data exists before filtering
            const allSales = Array.isArray(salesRes.data) ? salesRes.data : [];
            const mySalesOnly = allSales.filter(sale => 
                sale.staffEmail === user.email || sale.staffId === userId || sale.soldBy === userId
            );
            setSalesHistory(mySalesOnly);

        } catch (err) { console.error("Sync Error", err); }
    };

    // --- POS ACTIONS ---
    const addToCart = (p) => {
        if(p.stock <= 0) return showNotification("Out of Stock!", "error");
        setCart(prev => {
            const exist = prev.find(x => x._id === p._id);
            if (exist) {
                if(exist.qty >= p.stock) { showNotification("Stock limit reached!", "error"); return prev; }
                return prev.map(x => x._id === p._id ? {...exist, qty: exist.qty + 1} : x);
            }
            return [...prev, {...p, qty: 1}];
        });
        showNotification(`Added ${p.name}`);
    };

    const updateQty = (id, change) => {
        setCart(prev => prev.map(item => {
            if (item._id === id) {
                const newQty = Math.max(1, item.qty + change);
                if (change > 0 && newQty > item.stock) return item;
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const handleCityInput = (e) => {
        const input = e.target.value;
        setCustomerForm({...customerForm, city: input});
        if (input.length > 0) {
            const filtered = INDIAN_CITIES.filter(city => city.toLowerCase().startsWith(input.toLowerCase()));
            setFilteredCities(filtered);
            setShowCityDropdown(true);
        } else { setShowCityDropdown(false); }
    };

    // --- SETTINGS LOGIC ---
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        const userId = user?.id || user?._id;
        if (!userId) return;

        try {
            const payload = {
                name: profileForm.name,
                phone: profileForm.phone,
                address: profileForm.address,
                password: activeSettingTab === 'security' ? profileForm.newPassword : null
            };

            const res = await axios.put(`http://localhost:5001/api/staff/profile/${userId}`, payload);
            
            const updatedUser = { ...user, ...res.data.user };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            setProfileForm(prev => ({ ...prev, newPassword: '' }));
            showNotification("✅ Profile Updated Successfully!");
        } catch (err) {
            showNotification("Failed to update profile.", "error");
        }
    };

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    let discountVal = 0;
    if (selectedDiscount && subtotal >= selectedDiscount.minOrder) {
        discountVal = selectedDiscount.type === 'PERCENTAGE' ? (subtotal * selectedDiscount.value) / 100 : selectedDiscount.value;
    }
    const finalTotal = Math.max(0, subtotal - discountVal);

    const confirmAndGenerateBill = async (e) => {
        e.preventDefault();
        const userId = user?.id || user?._id;
        if (!userId) { alert("Session Error: Please logout and login again."); return; }
        if (customerForm.phone.length !== 10) { alert("Please enter a valid 10-digit Phone Number."); return; }

        try {
            const saleData = { 
                items: cart.map(i => ({ productId: i._id, name: i.name, price: i.price, quantity: i.qty })),
                soldBy: userId, 
                customerName: customerForm.name, customerPhone: customerForm.phone, customerAddress: customerForm.homeAddress, storeLocation: customerForm.city,
                subtotal, discount: selectedDiscount ? { code: selectedDiscount.code, amount: discountVal } : null, totalAmount: finalTotal
            };

            await axios.post('http://localhost:5001/api/staff/create-sale', saleData);
            setPrintData({ products: [...cart], totalAmount: finalTotal, subtotal, discount: discountVal, date: Date.now(), ...customerForm });
            showNotification('✅ Sale Completed!'); 
            setCart([]); setSelectedDiscount(null); setShowBillModal(false); setCustomerForm({ name: '', phone: '', homeAddress: '', city: '' });
            fetchDashboardData();
            setTimeout(() => { if (invoiceRef.current) handlePrint(); }, 500);
        } catch (err) { alert("Transaction Failed."); }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'All' ? true : p.category === category || p.name.toLowerCase().includes(category.toLowerCase());
        return matchesSearch && matchesCategory;
    });

    const shiftDuration = new Date(currentTime - shiftStart).toISOString().substr(11, 8);
    // const progress = Math.min(((stats.todayRevenue || 0) / 5000) * 100, 100);

    return (
        <div className="flex h-screen bg-[#080C14] font-sans text-slate-200 overflow-hidden relative">
            
            {msg && (
                <div className={`fixed top-6 right-6 z-[300] border text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${msg.type === 'error' ? 'bg-red-900/90 border-red-500' : 'bg-[#1e293b] border-indigo-500'}`}>
                    <FiCheckCircle className={msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}/> 
                    <p className="font-bold">{msg.text || msg}</p>
                </div>
            )}

            <nav className="w-20 bg-[#0F172A] flex flex-col items-center py-8 border-r border-slate-800 z-20">
                <div className="mb-10 p-3 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl shadow-lg"><FiPackage size={24} className="text-white"/></div>
                <div className="flex-1 space-y-6">
                    <NavIcon icon={<FiHome size={22}/>} active={view === 'home'} onClick={() => setView('home')} label="Command" />
                    <NavIcon icon={<FiGrid size={22}/>} active={view === 'pos'} onClick={() => setView('pos')} label="Billing" />
                    <NavIcon icon={<FiFileText size={22}/>} active={view === 'history'} onClick={() => setView('history')} label="History" />
                    <NavIcon icon={<FiSettings size={22}/>} active={view === 'settings'} onClick={() => setView('settings')} label="Settings" />
                </div>
                <button onClick={() => navigate('/')} className="p-4 text-slate-500 hover:text-red-500 transition"><FiLogOut size={24}/></button>
            </nav>

            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* --- VIEW 1: HOME --- */}
                {view === 'home' && (
                    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                        <header className="flex justify-between items-start mb-8">
                            <div><h1 className="text-3xl font-black text-white">Retail Command Center</h1><p className="text-slate-500">Operator: <span className="text-indigo-400 font-bold">{user?.name}</span></p></div>
                            <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl text-right"><p className="text-3xl font-mono font-bold text-white">{currentTime.toLocaleTimeString()}</p><p className="text-xs text-slate-500 mt-1 uppercase font-bold">Shift: {shiftDuration}</p></div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <StatCard title="Today's Revenue" value={`$${(stats.todayRevenue || 0).toFixed(2)}`} icon={<FiCreditCard/>} color="indigo" />
                            <StatCard title="Orders Processed" value={stats.todayCount || 0} icon={<FiCheckCircle/>} color="emerald" />
                            <StatCard title="Shift Timer" value={shiftDuration} icon={<FiClock/>} color="blue" />
                        </div>
                        <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-6">Recent Sales Activity</h2>
                            <div className="space-y-3">
                                {(stats.history || []).slice(0, 5).map(sale => (
                                    <div key={sale._id} className="flex items-center justify-between p-4 bg-[#080C14] rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition">
                                        <div className="flex items-center gap-4"><div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs"><FiFileText /></div><div><p className="font-bold text-white">{sale.customerName}</p><p className="text-xs text-slate-500">{new Date(sale.date || sale.createdAt).toLocaleTimeString()} • {sale.cart?.length || sale.items?.length || 0} Items</p></div></div>
                                        <div className="flex items-center gap-4"><span className="font-mono font-bold text-emerald-400">+${(sale.totalAmount || 0).toFixed(2)}</span><button onClick={() => setSelectedSale(sale)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg"><FiEye/></button></div>
                                    </div>
                                ))}
                                {(stats.history || []).length === 0 && <p className="text-slate-500 italic">No sales recorded yet today.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW 2: POS --- */}
                {view === 'pos' && (
                    <div className="flex h-full">
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar max-w-2xl">{CATEGORIES.map((cat) => (<button key={cat} onClick={() => setCategory(cat)} className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${category === cat ? 'bg-indigo-600 text-white' : 'bg-[#0F172A] text-slate-500 border border-slate-800 hover:text-white'}`}>{cat}</button>))}</div>
                                <div className="relative group"><FiSearch className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-indigo-500"/><input type="text" placeholder="Search..." className="bg-[#0F172A] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white w-64 outline-none focus:border-indigo-500 transition-all text-sm" onChange={e=>setSearch(e.target.value.toLowerCase())}/></div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {filteredProducts.map(p => (
                                    <div key={p._id} onClick={() => addToCart(p)} className="group bg-[#0F172A] rounded-2xl border border-slate-800 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all hover:-translate-y-1 shadow-lg">
                                        <div className="h-40 w-full relative">
                                            <img src={p.image || getProductImage(p.name, p.category)} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-110"/>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="bg-white/20 backdrop-blur-sm p-3 rounded-full text-white"><FiPlus size={24} /></div></div>
                                        </div>
                                        <div className="p-4">
                                            <h4 className="font-bold text-white text-sm line-clamp-1">{p.name}</h4>
                                            <div className="flex justify-between items-center mt-2"><span className="text-lg font-black text-white">${p.price}</span><span className={`text-[10px] font-bold px-2 py-1 rounded ${p.stock<5?'bg-red-500/20 text-red-400':'bg-emerald-500/20 text-emerald-400'}`}>{p.stock} Left</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-96 bg-[#0F172A] border-l border-slate-800 p-6 flex flex-col shadow-2xl z-10">
                            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2"><FiShoppingCart/> Current Bill</h2>
                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                {cart.map(c=>(
                                    <div key={c._id} className="flex justify-between items-center p-3 bg-[#080C14] rounded-lg border border-slate-800">
                                        <div className="flex items-center gap-3"><img src={c.image || getProductImage(c.name, c.category)} className="w-10 h-10 rounded-lg object-cover" alt="prod"/><div><p className="text-sm font-bold text-white line-clamp-1 w-28">{c.name}</p><p className="text-xs text-slate-500">${c.price} x {c.qty}</p></div></div>
                                        <div className="flex items-center gap-2"><button onClick={()=>updateQty(c._id, -1)} className="text-slate-500 hover:text-white"><FiMinus size={14}/></button><span className="text-xs font-bold text-white w-4 text-center">{c.qty}</span><button onClick={()=>updateQty(c._id, 1)} className="text-slate-500 hover:text-white"><FiPlus size={14}/></button><button onClick={() => setCart(cart.filter(x=>x._id!==c._id))} className="text-slate-600 hover:text-red-500 ml-1"><FiTrash2 size={14}/></button></div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><FiTag/> Coupons</label><div className="relative"><select className="w-full bg-[#080C14] text-white text-sm p-3 rounded-xl border border-slate-800 outline-none focus:border-indigo-500 appearance-none" onChange={(e) => { const o = activeOffers.find(offer => offer.code === e.target.value); setSelectedDiscount(o || null); }} value={selectedDiscount?.code || ''}><option value="">No Offer Selected</option>{activeOffers.map(o => (<option key={o._id} value={o.code}>{o.code} ({o.type === 'PERCENTAGE' ? `${o.value}%` : `$${o.value}`})</option>))}</select><div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none text-xs">▼</div></div>{selectedDiscount && subtotal < selectedDiscount.minOrder && <p className="text-[10px] text-red-500 mt-2 flex items-center gap-1"><FiAlertTriangle/> Add ${(selectedDiscount.minOrder - subtotal).toFixed(2)} more</p>}</div>
                                <div className="space-y-2 text-sm"><div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between text-emerald-400"><span>Discount</span><span>-${discountVal.toFixed(2)}</span></div><div className="flex justify-between text-white font-black text-2xl pt-2 border-t border-slate-800"><span>Total</span><span>${finalTotal.toFixed(2)}</span></div></div>
                                <button onClick={() => cart.length > 0 && setShowBillModal(true)} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${cart.length > 0 ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}><FiCreditCard/> Complete Sale</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW 3: HISTORY --- */}
                {view === 'history' && (
                    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Sales History</h2><div className="relative group"><FiSearch className="absolute left-3 top-2.5 text-slate-500"/><input type="text" placeholder="Search Bill ID..." className="bg-[#0F172A] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white w-64 outline-none focus:border-indigo-500" onChange={e => setHistorySearch(e.target.value)}/></div></div>
                        <div className="bg-[#0F172A] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-[#131C31] text-xs font-bold uppercase text-slate-400"><tr><th className="p-5">Bill ID</th><th className="p-5">Customer</th><th className="p-5">Items</th><th className="p-5">Amount</th><th className="p-5">Date</th><th className="p-5 text-right">View</th></tr></thead>
                                <tbody className="divide-y divide-slate-800">
                                    {/* Using salesHistory state which is already filtered for this staff */}
                                    {salesHistory.filter(h => h._id.includes(historySearch) || h.customerName?.toLowerCase().includes(historySearch.toLowerCase())).map(s => (
                                    <tr key={s._id} className="hover:bg-slate-800/30 transition"><td className="p-5 font-mono text-indigo-400 font-bold">#{s._id.slice(-6).toUpperCase()}</td><td className="p-5"><div className="font-bold text-white">{s.customerName}</div><div className="text-[10px] text-slate-500">{s.customerPhone}</div></td><td className="p-5">{s.items?.length || s.cart?.length || 0} items</td><td className="p-5 text-emerald-400 font-bold">${(s.totalAmount || 0).toFixed(2)}</td><td className="p-5 text-slate-500">{new Date(s.date || s.createdAt).toLocaleString()}</td><td className="p-5 text-right"><button onClick={() => setSelectedSale(s)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg"><FiEye/></button></td></tr>))}
                                    {salesHistory.length === 0 && (
                                        <tr><td colSpan="6" className="p-8 text-center text-slate-500">No sales history found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- VIEW 4: SETTINGS --- */}
                {view === 'settings' && (
                    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                        <h1 className="text-3xl font-bold text-white mb-8">System Configuration</h1>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-6 h-fit shadow-xl">
                                <div className="flex flex-col items-center mb-6">
                                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-black text-white mb-4 shadow-lg">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
                                    <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                                    <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mt-1">Active Staff</p>
                                </div>
                                <div className="space-y-2">
                                    <button onClick={() => setActiveSettingTab('profile')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${activeSettingTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><FiUser/> Profile Information</button>
                                    <button onClick={() => setActiveSettingTab('security')} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${activeSettingTab === 'security' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><FiShield/> Account Security</button>
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <form onSubmit={handleSaveSettings} className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8 shadow-xl animate-fade-in">
                                    {activeSettingTab === 'profile' ? (
                                        <>
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FiEdit2/> Edit Profile Details</h3>
                                            <div className="grid grid-cols-2 gap-6 mb-6">
                                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Full Name</label><input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"/></div>
                                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Contact Number</label><input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"/></div>
                                            </div>
                                            <div className="mb-6"><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Residential Address</label><textarea rows="3" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"></textarea></div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FiLock/> Password Management</h3>
                                            <div className="space-y-6 mb-6">
                                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">New Password</label><input type="password" value={profileForm.newPassword} onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"/></div>
                                                <p className="text-xs text-slate-500 italic">Leave empty if you don't want to change password.</p>
                                            </div>
                                        </>
                                    )}
                                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"><FiSave/> Save Changes</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* BILL MODAL */}
            {showBillModal && (
                <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1E293B] rounded-3xl w-full max-w-lg p-8 border border-slate-700 shadow-2xl relative animate-fade-in-up">
                        <button onClick={() => setShowBillModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><FiX size={24}/></button>
                        <h2 className="text-2xl font-black text-white mb-6">Customer Details</h2>
                        <form onSubmit={confirmAndGenerateBill} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input required placeholder="Name" className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})}/>
                                <input required placeholder="Phone" className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" value={customerForm.phone} onChange={e => { if(/^\d{0,10}$/.test(e.target.value)) setCustomerForm({...customerForm, phone: e.target.value}) }}/>
                            </div>
                            <input required placeholder="Address" className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" value={customerForm.homeAddress} onChange={e => setCustomerForm({...customerForm, homeAddress: e.target.value})}/>
                            <div className="relative">
                                <input required placeholder="City" className="w-full bg-[#0F172A] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" value={customerForm.city} onChange={handleCityInput}/>
                                {showCityDropdown && <div className="absolute top-full left-0 w-full bg-[#0F172A] border border-slate-700 rounded-xl mt-1 max-h-40 overflow-y-auto z-50 shadow-xl custom-scrollbar">{filteredCities.map((city, i) => (<div key={i} className="p-3 hover:bg-indigo-600 hover:text-white cursor-pointer text-slate-300" onClick={() => { setCustomerForm({...customerForm, city}); setShowCityDropdown(false); }}>{city}</div>))}</div>}
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl mt-4 transition-all shadow-lg flex items-center justify-center gap-2"><FiCheckCircle/> Confirm & Print Bill</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* INVOICE PREVIEW MODAL */}
            {selectedSale && (
                <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full h-[90vh] overflow-y-auto text-black relative">
                        <button onClick={() => setSelectedSale(null)} className="absolute top-4 right-4 text-black hover:text-red-600"><FiX size={28}/></button>
                        <Invoice data={selectedSale} />
                    </div>
                </div>
            )}

            {/* HIDDEN INVOICE FOR PRINTING */}
            <div style={{ display: 'none' }}><Invoice ref={invoiceRef} data={printData} /></div>
        </div>
    );
};

// Reusable Components
const NavIcon = ({ icon, active, onClick, label }) => (
    <div className="relative group flex justify-center">
        <button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-[#1E293B] hover:text-white'}`}>{icon}</button>
        <span className="absolute left-16 bg-white text-slate-900 text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">{label}</span>
    </div>
);

const StatCard = ({ title, value, icon, color }) => (
    <div className={`bg-[#0F172A] rounded-2xl border border-slate-800 p-6 flex items-center justify-between shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-default`}>
        <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`}></div>
        <div><p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">{title}</p><h3 className="text-3xl font-black text-white">{value}</h3></div>
        <div className={`p-4 bg-${color}-500/10 text-${color}-400 rounded-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
);

export default StaffDashboard;