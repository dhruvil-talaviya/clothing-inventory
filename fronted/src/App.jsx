import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// ✅ GLOBAL FIX
axios.defaults.withCredentials = true;

import Login          from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import FirstLogin     from './pages/FirstLogin';

const API = 'http://localhost:5001';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const getUser = () => { try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; } };

export const saveUser = (user) => {
    localStorage.setItem('role', user.role);
    localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
    localStorage.removeItem('role');
    localStorage.removeItem('user');
};

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('🔴 App Error:', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight:'100vh', background:'#0f172a', display:'flex',
                    alignItems:'center', justifyContent:'center', flexDirection:'column',
                    fontFamily:'Arial,sans-serif', color:'#fff', padding:'32px', textAlign:'center'
                }}>
                    <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
                    <h2 style={{ color:'#f87171', fontSize:20, marginBottom:8 }}>Something went wrong</h2>
                    <p style={{ color:'#94a3b8', fontSize:13, marginBottom:24, maxWidth:480 }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError:false, error:null }); window.location.reload(); }}
                        style={{ background:'#6366f1', color:'#fff', border:'none', padding:'10px 28px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14 }}>
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const AuthLoader = () => (
    <div style={{ minHeight:'100vh', background:'#0B1120', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ width:32, height:32, border:'3px solid #3730a3', borderTop:'3px solid #818cf8', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
);

// ─── ROUTE GUARDS ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRole }) => {
    const { status, authUser } = useAuth();
    if (status === 'checking') return <AuthLoader />;
    if (status === 'invalid')  return <Navigate to="/" replace />;
    const userRole     = (authUser?.role || '').toLowerCase();
    const requiredRole = (allowedRole   || '').toLowerCase();
    if (requiredRole === 'admin') {
        if (userRole !== 'admin' && userRole !== 'super-admin')
            return <Navigate to="/" replace />;
    } else if (userRole !== requiredRole) {
        return <Navigate to="/" replace />;
    }
    return children;
};

const FirstLoginRoute = ({ children }) => {
    const { status, authUser } = useAuth();
    if (status === 'checking') return <AuthLoader />;
    if (status === 'invalid')  return <Navigate to="/" replace />;
    if (authUser?.role === 'admin')      return <Navigate to="/admin/dashboard" replace />;
    if (authUser?.isFirstLogin !== true) return <Navigate to="/staff/dashboard" replace />;
    return children;
};

const PublicRoute = ({ children }) => {
    const { status, authUser } = useAuth();
    if (status === 'checking') return <AuthLoader />;
    if (status === 'invalid')  return children;
    if (authUser?.role === 'admin')      return <Navigate to="/admin/dashboard" replace />;
    if (authUser?.isFirstLogin === true) return <Navigate to="/first-login" replace />;
    return <Navigate to="/staff/dashboard" replace />;
};

// ─── APP ROUTES ───────────────────────────────────────────────────────────────
function AppRoutes() {
    const [authUser,     setAuthUser]     = useState(() => getUser());
    const [status,       setStatus]       = useState(() => getUser() ? 'valid' : 'invalid');
    const [accessToken,  setAccessToken]  = useState(null);

    const refreshingRef = useRef(false);
    const intervalRef   = useRef(null);

    const doRefresh = useCallback(async () => {

        // ✅ DO NOT RUN ON LOGIN PAGE
        if (window.location.pathname === "/") {
            return null;
        }

        // ✅ Prevent multiple calls
        if (refreshingRef.current) {
            console.log("⏳ Refresh already running...");
            return null;
        }

        refreshingRef.current = true;

        try {
            console.log("🍪 Sending refresh request...");

            const res = await axios.post(
                `${API}/api/auth/refresh`,
                {},
                { withCredentials: true }
            );

            const savedUser = getUser();
            const user = { ...savedUser, role: res.data.role };

            setAccessToken(res.data.token);
            setAuthUser(user);
            setStatus('valid');

            if (savedUser) saveUser(user);

            return res.data.token;

        } catch (err) {
            console.log("❌ Refresh failed:", err?.response?.status);

            clearAuth();
            setAccessToken(null);
            setAuthUser(null);
            setStatus('invalid');

            // ✅ FIX: avoid infinite reload loop
            if (window.location.pathname !== "/") {
                window.location.href = "/";
            }

            return null;

        } finally {
            refreshingRef.current = false;
        }

    }, []);

    useEffect(() => {
        clearInterval(intervalRef.current);

        doRefresh().then((token) => {
            if (!token) return;

            intervalRef.current = setInterval(doRefresh, 14 * 60 * 1000);
        });

        return () => clearInterval(intervalRef.current);
    }, []);

    return (
        <AuthContext.Provider value={{
            status,      setStatus,
            authUser,    setAuthUser,
            accessToken, setAccessToken,
            doRefresh,
            saveUser,
        }}>
            <Routes>
                <Route path="/"
                    element={<PublicRoute><Login /></PublicRoute>}
                />
                <Route path="/first-login"
                    element={<FirstLoginRoute><ErrorBoundary><FirstLogin /></ErrorBoundary></FirstLoginRoute>}
                />
                <Route path="/set-password"   element={<Navigate to="/first-login" replace />} />
                <Route path="/staff/settings" element={<Navigate to="/first-login" replace />} />
                <Route path="/admin/dashboard"
                    element={<ProtectedRoute allowedRole="admin"><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>}
                />
                <Route path="/staff/dashboard"
                    element={<ProtectedRoute allowedRole="staff"><ErrorBoundary><StaffDashboard /></ErrorBoundary></ProtectedRoute>}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthContext.Provider>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <AppRoutes />
            </ErrorBoundary>
        </BrowserRouter>
    );
}

export default App;