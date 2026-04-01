import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiCalendar, FiMapPin, FiPlus, FiEdit2, FiTrash2, FiX,
    FiCheck, FiTag, FiChevronLeft, FiChevronRight,
    FiSearch, FiClock, FiAlertTriangle
} from 'react-icons/fi';

// ─── LIVE STATUS CALCULATOR ───────────────────────────────────────────────────
const computeStatus = (event) => {
    const now   = new Date();
    const start = event.startDate ? new Date(event.startDate) : null;
    const end   = event.endDate   ? new Date(event.endDate)   : null;
    if (!start) return 'Upcoming';
    const today    = new Date(now.getFullYear(),   now.getMonth(),   now.getDate());
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay   = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : startDay;
    if (today < startDay) return 'Upcoming';
    if (today > endDay)   return 'Completed';
    return 'Active';
};

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    Upcoming:  { bg:'bg-blue-500/10',    text:'text-blue-400',    border:'border-blue-500/30',    dot:'bg-blue-400',    pulse:false },
    Active:    { bg:'bg-emerald-500/10', text:'text-emerald-400', border:'border-emerald-500/30', dot:'bg-emerald-400', pulse:true  },
    Completed: { bg:'bg-slate-700/50',   text:'text-slate-400',   border:'border-slate-600',      dot:'bg-slate-500',   pulse:false },
};

const GRADIENTS = [
    'from-violet-500 to-indigo-600', 'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',  'from-teal-500 to-cyan-600',
    'from-fuchsia-500 to-purple-600','from-lime-500 to-emerald-600',
];

const getGradient = (title = '') => GRADIENTS[title.charCodeAt(0) % GRADIENTS.length];
const fmt = (ds) => ds ? new Date(ds).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '--';

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const c = STATUS_CONFIG[status] || STATUS_CONFIG.Completed;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`}/>
            {status}
        </span>
    );
};

// ─── DATE RANGE CHIP ──────────────────────────────────────────────────────────
const DateRange = ({ startDate, endDate }) => (
    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <FiClock size={10} className="text-slate-600"/>
        {fmt(startDate)}{endDate && endDate !== startDate && <> → {fmt(endDate)}</>}
    </span>
);

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────
const DeleteModal = ({ event, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <FiTrash2 size={22} className="text-rose-400"/>
                </div>
                <h3 className="text-white font-black text-lg mb-1">Delete Event?</h3>
                <p className="text-slate-400 text-sm mb-1">You're about to permanently delete:</p>
                <p className="text-white font-bold text-sm bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl mt-1 mb-5 w-full truncate">
                    {event?.title}
                </p>
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-5 w-full">
                    <FiAlertTriangle size={14} className="text-rose-400 shrink-0"/>
                    <p className="text-rose-300 text-xs font-semibold">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white font-bold rounded-xl text-sm transition-all">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2">
                        <FiTrash2 size={13}/> Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
const EventCard = ({ event, onEdit, onDelete }) => {
    const status   = computeStatus(event);
    const grad     = getGradient(event.title);
    const date     = event.startDate ? new Date(event.startDate) : null;
    const day      = date ? date.toLocaleDateString('en-IN', { day:'2-digit' }) : '--';
    const month    = date ? date.toLocaleDateString('en-US', { month:'short' }).toUpperCase() : '--';
    const year     = date ? date.getFullYear() : '';
    const isActive = status === 'Active';
    return (
        <div className={`group bg-[#1e293b] rounded-2xl border overflow-hidden transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5
            ${isActive ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-slate-700/50 hover:border-slate-500/70'}`}>
            <div className="flex">
                {/* DATE COLUMN */}
                <div className={`bg-gradient-to-b ${grad} flex flex-col items-center justify-center px-5 py-6 min-w-[90px] shrink-0`}>
                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest">{month}</span>
                    <span className="text-white text-4xl font-black leading-none mt-1">{day}</span>
                    <span className="text-white/60 text-[10px] mt-1">{year}</span>
                </div>
                {/* CONTENT */}
                <div className="flex-1 p-5 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <StatusBadge status={status}/>
                                {event.saleOffer && (
                                    <span className="inline-flex items-center gap-1 text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        <FiTag size={9}/> {event.saleOffer}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-white font-bold text-base leading-snug truncate">{event.title}</h3>
                            <p className="text-slate-400 text-xs mt-1 line-clamp-2 leading-relaxed">{event.description}</p>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150">
                            <button onClick={() => onEdit(event)} className="p-2 bg-[#0f172a] border border-slate-700 text-blue-400 rounded-xl hover:border-blue-500 hover:bg-blue-500/10 transition-all">
                                <FiEdit2 size={13}/>
                            </button>
                            <button onClick={() => onDelete(event)} className="p-2 bg-[#0f172a] border border-slate-700 text-rose-400 rounded-xl hover:border-rose-500 hover:bg-rose-500/10 transition-all">
                                <FiTrash2 size={13}/>
                            </button>
                        </div>
                    </div>
                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/40 flex-wrap">
                        <DateRange startDate={event.startDate} endDate={event.endDate}/>
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <FiMapPin size={10} className="text-slate-600"/> {event.location}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── MINI CALENDAR MODAL ──────────────────────────────────────────────────────
const CalendarModal = ({ events, onClose, onDayClick }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAYS      = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const firstDay  = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today     = new Date();
    const eventDays = new Set(events.map(e => { const d = new Date(e.startDate || e.date); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }));
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length:daysInMonth }, (_,i) => i+1)];
    const isToday  = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasEvent = d => eventDays.has(`${year}-${month}-${d}`);
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <button onClick={() => setViewDate(new Date(year, month-1, 1))} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"><FiChevronLeft size={16}/></button>
                    <h3 className="text-sm font-bold text-white">{MONTHS[month]} {year}</h3>
                    <button onClick={() => setViewDate(new Date(year, month+1, 1))} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"><FiChevronRight size={16}/></button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                    {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                    {cells.map((d, i) => (
                        <div key={i} className="flex items-center justify-center">
                            {d ? (
                                <button onClick={() => { onDayClick(new Date(year, month, d)); onClose(); }}
                                    className={`relative w-9 h-9 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center
                                        ${isToday(d) ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                                    {d}
                                    {hasEvent(d) && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday(d) ? 'bg-white/70' : 'bg-indigo-400'}`}/>}
                                </button>
                            ) : <div className="w-9 h-9"/>}
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-4 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400"/>Event</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600"/>Today</span>
                </div>
            </div>
        </div>
    );
};

// ─── EVENT FORM MODAL (Admin only) ────────────────────────────────────────────
const EventModal = ({ isEditing, formData, setFormData, onClose, onSubmit, error }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700/60 bg-[#0f172a]/40">
                <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{isEditing ? 'Editing Event' : 'New Event'}</p>
                    <h3 className="text-lg font-bold text-white mt-0.5">{isEditing ? 'Edit Event' : 'Create New Event'}</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"><FiX size={18}/></button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Event Title *</label>
                    <input required type="text"
                        className="w-full bg-[#0f172a] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm placeholder:text-slate-600"
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Summer Clearance Sale"/>
                </div>

                {/* Start + End Date — STATUS IS AUTO-COMPUTED FROM THESE */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><FiCalendar size={9}/> Start Date *</label>
                        <input required type="date"
                            className="w-full bg-[#0f172a] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm [color-scheme:dark]"
                            value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><FiCalendar size={9}/> End Date *</label>
                        <input required type="date" min={formData.startDate || undefined}
                            className="w-full bg-[#0f172a] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm [color-scheme:dark]"
                            value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}/>
                    </div>
                </div>

                {/* Live status preview */}
                {formData.startDate && formData.endDate && (
                    <div className="flex items-center gap-2 p-3 bg-[#0f172a] rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Auto Status:</span>
                        <StatusBadge status={computeStatus({ startDate: formData.startDate, endDate: formData.endDate })}/>
                        <span className="text-[10px] text-slate-600 ml-auto">Updates automatically by date</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><FiMapPin size={9}/> Location *</label>
                        <input required type="text"
                            className="w-full bg-[#0f172a] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm placeholder:text-slate-600"
                            value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                            placeholder="In-Store or Online"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><FiTag size={9}/> Sale Offer</label>
                        <input type="text"
                            className="w-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm placeholder:text-indigo-500/40"
                            value={formData.saleOffer} onChange={e => setFormData({...formData, saleOffer: e.target.value})}
                            placeholder="e.g. 20% OFF Shirts"/>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Description *</label>
                    <textarea required rows="3"
                        className="w-full bg-[#0f172a] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all resize-none text-sm placeholder:text-slate-600"
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Details about the event and instructions for staff..."/>
                </div>

                <div className="pt-3 border-t border-slate-700/50 flex flex-col gap-3">
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold">
                            <span className="shrink-0 mt-0.5">⚠</span><span>{error}</span>
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-400 font-semibold hover:text-white text-sm transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2">
                            <FiCheck size={14}/> {isEditing ? 'Save Changes' : 'Publish Event'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
);

// ─── MAIN ADMIN COMPONENT ─────────────────────────────────────────────────────
const AdminEvents = () => {
    const [events,        setEvents]        = useState([]);
    const [showModal,     setShowModal]     = useState(false);
    const [showCalendar,  setShowCalendar]  = useState(false);
    const [deleteTarget,  setDeleteTarget]  = useState(null); // ← holds event to delete
    const [isEditing,     setIsEditing]     = useState(false);
    const [filterStatus,  setFilterStatus]  = useState('All');
    const [search,        setSearch]        = useState('');
    const [formError,     setFormError]     = useState('');

    const blankForm = { _id:null, title:'', startDate:'', endDate:'', location:'In-Store', description:'', saleOffer:'' };
    const [formData, setFormData] = useState(blankForm);

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        try { const res = await axios.get('https://clothing-inventory-bbhg.onrender.com/api/admin/events'); setEvents(res.data); }
        catch (err) { console.error("Error fetching events", err); }
    };

    const handleOpenCreate = (date) => {
        const dateStr = date ? date.toISOString().split('T')[0] : '';
        setFormData({ ...blankForm, startDate:dateStr, endDate:dateStr });
        setFormError(''); setIsEditing(false); setShowModal(true);
    };

    const handleOpenEdit = (event) => {
        const toStr = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
        setFormData({ ...event, startDate:toStr(event.startDate||event.date), endDate:toStr(event.endDate||event.startDate||event.date) });
        setFormError(''); setIsEditing(true); setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`https://clothing-inventory-bbhg.onrender.com/api/admin/events/${deleteTarget._id}`);
            setDeleteTarget(null);
            fetchEvents();
        } catch { alert("Failed to delete event"); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.startDate || !formData.endDate) { setFormError("Please select both a start date and an end date."); return; }
        if (formData.endDate < formData.startDate)    { setFormError("End date cannot be before start date."); return; }
        setFormError('');
        const payload = {
            title:       formData.title.trim(),
            startDate:   formData.startDate,
            endDate:     formData.endDate,
            location:    formData.location.trim() || 'In-Store',
            description: formData.description.trim(),
            saleOffer:   formData.saleOffer.trim(),
        };
        try {
            if (isEditing) await axios.put(`https://clothing-inventory-bbhg.onrender.com/api/admin/events/${formData._id}`, payload);
            else           await axios.post('https://clothing-inventory-bbhg.onrender.com/api/admin/events', payload);
            setShowModal(false); fetchEvents();
        } catch (err) {
            setFormError(`[${err.response?.status||'Error'}] ${err.response?.data?.message || err.message || 'Failed to save event.'}`);
        }
    };

    // Live status computed per event
    const eventsWithStatus = events.map(e => ({ ...e, _liveStatus: computeStatus(e) }));
    const filtered = eventsWithStatus.filter(e => {
        const matchStatus = filterStatus === 'All' || e._liveStatus === filterStatus;
        const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });
    const sorted = [...filtered].sort((a,b) => new Date(a.startDate||a.date) - new Date(b.startDate||b.date));
    const counts = {
        All:       eventsWithStatus.length,
        Upcoming:  eventsWithStatus.filter(e => e._liveStatus==='Upcoming').length,
        Active:    eventsWithStatus.filter(e => e._liveStatus==='Active').length,
        Completed: eventsWithStatus.filter(e => e._liveStatus==='Completed').length,
    };

    return (
        <div className="space-y-5 font-sans text-slate-200">

            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Events & Festivals</h2>
                    <p className="text-slate-400 text-xs mt-0.5">{events.length} total event{events.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCalendar(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all">
                        <FiCalendar size={14}/> Calendar
                    </button>
                    <button onClick={() => handleOpenCreate()} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-indigo-500/25">
                        <FiPlus size={15}/> Create Event
                    </button>
                </div>
            </div>

            {/* FILTERS + SEARCH */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-[#1e293b] border border-slate-700/60 rounded-xl p-1 gap-1">
                    {['All','Upcoming','Active','Completed'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus===s ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>
                            {s}
                            {s==='Active' && counts.Active>0 && <span className="ml-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse"/>}
                            <span className="ml-1 opacity-60">{counts[s]}</span>
                        </button>
                    ))}
                </div>
                <div className="relative ml-auto">
                    <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input type="text" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}
                        className="bg-[#1e293b] border border-slate-700 text-white text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-all w-52 placeholder:text-slate-600"/>
                </div>
            </div>

            {/* EVENTS LIST */}
            {sorted.length === 0 ? (
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl p-16 text-center flex flex-col items-center shadow-lg">
                    <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
                        <FiCalendar size={24} className="text-slate-600"/>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">No events found</h3>
                    <p className="text-slate-500 text-sm mb-5 max-w-xs mx-auto">{search ? `No results for "${search}"` : "Create your first event to get started."}</p>
                    {!search && (
                        <button onClick={() => handleOpenCreate()} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all">
                            <FiPlus size={14}/> Create Event
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {sorted.map(event => (
                        <EventCard key={event._id} event={event} onEdit={handleOpenEdit} onDelete={setDeleteTarget}/>
                    ))}
                </div>
            )}

            {/* CALENDAR MODAL */}
            {showCalendar && (
                <CalendarModal events={events} onClose={() => setShowCalendar(false)}
                    onDayClick={(date) => { handleOpenCreate(date); setShowCalendar(false); }}/>
            )}

            {/* EVENT FORM MODAL */}
            {showModal && (
                <EventModal isEditing={isEditing} formData={formData} setFormData={setFormData}
                    onClose={() => { setShowModal(false); setFormError(''); }}
                    onSubmit={handleSubmit} error={formError}/>
            )}

            {/* DELETE CONFIRM MODAL */}
            {deleteTarget && (
                <DeleteModal event={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}/>
            )}
        </div>
    );
};

export default AdminEvents;