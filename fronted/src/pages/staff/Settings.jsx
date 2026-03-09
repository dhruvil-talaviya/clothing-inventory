import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSave, FiLock, FiSmartphone, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

// --- REMOVED MISSING CONFIG IMPORT ---

const StaffSettings = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

    // Password State
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // OTP State
    const [otpStep, setOtpStep] = useState(1); // 1 = Request, 2 = Verify
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState(null); // In real app, this stays on server

    // --- HANDLE PASSWORD CHANGE ---
    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const submitPasswordChange = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (passwords.newPassword !== passwords.confirmPassword) {
            setMessage({ type: 'error', text: "New passwords do not match." });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // FIX: Hardcoded URL
            await axios.post('http://localhost:5001/api/staff/change-password', {
                userId: user._id,
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            }, {
                headers: { Authorization: token }
            });

            setMessage({ type: 'success', text: "Password updated successfully!" });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || "Failed to update password." });
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLE 2FA / OTP (Simulation) ---
    const requestOtp = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            console.log("SIMULATED OTP:", code); // Check Console for code
            setGeneratedOtp(code);
            setOtpStep(2);
            setLoading(false);
            alert(`(Simulation) Your OTP is: ${code}`);
        }, 1000);
    };

    const verifyOtp = () => {
        if (otp === generatedOtp) {
            setMessage({ type: 'success', text: "2FA Verified Successfully!" });
            setOtpStep(1);
            setOtp('');
            setGeneratedOtp(null);
        } else {
            setMessage({ type: 'error', text: "Invalid OTP. Please try again." });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in pb-24">
            
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Account Security</h1>
                <p className="text-slate-400">Manage your password and security preferences.</p>
            </div>

            {/* Message Alert */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {message.type === 'success' ? <FiCheckCircle size={20}/> : <FiAlertTriangle size={20}/>}
                    <p>{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. CHANGE PASSWORD CARD */}
                <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <FiLock size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Change Password</h3>
                    </div>

                    <form onSubmit={submitPasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Current Password</label>
                            <input 
                                type="password" 
                                name="currentPassword"
                                value={passwords.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
                                placeholder="Enter current password"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">New Password</label>
                            <input 
                                type="password" 
                                name="newPassword"
                                value={passwords.newPassword}
                                onChange={handlePasswordChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
                                placeholder="Min 8 characters"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-1">Confirm New Password</label>
                            <input 
                                type="password" 
                                name="confirmPassword"
                                value={passwords.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:outline-none"
                                placeholder="Re-enter new password"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? 'Updating...' : <><FiSave /> Update Password</>}
                        </button>
                    </form>
                </div>

                {/* 2. TWO-FACTOR AUTH CARD */}
                <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl h-fit">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <FiSmartphone size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Two-Factor Auth</h3>
                    </div>

                    <p className="text-slate-400 text-sm mb-6">
                        Add an extra layer of security to your account by enabling OTP verification for sensitive actions.
                    </p>

                    {otpStep === 1 ? (
                        <button 
                            onClick={requestOtp}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition-all"
                        >
                            Enable 2FA
                        </button>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 text-blue-300 text-sm">
                                We sent a code to your registered device. (Check console/alert for simulation)
                            </div>
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-center text-2xl tracking-[0.5em] text-white focus:border-emerald-500 focus:outline-none font-mono"
                                placeholder="000000"
                                maxLength={6}
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setOtpStep(1)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={verifyOtp}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold transition-all"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default StaffSettings;