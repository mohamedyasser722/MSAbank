import React, { useState } from 'react';
import { Wallet, LogIn, UserPlus, ArrowUpCircle, ArrowDownCircle, LogOut } from 'lucide-react';

// Use environment variable in production, fallback to localhost for local development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // login, register, dashboard
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async (endpoint) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      if (endpoint === 'login') {
        setUser(data.user);
        setView('dashboard');
      } else {
        setSuccess('Registration successful! Please login.');
        setView('login');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTransaction = async (type) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/account/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setUser({ ...user, balance: data.balance });
      setSuccess(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!`);
      setAmount('');
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    setUser(null);
    setView('login');
    setFormData({ username: '', password: '' });
    setError('');
    setSuccess('');
  };

  // --- UI Components ---
  
  if (view === 'dashboard' && user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">My Bank</h1>
            <button onClick={logout} className="text-gray-500 hover:text-red-500">
              <LogOut size={20} />
            </button>
          </div>
          <div className="bg-blue-600 text-white p-6 rounded-lg mb-6 shadow-md">
            <p className="text-sm opacity-80">Current Balance</p>
            <h2 className="text-4xl font-bold">${user.balance}</h2>
            <p className="text-sm mt-2">User: {user.username}</p>
          </div>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}
          <div className="flex gap-2 mb-4">
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleTransaction('deposit')}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition"
            >
              <ArrowUpCircle size={18} /> Deposit
            </button>
            <button 
              onClick={() => handleTransaction('withdraw')}
              className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition"
            >
              <ArrowDownCircle size={18} /> Withdraw
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex justify-center mb-6 text-blue-600">
          <Wallet size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {view === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{success}</div>}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          
          <button
            onClick={() => handleAuth(view)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold transition"
          >
            {view === 'login' ? 'Login' : 'Register'}
          </button>
        </div>
        <div className="mt-6 text-center text-sm text-gray-600">
          {view === 'login' ? (
            <p>
              New here? <button onClick={() => setView('register')} className="text-blue-600 font-semibold">Create account</button>
            </p>
          ) : (
            <p>
              Already have an account? <button onClick={() => setView('login')} className="text-blue-600 font-semibold">Login</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

