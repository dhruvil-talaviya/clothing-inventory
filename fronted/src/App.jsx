import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- PAGE IMPORTS ---
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import SetPassword from './pages/SetPassword';

// --- ERROR BOUNDARY (prevents full blank screen on runtime errors) ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('🔴 App Error:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', background: '#0f172a', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                    fontFamily: 'Arial, sans-serif', color: '#fff', padding: '32px', textAlign: 'center'
                }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ color: '#f87171', fontSize: 20, marginBottom: 8 }}>Something went wrong</h2>
                    <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, maxWidth: 480 }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                        style={{
                            background: '#6366f1', color: '#fff', border: 'none',
                            padding: '10px 28px', borderRadius: 10, cursor: 'pointer',
                            fontWeight: 700, fontSize: 14
                        }}
                    >
                        Reload Page
                    </button>
                    <details style={{ marginTop: 20, color: '#475569', fontSize: 11 }}>
                        <summary style={{ cursor: 'pointer' }}>Show error details</summary>
                        <pre style={{ textAlign: 'left', marginTop: 8, maxWidth: 600, overflow: 'auto' }}>
                            {this.state.error?.stack}
                        </pre>
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- PROTECTED ROUTE ---
const ProtectedRoute = ({ children, allowedRole }) => {
    const token      = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
        console.log("⛔ No token found. Redirecting to Login.");
        return <Navigate to="/" replace />;
    }

    let user;
    try {
        user = JSON.parse(userString);
    } catch (e) {
        console.error("⛔ Corrupted user data.");
        localStorage.clear();
        return <Navigate to="/" replace />;
    }

    // Only redirect STAFF on first login — never redirect admin
    if (user.isFirstLogin && user.role === 'staff') {
        console.log("⛔ Staff first login — redirecting to SetPassword.");
        return <Navigate to="/set-password" replace />;
    }

    const userRole     = (user.role || '').toLowerCase();
    const requiredRole = (allowedRole || '').toLowerCase();

    if (requiredRole === 'admin') {
        if (userRole !== 'admin' && userRole !== 'super-admin') {
            console.log("⛔ Access Denied: Not admin.");
            return <Navigate to="/" replace />;
        }
    } else if (userRole !== requiredRole) {
        console.log(`⛔ Access Denied: ${userRole} !== ${requiredRole}`);
        return <Navigate to="/" replace />;
    }

    return children;
};

// --- FIRST LOGIN GUARD ---
const FirstLoginRoute = ({ children }) => {
    const userString = localStorage.getItem('user');
    const token      = localStorage.getItem('token');

    if (!token || !userString) return <Navigate to="/" replace />;

    let user;
    try { user = JSON.parse(userString); }
    catch { localStorage.clear(); return <Navigate to="/" replace />; }

    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (!user.isFirstLogin)   return <Navigate to="/staff/dashboard" replace />;

    return children;
};

// --- MAIN APP ---
function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <Routes>

                    {/* Public */}
                    <Route path="/" element={<Login />} />

                    {/* First-login password setup */}
                    <Route
                        path="/set-password"
                        element={
                            <FirstLoginRoute>
                                <SetPassword />
                            </FirstLoginRoute>
                        }
                    />

                    {/* Admin */}
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute allowedRole="admin">
                                <ErrorBoundary>
                                    <AdminDashboard />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />

                    {/* Staff */}
                    <Route
                        path="/staff/dashboard"
                        element={
                            <ProtectedRoute allowedRole="staff">
                                <ErrorBoundary>
                                    <StaffDashboard />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />

                    {/* Staff settings alias */}
                    <Route
                        path="/staff/settings"
                        element={
                            <ProtectedRoute allowedRole="staff">
                                <ErrorBoundary>
                                    <StaffDashboard />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
            </ErrorBoundary>
        </BrowserRouter>
    );
}

export default App;