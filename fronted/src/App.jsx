import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- PAGE IMPORTS ---
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';

import AdminEvents from "./pages/Admin/AdminEvents";

// --- PROTECTION LOGIC ---
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');


  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <Router>
      <Routes>
        
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* --- ADMIN ROUTES (Protected) --- */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* NEW EVENTS ROUTE ADDED HERE */}
        <Route 
          path="/admin/events" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminEvents />
            </ProtectedRoute>
          } 
        />

        {/* --- STAFF ROUTES (Protected) --- */}
        <Route 
          path="/staff/dashboard" 
          element={
            <ProtectedRoute allowedRole="staff">
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all for 404s */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}

export default App;