import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiSearch, FiPackage, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const ToggleSwitch = ({ checked, onChange }) => (
    <div className={`relative w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`} onClick={(e) => { e.stopPropagation(); onChange(); }}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </div>
);

const AdminInventory = () => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [showProductModal, setShowProductModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockUpdateValue, setStockUpdateValue] = useState('');
    const [productForm, setProductForm] = useState({ name: '', sku: '', category: '', costPrice: '', price: '', stock: '' });
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/staff/products');
            setProducts(res.data);
        } catch (err) { console.error(err); }
    };

    const showNotification = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5001/api/admin/add-product', productForm);
            showNotification("Product Added!", "success");
            setShowProductModal(false);
            fetchProducts();
            setProductForm({ name: '', sku: '', category: '', costPrice: '', price: '', stock: '' });
        } catch (e) { showNotification("Failed", "error"); }
    };

    const handleUpdateStock = async (e) => {
        e.preventDefault();
        try {
            const newTotal = parseInt(selectedProduct.stock) + parseInt(stockUpdateValue);
            await axios.put(`http://localhost:5001/api/admin/update-stock/${selectedProduct._id}`, { newStock: newTotal });
            showNotification("Stock Updated!", "success");
            setShowStockModal(false);
            setStockUpdateValue('');
            fetchProducts();
        } catch (e) { showNotification("Failed", "error"); }
    };

    const toggleStatus = async (id) => {
        try {
            await axios.put(`http://localhost:5001/api/admin/product-status/${id}`);
            // Optimistic update
            setProducts(products.map(p => p._id === id ? { ...p, isAvailable: !p.isAvailable } : p));
            showNotification("Visibility Updated", "success");
        } catch (e) { showNotification("Failed to update status", "error"); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {msg.text && <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold text-white flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{msg.type === 'success' ? <FiCheckCircle/> : <FiAlertCircle/>}{msg.text}</div>}

            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div><h3 className="text-2xl font-bold text-white">Inventory</h3><p className="text-slate-400 text-sm">{products.length} Items • {products.filter(p => !p.isAvailable).length} Hidden</p></div>
                <div className="flex items-center gap-4">
                    <div className="relative group w-64">
                        <FiSearch className="absolute left-3 top-3 text-slate-500 group-focus-within:text-indigo-500"/>
                        <input type="text" placeholder="Search..." className="w-full bg-[#1e293b] border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white outline-none focus:border-indigo-500 transition-all" onChange={(e) => setSearch(e.target.value)}/>
                    </div>
                    <button onClick={() => setShowProductModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"><FiPlus/> Add Product</button>
                </div>
            </div>

            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-[#0f172a] text-slate-400 text-xs font-black uppercase tracking-wider border-b border-slate-700">
                        <tr><th className="p-5">Product</th><th className="p-5">Category</th><th className="p-5">Price</th><th className="p-5">Stock</th><th className="p-5">Status</th><th className="p-5 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm font-medium text-slate-300">
                        {filteredProducts.map(p => (
                            <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-5"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500"><FiPackage/></div><div><p className="font-bold text-white">{p.name}</p><p className="text-xs text-slate-500 font-mono">{p.sku}</p></div></div></td>
                                <td className="p-5"><span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-[10px] uppercase font-bold">{p.category || 'General'}</span></td>
                                <td className="p-5 font-bold text-emerald-400">${p.price}</td>
                                <td className="p-5"><span className={`font-bold ${p.stock < 5 ? 'text-red-400' : 'text-slate-300'}`}>{p.stock} Units</span></td>
                                <td className="p-5"><div className="flex items-center gap-3"><ToggleSwitch checked={p.isAvailable} onChange={() => toggleStatus(p._id)} /><span className={`text-xs font-bold uppercase ${p.isAvailable ? 'text-emerald-500' : 'text-slate-500'}`}>{p.isAvailable ? 'Live' : 'Hidden'}</span></div></td>
                                <td className="p-5 text-right"><button onClick={() => { setSelectedProduct(p); setShowStockModal(true); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all">+ Restock</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* ADD PRODUCT & STOCK MODALS (Same as before - ensure they are included) */}
             {showProductModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-2xl w-full max-w-lg p-8 border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Add New Product</h3>
                            <button onClick={()=>setShowProductModal(false)} className="text-slate-500 hover:text-white">Close</button>
                        </div>
                        <form onSubmit={handleAddProduct} className="space-y-4">
                            <input className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="Product Name" value={productForm.name} onChange={e=>setProductForm({...productForm, name:e.target.value})} required />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="SKU" value={productForm.sku} onChange={e=>setProductForm({...productForm, sku:e.target.value})} required />
                                <input className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="Category" value={productForm.category} onChange={e=>setProductForm({...productForm, category:e.target.value})} required />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <input type="number" className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="Cost" value={productForm.costPrice} onChange={e=>setProductForm({...productForm, costPrice:e.target.value})} required />
                                <input type="number" className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="Price" value={productForm.price} onChange={e=>setProductForm({...productForm, price:e.target.value})} required />
                                <input type="number" className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="Stock" value={productForm.stock} onChange={e=>setProductForm({...productForm, stock:e.target.value})} required />
                            </div>
                            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold mt-2 transition-all">Save to Inventory</button>
                        </form>
                    </div>
                </div>
            )}

            {showStockModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm p-8 border border-slate-700 shadow-2xl relative">
                        <button onClick={()=>setShowStockModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">Close</button>
                        <h3 className="text-xl font-bold text-white mb-2">Restock Product</h3>
                        <p className="text-slate-400 text-sm mb-6">{selectedProduct.name}</p>
                        <form onSubmit={handleUpdateStock} className="space-y-4">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Current Stock</span>
                                <span className="text-2xl font-black text-white">{selectedProduct.stock}</span>
                            </div>
                            <input autoFocus className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white text-center text-3xl font-bold outline-none focus:border-emerald-500" type="number" placeholder="+ 0" value={stockUpdateValue} onChange={e => setStockUpdateValue(e.target.value)} required />
                            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold transition-all">Confirm Update</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInventory;