import React, { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { 
    FiGrid, FiBox, FiUsers, FiSettings, FiLogOut, FiPercent, FiCalendar 
} from 'react-icons/fi'; // 1. Added FiCalendar here

// Import the Sub-Pages
import AdminOverview from './tabs/AdminOverview';
import AdminInventory from './tabs/AdminInventory';
import AdminOffers from './tabs/AdminOffers';
import AdminStaff from './tabs/AdminStaff';
import AdminSettings from './tabs/AdminSettings';

// 2. Import your new Events page
// Ensure AdminEvents.jsx is in the same folder as this file (src/pages/Admin/)
import AdminEvents from './AdminEvents'; 

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview'); 
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'Admin', email: 'admin@system.com' };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    // Function to render the correct component based on the active tab
    const renderContent = () => {
        switch(activeTab) {
            case 'overview': return <AdminOverview />;
            case 'products': return <AdminInventory />;
            case 'offers':   return <AdminOffers />;
            case 'staff':    return <AdminStaff />;
            case 'events':   return <AdminEvents />; // 3. Added Case for Events
            case 'settings': return <AdminSettings />;
            default: return <AdminOverview />;
        }
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
            
            {/* SIDEBAR */}
            <aside className="w-72 bg-[#1e293b] border-r border-slate-800 flex flex-col z-20">
                <div className="h-24 flex items-center px-8 border-b border-slate-800 bg-[#1e293b]">
                    <h1 className="text-xl font-black tracking-widest text-white">STYLE<span className="text-indigo-500">SYNC</span></h1>
                </div>
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    <NavButton id="overview" label="Dashboard" icon={<FiGrid/>} active={activeTab} onClick={setActiveTab} />
                    <NavButton id="products" label="Inventory" icon={<FiBox/>} active={activeTab} onClick={setActiveTab} />
                    <NavButton id="offers" label="Discounts" icon={<FiPercent/>} active={activeTab} onClick={setActiveTab} />
                    <NavButton id="staff" label="Team" icon={<FiUsers/>} active={activeTab} onClick={setActiveTab} />
                    
                    {/* 4. Added Events Button Here */}
                    <NavButton id="events" label="Events & Fest" icon={<FiCalendar/>} active={activeTab} onClick={setActiveTab} />
                    
                    <div className="my-2 border-t border-slate-700 mx-4"></div>
                    <NavButton id="settings" label="Admin" icon={<FiSettings/>} active={activeTab} onClick={setActiveTab} />
                </nav>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden">
                <header className="h-24 border-b border-slate-800 flex justify-between items-center px-10 bg-[#0f172a]/90 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
                    </div>
                    
                    <div className="relative">
                        <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center gap-4 hover:bg-slate-800 p-2 rounded-xl transition">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-white">{user.name}</p>
                                <p className="text-[10px] uppercase font-bold text-indigo-500">Super Admin</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">A</div>
                        </button>
                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 top-16 w-56 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"><FiLogOut/> Logout</button>
                            </div>
                        )}
                        {isProfileDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}></div>}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

const NavButton = ({ id, label, icon, active, onClick }) => (
    <button onClick={() => onClick(id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all font-bold text-sm ${active === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
        <span className="text-xl">{icon}</span>{label}
    </button>
);

export default AdminDashboard;