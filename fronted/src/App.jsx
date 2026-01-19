import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// IMPORTS - DOUBLE CHECK THESE PATHS
// Ensure these files actually exist in your src/pages folder!
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StaffDashboard from "./pages/StaffDashboard";
import SetPassword from './pages/SetPassword'; 

// Protection Logic with Debugging
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  console.log("Checking Protection:", { token, role, allowedRole }); // 🔍 DEBUG LOG

  if (!token) {
    console.log("No token found. Redirecting to Login...");
    return <Navigate to="/" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    console.log(`Role mismatch! Needed: ${allowedRole}, Found: ${role}. Redirecting...`);
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Admin Route (Protected) */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Staff Route (Protected) */}
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