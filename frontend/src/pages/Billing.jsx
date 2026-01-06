import React, { useState, useEffect } from 'react';
import { Banknote, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getFinancialStats, getAllPayments } from '../api';

export default function Billing() {
    const [stats, setStats] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [sRes, pRes] = await Promise.all([getFinancialStats(), getAllPayments()]);
            setStats(sRes.data);
            setPayments(pRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">الحسابات والتقارير</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">متابعة الوضع المالي والتحصيل في العيادة</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 font-black text-sm mb-1 uppercase tracking-wider">الإيرادات المتوقعة</p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white">{stats?.total_revenue} <span className="text-lg text-slate-400 dark:text-slate-600">ج.م</span></p>
                    </div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-emerald-500 opacity-5"></div>
                </div>

                <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
                        <Banknote size={28} />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 font-black text-sm mb-1 uppercase tracking-wider">المحصل فعلياً</p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white">{stats?.total_received} <span className="text-lg text-slate-400 dark:text-slate-600">ج.م</span></p>
                    </div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-blue-500 opacity-5"></div>
                </div>

                <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="p-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform">
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 font-black text-sm mb-1 uppercase tracking-wider">المستحقات الآجلة</p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white">{stats?.outstanding} <span className="text-lg text-slate-400 dark:text-slate-600">ج.م</span></p>
                    </div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-orange-500 opacity-5"></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="p-8 border-b dark:border-white/5 flex items-center gap-4">
                    <div className="w-2.5 h-8 bg-primary rounded-full"></div>
                    <h3 className="font-black text-2xl text-slate-800 dark:text-white">سجل المدفوعات الأخير</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right align-middle">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest border-b dark:border-white/5">
                            <tr>
                                <th className="p-6">المريض</th>
                                <th className="p-6">التاريخ</th>
                                <th className="p-6">المبلغ</th>
                                <th className="p-6">ملاحظات التحصيل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {payments.map(pay => (
                                <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 dark:text-white">{pay.patient_name || '---'}</span>
                                            <span className="text-xs text-slate-400 font-bold">#{pay.patient_id}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-slate-600 dark:text-slate-400 font-bold" dir="ltr">
                                        {new Date(pay.date).toLocaleString('ar-EG', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="p-6">
                                        <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">
                                            {pay.amount} <span className="text-sm">ج.م</span>
                                        </span>
                                    </td>
                                    <td className="p-6 text-slate-500 dark:text-slate-400 font-medium">{pay.notes || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {payments.length === 0 && (
                    <div className="p-20 text-center">
                        <Banknote size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                        <p className="text-slate-400 dark:text-slate-500 font-black text-lg">لا توجد حركات مالية مسجلة</p>
                    </div>
                )}
            </div>
        </div>
    );
}
