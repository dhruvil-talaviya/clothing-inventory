import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import {
    FiUser, FiLock, FiEye, FiEyeOff, FiCheck,
    FiArrowRight, FiShield, FiRefreshCw, FiPhone
} from 'react-icons/fi';
import { useAuth } from '../App';

const API = 'http://localhost:5001';
const TURNSTILE_SITE_KEY = '0x4AAAAAACtS3omXtqAvAcR0';

const Login = () => {
    const navigate = useNavigate();
    const { setStatus, setAccessToken, setAuthUser, saveUser } = useAuth();

    const [mode, setMode] = useState('login');

    const [loginId,      setLoginId]      = useState('');
    const [password,     setPassword]     = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [turnstileToken, setTurnstileToken] = useState('');
    const [captchaStatus,  setCaptchaStatus]  = useState('idle');
    const turnstileRef = useRef(null);

    const [forgotStep,  setForgotStep]  = useState('phone');
    const [forgotPhone, setForgotPhone] = useState('');
    const [forgotOtp,   setForgotOtp]   = useState(['', '', '', '', '', '']);
    const [newPw,       setNewPw]       = useState('');
    const [confirmPw,   setConfirmPw]   = useState('');
    const [showNewPw,   setShowNewPw]   = useState(false);
    const [timer,       setTimer]       = useState(0);
    const timerRef      = useRef(null);
    const forgotOtpRefs = useRef([]);

    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const startTimer = () => {
        setTimer(60);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() =>
            setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; }), 1000);
    };

    const resetCaptcha = () => {
        turnstileRef.current?.reset();
        setTurnstileToken('');
        setCaptchaStatus('idle');
    };

    const switchMode = (m) => {
        setMode(m); setError(''); setSuccess('');
        setForgotStep('phone'); setForgotPhone(''); setForgotOtp(['','','','','','']);
        setNewPw(''); setConfirmPw('');
        if (m === 'login') resetCaptcha();
    };

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!loginId.trim()) { setError('Enter your Staff ID or Admin ID.'); return; }
        if (!password)       { setError('Enter your password.'); return; }
        if (!turnstileToken) { setError('Please wait for security check to complete.'); return; }

        setLoading(true); setError('');
        try {
            const res = await axios.post(
                `${API}/api/auth/login`,
                { loginId: loginId.trim(), password, cfToken: turnstileToken },
                { withCredentials: true }
            );
            const { user, token } = res.data;

            // Update shared auth context synchronously BEFORE navigating.
            // This ensures PublicRoute sees status='valid' and doesn't block the render.
            setAccessToken(token);
            setAuthUser(user);
            setStatus('valid');   // ← key fix: PublicRoute reads this immediately
            saveUser(user);

            // Now navigate — route guards will allow through instantly
            if (user.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else if (user.isFirstLogin === true) {
                navigate('/first-login', { replace: true });
            } else {
                navigate('/staff/dashboard', { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
            resetCaptcha();
        } finally { setLoading(false); }
    };

    // ── FORGOT: Step 1 ────────────────────────────────────────────────────────
    const handleForgotSendOtp = async (e) => {
        e?.preventDefault();
        if (forgotPhone.length !== 10) { setError('Enter a valid 10-digit mobile number.'); return; }
        setLoading(true); setError('');
        try {
            await axios.post(`${API}/api/auth/send-otp`, { phone: forgotPhone });
            setForgotStep('otp'); startTimer();
            setTimeout(() => forgotOtpRefs.current[0]?.focus(), 100);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
        } finally { setLoading(false); }
    };

    // ── FORGOT: Step 2 ────────────────────────────────────────────────────────
    const handleForgotVerifyOtp = async (e) => {
        e?.preventDefault();
        const otpStr = forgotOtp.join('');
        if (otpStr.length !== 6) { setError('Enter the complete 6-digit OTP.'); return; }
        setLoading(true); setError('');
        try {
            await axios.post(`${API}/api/auth/verify-otp`, { phone: forgotPhone, otp: otpStr });
            setForgotStep('newpw');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP.');
        } finally { setLoading(false); }
    };

    // ── FORGOT: Step 3 ────────────────────────────────────────────────────────
    const handleForgotReset = async (e) => {
        e?.preventDefault();
        if (newPw.length < 6)    { setError('Password must be at least 6 characters.'); return; }
        if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
        setLoading(true); setError('');
        try {
            await axios.post(`${API}/api/auth/forgot-password`, { phone: forgotPhone, newPassword: newPw });
            setSuccess('Password reset! You can now log in.');
            switchMode('login');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally { setLoading(false); }
    };

    const handleOtpKey = (i, e) => {
        if (e.key === 'Backspace') {
            const a = [...forgotOtp]; a[i] = ''; setForgotOtp(a);
            if (i > 0) forgotOtpRefs.current[i - 1]?.focus(); return;
        }
        if (!/^\d$/.test(e.key)) return;
        const a = [...forgotOtp]; a[i] = e.key; setForgotOtp(a);
        if (i < 5) forgotOtpRefs.current[i + 1]?.focus();
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) { setForgotOtp(pasted.split('')); forgotOtpRefs.current[5]?.focus(); }
    };

    const forgotStepMap   = ['phone', 'otp', 'newpw'];
    const forgotStepIdx   = forgotStepMap.indexOf(forgotStep);
    const forgotStepNames = ['Phone', 'Verify OTP', 'New Password'];
    const pwStrength      = newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : newPw.length < 14 ? 3 : 4;
    const lCls = "text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-1.5";

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120] font-sans p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-700/10 rounded-full blur-3xl"/>
            </div>

            <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        StyleSync <span className="text-indigo-400">OS</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">
                        {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}
                    </p>
                </div>

                <div className="flex gap-2 mb-6 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                    <button onClick={() => switchMode('login')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode==='login'?'bg-indigo-600 text-white':'text-slate-500 hover:text-white'}`}>
                        Login
                    </button>
                    <button onClick={() => switchMode('forgot')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode==='forgot'?'bg-amber-600 text-white':'text-slate-500 hover:text-white'}`}>
                        Forgot Password
                    </button>
                </div>

                {success && (
                    <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <FiCheck size={14}/> {success}
                    </div>
                )}

                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1">
                            <label htmlFor="loginId" className={lCls}>Staff ID / Admin ID</label>
                            <div className="relative">
                                <FiUser className="absolute left-4 top-3.5 text-slate-500" size={14}/>
                                <input id="loginId" type="text" autoComplete="username" required
                                    value={loginId} onChange={e => { setLoginId(e.target.value); setError(''); }}
                                    placeholder="e.g. STAFF04 or ADMIN01"
                                    className="w-full bg-slate-950/50 border border-slate-700 text-white pl-11 pr-4 py-3 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm placeholder:text-slate-600"/>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className={lCls}>Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-3.5 text-slate-500" size={14}/>
                                <input id="password" type={showPassword?'text':'password'} autoComplete="current-password" required
                                    value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950/50 border border-slate-700 text-white pl-11 pr-12 py-3 rounded-xl focus:border-indigo-500 outline-none transition-all text-sm"/>
                                <button type="button" onClick={() => setShowPassword(v=>!v)}
                                    className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors">
                                    {showPassword ? <FiEyeOff size={14}/> : <FiEye size={14}/>}
                                </button>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-600 text-center -mt-1">
                            Forgot your password?{' '}
                            <button type="button" onClick={() => switchMode('forgot')}
                                className="text-indigo-400 hover:text-indigo-300 underline font-bold">
                                Reset via OTP
                            </button>
                        </p>

                        <div className="flex flex-col items-center gap-2 py-1">
                            <Turnstile ref={turnstileRef} siteKey={TURNSTILE_SITE_KEY}
                                onSuccess={(token) => { setTurnstileToken(token); setCaptchaStatus('success'); setError(''); }}
                                onError={() => { setTurnstileToken(''); setCaptchaStatus('error'); setError('Security check failed. Please try again.'); }}
                                onExpire={() => { setTurnstileToken(''); setCaptchaStatus('idle'); turnstileRef.current?.reset(); }}
                                options={{ theme:'dark', appearance:'always', execution:'render' }}
                            />
                            {captchaStatus === 'idle' && (
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                    <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse"/> Running security check...
                                </div>
                            )}
                            {captchaStatus === 'success' && (
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                                    <FiCheck size={12}/> Security check passed
                                </div>
                            )}
                            {captchaStatus === 'error' && (
                                <button type="button" onClick={resetCaptcha} className="flex items-center gap-1.5 text-[11px] text-red-400 underline">
                                    <FiRefreshCw size={11}/> Retry security check
                                </button>
                            )}
                        </div>

                        {error && <ErrorBox msg={error}/>}

                        <button type="submit" disabled={loading || !turnstileToken}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                            {loading ? <Spinner/> : <><FiArrowRight size={16}/> Sign In</>}
                        </button>
                    </form>
                )}

                {mode === 'forgot' && (
                    <>
                        <div className="flex items-center gap-2 mb-6">
                            {forgotStepNames.map((name, i) => {
                                const done = i < forgotStepIdx, active = i === forgotStepIdx;
                                return (
                                    <React.Fragment key={i}>
                                        <div className="flex flex-col items-center gap-1 shrink-0">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                                                ${done?'bg-emerald-500 text-white':active?'bg-amber-600 text-white ring-4 ring-amber-500/30':'bg-slate-800 text-slate-500'}`}>
                                                {done ? <FiCheck size={12}/> : i+1}
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider whitespace-nowrap
                                                ${active?'text-amber-400':done?'text-emerald-400':'text-slate-600'}`}>{name}</span>
                                        </div>
                                        {i < 2 && <div className={`flex-1 h-0.5 mb-4 rounded-full ${done?'bg-emerald-500':'bg-slate-800'}`}/>}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {forgotStep === 'phone' && (
                            <form onSubmit={handleForgotSendOtp} className="space-y-5">
                                <div>
                                    <label htmlFor="forgotPhone" className={lCls}>Registered Mobile Number</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-slate-500 text-sm font-bold">+91</span>
                                        <input id="forgotPhone" type="tel" maxLength="10" required
                                            value={forgotPhone} onChange={e => { setForgotPhone(e.target.value.replace(/\D/g,'')); setError(''); }}
                                            placeholder="9876543210"
                                            className="w-full bg-slate-950/50 border border-slate-700 text-white pl-14 pr-10 py-3 rounded-xl focus:border-amber-500 outline-none transition-all text-sm placeholder:text-slate-600"/>
                                        <FiPhone className="absolute right-4 top-3.5 text-slate-500" size={14}/>
                                    </div>
                                </div>
                                {error && <ErrorBox msg={error}/>}
                                <button type="submit" disabled={loading || forgotPhone.length !== 10}
                                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                    {loading ? <Spinner/> : <><FiArrowRight size={16}/> Send OTP</>}
                                </button>
                            </form>
                        )}

                        {forgotStep === 'otp' && (
                            <form onSubmit={handleForgotVerifyOtp} className="space-y-5">
                                <div>
                                    <label className={lCls}>Enter 6-Digit OTP</label>
                                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                                        {forgotOtp.map((digit, i) => (
                                            <input key={i} ref={el => forgotOtpRefs.current[i]=el}
                                                type="text" inputMode="numeric" maxLength={1}
                                                value={digit} onKeyDown={e => handleOtpKey(i,e)} onChange={() => {}}
                                                className={`w-11 h-12 text-center text-xl font-black rounded-xl border-2 outline-none bg-slate-950/50 text-white transition-all
                                                    ${digit?'border-amber-500 bg-amber-500/10':'border-slate-700 focus:border-amber-400'}`}/>
                                        ))}
                                    </div>
                                    <p className="text-center text-xs mt-3 font-bold">
                                        {timer > 0
                                            ? <span className="text-slate-500">Resend in <span className="text-amber-400">{timer}s</span></span>
                                            : <button type="button" onClick={handleForgotSendOtp} className="text-amber-400 hover:text-amber-300 underline flex items-center gap-1 mx-auto">
                                                <FiRefreshCw size={11}/> Resend OTP
                                              </button>}
                                    </p>
                                </div>
                                {error && <ErrorBox msg={error}/>}
                                <div className="flex gap-3">
                                    <button type="button"
                                        onClick={() => { setForgotStep('phone'); setForgotOtp(['','','','','','']); setError(''); }}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all">
                                        ← Back
                                    </button>
                                    <button type="submit" disabled={loading || forgotOtp.join('').length !== 6}
                                        className="flex-[2] py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
                                        {loading ? <Spinner/> : <><FiShield size={14}/> Verify OTP</>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {forgotStep === 'newpw' && (
                            <form onSubmit={handleForgotReset} className="space-y-5">
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-bold">
                                    <FiCheck size={13}/> Verified: +91 {forgotPhone}
                                </div>
                                <div>
                                    <label htmlFor="newPw" className={lCls}>New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-3.5 text-slate-500" size={14}/>
                                        <input id="newPw" type={showNewPw?'text':'password'} required
                                            value={newPw} onChange={e => { setNewPw(e.target.value); setError(''); }}
                                            placeholder="Min 6 characters"
                                            className="w-full bg-slate-950/50 border border-slate-700 text-white pl-11 pr-12 py-3 rounded-xl focus:border-amber-500 outline-none transition-all text-sm"/>
                                        <button type="button" onClick={() => setShowNewPw(v=>!v)} className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300">
                                            {showNewPw ? <FiEyeOff size={14}/> : <FiEye size={14}/>}
                                        </button>
                                    </div>
                                    {newPw && (
                                        <div className="flex gap-1 mt-2 items-center">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-all
                                                    ${i<=pwStrength?(pwStrength<=1?'bg-red-500':pwStrength<=2?'bg-orange-400':pwStrength<=3?'bg-yellow-400':'bg-emerald-400'):'bg-slate-800'}`}/>
                                            ))}
                                            <span className="text-[10px] text-slate-500 ml-1.5 font-bold">
                                                {newPw.length<6?'Weak':newPw.length<10?'Fair':newPw.length<14?'Good':'Strong'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="confirmPw" className={lCls}>Confirm New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-3.5 text-slate-500" size={14}/>
                                        <input id="confirmPw" type="password" required
                                            value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                                            placeholder="Re-enter password"
                                            className={`w-full bg-slate-950/50 border text-white pl-11 pr-4 py-3 rounded-xl outline-none transition-all text-sm
                                                ${confirmPw && confirmPw!==newPw?'border-red-500':'border-slate-700 focus:border-amber-500'}`}/>
                                    </div>
                                    {confirmPw && confirmPw!==newPw && <p className="text-red-400 text-xs mt-1 font-bold">✗ Passwords do not match</p>}
                                    {confirmPw && confirmPw===newPw && newPw && <p className="text-emerald-400 text-xs mt-1 font-bold">✓ Passwords match</p>}
                                </div>
                                {error && <ErrorBox msg={error}/>}
                                <button type="submit" disabled={loading || newPw.length<6 || newPw!==confirmPw}
                                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                    {loading ? <Spinner/> : <><FiCheck size={16}/> Reset Password</>}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const Spinner  = () => <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>;
const ErrorBox = ({ msg }) => (
    <p className="p-3 bg-red-500/10 text-red-300 text-xs text-center rounded-xl border border-red-500/20">{msg}</p>
);

export default Login;