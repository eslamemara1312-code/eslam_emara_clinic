import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import { Sun, Moon } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Login({ isDarkMode, toggleDarkMode }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const { data } = await login(username, password);
            // Save token based on rememberMe
            if (rememberMe) {
                localStorage.setItem('token', data.access_token);
            } else {
                sessionStorage.setItem('token', data.access_token);
            }
            window.location.href = '/'; // Force reload to update app state
        } catch (err) {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-slate-900' : 'bg-slate-50'}`}>
            <div className={`w-full max-w-md p-8 rounded-[2rem] shadow-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-800/50 backdrop-blur-xl border-white/10' : 'bg-white border-slate-100'} text-center`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="w-10" /> {/* Spacer */}
                    <img src={logo} alt="Smart Clinic Logo" className="h-24 w-auto object-contain" />
                    <button
                        onClick={toggleDarkMode}
                        className={`p-3 rounded-2xl transition-colors ${isDarkMode ? 'bg-white/5 text-yellow-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <h1 className={`text-3xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Smart Clinic</h1>
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-8 font-medium`}>نظام إدارة العيادات الذكي</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-bold mb-6 animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="اسم المستخدم"
                            className={`w-full p-4 rounded-2xl border outline-none transition-all text-right ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary'}`}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="relative group">
                        <input
                            type="password"
                            placeholder="كلمة المرور"
                            className={`w-full p-4 rounded-2xl border outline-none transition-all text-right ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-white focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary'}`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 px-1">
                        <label htmlFor="rememberMe" className={`text-sm cursor-pointer select-none font-medium ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                            تذكرني على هذا الجهاز
                        </label>
                        <input
                            id="rememberMe"
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary cursor-pointer transition-transform active:scale-90"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:bg-sky-600 shadow-xl shadow-primary/25 transition-all active:scale-[0.98] transform"
                    >
                        تسجيل الدخول
                    </button>

                    <div className="text-center mt-6">
                        <Link 
                            to="/register" 
                            className={`inline-block w-full py-3 rounded-2xl border-2 font-bold transition-all ${
                                isDarkMode 
                                ? 'border-primary/50 text-primary hover:bg-primary/10' 
                                : 'border-primary text-primary hover:bg-primary/5'
                            }`}
                        >
                            تسجيل عيادة جديدة
                        </Link>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100/10">
                    <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        © 2026 جميع الحقوق محفوظة Smart Clinic
                    </p>
                </div>
            </div>
        </div>
    );
}
