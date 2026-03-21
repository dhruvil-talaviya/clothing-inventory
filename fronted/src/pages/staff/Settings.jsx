import React, { useState } from 'react';
import axios from 'axios';
import {
    FiSave, FiLock, FiSmartphone, FiAlertTriangle,
    FiCheck, FiEye, FiEyeOff, FiShield, FiArrowRight
} from 'react-icons/fi';

const API = 'http://localhost:5001';

const iCls = "w-full bg-[#080c14] border border-slate-800 text-white px-4 py-3 rounded-2xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-slate-700";
const lCls = "text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5";
const card = "bg-[#0f172a] border border-slate-800 rounded-3xl p-7 flex flex-col";

const Msg = ({ m }) => !m ? null : (
    <div className={`flex items-center gap-2 p-3 rounded-2xl border text-sm font-bold mb-5
        ${m.ok
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
        {m.ok ? <FiCheck size={13} /> : <FiAlertTriangle size={13} />} {m.text}
    </div>
);

const StrengthBar = ({ val }) => {
    const s = val.length < 4 ? 1 : val.length < 8 ? 2 : val.length < 12 ? 3 : 4;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];
    return (
        <div className="flex gap-1 mt-2 items-center">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= s ? colors[s] : 'bg-slate-800'}`} />
            ))}
            <span className="text-[10px] text-slate-500 ml-1.5 font-bold whitespace-nowrap">{labels[s]}</span>
        </div>
    );
};

export default function StaffSettings() {
    const getUser = () => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } };

    // ── Password state ────────────────────────────────────────────────────────
    const [pw, setPw] = useState({ current: '', new: '', confirm: '' });
    const [show, setShow] = useState({ current: false, new: false, confirm: false });
    const [pwMsg, setPwMsg] = useState(null);
    const [pwLoad, setPwLoad] = useState(false);

    // ── OTP / 2FA state ───────────────────────────────────────────────────────
    const [otpStep, setOtpStep]   = useState('idle'); // idle | sending | verify | done
    const [otp, setOtp]           = useState('');
    const [generatedOtp, setGeneratedOtp] = useState(null);
    const [otpMsg, setOtpMsg]     = useState(null);
    const [otpLoad, setOtpLoad]   = useState(false);

    // ── Change password ───────────────────────────────────────────────────────
    const submitPasswordChange = async () => {
        setPwMsg(null);
        if (!pw.current) return setPwMsg({ text: 'Enter your current password.' });
        if (pw.new.length < 6) return setPwMsg({ text: 'New password must be at least 6 characters.' });
        if (pw.new !== pw.confirm) return setPwMsg({ text: 'Passwords do not match.' });

        setPwLoad(true);
        try {
            const user = getUser();
            const token = localStorage.getItem('token');
            await axios.post(`${API}/api/staff/change-password`, {
                userId: user._id,
                currentPassword: pw.current,
                newPassword: pw.new,
            }, { headers: { Authorization: token } });

            setPwMsg({ ok: true, text: 'Password updated successfully!' });
            setPw({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPwMsg({ text: err.response?.data?.message || 'Failed to update password.' });
        } finally {
            setPwLoad(false);
        }
    };

    // ── OTP / 2FA ─────────────────────────────────────────────────────────────
    const requestOtp = () => {
        setOtpLoad(true);
        setOtpMsg(null);
        setTimeout(() => {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(code);
            setOtpStep('verify');
            setOtpLoad(false);
            // In production: send via SMS. For now, alert for dev.
            alert(`(Dev) Your OTP is: ${code}`);
        }, 1200);
    };

    const verifyOtp = () => {
        setOtpMsg(null);
        if (otp === generatedOtp) {
            setOtpStep('done');
            setOtpMsg({ ok: true, text: '2FA enabled successfully!' });
        } else {
            setOtpMsg({ text: 'Incorrect OTP. Please try again.' });
        }
    };

    const resetOtp = () => {
        setOtpStep('idle');
        setOtp('');
        setGeneratedOtp(null);
        setOtpMsg(null);
    };

    const pwMatch = pw.confirm && pw.confirm === pw.new;
    const pwMismatch = pw.confirm && pw.confirm !== pw.new;

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div>
                <h2 className="text-xl font-black text-white">Account Security</h2>
                <p className="text-slate-500 text-xs mt-1">Manage your password and two-factor authentication.</p>
            </div>

            {/* ── Two equal cards ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

                {/* ══ CARD 1 — CHANGE PASSWORD ══ */}
                <div className={card}>
                    {/* Card header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <FiLock size={16} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-sm">Change Password</h3>
                            <p className="text-slate-600 text-[11px] mt-0.5">Update your login credentials</p>
                        </div>
                    </div>

                    <Msg m={pwMsg} />

                    <div className="space-y-4 flex-1">
                        {/* Current password */}
                        <div>
                            <label className={lCls}>Current Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-3.5 text-slate-600" size={13} />
                                <input
                                    type={show.current ? 'text' : 'password'}
                                    value={pw.current}
                                    onChange={e => { setPw(p => ({ ...p, current: e.target.value })); setPwMsg(null); }}
                                    className={`${iCls} pl-10 pr-10`}
                                    placeholder="Enter current password"
                                />
                                <button type="button" onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                                    className="absolute right-4 top-3.5 text-slate-600 hover:text-slate-400 transition-colors">
                                    {show.current ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                                </button>
                            </div>
                        </div>

                        {/* New password */}
                        <div>
                            <label className={lCls}>New Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-3.5 text-slate-600" size={13} />
                                <input
                                    type={show.new ? 'text' : 'password'}
                                    value={pw.new}
                                    onChange={e => { setPw(p => ({ ...p, new: e.target.value })); setPwMsg(null); }}
                                    className={`${iCls} pl-10 pr-10`}
                                    placeholder="Min 6 characters"
                                />
                                <button type="button" onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                                    className="absolute right-4 top-3.5 text-slate-600 hover:text-slate-400 transition-colors">
                                    {show.new ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                                </button>
                            </div>
                            {pw.new && <StrengthBar val={pw.new} />}
                        </div>

                        {/* Confirm password */}
                        <div>
                            <label className={lCls}>Confirm New Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-3.5 text-slate-600" size={13} />
                                <input
                                    type={show.confirm ? 'text' : 'password'}
                                    value={pw.confirm}
                                    onChange={e => { setPw(p => ({ ...p, confirm: e.target.value })); setPwMsg(null); }}
                                    className={`${iCls} pl-10 pr-10 ${pwMismatch ? 'border-red-500/50' : ''}`}
                                    placeholder="Re-enter new password"
                                />
                                <button type="button" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                                    className="absolute right-4 top-3.5 text-slate-600 hover:text-slate-400 transition-colors">
                                    {show.confirm ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                                </button>
                            </div>
                            {pw.confirm && (
                                <p className={`text-[11px] font-bold mt-1.5 ${pwMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {pwMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Save button — pinned to bottom */}
                    <button
                        onClick={submitPasswordChange}
                        disabled={pwLoad}
                        className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                        {pwLoad
                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <FiSave size={13} />}
                        Update Password
                    </button>
                </div>

                {/* ══ CARD 2 — TWO-FACTOR AUTH ══ */}
                <div className={card}>
                    {/* Card header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <FiShield size={16} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-sm">Two-Factor Auth</h3>
                            <p className="text-slate-600 text-[11px] mt-0.5">Extra layer of account protection</p>
                        </div>
                    </div>

                    <Msg m={otpMsg} />

                    {/* ── IDLE ── */}
                    {otpStep === 'idle' && (
                        <div className="flex flex-col flex-1">
                            <div className="flex-1 space-y-3">
                                <div className="p-4 bg-[#080c14] rounded-2xl border border-slate-800">
                                    <p className="text-xs font-black text-slate-400 mb-1">What is 2FA?</p>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        Two-factor authentication adds a one-time code sent to your phone each time you perform a sensitive action, making your account significantly more secure.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 p-3.5 bg-[#080c14] rounded-2xl border border-slate-800">
                                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                                        <FiSmartphone size={14} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white">SMS Verification</p>
                                        <p className="text-[10px] text-slate-600 mt-0.5">Code sent to your registered mobile</p>
                                    </div>
                                    <div className="ml-auto px-2 py-1 bg-slate-800 rounded-lg">
                                        <span className="text-[10px] font-black text-slate-500">OFF</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={requestOtp}
                                disabled={otpLoad}
                                className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
                                {otpLoad
                                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><FiSmartphone size={13} /> Enable 2FA <FiArrowRight size={12} /></>}
                            </button>
                        </div>
                    )}

                    {/* ── SENDING ── */}
                    {otpStep === 'sending' && (
                        <div className="flex flex-col flex-1 items-center justify-center py-8">
                            <span className="w-8 h-8 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin mb-4" />
                            <p className="text-slate-400 text-sm font-bold">Sending OTP…</p>
                        </div>
                    )}

                    {/* ── VERIFY ── */}
                    {otpStep === 'verify' && (
                        <div className="flex flex-col flex-1">
                            <div className="flex-1 space-y-4">
                                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400 font-bold">
                                    <FiSmartphone size={13} /> OTP sent to your registered device
                                </div>

                                <div>
                                    <label className={lCls}>Enter 6-Digit OTP</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpMsg(null); }}
                                        className={`${iCls} text-center text-2xl tracking-[0.5em] font-black`}
                                        placeholder="——————"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={resetOtp}
                                        className="flex-1 py-3 bg-[#080c14] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-black rounded-2xl transition-all text-sm">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={verifyOtp}
                                        disabled={otp.length !== 6}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all text-sm flex items-center justify-center gap-2">
                                        <FiCheck size={13} /> Verify
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={requestOtp}
                                className="mt-4 text-center text-slate-600 hover:text-slate-400 text-xs font-bold transition-colors">
                                Didn't receive it? Resend OTP
                            </button>
                        </div>
                    )}

                    {/* ── DONE ── */}
                    {otpStep === 'done' && (
                        <div className="flex flex-col flex-1">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                        <FiSmartphone size={14} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white">SMS Verification</p>
                                        <p className="text-[10px] text-emerald-400 mt-0.5">Active & protected</p>
                                    </div>
                                    <div className="ml-auto px-2 py-1 bg-emerald-500/20 border border-emerald-500/20 rounded-lg">
                                        <span className="text-[10px] font-black text-emerald-400">ON</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-[#080c14] rounded-2xl border border-slate-800">
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        2FA is active. Your account now requires an OTP for sensitive actions.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={resetOtp}
                                className="mt-6 w-full py-3 bg-[#080c14] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-black rounded-2xl transition-all text-sm">
                                Disable 2FA
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}