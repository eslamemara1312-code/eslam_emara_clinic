import React, { useEffect, useState } from 'react';
import { Users, Calendar, Banknote, Activity, Plus, Clock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAppointments, getFinancialStats, getPatients } from '../api';

const StatCard = ({ icon: Icon, label, value, subtext, color, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-4 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group overflow-hidden relative"
    >
        <div className={`p-4 rounded-2xl ${color} text-white relative z-10 group-hover:rotate-12 transition-transform shadow-lg shadow-${color.split('-')[1]}-500/20`}>
            <Icon size={24} />
        </div>
        <div className="relative z-10">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{value}</p>
            {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{subtext}</p>}
        </div>

        {/* Decorative background circle */}
        <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.03] dark:opacity-[0.05] ${color}`}></div>
    </div>
);

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        patients: 0,
        appointments: 0,
        revenue: 0,
        outstanding: 0
    });
    const [todaysAppointments, setTodaysAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [pRes, aRes, fRes] = await Promise.all([
                    getPatients(),
                    getAppointments(),
                    getFinancialStats()
                ]);

                // Filter Today's Appointments
                const today = new Date().toISOString().split('T')[0];
                const todaysAppts = aRes.data.filter(app => app.date_time.startsWith(today) && app.status === 'Scheduled');

                setStats({
                    patients: pRes.data.length,
                    appointments: todaysAppts.length,
                    revenue: fRes.data.today_received.toLocaleString() + ' ج.م',
                    outstanding: fRes.data.today_outstanding.toLocaleString() + ' ج.م'
                });

                setTodaysAppointments(todaysAppts.slice(0, 5)); // Show next 5
            } catch (err) {
                console.error("Dashboard Load Error", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">لوحة التحكم</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">أهلاً بك د. إسلام، إليك ملخص نشاط عمارة لطب الأسنان اليوم</p>
                </div>
                <div className="text-left hidden md:block">
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-primary uppercase tracking-wider">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="إجمالي المرضى"
                    value={stats.patients}
                    subtext="مريض مسجل"
                    color="bg-blue-500"
                    onClick={() => navigate('/patients')}
                />
                <StatCard
                    icon={Calendar}
                    label="مواعيد اليوم"
                    value={stats.appointments}
                    subtext="حجز مؤكد"
                    color="bg-purple-500"
                    onClick={() => navigate('/appointments')}
                />
                <StatCard
                    icon={Banknote}
                    label="إيرادات اليوم"
                    value={stats.revenue}
                    subtext="المحصل اليوم"
                    color="bg-emerald-500"
                    onClick={() => navigate('/billing')}
                />
                <StatCard
                    icon={Activity}
                    label="مستحقات اليوم"
                    value={stats.outstanding}
                    subtext="آجل اليوم"
                    color="bg-orange-500"
                    onClick={() => navigate('/billing')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Today's Schedule */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">جدول اليوم</h3>
                        </div>
                        <button onClick={() => navigate('/appointments')} className="text-sm text-primary font-black hover:bg-primary/5 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-primary/10">
                            عرض الجدول الكامل <ChevronLeft size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {todaysAppointments.length > 0 ? todaysAppointments.map((appt) => (
                            <div key={appt.id} className="flex items-center gap-5 p-5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-3xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/10 group cursor-pointer shadow-sm hover:shadow-md">
                                <div className="text-center min-w-[5rem] bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="block text-lg font-black">{new Date(appt.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="w-1.5 h-12 bg-slate-200 dark:bg-slate-700 rounded-full group-hover:bg-primary transition-colors" />
                                <div>
                                    <h4 className="font-black text-xl text-slate-800 dark:text-white group-hover:text-primary transition-colors">{appt.patient_name || 'مريض'}</h4>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">{appt.notes || 'زيارة عامة'}</p>
                                </div>
                                <span className={`mr-auto px-5 py-2 rounded-2xl font-black text-sm ${appt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                    {appt.status}
                                </span>
                            </div>
                        )) : (
                            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                                <Calendar size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 font-black text-lg">لا توجد مواعيد مجدولة لليوم</p>
                                <button onClick={() => navigate('/appointments')} className="text-primary font-black mt-3 hover:scale-105 transition-transform inline-block">إضافة موعد جديد +</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 h-fit">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                        <div className="w-2.5 h-8 bg-amber-400 rounded-full shadow-lg shadow-amber-400/20" />
                        إجراءات سريعة
                    </h3>
                    <div className="space-y-5">
                        <button
                            onClick={() => navigate('/patients')}
                            className="w-full p-5 bg-gradient-to-br from-blue-500/10 to-transparent hover:from-blue-500 hover:to-blue-600 rounded-3xl flex items-center gap-5 transition-all group border border-blue-500/10 hover:border-transparent hover:shadow-xl hover:shadow-blue-500/20"
                        >
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl text-blue-600 shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus size={24} /></div>
                            <div className="text-right">
                                <span className="block font-black text-slate-800 dark:text-white group-hover:text-white text-lg">إضافة مريض</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-blue-100">سجل بيانات مريض جديد</span>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/appointments')}
                            className="w-full p-5 bg-gradient-to-br from-purple-500/10 to-transparent hover:from-purple-500 hover:to-purple-600 rounded-3xl flex items-center gap-5 transition-all group border border-purple-500/10 hover:border-transparent hover:shadow-xl hover:shadow-purple-500/20"
                        >
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl text-purple-600 shadow-sm group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all"><Calendar size={24} /></div>
                            <div className="text-right">
                                <span className="block font-black text-slate-800 dark:text-white group-hover:text-white text-lg">حجز موعد</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-100">إضافة لجدول اليوم</span>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/billing')}
                            className="w-full p-5 bg-gradient-to-br from-emerald-500/10 to-transparent hover:from-emerald-500 hover:to-emerald-600 rounded-3xl flex items-center gap-5 transition-all group border border-emerald-500/10 hover:border-transparent hover:shadow-xl hover:shadow-emerald-500/20"
                        >
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl text-emerald-600 shadow-sm group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Banknote size={24} /></div>
                            <div className="text-right">
                                <span className="block font-black text-slate-800 dark:text-white group-hover:text-white text-lg">الحسابات</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-emerald-100">مراجعة الفواتير والتحصيل</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
