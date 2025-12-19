import React, { useState } from 'react';
import { Wallet, LogIn, UserPlus, ArrowUpCircle, ArrowDownCircle, LogOut } from 'lucide-react';

// Hardcoded for reliability during debug
const API_URL = 'https://api-bank.mashaheir.com';
console.log('Current API_URL:', API_URL);

export default function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('login'); // login, register, dashboard
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [history, setHistory] = useState([]);

    const fetchHistory = async (username) => {
        try {
            const res = await fetch(`${API_URL}/account/${username}/history`);
            const data = await res.json();
            if (res.ok) setHistory(data);
        } catch (err) {
            console.error('Failed to fetch history');
        }
    };

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
                fetchHistory(data.user.username);
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
            setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} successful!`);
            setAmount('');
            fetchHistory(user.username);
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
        setHistory([]);
    };

    // --- UI Components ---

    if (view === 'dashboard' && user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">CloudBank</h1>
                            <p className="text-gray-500 text-sm">Next-Gen Core Banking</p>
                        </div>
                        <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                            <LogOut size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-transform">
                            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-2">Available Balance</p>
                            <h2 className="text-5xl font-black mb-4">${user.balance.toLocaleString()}</h2>
                            <div className="flex items-center gap-2 text-blue-100 opacity-90">
                                <Wallet size={16} />
                                <span className="text-sm">Account: {user.username}</span>
                            </div>
                        </div>

                        <div className="bg-white border-2 border-gray-100 p-6 rounded-2xl flex flex-col justify-center">
                            <label className="text-gray-600 text-sm font-semibold mb-3">Quick Actions</label>
                            <div className="flex gap-3 mb-4">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount..."
                                    className="flex-1 p-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleTransaction('deposit')}
                                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    <ArrowUpCircle size={20} /> Deposit
                                </button>
                                <button
                                    onClick={() => handleTransaction('withdraw')}
                                    className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    <ArrowDownCircle size={20} /> Withdraw
                                </button>
                            </div>
                            <button
                                onClick={() => handleTransaction('loan')}
                                className="mt-3 w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                            >
                                Request Rapid Loan
                            </button>
                        </div>
                    </div>

                    {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 border border-rose-100 animate-pulse">⚠️ {error}</div>}
                    {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 border border-emerald-100">✅ {success}</div>}

                    <div className="border-t border-gray-100 pt-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <LogIn size={20} className="text-blue-600" /> Secure Audit Trail
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                            {history.length === 0 ? (
                                <p className="text-gray-400 text-center py-4 italic">No transactions recorded yet.</p>
                            ) : (
                                history.map((log) => (
                                    <div key={log.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                                        <div>
                                            <p className="font-bold text-gray-800">{log.action}</p>
                                            <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${log.status === 'SUCCESS' || log.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {log.status}
                                            </span>
                                            {log.details && <p className="text-xs text-gray-500 mt-1">{log.details}</p>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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

