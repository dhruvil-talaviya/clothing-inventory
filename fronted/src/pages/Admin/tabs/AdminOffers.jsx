import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiTag, FiPlus, FiTrash2, FiPercent,
    FiScissors, FiAlertCircle, FiCalendar, FiCheckCircle, FiX
} from 'react-icons/fi';

const AdminOffers = () => {
    const [offers,  setOffers]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast,   setToast]   = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null); // ← NEW

    const [newOffer, setNewOffer] = useState({
        name: '', code: '', discountPercent: '', minOrderValue: '', validUntil: ''
    });

    useEffect(() => { fetchOffers(); }, []);

    const notify = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchOffers = async () => {
        try {
            const res = await axios.get('https://clothing-inventory-bbhg.onrender.com/api/offers');
            setOffers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch Error:', err);
        } finally { setLoading(false); }
    };

    const handleCreateOffer = async (e) => {
        e.preventDefault();
        try {
            await axios.post('https://clothing-inventory-bbhg.onrender.com/api/offers', {
                name:            newOffer.name,
                code:            newOffer.code.toUpperCase(),
                discountPercent: Number(newOffer.discountPercent),
                minOrderValue:   Number(newOffer.minOrderValue),
                validUntil:      new Date(newOffer.validUntil).toISOString(),
            });
            notify('Coupon created successfully!');
            setNewOffer({ name:'', code:'', discountPercent:'', minOrderValue:'', validUntil:'' });
            fetchOffers();
        } catch (err) {
            notify(err.response?.data?.message || 'Connection error — is the backend running?', 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`https://clothing-inventory-bbhg.onrender.com/api/offers/${id}`);
            notify('Coupon deleted.');
            setConfirmDeleteId(null);
            fetchOffers();
        } catch { notify('Failed to delete.', 'error'); }
    };

    const getTodayString = () => new Date().toISOString().split('T')[0];
    const isExpired = (validUntil) => validUntil && new Date(validUntil) < new Date();

    return (
        <div className="space-y-8 pb-10 relative">

            {/* TOAST */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[200] px-5 py-4 rounded-2xl font-bold text-white flex items-center gap-3 shadow-2xl border
                    ${toast.type === 'success' ? 'bg-emerald-700 border-emerald-500' : 'bg-red-700 border-red-500'}`}>
                    {toast.type === 'success' ? <FiCheckCircle size={18}/> : <FiAlertCircle size={18}/>}
                    {toast.text}
                </div>
            )}

            {/* ── CREATE FORM ── */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-indigo-900/50 to-slate-900 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FiScissors className="text-pink-500"/> Create New Coupon
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Define coupon code, discount % and minimum order value.</p>
                </div>

                <form onSubmit={handleCreateOffer} className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Offer Name */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <label className="block text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Offer Name (Internal Label)</label>
                        <input required type="text" placeholder="e.g. Holi Special 2026"
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none placeholder-slate-600 transition-all"
                            value={newOffer.name} onChange={e=>setNewOffer({...newOffer, name:e.target.value})}/>
                    </div>

                    {/* Coupon Code */}
                    <div>
                        <label className="block text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Coupon Code</label>
                        <div className="relative">
                            <FiTag className="absolute left-4 top-3.5 text-slate-500"/>
                            <input required type="text" placeholder="HOLI20"
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white font-mono uppercase focus:border-indigo-500 outline-none placeholder-slate-600 transition-all"
                                value={newOffer.code} onChange={e=>setNewOffer({...newOffer, code:e.target.value})}/>
                        </div>
                    </div>

                    {/* Discount % */}
                    <div>
                        <label className="block text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Discount %</label>
                        <div className="relative">
                            <FiPercent className="absolute left-4 top-3.5 text-slate-500"/>
                            <input required type="number" min="1" max="100" placeholder="20"
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-indigo-500 outline-none placeholder-slate-600 transition-all"
                                value={newOffer.discountPercent} onChange={e=>setNewOffer({...newOffer, discountPercent:e.target.value})}/>
                        </div>
                    </div>

                    {/* Min. Order — ₹ */}
                    <div>
                        <label className="block text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Min. Order (₹)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-500 font-bold text-sm">₹</span>
                            <input required type="number" min="0" placeholder="1000"
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white focus:border-indigo-500 outline-none placeholder-slate-600 transition-all"
                                value={newOffer.minOrderValue} onChange={e=>setNewOffer({...newOffer, minOrderValue:e.target.value})}/>
                        </div>
                    </div>

                    {/* Valid Until */}
                    <div>
                        <label className="block text-slate-400 text-xs font-black uppercase tracking-wider mb-2">Valid Until</label>
                        <input required type="date" min={getTodayString()} style={{colorScheme:'dark'}}
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                            value={newOffer.validUntil} onChange={e=>setNewOffer({...newOffer, validUntil:e.target.value})}
                            onClick={e=>e.target.showPicker?.()}/>
                    </div>

                    {/* Submit */}
                    <div className="flex items-end">
                        <button type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 justify-center transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                            <FiPlus/> Save Coupon
                        </button>
                    </div>
                </form>
            </div>

            {/* ── ACTIVE COUPONS ── */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-3 border-l-4 border-emerald-500 pl-3">
                    Active Coupons
                    {offers.length > 0 && (
                        <span className="text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                            {offers.filter(o => !isExpired(o.validUntil)).length} active
                        </span>
                    )}
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full p-10 text-center text-slate-500">Loading coupons…</div>
                ) : offers.length === 0 ? (
                    <div className="col-span-full p-10 text-center text-slate-500 border border-slate-700 rounded-2xl border-dashed">
                        <FiAlertCircle className="mx-auto text-3xl mb-3"/>
                        <p className="font-bold">No coupons created yet.</p>
                        <p className="text-xs mt-1">Create your first coupon above.</p>
                    </div>
                ) : offers.map(offer => {
                    const expired  = isExpired(offer.validUntil);
                    const discVal  = offer.value || offer.discountPercent || 0;
                    const minOrd   = offer.minOrder || offer.minOrderValue || 0;
                    const deleting = confirmDeleteId === offer._id;

                    return (
                        <div key={offer._id}
                            className={`relative bg-[#1e293b] rounded-2xl border-dashed border p-6 transition-all group overflow-hidden
                                ${expired ? 'border-slate-700 opacity-60' : 'border-slate-600 hover:border-indigo-500'}`}>

                            {/* Ticket cut-outs */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0f172a] rounded-full"/>
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0f172a] rounded-full"/>

                            {/* ── INLINE DELETE CONFIRMATION OVERLAY ── */}
                            {deleting && (
                                <div className="absolute inset-0 z-10 bg-[#1e293b]/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 px-6 text-center">
                                    <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                                        <FiTrash2 className="text-red-400" size={22}/>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">Delete this coupon?</p>
                                        <p className="text-slate-400 text-xs mt-1">This action cannot be undone.</p>
                                    </div>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition-all">
                                            <FiX size={13}/> Cancel
                                        </button>
                                        <button
                                            onClick={() => handleDelete(offer._id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95">
                                            <FiTrash2 size={13}/> Delete
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Top row */}
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-lg uppercase max-w-[70%] truncate">
                                    {offer.description || offer.name || 'Special Offer'}
                                </span>
                                <button
                                    onClick={() => setConfirmDeleteId(offer._id)}
                                    className="text-slate-500 hover:text-red-400 transition-colors p-1">
                                    <FiTrash2 size={16}/>
                                </button>
                            </div>

                            {/* Code + discount */}
                            <div className="text-center py-3">
                                <h3 className="text-3xl font-black text-white tracking-widest font-mono">{offer.code}</h3>
                                <div className="text-emerald-400 font-black text-2xl mt-1">{discVal}% OFF</div>
                                <p className="text-xs text-slate-400 mt-2 font-medium">
                                    On orders above <span className="text-white font-bold">₹{Number(minOrd).toLocaleString('en-IN')}</span>
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-xs">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <FiCalendar size={11}/>
                                    {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : 'No Expiry'}
                                </span>
                                {expired ? (
                                    <span className="flex items-center gap-1 text-red-400 font-bold text-[10px]">
                                        <span className="w-2 h-2 rounded-full bg-red-500"/> Expired
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Active
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminOffers;