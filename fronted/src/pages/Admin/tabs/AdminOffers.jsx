import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiTag, FiTrash2, FiAlertTriangle, FiPercent, FiX, FiCheckCircle } from 'react-icons/fi';

const ToggleSwitch = ({ checked, onChange }) => (
    <div className="flex items-center gap-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onChange(); }}>
        <div className={`w-11 h-6 flex items-center bg-slate-700 rounded-full p-1 transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </div>
);

const AdminOffers = () => {
    const [discounts, setDiscounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [discountForm, setDiscountForm] = useState({ code: '', type: 'PERCENTAGE', value: '', minOrder: '', description: '' });
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => { fetchDiscounts(); }, []);

    const fetchDiscounts = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/admin/discounts');
            setDiscounts(res.data);
        } catch (err) { console.error(err); }
    };

    const showNotification = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

    const handleCreateDiscount = async (e) => {
        e.preventDefault();
        const payload = {
            code: discountForm.code.toUpperCase().trim(),
            type: discountForm.type,
            value: Number(discountForm.value),
            minOrder: Number(discountForm.minOrder) || 0,
            description: discountForm.description,
            isActive: true
        };

        if (!payload.code || isNaN(payload.value) || payload.value <= 0) return showNotification("Invalid Input", "error");

        try {
            await axios.post('http://localhost:5001/api/admin/create-discount', payload);
            showNotification("Offer Created Successfully", "success");
            setShowModal(false);
            setDiscountForm({ code: '', type: 'PERCENTAGE', value: '', minOrder: '', description: '' });
            fetchDiscounts();
        } catch (e) { showNotification(e.response?.data?.message || "Failed to create", "error"); }
    };

    const toggleStatus = async (id) => {
        try {
            await axios.put(`http://localhost:5001/api/admin/toggle-discount/${id}`);
            fetchDiscounts();
        } catch(e) { showNotification("Failed to toggle", "error"); }
    };

    const deleteDiscount = async (id) => {
        if(confirm("Delete this offer?")) {
            try {
                await axios.delete(`http://localhost:5001/api/admin/delete-discount/${id}`);
                fetchDiscounts();
            } catch(e) { showNotification("Failed to delete", "error"); }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {msg.text && <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold text-white flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{msg.type === 'success' ? <FiCheckCircle/> : <FiAlertTriangle/>}{msg.text}</div>}

            <div className="flex justify-between items-center">
                <div><h3 className="text-2xl font-bold text-white">Discounts & Offers</h3><p className="text-slate-400 text-sm">Manage store coupons.</p></div>
                <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><FiPlus/> Create Offer</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {discounts.map((offer) => (
                    <div key={offer._id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
                        <div className="absolute top-4 right-4"><ToggleSwitch checked={offer.isActive} onChange={() => toggleStatus(offer._id)}/></div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-emerald-400"><FiTag size={24}/></div>
                            <div><h4 className="text-xl font-black text-white">{offer.code}</h4><span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded uppercase">{offer.type}</span></div>
                        </div>
                        <p className="text-slate-300 text-sm mb-4">{offer.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-4"><FiAlertTriangle size={12}/> Min Order: ${offer.minOrder}</div>
                        <div className="flex justify-between items-center border-t border-slate-700 pt-4">
                            <span className="text-emerald-400 font-black text-lg">{offer.value}{offer.type === 'PERCENTAGE' ? '%' : '$'} OFF</span>
                            <button onClick={() => deleteDiscount(offer._id)} className="text-slate-500 hover:text-red-400 transition"><FiTrash2/></button>
                        </div>
                    </div>
                ))}
                {discounts.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 bg-[#1e293b] rounded-2xl border border-slate-700 border-dashed"><FiPercent size={48} className="mx-auto mb-4 opacity-50"/><p>No offers found. Create one to get started.</p></div>}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-2xl w-full max-w-lg p-8 border border-slate-700 shadow-2xl">
                        <div className="flex justify-between mb-6"><h3 className="text-xl font-bold text-white">Create New Offer</h3><button onClick={()=>setShowModal(false)} className="text-slate-500 hover:text-white"><FiX size={24}/></button></div>
                        <form onSubmit={handleCreateDiscount} className="space-y-4">
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Offer Code</label><input className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none uppercase" placeholder="SUMMER20" value={discountForm.code} onChange={e=>setDiscountForm({...discountForm, code: e.target.value})} required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Type</label><select className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" value={discountForm.type} onChange={e=>setDiscountForm({...discountForm, type: e.target.value})}><option value="PERCENTAGE">Percentage (%)</option><option value="FLAT">Flat Amount ($)</option></select></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Value</label><input type="number" className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" placeholder="20" value={discountForm.value} onChange={e=>setDiscountForm({...discountForm, value: e.target.value})} required /></div>
                            </div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Min Order</label><input type="number" className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" placeholder="0" value={discountForm.minOrder} onChange={e=>setDiscountForm({...discountForm, minOrder: e.target.value})} /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Description</label><input className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" placeholder="Sale details" value={discountForm.description} onChange={e=>setDiscountForm({...discountForm, description: e.target.value})} required /></div>
                            <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold mt-4 shadow-lg transition">Generate Offer</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOffers;