import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DentalChartSVG from '../components/DentalChartSVG';
import { Edit2, Trash2, Plus, X, Save, Printer, FileText, Baby, User as UserIcon, File as FileIcon, Upload, RefreshCw } from 'lucide-react';
import { toothToNumber, fdiToPalmer, palmerToFdi, getTodayStr, toothToDisplay, universalToPalmer } from '../utils/toothUtils';
import {
    getPatient, updatePatient, getPatientTeeth, updateToothStatus,
    getPatientTreatments, deletePatient, getPatientPayments,
    createTreatment, createPayment, deleteTreatment, deletePayment,
    getProcedures, uploadAttachment, getAttachments, deleteAttachment, updateTreatment
} from '../api';

export default function PatientDetails() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('chart');
    const [loading, setLoading] = useState(true);

    // Feature Toggle
    const [isPediatric, setIsPediatric] = useState(false);

    const [patient, setPatient] = useState(null);
    const [teethStatus, setTeethStatus] = useState({});
    const [history, setHistory] = useState([]);
    const [payments, setPayments] = useState([]);
    const [procedures, setProcedures] = useState([]);
    const [attachments, setAttachments] = useState([]);

    // Modals
    const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
    const [isRxModalOpen, setIsRxModalOpen] = useState(false);
    const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isToothSelectModalOpen, setIsToothSelectModalOpen] = useState(false);

    // Forms
    const [rxDrugs, setRxDrugs] = useState([{ name: '', dose: '' }]);
    const [rxNotes, setRxNotes] = useState('');
    const initialTreatment = { date: getTodayStr(), diagnosis: '', procedure: '', cost: '', discount: '', tooth_number: '', canal_count: '', canals: [{ name: '', length: '' }], sessions: '', complications: '', notes: '' };
    const [newTreatment, setNewTreatment] = useState(initialTreatment);
    const [editingTreatmentId, setEditingTreatmentId] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedToothCondition, setSelectedToothCondition] = useState('Healthy');
    const [newPayment, setNewPayment] = useState({ amount: '', notes: '', date: getTodayStr() });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pRes, tRes, hRes, payRes, procRes, aRes] = await Promise.all([
                getPatient(id),
                getPatientTeeth(id),
                getPatientTreatments(id),
                getPatientPayments(id),
                getProcedures(),
                getAttachments(id)
            ]);

            setPatient(pRes.data);

            const tMap = {};
            tRes.data.forEach(t => { tMap[t.tooth_number] = t; });
            setTeethStatus(tMap);

            setHistory(hRes.data);
            setAttachments(aRes.data);
            setPayments(payRes.data);
            setProcedures(procRes.data);
        } catch (err) {
            console.error("Failed to load patient data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await uploadAttachment(id, file);
            // Reload attachments
            const res = await getAttachments(id);
            setAttachments(res.data);
        } catch (err) {
            alert('Failed to upload file');
            console.error(err);
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        if (!confirm('Delete this file?')) return;
        try {
            await deleteAttachment(attachmentId);
            setAttachments(attachments.filter(a => a.id !== attachmentId));
        } catch (err) {
            console.error(err);
        }
    };

    const handleToothClick = (number) => {
        const fdi = toothToNumber(number);
        const current = teethStatus[fdi]?.condition || 'Healthy';
        setSelectedToothCondition(current);
        const palmerPrefix = universalToPalmer(number, isPediatric);
        setNewTreatment({ ...initialTreatment, tooth_number: palmerPrefix });
        setIsTreatmentModalOpen(true);
    };

    const handleSavePatient = async (e) => {
        e.preventDefault();
        try {
            await updatePatient(id, patient);
            setIsEditPatientOpen(false);
            loadData();
        } catch (err) {
            alert('Error updating');
        }
    };

    const handleAddTreatment = async () => {
        try {
            const fdiTooth = palmerToFdi(newTreatment.tooth_number);
            const treatmentData = {
                ...newTreatment,
                patient_id: parseInt(id),
                cost: parseFloat(newTreatment.cost) || 0,
                discount: parseFloat(newTreatment.discount) || 0,
                tooth_number: fdiTooth,
                canal_count: newTreatment.canal_count ? parseInt(newTreatment.canal_count) : null,
                canal_lengths: JSON.stringify(newTreatment.canals.filter(c => c.name || c.length)),
                diagnosis: newTreatment.diagnosis || "تشخيص عام",
                procedure: newTreatment.procedure || "إجراء عام"
            };

            if (editingTreatmentId) {
                // Update existing
                await updateTreatment(editingTreatmentId, treatmentData);
            } else {
                // Create new
                if (fdiTooth) {
                    await updateToothStatus({
                        patient_id: parseInt(id),
                        tooth_number: fdiTooth,
                        condition: selectedToothCondition
                    });
                }

                await createTreatment(treatmentData);
            }

            setIsTreatmentModalOpen(false);
            setNewTreatment(initialTreatment);
            setEditingTreatmentId(null);
            setShowAdvanced(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Error saving treatment: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleEditTreatment = (t) => {
        // Parse canal_lengths potentially
        let canals = [{ name: '', length: '' }];
        try {
            if (t.canal_lengths) {
                // Could be JSON string or simple string
                if (t.canal_lengths.startsWith('[')) {
                    canals = JSON.parse(t.canal_lengths);
                } else {
                    // Backwards compat or simple string
                    canals = [{ name: 'All', length: t.canal_lengths }];
                }
            }
        } catch (e) {
            console.log("Error parsing canals", e);
        }

        setNewTreatment({
            diagnosis: t.diagnosis,
            procedure: t.procedure,
            cost: t.cost,
            discount: t.discount,
            tooth_number: fdiToPalmer(t.tooth_number) || '',
            canal_count: t.canal_count || '',
            canals: canals,
            sessions: t.sessions || '',
            complications: t.complications || '',
            notes: t.notes || ''
        });

        // Show advanced if relevant fields have data
        if (t.canal_count || t.complications || t.sessions || (t.canal_lengths && t.canal_lengths.length > 5)) {
            setShowAdvanced(true);
        } else {
            setShowAdvanced(false);
        }

        setEditingTreatmentId(t.id);
        setIsTreatmentModalOpen(true);
    };

    const handleAddPayment = async () => {
        try {
            await createPayment({
                ...newPayment,
                patient_id: parseInt(id),
                amount: parseFloat(newPayment.amount) || 0,
                date: newPayment.date ? new Date(newPayment.date).toISOString() : undefined
            });
            setIsPaymentModalOpen(false);
            setNewPayment({ amount: '', notes: '', date: '' });
            loadData();
        } catch (err) {
            alert('Error adding payment');
        }
    };

    const handleDeleteHistory = async (itemId) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
        try {
            await deleteTreatment(itemId);
            loadData();
        } catch (err) {
            alert("فشل الحذف");
        }
    };

    const handleDeletePayment = async (itemId) => {
        if (!window.confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;
        try {
            await deletePayment(itemId);
            loadData();
        } catch (err) {
            alert("فشل الحذف");
        }
    };

    const handlePrintRx = async () => {
        const drugList = rxDrugs.filter(d => d.name);
        const drugsJson = JSON.stringify(drugList);

        try {
            // Save to database
            const res = await createPrescription({
                patient_id: parseInt(id),
                medications: drugsJson,
                notes: rxNotes
            });

            // Pass data to print page via sessionStorage
            sessionStorage.setItem('print_rx_data', JSON.stringify({
                patient: patient,
                prescription: res.data
            }));

            // Open print page
            const url = `/print/rx/${id}`;
            window.open(url, '_blank', 'width=800,height=1000');

            setIsRxModalOpen(false);
            setRxDrugs([{ name: '', dose: '' }]);
            setRxNotes('');
        } catch (err) {
            alert('فشل حفظ الروشتة: ' + err.message);
        }
    };

    const handlePrintInvoice = () => {
        window.open(`/print/invoice/${id}`, '_blank', 'width=800,height=1000');
    };

    const handleAddDrug = () => {
        setRxDrugs([...rxDrugs, { name: '', dose: '' }]);
    };


    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!patient) return <div className="p-10 text-center text-red-500">Patient not found</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
                    <div className="flex gap-4 text-slate-500 text-sm mt-1">
                        <span>{patient.age} سنة</span>
                        <span>•</span>
                        <span dir="ltr">{patient.phone}</span>
                    </div>
                    {patient.address && (
                        <div className="text-slate-500 text-sm mt-1">
                            {patient.address}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsRxModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-100 font-bold rounded-lg text-purple-700 hover:bg-purple-200">
                        <FileText size={16} /> روشتة
                    </button>
                    <button onClick={() => setIsEditPatientOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 font-bold rounded-lg text-slate-600 hover:bg-slate-200">
                        <Edit2 size={16} /> تعديل البيانات
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-500 font-bold rounded-lg text-white hover:bg-green-600 shadow-lg shadow-green-500/20">
                        <Plus size={16} /> موعد جديد
                    </button>
                </div>
            </div>

            <div className="border-b border-slate-200 flex gap-6 px-2 overflow-x-auto">
                {['chart', 'history', 'files', 'billing'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 px-2 font-bold text-sm transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}>
                        {tab === 'chart' && 'مخطط الأسنان'}
                        {tab === 'history' && 'سجل العلاج'}
                        {tab === 'files' && 'الأشعة والمرفقات'}
                        {tab === 'billing' && 'الحسابات'}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'chart' && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setIsPediatric(false)}
                                    className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${!isPediatric ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <span className="flex items-center gap-2"><UserIcon size={14} /> بالغين</span>
                                </button>
                                <button
                                    onClick={() => setIsPediatric(true)}
                                    className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${isPediatric ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <span className="flex items-center gap-2"><Baby size={14} /> أطفال</span>
                                </button>
                            </div>
                        </div>

                        <DentalChartSVG
                            teethStatus={teethStatus}
                            onToothClick={handleToothClick}
                            isPediatric={isPediatric}
                        />
                        <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                            <strong>ملاحظة:</strong> اضغط على السن لتغيير حالته أو إضافة علاج.
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-700">سجل الزيارات والعلاجات</h3>
                            <button onClick={() => { setIsToothSelectModalOpen(true); }} className="text-primary text-sm font-bold hover:underline">+ تسجيل علاج يدوي</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right align-middle">
                                <thead className="bg-slate-50 text-slate-600 text-sm font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 whitespace-nowrap">التاريخ</th>
                                        <th className="p-4 whitespace-nowrap">السن</th>
                                        <th className="p-4 whitespace-nowrap min-w-[150px]">التشخيص</th>
                                        <th className="p-4 whitespace-nowrap min-w-[150px]">العلاج</th>
                                        <th className="p-4 whitespace-nowrap">التفاصيل</th>
                                        <th className="p-4 whitespace-nowrap">التكلفة</th>
                                        <th className="p-4 whitespace-nowrap">الخصم</th>
                                        <th className="p-4 whitespace-nowrap">تحكم</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-mono text-slate-500 whitespace-nowrap">{fdiToPalmer(item.tooth_number) || '-'}</td>
                                            <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{item.diagnosis}</td>
                                            <td className="p-4 whitespace-nowrap">{item.procedure}</td>
                                            <td className="p-4 text-sm text-slate-700">
                                                {item.canal_count && <div className="font-bold mb-1 text-blue-700">عدد القنوات: {item.canal_count}</div>}
                                                {(() => {
                                                    try {
                                                        const canals = JSON.parse(item.canal_lengths);
                                                        if (Array.isArray(canals) && canals.length > 0) {
                                                            return (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {canals.map((c, idx) => (
                                                                        <div key={idx} className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
                                                                            <span className="font-bold text-blue-800">{c.name || 'قناة'}:</span>
                                                                            <span className="font-mono text-blue-900 font-bold text-base">{c.length}</span>
                                                                            <span className="text-xs text-blue-500">مم</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        }
                                                        return item.canal_lengths ? <div className="font-bold text-slate-800 bg-yellow-50 p-1 rounded border border-yellow-200">الأطوال: {item.canal_lengths}</div> : null;
                                                    } catch (e) {
                                                        return item.canal_lengths ? <div className="font-bold text-slate-800">الأطوال: {item.canal_lengths}</div> : null;
                                                    }
                                                })()}
                                                {item.sessions && <div className="mt-2 text-slate-600 bg-slate-50 p-1 rounded block" title={item.sessions}><strong>الجلسات:</strong> {item.sessions}</div>}
                                                {item.complications && <div className="mt-1 text-red-600 font-bold bg-red-50 p-1 rounded block" title={item.complications}>⚠ {item.complications}</div>}
                                                {item.notes && <div className="mt-1 text-slate-500 italic text-xs" title={item.notes}>{item.notes}</div>}
                                            </td>
                                            <td className="p-4 font-bold text-emerald-600 whitespace-nowrap">{item.cost}</td>
                                            <td className="p-4 font-bold text-red-400 whitespace-nowrap">{item.discount > 0 ? `-${item.discount}` : '-'}</td>
                                            <td className="p-4 flex gap-2 whitespace-nowrap">
                                                <button onClick={() => handleEditTreatment(item)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteHistory(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {history.length === 0 && <div className="p-8 text-center text-slate-400">لا يوجد سجل تاريخي للعلاج</div>}
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <FileIcon size={20} className="text-slate-400" />
                                ملفات الأشعة والمرفقات
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const res = await getAttachments(id); // API now has cache busting if added, or we add here
                                            setAttachments(res.data);
                                        } catch (e) { console.error(e); }
                                        setLoading(false);
                                    }}
                                    className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                                    title="تحديث القائمة"
                                >
                                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                                </button>
                                <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600 cursor-pointer transition-colors shadow-lg shadow-primary/20">
                                    <Upload size={18} />
                                    رفع ملف
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {attachments.map(file => (
                                <div key={file.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                    {file.file_type.includes('image') ? (
                                        <img
                                            src={`http://${window.location.hostname}:8000${file.file_path}`}
                                            alt={file.filename}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            onClick={() => window.open(`http://${window.location.hostname}:8000${file.file_path}`, '_blank')}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                            <FileText size={40} className="mb-2" />
                                            <span className="text-xs truncate w-full">{file.filename}</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => window.open(`http://${window.location.hostname}:8000${file.file_path}`, '_blank')}
                                            className="p-2 bg-white rounded-full text-slate-700 hover:text-primary hover:scale-110 transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAttachment(file.id)}
                                            className="p-2 bg-white rounded-full text-slate-700 hover:text-red-500 hover:scale-110 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs truncate">
                                        {new Date(file.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {attachments.length === 0 && (
                                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                    <Upload size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>لا توجد ملفات مرفقة</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-end">
                            <button onClick={handlePrintInvoice} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-800/20">
                                <Printer size={18} /> طباعة فاتورة تفصيلية
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">إجمالي العلاجات</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {history.reduce((acc, curr) => acc + (curr.cost - (curr.discount || 0)), 0)} <span className="text-xs text-slate-400">ج.م</span>
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">المدفوع</p>
                                <p className="text-2xl font-bold text-emerald-600">{payments.reduce((acc, curr) => acc + curr.amount, 0)} <span className="text-xs text-slate-400">ج.م</span></p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">المتبقي</p>
                                <p className="text-2xl font-bold text-slate-400">
                                    {(history.reduce((acc, curr) => acc + (curr.cost - (curr.discount || 0)), 0) - payments.reduce((acc, curr) => acc + curr.amount, 0))} <span className="text-xs text-slate-400">ج.م</span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-700">سجل المدفوعات</h3>
                                <button onClick={() => setIsPaymentModalOpen(true)} className="text-emerald-600 text-sm font-bold hover:underline">+ إضافة دفعة</button>
                            </div>
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 text-slate-600 text-sm font-bold">
                                    <tr>
                                        <th className="p-4">التاريخ</th>
                                        <th className="p-4">المبلغ</th>
                                        <th className="p-4">ملاحظات</th>
                                        <th className="p-4">تحكم</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(item => (
                                        <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="p-4">{new Date(item.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold text-slate-800">{item.amount}</td>
                                            <td className="p-4 text-slate-500">{item.notes}</td>
                                            <td className="p-4 flex gap-2">
                                                <button onClick={() => handleDeletePayment(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {payments.length === 0 && <div className="p-8 text-center text-slate-400">لا يوجد مدفوعات مسجلة</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isEditPatientOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">تعديل بيانات المريض</h3>
                        <form onSubmit={handleSavePatient} className="space-y-4">
                            <input value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl outline-none" placeholder="الاسم" />
                            <div className="grid grid-cols-2 gap-4">
                                <input value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl outline-none" placeholder="السن" />
                                <input value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl outline-none" placeholder="الهاتف" />
                            </div>
                            <input value={patient.address || ''} onChange={(e) => setPatient({ ...patient, address: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl outline-none" placeholder="العنوان" />
                            <div className="flex justify-end gap-3"><button type="button" onClick={() => setIsEditPatientOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded-lg">إلغاء</button><button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg">حفظ</button></div>
                        </form>
                    </div>
                </div>
            )}

            {isTreatmentModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">
                            {editingTreatmentId ? 'تعديل بيانات العلاج' : (newTreatment.tooth_number ? `تفاصيل السن رقم #${newTreatment.tooth_number}` : 'تسجيل علاج جديد')}
                        </h3>
                        <div className="space-y-4">
                            {newTreatment.tooth_number && (
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">حالة السن الحالية</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {['Healthy', 'Decayed', 'Filled', 'Missing', 'Crown', 'RootCanal'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setSelectedToothCondition(status);

                                                    // Auto-fill logic
                                                    const procedureName = status; // e.g., 'Crown'

                                                    // Find matching procedure in settings (case-insensitive)
                                                    const foundProc = procedures.find(p => p.name.toLowerCase() === procedureName.toLowerCase());

                                                    if (foundProc) {
                                                        setNewTreatment(prev => ({
                                                            ...prev,
                                                            diagnosis: status,
                                                            procedure: foundProc.name,
                                                            cost: foundProc.price
                                                        }));
                                                    } else {
                                                        // Just set diagnosis if no procedure match
                                                        setNewTreatment(prev => ({
                                                            ...prev,
                                                            diagnosis: status
                                                        }));
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedToothCondition === status
                                                    ? 'bg-primary text-white shadow-md transform scale-105'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-primary'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <input value={newTreatment.diagnosis} onChange={e => setNewTreatment({ ...newTreatment, diagnosis: e.target.value })} placeholder="التشخيص" className="w-full p-3 bg-slate-50 rounded-xl outline-none" />

                            {/* Procedure Selection */}
                            <div className="relative">
                                <input
                                    value={newTreatment.procedure}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const update = { ...newTreatment, procedure: val };

                                        // Auto-fill price if procedure matches
                                        const found = procedures.find(p => p.name === val);
                                        if (found) {
                                            update.cost = found.price;
                                        }

                                        setNewTreatment(update);
                                    }}
                                    placeholder="الإجراء العلاجي (اختر أو اكتب)"
                                    list="procedures-list"
                                    className="w-full p-3 bg-slate-50 rounded-xl outline-none"
                                />
                                <datalist id="procedures-list">
                                    {procedures.map(p => (
                                        <option key={p.id} value={p.name}>{p.name} - {p.price} ج.م</option>
                                    ))}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input value={newTreatment.cost} onChange={e => setNewTreatment({ ...newTreatment, cost: e.target.value })} placeholder="التكلفة (المبلغ الأصلي)" type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none" />
                                <input value={newTreatment.discount} onChange={e => setNewTreatment({ ...newTreatment, discount: e.target.value })} placeholder="الخصم (اختياري)" type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-dashed border-slate-300" />
                            </div>
                            <input value={newTreatment.tooth_number} onChange={e => setNewTreatment({ ...newTreatment, tooth_number: e.target.value })} placeholder="رقم السن (اختياري)" className="w-full p-3 bg-slate-50 rounded-xl outline-none" />

                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full py-2 text-sm text-primary font-bold border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
                            >
                                {showAdvanced ? '- إخفاء التفاصيل الإضافية' : '+ إضافة تفاصيل (عصب، قنوات، جلسات)'}
                            </button>

                            {showAdvanced && (
                                <div className="space-y-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">عدد القنوات</label>
                                            <input
                                                type="number"
                                                value={newTreatment.canal_count}
                                                onChange={e => setNewTreatment({ ...newTreatment, canal_count: e.target.value })}
                                                placeholder="مثلاً: 3"
                                                className="w-full p-3 bg-white rounded-xl outline-none border border-slate-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">تفاصيل القنوات</label>
                                            <div className="space-y-2">
                                                {newTreatment.canals.map((canal, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <input
                                                            value={canal.name}
                                                            onChange={e => {
                                                                const updated = [...newTreatment.canals];
                                                                updated[idx].name = e.target.value;
                                                                setNewTreatment({ ...newTreatment, canals: updated });
                                                            }}
                                                            placeholder="الاسم (مثلاً MB1)"
                                                            className="flex-1 p-2 bg-white rounded-lg text-sm border border-slate-100 outline-none"
                                                        />
                                                        <input
                                                            value={canal.length}
                                                            onChange={e => {
                                                                const updated = [...newTreatment.canals];
                                                                updated[idx].length = e.target.value;
                                                                setNewTreatment({ ...newTreatment, canals: updated });
                                                            }}
                                                            placeholder="الطول (مم)"
                                                            className="w-24 p-2 bg-white rounded-lg text-sm border border-slate-100 outline-none"
                                                        />
                                                        {newTreatment.canals.length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    const updated = newTreatment.canals.filter((_, i) => i !== idx);
                                                                    setNewTreatment({ ...newTreatment, canals: updated });
                                                                }}
                                                                className="p-1 text-red-400 hover:text-red-600"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => {
                                                        setNewTreatment({ ...newTreatment, canals: [...newTreatment.canals, { name: '', length: '' }] });
                                                    }}
                                                    className="text-xs text-primary font-bold hover:underline"
                                                >
                                                    + إضافة قناة أخرى
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">مواعيد/ملاحظات الجلسات</label>
                                        <textarea
                                            value={newTreatment.sessions}
                                            onChange={e => setNewTreatment({ ...newTreatment, sessions: e.target.value })}
                                            placeholder="اكتب تواريخ الجلسات أو ملاحظات كل جلسة"
                                            className="w-full p-3 bg-white rounded-xl outline-none border border-slate-100 h-20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 text-red-500">المضاعفات (إن وجدت)</label>
                                        <textarea
                                            value={newTreatment.complications}
                                            onChange={e => setNewTreatment({ ...newTreatment, complications: e.target.value })}
                                            placeholder="أي مشاكل واجهتك أثناء العلاج"
                                            className="w-full p-3 bg-white rounded-xl outline-none border border-red-100 text-red-600 h-20"
                                        />
                                    </div>
                                </div>
                            )}

                            <textarea value={newTreatment.notes} onChange={e => setNewTreatment({ ...newTreatment, notes: e.target.value })} placeholder="ملاحظات عامة" className="w-full p-3 bg-slate-50 rounded-xl outline-none" />

                            <div className="flex justify-end gap-3 text-lg font-bold">
                                <button onClick={() => setIsTreatmentModalOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded-lg">إلغاء</button>
                                <button onClick={handleAddTreatment} className="px-6 py-2 bg-primary text-white rounded-lg">حفظ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Same Payment/Rx Modals ... omitted for brevity but should be kept if full file overwrite */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">إضافة دفعة مالية</h3>
                        <div className="space-y-4">
                            <input value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })} placeholder="المبلغ المدفوع" type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-lg text-emerald-600" />
                            <input value={newPayment.date} onChange={e => setNewPayment({ ...newPayment, date: e.target.value })} type="date" className="w-full p-3 bg-slate-50 rounded-xl outline-none text-slate-600" />
                            <textarea value={newPayment.notes} onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })} placeholder="ملاحظات" className="w-full p-3 bg-slate-50 rounded-xl outline-none" />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded-lg">إلغاء</button>
                                <button onClick={handleAddPayment} className="px-6 py-2 bg-emerald-500 text-white rounded-lg">إضافة</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isRxModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl h-[80vh] flex flex-col">
                        <h3 className="text-xl font-bold mb-4">كتابة روشتة</h3>
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {rxDrugs.map((d, i) => (
                                <div key={i} className="flex gap-2">
                                    <input value={d.name} onChange={e => { const n = [...rxDrugs]; n[i].name = e.target.value; setRxDrugs(n); }} placeholder="الدواء" className="flex-1 p-3 bg-slate-50 rounded-xl" />
                                    <input value={d.dose} onChange={e => { const n = [...rxDrugs]; n[i].dose = e.target.value; setRxDrugs(n); }} placeholder="الجرعة" className="w-1/3 p-3 bg-slate-50 rounded-xl" />
                                </div>
                            ))}
                            <button onClick={handleAddDrug} className="text-primary text-sm font-bold">+ دواء آخر</button>
                            <textarea value={rxNotes} onChange={e => setRxNotes(e.target.value)} placeholder="تعليمات" className="w-full p-3 bg-slate-50 rounded-xl mt-4" />
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setIsRxModalOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded-lg">إلغاء</button>
                            <button onClick={handlePrintRx} className="px-6 py-2 bg-purple-600 text-white rounded-lg">طباعة</button>
                        </div>
                    </div>
                </div>
            )}

            {isToothSelectModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white w-full max-w-4xl rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[95vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-800">اختر السن</h3>
                            <button onClick={() => setIsToothSelectModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
                        </div>

                        <div className="mb-8">
                            <DentalChartSVG
                                teethStatus={teethStatus}
                                onToothClick={(num) => {
                                    handleToothClick(num);
                                    setIsToothSelectModalOpen(false);
                                }}
                                isPediatric={isPediatric}
                            />
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    setNewTreatment({ ...initialTreatment, tooth_number: '' });
                                    setIsTreatmentModalOpen(true);
                                    setIsToothSelectModalOpen(false);
                                }}
                                className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                متابعة بدون تحديد سن
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
