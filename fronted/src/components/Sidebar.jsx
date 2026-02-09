import React from 'react';
// 1. Import FiCalendar
import { FiHome, FiGrid, FiFileText, FiSettings, FiLogOut, FiPackage, FiCalendar } from 'react-icons/fi';

const Sidebar = ({ view, setView, onLogout }) => {
    
    // Helper component for buttons
    const NavBtn = ({ icon, name }) => (
        <button 
            onClick={() => setView(name)} 
            className={`p-4 rounded-xl transition-all mb-4 flex justify-center items-center ${
                view === name 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                : 'text-slate-500 hover:bg-slate-800 hover:text-white'
            }`}
            title={name.charAt(0).toUpperCase() + name.slice(1)} // Adds a hover tooltip
        >
            {React.cloneElement(icon, { size: 24 })}
        </button>
    );

    return (
        <nav className="w-24 bg-[#0F172A] flex flex-col items-center py-8 border-r border-slate-800 z-20 h-screen">
            
            {/* Logo / Brand Icon */}
            <div className="mb-10 p-3 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl shadow-lg">
                <FiPackage size={24} className="text-white"/>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 w-full px-4 flex flex-col items-center">
                <NavBtn icon={<FiHome/>} name="home" />
                <NavBtn icon={<FiGrid/>} name="pos" />
                <NavBtn icon={<FiFileText/>} name="history" />
                
                {/* 2. Added Events Button Here */}
                <NavBtn icon={<FiCalendar/>} name="events" />
                
                <NavBtn icon={<FiSettings/>} name="settings" />
            </div>

            {/* Logout Button */}
            <button 
                onClick={onLogout} 
                className="p-4 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all mb-4"
                title="Logout"
            >
                <FiLogOut size={24}/>
            </button>
        </nav>
    );
};

export default Sidebar;