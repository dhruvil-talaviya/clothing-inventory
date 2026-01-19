import React from 'react';
export const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</p>
                <h3 className="text-2xl font-bold text-white mt-0.5">{value}</h3>
            </div>
        </div>
    </div>
);