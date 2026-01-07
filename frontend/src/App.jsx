import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Users, Calendar, Banknote, Stethoscope, Menu, Settings as SettingsIcon, LogOut, TrendingDown, Shield, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { parseJwt, getToken, removeToken } from './utils';
import api, { getMe } from './api';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Billing from './pages/Billing';
import PatientDetails from './pages/PatientDetails';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import UsersManager from './pages/UsersManager';

import PrintInvoice from './pages/PrintInvoice';
import PrintRx from './pages/PrintRx';
import RegisterClinic from './pages/RegisterClinic';
import SuperAdmin from './pages/SuperAdmin';
import logo from './assets/logo.png';

// ... (rest of imports)

function Layout({ children, toggleDarkMode, isDarkMode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await getMe();
                setCurrentUser(res.data);
            } catch (error) {
                console.error("Failed to fetch user info", error);
            }
        };
        if (getToken()) fetchMe();
    }, []);

    // Check Role
    const token = getToken();
    let role = 'doctor';
    try {
        if (token) {
            const decoded = parseJwt(token);
            role = decoded.role || 'doctor';
        }
    } catch (e) { }

    const isAdmin = role === 'admin';
    const isSuperAdmin = role === 'super_admin';

    const navItems = [
        { icon: Home, label: 'الرئيسية', path: '/' },
        { icon: Calendar, label: 'المواعيد', path: '/appointments' },
        { icon: Users, label: 'المرضى', path: '/patients' },
    ];

    // Super Admin Link
    if (isSuperAdmin) {
        navItems.push(
            { icon: Shield, label: 'إدارة النظام', path: '/admin' }
        );
    }

    // Admin Only Links
    if (isAdmin || isSuperAdmin) {
        navItems.push(
            { icon: Banknote, label: 'الحسابات', path: '/billing' },
            { icon: TrendingDown, label: 'المصروفات', path: '/expenses' },
            { icon: Users, label: 'المستخدمين', path: '/users' },
            { icon: SettingsIcon, label: 'الإعدادات', path: '/settings' },
        );
    }

    return (
        <div className={`flex h-screen ${isDarkMode ? 'bg-slate-900 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-slate-900' : 'bg-slate-50'}`}>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 right-0 z-30 w-64 ${isDarkMode ? 'bg-slate-800/80 backdrop-blur-xl border-l border-white/5' : 'bg-white shadow-xl'} transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
                <div className={`flex flex-col items-center justify-center border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'} p-4`}>
                    <img 
                        src={currentUser?.tenant?.logo ? `${api.defaults.baseURL}/${currentUser.tenant.logo}` : logo} 
                        alt="Logo" 
                        className="h-12 w-auto mb-2 object-contain" 
                    />
                    <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center">
                        {currentUser?.tenant?.name || "Smart Clinic"}
                    </h1>
                    
                    {/* Subscription Info */}
                    {currentUser?.tenant && (
                        <div className="mt-2 text-center text-xs">
                            <span className={`px-2 py-1 rounded-full font-bold ${
                                currentUser.tenant.plan === 'premium' ? 'bg-amber-500/20 text-amber-600' :
                                currentUser.tenant.plan === 'basic' ? 'bg-blue-500/20 text-blue-600' :
                                'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {currentUser.tenant.plan === 'premium' ? 'بريميوم' : 
                                 currentUser.tenant.plan === 'basic' ? 'أساسي' : 'تجريبي'}
                            </span>
                            {currentUser.tenant.subscription_end_date && (
                                <p className={`mt-1 ${
                                    new Date(currentUser.tenant.subscription_end_date) < new Date() ? 'text-red-500' :
                                    Math.ceil((new Date(currentUser.tenant.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 7 ? 'text-amber-500' :
                                    'text-slate-500 dark:text-slate-400'
                                }`}>
                                    {(() => {
                                        const daysLeft = Math.ceil((new Date(currentUser.tenant.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                                        if (daysLeft < 0) return 'انتهى الاشتراك';
                                        if (daysLeft === 0) return 'ينتهي اليوم';
                                        return `باقي ${daysLeft} يوم`;
                                    })()}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <nav className="p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30 font-bold'
                                        : isDarkMode
                                            ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}

                    <button
                        onClick={toggleDarkMode}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mt-4 ${isDarkMode ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        <span>{isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                    </button>

                    <button
                        onClick={() => {
                            removeToken();
                            window.location.href = '/';
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-red-500 hover:bg-red-50 hover:text-red-700 mt-8"
                    >
                        <LogOut size={20} />
                        <span>تسجيل خروج</span>
                    </button>

                    {!isAdmin && (
                        <div className="mt-4 p-4 bg-slate-100 rounded-xl text-center">
                            <p className="text-xs text-slate-500">حساب محدود الصلاحية</p>
                        </div>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className={`h-16 border-b md:hidden flex items-center justify-between px-4 shrink-0 sticky top-0 z-20 shadow-sm ${isDarkMode ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                        <img 
                            src={currentUser?.tenant?.logo ? `${api.defaults.baseURL}/${currentUser.tenant.logo}` : logo} 
                            alt="Logo" 
                            className="h-8 w-auto object-contain" 
                        />
                        <h1 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {currentUser?.tenant?.name || "Dental Clinic"}
                        </h1>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 active:bg-slate-100 transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div >
    );
}

// Protected Route Component
// Protected Route Component
const AdminRoute = ({ children }) => {
    const token = getToken();
    let role = 'doctor';
    try {
        if (token) {
            const decoded = parseJwt(token);
            role = decoded.role || 'doctor';
        }
    } catch (e) { }

    if (role !== 'admin' && role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }
    return children;
};

// Protected Route Component for Super Admin
const SuperAdminRoute = ({ children }) => {
    const token = getToken();
    let role = 'doctor';
    try {
        if (token) {
            const decoded = parseJwt(token);
            role = decoded.role || 'doctor';
        }
    } catch (e) { }

    if (role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }
    return children;
};

function App() {
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const isAuthenticated = !!getToken();

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

    if (!isAuthenticated) {
        return (
            <Router>
                <Routes>
                    <Route path="/register" element={<RegisterClinic isDarkMode={darkMode} />} />
                    <Route path="*" element={<Login isDarkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
                </Routes>
            </Router>
        );
    }

    return (
        <Router>
            <Routes>
                {/* Print Routes (No Layout) */}
                <Route path="/print/invoice/:id" element={<PrintInvoice />} />
                <Route path="/print/rx/:id" element={<PrintRx />} />

                {/* App Routes */}
                <Route path="*" element={
                    <Layout toggleDarkMode={toggleDarkMode} isDarkMode={darkMode}>
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/patients" element={<Patients />} />
                            <Route path="/patients/:id" element={<PatientDetails />} />
                            <Route path="/appointments" element={<Appointments />} />

                            {/* Admin Protected Routes */}
                            <Route path="/billing" element={<AdminRoute><Billing /></AdminRoute>} />
                            <Route path="/expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
                            <Route path="/users" element={<AdminRoute><UsersManager /></AdminRoute>} />
                            <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
                            
                            {/* Super Admin Route */}
                            <Route path="/admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />

                            <Route path="*" element={<Dashboard />} />
                        </Routes>
                    </Layout>
                } />
            </Routes>
        </Router>
    )
}

export default App
