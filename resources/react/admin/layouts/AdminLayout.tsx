import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarCheck,
    CheckSquare,
    Car,
    UserCheck,
    BarChart3,
    Settings,
    Blocks,
    LogOut,
    Menu,
    X,
    Bell,
    ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';

export const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = [
        { label: 'لوحة التحكم', path: '/admin', icon: LayoutDashboard },
        { label: 'العملاء المحتملين', path: '/admin/leads', icon: Users, perm: 'manage-leads' },
        { label: 'الحجوزات والطلبات', path: '/admin/bookings', icon: CalendarCheck, perm: 'manage-bookings' },
        { label: 'المهام اليومية', path: '/admin/tasks', icon: CheckSquare, perm: 'manage-tasks' },
        { label: 'كتالوج السيارات', path: '/admin/cars', icon: Car, perm: 'manage-cars' },
        { label: 'الموظفون والأدوار', path: '/admin/employees', icon: UserCheck, perm: 'manage-employees' },
        { label: 'التقارير والتحليلات', path: '/admin/reports', icon: BarChart3, perm: 'manage-reports' },
        { label: 'إعدادات النظام', path: '/admin/settings', icon: Settings, perm: 'manage-settings' },
        { label: 'نظام الموديولات', path: '/admin/modules', icon: Blocks },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex" dir="rtl">
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 start-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                }`}
            >
                {/* Brand */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            S
                        </div>
                        <div>
                            <span className="font-bold text-white text-base tracking-wide">Sitekit CRM</span>
                            <span className="block text-[10px] text-indigo-400 font-medium">Tameed Pro Edition</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/admin'}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                                    }`
                                }
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="p-3 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
                        <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-sm">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{user?.role || 'User'}</p>
                        </div>
                        <button
                            onClick={logout}
                            title="تسجيل الخروج"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-2xs">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <h2 className="text-base font-bold text-slate-800 hidden sm:block">
                            نظام إدارة تعميد (Tameed Core)
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="primary" className="hidden sm:inline-flex">
                            v1.0.0 Stable
                        </Badge>
                        <button
                            title="الإشعارات"
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 relative transition-colors"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-indigo-600"></span>
                        </button>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="font-semibold text-xs">{user?.name}</span>
                            <Badge variant="slate">{user?.role}</Badge>
                        </div>
                    </div>
                </header>

                {/* Page View */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
