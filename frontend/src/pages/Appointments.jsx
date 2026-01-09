import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, User, CheckCircle, XCircle, MoreVertical, LayoutGrid, List as ListIcon } from 'lucide-react';
import { getAppointments, createAppointment, updateAppointmentStatus, getPatients } from '../api';
import { getTodayDateTimeStr } from '../utils/toothUtils';

export default function Appointments() {
    const [viewMode, setViewMode] = useState('board'); // 'list' | 'board'
    const [appointments, setAppointments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAppt, setNewAppt] = useState({ patient_id: '', date_time: getTodayDateTimeStr(), notes: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [aRes, pRes] = await Promise.all([getAppointments(), getPatients()]);
            setAppointments(aRes.data);
            setPatients(pRes.data);
        } catch (err) {
            console.error("Failed to load appointments", err);
        }
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

    // Kanban Columns
    const columns = [
        { id: 'Scheduled', title: 'مجدول', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Calendar },
        { id: 'Waiting', title: 'في الانتظار', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock },
        { id: 'In-Chair', title: 'في العيادة', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: User },
        { id: 'Completed', title: 'تم الانتهاء', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
        { id: 'Cancelled', title: 'ملغي / لم يحضر', color: 'bg-slate-50 text-slate-700 border-slate-100', icon: XCircle },
    ];

    const getColumnAppointments = (status) => {
        if (status === 'Cancelled') {
            return appointments.filter(a => ['Cancelled', 'No Show'].includes(a.status));
        }
        return appointments.filter(a => a.status === status);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">جدول المواعيد</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">إدارة حجوزات ومواعيد العيادة</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ListIcon size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-3 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-sky-600 shadow-xl shadow-primary/25 transition-all active:scale-95 transform"
                    >
                        <Plus size={24} />
                        حجز موعد جديد
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                // List View
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
                                                    ${['Cancelled', 'No Show'].includes(appt.status) ? 'bg-red-500/10 text-red-600 ring-red-500/20' : ''}
                                                    ${appt.status === 'Waiting' ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20' : ''}
                                                    ${appt.status === 'In-Chair' ? 'bg-purple-500/10 text-purple-600 ring-purple-500/20' : ''}
                                                `}>
                                                    {appt.status === 'Scheduled' ? 'مجدول' :
                                                        appt.status === 'Completed' ? 'تم' :
                                                            appt.status === 'Cancelled' ? 'ملغي' :
                                                                appt.status === 'Waiting' ? 'انتظار' :
                                                                    appt.status === 'In-Chair' ? 'في الكرسي' :
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
                                                    <option value="Waiting">انتظار</option>
                                                    <option value="In-Chair">بالعيادة</option>
                                                    <option value="Completed">تم</option>
                                                    <option value="Postponed">أوجل</option>
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
                </div>
            ) : (
                // Kanban Board View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 overflow-x-auto pb-4 items-start">
                    {columns.map(col => (
                        <div key={col.id} className="min-w-[280px] bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-4 flex flex-col gap-4 border border-slate-100 dark:border-white/5">
                            <div className={`p-4 rounded-2xl border ${col.color} border-dashed flex justify-between items-center bg-white/50 backdrop-blur-sm`}>
                                <div className="flex items-center gap-3">
                                    <col.icon size={18} />
                                    <span className="font-black">{col.title}</span>
                                </div>
                                <span className="bg-white/80 dark:bg-slate-800 px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
                                    {getColumnAppointments(col.id).length}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3 min-h-[100px]">
                                {getColumnAppointments(col.id).map(appt => {
                                    const patient = patients.find(p => p.id === appt.patient_id);
                                    return (
                                        <div key={appt.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 hover:shadow-md transition-all group relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-black text-slate-800 dark:text-white">{patient?.name || 'Unknown'}</h4>
                                                <div className="group-hover:opacity-100 opacity-0 transition-opacity absolute top-2 right-2">
                                                    <select
                                                        className="text-xs p-1 bg-slate-100 rounded-lg border-none outline-none cursor-pointer"
                                                        value={appt.status}
                                                        onChange={(e) => handleStatus(appt.id, e.target.value)}
                                                    >
                                                        <option value="Scheduled">مجدول</option>
                                                        <option value="Waiting">انتظار</option>
                                                        <option value="In-Chair">بالعيادة</option>
                                                        <option value="Completed">تم</option>
                                                        <option value="Cancelled">ملغي</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold mb-2">
                                                <Clock size={14} />
                                                <span>
                                                    {new Date(appt.date_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {appt.notes && (
                                                <p className="text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                                    {appt.notes}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                                {getColumnAppointments(col.id).length === 0 && (
                                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-300 dark:text-slate-700 text-sm font-bold">
                                        لا توجد مواعيد
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
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
