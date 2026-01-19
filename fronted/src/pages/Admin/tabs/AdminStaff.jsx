import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUserPlus, FiEye, FiX, FiLock, FiUnlock } from 'react-icons/fi';

// Toggle Component
const ToggleSwitch = ({ checked, onChange }) => (
    <div className="flex items-center gap-3 cursor-pointer" onClick={onChange}>
        <div className={`w-11 h-6 flex items-center bg-slate-700 rounded-full p-1 transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </div>
);

const AdminStaff = () => {
    const [staffList, setStaffList] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [staffForm, setStaffForm] = useState({ name: '', employeeId: '', email: '', password: '' });
    const [msg, setMsg] = useState({ text: '', type: '' });

    useEffect(() => { fetchStaff(); }, []);

    const fetchStaff = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/admin/staff');
            setStaffList(res.data);
        } catch (err) { console.error(err); }
    };

    const showNotification = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5001/api/admin/create-staff', staffForm);
            showNotification("Staff Created", "success");
            setStaffForm({ name: '', employeeId: '', email: '', password: '' });
            fetchStaff();
        } catch (e) { showNotification("Failed", "error"); }
    };

    const toggleAccess = async (staff) => {
        try {
            await axios.put(`http://localhost:5001/api/admin/toggle-staff-status/${staff._id}`);
            showNotification("Status Updated", "success");
            fetchStaff();
        } catch (e) { showNotification("Failed", "error"); }
    };

    const handleView = (staff) => {
        setSelectedStaff(staff);
        setShowDetailModal(true);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {msg.text && <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl text-white font-bold ${msg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{msg.text}</div>}

            {/* CREATE STAFF FORM */}
            <div className="lg:col-span-1 bg-[#1e293b] p-6 rounded-2xl border border-slate-700 h-fit">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><FiUserPlus className="text-indigo-400"/> New Staff Member</h3>
                <form onSubmit={handleCreateStaff} className="space-y-4" autoComplete="off">
                    <input autoComplete="false" name="hidden" type="text" style={{display: 'none'}} />
                    <input type="password" style={{display: 'none'}}/>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label><input className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" name="new_staff_name" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} required autoComplete="new-password" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Employee ID</label><input className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" name="new_staff_id" value={staffForm.employeeId} onChange={e => setStaffForm({...staffForm, employeeId: e.target.value})} required autoComplete="new-password" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Email</label><input className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" type="email" name="new_staff_email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} required autoComplete="new-password" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Password</label><input className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" type="password" name="new_staff_pwd" value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} required autoComplete="new-password" /></div>
                    <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold mt-2 hover:bg-indigo-500 transition">Create Account</button>
                </form>
            </div>

            {/* STAFF LIST */}
            <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Staff Directory</h3>
                {staffList.map(s => (
                    <div key={s._id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-inner ${s.isActive ? 'bg-emerald-600' : 'bg-slate-700'}`}>{s.name[0]}</div>
                            <div>
                                <p className="font-bold text-white text-base">{s.name}</p>
                                <p className="text-xs text-slate-500 font-mono mt-1">ID: {s.employeeId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <ToggleSwitch checked={s.isActive} onChange={() => toggleAccess(s)} />
                            <button onClick={() => handleView(s)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"><FiEye size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* DETAIL MODAL */}
            {showDetailModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm p-8 border border-slate-700 shadow-2xl relative">
                        <button onClick={() => setShowDetailModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><FiX size={20}/></button>
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-white mb-3">{selectedStaff.name[0]}</div>
                            <h3 className="text-xl font-bold text-white">{selectedStaff.name}</h3>
                            <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase mt-2 ${selectedStaff.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{selectedStaff.isActive ? 'Active' : 'Disabled'}</div>
                        </div>
                        <div className="space-y-3">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700"><p className="text-[10px] font-bold text-slate-500 uppercase">Employee ID</p><p className="text-white font-mono">{selectedStaff.employeeId}</p></div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700"><p className="text-[10px] font-bold text-slate-500 uppercase">Email</p><p className="text-white">{selectedStaff.email}</p></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStaff;