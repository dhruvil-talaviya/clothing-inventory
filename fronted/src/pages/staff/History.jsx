import React, { useState } from 'react';
import { FiSearch, FiEye, FiPhone } from 'react-icons/fi';

const History = ({ stats, setSelectedSale }) => {
    const [search, setSearch] = useState('');
    
    const filteredHistory = stats.history.filter(h => 
        h.customerName?.toLowerCase().includes(search.toLowerCase()) || 
        h._id.includes(search)
    );

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <header className="flex justify-between items-center mb-6">
                <div><h1 className="text-2xl font-bold text-white">Sales Ledger</h1></div>
                <div className="relative"><FiSearch className="absolute left-4 top-3 text-slate-500"/><input type="text" placeholder="Search..." className="bg-[#0F172A] border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-white w-80 outline-none" onChange={e => setSearch(e.target.value)}/></div>
            </header>
            <div className="bg-[#0F172A] rounded-3xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[#131C31] text-slate-400 text-xs uppercase"><tr><th className="p-4">Bill ID</th><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Total</th><th className="p-4 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                        {filteredHistory.map(sale => (
                            <tr key={sale._id} className="hover:bg-slate-800/30">
                                <td className="p-4 font-mono text-indigo-400">#{sale._id.slice(-6).toUpperCase()}</td>
                                <td className="p-4">{new Date(sale.date).toLocaleDateString()}</td>
                                <td className="p-4"><div className="font-bold text-white">{sale.customerName}</div><div className="text-xs text-slate-500 flex items-center gap-1"><FiPhone size={10}/> {sale.customerPhone}</div></td>
                                <td className="p-4 font-bold text-emerald-400">${(sale.finalAmount || sale.totalAmount).toFixed(2)}</td>
                                <td className="p-4 text-right"><button onClick={() => setSelectedSale(sale)} className="p-2 bg-slate-800 rounded hover:bg-indigo-600 text-white"><FiEye/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default History;