import React, { useState } from 'react'; 
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { 
    FiGrid, FiBox, FiUsers, FiSettings, FiLogOut, FiPercent, FiCalendar, FiMenu, FiX
} from 'react-icons/fi'; 

import AdminOverview   from './tabs/AdminOverview';
import AdminInventory  from './tabs/AdminInventory';
import AdminOffers     from './tabs/AdminOffers';
import AdminStaff      from './tabs/AdminStaff';
import AdminSettings   from './tabs/AdminSettings';
import AdminEvents     from './tabs/AdminEvents';

const API = 'https://clothing-inventory-bbhg.onrender.com';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { setStatus, setAuthUser, setAccessToken } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); 
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'Admin', role: 'Super Admin' };

    const handleLogout = async () => {
        try {
            await axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true });
        } catch { /* server down — still log out locally */ }
        setAccessToken(null);
        setAuthUser(null);
        setStatus('invalid');
        localStorage.clear();
        navigate('/', { replace: true });
    };

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        setSidebarOpen(false); // close sidebar on mobile after click
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'overview': return <AdminOverview />;
            case 'products': return <AdminInventory />;
            case 'offers':   return <AdminOffers />;
            case 'staff':    return <AdminStaff />;
            case 'events':   return <AdminEvents />;
            case 'settings': return <AdminSettings />;
            default:         return <AdminOverview />;
        }
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
            
            {/* MOBILE OVERLAY */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                w-64 lg:w-72 bg-[#1e293b] border-r border-slate-800 flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-20 lg:h-24 flex items-center justify-between px-6 lg:px-8 border-b border-slate-800 bg-[#1e293b]">
                    <h1 className="text-lg lg:text-xl font-black tracking-widest text-white">
                        STYLE<span className="text-indigo-500">SYNC</span>
                    </h1>
                    {/* Close button on mobile */}
                    <button 
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-white"
                    >
                        <FiX size={20}/>
                    </button>
                </div>

                <nav className="p-3 lg:p-4 space-y-1 lg:space-y-2 flex-1 overflow-y-auto">
                    <NavButton id="overview" label="Dashboard"        icon={<FiGrid/>}     active={activeTab} onClick={handleTabClick} />
                    <NavButton id="products" label="Inventory"        icon={<FiBox/>}      active={activeTab} onClick={handleTabClick} />
                    <NavButton id="offers"   label="Offers & Coupons" icon={<FiPercent/>}  active={activeTab} onClick={handleTabClick} />
                    <NavButton id="staff"    label="Staff Team"       icon={<FiUsers/>}    active={activeTab} onClick={handleTabClick} />
                    <NavButton id="events"   label="Events & Fest"    icon={<FiCalendar/>} active={activeTab} onClick={handleTabClick} />
                    <div className="my-2 border-t border-slate-700 mx-4"/>
                    <NavButton id="settings" label="Settings"         icon={<FiSettings/>} active={activeTab} onClick={handleTabClick} />
                </nav>

                <div className="p-3 lg:p-4 border-t border-slate-800">
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors w-full px-3 lg:px-4 py-3 rounded-xl hover:bg-slate-800">
                        <FiLogOut /> <span className="font-bold text-sm">Log Out</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden relative min-w-0">
                
                {/* HEADER */}
                <header className="h-16 lg:h-24 border-b border-slate-800 flex justify-between items-center px-4 lg:px-10 bg-[#0f172a]/90 backdrop-blur-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Hamburger menu — mobile only */}
                        <button 
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
                        >
                            <FiMenu size={22}/>
                        </button>
                        <div>
                            <h2 className="text-base lg:text-2xl font-bold text-white capitalize">
                                {activeTab === 'events' ? 'Events & Festivals' : activeTab}
                            </h2>
                            <p className="text-slate-500 text-xs hidden sm:block">Admin Control Panel</p>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} 
                            className="flex items-center gap-2 lg:gap-4 hover:bg-slate-800 p-2 rounded-xl transition focus:outline-none"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-white">{user.name}</p>
                                <p className="text-[10px] uppercase font-bold text-indigo-500">{user.role || 'Admin'}</p>
                            </div>
                            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg text-lg shrink-0">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                        </button>

                        {isProfileDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)}/>
                                <div className="absolute right-0 top-14 lg:top-16 w-56 lg:w-64 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                                    <div className="px-4 py-3 border-b border-slate-700 mb-2">
                                        <p className="text-white font-bold text-sm">Admin Account</p>
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

                {/* CONTENT */}
                <main className="flex-1 overflow-y-auto p-3 lg:p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

const NavButton = ({ id, label, icon, active, onClick }) => (
    <button 
        onClick={() => onClick(id)} 
        className={`w-full flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl transition-all font-bold text-sm 
        ${active === id 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
            : 'text-slate-500 hover:bg-slate-800 hover:text-white'
        }`}
    >
        <span className="text-lg lg:text-xl shrink-0">{icon}</span>
        {label}
    </button>
);

export default AdminDashboard;