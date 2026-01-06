import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, User, CheckCircle, XCircle } from 'lucide-react';
import { getAppointments, createAppointment, updateAppointmentStatus, getPatients } from '../api';
import { getTodayDateTimeStr } from '../utils/toothUtils';

export default function Appointments() {
    const [appointments, setAppointments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAppt, setNewAppt] = useState({ patient_id: '', date_time: getTodayDateTimeStr(), notes: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [aRes, pRes] = await Promise.all([getAppointments(), getPatients()]);
        setAppointments(aRes.data);
        setPatients(pRes.data);
    };

    const handleCreate = async () => {
        if (!newAppt.patient_id || !newAppt.date_time) return alert('يرجى ملء جميع الحقول');
        try {
            await createAppointment({
                ...newAppt,
                patient_id: parseInt(newAppt.patient_id)
            });
            setIsModalOpen(false);
            setNewAppt({ patient_id: '', date_time: getTodayDateTimeStr(), notes: '' });
            loadData();
        } catch (err) {
            alert('فشل في حجز الموعد');
        }
    };

    const handleStatus = async (id, status) => {
        try {
            await updateAppointmentStatus(id, status);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">جدول المواعيد</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">إدارة حجوزات ومواعيد العيادة</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-sky-600 shadow-xl shadow-primary/25 transition-all active:scale-95 transform"
                >
                    <Plus size={24} />
                    حجز موعد جديد
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right align-middle">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest border-b dark:border-white/5">
                            <tr>
                                <th className="p-6">المريض</th>
                                <th className="p-6">التاريخ والوقت</th>
                                <th className="p-6">ملاحظات</th>
                                <th className="p-6">الحالة</th>
                                <th className="p-6">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {appointments.map(appt => {
                                const patient = patients.find(p => p.id === appt.patient_id);
                                return (
                                    <tr key={appt.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                        <td className="p-6 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                                                    <User size={20} />
                                                </div>
                                                <span className="font-black text-lg text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                                                    {patient ? patient.name : 'Unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-slate-600 dark:text-slate-400 font-bold" dir="ltr">
                                            {new Date(appt.date_time).toLocaleString('ar-EG', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="p-6 text-slate-500 dark:text-slate-400 max-w-xs truncate font-medium">{appt.notes || '---'}</td>
                                        <td className="p-6">
                                            <span className={`px-4 py-2 rounded-2xl text-xs font-black ring-1 ring-inset
                                                ${appt.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-600 ring-blue-500/20' : ''}
                                                ${appt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' : ''}
                                                ${appt.status === 'Cancelled' ? 'bg-red-500/10 text-red-600 ring-red-500/20' : ''}
                                                ${appt.status === 'Postponed' ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20' : ''}
                                                ${appt.status === 'No Show' ? 'bg-slate-500/10 text-slate-600 ring-slate-500/20' : ''}
                                            `}>
                                                {appt.status === 'Scheduled' ? 'مجدول' :
                                                    appt.status === 'Completed' ? 'تم' :
                                                        appt.status === 'Cancelled' ? 'ملغي' :
                                                            appt.status === 'Postponed' ? 'مؤجل' :
                                                                appt.status === 'No Show' ? 'لم يحضر' : appt.status}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <select
                                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary text-slate-800 dark:text-white font-bold text-sm cursor-pointer transition-all"
                                                value={appt.status}
                                                onChange={(e) => handleStatus(appt.id, e.target.value)}
                                            >
                                                <option value="Scheduled">مجدول</option>
                                                <option value="Completed">تم</option>
                                                <option value="Postponed">مؤجل</option>
                                                <option value="No Show">لم يحضر</option>
                                                <option value="Cancelled">ملغي</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {appointments.length === 0 && (
                    <div className="p-20 text-center">
                        <Calendar size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                        <p className="text-slate-400 dark:text-slate-500 font-black text-lg">لا توجد مواعيد حالياً</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border dark:border-white/10 animate-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                <Plus size={24} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">حجز موعد جديد</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 mr-1">اختر المريض</label>
                                <select
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-white font-bold transition-all appearance-none cursor-pointer"
                                    value={newAppt.patient_id}
                                    onChange={e => setNewAppt({ ...newAppt, patient_id: e.target.value })}
                                >
                                    <option value="">-- اختر مريض من القائمة --</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 mr-1">التاريخ والوقت</label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-white font-bold transition-all"
                                    value={newAppt.date_time}
                                    onChange={e => setNewAppt({ ...newAppt, date_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 mr-1">ملاحظات الزيارة</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-white font-bold transition-all"
                                    rows={3}
                                    placeholder="اكتب أي ملاحظات إضافية هنا..."
                                    value={newAppt.notes}
                                    onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-black hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="flex-[2] py-4 bg-primary text-white font-black rounded-2xl hover:bg-sky-600 shadow-xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    تأكيد الحجز
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
