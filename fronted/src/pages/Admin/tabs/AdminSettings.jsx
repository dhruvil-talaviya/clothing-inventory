import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
    FiUser, FiShield, FiBell, FiServer, FiSave, FiEye, FiEyeOff,
    FiCheck, FiAlertTriangle, FiRefreshCw, FiPhone, FiLock, FiArrowRight
} from 'react-icons/fi';

const API  = 'http://localhost:5001';
const iCls = "w-full bg-[#080c14] border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-slate-700";
const lCls = "text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5";

const getUser  = () => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } };
const saveUser = (u) => localStorage.setItem('user', JSON.stringify(u));

const Msg = ({ m }) => !m ? null : (
    <div className={`flex items-center gap-2 p-3 rounded-2xl border text-sm font-bold mb-4
        ${m.ok
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
        {m.ok ? <FiCheck size={13}/> : <FiAlertTriangle size={13}/>} {m.text}
    </div>
);

const Toggle = ({ checked, onChange, label, sub }) => (
    <div className="flex items-center justify-between p-4 bg-[#080c14] rounded-2xl border border-slate-800">
        <div>
            <p className="text-sm font-bold text-white">{label}</p>
            {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
        </div>
        <button onClick={onChange}
            className={`relative w-11 h-6 rounded-full transition-all ${checked ? 'bg-indigo-600' : 'bg-slate-800'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-6' : 'left-1'}`}/>
        </button>
    </div>
);

const TABS = [
    { id: 'profile',  label: 'Profile',     icon: FiUser   },
    { id: 'security', label: 'Security',    icon: FiShield },
    { id: 'prefs',    label: 'Preferences', icon: FiBell   },
    { id: 'system',   label: 'System',      icon: FiServer },
];

export default function AdminSettings() {
    const [tab, setTab] = useState('profile');
    const card = "bg-[#0f172a] border border-slate-800 rounded-3xl p-7";

    // ── Profile state — loaded from DB on mount ───────────────────────────────
    const [profile,    setProfile]    = useState({ name: '', email: '', phone: '' });
    const [profMsg,    setProfMsg]    = useState(null);
    const [profLoad,   setProfLoad]   = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);

    // ── Security ──────────────────────────────────────────────────────────────
    const [pw,      setPw]      = useState({ new: '', con: '' });
    const [show,    setShow]    = useState({ new: false, con: false });
    const [pwMsg,   setPwMsg]   = useState(null);
    const [pwLoad,  setPwLoad]  = useState(false);
    const [otpStep, setOtpStep] = useState('idle');
    const [otp,     setOtp]     = useState(['','','','','','']);
    const [timer,   setTimer]   = useState(0);
    const timerRef = useRef(null);
    const otpRefs  = useRef([]);

    // ── Prefs ─────────────────────────────────────────────────────────────────
    const [prefs,    setPrefs]    = useState(() => {
        try { return JSON.parse(localStorage.getItem('adminPrefs')) || { notifs: true, sounds: false, autoLogout: true }; }
        catch { return { notifs: true, sounds: false, autoLogout: true }; }
    });
    const [prefsMsg, setPrefsMsg] = useState(null);

    // ── System ────────────────────────────────────────────────────────────────
    const [health, setHealth] = useState({ status: '…', latency: '…', db: '…' });
    const [hLoad,  setHLoad]  = useState(false);

    // ── Load profile from DB on mount ─────────────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            setProfileLoading(true);
            try {
                const u = getUser();
                const id = u.id || u._id;
                if (!id) {
                    // Fallback to localStorage if no id
                    setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '' });
                    setProfileLoading(false);
                    return;
                }
                const res = await axios.get(`${API}/api/admin/profile/${id}`);
                const data = res.data?.user || res.data || {};
                // Sync fresh DB data into localStorage and local state
                const merged = { ...u, ...data };
                saveUser(merged);
                setProfile({
                    name:  data.name  || u.name  || '',
                    email: data.email || u.email || '',
                    phone: data.phone || u.phone || '',
                });
            } catch {
                // If GET endpoint doesn't exist, fall back to localStorage
                const u = getUser();
                setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '' });
            } finally {
                setProfileLoading(false);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => { if (tab === 'system') checkHealth(); }, [tab]);

    useEffect(() => {
        setOtpStep('idle');
        setOtp(['','','','','','']);
        setPwMsg(null);
        setPw({ new: '', con: '' });
        clearInterval(timerRef.current);
    }, [tab]);

    useEffect(() => () => clearInterval(timerRef.current), []);

    const startTimer = () => {
        setTimer(60);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() =>
            setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; }), 1000);
    };

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

    // ── Save Profile — saves name, email, phone to DB + localStorage ──────────
    const saveProfile = async () => {
        setProfMsg(null);
        if (!profile.name.trim()) return setProfMsg({ text: 'Name cannot be empty.' });
        if (profile.phone && !/^\d{10}$/.test(profile.phone.trim()))
            return setProfMsg({ text: 'Enter a valid 10-digit phone number.' });

        setProfLoad(true);
        try {
            const u = getUser();
            const payload = {
                name:  profile.name.trim(),
                email: profile.email.trim(),
                phone: profile.phone.trim(),
            };

            await axios.put(`${API}/api/admin/profile/${u.id || u._id}`, payload);

            const updated = { ...u, ...payload };
            saveUser(updated);
            setProfile({ name: updated.name, email: updated.email, phone: updated.phone });
            setProfMsg({ ok: true, text: 'Profile saved successfully.' });
        } catch (e) {
            setProfMsg({ text: e.response?.data?.message || 'Failed to save profile.' });
        } finally { setProfLoad(false); }
    };

    // ── OTP / Password ────────────────────────────────────────────────────────
    const requestOtp = async () => {
        setPwMsg(null);
        if (pw.new.length < 6)  return setPwMsg({ text: 'New password must be at least 6 characters.' });
        if (pw.new !== pw.con)  return setPwMsg({ text: 'Passwords do not match.' });

        const freshUser = getUser();
        const phone = (freshUser.phone || '').toString().trim();
        if (!phone || phone.length !== 10)
            return setPwMsg({ text: 'No phone number found. Save your phone in the Profile tab first.' });

        setOtpStep('sending');
        try {
            await axios.post(`${API}/api/auth/send-otp`, { phone });
            setOtpStep('verify');
            startTimer();
            setOtp(['','','','','','']);
            setTimeout(() => otpRefs.current[0]?.focus(), 150);
        } catch (err) {
            setOtpStep('idle');
            setPwMsg({ text: err.response?.data?.message || 'Failed to send OTP. Try again.' });
        }
    };

    const verifyAndChange = async () => {
        const otpStr = otp.join('');
        if (otpStr.length !== 6) return setPwMsg({ text: 'Enter the complete 6-digit OTP.' });

        const freshUser = getUser();
        const phone = (freshUser.phone || '').toString().trim();

        setPwLoad(true); setPwMsg(null);
        try {
            await axios.post(`${API}/api/auth/verify-otp`, { phone, otp: otpStr });
            await axios.post(`${API}/api/auth/forgot-password`, { phone, newPassword: pw.new });
            clearInterval(timerRef.current);
            setOtpStep('done');
            setPwMsg({ ok: true, text: 'Password changed successfully!' });
            setPw({ new: '', con: '' });
        } catch (e) {
            setPwMsg({ text: e.response?.data?.message || 'Incorrect OTP. Try again.' });
        } finally { setPwLoad(false); }
    };

    const handleOtpKey = (i, e) => {
        if (e.key === 'Backspace') {
            const a = [...otp]; a[i] = ''; setOtp(a);
            if (i > 0) otpRefs.current[i - 1]?.focus();
            return;
        }
        if (!/^\d$/.test(e.key)) return;
        const a = [...otp]; a[i] = e.key; setOtp(a);
        if (i < 5) otpRefs.current[i + 1]?.focus();
    };

    const handleOtpPaste = (e) => {
        const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
        if (p.length === 6) { setOtp(p.split('')); otpRefs.current[5]?.focus(); }
    };

    const pwStrength  = pw.new.length < 6 ? 1 : pw.new.length < 10 ? 2 : pw.new.length < 14 ? 3 : 4;
    const freshUser   = getUser();
    const phoneOnFile = (freshUser.phone || profile.phone || '').toString().trim();

    return (
        <div className="space-y-5">

            {/* ── TAB BAR ── */}
            <div className="flex gap-1 bg-[#0f172a] border border-slate-800 rounded-2xl p-1.5 w-fit">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                            ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                        <t.icon size={13}/> {t.label}
                    </button>
                ))}
            </div>

            {/* ══ PROFILE TAB ══ */}
            {tab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Left — editable */}
                    <div className={card}>
                        <h3 className="font-black text-white mb-5">Profile Info</h3>
                        <Msg m={profMsg}/>

                        {profileLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <span className="w-6 h-6 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin"/>
                            </div>
                        ) : (
                            <>
                                {/* Avatar preview */}
                                <div className="flex items-center gap-3 p-4 bg-[#080c14] rounded-2xl border border-slate-800 mb-5">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-white text-xl shrink-0">
                                        {(profile.name || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-white truncate">{profile.name || 'Admin'}</p>
                                        <p className="text-slate-500 text-xs truncate">{profile.email || '—'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Name */}
                                    <div>
                                        <label className={lCls}>Full Name</label>
                                        <input className={iCls} placeholder="Super Admin"
                                            value={profile.name}
                                            onChange={e => { setProfile(p => ({ ...p, name: e.target.value })); setProfMsg(null); }}/>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className={lCls}>Email</label>
                                        <input className={iCls} type="email" placeholder="admin@stylesync.com"
                                            value={profile.email}
                                            onChange={e => { setProfile(p => ({ ...p, email: e.target.value })); setProfMsg(null); }}/>
                                    </div>

                                    {/* Phone — simple, no OTP messaging */}
                                    <div>
                                        <label className={lCls}>Phone Number</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-slate-500 text-xs font-bold select-none">+91</span>
                                            <input
                                                type="tel" maxLength="10"
                                                className={`${iCls} pl-12 pr-10
                                                    ${profile.phone && !/^\d{10}$/.test(profile.phone) ? 'border-red-500/50' : ''}`}
                                                placeholder="10-digit mobile number (optional)"
                                                value={profile.phone}
                                                onChange={e => { setProfile(p => ({ ...p, phone: e.target.value.replace(/\D/g,'') })); setProfMsg(null); }}/>
                                            <FiPhone className="absolute right-4 top-3.5 text-slate-600" size={13}/>
                                        </div>
                                        {profile.phone && !/^\d{10}$/.test(profile.phone) && (
                                            <p className="text-red-400 text-[10px] font-bold mt-1">Must be exactly 10 digits</p>
                                        )}
                                    </div>
                                </div>

                                <button onClick={saveProfile} disabled={profLoad}
                                    className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                                    {profLoad
                                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                        : <FiSave size={13}/>}
                                    Save Profile
                                </button>
                            </>
                        )}
                    </div>

                    {/* Right — read-only account details */}
                    <div className={card}>
                        <h3 className="font-black text-white mb-5">Account Details</h3>
                        <div className="space-y-2.5">
                            {[
                                { label: 'Employee ID',  value: freshUser.employeeId || 'ADMIN-001' },
                                { label: 'Role',         value: (freshUser.role || 'admin').toUpperCase() },
                                { label: 'Phone',        value: phoneOnFile ? `+91 ${phoneOnFile}` : 'Not set', red: !phoneOnFile },
                                { label: 'Account Type', value: 'Super Admin' },
                                { label: 'Session',      value: 'Active (1 day)' },
                            ].map(({ label, value, red }) => (
                                <div key={label} className="flex items-center justify-between p-3.5 bg-[#080c14] rounded-2xl border border-slate-800">
                                    <span className="text-slate-500 text-xs font-bold">{label}</span>
                                    <span className={`text-sm font-black ${red ? 'text-red-400' : 'text-white'}`}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ SECURITY TAB ══ */}
            {tab === 'security' && (
                <div className="max-w-md">
                    <div className={card}>
                        <div className="mb-6">
                            <h3 className="font-black text-white">Change Password</h3>
                            <p className="text-slate-500 text-xs mt-1">
                                Enter your new password, then verify via OTP sent to{' '}
                                <span className={`font-bold ${phoneOnFile ? 'text-indigo-400' : 'text-red-400'}`}>
                                    {phoneOnFile ? `+91 ${phoneOnFile}` : 'no phone — add in Profile tab'}
                                </span>
                            </p>
                        </div>

                        {!phoneOnFile && (
                            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                                <FiAlertTriangle className="text-red-400 shrink-0 mt-0.5" size={14}/>
                                <div>
                                    <p className="text-red-300 text-sm font-black">Phone number required</p>
                                    <p className="text-red-400/70 text-xs mt-0.5">
                                        Go to the <strong>Profile</strong> tab and save your 10-digit mobile number first.
                                    </p>
                                </div>
                            </div>
                        )}

                        <Msg m={pwMsg}/>

                        {otpStep === 'idle' && (
                            <div className="space-y-4">
                                <div>
                                    <label className={lCls}>New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-3.5 text-slate-600" size={13}/>
                                        <input
                                            type={show.new ? 'text' : 'password'}
                                            value={pw.new}
                                            onChange={e => { setPw(p => ({ ...p, new: e.target.value })); setPwMsg(null); }}
                                            className={`${iCls} pl-10 pr-10`}
                                            placeholder="Min 6 characters"/>
                                        <button type="button" onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                                            className="absolute right-4 top-3.5 text-slate-600 hover:text-slate-400">
                                            {show.new ? <FiEyeOff size={13}/> : <FiEye size={13}/>}
                                        </button>
                                    </div>
                                    {pw.new && (
                                        <div className="flex gap-1 mt-2 items-center">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-all
                                                    ${i <= pwStrength
                                                        ? (pwStrength<=1?'bg-red-500':pwStrength<=2?'bg-orange-400':pwStrength<=3?'bg-yellow-400':'bg-emerald-400')
                                                        : 'bg-slate-800'}`}/>
                                            ))}
                                            <span className="text-[10px] text-slate-500 ml-1.5 font-bold whitespace-nowrap">
                                                {pw.new.length<6?'Weak':pw.new.length<10?'Fair':pw.new.length<14?'Good':'Strong'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className={lCls}>Confirm New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-3.5 text-slate-600" size={13}/>
                                        <input
                                            type={show.con ? 'text' : 'password'}
                                            value={pw.con}
                                            onChange={e => { setPw(p => ({ ...p, con: e.target.value })); setPwMsg(null); }}
                                            className={`${iCls} pl-10 pr-10 ${pw.con && pw.con !== pw.new ? 'border-red-500/50' : ''}`}
                                            placeholder="Re-enter new password"/>
                                        <button type="button" onClick={() => setShow(s => ({ ...s, con: !s.con }))}
                                            className="absolute right-4 top-3.5 text-slate-600 hover:text-slate-400">
                                            {show.con ? <FiEyeOff size={13}/> : <FiEye size={13}/>}
                                        </button>
                                    </div>
                                    {pw.con && (
                                        <p className={`text-xs mt-1 font-bold ${pw.con === pw.new ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {pw.con === pw.new ? '✓ Passwords match' : '✗ Passwords do not match'}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={requestOtp}
                                    disabled={!phoneOnFile || pw.new.length < 6 || pw.new !== pw.con}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                                    <FiPhone size={13}/> Send OTP to Verify <FiArrowRight size={12}/>
                                </button>
                            </div>
                        )}

                        {otpStep === 'sending' && (
                            <div className="text-center py-10">
                                <span className="w-8 h-8 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin inline-block mb-4"/>
                                <p className="text-slate-400 text-sm font-bold">Sending OTP to +91 {phoneOnFile}…</p>
                            </div>
                        )}

                        {otpStep === 'verify' && (
                            <div className="space-y-5">
                                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-400 font-bold">
                                    <FiPhone size={13}/> OTP sent to +91 {phoneOnFile}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">
                                        Enter 6-Digit OTP
                                    </p>
                                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                                        {otp.map((digit, i) => (
                                            <input key={i}
                                                ref={el => otpRefs.current[i] = el}
                                                type="text" inputMode="numeric" maxLength={1}
                                                value={digit}
                                                onKeyDown={e => handleOtpKey(i, e)}
                                                onChange={() => {}}
                                                className={`w-11 h-12 text-center text-lg font-black rounded-2xl border-2 outline-none bg-[#080c14] text-white transition-all
                                                    ${digit ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 focus:border-indigo-500/60'}`}/>
                                        ))}
                                    </div>
                                    <p className="text-center text-xs font-bold mt-3">
                                        {timer > 0
                                            ? <span className="text-slate-500">Expires in <span className="text-indigo-400">{timer}s</span></span>
                                            : <span className="text-red-400 text-xs">
                                                OTP expired —{' '}
                                                <button onClick={() => { setOtpStep('idle'); setOtp(['','','','','','']); }}
                                                    className="underline hover:text-red-300">go back</button>
                                              </span>
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={verifyAndChange}
                                    disabled={otp.join('').length !== 6 || pwLoad || timer === 0}
                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                                    {pwLoad
                                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                        : <FiCheck size={14}/>}
                                    Verify & Change Password
                                </button>
                                <button onClick={() => { setOtpStep('idle'); setOtp(['','','','','','']); setPwMsg(null); }}
                                    className="w-full py-2.5 text-slate-500 hover:text-white text-sm font-bold rounded-2xl hover:bg-slate-800 transition-all">
                                    ← Back
                                </button>
                            </div>
                        )}

                        {otpStep === 'done' && (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiCheck size={28} className="text-emerald-400"/>
                                </div>
                                <p className="font-black text-white text-lg mb-1">Password Changed!</p>
                                <p className="text-slate-500 text-xs mb-6">Your password has been updated successfully.</p>
                                <button
                                    onClick={() => { setOtpStep('idle'); setPwMsg(null); setPw({ new:'', con:'' }); }}
                                    className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-sm transition-all">
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ PREFERENCES TAB ══ */}
            {tab === 'prefs' && (
                <div className="max-w-md">
                    <div className={card}>
                        <h3 className="font-black text-white mb-5">Preferences</h3>
                        <Msg m={prefsMsg}/>
                        <div className="space-y-3">
                            <Toggle checked={prefs.notifs}     onChange={() => setPrefs(p => ({ ...p, notifs:     !p.notifs }))}     label="Email Notifications" sub="Alerts for sales and events"/>
                            <Toggle checked={prefs.sounds}     onChange={() => setPrefs(p => ({ ...p, sounds:     !p.sounds }))}     label="System Sounds"       sub="Play sounds for alerts"/>
                            <Toggle checked={prefs.autoLogout} onChange={() => setPrefs(p => ({ ...p, autoLogout: !p.autoLogout }))} label="Auto Logout"         sub="Log out after 1 day of inactivity"/>
                        </div>
                        <button onClick={() => {
                            localStorage.setItem('adminPrefs', JSON.stringify(prefs));
                            setPrefsMsg({ ok: true, text: 'Preferences saved.' });
                            setTimeout(() => setPrefsMsg(null), 2000);
                        }} className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                            <FiSave size={13}/> Save Preferences
                        </button>
                    </div>
                </div>
            )}

            {/* ══ SYSTEM TAB ══ */}
            {tab === 'system' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            ['API Status', health.status,  health.status === 'Online'    ? 'text-emerald-400' : 'text-red-400'],
                            ['Database',   health.db,      health.db    === 'Connected'  ? 'text-blue-400'   : 'text-red-400'],
                            ['Latency',    health.latency, 'text-white'],
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
                            <button onClick={checkHealth} disabled={hLoad}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all">
                                <FiRefreshCw size={11} className={hLoad ? 'animate-spin' : ''}/> Refresh
                            </button>
                        </div>
                        <div className="space-y-2">
                            {[
                                ['Backend', API],
                                ['Version', 'v2.4.0'],
                                ['Auth',    'JWT · 1 day'],
                                ['DB',      'MongoDB · clothing_db'],
                                ['Uploads', 'Local · max 3MB'],
                            ].map(([k, v]) => (
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