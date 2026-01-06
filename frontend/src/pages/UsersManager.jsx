import React, { useState, useEffect } from 'react';
import { getUsers, registerUser, deleteUser } from '../api';
import { UserPlus, Trash2, Shield, User } from 'lucide-react';
import { parseJwt } from '../utils';

export default function UsersManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'doctor' });

    // Check admin, although App.jsx protects route, this is extra safety
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await getUsers();
            setUsers(res.data);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                alert('غير مسموح لك بالوصول لهذه الصفحة');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newUser.username || !newUser.password) return alert('أدخل الاسم وكلمة المرور');
        try {
            await registerUser(newUser);
            setIsModalOpen(false);
            setNewUser({ username: '', password: '', role: 'doctor' });
            loadUsers();
        } catch (err) {
            alert('Failed to register user: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('حذف هذا المستخدم؟')) return;
        try {
            await deleteUser(id);
            loadUsers();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">إدارة المستخدمين</h2>
                    <p className="text-slate-500">إضافة وحذف المستخدمين وتحديد الصلاحيات</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-primary/20 transition-all"
                >
                    <UserPlus size={20} /> إضافة مستخدم جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div key={user.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                {user.role === 'admin' ? <Shield size={24} /> : <User size={24} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{user.username}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>
                        {user.role !== 'admin' && ( // Don't allow easy delete of admins via UI for safety
                            <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">إضافة مستخدم جديد</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المستخدم</label>
                                <input
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">الدور (الصلاحيات)</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-primary transition-colors"
                                >
                                    <option value="doctor">طبيب/مساعد (صلاحيات محدودة)</option>
                                    <option value="admin">مدير النظام (كامل الصلاحيات)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded-lg font-bold text-slate-500">إلغاء</button>
                                <button onClick={handleCreate} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600 shadow-lg shadow-primary/20">حفظ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
