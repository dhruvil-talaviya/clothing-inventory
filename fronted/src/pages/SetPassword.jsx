import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiCheckCircle, FiShield, FiEye, FiEyeOff, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';

// ─── OTP INPUT BOXES ──────────────────────────────────────────────────────────
const OtpBoxes = ({ value, onChange }) => {
    const inputs = useRef([]);
    const digits = value.split('');

    const handleKey = (i, e) => {
        if (e.key === 'Backspace') {
            if (!digits[i] && i > 0) inputs.current[i - 1]?.focus();
            const next = [...digits];
            next[i] = '';
            onChange(next.join(''));
            return;
        }
        if (!/^\d$/.test(e.key)) return;
        const next = [...digits];
        next[i] = e.key;
        onChange(next.join(''));
        if (i < 5) inputs.current[i + 1]?.focus();
    };

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        onChange(pasted.padEnd(6, '').slice(0, 6));
        inputs.current[Math.min(pasted.length, 5)]?.focus();
        e.preventDefault();
    };

    return (
        <div className="flex gap-2.5 justify-center">
            {[0,1,2,3,4,5].map(i => (
                <input key={i}
                    ref={el => inputs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digits[i] || ''}
                    onKeyDown={e => handleKey(i, e)}
                    onPaste={handlePaste}
                    onChange={() => {}}
                    className={`w-12 h-14 text-center text-xl font-black rounded-2xl border-2 outline-none transition-all bg-[#080c14] text-white
                        ${digits[i] ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 focus:border-indigo-500/60'}`}
                />
            ))}
        </div>
    );
};

// ─── PASSWORD STRENGTH ────────────────────────────────────────────────────────
const StrengthBar = ({ password }) => {
    if (!password) return null;
    const len = password.length;
    const hasUpper  = /[A-Z]/.test(password);
    const hasNum    = /\d/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);
    const score = [len >= 6, len >= 8, hasUpper || hasNum, hasSymbol].filter(Boolean).length;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];
    const textCols = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400'];
    return (
        <div className="mt-2">
            <div className="flex gap-1 mb-1">
                {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-slate-800'}`}/>
                ))}
            </div>
            <p className={`text-[10px] font-bold text-right ${textCols[score]}`}>{labels[score]}</p>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
const SetPassword = () => {
    const navigate = useNavigate();

    // ✅ FIX 1: Read user once at mount — not on every render
    const [user] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')) || {}; }
        catch { return {}; }
    });

    // Steps: 'password' → 'otp' → 'done'
    const [step,         setStep]         = useState('password');
    const [password,     setPassword]     = useState('');
    const [confirm,      setConfirm]      = useState('');
    const [showPw,       setShowPw]       = useState(false);
    const [showConfirm,  setShowConfirm]  = useState(false);
    const [otp,          setOtp]          = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [timer,        setTimer]        = useState(0);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState('');
    const timerRef = useRef(null);

    // ✅ FIX 2: Tightened guard — also redirects away if isFirstLogin is already false
    useEffect(() => {
        const userId = user?.id || user?._id;

        // No session at all → login
        if (!userId) {
            navigate('/');
            return;
        }

        // Already completed first-login setup → go to dashboard
        if (user.isFirstLogin === false) {
            navigate('/dashboard');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup timer on unmount
    useEffect(() => () => clearInterval(timerRef.current), []);

    const startTimer = () => {
        setTimer(60);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimer(t => {
                if (t <= 1) { clearInterval(timerRef.current); return 0; }
                return t - 1;
            });
        }, 1000);
    };

    // ── Step 1: Validate passwords → generate OTP ─────────────────────────────
    const handleRequestOtp = () => {
        setError('');
        if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirm)  { setError('Passwords do not match.'); return; }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);
        setStep('otp');
        startTimer();
        // In production: call backend to send OTP via email/SMS
        // await axios.post('/api/auth/send-otp', { userId: user.id || user._id });
        console.info(`[DEMO] OTP for ${user.name}: ${code}`);
        setTimeout(() => alert(`Demo OTP: ${code}\n(In production this is sent to registered email/phone)`), 200);
    };

    // ── Step 2: Verify OTP → change password in DB ────────────────────────────
    const handleVerifyAndSet = async () => {
        setError('');
        if (otp.length !== 6)     { setError('Enter the complete 6-digit OTP.'); return; }
        if (otp !== generatedOtp) { setError('Incorrect OTP. Please try again.'); return; }

        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5001/api/auth/force-change-password', {
                id:          user.id || user._id,
                newPassword: password,
            });

            clearInterval(timerRef.current);

            // ✅ FIX 3: Prefer the updated user object returned by backend;
            //           fall back to patching locally if backend doesn't return it
            const updatedUser = res.data.user
                ? res.data.user
                : { ...user, isFirstLogin: false };

            // ✅ FIX 4: Persist the updated user so the guard never redirects here again
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setStep('done');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Done → clear session and go to login ──────────────────────────
    const handleDone = () => {
        // ✅ FIX 5: Navigate first, THEN clear storage — prevents the useEffect
        //           guard from firing on an empty localStorage and causing a loop
        navigate('/');
        setTimeout(() => localStorage.clear(), 100);
    };

    const inputCls = "w-full bg-[#080c14] border border-slate-800 text-white p-3.5 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm pr-11 placeholder:text-slate-700";

    return (
        <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4 font-sans">
            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl"/>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Brand */}
                <div className="text-center mb-8">
                    <p className="text-indigo-400 font-black text-lg tracking-widest uppercase">StyleSync</p>
                    <p className="text-slate-600 text-xs mt-1">Staff Portal</p>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">

                    {/* Progress bar */}
                    <div className="flex border-b border-slate-800">
                        {['password','otp','done'].map((s, i) => (
                            <div key={s} className={`flex-1 h-1 transition-all duration-500 ${
                                step === 'done' ? 'bg-emerald-500'
                                : i < ['password','otp','done'].indexOf(step) ? 'bg-indigo-600'
                                : s === step ? 'bg-indigo-500'
                                : 'bg-slate-800'}`}/>
                        ))}
                    </div>

                    <div className="p-8">

                        {/* ── STEP 1: Set Password ── */}
                        {step === 'password' && (
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-11 h-11 bg-indigo-600/20 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                                        <FiLock size={18}/>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white">Set Your Password</h2>
                                        <p className="text-slate-500 text-xs">Welcome, <span className="text-indigo-400 font-bold">{user?.name}</span> — first login setup</p>
                                    </div>
                                </div>

                                {error && (
                                    <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2 text-red-400 text-sm font-bold">
                                        <FiAlertTriangle size={15} className="shrink-0"/> {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">New Password</label>
                                        <div className="relative">
                                            <input type={showPw ? 'text' : 'password'} value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="Min 6 characters"
                                                className={inputCls}/>
                                            <button type="button" onClick={() => setShowPw(v => !v)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                                                {showPw ? <FiEyeOff size={15}/> : <FiEye size={15}/>}
                                            </button>
                                        </div>
                                        <StrengthBar password={password}/>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Confirm Password</label>
                                        <div className="relative">
                                            <input type={showConfirm ? 'text' : 'password'} value={confirm}
                                                onChange={e => setConfirm(e.target.value)}
                                                placeholder="Re-enter password"
                                                className={`${inputCls} ${confirm && confirm !== password ? 'border-red-500/60' : ''}`}/>
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                                                {showConfirm ? <FiEyeOff size={15}/> : <FiEye size={15}/>}
                                            </button>
                                        </div>
                                        {confirm && confirm !== password && (
                                            <p className="text-red-400 text-xs mt-1.5 font-bold flex items-center gap-1"><FiAlertTriangle size={10}/> Passwords don't match</p>
                                        )}
                                        {confirm && confirm === password && password && (
                                            <p className="text-emerald-400 text-xs mt-1.5 font-bold flex items-center gap-1"><FiCheckCircle size={10}/> Passwords match</p>
                                        )}
                                    </div>
                                </div>

                                <button onClick={handleRequestOtp}
                                    className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-sm">
                                    <FiShield size={15}/> Get OTP to Continue <FiArrowRight size={13}/>
                                </button>

                                <p className="text-center text-slate-700 text-xs mt-4">
                                    An OTP will verify your identity before the password is saved.
                                </p>
                            </div>
                        )}

                        {/* ── STEP 2: Verify OTP ── */}
                        {step === 'otp' && (
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-11 h-11 bg-emerald-600/20 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                                        <FiShield size={18}/>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white">Verify Identity</h2>
                                        <p className="text-slate-500 text-xs">Enter the 6-digit OTP to confirm</p>
                                    </div>
                                </div>

                                {error && (
                                    <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2 text-red-400 text-sm font-bold">
                                        <FiAlertTriangle size={15} className="shrink-0"/> {error}
                                    </div>
                                )}

                                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 mb-6 text-center">
                                    <p className="text-slate-400 text-xs">OTP sent to your registered contact</p>
                                    <p className="text-slate-600 text-[10px] mt-0.5">(Check browser console for demo OTP)</p>
                                </div>

                                <OtpBoxes value={otp} onChange={setOtp}/>

                                {/* Timer */}
                                <p className="text-center mt-4 text-xs font-bold">
                                    {timer > 0
                                        ? <span className="text-slate-500">OTP expires in <span className="text-indigo-400">{timer}s</span></span>
                                        : <span className="text-red-400">OTP expired — <button onClick={() => { setStep('password'); setOtp(''); setError(''); }} className="underline">go back</button></span>
                                    }
                                </p>

                                <button onClick={handleVerifyAndSet} disabled={otp.length !== 6 || loading || timer === 0}
                                    className="w-full mt-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm">
                                    {loading
                                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Verifying…</>
                                        : <><FiCheckCircle size={15}/> Verify & Set Password</>
                                    }
                                </button>

                                <button onClick={() => { setStep('password'); setOtp(''); setError(''); }}
                                    className="w-full mt-2.5 py-3 text-slate-500 hover:text-white font-bold rounded-2xl transition-all text-sm hover:bg-slate-800">
                                    ← Back
                                </button>
                            </div>
                        )}

                        {/* ── STEP 3: Done ── */}
                        {step === 'done' && (
                            <div className="text-center py-4">
                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <FiCheckCircle size={36} className="text-emerald-400"/>
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">Password Set!</h2>
                                <p className="text-slate-400 text-sm mb-1">Your password has been saved successfully.</p>
                                <p className="text-slate-600 text-xs mb-8">Please log in again with your new credentials.</p>
                                <button onClick={handleDone}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
                                    Go to Login <FiArrowRight size={13}/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-slate-700 text-xs mt-6">StyleSync Retail · Staff Portal</p>
            </div>
        </div>
    );
};

export default SetPassword;