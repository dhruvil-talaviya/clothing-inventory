import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- PAGE IMPORTS ---
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import SetPassword from './pages/SetPassword'; // ← ADDED

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
// Prevents already-set-up staff from accessing /set-password again
const FirstLoginRoute = ({ children }) => {
    const userString = localStorage.getItem('user');
    const token      = localStorage.getItem('token');

    if (!token || !userString) return <Navigate to="/" replace />;

    let user;
    try { user = JSON.parse(userString); } 
    catch { localStorage.clear(); return <Navigate to="/" replace />; }

    // Admins never need set-password — send straight to dashboard
    if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }

    // Staff who already completed setup — send to dashboard
    if (!user.isFirstLogin) {
        return <Navigate to="/staff/dashboard" replace />;
    }

    return children;
};

// --- MAIN APP ---
function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public */}
                <Route path="/" element={<Login />} />

                {/* First-login password setup — only accessible when isFirstLogin = true */}
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
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Staff */}
                <Route
                    path="/staff/dashboard"
                    element={
                        <ProtectedRoute allowedRole="staff">
                            <StaffDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Staff settings alias → same dashboard */}
                <Route
                    path="/staff/settings"
                    element={
                        <ProtectedRoute allowedRole="staff">
                            <StaffDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;