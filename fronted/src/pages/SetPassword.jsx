import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiCheckCircle } from 'react-icons/fi';

const SetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const user = JSON.parse(localStorage.getItem('user'));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(password !== confirm) return alert("Passwords do not match");
        
        try {
            await axios.post('http://localhost:5001/api/auth/force-change-password', {
                id: user.id,
                newPassword: password
            });
            alert("Password Set! Please login with new credentials.");
            localStorage.clear();
            navigate('/');
        } catch (err) { alert("Error setting password"); }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-4"><FiLock/></div>
                    <h2 className="text-2xl font-bold text-gray-800">Setup Your Password</h2>
                    <p className="text-gray-500 text-sm mt-2">Welcome, {user?.name}. As a new staff member, please set a secure password to continue.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="password" required placeholder="New Password" className="w-full p-3 border rounded-xl" value={password} onChange={e=>setPassword(e.target.value)} />
                    <input type="password" required placeholder="Confirm Password" className="w-full p-3 border rounded-xl" value={confirm} onChange={e=>setConfirm(e.target.value)} />
                    <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex justify-center items-center gap-2"><FiCheckCircle/> Set Password & Login</button>
                </form>
            </div>
        </div>
    );
};

export default SetPassword;