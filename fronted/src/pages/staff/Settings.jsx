import React, { useState } from 'react';
import {
    FiSave, FiLock, FiSmartphone, FiAlertTriangle,
    FiCheck, FiEye, FiEyeOff, FiShield, FiArrowRight, FiZap
} from 'react-icons/fi';

const API = 'https://clothing-inventory-bbhg.onrender.com';

const iCls = "w-full bg-[#060a12] border border-white/[0.06] text-white px-4 py-3 rounded-xl outline-none focus:border-violet-500/60 focus:bg-[#0a0f1e] transition-all text-sm placeholder:text-white/20 font-light tracking-wide";
const lCls = "text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] block mb-2";

const Msg = ({ m }) => !m ? null : (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold mb-5 tracking-wide
        ${m.ok
            ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/[0.08] border-red-500/20 text-red-400'}`}>
        {m.ok ? <FiCheck size={12} /> : <FiAlertTriangle size={12} />}
        {m.text}
    </div>
);

const StrengthBar = ({ val }) => {
    const s = val.length < 4 ? 1 : val.length < 8 ? 2 : val.length < 12 ? 3 : 4;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-red-500', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-400'];
    return (
        <div className="flex gap-1 mt-2.5 items-center">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${i <= s ? colors[s] : 'bg-white/[0.05]'}`} />
            ))}
            <span className={`text-[9px] ml-2 font-bold tracking-widest uppercase ${['', 'text-red-400', 'text-amber-400', 'text-sky-400', 'text-emerald-400'][s]}`}>
                {labels[s]}
            </span>
        </div>
    );
};

const EyeBtn = ({ show, toggle }) => (
    <button type="button" onClick={toggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
        {show ? <FiEyeOff size={13} /> : <FiEye size={13} />}
    </button>
);

export default function StaffSettings() {
    const getUser = () => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } };

    const [pw, setPw] = useState({ current: '', new: '', confirm: '' });
    const [show, setShow] = useState({ current: false, new: false, confirm: false });
    const [pwMsg, setPwMsg] = useState(null);
    const [pwLoad, setPwLoad] = useState(false);

    const [otpStep, setOtpStep] = useState('idle');
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState(null);
    const [otpMsg, setOtpMsg] = useState(null);
    const [otpLoad, setOtpLoad] = useState(false);

    const submitPasswordChange = async () => {
        setPwMsg(null);
        if (!pw.current) return setPwMsg({ text: 'Enter your current password.' });
        if (pw.new.length < 6) return setPwMsg({ text: 'New password must be at least 6 characters.' });
        if (pw.new !== pw.confirm) return setPwMsg({ text: 'Passwords do not match.' });
        setPwLoad(true);
        try {
            const user = getUser();
            const token = localStorage.getItem('token');
            await fetch(`${API}/api/staff/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ userId: user._id, currentPassword: pw.current, newPassword: pw.new }),
            });
            setPwMsg({ ok: true, text: 'Password updated successfully!' });
            setPw({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPwMsg({ text: 'Failed to update password.' });
        } finally {
            setPwLoad(false);
        }
    };

    const requestOtp = () => {
        setOtpLoad(true);
        setOtpMsg(null);
        setTimeout(() => {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(code);
            setOtpStep('verify');
            setOtpLoad(false);
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

    const resetOtp = () => { setOtpStep('idle'); setOtp(''); setGeneratedOtp(null); setOtpMsg(null); };

    const pwMatch = pw.confirm && pw.confirm === pw.new;
    const pwMismatch = pw.confirm && pw.confirm !== pw.new;

    return (
        <div className="min-h-screen bg-[#040710] p-8" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/[0.04] blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.04] blur-[100px]" />
            </div>

            <div className="relative max-w-5xl mx-auto space-y-5">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-indigo-600" />
                        <h2 className="text-lg font-bold text-white tracking-tight">Account Security</h2>
                    </div>
                    <p className="text-white/30 text-xs ml-4 tracking-wide">Manage your password and two-factor authentication</p>
                </div>

                {/* Asymmetric grid: big + small */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">

                    {/* ══ BIG CARD — CHANGE PASSWORD ══ */}
                    <div className="relative bg-[#080d1a] border border-white/[0.06] rounded-2xl overflow-hidden">
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

                        <div className="p-8">
                            {/* Card header */}
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                            <FiLock size={14} className="text-violet-400" />
                                        </div>
                                        <h3 className="font-bold text-white text-base tracking-tight">Change Password</h3>
                                    </div>
                                    <p className="text-white/25 text-xs tracking-wide ml-10">Update your login credentials securely</p>
                                </div>
                                <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-lg">
                                    Security
                                </div>
                            </div>

                            <Msg m={pwMsg} />

                            {/* Fields in 2-col layout: current on top full width, new+confirm side by side */}
                            <div className="space-y-5">
                                <div>
                                    <label className={lCls}>Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={show.current ? 'text' : 'password'}
                                            value={pw.current}
                                            onChange={e => { setPw(p => ({ ...p, current: e.target.value })); setPwMsg(null); }}
                                            className={`${iCls} pr-11`}
                                            placeholder="Enter your current password"
                                        />
                                        <EyeBtn show={show.current} toggle={() => setShow(s => ({ ...s, current: !s.current }))} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lCls}>New Password</label>
                                        <div className="relative">
                                            <input
                                                type={show.new ? 'text' : 'password'}
                                                value={pw.new}
                                                onChange={e => { setPw(p => ({ ...p, new: e.target.value })); setPwMsg(null); }}
                                                className={`${iCls} pr-11`}
                                                placeholder="Min 6 characters"
                                            />
                                            <EyeBtn show={show.new} toggle={() => setShow(s => ({ ...s, new: !s.new }))} />
                                        </div>
                                        {pw.new && <StrengthBar val={pw.new} />}
                                    </div>

                                    <div>
                                        <label className={lCls}>Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={show.confirm ? 'text' : 'password'}
                                                value={pw.confirm}
                                                onChange={e => { setPw(p => ({ ...p, confirm: e.target.value })); setPwMsg(null); }}
                                                className={`${iCls} pr-11 ${pwMismatch ? 'border-red-500/30' : ''}`}
                                                placeholder="Re-enter password"
                                            />
                                            <EyeBtn show={show.confirm} toggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))} />
                                        </div>
                                        {pw.confirm && (
                                            <p className={`text-[10px] font-semibold mt-2.5 tracking-wide ${pwMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {pwMatch ? '✓ Passwords match' : '✗ Does not match'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tips row */}
                            <div className="flex gap-2 mt-6">
                                {['8+ characters', 'Uppercase & lowercase', 'Number or symbol'].map(tip => (
                                    <div key={tip} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                                        <div className="w-1 h-1 rounded-full bg-violet-500/60" />
                                        <span className="text-[9px] text-white/25 tracking-wide font-medium">{tip}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 bg-white/[0.015] border-t border-white/[0.05] flex items-center justify-between">
                            <p className="text-[10px] text-white/20 tracking-wide">Changes apply immediately</p>
                            <button
                                onClick={submitPasswordChange}
                                disabled={pwLoad}
                                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-xs tracking-wide">
                                {pwLoad
                                    ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <FiSave size={12} />}
                                Update Password
                            </button>
                        </div>
                    </div>

                    {/* ══ SMALL CARD — TWO-FACTOR AUTH ══ */}
                    <div className="relative bg-[#080d1a] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

                        <div className="p-6 flex flex-col flex-1">
                            {/* Card header */}
                            <div className="flex items-center gap-2.5 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <FiShield size={14} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm tracking-tight">Two-Factor Auth</h3>
                                    <p className="text-white/25 text-[10px] mt-0.5 tracking-wide">SMS verification</p>
                                </div>
                            </div>

                            <Msg m={otpMsg} />

                            {/* IDLE */}
                            {otpStep === 'idle' && (
                                <div className="flex flex-col flex-1">
                                    {/* Status pill */}
                                    <div className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <FiSmartphone size={13} className="text-white/30" />
                                            <span className="text-xs text-white/50 font-medium">SMS Verification</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                            <span className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Off</span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-white/25 leading-relaxed tracking-wide mb-6 flex-1">
                                        Add a one-time code sent to your phone for sensitive actions. Significantly hardens your account against unauthorized access.
                                    </p>

                                    <button
                                        onClick={requestOtp}
                                        disabled={otpLoad}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-xs tracking-wide flex items-center justify-center gap-2">
                                        {otpLoad
                                            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            : <><FiZap size={12} /> Enable 2FA <FiArrowRight size={11} /></>}
                                    </button>
                                </div>
                            )}

                            {/* VERIFY */}
                            {otpStep === 'verify' && (
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2 p-3 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl mb-5 text-[10px] text-emerald-400 font-semibold tracking-wide">
                                        <FiSmartphone size={11} /> Code sent to your device
                                    </div>

                                    <label className={lCls}>6-Digit Code</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpMsg(null); }}
                                        className={`${iCls} text-center text-xl tracking-[0.6em] font-bold mb-4`}
                                        placeholder="······"
                                    />

                                    <div className="flex gap-2 mb-3">
                                        <button onClick={resetOtp}
                                            className="flex-1 py-2.5 bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70 font-bold rounded-xl transition-all text-xs">
                                            Cancel
                                        </button>
                                        <button onClick={verifyOtp} disabled={otp.length !== 6}
                                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5">
                                            <FiCheck size={12} /> Verify
                                        </button>
                                    </div>

                                    <button onClick={requestOtp}
                                        className="text-center text-white/25 hover:text-white/50 text-[10px] font-semibold transition-colors tracking-wide">
                                        Resend code
                                    </button>
                                </div>
                            )}

                            {/* DONE */}
                            {otpStep === 'done' && (
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between p-3.5 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <FiSmartphone size={13} className="text-emerald-400" />
                                            <span className="text-xs text-white/70 font-medium">SMS Verification</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Active</span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-white/25 leading-relaxed tracking-wide mb-6 flex-1">
                                        Your account now requires a one-time code for sensitive actions. 2FA is active and protecting your account.
                                    </p>

                                    <button onClick={resetOtp}
                                        className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/40 hover:text-white/70 font-bold rounded-xl transition-all text-xs tracking-wide">
                                        Disable 2FA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}