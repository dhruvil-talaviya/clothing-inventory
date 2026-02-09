import React, { useState } from 'react';
import { FiCalendar, FiPlus, FiClock, FiMapPin, FiTag, FiTrash2, FiInfo } from 'react-icons/fi';

// --- STATIC DATA: 2026 INDIAN FESTIVAL CALENDAR ---
const INITIAL_EVENTS = [
    { id: 1, name: "New Year's Day", date: "2026-01-01", type: "Festival", month: 0, desc: "Global celebration." },
    { id: 2, name: "Makar Sankranti", date: "2026-01-14", type: "Festival", month: 0, desc: "Kite flying festival." },
    { id: 3, name: "Republic Day", date: "2026-01-26", type: "National", month: 0, desc: "Flag hoisting." },
    { id: 4, name: "Vasant Panchami", date: "2026-01-24", type: "Festival", month: 0, desc: "Worship of Goddess Saraswati." },
    { id: 5, name: "Mahashivratri", date: "2026-02-15", type: "Festival", month: 1, desc: "Lord Shiva celebration." },
    { id: 6, name: "Holi", date: "2026-03-04", type: "Festival", month: 2, desc: "Festival of Colors." },
    { id: 7, name: "Gudi Padwa / Ugadi", date: "2026-03-19", type: "Festival", month: 2, desc: "Hindu New Year." },
    { id: 8, name: "Ram Navami", date: "2026-03-27", type: "Festival", month: 2, desc: "Birth of Lord Rama." },
    { id: 9, name: "Mahavir Jayanti", date: "2026-03-31", type: "Festival", month: 2, desc: "Jain festival." },
    { id: 10, name: "Good Friday", date: "2026-04-03", type: "Festival", month: 3, desc: "Christian observance." },
    { id: 11, name: "Eid al-Fitr", date: "2026-03-20", type: "Festival", month: 2, desc: "End of Ramadan (Date varies)." },
    { id: 12, name: "Ambedkar Jayanti", date: "2026-04-14", type: "National", month: 3, desc: "B.R. Ambedkar's Birthday." },
    { id: 13, name: "Raksha Bandhan", date: "2026-08-28", type: "Festival", month: 7, desc: "Bond between brother and sister." },
    { id: 14, name: "Independence Day", date: "2026-08-15", type: "National", month: 7, desc: "India's Freedom Day." },
    { id: 15, name: "Janmashtami", date: "2026-09-04", type: "Festival", month: 8, desc: "Birth of Lord Krishna." },
    { id: 16, name: "Ganesh Chaturthi", date: "2026-09-14", type: "Festival", month: 8, desc: "10-day Ganpati festival." },
    { id: 17, name: "Gandhi Jayanti", date: "2026-10-02", type: "National", month: 9, desc: "Mahatma Gandhi's Birthday." },
    { id: 18, name: "Navratri Begins", date: "2026-10-11", type: "Festival", month: 9, desc: "9 Days of Garba/Dandiya." },
    { id: 19, name: "Dussehra", date: "2026-10-20", type: "Festival", month: 9, desc: "Victory of Good over Evil." },
    { id: 20, name: "Diwali", date: "2026-11-08", type: "Festival", month: 10, desc: "Festival of Lights." },
    { id: 21, name: "Christmas", date: "2026-12-25", type: "Festival", month: 11, desc: "Christian celebration." },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const AdminEvents = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [events, setEvents] = useState(INITIAL_EVENTS);
    const [newEvent, setNewEvent] = useState({ name: '', date: '', type: 'Store Event', desc: '' });
    const [showForm, setShowForm] = useState(false);

    // --- LOGIC ---
    const handleAddEvent = (e) => {
        e.preventDefault();
        if(!newEvent.name || !newEvent.date) return;
        
        const dateObj = new Date(newEvent.date);
        const eventToAdd = {
            id: Date.now(),
            ...newEvent,
            month: dateObj.getMonth()
        };
        
        setEvents([...events, eventToAdd]);
        setNewEvent({ name: '', date: '', type: 'Store Event', desc: '' });
        setShowForm(false);
    };

    const deleteEvent = (id) => {
        if(window.confirm("Remove this event?")) {
            setEvents(events.filter(e => e.id !== id));
        }
    };

    const filteredEvents = events
        .filter(e => e.month === selectedMonth)
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="h-full bg-[#080C14] text-white p-8 overflow-y-auto custom-scrollbar">
            
            {/* HEADER */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <FiCalendar className="text-indigo-500"/> Event Calendar
                    </h1>
                    <p className="text-slate-500 mt-2">Manage holidays, festivals, and store sales events.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                    {showForm ? <FiPlus className="rotate-45 transition-transform"/> : <FiPlus />} 
                    {showForm ? "Cancel" : "Add Event"}
                </button>
            </div>

            {/* ADD EVENT FORM */}
            {showForm && (
                <div className="bg-[#1E293B] border border-slate-700 p-6 rounded-2xl mb-8 animate-fade-in-down shadow-2xl">
                    <h3 className="font-bold text-lg mb-4 text-white">Add New Event</h3>
                    <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Event Name</label>
                            <input type="text" placeholder="e.g. Monsoon Sale" className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-3 mt-1 text-white outline-none focus:border-indigo-500"
                                value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                            <input type="date" className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-3 mt-1 text-white outline-none focus:border-indigo-500"
                                value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                            <select className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-3 mt-1 text-white outline-none focus:border-indigo-500"
                                value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                                <option>Store Event</option>
                                <option>Festival</option>
                                <option>National Holiday</option>
                            </select>
                        </div>
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg font-bold w-full">Save Event</button>
                    </form>
                </div>
            )}

            {/* MONTH SELECTOR */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
                {MONTHS.map((m, index) => (
                    <button 
                        key={m} 
                        onClick={() => setSelectedMonth(index)}
                        className={`px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                            selectedMonth === index 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105' 
                            : 'bg-[#0F172A] border-slate-800 text-slate-500 hover:text-white hover:border-slate-600'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* EVENTS LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.length > 0 ? (
                    filteredEvents.map(event => (
                        <div key={event.id} className="group bg-[#0F172A] border border-slate-800 rounded-2xl p-6 relative hover:border-indigo-500/50 hover:-translate-y-1 transition-all shadow-xl">
                            
                            {/* Decorative Type Tag */}
                            <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                event.type === 'Store Event' ? 'bg-emerald-500/20 text-emerald-400' :
                                event.type === 'National' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-indigo-500/20 text-indigo-400'
                            }`}>
                                {event.type}
                            </span>

                            <div className="flex items-start gap-4">
                                <div className="bg-slate-800 rounded-xl p-3 text-center min-w-[70px]">
                                    <span className="block text-xs font-bold text-slate-500 uppercase">{MONTHS[event.month].substring(0,3)}</span>
                                    <span className="block text-2xl font-black text-white">{new Date(event.date).getDate()}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{event.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{event.desc}</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                                <span className="text-xs text-slate-600 font-mono flex items-center gap-1">
                                    <FiClock /> {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric' })}
                                </span>
                                {event.type === 'Store Event' && (
                                    <button onClick={() => deleteEvent(event.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                                        <FiTrash2 />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-600 border border-dashed border-slate-800 rounded-3xl">
                        <FiCalendar size={48} className="mb-4 opacity-50"/>
                        <p>No events scheduled for {MONTHS[selectedMonth]}.</p>
                        <button onClick={() => setShowForm(true)} className="text-indigo-400 hover:underline mt-2">Add a store event?</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminEvents;