import React from 'react';
import { FiTrendingUp, FiCheckCircle, FiClock, FiEye } from 'react-icons/fi';
import { StatCard } from '../../components/StatCard';

const DashboardHome = ({ user, stats, currentTime, shiftDuration, setSelectedSale }) => {
    const progress = Math.min((stats.todayRevenue / 5000) * 100, 100);

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in">
            <header className="flex justify-between items-start mb-8">
                <div><h1 className="text-3xl font-black text-white">Retail Command</h1><p className="text-slate-500">Operator: <span className="text-indigo-400 font-bold">{user.name}</span></p></div>
                <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl text-right"><p className="text-3xl font-mono font-bold text-white">{currentTime.toLocaleTimeString()}</p><p className="text-[10px] text-slate-500 mt-1 font-bold"><FiClock className="inline mr-1"/> Shift: {shiftDuration}</p></div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Today's Revenue" value={`$${stats.todayRevenue.toFixed(2)}`} icon={<FiTrendingUp/>} color="indigo" />
                <StatCard title="Orders Processed" value={stats.todayCount} icon={<FiCheckCircle/>} color="emerald" />
                <div className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 relative overflow-hidden shadow-lg">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-2">Target ($5k)</p>
                    <div className="flex items-end gap-2"><h3 className="text-4xl font-black text-white">{Math.round(progress)}%</h3></div>
                    <div className="w-full bg-slate-900 h-2 rounded-full mt-4"><div className="bg-indigo-500 h-full" style={{width: `${progress}%`}}></div></div>
                </div>
            </div>

            <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
                <div className="space-y-3">
                    {stats.history.length === 0 ? <p className="text-slate-500">No sales yet.</p> : stats.history.slice(0, 5).map(sale => (
                        <div key={sale._id} onClick={() => setSelectedSale(sale)} className="flex items-center justify-between p-4 bg-[#080C14] rounded-2xl border border-slate-800/50 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-[#131C31]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center text-xs"><FiEye /></div>
                                <div><p className="font-bold text-white">{sale.customerName}</p><p className="text-xs text-slate-500">{new Date(sale.date).toLocaleTimeString()}</p></div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">+${(sale.finalAmount || sale.totalAmount).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default DashboardHome;