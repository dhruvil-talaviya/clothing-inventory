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
    
  
    const [captchaChecked, setCaptchaChecked] = useState(false);
    const [captchaLoading, setCaptchaLoading] = useState(false);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError('');
    };

    
    const handleCaptchaClick = () => {
        if (captchaChecked) return;
        setCaptchaLoading(true);
        setTimeout(() => {
            setCaptchaLoading(false);
            setCaptchaChecked(true);
        }, 1000); 
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!captchaChecked) {
            setError("⚠️ Please verify you are human.");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5001/api/auth/login', credentials);
            
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.user.role);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            if (res.data.user.isFirstLogin) {
                navigate('/set-password');
            } else if (res.data.user.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/staff/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid Credentials");
            setLoading(false);
            setCaptchaChecked(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120] font-sans relative overflow-hidden">
            
            
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

          
            <div className="relative z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl animate-fade-in">
                
              
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30 mb-4">
                        <FiShield className="text-white text-2xl" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">StyleSync <span className="text-indigo-400">OS</span></h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Secure Inventory Access Portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    
                   
                    <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Login ID / Email</label>
                        <div className="relative">
                            <FiUser className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition text-lg" />
                            <input 
                                type="text" 
                                name="loginId" 
                                value={credentials.loginId}
                                onChange={handleChange}
                                placeholder="ADMIN01 or email@domain.com" 
                                className="w-full bg-[#1e293b]/50 border border-slate-700 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-slate-600 font-medium"
                                required 
                            />
                        </div>
                    </div>

                   
                    <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                            <FiLock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition text-lg" />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" 
                                value={credentials.password}
                                onChange={handleChange}
                                placeholder="••••••••" 
                                className="w-full bg-[#1e293b]/50 border border-slate-700 text-white pl-12 pr-12 py-3.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder-slate-600 font-medium"
                                required 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition"
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>

                   
                    <div 
                        onClick={handleCaptchaClick}
                        className={`flex items-center gap-4 p-3 bg-[#1e293b]/80 border ${captchaChecked ? 'border-emerald-500/50' : 'border-slate-700'} rounded-xl cursor-pointer hover:bg-[#1e293b] transition group`}
                    >
                        <div className={`w-7 h-7 rounded bg-white flex items-center justify-center border-2 transition-all ${captchaChecked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400 group-hover:border-slate-300'}`}>
                            {captchaLoading && <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>}
                            {captchaChecked && <FiCheck className="text-white" size={20} />}
                        </div>
                        <span className="text-slate-300 text-sm font-medium select-none">I am not a robot</span>
                        <div className="ml-auto flex flex-col items-center">
                            <FiShield className="text-slate-600 text-xs mb-0.5" />
                            <span className="text-[9px] text-slate-600 font-bold">reCAPTCHA</span>
                        </div>
                    </div>

              
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    )}

                 
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Verifying Access...' : <>Login <FiArrowRight/></>}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-white/5 pt-6">
                    <p className="text-slate-500 text-xs">Protected by StyleSync Enterprise Security.</p>
                    <p className="text-slate-600 text-[10px] mt-1 font-mono">System v2.4.0 • Authorized Personnel Only</p>
                </div>
            </div>
        </div>
    );
};

export default Login;