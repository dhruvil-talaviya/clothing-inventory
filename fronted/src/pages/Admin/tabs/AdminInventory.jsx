import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FiPlus, FiSearch, FiPackage, FiCheckCircle, FiAlertCircle,
    FiX, FiEdit2, FiTrash2, FiTag, FiLayers, FiAlertTriangle,
    FiGrid, FiList, FiRefreshCw, FiDownload
} from 'react-icons/fi';
import { BiBarcodeReader } from 'react-icons/bi';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CATEGORIES = [
    { value:'Shirt',       label:'Shirt',       prefix:'SHT' },
    { value:'T-Shirt',     label:'T-Shirt',     prefix:'TSH' },
    { value:'Jeans',       label:'Jeans',       prefix:'JNS' },
    { value:'Trousers',    label:'Trousers',    prefix:'TRS' },
    { value:'Shoes',       label:'Shoes',       prefix:'SHO' },
    { value:'Jacket',      label:'Jacket',      prefix:'JKT' },
    { value:'Kurta',       label:'Kurta',       prefix:'KRT' },
    { value:'Saree',       label:'Saree',       prefix:'SAR' },
    { value:'Watch',       label:'Watch',       prefix:'WTC' },
    { value:'Accessories', label:'Accessories', prefix:'ACC' },
];

// ─── SKU GENERATOR ────────────────────────────────────────────────────────────
const generateSKU = (category, name, size) => {
    const cat   = CATEGORIES.find(c => c.value === category)?.prefix || 'GEN';
    const brand = name ? name.replace(/[^a-zA-Z]/g,'').toUpperCase().slice(0,3).padEnd(3,'X') : 'XXX';
    const seq   = Math.floor(Math.random() * 9000) + 1000;
    return `${cat}-${brand}-${size||'OS'}-${new Date().getFullYear()}-${seq}`;
};

const blankSizes = () => Object.fromEntries(SIZES.map(s => [s, { stock:'', sku:'' }]));
const BLANK_FORM  = { name:'', category:'', costPrice:'', price:'', color:'', description:'', sizes: blankSizes() };

// ─── BARCODE DISPLAY ──────────────────────────────────────────────────────────
const BarcodeDisplay = ({ sku, size: bSize = 'sm' }) => {
    if (!sku) return null;
    const bars = sku.split('').map((c, i) => ({ w:(c.charCodeAt(0)%3)+1, isSpace: i%7===6 }));
    return (
        <div className="flex flex-col items-start gap-1">
            <div className={`flex items-end gap-[1px] ${bSize==='lg'?'h-10':'h-6'} overflow-hidden`}>
                {bars.map((bar, i) => (
                    <div key={i} className={`${bar.isSpace?'bg-transparent':'bg-slate-300'} rounded-[1px]`}
                        style={{ width:`${bar.w+1}px`, height:`${60+(i%3)*20}%` }}/>
                ))}
                <div className="bg-slate-300 rounded-[1px]" style={{ width:'2px', height:'100%' }}/>
            </div>
            <span className="text-[9px] font-mono text-slate-500 tracking-widest">{sku}</span>
        </div>
    );
};

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange }) => (
    <div onClick={e => { e.stopPropagation(); onChange(); }}
        className={`relative w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${checked?'bg-emerald-500':'bg-slate-700'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${checked?'translate-x-6':'translate-x-0'}`}/>
    </div>
);

// ─── SIZE STOCK INPUT ─────────────────────────────────────────────────────────
const SizeStockInput = ({ sizes, onChange }) => (
    <div className="grid grid-cols-3 gap-3">
        {SIZES.map(size => (
            <div key={size} className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{size}</span>
                    <span className="text-indigo-400 font-mono text-[9px]">{sizes[size]?.sku?.slice(-9)||'—'}</span>
                </label>
                <input type="number" min="0" placeholder="0"
                    value={sizes[size]?.stock??''}
                    onChange={e => onChange(size, e.target.value)}
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-sm outline-none focus:border-indigo-500 transition-all text-center font-bold"/>
            </div>
        ))}
    </div>
);

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────
const DeleteModal = ({ product, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <FiTrash2 size={22} className="text-rose-400"/>
                </div>
                <h3 className="text-white font-black text-lg mb-1">Delete Product?</h3>
                <p className="text-slate-400 text-sm mb-2">You're about to permanently delete:</p>
                <p className="text-white font-bold text-sm bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl mb-5 w-full truncate">
                    {product?.name}
                </p>
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-5 w-full">
                    <FiAlertTriangle size={14} className="text-rose-400 shrink-0"/>
                    <p className="text-rose-300 text-xs font-semibold">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white font-bold rounded-xl text-sm transition-all">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2">
                        <FiTrash2 size={13}/> Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────
const ProductForm = ({ form, setForm, onSubmit, onClose, title, submitLabel, submitColor, regenerateSKUs }) => (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#1e293b] rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-xl"><FiX size={18}/></button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Product Name *</label>
                        <input required placeholder="e.g. Classic Slim Fit Shirt"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                            onBlur={() => regenerateSKUs(form, setForm)}/>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category *</label>
                        <select required className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                            onBlur={() => regenerateSKUs(form, setForm)}>
                            <option value="" disabled>Select Category</option>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Color / Variant</label>
                        <input placeholder="e.g. Navy Blue"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))}/>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cost Price (₹)</label>
                        <input type="number" step="0.01" min="0" placeholder="0.00"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.costPrice} onChange={e => setForm(f=>({...f,costPrice:e.target.value}))}/>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Selling Price (₹) *</label>
                        <input type="number" step="0.01" min="0" required placeholder="0.00"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))}/>
                    </div>
                </div>

                {/* Size Inventory */}
                <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-black text-white">Size Inventory</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Enter stock quantity per size. SKUs auto-generate.</p>
                        </div>
                        <button type="button" onClick={() => regenerateSKUs(form, setForm)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">
                            <FiRefreshCw size={10}/> Regen SKUs
                        </button>
                    </div>
                    <SizeStockInput sizes={form.sizes} onChange={(size, val) =>
                        setForm(f => ({ ...f, sizes: { ...f.sizes, [size]: { stock:val, sku: f.sizes[size]?.sku || generateSKU(f.category, f.name, size) } } }))
                    }/>
                    {SIZES.some(s => form.sizes[s]?.sku) && (
                        <div className="mt-4 pt-4 border-t border-slate-800/60">
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">SKUs Preview</p>
                            <div className="space-y-1">
                                {SIZES.filter(s => form.sizes[s]?.sku).map(s => (
                                    <div key={s} className="flex items-center gap-2">
                                        <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded w-8 text-center">{s}</span>
                                        <span className="font-mono text-[10px] text-slate-500">{form.sizes[s]?.sku}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button type="submit" className={`w-full ${submitColor} text-white py-4 rounded-xl font-bold shadow-lg transition-all`}>
                    {submitLabel}
                </button>
            </form>
        </div>
    </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AdminInventory = () => {
    const [products,         setProducts]         = useState([]);
    const [search,           setSearch]           = useState('');
    const [categoryFilter,   setCategoryFilter]   = useState('All');
    const [viewMode,         setViewMode]         = useState('table');
    const [showAddModal,     setShowAddModal]     = useState(false);
    const [showEditModal,    setShowEditModal]    = useState(false);
    const [showBarcodeModal, setShowBarcodeModal] = useState(null);
    const [deleteTarget,     setDeleteTarget]     = useState(null);
    const [selectedProduct,  setSelectedProduct]  = useState(null);
    const [msg,              setMsg]              = useState({ text:'', type:'' });
    const [isLoading,        setIsLoading]        = useState(false);
    const [productForm,      setProductForm]      = useState(BLANK_FORM);
    const [editForm,         setEditForm]         = useState(BLANK_FORM);

    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        setIsLoading(true);
        try { const res = await axios.get('http://localhost:5001/api/admin/products').catch(()=>({data:[]})); setProducts(res.data||[]); }
        catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const notify = (text, type) => { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),3500); };

    const regenerateSKUs = (form, setForm) => {
        const newSizes = { ...form.sizes };
        SIZES.forEach(size => {
            newSizes[size] = { ...newSizes[size], sku: generateSKU(form.category, form.name, size) };
        });
        setForm(f => ({ ...f, sizes: newSizes }));
    };

    // ── ADD PRODUCT ───────────────────────────────────────────────────────────
    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!SIZES.some(s => Number(productForm.sizes[s]?.stock) > 0)) { notify("Add stock for at least one size.", "error"); return; }
        try {
            const variants   = SIZES.filter(s => productForm.sizes[s]?.stock > 0).map(s => ({ size:s, sku:productForm.sizes[s].sku, stock:Number(productForm.sizes[s].stock) }));
            const totalStock = variants.reduce((a,b) => a+b.stock, 0);
            await axios.post('http://localhost:5001/api/admin/add-product', {
                name:productForm.name, category:productForm.category, costPrice:productForm.costPrice,
                price:productForm.price, color:productForm.color, description:productForm.description,
                sku:variants[0]?.sku, stock:totalStock, variants, totalStock
            });
            notify("✅ Product Added Successfully!", "success");
            setShowAddModal(false); setProductForm(BLANK_FORM); fetchProducts();
        } catch { notify("Failed to add product", "error"); }
    };

    // ── EDIT PRODUCT ──────────────────────────────────────────────────────────
    const openEditModal = (product) => {
        setSelectedProduct(product);
        const sizes = blankSizes();
        if (product.variants?.length) product.variants.forEach(v => { sizes[v.size] = { stock:v.stock, sku:v.sku }; });
        else sizes['M'] = { stock:product.stock||0, sku:product.sku||generateSKU(product.category,product.name,'M') };
        setEditForm({ name:product.name||'', category:product.category||'', costPrice:product.costPrice||'', price:product.price||'', color:product.color||'', description:product.description||'', sizes });
        setShowEditModal(true);
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();
        try {
            const variants   = SIZES.filter(s => Number(editForm.sizes[s]?.stock)>0 || editForm.sizes[s]?.sku).map(s => ({ size:s, sku:editForm.sizes[s]?.sku||generateSKU(editForm.category,editForm.name,s), stock:Number(editForm.sizes[s]?.stock||0) }));
            const totalStock = variants.reduce((a,b) => a+b.stock, 0);
            await axios.put(`http://localhost:5001/api/admin/edit-product/${selectedProduct._id}`, {
                name:editForm.name, category:editForm.category, costPrice:editForm.costPrice,
                price:editForm.price, color:editForm.color, description:editForm.description,
                sku:variants[0]?.sku, stock:totalStock, variants, totalStock
            });
            notify("✅ Product Updated!", "success"); setShowEditModal(false); fetchProducts();
        } catch { notify("Failed to update product", "error"); }
    };

    // ── DELETE ────────────────────────────────────────────────────────────────
    const handleDeleteProduct = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`http://localhost:5001/api/admin/delete-product/${deleteTarget._id}`);
            notify("Product Deleted", "success"); setDeleteTarget(null); fetchProducts();
        } catch { notify("Failed to delete", "error"); }
    };

    // ── TOGGLE ────────────────────────────────────────────────────────────────
    const toggleStatus = async (id) => {
        try {
            await axios.put(`http://localhost:5001/api/admin/product-status/${id}`);
            setProducts(products.map(p => p._id===id ? {...p,isAvailable:!p.isAvailable} : p));
        } catch { notify("Failed to update status","error"); }
    };

    // ── FILTERS ───────────────────────────────────────────────────────────────
    const filtered = products.filter(p => {
        const q = search.toLowerCase();
        return (
            ((p.name||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q) || (p.variants||[]).some(v=>(v.sku||'').toLowerCase().includes(q))) &&
            (categoryFilter==='All' || p.category===categoryFilter)
        );
    });

    const lowStockCount = products.filter(p => (p.totalStock||p.stock||0) <= 10).length;
    const totalUnits    = products.reduce((a,p) => a+(p.totalStock||p.stock||0), 0);

    // ── STOCK COLOR ───────────────────────────────────────────────────────────
    const stockColor = (n) => n<=0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : n<=5 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    return (
        <div className="space-y-6 relative">

            {/* TOAST */}
            {msg.text && (
                <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-xl font-bold text-white flex items-center gap-3 shadow-2xl ${msg.type==='success'?'bg-emerald-600 border border-emerald-400':'bg-red-600 border border-red-400'}`}>
                    {msg.type==='success' ? <FiCheckCircle size={20}/> : <FiAlertCircle size={20}/>} {msg.text}
                </div>
            )}

            {/* STATS ROW */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label:'Total Products',  value:products.length,                                    color:'indigo', icon:<FiPackage/>      },
                    { label:'Total Units',     value:totalUnits.toLocaleString('en-IN'),                 color:'blue',   icon:<FiLayers/>       },
                    { label:'Low Stock',       value:lowStockCount, color:lowStockCount>0?'red':'emerald',               icon:<FiAlertTriangle/>},
                    { label:'Active Listings', value:products.filter(p=>p.isAvailable!==false).length,  color:'emerald',icon:<FiCheckCircle/>  },
                ].map(s => (
                    <div key={s.label} className={`p-4 rounded-2xl border flex items-center gap-4 bg-[#0f172a]
                        ${s.color==='indigo'?'border-indigo-500/20 text-indigo-400':s.color==='blue'?'border-blue-500/20 text-blue-400':s.color==='red'?'border-red-500/20 text-red-400':'border-emerald-500/20 text-emerald-400'}`}>
                        <div className="text-xl opacity-80">{s.icon}</div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
                            <p className="text-2xl font-black text-white">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative group">
                        <FiSearch className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-indigo-500"/>
                        <input type="text" placeholder="Search name, SKU..."
                            className="bg-[#1e293b] border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white w-64 outline-none focus:border-indigo-500 transition-all text-sm"
                            onChange={e => setSearch(e.target.value)}/>
                    </div>
                    <div className="flex gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
                        <button onClick={() => setCategoryFilter('All')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter==='All'?'bg-indigo-600 text-white':'text-slate-500 hover:text-white'}`}>All</button>
                        {CATEGORIES.slice(0,5).map(c => (
                            <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter===c.value?'bg-indigo-600 text-white':'text-slate-500 hover:text-white'}`}>{c.label}</button>
                        ))}
                    </div>
                    <div className="flex gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg transition-all ${viewMode==='table'?'bg-slate-700 text-white':'text-slate-600 hover:text-white'}`}><FiList size={16}/></button>
                        <button onClick={() => setViewMode('grid')}  className={`p-1.5 rounded-lg transition-all ${viewMode==='grid' ?'bg-slate-700 text-white':'text-slate-600 hover:text-white'}`}><FiGrid size={16}/></button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchProducts} className="p-2.5 bg-[#1e293b] border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"><FiRefreshCw size={16}/></button>
                    <button onClick={() => { setProductForm(BLANK_FORM); setShowAddModal(true); }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-indigo-500/25 transition-all">
                        <FiPlus/> Add Product
                    </button>
                </div>
            </div>

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
                <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#0f172a] text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-700">
                                <tr>
                                    {['Product','SKU / Barcodes','Category','Price','Size Stock','Active','Actions'].map((h,i) => (
                                        <th key={h} className={`p-5 ${i===5?'text-center':''} ${i===6?'text-right':''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 text-sm text-slate-300">
                                {isLoading ? (
                                    <tr><td colSpan="7" className="p-12 text-center text-slate-500">Loading inventory...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="7" className="p-12 text-center text-slate-500">No products found.</td></tr>
                                ) : filtered.map(p => {
                                    const variants   = p.variants || [];
                                    const totalStock = p.totalStock || p.stock || 0;
                                    return (
                                        <tr key={p._id} className="hover:bg-slate-800/40 transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-900 to-slate-800 rounded-xl flex items-center justify-center shrink-0">
                                                        <FiPackage className="text-indigo-400"/>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold leading-tight">{p.name}</p>
                                                        {p.color && <p className="text-slate-500 text-[10px] mt-0.5">Color: {p.color}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {variants.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {variants.slice(0,2).map(v => (
                                                            <div key={v.size} className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{v.size}</span>
                                                                <span className="font-mono text-[10px] text-slate-400">{v.sku}</span>
                                                            </div>
                                                        ))}
                                                        {variants.length > 2 && <button onClick={() => setShowBarcodeModal(p)} className="text-[10px] text-indigo-400 hover:underline">+{variants.length-2} more →</button>}
                                                    </div>
                                                ) : <span className="font-mono text-[11px] text-slate-400">{p.sku||'—'}</span>}
                                                <button onClick={() => setShowBarcodeModal(p)} className="mt-2 flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-all">
                                                    <BiBarcodeReader size={12}/> View Barcodes
                                                </button>
                                            </td>
                                            <td className="p-5">
                                                <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold border border-slate-700">{p.category||'General'}</span>
                                            </td>
                                            <td className="p-5">
                                                <p className="font-black text-emerald-400">₹{Number(p.price||0).toFixed(2)}</p>
                                                {p.costPrice && <p className="text-[10px] text-slate-500 mt-0.5">Cost: ₹{Number(p.costPrice).toFixed(2)}</p>}
                                            </td>
                                            <td className="p-5">
                                                {variants.length > 0 ? (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {SIZES.map(size => {
                                                            const v = variants.find(x => x.size===size);
                                                            if (!v) return <span key={size} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-600 font-bold">{size}</span>;
                                                            return <span key={size} className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${stockColor(v.stock)}`}>{size}: {v.stock}</span>;
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${totalStock<=10?'bg-red-500/10 text-red-400 border-red-500/20':'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                                        {totalStock} units {totalStock<=10&&'⚠️'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex justify-center">
                                                    <ToggleSwitch checked={p.isAvailable!==false} onChange={() => toggleStatus(p._id)}/>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setShowBarcodeModal(p)} className="p-2 text-slate-400 hover:text-indigo-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"><BiBarcodeReader size={16}/></button>
                                                    <button onClick={() => openEditModal(p)}        className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"><FiEdit2 size={15}/></button>
                                                    <button onClick={() => setDeleteTarget(p)}      className="p-2 text-slate-400 hover:text-red-400   bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"><FiTrash2 size={15}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map(p => {
                        const variants   = p.variants || [];
                        const totalStock = p.totalStock || p.stock || 0;
                        return (
                            <div key={p._id} className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden hover:border-indigo-500/40 transition-all group">
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700">{p.category}</span>
                                        <ToggleSwitch checked={p.isAvailable!==false} onChange={() => toggleStatus(p._id)}/>
                                    </div>
                                    <h4 className="font-black text-white text-base leading-tight mb-1">{p.name}</h4>
                                    {p.color && <p className="text-[10px] text-slate-500 mb-3">{p.color}</p>}
                                    <p className="text-2xl font-black text-emerald-400 mb-4">₹{Number(p.price||0).toFixed(2)}</p>
                                    <div className="grid grid-cols-3 gap-1 mb-4">
                                        {SIZES.map(size => {
                                            const v = variants.find(x => x.size===size);
                                            if (!v) return <div key={size} className="text-center py-1.5 rounded-lg bg-slate-800/30 text-slate-600 text-[9px] font-bold">{size}<br/>—</div>;
                                            return <div key={size} className={`text-center py-1.5 rounded-lg text-[9px] font-black ${v.stock<=0?'bg-red-500/10 text-red-400':v.stock<=5?'bg-orange-500/10 text-orange-400':'bg-emerald-500/10 text-emerald-400'}`}>{size}<br/>{v.stock}</div>;
                                        })}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setShowBarcodeModal(p)}   className="flex-1 py-2 text-xs font-bold bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all flex items-center justify-center gap-1"><BiBarcodeReader size={13}/> Barcodes</button>
                                        <button onClick={() => openEditModal(p)}          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"><FiEdit2 size={14}/></button>
                                        <button onClick={() => setDeleteTarget(p)}        className="p-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-all"><FiTrash2 size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* BARCODE MODAL */}
            {showBarcodeModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#0f172a] rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-2"><BiBarcodeReader className="text-indigo-400"/> Barcode Sheet</h3>
                                <p className="text-slate-400 text-sm mt-0.5">{showBarcodeModal.name} — All Size Variants</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all"><FiDownload size={14}/> Print Sheet</button>
                                <button onClick={() => setShowBarcodeModal(null)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-xl"><FiX size={20}/></button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="bg-[#1e293b] rounded-xl p-4 mb-6 flex justify-between items-center border border-slate-700">
                                <div>
                                    <p className="font-black text-white text-lg">{showBarcodeModal.name}</p>
                                    <p className="text-slate-400 text-sm">{showBarcodeModal.category} • ₹{Number(showBarcodeModal.price||0).toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Units</p>
                                    <p className="text-3xl font-black text-white">{showBarcodeModal.totalStock||showBarcodeModal.stock||0}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {(showBarcodeModal.variants?.length
                                    ? showBarcodeModal.variants
                                    : [{ size:'ONE SIZE', sku:showBarcodeModal.sku, stock:showBarcodeModal.stock }]
                                ).map(v => (
                                    <div key={v.size} className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-black text-white">{v.size}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${stockColor(v.stock)}`}>{v.stock} in stock</span>
                                            </div>
                                            <FiTag className="text-slate-600"/>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 flex flex-col items-center"><BarcodeDisplay sku={v.sku} size="lg"/></div>
                                        <div className="bg-[#0f172a] rounded-lg p-3">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Full SKU</p>
                                            <p className="font-mono text-xs text-indigo-400 font-bold break-all">{v.sku}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD / EDIT MODALS */}
            {showAddModal && (
                <ProductForm form={productForm} setForm={setProductForm} onSubmit={handleAddProduct}
                    onClose={() => setShowAddModal(false)} title="Add New Product"
                    submitLabel="+ Add Product to Inventory" submitColor="bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25"
                    regenerateSKUs={regenerateSKUs}/>
            )}
            {showEditModal && (
                <ProductForm form={editForm} setForm={setEditForm} onSubmit={handleEditProduct}
                    onClose={() => setShowEditModal(false)} title="Edit Product"
                    submitLabel="Save Changes" submitColor="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
                    regenerateSKUs={regenerateSKUs}/>
            )}

            {/* DELETE CONFIRM MODAL */}
            {deleteTarget && (
                <DeleteModal product={deleteTarget} onConfirm={handleDeleteProduct} onCancel={() => setDeleteTarget(null)}/>
            )}
        </div>
    );
};

export default AdminInventory;