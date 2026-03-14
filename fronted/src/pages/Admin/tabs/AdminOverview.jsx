import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiDollarSign, FiCalendar, FiBriefcase, FiTrendingUp, FiShoppingBag,
    FiUser, FiSearch, FiX, FiAlertTriangle, FiEye, FiPhone, FiPackage,
    FiTag, FiHash, FiRefreshCw, FiPercent, FiShoppingCart
} from 'react-icons/fi';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';

const PROFIT_MARGIN = 0.35;
const profit    = (amt) => amt * PROFIT_MARGIN;
const fmt       = (n)   => Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
const parseDate = (ds)  => { if (!ds) return null; const d = new Date(ds); return isNaN(d) ? null : d; };

const Row = ({ label, value, mono, accent }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className={`text-sm font-semibold ${accent ? 'text-indigo-400 font-mono' : mono ? 'text-white font-mono' : 'text-white'}`}>{value}</span>
    </div>
);

const CustomerModal = ({ sale, onClose }) => {
    if (!sale) return null;
    const items = sale.items || [];
    const date  = parseDate(sale.date || sale.createdAt);
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0f172a] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-[#1e293b] px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-0.5">Sale Detail</p>
                        <h2 className="text-white font-black text-lg">#{sale._id?.slice(-6).toUpperCase()}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"><FiX size={20}/></button>
                </div>
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"><FiUser size={11}/> Customer</p>
                        <div className="space-y-2.5">
                            <Row label="Name" value={sale.customerName || 'Walk-in'} />
                            <Row label={<span className="flex items-center gap-1"><FiPhone size={11}/>Phone</span>} value={sale.customerPhone || '--'} mono />
                            <Row label={<span className="flex items-center gap-1"><FiCalendar size={11}/>Date</span>} value={date ? date.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '--'} />
                            {sale.invoiceId && <Row label="Invoice" value={sale.invoiceId} mono accent />}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"><FiHash size={11}/> Staff</p>
                        <div className="space-y-2.5">
                            <Row label="Name" value={sale.staffName !== 'N/A' ? sale.staffName : '--'} />
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Employee ID</span>
                                {sale.staffId && sale.staffId !== 'N/A'
                                    ? <span className="font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-xs">{sale.staffId}</span>
                                    : <span className="text-slate-600 text-sm">--</span>}
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"><FiPackage size={11}/> Items ({items.length})</p>
                        {items.length === 0
                            ? <p className="text-slate-600 text-sm text-center py-6 bg-slate-800/30 rounded-xl border border-slate-700/50">No item data</p>
                            : <div className="space-y-2">
                                {items.map((item, idx) => {
                                    const qty   = Number(item.quantity || item.qty || 1);
                                    const price = Number(item.price || 0);
                                    const total = Number(item.total || price * qty);
                                    return (
                                        <div key={idx} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">{qty}×</div>
                                                <div>
                                                    <p className="text-white text-sm font-semibold">{item.name || item.productName || `Item ${idx+1}`}</p>
                                                    <p className="text-slate-500 text-xs">₹{price.toFixed(2)} each</p>
                                                </div>
                                            </div>
                                            <span className="text-white font-bold text-sm">₹{total.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        }
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-2.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="text-white">₹{Number(sale.subtotal||0).toFixed(2)}</span>
                        </div>
                        {sale.discount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-400 flex items-center gap-1"><FiTag size={11}/> Discount</span>
                                <span className="text-emerald-400">-₹{Number(sale.discount).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t border-slate-700 pt-2.5 flex justify-between items-center">
                            <span className="text-white font-bold">Total Paid</span>
                            <span className="text-indigo-400 font-black text-xl">₹{Number(sale.totalAmount||0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── StatCard: flex-col + min-h so all 4 cards are equal height ───
const StatCard = ({ title, value, icon, color, onClick, badge, profitValue, todayOrders }) => {
    const c = {
        blue:   { text:'text-blue-400',    bg:'bg-blue-500/10',    border:'border-blue-500/20'    },
        purple: { text:'text-purple-400',  bg:'bg-purple-500/10',  border:'border-purple-500/20'  },
        indigo: { text:'text-indigo-400',  bg:'bg-indigo-500/10',  border:'border-indigo-500/20'  },
        emerald:{ text:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/20' },
    }[color];
    return (
        <button
            onClick={onClick}
            className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left w-full flex flex-col"
            style={{ minHeight: '11rem' }}
        >
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl ${c.bg} ${c.text}`}>{icon}</div>
                {badge && <span className={`text-[10px] ${c.bg} ${c.text} px-2 py-1 rounded-full font-bold border ${c.border}`}>{badge}</span>}
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h2 className={`text-2xl font-black ${c.text}`}>₹{fmt(value)}</h2>

            {/* mt-auto pins bottom content down — all cards align perfectly */}
            <div className="mt-auto">
                {todayOrders !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <FiShoppingCart size={9}/> Total Orders
                            </span>
                            <span className="text-blue-300 font-black text-sm">{todayOrders}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <FiDollarSign size={9}/> Total Sales
                            </span>
                            <span className="text-blue-300 font-black text-sm">₹{fmt(value)}</span>
                        </div>
                    </div>
                )}
                {profitValue !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><FiPercent size={9}/> Profit (35%)</span>
                        <span className="text-amber-400 font-black text-sm">₹{fmt(profitValue)}</span>
                    </div>
                )}
            </div>
        </button>
    );
};

const SalesTable = ({ data, onViewSale }) => {
    if (!data?.length) return <div className="p-10 text-center text-slate-500">No transactions found.</div>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#1e293b] text-xs font-bold uppercase text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="p-4 pl-6">Order ID</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Staff</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4 text-center">Discount</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4 pr-6 text-center">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {data.map(sale => {
                        const date = parseDate(sale.date || sale.createdAt);
                        return (
                            <tr key={sale._id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-4 pl-6 font-mono text-indigo-400 font-bold text-xs">#{sale._id?.slice(-6).toUpperCase()}</td>
                                <td className="p-4 text-xs font-semibold text-white whitespace-nowrap">{date ? date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '--'}</td>
                                <td className="p-4">
                                    {sale.staffName && sale.staffName !== 'N/A' ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-white text-xs font-semibold flex items-center gap-1"><FiUser size={10} className="text-slate-500 shrink-0"/>{sale.staffName}</span>
                                            {sale.staffId && sale.staffId !== 'N/A' && <span className="font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[10px] w-fit">{sale.staffId}</span>}
                                        </div>
                                    ) : <span className="text-slate-600 text-xs">--</span>}
                                </td>
                                <td className="p-4">
                                    <span className="text-white text-xs font-semibold block">{sale.customerName || 'Walk-in'}</span>
                                    {sale.customerPhone && sale.customerPhone !== '--' && <span className="text-slate-500 font-mono text-[10px]">{sale.customerPhone}</span>}
                                </td>
                                <td className="p-4 text-center">
                                    {sale.couponApplied
                                        ? <span className="text-emerald-400 text-[10px] border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-full font-bold">Applied</span>
                                        : <span className="text-slate-600 text-xs">--</span>}
                                </td>
                                <td className="p-4 text-right font-black text-white text-sm whitespace-nowrap">₹{Number(sale.totalAmount||0).toFixed(2)}</td>
                                <td className="p-4 pr-6 text-center">
                                    <button onClick={() => onViewSale(sale)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-indigo-500/20 border border-slate-600 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-400 transition-all">
                                        <FiEye size={14}/>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS  = ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#06b6d4','#f97316'];

const AdminOverview = () => {
    const [allSales,       setAllSales]       = useState([]);
    const [stats,          setStats]          = useState({
        today:0, month:0, year:0, total:0,
        todayOrders: 0,
        chartData:[], pieData:[], monthlyData:[]
    });
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState(null);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [isModalOpen,    setIsModalOpen]    = useState(false);
    const [modalTitle,     setModalTitle]     = useState('');
    const [modalData,      setModalData]      = useState([]);
    const [searchQuery,    setSearchQuery]    = useState('');
    const [selectedSale,   setSelectedSale]   = useState(null);
    const [refreshing,     setRefreshing]     = useState(false);

    const calculateStats = (sales) => {
        const now = new Date();
        const [cd, cm, cy] = [now.getDate(), now.getMonth(), now.getFullYear()];
        let todaySum=0, monthSum=0, yearSum=0, totalSum=0, todayOrders=0;
        const chartMap   = {};
        const productMap = {};
        const monthlyMap = {};

        sales.forEach(sale => {
            const amt = Number(sale.totalAmount)||0;
            const sd  = parseDate(sale.date || sale.createdAt);
            totalSum += amt;
            if (sd) {
                if (sd.getFullYear() === cy) {
                    yearSum += amt;
                    const mIdx = sd.getMonth();
                    monthlyMap[mIdx] = (monthlyMap[mIdx]||0) + amt;
                    if (sd.getMonth() === cm) {
                        monthSum += amt;
                        if (sd.getDate() === cd) { todaySum += amt; todayOrders++; }
                    }
                }
                const key = sd.toLocaleDateString('en-IN', { month:'short', day:'numeric' });
                chartMap[key] = (chartMap[key]||0) + amt;
            }
            (sale.items||[]).forEach(item => {
                const name = (item.name || item.productName || 'Unknown').trim();
                const qty  = Number(item.quantity || item.qty || 1);
                productMap[name] = (productMap[name]||0) + qty;
            });
        });

        const chartData = Array.from({ length:7 }, (_,i) => {
            const d = new Date(); d.setDate(d.getDate() - (6-i));
            const key = d.toLocaleDateString('en-IN', { month:'short', day:'numeric' });
            return { name:key, revenue: chartMap[key]||0 };
        });

        const pieData = Object.entries(productMap)
            .sort((a,b) => b[1]-a[1])
            .slice(0,7)
            .map(([name,value],i) => ({ name, value, color: PIE_COLORS[i%PIE_COLORS.length] }));

        const monthlyData = MONTH_NAMES.map((m,i) => ({ name: m, sales: monthlyMap[i] || 0 }));

        setStats({ today:todaySum, month:monthSum, year:yearSum, total:totalSum, todayOrders, chartData, pieData, monthlyData });
    };

    const fetchAll = async (isRefresh=false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const [salesRes, stockRes] = await Promise.all([
                axios.get('http://localhost:5001/api/admin/sales-history'),
                axios.get('http://localhost:5001/api/admin/products'),
            ]);
            if (Array.isArray(salesRes.data)) { setAllSales(salesRes.data); calculateStats(salesRes.data); }
            else setError("Invalid data format.");
            setLowStockAlerts(stockRes.data.filter(p => p.stock <= 5));
        } catch (err) {
            console.error(err);
            setError("Cannot connect to server. Check Port 5001.");
        } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const getFilteredData = (type) => {
        const now=new Date(), cd=now.getDate(), cm=now.getMonth(), cy=now.getFullYear();
        return allSales.filter(sale => {
            const d = parseDate(sale.date||sale.createdAt);
            if (!d) return type==='total';
            if (type==='today') return d.getDate()===cd && d.getMonth()===cm && d.getFullYear()===cy;
            if (type==='month') return d.getMonth()===cm && d.getFullYear()===cy;
            if (type==='year')  return d.getFullYear()===cy;
            return true;
        });
    };

    const handleCardClick = (type) => {
        const titles = { today:"Today's Transactions", month:"This Month's Transactions", year:"This Year's Transactions", total:"All Transactions" };
        setModalTitle(titles[type]); setModalData(getFilteredData(type)); setSearchQuery(''); setIsModalOpen(true);
    };

    const filteredModalData = modalData.filter(item => {
        const q = searchQuery.toLowerCase();
        return ['_id','staffName','staffId','customerName','customerPhone'].some(k => (item[k]||'').toLowerCase().includes(q));
    });

    const fmtY = (v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-slate-400 animate-pulse flex items-center gap-2"><FiRefreshCw className="animate-spin"/> Loading Dashboard...</div>
        </div>
    );
    if (error) return <div className="p-10 text-red-400 border border-red-800 bg-red-900/20 rounded m-5">Error: {error}</div>;

    const topProduct = stats.pieData[0] || null;

    return (
        <div className="space-y-6 font-sans text-slate-200">
            {selectedSale && <CustomerModal sale={selectedSale} onClose={() => setSelectedSale(null)}/>}

            {lowStockAlerts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 flex items-start gap-4">
                    <FiAlertTriangle className="text-red-400 text-2xl mt-0.5 shrink-0"/>
                    <div>
                        <h4 className="text-red-400 font-bold text-base mb-0.5">Low Stock Warning</h4>
                        <p className="text-red-200/80 text-sm">
                            <span className="font-black text-white">{lowStockAlerts.length} item(s)</span> running low (≤5). Restock: <span className="font-semibold text-red-300">{lowStockAlerts.map(p=>p.name).join(', ')}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Today's Sales"   value={stats.today} icon={<FiDollarSign/>} color="blue"   badge="Today"      onClick={() => handleCardClick('today')} todayOrders={stats.todayOrders}/>
                <StatCard title="Monthly Revenue" value={stats.month} icon={<FiCalendar/>}   color="purple" badge="This Month" onClick={() => handleCardClick('month')}/>
                <StatCard title="Yearly Revenue"  value={stats.year}  icon={<FiTrendingUp/>} color="indigo" badge="This Year"  onClick={() => handleCardClick('year')}/>
                <StatCard title="Total Revenue"   value={stats.total} icon={<FiBriefcase/>}  color="emerald" badge="All Time"  onClick={() => handleCardClick('total')} profitValue={profit(stats.total)}/>
            </div>

            {/* Line chart + Pie chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col" style={{height:'22rem'}}>
                    <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 shrink-0"><FiTrendingUp className="text-indigo-400"/> Revenue — Last 7 Days</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.chartData} margin={{top:4,right:16,bottom:0,left:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/>
                                <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}} dy={8}/>
                                <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}} tickFormatter={fmtY} width={52}/>
                                <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:'10px',color:'#fff',fontSize:'12px'}} formatter={v=>[`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} labelStyle={{color:'#94a3b8',marginBottom:'4px'}}/>
                                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{r:4,fill:'#1e293b',stroke:'#6366f1',strokeWidth:2}} activeDot={{r:6,fill:'#6366f1'}}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie chart with absolute-positioned center overlay — safe, no Recharts child hack */}
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col" style={{height:'22rem'}}>
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2 shrink-0">
                        <FiShoppingBag className="text-pink-400"/> Top Selling Products
                    </h3>

                    {/* #1 best seller badge */}
                    {topProduct && (
                        <div className="mb-2 flex items-center gap-2 shrink-0">
                            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: topProduct.color }}/>
                            <span className="text-xs font-bold text-white truncate flex-1">{topProduct.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                style={{ backgroundColor: topProduct.color + '22', color: topProduct.color, border: `1px solid ${topProduct.color}55` }}>
                                #1 Best
                            </span>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 relative">
                        {stats.pieData.length > 0 ? (
                            <>
                                {/* Center label overlay — positioned in donut hole */}
                                {topProduct && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '38%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        textAlign: 'center',
                                        pointerEvents: 'none',
                                        zIndex: 10,
                                        width: '90px',
                                    }}>
                                        <div style={{ fontSize: '10px', fontWeight: '800', color: topProduct.color, lineHeight: 1.3, wordBreak: 'break-word' }}>
                                            {topProduct.name.length > 13 ? topProduct.name.slice(0,12)+'…' : topProduct.name}
                                        </div>
                                        <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                            {topProduct.value} units
                                        </div>
                                        <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '700', letterSpacing: '0.05em', marginTop: '1px' }}>
                                            TOP SELLER
                                        </div>
                                    </div>
                                )}
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.pieData}
                                            cx="50%" cy="42%"
                                            innerRadius={50} outerRadius={72}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {stats.pieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                                        </Pie>
                                        <Tooltip
                                            formatter={(v,n) => [`${v} units sold`, n]}
                                            contentStyle={{backgroundColor:'#0f172a',borderRadius:'8px',border:'1px solid #334155',fontSize:'12px'}}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={40}
                                            iconType="circle"
                                            wrapperStyle={{fontSize:'10px', lineHeight:'1.6'}}
                                            formatter={(value) => value.length > 14 ? value.slice(0,13)+'…' : value}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                                <FiShoppingBag size={28} className="opacity-20"/><span>No Product Data</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Monthly Sales Bar Chart */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl" style={{height:'22rem'}}>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <FiCalendar className="text-emerald-400"/> Monthly Sales — {new Date().getFullYear()}
                </h3>
                <div style={{height:'calc(100% - 2.5rem)'}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthlyData} margin={{top:4,right:16,bottom:0,left:0}} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/>
                            <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize:11, fill:'#94a3b8'}} dy={8}/>
                            <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize:11, fill:'#94a3b8'}} tickFormatter={fmtY} width={52}/>
                            <Tooltip
                                contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:'10px',color:'#fff',fontSize:'12px'}}
                                formatter={v=>[`₹${Number(v).toLocaleString('en-IN')}`, 'Sales']}
                                labelStyle={{color:'#94a3b8',marginBottom:'4px'}}
                                cursor={{fill:'rgba(99,102,241,0.08)'}}
                            />
                            <Bar dataKey="sales" radius={[6,6,0,0]}>
                                {stats.monthlyData.map((entry, index) => (
                                    <Cell key={index} fill={index === new Date().getMonth() ? '#6366f1' : '#10b981'}/>
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Recent Transactions</h3>
                    <button onClick={() => fetchAll(true)} disabled={refreshing}
                        className={`flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-all ${refreshing?'opacity-60 cursor-not-allowed':''}`}>
                        <FiRefreshCw size={12} className={refreshing?'animate-spin':''}/> Refresh
                    </button>
                </div>
                <SalesTable data={allSales.slice(0,5)} onViewSale={setSelectedSale}/>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0f172a] w-full max-w-5xl max-h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]">
                            <div>
                                <h2 className="text-lg font-bold text-white">{modalTitle}</h2>
                                <p className="text-slate-400 text-xs mt-0.5">{filteredModalData.length} records</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><FiX size={20}/></button>
                        </div>
                        <div className="p-5 pb-2">
                            <div className="relative">
                                <FiSearch className="absolute left-4 top-3 text-slate-500"/>
                                <input type="text" placeholder="Search by order ID, staff, or customer..."
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#1e293b] border border-slate-700 text-white pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 pt-2">
                            <SalesTable data={filteredModalData} onViewSale={sale => { setIsModalOpen(false); setSelectedSale(sale); }}/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOverview;