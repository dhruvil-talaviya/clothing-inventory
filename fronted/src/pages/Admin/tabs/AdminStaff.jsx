import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiCheckCircle, FiAlertCircle, FiMoreVertical, FiX,
    FiLock, FiTrash2, FiUnlock, FiUser, FiSearch,
    FiPlus, FiMail, FiHash, FiShield, FiEye, FiEyeOff,
    FiPhone, FiMapPin, FiHome, FiRefreshCw
} from 'react-icons/fi';

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const COLORS = [
    'from-violet-500 to-indigo-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-500',
    'from-teal-500 to-cyan-600',
    'from-fuchsia-500 to-purple-600',
    'from-lime-500 to-emerald-600',
];

const Avatar = ({ name, photo, isActive, size = 'md' }) => {
    const letter = (name || '?').charAt(0).toUpperCase();
    const grad   = COLORS[letter.charCodeAt(0) % COLORS.length];
    const sz     = size === 'lg' ? 'w-24 h-24 text-4xl rounded-3xl'
                 : size === 'sm' ? 'w-10 h-10 text-sm rounded-xl'
                 : 'w-12 h-12 text-lg rounded-2xl';
    const dotSz  = size === 'lg' ? 'w-4 h-4 border-2' : 'w-3 h-3 border-2';
    return (
        <div className={`relative ${size === 'lg' ? 'w-24 h-24' : size === 'sm' ? 'w-10 h-10' : 'w-12 h-12'} shrink-0`}>
            <div className={`w-full h-full ${sz} overflow-hidden bg-gradient-to-br ${grad} flex items-center justify-center font-black text-white
                ${!isActive ? 'opacity-40 grayscale' : ''}`}>
                {photo
                    ? <img src={photo} alt={name} className="w-full h-full object-cover"/>
                    : letter
                }
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 ${dotSz} rounded-full border-[#0f172a]
                ${isActive ? 'bg-emerald-400' : 'bg-red-500'}`}/>
        </div>
    );
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ msg }) => {
    if (!msg.text) return null;
    return (
        <div className={`fixed top-5 right-5 z-[300] px-5 py-4 rounded-2xl font-bold text-white flex items-center gap-3 shadow-2xl border animate-pulse-once
            ${msg.type === 'success'
                ? 'bg-[#1e293b] border-emerald-500/50 shadow-emerald-500/10'
                : 'bg-[#1e293b] border-red-500/50 shadow-red-500/10'}`}>
            {msg.type === 'success'
                ? <FiCheckCircle className="text-emerald-400 shrink-0" size={18}/>
                : <FiAlertCircle className="text-red-400 shrink-0" size={18}/>
            }
            <span className="text-sm">{msg.text}</span>
        </div>
    );
};

// ─── INPUT ────────────────────────────────────────────────────────────────────
const Field = ({ label, icon, children }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            {icon} {label}
        </label>
        {children}
    </div>
);

const inputCls = "w-full bg-[#080c14] border border-slate-800 text-white p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-slate-700";

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const AdminStaff = () => {
    const [staffList,     setStaffList]     = useState([]);
    const [search,        setSearch]        = useState('');
    const [msg,           setMsg]           = useState({ text: '', type: '' });
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [modalStep,     setModalStep]     = useState('actions'); // actions | confirm_delete
    const [showPassword,  setShowPassword]  = useState(false);
    const [creating,      setCreating]      = useState(false);

    const initialForm = { name: '', employeeId: '', email: '', password: '' };
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => { fetchStaff(); }, []);

    const fetchStaff = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/admin/staff');
            setStaffList(res.data);
        } catch (err) { console.error(err); }
    };

    const toast = (text, type = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    };

    // ── Optimistic update helpers ──────────────────────────────────────────────
    const updateStaffLocal = (id, patch) =>
        setStaffList(prev => prev.map(s => s._id === id ? { ...s, ...patch } : s));
    const removeStaffLocal = (id) =>
        setStaffList(prev => prev.filter(s => s._id !== id));

    // ── Create ─────────────────────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await axios.post('http://localhost:5001/api/admin/add-staff', formData);
            // Optimistically add to list (or refetch to get _id)
            await fetchStaff();
            toast('Staff account created!');
            setFormData(initialForm);
        } catch (err) {
            toast(err.response?.data?.message || 'Failed to create staff', 'error');
        } finally { setCreating(false); }
    };

    // ── Toggle lock ────────────────────────────────────────────────────────────
    const handleToggleLock = async () => {
        const newStatus = !selectedStaff.isActive;
        // Optimistic update
        updateStaffLocal(selectedStaff._id, { isActive: newStatus });
        setSelectedStaff(prev => ({ ...prev, isActive: newStatus }));
        try {
            await axios.put(`http://localhost:5001/api/admin/staff-status/${selectedStaff._id}`);
            toast(`Account ${newStatus ? 'unlocked' : 'locked'} successfully`);
            setSelectedStaff(null);
        } catch (err) {
            // Revert on error
            updateStaffLocal(selectedStaff._id, { isActive: !newStatus });
            toast('Failed to update status', 'error');
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        const deletedId = selectedStaff._id;
        removeStaffLocal(deletedId); // Optimistic
        setSelectedStaff(null);
        try {
            await axios.delete(`http://localhost:5001/api/admin/delete-staff/${deletedId}`);
            toast('Staff account deleted permanently');
        } catch (err) {
            await fetchStaff(); // Revert
            toast('Delete failed — please try again', 'error');
        }
    };

    const openModal = (staff) => { setSelectedStaff(staff); setModalStep('actions'); };

    const filtered = staffList.filter(s =>
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = staffList.filter(s => s.isActive).length;

    return (
        <div className="space-y-6 text-slate-200 font-sans relative">
            <Toast msg={msg}/>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* ── CREATE FORM ── */}
                <div className="w-full lg:w-[340px] shrink-0">
                    <div className="bg-[#0f172a] rounded-3xl border border-slate-800 p-7 shadow-xl sticky top-0">
                        <div className="flex items-center gap-3 mb-7">
                            <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                <FiPlus size={18}/>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">New Staff Member</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Create access account</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <Field label="Full Name" icon={<FiUser size={9}/>}>
                                <input className={inputCls} placeholder="e.g. Rahul Sharma"
                                    value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} required/>
                            </Field>
                            <Field label="Employee ID" icon={<FiHash size={9}/>}>
                                <input className={inputCls} placeholder="e.g. STAFF01"
                                    value={formData.employeeId} onChange={e=>setFormData({...formData,employeeId:e.target.value.toUpperCase()})} required/>
                            </Field>
                            <Field label="Email" icon={<FiMail size={9}/>}>
                                <input type="email" className={inputCls} placeholder="staff@stylesync.com"
                                    value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} required/>
                            </Field>
                            <Field label="Password" icon={<FiShield size={9}/>}>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="Min 6 characters"
                                        value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} required minLength={6}/>
                                    <button type="button" onClick={()=>setShowPassword(v=>!v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                                        {showPassword ? <FiEyeOff size={14}/> : <FiEye size={14}/>}
                                    </button>
                                </div>
                            </Field>

                            <button type="submit" disabled={creating}
                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 text-sm tracking-wide">
                                {creating
                                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Creating…</>
                                    : <><FiPlus size={15}/> Create Account</>
                                }
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── DIRECTORY ── */}
                <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                        <div>
                            <h3 className="text-xl font-black text-white">Staff Directory</h3>
                            <p className="text-slate-500 text-xs mt-0.5">
                                {staffList.length} total · <span className="text-emerald-400 font-bold">{activeCount} active</span>
                                {staffList.length - activeCount > 0 && <> · <span className="text-red-400 font-bold">{staffList.length - activeCount} locked</span></>}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchStaff} title="Refresh list"
                                className="p-2.5 bg-[#0f172a] border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 rounded-xl transition-all">
                                <FiRefreshCw size={14}/>
                            </button>
                            <div className="relative">
                                <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/>
                                <input type="text" placeholder="Search name, ID, email…"
                                    value={search} onChange={e=>setSearch(e.target.value)}
                                    className="bg-[#0f172a] border border-slate-800 text-white text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-all w-64 placeholder:text-slate-700"/>
                            </div>
                        </div>
                    </div>

                    {/* Staff cards */}
                    <div className="space-y-2.5">
                        {filtered.length === 0 && (
                            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center">
                                <FiUser size={32} className="text-slate-700 mx-auto mb-3"/>
                                <p className="text-slate-500 font-bold">{search ? `No results for "${search}"` : 'No staff members yet.'}</p>
                            </div>
                        )}
                        {filtered.map(staff => (
                            <div key={staff._id}
                                className={`group flex items-center gap-4 p-4 bg-[#0f172a] rounded-2xl border transition-all duration-200
                                    ${staff.isActive ? 'border-slate-800 hover:border-slate-600' : 'border-red-900/30 bg-red-950/10'}`}>

                                <Avatar name={staff.name} photo={staff.photo} isActive={staff.isActive}/>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-white truncate">{staff.name}</p>
                                        <span className="font-mono text-[10px] text-slate-600 bg-slate-800/60 px-2 py-0.5 rounded-md">{staff.employeeId}</span>
                                    </div>
                                    <p className="text-slate-500 text-xs mt-0.5 truncate">{staff.email}</p>
                                    {/* Show city + phone if staff has filled them in */}
                                    {(staff.city || staff.phone) && (
                                        <div className="flex items-center gap-3 mt-1">
                                            {staff.phone && <span className="text-[10px] text-slate-600 flex items-center gap-1">📞 {staff.phone}</span>}
                                            {staff.city  && <span className="text-[10px] text-slate-600 flex items-center gap-1">📍 {staff.city}</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                                        ${staff.isActive
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {staff.isActive ? '● Active' : '✕ Locked'}
                                    </span>
                                    <button onClick={() => openModal(staff)}
                                        className="p-2.5 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                        <FiMoreVertical size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══ STAFF ACTION MODAL ══ */}
            {selectedStaff && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                    onClick={e => { if (e.target === e.currentTarget) setSelectedStaff(null); }}>
                    <div className="bg-[#0f172a] border border-slate-700/60 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

                        {/* Modal header */}
                        <div className="relative border-b border-slate-800">
                            <button onClick={() => setSelectedStaff(null)}
                                className="absolute top-4 right-4 z-10 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                                <FiX size={16}/>
                            </button>

                            {/* Gradient banner */}
                            <div className={`h-20 bg-gradient-to-r ${COLORS[((selectedStaff.name||'?').charAt(0).toUpperCase()).charCodeAt(0) % COLORS.length]} opacity-20`}/>

                            {/* Avatar overlapping banner */}
                            <div className="px-7 pb-5">
                                <div className="-mt-10 mb-4 flex items-end justify-between">
                                    <div className="ring-4 ring-[#0f172a] rounded-3xl">
                                        <Avatar name={selectedStaff.name} photo={selectedStaff.photo} isActive={selectedStaff.isActive} size="lg"/>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border
                                        ${selectedStaff.isActive
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {selectedStaff.isActive ? '● Active' : '✕ Locked'}
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-white">{selectedStaff.name}</h2>
                                <p className="text-slate-500 text-xs mt-0.5">{selectedStaff.email}</p>
                                <span className="font-mono text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-md mt-1 inline-block">{selectedStaff.employeeId}</span>

                                {/* Extra profile info filled by staff */}
                                {(selectedStaff.phone || selectedStaff.city || selectedStaff.address) && (
                                    <div className="mt-4 space-y-2">
                                        {selectedStaff.phone && (
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0">📞</span>
                                                {selectedStaff.phone}
                                            </div>
                                        )}
                                        {selectedStaff.city && (
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0">📍</span>
                                                {selectedStaff.city}
                                            </div>
                                        )}
                                        {selectedStaff.address && (
                                            <div className="flex items-start gap-2 text-xs text-slate-400">
                                                <span className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0 mt-0.5">🏠</span>
                                                <span className="leading-relaxed">{selectedStaff.address}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!selectedStaff.phone && !selectedStaff.city && !selectedStaff.address && (
                                    <p className="mt-3 text-[10px] text-slate-700 italic">Staff hasn't filled in profile details yet.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-6">
                            {/* STEP 1 — Action buttons */}
                            {modalStep === 'actions' && (
                                <div className="space-y-3">
                                    <button onClick={handleToggleLock}
                                        className={`w-full flex items-center justify-center gap-2.5 font-black py-3.5 rounded-2xl border transition-all text-sm
                                            ${selectedStaff.isActive
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400/50'
                                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/50'}`}>
                                        {selectedStaff.isActive
                                            ? <><FiLock size={15}/> Lock Account</>
                                            : <><FiUnlock size={15}/> Unlock Account</>
                                        }
                                    </button>

                                    <button onClick={() => setModalStep('confirm_delete')}
                                        className="w-full flex items-center justify-center gap-2.5 font-black py-3.5 rounded-2xl border border-slate-800 text-slate-500 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all text-sm">
                                        <FiTrash2 size={15}/> Delete Account
                                    </button>
                                </div>
                            )}

                            {/* STEP 2 — Delete confirmation */}
                            {modalStep === 'confirm_delete' && (
                                <div className="space-y-4">
                                    {/* Warning box */}
                                    <div className="bg-red-950/40 border border-red-500/20 rounded-2xl p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                                                <FiTrash2 className="text-red-400" size={16}/>
                                            </div>
                                            <p className="text-red-300 font-black text-sm">Permanently Delete Account</p>
                                        </div>
                                        <p className="text-red-400/70 text-xs leading-relaxed">
                                            You are about to delete <span className="text-red-300 font-bold">{selectedStaff.name}</span>'s account.
                                            This will remove all their login access. This action <span className="text-red-300 font-bold">cannot be undone</span>.
                                        </p>
                                    </div>

                                    {/* Confirm staff name display */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                                        <Avatar name={selectedStaff.name} isActive={selectedStaff.isActive} size="sm"/>
                                        <div>
                                            <p className="text-white text-sm font-bold">{selectedStaff.name}</p>
                                            <p className="text-slate-500 text-xs">{selectedStaff.employeeId}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5">
                                        <button onClick={() => setModalStep('actions')}
                                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-sm">
                                            Cancel
                                        </button>
                                        <button onClick={handleDelete}
                                            className="flex-[1.5] py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 text-sm">
                                            <FiTrash2 size={13}/> Delete Forever
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStaff;