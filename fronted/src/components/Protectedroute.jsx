

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../App';  // adjust path if App.jsx is elsewhere

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { status, authUser } = useAuth();

    // ── Still waiting for /refresh to respond ────────────────────────────────
    // This is the ONLY state where we show a spinner.
    // On a normal page refresh this takes <200ms on localhost.
    if (status === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#080C14]">
                <div className="flex flex-col items-center gap-4">
                    <span className="w-10 h-10 border-2 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
                    <p className="text-slate-600 text-xs font-bold tracking-widest uppercase">
                        Restoring session…
                    </p>
                </div>
            </div>
        );
    }

    // ── No valid session ──────────────────────────────────────────────────────
    if (status === 'invalid') {
        return <Navigate to="/login" replace />;
    }

    // ── Valid session but wrong role ──────────────────────────────────────────
    const role = authUser?.role || localStorage.getItem('role');
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to="/login" replace />;
    }

    // ── All good ──────────────────────────────────────────────────────────────
    return <Outlet />;
};

export default ProtectedRoute;