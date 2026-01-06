import React, { useState, useEffect } from 'react';
import { Search, Plus, User, ArrowLeft, Trash2, Scan } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPatients, createPatient, deletePatient, searchPatients } from '../api';
import PatientScanner from '../components/PatientScanner';

export default function Patients() {
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // New Patient State
    const [newPatient, setNewPatient] = useState({ name: '', age: '', phone: '', address: '' });
    const [suggestions, setSuggestions] = useState([]);
    const [searchTimeoutState, setSearchTimeoutState] = useState(null);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const res = await getPatients();
            setPatients(res.data);
        } catch (err) {
            console.error("Failed to load patients", err);
        }
    };

    const handleDeletePatient = async (id, name) => {
        if (!window.confirm(`هل أنت متأكد من حذف المريض "${name}"؟ سيؤدي هذا لحذف جميع بياناته المرتبطة.`)) {
            return;
        }
        try {
            await deletePatient(id);
            loadPatients();
        } catch (err) {
            console.error(err);
            alert('خطأ في حذف المريض: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleCreatePatient = async () => {
        if (!newPatient.name || !newPatient.phone) {
            alert('الرجاء إدخال الاسم ورقم الهاتف');
            return;
        }

        // Check for exact duplicates locally from suggestions or fresh search
        // We do a fresh search to be safe
        try {
            const res = await searchPatients(newPatient.phone);
            const duplicates = res.data;
            const exactMatch = duplicates.find(p => p.phone === newPatient.phone && p.name === newPatient.name);
            if (exactMatch) {
                alert('هذا المريض مسجل بالفعل في النظام!');
                return;
            }
            const phoneMatch = duplicates.find(p => p.phone === newPatient.phone);
            if (phoneMatch) {
                if (!window.confirm(`يوجد مريض مسجل بنفس رقم الهاتف (${phoneMatch.name}). هل تريد المتابعة؟`)) {
                    return;
                }
            }
        } catch (err) {
            console.error("Error checking duplicates", err);
        }

        try {
            await createPatient({
                name: newPatient.name,
                age: parseInt(newPatient.age) || 0,
                phone: newPatient.phone,
                address: newPatient.address || '',
                medical_history: '',
                notes: ''
            });
            setIsModalOpen(false);
            setNewPatient({ name: '', age: '', phone: '', address: '' });
            setSuggestions([]);
            loadPatients();
        } catch (err) {
            console.error(err);
            alert('خطأ في إنشاء المريض: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleInputChange = (field, value) => {
        setNewPatient(prev => ({ ...prev, [field]: value }));

        if (['name', 'phone', 'address'].includes(field)) {
            if (searchTimeoutState) clearTimeout(searchTimeoutState);

            if (!value || value.length < 2) {
                setSuggestions([]);
                return;
            }

            const timeoutId = setTimeout(async () => {
                try {
                    const res = await searchPatients(value);
                    setSuggestions(res.data);
                } catch (err) {
                    console.error(err);
                }
            }, 300);
            setSearchTimeoutState(timeoutId);
        }
    };

    const handleScanComplete = (data) => {
        setNewPatient(prev => {
            const updated = { ...prev };
            if (data.name) updated.name = data.name;
            if (data.age) updated.age = data.age;
            if (data.phone) updated.phone = data.phone;
            if (data.address) updated.address = data.address;
            return updated;
        });
    };

    const filteredPatients = patients.filter(p =>
        p.name.includes(search) || p.phone.includes(search)
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">سجلات المرضى</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium">إدارة ملفات وتاريخ المرضى</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-3 bg-primary hover:bg-sky-600 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-primary/25 active:scale-95 transform"
                >
                    <Plus size={24} />
                    <span>إضافة مريض جديد</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Search className="text-slate-400 shrink-0" size={20} />
                <input
                    type="text"
                    placeholder="بحث بالاسم أو رقم الهاتف..."
                    className="bg-transparent border-none outline-none w-full text-slate-700 dark:text-white font-medium placeholder:text-slate-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-xl rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right align-middle">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest border-b dark:border-white/5">
                            <tr>
                                <th className="p-6">المريض</th>
                                <th className="p-6">السن</th>
                                <th className="p-6">رقم الهاتف</th>
                                <th className="p-6">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {filteredPatients.map(patient => (
                                <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                    <td className="p-6 whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:from-primary/10 group-hover:to-primary/20 group-hover:text-primary transition-all">
                                                <User size={24} />
                                            </div>
                                            <span className="font-black text-lg text-slate-800 dark:text-white group-hover:text-primary transition-colors">{patient.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-slate-600 dark:text-slate-400 font-bold">{patient.age} سنة</td>
                                    <td className="p-6 text-slate-600 dark:text-slate-400 font-black" dir="ltr">{patient.phone}</td>
                                    <td className="p-6 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/patients/${patient.id}`}
                                                className="inline-flex items-center gap-2 text-primary font-black hover:bg-primary/5 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-primary/10"
                                            >
                                                عرض الملف <ArrowLeft size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDeletePatient(patient.id, patient.name)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                title="حذف المريض"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredPatients.length === 0 && (
                    <div className="p-20 text-center">
                        <User size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                        <p className="text-slate-400 dark:text-slate-500 font-black text-lg">لم يتم العثور على أي مرضى</p>
                    </div>
                )}
            </div>

            {/* Simple Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border dark:border-white/10 animate-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                    <Plus size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">إضافة مريض جديد</h3>
                            </div>
                            <button
                                onClick={() => setIsScannerOpen(true)}
                                type="button"
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
                            >
                                <Scan size={20} />
                                تصوير الكارت
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 mr-1">الاسم بالكامل</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-white font-bold transition-all"
                                    value={newPatient.name}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                    placeholder="الاسم الثلاثي أو الرباعي..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 mr-1">السن</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-white font-bold transition-all"
                                        value={newPatient.age}
                                        onChange={e => handleInputChange('age', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 mr-1">رقم الهاتف</label>
                                    <input
                                        type="tel"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-white font-bold transition-all text-left"
                                        value={newPatient.phone}
                                        onChange={e => handleInputChange('phone', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 mr-1">العنوان</label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-white font-bold transition-all"
                                    value={newPatient.address || ''}
                                    onChange={e => handleInputChange('address', e.target.value)}
                                />
                            </div>

                            {suggestions.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-700/50 animate-in slide-in-from-top-2 duration-300">
                                    <h4 className="text-amber-800 dark:text-amber-400 font-bold mb-3 text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        مرضى مشابهين مسجلين مسبقاً:
                                    </h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                        {suggestions.map(s => (
                                            <div key={s.id} className="flex items-center justify-between text-sm bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-100 dark:border-white/5">
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{s.name}</span>
                                                <span className="text-slate-500 text-xs font-mono" dir="ltr">{s.phone}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-black hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleCreatePatient}
                                    className="flex-[2] py-4 bg-primary text-white font-black rounded-2xl hover:bg-sky-600 shadow-xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    حفظ البيانات
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isScannerOpen && (
                <PatientScanner
                    onScanComplete={handleScanComplete}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}
        </div>
    );
}
