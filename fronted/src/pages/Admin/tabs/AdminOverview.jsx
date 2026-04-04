import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiDollarSign, FiCalendar, FiBriefcase, FiTrendingUp, FiShoppingBag,
    FiUser, FiSearch, FiX, FiAlertTriangle, FiEye, FiPhone, FiPackage,
    FiTag, FiHash, FiRefreshCw, FiPercent, FiShoppingCart, FiCreditCard,
    FiSmartphone, FiCheckCircle
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

// ─── Normalise payment method ─────────────────────────────────────────────────
// Handles: 'cash','Cash','CASH' → 'cash'  |  'upi','UPI','gpay','phonepe' → 'upi'
// 'card','Card','CARD','debit','credit' → 'card'  |  anything else → 'cash'
const normalisePayment = (raw) => {
    const v = (raw || '').toLowerCase().trim();
    if (!v || v === 'cash')                                         return 'cash';
    if (['upi','gpay','phonepe','paytm','bhim','neft','imps'].includes(v) || v.startsWith('upi')) return 'upi';
    if (['card','debit','credit','debit card','credit card','visa','mastercard','rupay'].includes(v)) return 'card';
    return 'cash'; // default unmapped → cash
};

const PAYMENT_META = {
    cash: { label:'Cash',       icon:<span className="font-bold leading-none pr-0.5 text-sm">₹</span>, color:'emerald', hex:'#10b981', bg:'bg-emerald-500/10', border:'border-emerald-500/20', text:'text-emerald-400' },
    upi:  { label:'UPI',        icon:<FiSmartphone size={16}/>,   color:'violet',  hex:'#8b5cf6', bg:'bg-violet-500/10',  border:'border-violet-500/20',  text:'text-violet-400'  },
    card: { label:'Card',       icon:<FiCreditCard size={16}/>,   color:'sky',     hex:'#0ea5e9', bg:'bg-sky-500/10',     border:'border-sky-500/20',     text:'text-sky-400'     },
};

const Row = ({ label, value, mono, accent }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className={`text-sm font-semibold ${accent ? 'text-indigo-400 font-mono' : mono ? 'text-white font-mono' : 'text-white'}`}>{value}</span>
    </div>
);

// ─── Payment badge used in table ──────────────────────────────────────────────
const PaymentBadge = ({ method }) => {
    const m = normalisePayment(method);
    const meta = PAYMENT_META[m];
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
            {React.cloneElement(meta.icon, { size: 9 })} {meta.label}
        </span>
    );
};

const CustomerModal = ({ sale, onClose }) => {
    if (!sale) return null;
    const items = sale.items || [];
    const date  = parseDate(sale.date || sale.createdAt);
    const pm    = normalisePayment(sale.paymentMethod);
    const pmMeta = PAYMENT_META[pm];
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
                            {/* Payment Method */}
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm flex items-center gap-1">{pmMeta.icon} Payment</span>
                                <PaymentBadge method={sale.paymentMethod} />
                            </div>
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

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, onClick, badge, profitValue, todayOrders }) => {
    const c = {
        blue:   { text:'text-blue-400',    bg:'bg-blue-500/10',    border:'border-blue-500/20'    },
        purple: { text:'text-purple-400',  bg:'bg-purple-500/10',  border:'border-purple-500/20'  },
        indigo: { text:'text-indigo-400',  bg:'bg-indigo-500/10',  border:'border-indigo-500/20'  },
        emerald:{ text:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/20' },
    }[color];
    return (
        <button onClick={onClick}
            className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left w-full flex flex-col"
            style={{ minHeight: '11rem' }}>
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl ${c.bg} ${c.text}`}>{icon}</div>
                {badge && <span className={`text-[10px] ${c.bg} ${c.text} px-2 py-1 rounded-full font-bold border ${c.border}`}>{badge}</span>}
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h2 className={`text-2xl font-black ${c.text}`}>₹{fmt(value)}</h2>
            <div className="mt-auto">
                {todayOrders !== undefined && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><FiShoppingCart size={9}/> Orders</span>
                            <span className="text-blue-300 font-black text-sm">{todayOrders}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><span className="font-bold">₹</span> Sales</span>
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

// ─── Payment Method Mini Card ─────────────────────────────────────────────────

const SalesTable = ({ data, onViewSale }) => {
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [data]);

    if (!data?.length) return <div className="p-10 text-center text-slate-500">No transactions found.</div>;

    const PER_PAGE = 20;
    const totalPages = Math.max(1, Math.ceil(data.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * PER_PAGE;
    const pageRows = data.slice(pageStart, pageStart + PER_PAGE);

    return (
        <div className="flex flex-col h-full">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-[#1e293b] text-xs font-bold uppercase text-slate-500 sticky top-0 z-10">
                        <tr>
                            <th className="p-4 pl-6">Order ID</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Staff</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4 text-center">Payment</th>
                            <th className="p-4 text-center">Discount</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 pr-6 text-center">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {pageRows.map(sale => {
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
                                    {/* Payment method column */}
                                    <td className="p-4 text-center">
                                        <PaymentBadge method={sale.paymentMethod} />
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
            {/* ── Pagination Footer ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#0f172a]/80">
                    <div className="flex-1 text-xs text-slate-500 hidden sm:block">
                        Showing <span className="text-white font-bold">{pageStart+1}–{Math.min(pageStart+PER_PAGE, data.length)}</span> of <span className="text-white font-bold">{data.length}</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 flex-1 sm:flex-none w-full sm:w-auto">
                        {/* Prev */}
                        <button
                            onClick={()=>setPage(p=>Math.max(1,p-1))}
                            disabled={safePage<=1}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-[#1e293b] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >← Prev</button>

                        {/* Page Indicator */}
                        <div className="text-xs font-medium text-slate-400">
                            Page <span className="text-white font-bold">{safePage}</span> of {totalPages}
                        </div>

                        {/* Next */}
                        <button
                            onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
                            disabled={safePage>=totalPages}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-[#1e293b] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >Next →</button>
                    </div>
                    <div className="flex-1 hidden sm:block"></div>
                </div>
            )}
        </div>
    );
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS  = ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#06b6d4','#f97316'];

const AdminOverview = () => {
    const [allSales,       setAllSales]       = useState([]);
    const [stats,          setStats]          = useState({
        today:0, month:0, year:0, total:0,
        todayOrders:0,
        chartData:[], pieData:[], monthlyData:[],
        // payment breakdown — all time
        paymentTotals: { cash:0, upi:0, card:0 },
        paymentCounts: { cash:0, upi:0, card:0 },
        // payment breakdown — today
        todayPayment:  { cash:0, upi:0, card:0 },
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
    // Filter for payment section: 'all' | 'today' | 'month'
    const [pmFilter,       setPmFilter]       = useState('all');

    const calculateStats = (sales) => {
        const now = new Date();
        const [cd, cm, cy] = [now.getDate(), now.getMonth(), now.getFullYear()];
        let todaySum=0, monthSum=0, yearSum=0, totalSum=0, todayOrders=0;
        const chartMap   = {};
        const productMap = {};
        const monthlyMap = {};

        // payment tracking
        const payAll   = { cash:0, upi:0, card:0 };
        const cntAll   = { cash:0, upi:0, card:0 };
        const payToday = { cash:0, upi:0, card:0 };
        const payMonth = { cash:0, upi:0, card:0 };

        sales.forEach(sale => {
            const amt = Number(sale.totalAmount)||0;
            const sd  = parseDate(sale.date || sale.createdAt);
            const pm  = normalisePayment(sale.paymentMethod);

            totalSum += amt;
            payAll[pm]  += amt;
            cntAll[pm]  += 1;

            if (sd) {
                if (sd.getFullYear() === cy) {
                    yearSum += amt;
                    const mIdx = sd.getMonth();
                    monthlyMap[mIdx] = (monthlyMap[mIdx]||0) + amt;
                    if (sd.getMonth() === cm) {
                        monthSum += amt;
                        payMonth[pm] += amt;
                        if (sd.getDate() === cd) {
                            todaySum += amt;
                            todayOrders++;
                            payToday[pm] += amt;
                        }
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
            .sort((a,b) => b[1]-a[1]).slice(0,7)
            .map(([name,value],i) => ({ name, value, color: PIE_COLORS[i%PIE_COLORS.length] }));

        const monthlyData = MONTH_NAMES.map((m,i) => ({ name:m, sales: monthlyMap[i]||0 }));

        setStats({
            today:todaySum, month:monthSum, year:yearSum, total:totalSum, todayOrders,
            chartData, pieData, monthlyData,
            paymentTotals: payAll,
            paymentCounts: cntAll,
            todayPayment:  payToday,
            monthPayment:  payMonth,
        });
    };

    const fetchAll = async (isRefresh=false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        try {
            const [salesRes, stockRes] = await Promise.all([
                axios.get('https://clothing-inventory-bbhg.onrender.com/api/admin/sales-history'),
                axios.get('https://clothing-inventory-bbhg.onrender.com/api/admin/products'),
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

    // Decide which payment numbers to show based on filter
    const activePmTotals = pmFilter === 'today' ? (stats.todayPayment||{cash:0,upi:0,card:0})
                         : pmFilter === 'month' ? (stats.monthPayment||{cash:0,upi:0,card:0})
                         : stats.paymentTotals;
    const activePmTotal  = (activePmTotals.cash||0) + (activePmTotals.upi||0) + (activePmTotals.card||0);

    // Pie data for payment method donut
    const pmPieData = [
        { name:'Cash', value: activePmTotals.cash||0,  color:'#10b981' },
        { name:'UPI',  value: activePmTotals.upi||0,   color:'#8b5cf6' },
        { name:'Card', value: activePmTotals.card||0,  color:'#0ea5e9' },
    ].filter(d => d.value > 0);

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

            {/* ── Revenue Stat Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Today's Sales"   value={stats.today} icon={<FiDollarSign/>} color="blue"    badge="Today"      onClick={() => handleCardClick('today')} todayOrders={stats.todayOrders}/>
                <StatCard title="Monthly Revenue" value={stats.month} icon={<FiCalendar/>}   color="purple"  badge="This Month" onClick={() => handleCardClick('month')}/>
                <StatCard title="Yearly Revenue"  value={stats.year}  icon={<FiTrendingUp/>} color="indigo"  badge="This Year"  onClick={() => handleCardClick('year')}/>
                <StatCard title="Total Revenue"   value={stats.total} icon={<FiBriefcase/>}  color="emerald" badge="All Time"   onClick={() => handleCardClick('total')} profitValue={profit(stats.total)}/>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                PAYMENT INTELLIGENCE — World-class Stripe/Razorpay style
            ══════════════════════════════════════════════════════════════════ */}
            <div style={{background:'linear-gradient(135deg,#0f1729 0%,#111827 60%,#0d1f2d 100%)', borderRadius:'20px', border:'1px solid rgba(99,102,241,0.15)', boxShadow:'0 25px 50px rgba(0,0,0,0.4)', overflow:'hidden'}}>

                {/* ── Header bar ── */}
                <div style={{padding:'20px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                        {/* Animated pulse dot */}
                        <div style={{position:'relative', width:'10px', height:'10px'}}>
                            <div style={{position:'absolute', inset:0, borderRadius:'50%', background:'#10b981', animation:'pmPulse 2s ease-in-out infinite'}}/>
                            <div style={{position:'absolute', inset:'-4px', borderRadius:'50%', background:'rgba(16,185,129,0.2)', animation:'pmPulse 2s ease-in-out infinite 0.3s'}}/>
                        </div>
                        <div>
                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                <span style={{color:'#fff', fontWeight:800, fontSize:'15px', letterSpacing:'-0.3px'}}>Payment Intelligence</span>
                                <span style={{fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)', letterSpacing:'0.05em'}}>LIVE</span>
                            </div>
                            <p style={{color:'#475569', fontSize:'11px', marginTop:'2px'}}>Cash · UPI · Card collection analytics</p>
                        </div>
                    </div>
                    {/* Filter pills */}
                    <div style={{display:'flex', gap:'4px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'4px'}}>
                        {[['all','All Time'],['month','This Month'],['today','Today']].map(([key,label]) => (
                            <button key={key} onClick={() => setPmFilter(key)} style={{padding:'6px 14px', borderRadius:'8px', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.2s',
                                background: pmFilter===key ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
                                color: pmFilter===key ? '#fff' : '#64748b',
                                boxShadow: pmFilter===key ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                            }}>{label}</button>
                        ))}
                    </div>
                </div>

                {/* ── Main body ── */}
                <div style={{padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'16px', alignItems:'stretch'}} className="pm-grid">
                    <style>{`
                        @keyframes pmPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }
                        @keyframes pmBar { from{width:0} to{width:var(--w)} }
                        @keyframes pmFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                        .pm-grid { grid-template-columns: repeat(3,1fr) 1.1fr; }
                        @media(max-width:900px){ .pm-grid{ grid-template-columns:1fr 1fr; } }
                        @media(max-width:600px){ .pm-grid{ grid-template-columns:1fr; } }
                        .pm-method-card:hover { transform:translateY(-2px); box-shadow:var(--hover-shadow) !important; }
                        .pm-method-card { transition: transform 0.2s, box-shadow 0.2s; animation: pmFadeUp 0.4s ease both; }
                    `}</style>

                    {/* ── Cash Card ── */}
                    {[
                        { key:'cash', label:'Cash',  icon:'💵', hex:'#10b981', glow:'rgba(16,185,129,0.15)', ring:'rgba(16,185,129,0.3)',  delay:'0s'   },
                        { key:'upi',  label:'UPI',   icon:'📱', hex:'#8b5cf6', glow:'rgba(139,92,246,0.15)', ring:'rgba(139,92,246,0.3)',   delay:'0.08s' },
                        { key:'card', label:'Card',  icon:'💳', hex:'#0ea5e9', glow:'rgba(14,165,233,0.15)', ring:'rgba(14,165,233,0.3)',   delay:'0.16s' },
                    ].map(({ key, label, icon, hex, glow, ring, delay }) => {
                        const amt  = activePmTotals[key]||0;
                        const cnt  = stats.paymentCounts?.[key]||0;
                        const pct  = activePmTotal > 0 ? (amt/activePmTotal*100) : 0;
                        const isTop = amt === Math.max(activePmTotals.cash||0, activePmTotals.upi||0, activePmTotals.card||0) && amt > 0;
                        return (
                            <div key={key} className="pm-method-card" style={{
                                background:`linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                                border:`1px solid ${ring}`,
                                borderRadius:'16px', padding:'20px',
                                boxShadow:`0 0 0 0 ${glow}`,
                                '--hover-shadow':`0 8px 30px ${glow}, 0 0 0 1px ${ring}`,
                                animationDelay: delay,
                                position:'relative', overflow:'hidden',
                            }}>
                                {/* Glow blob top-right */}
                                <div style={{position:'absolute',top:'-20px',right:'-20px',width:'80px',height:'80px',borderRadius:'50%',background:glow,filter:'blur(20px)',pointerEvents:'none'}}/>

                                {/* Top row */}
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px'}}>
                                    <div style={{width:'38px',height:'38px',borderRadius:'10px',background:glow,border:`1px solid ${ring}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>
                                        {icon}
                                    </div>
                                    {isTop && (
                                        <span style={{fontSize:'9px',fontWeight:800,padding:'3px 8px',borderRadius:'20px',background:glow,color:hex,border:`1px solid ${ring}`,letterSpacing:'0.08em'}}>TOP</span>
                                    )}
                                </div>

                                {/* Label */}
                                <p style={{color:'#64748b', fontSize:'10px', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px'}}>{label}</p>

                                {/* Amount */}
                                <p style={{color:'#fff', fontSize:'22px', fontWeight:900, letterSpacing:'-0.5px', lineHeight:1, marginBottom:'14px'}}>
                                    ₹{fmt(amt)}
                                </p>

                                {/* Slim animated progress bar */}
                                <div style={{height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', marginBottom:'10px', overflow:'hidden'}}>
                                    <div style={{height:'100%', borderRadius:'99px', background:`linear-gradient(90deg,${hex},${hex}88)`,
                                        width:`${pct}%`, transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)'}}/>
                                </div>

                                {/* Bottom stats */}
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{color:'#475569', fontSize:'11px'}}>{cnt} txn{cnt!==1?'s':''}</span>
                                    <span style={{color:hex, fontSize:'13px', fontWeight:800}}>{pct.toFixed(1)}%</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* ── Right panel: Donut + breakdown ── */}
                    <div style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px', display:'flex', flexDirection:'column', gap:'12px', animation:'pmFadeUp 0.4s ease 0.24s both'}}>

                        {/* Mini donut */}
                        <div style={{height:'140px', position:'relative'}}>
                            {pmPieData.length > 0 ? (
                                <>
                                    {/* Center label */}
                                    <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none',zIndex:10}}>
                                        <div style={{fontSize:'11px',fontWeight:900,color:'#fff'}}>₹{activePmTotal >= 1000 ? (activePmTotal/1000).toFixed(0)+'K' : fmt(activePmTotal).split('.')[0]}</div>
                                        <div style={{fontSize:'9px',color:'#475569',fontWeight:700,letterSpacing:'0.06em',marginTop:'1px'}}>TOTAL</div>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pmPieData} cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                                                {pmPieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                                            </Pie>
                                            <Tooltip formatter={(v) => [`₹${fmt(v)}`]} contentStyle={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'8px',fontSize:'11px'}}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </>
                            ) : (
                                <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#334155',fontSize:'12px'}}>No data yet</div>
                            )}
                        </div>

                        {/* Breakdown rows */}
                        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                            {[
                                {key:'cash', label:'Cash',  hex:'#10b981'},
                                {key:'upi',  label:'UPI',   hex:'#8b5cf6'},
                                {key:'card', label:'Card',  hex:'#0ea5e9'},
                            ].map(({key, label, hex}) => {
                                const amt = activePmTotals[key]||0;
                                const pct = activePmTotal > 0 ? (amt/activePmTotal*100).toFixed(1) : '0.0';
                                return (
                                    <div key={key} style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:hex,flexShrink:0}}/>
                                        <span style={{color:'#64748b',fontSize:'11px',flex:1}}>{label}</span>
                                        <span style={{color:'#94a3b8',fontSize:'11px',fontWeight:600}}>₹{amt >= 1000 ? (amt/1000).toFixed(1)+'K' : amt.toFixed(0)}</span>
                                        <span style={{color:hex,fontSize:'10px',fontWeight:800,minWidth:'36px',textAlign:'right'}}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Stacked bar */}
                        <div>
                            <div style={{height:'6px', borderRadius:'99px', overflow:'hidden', display:'flex', background:'rgba(255,255,255,0.05)'}}>
                                {[{key:'cash',hex:'#10b981'},{key:'upi',hex:'#8b5cf6'},{key:'card',hex:'#0ea5e9'}].map(({key,hex}) => {
                                    const w = activePmTotal > 0 ? ((activePmTotals[key]||0)/activePmTotal*100).toFixed(1) : 0;
                                    return <div key={key} style={{width:`${w}%`,background:hex,transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)'}}/>;
                                })}
                            </div>
                            <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px'}}>
                                <span style={{color:'#334155',fontSize:'10px',fontWeight:700,letterSpacing:'0.08em'}}>TOTAL COLLECTED</span>
                                <span style={{color:'#e2e8f0',fontSize:'11px',fontWeight:900}}>₹{fmt(activePmTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* ══ end payment intelligence ══ */}

            {/* Line chart + Product Pie */}
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

                <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col" style={{height:'22rem'}}>
                    <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2 shrink-0">
                        <FiShoppingBag className="text-pink-400"/> Top Selling Products
                    </h3>
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
                                {topProduct && (
                                    <div style={{ position:'absolute', top:'38%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none', zIndex:10, width:'90px' }}>
                                        <div style={{ fontSize:'10px', fontWeight:'800', color:topProduct.color, lineHeight:1.3, wordBreak:'break-word' }}>
                                            {topProduct.name.length > 13 ? topProduct.name.slice(0,12)+'…' : topProduct.name}
                                        </div>
                                        <div style={{ fontSize:'9px', color:'#94a3b8', marginTop:'2px' }}>{topProduct.value} units</div>
                                        <div style={{ fontSize:'8px', color:'#64748b', fontWeight:'700', letterSpacing:'0.05em', marginTop:'1px' }}>TOP SELLER</div>
                                    </div>
                                )}
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.pieData} cx="50%" cy="42%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                                            {stats.pieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                                        </Pie>
                                        <Tooltip formatter={(v,n) => [`${v} units sold`, n]} contentStyle={{backgroundColor:'#0f172a',borderRadius:'8px',border:'1px solid #334155',fontSize:'12px'}}/>
                                        <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{fontSize:'10px',lineHeight:'1.6'}} formatter={(value) => value.length > 14 ? value.slice(0,13)+'…' : value}/>
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
                            <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}} dy={8}/>
                            <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}} tickFormatter={fmtY} width={52}/>
                            <Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:'10px',color:'#fff',fontSize:'12px'}} formatter={v=>[`₹${Number(v).toLocaleString('en-IN')}`, 'Sales']} labelStyle={{color:'#94a3b8',marginBottom:'4px'}} cursor={{fill:'rgba(99,102,241,0.08)'}}/>
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

            {/* Full transactions modal */}
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