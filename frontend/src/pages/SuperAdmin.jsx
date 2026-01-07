import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Shield, CheckCircle, XCircle, Clock, Trash2, CalendarDays } from 'lucide-react';

export default function SuperAdmin() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingTenant, setEditingTenant] = useState(null);
    const [customDays, setCustomDays] = useState(30);
    const [customDate, setCustomDate] = useState('');

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/tenants');
            setTenants(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load tenants');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (tenant) => {
        try {
            await api.put(`/admin/tenants/${tenant.id}`, {
                is_active: !tenant.is_active
            });
            fetchTenants();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const extendSubscription = async (tenant, days) => {
        try {
            const currentEnd = tenant.subscription_end_date ? new Date(tenant.subscription_end_date) : new Date();
            const newEnd = new Date(currentEnd.setDate(currentEnd.getDate() + days));
            
            await api.put(`/admin/tenants/${tenant.id}`, {
                subscription_end_date: newEnd.toISOString()
            });
            fetchTenants();
            setEditingTenant(null);
        } catch (err) {
            alert('Failed to extend subscription');
        }
    };

    const setExactDate = async (tenant, dateString) => {
        try {
            await api.put(`/admin/tenants/${tenant.id}`, {
                subscription_end_date: new Date(dateString).toISOString()
            });
            fetchTenants();
            setEditingTenant(null);
            setCustomDate('');
        } catch (err) {
            alert('Failed to set subscription date');
        }
    };

    const deleteTenant = async (tenant) => {
        if (!confirm(`هل أنت متأكد من حذف "${tenant.name}"؟\nسيتم حذف كل البيانات المرتبطة بها (مرضى، مواعيد، مستخدمين).`)) {
            return;
        }
        try {
            await api.delete(`/admin/tenants/${tenant.id}`);
            fetchTenants();
        } catch (err) {
            alert('Failed to delete tenant');
        }
    };

    if (loading) return <div className="text-center py-20">Loading Admin Panel...</div>;
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <Shield className="text-primary" size={40} />
                    لوحة تحكم المدير
                </h1>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-white/5">
                        <tr>
                            <th className="p-6">العيادة</th>
                            <th className="p-6">الخطة</th>
                            <th className="p-6">الحالة</th>
                            <th className="p-6">نهاية الاشتراك</th>
                            <th className="p-6 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {tenants.map(tenant => (
                            <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-6 font-bold text-slate-800 dark:text-white flex items-center gap-3">
                                    {tenant.logo ? (
                                        <img src={api.defaults.baseURL + "/" + tenant.logo} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    )}
                                    {tenant.name}
                                </td>
                                <td className="p-6 text-slate-600 dark:text-slate-300 capitalize">{tenant.plan}</td>
                                <td className="p-6">
                                    <button 
                                        onClick={() => toggleStatus(tenant)}
                                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold transition-all ${tenant.is_active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                                    >
                                        {tenant.is_active ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                                        {tenant.is_active ? 'نشط' : 'متوقف'}
                                    </button>
                                </td>
                                <td className="p-6 text-slate-600 dark:text-slate-300">
                                    {tenant.subscription_end_date ? (
                                        <span className={`flex items-center gap-2 ${new Date(tenant.subscription_end_date) < new Date() ? 'text-red-500' : ''}`}>
                                            <Clock size={16} />
                                            {new Date(tenant.subscription_end_date).toLocaleDateString()}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">غير محدد (مفتوح)</span>
                                    )}
                                </td>
                                <td className="p-6">
                                    <div className="flex flex-wrap justify-center gap-2">
                                        <button 
                                            onClick={() => extendSubscription(tenant, 30)}
                                            className="bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-all"
                                        >
                                            +30 يوم
                                        </button>
                                        <button 
                                            onClick={() => extendSubscription(tenant, 365)}
                                            className="bg-purple-500/10 text-purple-600 hover:bg-purple-600 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-all"
                                        >
                                            +سنة
                                        </button>
                                        <button 
                                            onClick={() => setEditingTenant(editingTenant === tenant.id ? null : tenant.id)}
                                            className="bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-all flex items-center gap-1"
                                        >
                                            <CalendarDays size={14} />
                                            تحديد
                                        </button>
                                        <button 
                                            onClick={() => deleteTenant(tenant)}
                                            className="bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg text-sm font-bold transition-all flex items-center gap-1"
                                        >
                                            <Trash2 size={14} />
                                            حذف
                                        </button>
                                    </div>

                                    {/* Expandable date picker */}
                                    {editingTenant === tenant.id && (
                                        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700 rounded-xl space-y-3">
                                            <div className="flex gap-2 items-center">
                                                <input 
                                                    type="number" 
                                                    value={customDays}
                                                    onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                                                    className="w-20 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-center"
                                                    min="1"
                                                />
                                                <span className="text-slate-600 dark:text-slate-300">يوم</span>
                                                <button 
                                                    onClick={() => extendSubscription(tenant, customDays)}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                                                >
                                                    إضافة
                                                </button>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <input 
                                                    type="date" 
                                                    value={customDate}
                                                    onChange={(e) => setCustomDate(e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
                                                />
                                                <button 
                                                    onClick={() => setExactDate(tenant, customDate)}
                                                    disabled={!customDate}
                                                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                                                >
                                                    ضبط التاريخ
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
