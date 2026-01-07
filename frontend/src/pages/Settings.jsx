import React, { useState, useEffect } from 'react';
import { Database, Upload, Download, AlertTriangle, CheckCircle, List, Plus, Edit2, Trash2, CreditCard, Calendar, Shield, Clock } from 'lucide-react';
import { downloadBackup, uploadBackup, api as axiosInstance, getMe } from '../api';
import * as api from '../api'; // Use all api functions

export default function Settings() {
    const [restoring, setRestoring] = useState(false);
    const [message, setMessage] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Procedures State
    const [procedures, setProcedures] = useState([]);
    const [isProcLoading, setIsProcLoading] = useState(false);
    const [isProcModalOpen, setIsProcModalOpen] = useState(false);
    const [editingProc, setEditingProc] = useState(null);
    const [newProc, setNewProc] = useState({ name: '', price: '' });

    // Load procedures and user on mount
    useEffect(() => {
        loadProcedures();
        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        try {
            const res = await getMe();
            setCurrentUser(res.data);
        } catch (err) {
            console.error('Failed to load user info', err);
        }
    };

    const loadProcedures = async () => {
        setIsProcLoading(true);
        try {
            const res = await api.getProcedures();
            setProcedures(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcLoading(false);
        }
    };

    const handleSaveProcedure = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: newProc.name,
                price: parseFloat(newProc.price) || 0
            };

            if (editingProc) {
                await api.updateProcedure(editingProc.id, payload);
            } else {
                await api.createProcedure(payload);
            }

            setIsProcModalOpen(false);
            setNewProc({ name: '', price: '' });
            setEditingProc(null);
            loadProcedures();
            setMessage({ type: 'success', text: editingProc ? 'تم تعديل الإجراء بنجاح' : 'تم إضافة الإجراء بنجاح' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' });
        }
    };

    const handleDeleteProcedure = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الإجراء؟')) return;
        try {
            await api.deleteProcedure(id);
            loadProcedures();
            setMessage({ type: 'success', text: 'تم حذف الإجراء بنجاح' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'فشل الحذف' });
        }
    };

    const openEditProc = (proc) => {
        setEditingProc(proc);
        setNewProc({ name: proc.name, price: proc.price });
        setIsProcModalOpen(true);
    };

    const handleDownload = async () => {
        try {
            const response = await downloadBackup();
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'clinic_backup.db');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setMessage({ type: 'error', text: 'فشل تحميل النسخة الاحتياطية' });
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm("تحذير: استعادة نسخة احتياطية ستقوم بحذف جميع البيانات الحالية واستبدالها بالنسخة الجديدة. هل أنت متأكد؟")) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setRestoring(true);
            await uploadBackup(formData);
            setMessage({ type: 'success', text: 'تم استعادة البيانات بنجاح! يرجى تحديث الصفحة.' });
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: 'فشل استعادة البيانات' });
            setRestoring(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">الإعدادات</h2>
                <p className="text-slate-500">إدارة النظام والنسخ الاحتياطي</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subscription Info Section */}
                {currentUser?.tenant && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 md:col-span-2">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                                <CreditCard size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">معلومات الاشتراك</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">تفاصيل خطة اشتراكك الحالية</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Clinic Name */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                                    <Shield size={16} />
                                    <span>اسم العيادة</span>
                                </div>
                                <p className="text-lg font-bold text-slate-800 dark:text-white">{currentUser.tenant.name}</p>
                            </div>

                            {/* Plan */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                                    <CreditCard size={16} />
                                    <span>الخطة</span>
                                </div>
                                <p className={`text-lg font-bold ${
                                    currentUser.tenant.plan === 'premium' ? 'text-amber-600' :
                                    currentUser.tenant.plan === 'basic' ? 'text-blue-600' :
                                    'text-slate-600 dark:text-slate-300'
                                }`}>
                                    {currentUser.tenant.plan === 'premium' ? 'بريميوم ⭐' : 
                                     currentUser.tenant.plan === 'basic' ? 'أساسي' : 'تجريبي'}
                                </p>
                            </div>

                            {/* End Date */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                                    <Calendar size={16} />
                                    <span>تاريخ الانتهاء</span>
                                </div>
                                <p className={`text-lg font-bold ${
                                    currentUser.tenant.subscription_end_date && new Date(currentUser.tenant.subscription_end_date) < new Date() 
                                        ? 'text-red-500' 
                                        : 'text-slate-800 dark:text-white'
                                }`}>
                                    {currentUser.tenant.subscription_end_date 
                                        ? new Date(currentUser.tenant.subscription_end_date).toLocaleDateString('ar-EG', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'غير محدد (مفتوح)'}
                                </p>
                            </div>

                            {/* Days Remaining */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                                    <Clock size={16} />
                                    <span>الأيام المتبقية</span>
                                </div>
                                {currentUser.tenant.subscription_end_date ? (
                                    (() => {
                                        const daysLeft = Math.ceil((new Date(currentUser.tenant.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                                        return (
                                            <p className={`text-lg font-bold ${
                                                daysLeft < 0 ? 'text-red-500' :
                                                daysLeft <= 7 ? 'text-amber-500' :
                                                daysLeft <= 30 ? 'text-blue-500' :
                                                'text-emerald-500'
                                            }`}>
                                                {daysLeft < 0 ? `منتهي منذ ${Math.abs(daysLeft)} يوم` :
                                                 daysLeft === 0 ? 'ينتهي اليوم!' :
                                                 `${daysLeft} يوم`}
                                            </p>
                                        );
                                    })()
                                ) : (
                                    <p className="text-lg font-bold text-emerald-500">∞ غير محدود</p>
                                )}
                            </div>
                        </div>

                        {/* Status Banner */}
                        {currentUser.tenant.subscription_end_date && (
                            (() => {
                                const daysLeft = Math.ceil((new Date(currentUser.tenant.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                                if (daysLeft <= 7) {
                                    return (
                                        <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
                                            daysLeft < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                        }`}>
                                            <AlertTriangle size={24} />
                                            <span className="font-bold">
                                                {daysLeft < 0 
                                                    ? 'انتهى اشتراكك! يرجى التواصل مع الدعم للتجديد.' 
                                                    : `اشتراكك على وشك الانتهاء! باقي ${daysLeft} يوم فقط.`}
                                            </span>
                                        </div>
                                    );
                                }
                                return null;
                            })()
                        )}
                    </div>
                )}

                {/* Backup Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <Database size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">النسخ الاحتياطي</h3>
                            <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                                قم بتحميل نسخة من بيانات العيادة بانتظام لتجنب فقدان البيانات.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleDownload}
                            className="w-full p-4 border-2 border-slate-100 rounded-xl flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Download className="text-slate-400 group-hover:text-blue-500" />
                                <div className="text-right">
                                    <span className="block font-bold text-slate-700 group-hover:text-blue-700">تحميل نسخة احتياطية</span>
                                </div>
                            </div>
                        </button>

                        <div className="relative w-full p-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-between hover:border-amber-500 hover:bg-amber-50 group transition-all">
                            <input
                                type="file"
                                accept=".db"
                                onChange={handleUpload}
                                disabled={restoring}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex items-center gap-3">
                                <Upload className="text-slate-400 group-hover:text-amber-500" />
                                <div className="text-right">
                                    <span className="block font-bold text-slate-700 group-hover:text-amber-700">
                                        {restoring ? 'جاري الاستعادة...' : 'استعادة نسخة سابقة'}
                                    </span>
                                </div>
                            </div>
                            {restoring && <div className="animate-spin h-5 w-5 border-2 border-amber-500 rounded-full border-t-transparent"></div>}
                        </div>
                    </div>
                </div>

                {/* Procedures Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                                <List size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">قائمة العلاجات</h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    أضف الإجراءات العلاجية وأسعارها لتسهيل إدخالها لاحقاً
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEditingProc(null);
                                setNewProc({ name: '', price: '' });
                                setIsProcModalOpen(true);
                            }}
                            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1 custom-scrollbar">
                        {isProcLoading ? (
                            <div className="text-center py-10 text-slate-400">جاري التحميل...</div>
                        ) : procedures.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed">لا يوجد إجراءات مضافة</div>
                        ) : (
                            procedures.map(proc => (
                                <div key={proc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-all">
                                    <div>
                                        <p className="font-bold text-slate-800">{proc.name}</p>
                                        <p className="text-sm text-emerald-600 font-bold">{proc.price} ج.م</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditProc(proc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteProcedure(proc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Procedure Modal */}
            {isProcModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">{editingProc ? 'تعديل إجراء' : 'إضافة إجراء جديد'}</h3>
                        <form onSubmit={handleSaveProcedure} className="space-y-4">
                            <input
                                value={newProc.name}
                                onChange={e => setNewProc({ ...newProc, name: e.target.value })}
                                placeholder="اسم الإجراء (مثال: حشو عصب)"
                                className="w-full p-3 bg-slate-50 rounded-xl outline-none border focus:border-purple-500"
                                required
                            />
                            <input
                                value={newProc.price}
                                onChange={e => setNewProc({ ...newProc, price: e.target.value })}
                                placeholder="السعر الافتراضي"
                                type="number"
                                className="w-full p-3 bg-slate-50 rounded-xl outline-none border focus:border-purple-500"
                                required
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsProcModalOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded-lg">إلغاء</button>
                                <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">حفظ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {message && (
                <div className={`fixed bottom-6 left-6 p-4 rounded-xl flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-5 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span className="font-bold">{message.text}</span>
                </div>
            )}
        </div>
    );
}
