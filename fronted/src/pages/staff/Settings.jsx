import React, { useState } from 'react';
import { FiUser, FiShield, FiLock, FiEdit2 } from 'react-icons/fi';

const Settings = ({ user, setUser, notify }) => {
    const [tab, setTab] = useState('profile');
    const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', address: user.address || '' });

    const handleSave = (e) => {
        e.preventDefault();
        const updated = { ...user, ...form };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        notify("Profile Updated!");
    };

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-6 h-fit">
                    <div className="flex flex-col items-center mb-6"><div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4">{user.name?.charAt(0)}</div><h2 className="text-xl font-bold text-white">{user.name}</h2></div>
                    <div className="space-y-2">
                        <button onClick={()=>setTab('profile')} className={`w-full text-left p-3 rounded-xl flex gap-3 ${tab==='profile'?'bg-indigo-600 text-white':'text-slate-400'}`}><FiUser/> Profile</button>
                        <button onClick={()=>setTab('security')} className={`w-full text-left p-3 rounded-xl flex gap-3 ${tab==='security'?'bg-indigo-600 text-white':'text-slate-400'}`}><FiShield/> Security</button>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    {tab === 'profile' ? (
                        <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex gap-2"><FiEdit2/> Edit Profile</h3>
                            <form onSubmit={handleSave} className="space-y-6">
                                <div><label className="text-slate-500 text-xs font-bold uppercase">Name</label><input type="text" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white"/></div>
                                <div><label className="text-slate-500 text-xs font-bold uppercase">Address</label><textarea value={form.address} onChange={e=>setForm({...form, address:e.target.value})} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white"/></div>
                                <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-500">Save Changes</button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8"><h3 className="text-xl font-bold text-white flex gap-2"><FiLock/> Password</h3><p className="text-slate-500 mt-4">Contact admin to reset password.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default Settings;