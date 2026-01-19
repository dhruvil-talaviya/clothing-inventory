import React, { useState } from 'react';
import { FiUser, FiSettings, FiBell, FiVolume2, FiSave, FiLock, FiServer, FiToggleRight, FiToggleLeft } from 'react-icons/fi';

// Toggle Component
const ToggleSwitch = ({ checked, onChange }) => (
    <div className="flex items-center gap-3 cursor-pointer" onClick={onChange}>
        <div className={`w-11 h-6 flex items-center bg-slate-700 rounded-full p-1 transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </div>
);

const AdminSettings = () => {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const [profile, setProfile] = useState({ name: user.name || '', email: user.email || '' });
    const [preferences, setPreferences] = useState({ notifications: true, sounds: false });

    const handleSave = (e) => {
        e.preventDefault();
        // Add API call here to update profile
        alert("Settings Saved (Simulated)");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* PROFILE CARD */}
            <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><FiUser className="text-indigo-500"/> Profile Management</h3>
                <div className="space-y-5">
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Display Name</label><input className="w-full mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Email</label><input className="w-full mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} /></div>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition shadow-lg"><FiSave/> Save Changes</button>
                </div>
            </div>

            {/* PREFERENCES CARD */}
            <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><FiSettings className="text-blue-500"/> System Preferences</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800"><div className="flex items-center gap-3"><FiBell className="text-slate-400"/><span className="text-sm font-bold text-white">Email Notifications</span></div><ToggleSwitch checked={preferences.notifications} onChange={() => setPreferences({...preferences, notifications: !preferences.notifications})} /></div>
                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800"><div className="flex items-center gap-3"><FiVolume2 className="text-slate-400"/><span className="text-sm font-bold text-white">System Sounds</span></div><ToggleSwitch checked={preferences.sounds} onChange={() => setPreferences({...preferences, sounds: !preferences.sounds})} /></div>
                </div>
            </div>

            {/* SYSTEM INFO */}
            <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-xl lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><FiServer className="text-slate-400"/> System Health</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-900 rounded-xl text-center"><p className="text-[10px] font-bold text-slate-500 uppercase">Version</p><p className="text-lg font-black text-white">v2.4.0</p></div>
                    <div className="p-4 bg-slate-900 rounded-xl text-center"><p className="text-[10px] font-bold text-slate-500 uppercase">Status</p><p className="text-lg font-black text-emerald-400">Online</p></div>
                    <div className="p-4 bg-slate-900 rounded-xl text-center"><p className="text-[10px] font-bold text-slate-500 uppercase">Database</p><p className="text-lg font-black text-blue-400">Connected</p></div>
                    <div className="p-4 bg-slate-900 rounded-xl text-center"><p className="text-[10px] font-bold text-slate-500 uppercase">Latency</p><p className="text-lg font-black text-white">24ms</p></div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;