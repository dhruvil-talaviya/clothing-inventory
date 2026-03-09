import React, { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { 
    FiGrid, FiBox, FiUsers, FiSettings, FiLogOut, FiPercent, FiCalendar, FiMenu 
} from 'react-icons/fi'; 

// --- IMPORT TABS (Ensure all these files exist in ./tabs folder) ---
import AdminOverview from './tabs/AdminOverview';
import AdminInventory from './tabs/AdminInventory';
import AdminOffers from './tabs/AdminOffers';
import AdminStaff from './tabs/AdminStaff';
import AdminSettings from './tabs/AdminSettings';
import AdminEvents from './tabs/AdminEvents'; // <--- FIXED PATH

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview'); 
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    
    // Safety check for user data
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'Admin', role: 'Super Admin' };

    const handleLogout = () => { 
        localStorage.clear(); 
        navigate('/'); 
    };

    // Render Logic
    const renderContent = () => {
        switch(activeTab) {
            case 'overview': return <AdminOverview />;
            case 'products': return <AdminInventory />;
            case 'offers':   return <AdminOffers />;
            case 'staff':    return <AdminStaff />;
            case 'events':   return <AdminEvents />;
            case 'settings': return <AdminSettings />;
            default: return <AdminOverview />;
        }
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
            
            {/* SIDEBAR */}
            <aside className="w-72 bg-[#1e293b] border-r border-slate-800 flex flex-col z-20 transition-all">
                <div className="h-24 flex items-center px-8 border-b border-slate-800 bg-[#1e293b]">
                    <h1 className="text-xl font-black tracking-widest text-white">STYLE<span className="text-indigo-500">SYNC</span></h1>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                    <NavButton id="overview" label="Dashboard" icon={<FiGrid/>} active={activeTab} onClick={setActiveTab} />
                    <NavButton id="products" label="Inventory" icon={<FiBox/>} active={activeTab} onClick={setActiveTab} />
                    <NavButton id="offers" label="Offers & Coupons" icon={<FiPercent/>} active={activeTab} onClick={setActiveTab} />
                    <NavButton id="staff" label="Staff Team" icon={<FiUsers/>} active={activeTab} onClick={setActiveTab} />
                    <NavButton id="events" label="Events & Fest" icon={<FiCalendar/>} active={activeTab} onClick={setActiveTab} />
                    
                    <div className="my-2 border-t border-slate-700 mx-4"></div>
                    
                    <NavButton id="settings" label="Settings" icon={<FiSettings/>} active={activeTab} onClick={setActiveTab} />
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-slate-800">
                     <button onClick={handleLogout} className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors w-full px-4 py-3 rounded-xl hover:bg-slate-800">
                        <FiLogOut /> <span className="font-bold text-sm">Log Out</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden relative">
                
                {/* HEADER */}
                <header className="h-24 border-b border-slate-800 flex justify-between items-center px-10 bg-[#0f172a]/90 backdrop-blur-sm z-10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white capitalize">{activeTab === 'events' ? 'Events & Festivals' : activeTab}</h2>
                        <p className="text-slate-500 text-xs">Admin Control Panel</p>
                    </div>
                    
                    {/* PROFILE DROPDOWN */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} 
                            className="flex items-center gap-4 hover:bg-slate-800 p-2 rounded-xl transition focus:outline-none"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-white">{user.name}</p>
                                <p className="text-[10px] uppercase font-bold text-indigo-500">{user.role || 'Admin'}</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg text-lg">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileDropdownOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsProfileDropdownOpen(false)}
                                ></div>
                                <div className="absolute right-0 top-16 w-64 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-fade-in-up">
                                    <div className="px-4 py-3 border-b border-slate-700 mb-2">
                                        <p className="text-white font-bold text-sm">Signed in as</p>
                                        <p className="text-slate-400 text-xs truncate">{user.email || 'admin@system.com'}</p>
                                    </div>
                                    <button 
                                        onClick={handleLogout} 
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                    >
                                        <FiLogOut/> Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* CONTENT AREA */}
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

// Sub-component for buttons
const NavButton = ({ id, label, icon, active, onClick }) => (
    <button 
        onClick={() => onClick(id)} 
        className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all font-bold text-sm 
        ${active === id 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
            : 'text-slate-500 hover:bg-slate-800 hover:text-white'
        }`}
    >
        <span className="text-xl">{icon}</span>
        {label}
    </button>
);

export default AdminDashboard;