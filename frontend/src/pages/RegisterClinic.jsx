import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerClinic } from '../api';
import logo from '../assets/logo.png';
import { Building2, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const RegisterClinic = ({ isDarkMode }) => {
    const [formData, setFormData] = useState({
        clinic_name: '',
        admin_username: '',
        admin_password: '',
        confirm_password: '',
        logo: null
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        if (e.target.name === 'logo') {
            setFormData({ ...formData, logo: e.target.files[0] });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (formData.admin_password !== formData.confirm_password) {
            setError("كلمات المرور غير متطابقة");
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('clinic_name', formData.clinic_name);
            data.append('admin_username', formData.admin_username);
            data.append('admin_password', formData.admin_password);
            if (formData.logo) {
                data.append('logo', formData.logo);
            }

            await registerClinic(data);
            navigate('/', { state: { message: 'تم تسجيل العيادة بنجاح! الرجاء تسجيل الدخول.' } });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "فشل تسجيل العيادة. الرجاء المحاولة مرة أخرى.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 dir-rtl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="text-center mb-8">
                    <img src={logo} alt="Logo" className="h-16 w-auto mx-auto mb-4" />
                    <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>تسجيل عيادة جديدة</h1>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>أنشئ حساباً لعيادتك وابدأ في إدارة مرضاك</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>اسم العيادة</label>
                        <div className="relative">
                            <Building2 className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                name="clinic_name"
                                required
                                value={formData.clinic_name}
                                onChange={handleChange}
                                className={`w-full pr-10 pl-4 py-3 rounded-xl outline-none focus:ring-2 transition-all ${isDarkMode
                                    ? 'bg-slate-900/50 border-white/10 text-white focus:ring-primary/50'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-primary/20 focus:border-primary'
                                    } border`}
                                placeholder="مثال: عيادة الشفاء"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>شعار العيادة (اختياري)</label>
                        <div className="relative">
                            <input
                                type="file"
                                name="logo"
                                accept="image/*"
                                onChange={handleChange}
                                className={`w-full p-2 rounded-xl outline-none focus:ring-2 transition-all ${isDarkMode
                                    ? 'bg-slate-900/50 border-white/10 text-white focus:ring-primary/50'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-primary/20 focus:border-primary'
                                    } border file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20`}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>اسم المستخدم (Admin)</label>
                        <div className="relative">
                            <User className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                name="admin_username"
                                required
                                value={formData.admin_username}
                                onChange={handleChange}
                                className={`w-full pr-10 pl-4 py-3 rounded-xl outline-none focus:ring-2 transition-all ${isDarkMode
                                    ? 'bg-slate-900/50 border-white/10 text-white focus:ring-primary/50'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-primary/20 focus:border-primary'
                                    } border`}
                                placeholder="اسم المستخدم للمدير"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>كلمة المرور</label>
                        <div className="relative">
                            <Lock className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="password"
                                name="admin_password"
                                required
                                value={formData.admin_password}
                                onChange={handleChange}
                                className={`w-full pr-10 pl-4 py-3 rounded-xl outline-none focus:ring-2 transition-all ${isDarkMode
                                    ? 'bg-slate-900/50 border-white/10 text-white focus:ring-primary/50'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-primary/20 focus:border-primary'
                                    } border`}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>تأكيد كلمة المرور</label>
                        <div className="relative">
                            <Lock className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="password"
                                name="confirm_password"
                                required
                                value={formData.confirm_password}
                                onChange={handleChange}
                                className={`w-full pr-10 pl-4 py-3 rounded-xl outline-none focus:ring-2 transition-all ${isDarkMode
                                    ? 'bg-slate-900/50 border-white/10 text-white focus:ring-primary/50'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-primary/20 focus:border-primary'
                                    } border`}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-lg shadow-primary/25"
                    >
                        {loading ? 'جاري التسجيل...' : 'تسجيل العيادة'}
                    </button>

                    <div className="text-center mt-4">
                        <Link to="/" className={`text-sm hover:underline ${isDarkMode ? 'text-primary' : 'text-primary'}`}>
                            لديك حساب بالفعل؟ تسجيل الدخول
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterClinic;
