import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FiTrendingUp, FiZap, FiCalendar, FiTarget, FiDollarSign, 
    FiBarChart2, FiPieChart, FiFileText, FiX, FiSearch, FiArrowRight 
} from 'react-icons/fi';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
    LineElement, Title, Tooltip, Legend, ArcElement, Filler 
} from 'chart.js';

// Register Chart Components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

const AdminOverview = () => {
    // --- STATE ---
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('today'); // 'today' | 'month' | 'year'
    const [searchTerm, setSearchTerm] = useState('');

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('http://localhost:5001/api/admin/stats');
                setStats(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching stats:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- HELPER FUNCTIONS ---
    const formatCurrency = (val) => '$' + (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const formatDate = (d) => new Date(d).toLocaleDateString() + ' ' + new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

 // Replace the getFilteredSales function in AdminOverview.jsx with this:

// Replace the getFilteredSales function in AdminOverview.jsx with this:

const getFilteredSales = () => {
    // Safety check
    if (!stats || !stats.allSales) return [];

    return stats.allSales.filter(sale => {
        // Normalize dates to YYYY-MM-DD string to avoid timezone math errors
        const saleDateObj = new Date(sale.date || sale.createdAt);
        const saleDateStr = saleDateObj.toISOString().split('T')[0];
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Simple logic for filters
        let matchesTime = true;

        if (modalType === 'today') {
            // Check if dates match EXACTLY
            matchesTime = (saleDateStr === todayStr);
        } else if (modalType === 'month') {
            // Check Month AND Year
            matchesTime = (
                saleDateObj.getMonth() === today.getMonth() && 
                saleDateObj.getFullYear() === today.getFullYear()
            );
        } else if (modalType === 'year') {
            // Check Year only
            matchesTime = (saleDateObj.getFullYear() === today.getFullYear());
        }

        // Search logic
        const term = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' || 
            (sale.customerName && sale.customerName.toLowerCase().includes(term)) ||
            (sale._id && sale._id.toLowerCase().includes(term));

        return matchesTime && matchesSearch;
    });
};

    // --- OPEN MODAL HANDLER ---
    const openModal = (type) => {
        setModalType(type);
        setSearchTerm('');
        setShowModal(true);
    };

    if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">Loading Analytics...</div>;

    // --- CHART CONFIG ---
    const chartData = {
        labels: stats?.chart?.labels || [],
        datasets: [{
            label: 'Revenue',
            data: stats?.chart?.data || [],
            borderColor: '#818cf8', // Indigo-400
            backgroundColor: (ctx) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(129, 140, 248, 0.5)');
                gradient.addColorStop(1, 'rgba(129, 140, 248, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };

    const pieData = {
        labels: stats?.pie?.labels || [],
        datasets: [{
            data: stats?.pie?.data || [],
            backgroundColor: ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa'],
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* --- HEADER --- */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                <p className="text-slate-400 mt-1">Real-time business analytics and sales reports.</p>
            </div>

            {/* --- CLICKABLE STAT CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Today's Revenue" 
                    value={formatCurrency(stats?.today)} 
                    icon={<FiZap size={24}/>} 
                    color="emerald" 
                    onClick={() => openModal('today')}
                    sub="Click for details"
                />
                <StatCard 
                    title="Monthly Sales" 
                    value={formatCurrency(stats?.month)} 
                    icon={<FiCalendar size={24}/>} 
                    color="blue" 
                    onClick={() => openModal('month')}
                    sub="Click for details"
                />
                <StatCard 
                    title="Yearly Revenue" 
                    value={formatCurrency(stats?.year)} 
                    icon={<FiTarget size={24}/>} 
                    color="indigo" 
                    onClick={() => openModal('year')}
                    sub="Fiscal Year"
                />
                <StatCard 
                    title="Net Profit (Est. 30%)" 
                    value={formatCurrency(stats?.total * 0.30)} 
                    icon={<FiDollarSign size={24}/>} 
                    color="purple"
                    sub="All Time"
                />
            </div>

            {/* --- CHARTS SECTION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Line Chart */}
                <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FiBarChart2 className="text-indigo-400"/> Revenue Trend
                        </h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded">Last 7 Days</span>
                    </div>
                    <div className="h-80 w-full">
                        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8' } }, y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } } }, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-sm flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <FiPieChart className="text-indigo-400"/> Product Mix
                    </h3>
                    <div className="flex-1 relative flex items-center justify-center">
                        <div className="h-64 w-full">
                            <Doughnut data={pieData} options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true } } } }} />
                        </div>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-slate-500 text-xs font-bold uppercase">Total</p>
                                <p className="text-2xl font-bold text-white">{stats?.allSales?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

           {/* --- RECENT ACTIVITY TABLE --- */}
<div className="bg-[#1e293b] rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
    <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiFileText className="text-indigo-400"/> Recent Activity
        </h3>
    </div>
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/50 text-xs font-bold uppercase text-slate-400">
                <tr>
                    <th className="p-4 pl-6">Date & Time</th>
                    <th className="p-4">Bill ID</th>
                    <th className="p-4">Sold By</th> {/* <--- NEW COLUMN */}
                    <th className="p-4">Customer</th>
                    <th className="p-4 pr-6 text-right">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm text-slate-300">
                {stats?.recentActivity?.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 pl-6">{formatDate(sale.date || sale.createdAt)}</td>
                        <td className="p-4 font-mono text-indigo-400">#{sale._id.slice(-6).toUpperCase()}</td>
                        
                        {/* NEW DATA COLUMN */}
                        <td className="p-4">
                            <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-bold uppercase">
                                {sale.soldBy || 'Admin'}
                            </span>
                        </td>

                        <td className="p-4 font-medium text-white">{sale.customerName || 'Walk-in'}</td>
                        <td className="p-4 pr-6 text-right font-bold text-emerald-400">{formatCurrency(sale.totalAmount)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</div>

            {/* --- MODAL FOR SEARCH & DETAILS --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#1e293b] w-full max-w-4xl max-h-[85vh] rounded-2xl border border-slate-600 shadow-2xl flex flex-col animate-slide-up">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-2xl font-bold text-white capitalize">{modalType}'s Sales</h2>
                                <p className="text-slate-400 text-sm mt-1">Viewing all transactions for this period.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition">
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                            <div className="relative">
                                <FiSearch className="absolute left-4 top-3.5 text-slate-500" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search by Customer Name or Bill ID..." 
                                    className="w-full bg-[#0f172a] border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Modal Content (Table) */}
                       {/* Modal Content (Table) */}
<div className="flex-1 overflow-y-auto custom-scrollbar">
    <table className="w-full text-left border-collapse">
        <thead className="bg-slate-800 text-xs font-bold uppercase text-slate-400 sticky top-0">
            <tr>
                <th className="p-4 pl-6">Time</th>
                <th className="p-4">Bill ID</th>
                <th className="p-4">Staff ID</th> {/* <--- NEW COLUMN */}
                <th className="p-4">Customer</th>
                <th className="p-4 pr-6 text-right">Amount</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 text-sm text-slate-300">
            {getFilteredSales().length > 0 ? (
                getFilteredSales().map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 pl-6 text-slate-400">{formatDate(sale.date || sale.createdAt)}</td>
                        <td className="p-4 font-mono text-indigo-400">#{sale._id.slice(-6).toUpperCase()}</td>
                        
                        {/* NEW DATA COLUMN */}
                        <td className="p-4">
                             <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs font-bold border border-indigo-500/30 uppercase">
                                {sale.soldBy || 'Admin'}
                            </span>
                        </td>

                        <td className="p-4 font-medium text-white">{sale.customerName || 'Walk-in'}</td>
                        <td className="p-4 pr-6 text-right font-bold text-emerald-400">{formatCurrency(sale.totalAmount)}</td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="5" className="p-10 text-center text-slate-500">
                        No transactions found matching "{searchTerm}" for this period.
                    </td>
                </tr>
            )}
        </tbody>
    </table>
</div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl flex justify-between items-center">
                            <span className="text-slate-400 text-sm font-medium">Total Records: {getFilteredSales().length}</span>
                            <div className="text-white font-bold text-lg">
                                Sum: {formatCurrency(getFilteredSales().reduce((acc, curr) => acc + (curr.totalAmount || 0), 0))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- REUSABLE STAT CARD COMPONENT ---
const StatCard = ({ title, value, icon, color, onClick, sub }) => (
    <div 
        onClick={onClick} 
        className={`relative overflow-hidden bg-[#1e293b] p-6 rounded-2xl border border-slate-700/50 shadow-lg group transition-all duration-300 hover:-translate-y-1 hover:border-${color}-500/50 ${onClick ? 'cursor-pointer' : ''}`}
    >
        {/* Color Accent Bar */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-${color}-500 group-hover:h-1.5 transition-all`}></div>
        
        {/* Glow Effect */}
        <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-all`}></div>

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:text-white group-hover:bg-${color}-500 transition-colors`}>
                {icon}
            </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 group-hover:text-slate-300 transition-colors">
            {onClick && <FiArrowRight className={`group-hover:translate-x-1 transition-transform text-${color}-400`}/>}
            {sub}
        </div>
    </div>
);

export default AdminOverview;