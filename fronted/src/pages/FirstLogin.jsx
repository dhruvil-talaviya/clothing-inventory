import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiShield, FiArrowRight } from 'react-icons/fi';

const API = 'https://clothing-inventory-bbhg.onrender.com';

/**
 * FirstLogin — shown when isFirstLogin === true (new staff, first time)
 * Flow: Just set a new password → go to staff dashboard
 * NO OTP required here. OTP is only for "Forgot Password" from login screen.
 */
const FirstLogin = ({ user: propUser, onDone }) => {
    const navigate = useNavigate();

    const user = propUser || (() => {
        try { return JSON.parse(localStorage.getItem('user')) || {}; }
        catch { return {}; }
    })();

    const [newPw,     setNewPw]   = useState('');
    const [confirmPw, setCPw]     = useState('');
    const [showPw,    setShowPw]  = useState(false);
    const [error,     setError]   = useState('');
    const [loading,   setLoading] = useState(false);

    const pwStrength = newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : newPw.length < 14 ? 3 : 4;

    const handleSetPassword = async (e) => {
        e?.preventDefault();
        if (newPw.length < 6)    { setError('Password must be at least 6 characters.'); return; }
        if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }

        setLoading(true); setError('');
        try {
            const res = await axios.post(`${API}/api/auth/force-change-password`, {
                id: user.id || user._id,
                newPassword: newPw,
            });

            // Always force isFirstLogin=false in localStorage before navigating
            const updatedUser = {
                ...user,
                ...(res.data?.user || {}),
                isFirstLogin: false,
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            if (onDone) {
                onDone(updatedUser);
            } else {
                navigate('/staff/dashboard', { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set password. Try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120] font-sans p-4 relative overflow-hidden">

            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-700/10 rounded-full blur-3xl"/>
            </div>

            <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FiShield size={26} className="text-indigo-400"/>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">
                        Welcome, {user?.name || 'Staff'}!
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                        Your account was just created. Please set a new password to continue.
                    </p>
                </div>

                {/* Info banner */}
                <div className="mb-6 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                    <FiShield className="text-indigo-400 shrink-0 mt-0.5" size={15}/>
                    <div>
                        <p className="text-indigo-300 text-xs font-bold">First Login — Password Setup Required</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                            You must change your password before accessing your dashboard. This is a one-time step.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-5">

                    {/* New Password */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">
                            New Password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <FiLock className="absolute left-4 top-3.5 text-slate-500" size={14}/>
                            <input
                                type={showPw ? 'text' : 'password'}
                                required
                                autoFocus
                                value={newPw}
                                onChange={e => { setNewPw(e.target.value); setError(''); }}
                                placeholder="Min 6 characters"
                                className="w-full bg-slate-950/50 border border-slate-700 text-white pl-11 pr-12 py-3 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm"
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors">
                                {showPw ? <FiEyeOff size={14}/> : <FiEye size={14}/>}
                            </button>
                        </div>

                        {/* Password strength bar */}
                        {newPw && (
                            <div className="flex gap-1 mt-2 items-center">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`h-1 flex-1 rounded-full transition-all
                                        ${i <= pwStrength
                                            ? (pwStrength <= 1 ? 'bg-red-500'
                                              : pwStrength <= 2 ? 'bg-orange-400'
                                              : pwStrength <= 3 ? 'bg-yellow-400'
                                              : 'bg-emerald-400')
                                            : 'bg-slate-800'}`}
                                    />
                                ))}
                                <span className="text-[10px] text-slate-500 ml-1.5 font-bold whitespace-nowrap">
                                    {newPw.length < 6 ? 'Weak' : newPw.length < 10 ? 'Fair' : newPw.length < 14 ? 'Good' : 'Strong'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">
                            Confirm Password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <FiLock className="absolute left-4 top-3.5 text-slate-500" size={14}/>
                            <input
                                type="password"
                                required
                                value={confirmPw}
                                onChange={e => { setCPw(e.target.value); setError(''); }}
                                placeholder="Re-enter your new password"
                                className={`w-full bg-slate-950/50 border text-white pl-11 pr-4 py-3 rounded-xl outline-none transition-all text-sm
                                    ${confirmPw && confirmPw !== newPw
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-slate-700 focus:border-indigo-500'}`}
                            />
                        </div>
                        {confirmPw && confirmPw !== newPw && (
                            <p className="text-red-400 text-xs mt-1 font-bold">✗ Passwords do not match</p>
                        )}
                        {confirmPw && confirmPw === newPw && newPw && (
                            <p className="text-emerald-400 text-xs mt-1 font-bold">✓ Passwords match</p>
                        )}
                    </div>

                    {error && <ErrorBox msg={error}/>}

                    <button
                        type="submit"
                        disabled={loading || newPw.length < 6 || newPw !== confirmPw}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
                        {loading
                            ? <Spinner/>
                            : <><FiArrowRight size={16}/> Set Password & Continue</>}
                    </button>
                </form>

                <p className="text-center text-[11px] text-slate-600 mt-5">
                    Logged in as <span className="text-slate-400 font-bold">{user?.employeeId || user?.name}</span>
                    {' · '}
                    <button
                        type="button"
                        onClick={() => {
                            localStorage.clear();
                            navigate('/', { replace: true });
                        }}
                        className="text-red-400/70 hover:text-red-400 underline">
                        Sign out
                    </button>
                </p>
            </div>
        </div>
    );
};

const Spinner  = () => <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>;
const ErrorBox = ({ msg }) => (
    <p className="p-3 bg-red-500/10 text-red-300 text-xs text-center rounded-xl border border-red-500/20">{msg}</p>
);

export default FirstLogin;