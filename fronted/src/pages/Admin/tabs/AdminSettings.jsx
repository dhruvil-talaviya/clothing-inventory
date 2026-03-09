import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FiUser, FiShield, FiBell, FiServer, FiSave, FiEye, FiEyeOff, FiCheck, FiAlertTriangle, FiRefreshCw, FiChevronRight } from 'react-icons/fi';

const API = 'http://localhost:5001';
const iCls = "w-full bg-[#080c14] border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm placeholder:text-slate-700";
const lCls = "text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5";
const getUser = () => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } };

const Msg = ({ m }) => !m ? null : (
    <div className={`flex items-center gap-2 p-3 rounded-2xl border text-sm font-bold mb-4 ${m.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
        {m.ok ? <FiCheck size={13}/> : <FiAlertTriangle size={13}/>} {m.text}
    </div>
);

const Toggle = ({ checked, onChange, label, sub }) => (
    <div className="flex items-center justify-between p-4 bg-[#080c14] rounded-2xl border border-slate-800">
        <div><p className="text-sm font-bold text-white">{label}</p>{sub && <p className="text-[10px] text-slate-600">{sub}</p>}</div>
        <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-all ${checked ? 'bg-indigo-600' : 'bg-slate-800'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-6' : 'left-1'}`}/>
        </button>
    </div>
);

const TABS = [
    { id: 'profile',  label: 'Profile',     icon: FiUser },
    { id: 'security', label: 'Security',    icon: FiShield },
    { id: 'prefs',    label: 'Preferences', icon: FiBell },
    { id: 'system',   label: 'System',      icon: FiServer },
];

export default function AdminSettings() {
    const user = getUser();
    const [tab, setTab]         = useState('profile');
    const [profile, setProfile] = useState({ name: user.name || '', email: user.email || '' });
    const [profMsg, setProfMsg] = useState(null);
    const [profLoad, setProfLoad] = useState(false);
    const [pw, setPw]           = useState({ cur: '', new: '', con: '' });
    const [show, setShow]       = useState({ cur: false, new: false, con: false });
    const [pwMsg, setPwMsg]     = useState(null);
    const [pwLoad, setPwLoad]   = useState(false);
    const [otpStep, setOtpStep] = useState('idle');
    const [otp, setOtp]         = useState('');
    const [genOtp, setGenOtp]   = useState('');
    const [timer, setTimer]     = useState(0);
    const [prefs, setPrefs]     = useState(() => { try { return JSON.parse(localStorage.getItem('adminPrefs')) || { notifs: true, sounds: false, autoLogout: true }; } catch { return { notifs: true, sounds: false, autoLogout: true }; } });
    const [health, setHealth]   = useState({ status: '…', latency: '…', db: '…' });
    const [hLoad, setHLoad]     = useState(false);
    const timerRef = useRef(null);
    const otpRefs  = useRef([]);

    useEffect(() => { if (tab === 'system') checkHealth(); }, [tab]);

    const checkHealth = async () => {
        setHLoad(true);
        const t0 = Date.now();
        try {
            await axios.get(`${API}/`);
            setHealth({ status: 'Online', latency: `${Date.now() - t0}ms`, db: 'Connected' });
        } catch {
            setHealth({ status: 'Offline', latency: '—', db: 'Error' });
        } finally { setHLoad(false); }
    };

    const saveProfile = async () => {
        if (!profile.name.trim()) return setProfMsg({ text: 'Name cannot be empty.' });
        setProfLoad(true); setProfMsg(null);
        try {
            await axios.put(`${API}/api/admin/profile/${user.id}`, profile);
            localStorage.setItem('user', JSON.stringify({ ...user, ...profile }));
            setProfMsg({ ok: true, text: 'Profile updated.' });
        } catch (e) {
            setProfMsg({ text: e.response?.data?.message || 'Failed to save.' });
        } finally { setProfLoad(false); }
    };

    const startTimer = () => {
        setTimer(60);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; }), 1000);
    };

    const requestOtp = () => {
        setPwMsg(null);
        if (!pw.cur)           return setPwMsg({ text: 'Enter current password.' });
        if (pw.new.length < 6) return setPwMsg({ text: 'Min 6 characters.' });
        if (pw.new !== pw.con) return setPwMsg({ text: 'Passwords do not match.' });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGenOtp(code); setOtpStep('verify'); startTimer(); setOtp('');
        setTimeout(() => alert(`Demo OTP: ${code}`), 200);
    };

    const verifyOtp = async () => {
        if (otp !== genOtp) return setPwMsg({ text: 'Incorrect OTP.' });
        setPwLoad(true); setPwMsg(null);
        try {
            await axios.post(`${API}/api/staff/change-password`, { userId: user.id, currentPassword: pw.cur, newPassword: pw.new });
            clearInterval(timerRef.current); setOtpStep('done');
            setPwMsg({ ok: true, text: 'Password changed!' });
            setPw({ cur: '', new: '', con: '' });
        } catch (e) {
            setPwMsg({ text: e.response?.data?.message || 'Failed.' });
        } finally { setPwLoad(false); }
    };

    const handleOtpKey = (i, e) => {
        if (e.key === 'Backspace') { const a = otp.split(''); a[i] = ''; setOtp(a.join('')); if (i > 0) otpRefs.current[i-1]?.focus(); return; }
        if (!/^\d$/.test(e.key)) return;
        const a = otp.split(''); a[i] = e.key; setOtp(a.join(''));
        if (i < 5) otpRefs.current[i+1]?.focus();
    };

    const card = "bg-[#0f172a] border border-slate-800 rounded-3xl p-7";

    return (
        <div className="space-y-5">
            {/* Tab bar */}
            <div className="flex gap-1 bg-[#0f172a] border border-slate-800 rounded-2xl p-1.5 w-fit">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                        <t.icon size={13}/> {t.label}
                    </button>
                ))}
            </div>

            {/* PROFILE */}
            {tab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className={card}>
                        <h3 className="font-black text-white mb-5">Profile Info</h3>
                        <Msg m={profMsg}/>
                        <div className="flex items-center gap-3 p-4 bg-[#080c14] rounded-2xl border border-slate-800 mb-5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-white text-xl">
                                {(profile.name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-black text-white">{profile.name || 'Admin'}</p>
                                <p className="text-slate-500 text-xs">{profile.email}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div><label className={lCls}>Name</label><input className={iCls} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}/></div>
                            <div><label className={lCls}>Email</label><input className={iCls} type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })}/></div>
                        </div>
                        <button onClick={saveProfile} disabled={profLoad}
                            className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                            {profLoad ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <FiSave size={13}/>} Save Profile
                        </button>
                    </div>
                    <div className={card}>
                        <h3 className="font-black text-white mb-5">Account Details</h3>
                        <div className="space-y-2.5">
                            {[['Employee ID', user.employeeId || 'ADMIN-001'], ['Role', (user.role || 'admin').toUpperCase()], ['Account Type', 'Super Admin'], ['Session', 'Active (1 day)']].map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between p-3.5 bg-[#080c14] rounded-2xl border border-slate-800">
                                    <span className="text-slate-500 text-xs font-bold">{k}</span>
                                    <span className="text-white text-sm font-black">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SECURITY */}
            {tab === 'security' && (
                <div className="max-w-md">
                    <div className={card}>
                        <h3 className="font-black text-white mb-5">Change Password</h3>
                        <Msg m={pwMsg}/>
                        {otpStep === 'idle' && (
                            <div className="space-y-4">
                                {[['cur','Current Password'],['new','New Password'],['con','Confirm Password']].map(([k, label]) => (
                                    <div key={k}>
                                        <label className={lCls}>{label}</label>
                                        <div className="relative">
                                            <input type={show[k] ? 'text' : 'password'} value={pw[k]}
                                                onChange={e => setPw({ ...pw, [k]: e.target.value })}
                                                className={`${iCls} pr-10 ${k === 'con' && pw.con && pw.con !== pw.new ? 'border-red-500/60' : ''}`}
                                                placeholder="••••••"/>
                                            <button type="button" onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                                                {show[k] ? <FiEyeOff size={13}/> : <FiEye size={13}/>}
                                            </button>
                                        </div>
                                        {k === 'con' && pw.con && (
                                            <p className={`text-xs mt-1 font-bold ${pw.con === pw.new ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {pw.con === pw.new ? '✓ Match' : '✗ No match'}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                <button onClick={requestOtp} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                                    <FiShield size={13}/> Get OTP <FiChevronRight size={12}/>
                                </button>
                            </div>
                        )}
                        {otpStep === 'verify' && (
                            <div>
                                <p className="text-slate-500 text-xs text-center mb-4">Enter the 6-digit OTP</p>
                                <div className="flex gap-2 justify-center mb-3">
                                    {[0,1,2,3,4,5].map(i => (
                                        <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1}
                                            value={otp[i] || ''} onKeyDown={e => handleOtpKey(i, e)} onChange={() => {}}
                                            className={`w-11 h-12 text-center text-lg font-black rounded-2xl border-2 outline-none bg-[#080c14] text-white transition-all ${otp[i] ? 'border-indigo-500' : 'border-slate-800 focus:border-indigo-500/60'}`}/>
                                    ))}
                                </div>
                                <p className="text-center text-xs mb-4 font-bold">
                                    {timer > 0 ? <span className="text-slate-500">Expires in <span className="text-indigo-400">{timer}s</span></span>
                                    : <span className="text-red-400">Expired — <button onClick={() => { setOtpStep('idle'); setOtp(''); }} className="underline">go back</button></span>}
                                </p>
                                <button onClick={verifyOtp} disabled={otp.length !== 6 || pwLoad || timer === 0}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                                    {pwLoad ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <FiCheck size={13}/>} Verify & Save
                                </button>
                                <button onClick={() => { setOtpStep('idle'); setOtp(''); setPwMsg(null); }} className="w-full mt-2 py-2.5 text-slate-500 hover:text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all">← Back</button>
                            </div>
                        )}
                        {otpStep === 'done' && (
                            <div className="text-center py-4">
                                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3"><FiCheck size={24} className="text-emerald-400"/></div>
                                <p className="font-black text-white mb-1">Password Changed!</p>
                                <button onClick={() => { setOtpStep('idle'); setPwMsg(null); }} className="mt-3 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-sm transition-all">Done</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PREFERENCES */}
            {tab === 'prefs' && (
                <div className="max-w-md">
                    <div className={card}>
                        <h3 className="font-black text-white mb-5">Preferences</h3>
                        <div className="space-y-3">
                            <Toggle checked={prefs.notifs}     onChange={() => setPrefs(p => ({ ...p, notifs: !p.notifs }))}         label="Email Notifications" sub="Alerts for sales and events"/>
                            <Toggle checked={prefs.sounds}     onChange={() => setPrefs(p => ({ ...p, sounds: !p.sounds }))}         label="System Sounds"       sub="Play sounds for alerts"/>
                            <Toggle checked={prefs.autoLogout} onChange={() => setPrefs(p => ({ ...p, autoLogout: !p.autoLogout }))} label="Auto Logout"         sub="Log out after 1 day"/>
                        </div>
                        <button onClick={() => { localStorage.setItem('adminPrefs', JSON.stringify(prefs)); setProfMsg({ ok: true, text: 'Preferences saved.' }); setTimeout(() => setProfMsg(null), 2000); }}
                            className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                            <FiSave size={13}/> Save Preferences
                        </button>
                    </div>
                </div>
            )}

            {/* SYSTEM */}
            {tab === 'system' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                        {[['API Status', health.status, health.status === 'Online' ? 'text-emerald-400' : 'text-red-400'],
                          ['Database',   health.db,     health.db === 'Connected'  ? 'text-blue-400'   : 'text-red-400'],
                          ['Latency',    health.latency, 'text-white']
                        ].map(([k, v, cls]) => (
                            <div key={k} className={`${card} text-center`}>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">{k}</p>
                                <p className={`text-2xl font-black ${cls}`}>{v}</p>
                            </div>
                        ))}
                    </div>
                    <div className={card}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-white">System Info</h3>
                            <button onClick={checkHealth} disabled={hLoad} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all">
                                <FiRefreshCw size={11} className={hLoad ? 'animate-spin' : ''}/> Refresh
                            </button>
                        </div>
                        <div className="space-y-2">
                            {[['Backend', API], ['Version', 'v2.4.0'], ['Auth', 'JWT · 1 day'], ['DB', 'MongoDB · clothing_db'], ['Uploads', 'Local · max 3MB']].map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between p-3 bg-[#080c14] rounded-2xl border border-slate-800">
                                    <span className="text-slate-500 text-xs font-bold">{k}</span>
                                    <span className="text-slate-300 text-xs font-mono">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}