import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiCheck, FiShield, FiArrowRight } from 'react-icons/fi';

const Login = () => {
    const navigate = useNavigate();
    
    const [credentials, setCredentials] = useState({ loginId: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaStatus, setCaptchaStatus] = useState('unchecked'); 

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError('');
    };

    const handleCaptchaClick = () => {
        if (captchaStatus !== 'unchecked') return;
        setCaptchaStatus('loading');
        setTimeout(() => setCaptchaStatus('checked'), 1000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (captchaStatus !== 'checked') {
            setError("⚠️ Please click the checkbox to verify.");
            return;
        }

        setLoading(true);
        console.log("🔹 Sending Login Request...", credentials); // DEBUG LOG

        try {
            const res = await axios.post('http://localhost:5001/api/auth/login', credentials);
            console.log("✅ Server Response:", res.data); // DEBUG LOG

            const { user, token } = res.data;

            // 1. Save Data
            localStorage.setItem('token', token);
            localStorage.setItem('role', user.role);
            localStorage.setItem('user', JSON.stringify(user));

            // 2. FORCE REDIRECT (This fixes the "stuck" page issue)
            if (user.role === 'admin') {
                console.log("➡ Redirecting to Admin Dashboard...");
                window.location.href = '/admin/dashboard'; 
            } else {
                console.log("➡ Redirecting to Staff Dashboard...");
                if (user.isFirstLogin) {
                    window.location.href = '/staff/settings';
                } else {
                    window.location.href = '/staff/dashboard';
                }
            }

        } catch (err) {
            console.error("❌ Login Error:", err);
            const msg = err.response?.data?.message || "Connection Failed. Check Server.";
            setError(msg);
            setCaptchaStatus('unchecked');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120] font-sans p-4 relative overflow-hidden">
            <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl">
                
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-white">StyleSync <span className="text-indigo-400">OS</span></h1>
                    <p className="text-slate-400 text-sm mt-2">Secure Login</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Login ID</label>
                        <div className="relative group">
                            <FiUser className="absolute left-4 top-3.5 text-slate-500" />
                            <input 
                                type="text" name="loginId" value={credentials.loginId} onChange={handleChange} required
                                placeholder="Staff ID (e.g. Staff04)" 
                                className="w-full bg-slate-950/50 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Password</label>
                        <div className="relative group">
                            <FiLock className="absolute left-4 top-3.5 text-slate-500" />
                            <input 
                                type={showPassword ? "text" : "password"} name="password" value={credentials.password} onChange={handleChange} required
                                placeholder="••••••••" 
                                className="w-full bg-slate-950/50 border border-slate-700 text-white pl-12 pr-12 py-3 rounded-xl focus:border-indigo-500 outline-none"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500">
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </div>

                    <div onClick={handleCaptchaClick} className={`flex items-center gap-3 p-3 bg-slate-950/30 border ${captchaStatus === 'checked' ? 'border-emerald-500/50' : 'border-slate-700'} rounded-xl cursor-pointer select-none`}>
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${captchaStatus === 'checked' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 bg-slate-800'}`}>
                            {captchaStatus === 'checked' && <FiCheck className="text-white text-sm" />}
                        </div>
                        <span className={`text-sm font-medium ${captchaStatus === 'checked' ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {captchaStatus === 'loading' ? 'Verifying...' : captchaStatus === 'checked' ? 'I am not a robot (Verified)' : 'I am not a robot'}
                        </span>
                    </div>

                    {error && <div className="p-3 bg-red-500/10 text-red-200 text-xs font-medium text-center rounded-lg">{error}</div>}

                    <button type="submit" disabled={loading || captchaStatus !== 'checked'} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-500 transition-all disabled:opacity-50">
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;