import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiCheckCircle, FiAlertCircle, FiMoreVertical, FiX,
    FiLock, FiTrash2, FiUnlock, FiUser, FiSearch,
    FiPlus, FiMail, FiHash, FiShield, FiEye, FiEyeOff,
    FiPhone, FiRefreshCw, FiMapPin, FiHome, FiBriefcase
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
    const sz     = size === 'lg' ? 'w-20 h-20 text-3xl rounded-2xl'
                 : size === 'sm' ? 'w-9 h-9 text-sm rounded-xl'
                 :                 'w-11 h-11 text-base rounded-xl';
    const dotSz  = size === 'lg' ? 'w-4 h-4 border-[3px]' : 'w-2.5 h-2.5 border-2';
    const dotPos = size === 'lg' ? '-bottom-1 -right-1' : '-bottom-0.5 -right-0.5';
    return (
        <div className={`relative shrink-0 ${size === 'lg' ? 'w-20 h-20' : size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'}`}>
            <div className={`w-full h-full ${sz} overflow-hidden bg-gradient-to-br ${grad} flex items-center justify-center font-black text-white
                ${!isActive ? 'opacity-40 grayscale' : ''}`}>
                {photo ? <img src={photo} alt={name} className="w-full h-full object-cover"/> : letter}
            </div>
            <span className={`absolute ${dotPos} ${dotSz} rounded-full border-[#0a0f1e]
                ${isActive ? 'bg-emerald-400' : 'bg-red-500'}`}/>
        </div>
    );
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ msg }) => {
    if (!msg.text) return null;
    return (
        <div className={`fixed top-5 right-5 z-[300] px-5 py-4 rounded-2xl font-bold text-white flex items-center gap-3 shadow-2xl border animate-slide-in
            ${msg.type === 'success'
                ? 'bg-[#0f172a] border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-[#0f172a] border-red-500/40 shadow-red-500/10'}`}>
            {msg.type === 'success'
                ? <FiCheckCircle className="text-emerald-400 shrink-0" size={16}/>
                : <FiAlertCircle className="text-red-400 shrink-0" size={16}/>}
            <span className="text-sm">{msg.text}</span>
        </div>
    );
};

// ─── FIELD ────────────────────────────────────────────────────────────────────
const Field = ({ label, icon, required, hint, children }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            {icon} {label} {required && <span className="text-red-400">*</span>}
        </label>
        {children}
        {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
);

const inputCls = "w-full bg-[#080c14] border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-slate-700";

// ─── INFO ROW (for modal) ─────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, valueClass = '' }) => (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800/60 last:border-0">
        <div className="w-8 h-8 bg-slate-800/80 rounded-lg flex items-center justify-center shrink-0">
            <span className={`text-slate-400`}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{label}</p>
            <p className={`text-sm font-bold mt-0.5 truncate ${valueClass || 'text-white'}`}>{value || '—'}</p>
        </div>
    </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const AdminStaff = () => {
    const [staffList,     setStaffList]     = useState([]);
    const [search,        setSearch]        = useState('');
    const [msg,           setMsg]           = useState({ text: '', type: '' });
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [modalStep,     setModalStep]     = useState('actions');
    const [showPassword,  setShowPassword]  = useState(false);
    const [creating,      setCreating]      = useState(false);

    // FIX: empty initialForm — no autocomplete bleed from admin session
    const initialForm = { name: '', employeeId: '', email: '', phone: '', password: '' };
    const [formData, setFormData] = useState(initialForm);
    const [formErr,  setFormErr]  = useState('');

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

    const updateStaffLocal = (id, patch) =>
        setStaffList(prev => prev.map(s => s._id === id ? { ...s, ...patch } : s));
    const removeStaffLocal = (id) =>
        setStaffList(prev => prev.filter(s => s._id !== id));

    // ── Create ────────────────────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setFormErr('');
        if (!formData.name.trim())        return setFormErr('Full name is required.');
        if (!formData.employeeId.trim())  return setFormErr('Employee ID is required.');
        if (!formData.email.trim())       return setFormErr('Email is required.');
        if (!formData.phone.trim())       return setFormErr('Phone number is required.');
        if (!/^\d{10}$/.test(formData.phone.trim())) return setFormErr('Enter a valid 10-digit phone number.');
        if (formData.password.length < 6) return setFormErr('Password must be at least 6 characters.');

        setCreating(true);
        try {
            await axios.post('http://localhost:5001/api/admin/add-staff', {
                ...formData,
                phone: formData.phone.trim(),
            });
            await fetchStaff();
            toast('Staff account created successfully!');
            setFormData(initialForm);
        } catch (err) {
            setFormErr(err.response?.data?.message || 'Failed to create staff.');
        } finally { setCreating(false); }
    };

    // ── Toggle lock ───────────────────────────────────────────────────────────
    const handleToggleLock = async () => {
        const newStatus = !selectedStaff.isActive;
        updateStaffLocal(selectedStaff._id, { isActive: newStatus });
        setSelectedStaff(prev => ({ ...prev, isActive: newStatus }));
        try {
            await axios.put(`http://localhost:5001/api/admin/staff-status/${selectedStaff._id}`);
            toast(`Account ${newStatus ? 'unlocked' : 'locked'} successfully`);
            setSelectedStaff(null);
        } catch {
            updateStaffLocal(selectedStaff._id, { isActive: !newStatus });
            toast('Failed to update status', 'error');
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        const deletedId = selectedStaff._id;
        removeStaffLocal(deletedId);
        setSelectedStaff(null);
        try {
            await axios.delete(`http://localhost:5001/api/admin/delete-staff/${deletedId}`);
            toast('Staff account deleted permanently');
        } catch {
            await fetchStaff();
            toast('Delete failed — please try again', 'error');
        }
    };

    const openModal = (staff) => { setSelectedStaff(staff); setModalStep('actions'); };

    const filtered = staffList.filter(s =>
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.phone || '').includes(search)
    );

    const activeCount = staffList.filter(s => s.isActive).length;

    return (
        <div className="space-y-6 text-slate-200 relative">
            <Toast msg={msg}/>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* ══ CREATE FORM ══ */}
                <div className="w-full lg:w-[360px] shrink-0">
                    <div className="bg-[#0a0f1e] rounded-3xl border border-slate-800/80 p-6 shadow-xl sticky top-0">

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-600/15 rounded-xl flex items-center justify-center border border-indigo-500/20">
                                <FiPlus className="text-indigo-400" size={18}/>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white">New Staff Member</h3>
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">Create Access Account</p>
                            </div>
                        </div>

                        {/* Error */}
                        {formErr && (
                            <div className="mb-4 p-3 bg-red-500/8 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
                                <FiAlertCircle size={12} className="shrink-0"/> {formErr}
                            </div>
                        )}

                        {/*
                            FIX: autoComplete="off" on form + autoComplete="new-password" on password
                            prevents browser from auto-filling admin credentials into staff fields
                        */}
                        <form onSubmit={handleCreate} autoComplete="off" className="space-y-4">

                            <Field label="Full Name" icon={<FiUser size={9}/>} required>
                                <input
                                    className={inputCls}
                                    placeholder="e.g. Rahul Sharma"
                                    autoComplete="off"
                                    value={formData.name}
                                    onChange={e => { setFormData({ ...formData, name: e.target.value }); setFormErr(''); }}/>
                            </Field>

                            <Field label="Employee ID" icon={<FiHash size={9}/>} required>
                                <input
                                    className={inputCls}
                                    placeholder="e.g. STAFF01"
                                    autoComplete="off"
                                    value={formData.employeeId}
                                    onChange={e => { setFormData({ ...formData, employeeId: e.target.value.toUpperCase() }); setFormErr(''); }}/>
                            </Field>

                            <Field label="Email" icon={<FiMail size={9}/>} required>
                                <input
                                    type="email"
                                    className={inputCls}
                                    placeholder="staff@stylesync.com"
                                    autoComplete="off"
                                    value={formData.email}
                                    onChange={e => { setFormData({ ...formData, email: e.target.value }); setFormErr(''); }}/>
                            </Field>

                            <Field label="Phone Number" icon={<FiPhone size={9}/>} required hint="Required for OTP login & password reset">
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-slate-500 text-xs font-bold select-none">+91</span>
                                    <input
                                        type="tel"
                                        maxLength="10"
                                        className={`${inputCls} pl-12 ${formData.phone && !/^\d{10}$/.test(formData.phone) ? 'border-red-500/50' : ''}`}
                                        placeholder="10-digit mobile"
                                        autoComplete="off"
                                        value={formData.phone}
                                        onChange={e => { setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') }); setFormErr(''); }}/>
                                </div>
                                {formData.phone && /^\d{10}$/.test(formData.phone) && (
                                    <p className="text-emerald-400 text-[10px] font-bold mt-1">✓ Valid phone number</p>
                                )}
                            </Field>

                            <Field label="Temporary Password" icon={<FiShield size={9}/>} required hint="Staff will change this on first login">
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={`${inputCls} pr-10`}
                                        placeholder="Min 6 characters"
                                        autoComplete="new-password"
                                        value={formData.password}
                                        onChange={e => { setFormData({ ...formData, password: e.target.value }); setFormErr(''); }}
                                        minLength={6}/>
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                                        {showPassword ? <FiEyeOff size={13}/> : <FiEye size={13}/>}
                                    </button>
                                </div>
                            </Field>

                            <button type="submit" disabled={creating}
                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                                {creating
                                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Creating…</>
                                    : <><FiPlus size={14}/> Create Account</>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ══ STAFF DIRECTORY ══ */}
                <div className="flex-1 min-w-0">

                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                        <div>
                            <h3 className="text-xl font-black text-white">Staff Directory</h3>
                            <p className="text-slate-500 text-xs mt-0.5">
                                {staffList.length} members ·{' '}
                                <span className="text-emerald-400 font-bold">{activeCount} active</span>
                                {staffList.length - activeCount > 0 && (
                                    <> · <span className="text-red-400 font-bold">{staffList.length - activeCount} locked</span></>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchStaff} title="Refresh"
                                className="p-2.5 bg-[#0a0f1e] border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 rounded-xl transition-all">
                                <FiRefreshCw size={13}/>
                            </button>
                            <div className="relative">
                                <FiSearch size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"/>
                                <input type="text" placeholder="Search name, ID, email…"
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="bg-[#0a0f1e] border border-slate-800 text-white text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-all w-60 placeholder:text-slate-700"/>
                            </div>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                        {filtered.length === 0 && (
                            <div className="bg-[#0a0f1e] border border-slate-800 rounded-2xl p-14 text-center">
                                <div className="w-12 h-12 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <FiUser size={20} className="text-slate-600"/>
                                </div>
                                <p className="text-slate-500 font-bold text-sm">
                                    {search ? `No results for "${search}"` : 'No staff members yet.'}
                                </p>
                            </div>
                        )}

                        {filtered.map(staff => (
                            <div key={staff._id}
                                className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 cursor-default
                                    ${staff.isActive
                                        ? 'bg-[#0a0f1e] border-slate-800/80 hover:border-slate-700'
                                        : 'bg-red-950/10 border-red-900/20'}`}>

                                <Avatar name={staff.name} photo={staff.photo} isActive={staff.isActive}/>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-white text-sm truncate">{staff.name}</p>
                                        <span className="font-mono text-[10px] text-slate-500 bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-700/50">
                                            {staff.employeeId}
                                        </span>
                                        {staff.isFirstLogin && (
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                Pending First Login
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 text-xs mt-0.5 truncate">{staff.email}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {staff.phone
                                            ? <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                <FiPhone size={9} className="text-indigo-400/70"/> +91 {staff.phone}
                                              </span>
                                            : <span className="text-[11px] text-red-400/60 font-bold flex items-center gap-1">
                                                <FiAlertCircle size={9}/> No phone
                                              </span>
                                        }
                                        {staff.city && (
                                            <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                                <FiMapPin size={9}/> {staff.city}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border
                                        ${staff.isActive
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {staff.isActive ? '● Active' : '✕ Locked'}
                                    </span>
                                    <button onClick={() => openModal(staff)}
                                        className="p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                        <FiMoreVertical size={15}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══ STAFF MODAL ══ */}
            {selectedStaff && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={e => { if (e.target === e.currentTarget) setSelectedStaff(null); }}>

                    <div className="bg-[#0a0f1e] border border-slate-700/50 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

                        {/* ── Gradient banner + avatar ── */}
                        <div className="relative">
                            {/* Close */}
                            <button onClick={() => setSelectedStaff(null)}
                                className="absolute top-3 right-3 z-10 p-2 text-slate-400 hover:text-white bg-black/30 hover:bg-black/50 rounded-xl transition-all">
                                <FiX size={14}/>
                            </button>

                            {/* Color banner */}
                            <div className={`h-24 bg-gradient-to-br ${COLORS[((selectedStaff.name||'?').charAt(0).toUpperCase()).charCodeAt(0) % COLORS.length]} opacity-25`}/>

                            {/* Avatar overlapping banner */}
                            <div className="px-6 pb-5">
                                <div className="flex items-end justify-between -mt-10 mb-4">
                                    <div className="ring-4 ring-[#0a0f1e] rounded-2xl">
                                        <Avatar name={selectedStaff.name} photo={selectedStaff.photo} isActive={selectedStaff.isActive} size="lg"/>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border mb-1
                                        ${selectedStaff.isActive
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {selectedStaff.isActive ? '● Active' : '✕ Locked'}
                                    </span>
                                </div>

                                {/* Name + ID */}
                                <h2 className="text-lg font-black text-white leading-tight">{selectedStaff.name}</h2>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="font-mono text-[11px] text-slate-500 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                                        {selectedStaff.employeeId}
                                    </span>
                                    {selectedStaff.isFirstLogin && (
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            ⏳ First Login Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Info rows ── */}
                        <div className="px-6 pb-2">
                            <div className="bg-slate-900/50 rounded-2xl border border-slate-800/60 px-4 divide-y divide-slate-800/60">
                                <InfoRow
                                    icon={<FiMail size={13}/>}
                                    label="Email"
                                    value={selectedStaff.email || 'Not set'}
                                    valueClass={selectedStaff.email ? 'text-white' : 'text-slate-500'}/>
                                <InfoRow
                                    icon={<FiPhone size={13}/>}
                                    label="Phone"
                                    value={selectedStaff.phone ? `+91 ${selectedStaff.phone}` : 'Not set'}
                                    valueClass={selectedStaff.phone ? 'text-white' : 'text-red-400'}/>
                                <InfoRow
                                    icon={<FiBriefcase size={13}/>}
                                    label="Role"
                                    value="Staff Member"/>
                                {selectedStaff.city && (
                                    <InfoRow
                                        icon={<FiMapPin size={13}/>}
                                        label="City"
                                        value={selectedStaff.city}/>
                                )}
                                {selectedStaff.address && (
                                    <InfoRow
                                        icon={<FiHome size={13}/>}
                                        label="Address"
                                        value={selectedStaff.address}/>
                                )}
                            </div>

                            {/* Warnings */}
                            {!selectedStaff.phone && (
                                <div className="mt-3 p-3 bg-red-500/8 border border-red-500/15 rounded-xl flex items-center gap-2">
                                    <FiAlertCircle className="text-red-400 shrink-0" size={12}/>
                                    <p className="text-red-400/80 text-[11px] font-bold">No phone — staff cannot use OTP reset</p>
                                </div>
                            )}
                        </div>

                        {/* ── Actions ── */}
                        <div className="p-5">
                            {modalStep === 'actions' && (
                                <div className="space-y-2.5">
                                    <button onClick={handleToggleLock}
                                        className={`w-full flex items-center justify-center gap-2 font-black py-3 rounded-2xl border transition-all text-sm
                                            ${selectedStaff.isActive
                                                ? 'bg-amber-500/8 border-amber-500/25 text-amber-400 hover:bg-amber-500/15'
                                                : 'bg-emerald-500/8 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15'}`}>
                                        {selectedStaff.isActive
                                            ? <><FiLock size={14}/> Lock Account</>
                                            : <><FiUnlock size={14}/> Unlock Account</>}
                                    </button>
                                    <button onClick={() => setModalStep('confirm_delete')}
                                        className="w-full flex items-center justify-center gap-2 font-black py-3 rounded-2xl border border-slate-800 text-slate-500 hover:bg-red-500/8 hover:border-red-500/25 hover:text-red-400 transition-all text-sm">
                                        <FiTrash2 size={14}/> Delete Account
                                    </button>
                                </div>
                            )}

                            {modalStep === 'confirm_delete' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-950/40 border border-red-500/15 rounded-2xl">
                                        <div className="flex items-center gap-2.5 mb-2">
                                            <div className="w-8 h-8 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0">
                                                <FiTrash2 className="text-red-400" size={14}/>
                                            </div>
                                            <p className="text-red-300 font-black text-sm">Permanently Delete Account</p>
                                        </div>
                                        <p className="text-red-400/60 text-xs leading-relaxed">
                                            Deleting <span className="text-red-300 font-bold">{selectedStaff.name}</span>'s account removes all login access.
                                            This action <span className="text-red-300 font-bold">cannot be undone</span>.
                                        </p>
                                    </div>

                                    {/* Preview */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                                        <Avatar name={selectedStaff.name} isActive={selectedStaff.isActive} size="sm"/>
                                        <div className="min-w-0">
                                            <p className="text-white text-sm font-bold truncate">{selectedStaff.name}</p>
                                            <p className="text-slate-500 text-xs">{selectedStaff.employeeId}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5">
                                        <button onClick={() => setModalStep('actions')}
                                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-sm">
                                            Cancel
                                        </button>
                                        <button onClick={handleDelete}
                                            className="flex-[1.5] py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                                            <FiTrash2 size={12}/> Delete Forever
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