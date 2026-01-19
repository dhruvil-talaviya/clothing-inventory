import React from 'react';
import { FiHome, FiGrid, FiFileText, FiSettings, FiLogOut, FiPackage } from 'react-icons/fi';

const Sidebar = ({ view, setView, onLogout }) => {
    const NavBtn = ({ icon, name }) => (
        <button 
            onClick={() => setView(name)} 
            className={`p-4 rounded-xl transition-all ${view === name ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
        >
            {React.cloneElement(icon, { size: 24 })}
        </button>
    );

    return (
        <nav className="w-24 bg-[#0F172A] flex flex-col items-center py-8 border-r border-slate-800 z-20">
            <div className="mb-10 p-3 bg-indigo-600 rounded-xl shadow-lg"><FiPackage size={24} className="text-white"/></div>
            <div className="flex-1 space-y-6 flex flex-col w-full px-4">
                <NavBtn icon={<FiHome/>} name="home" />
                <NavBtn icon={<FiGrid/>} name="pos" />
                <NavBtn icon={<FiFileText/>} name="history" />
                <NavBtn icon={<FiSettings/>} name="settings" />
            </div>
            <button onClick={onLogout} className="p-4 text-slate-500 hover:text-red-500"><FiLogOut size={24}/></button>
        </nav>
    );
};

export default Sidebar;