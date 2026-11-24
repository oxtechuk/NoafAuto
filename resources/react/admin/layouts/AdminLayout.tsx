import React, { useState, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Car,
    Bookmark,
    ListFilter,
    Tag,
    FolderOpen,
    Layers,
    Cpu,
    Sparkles,
    ShieldCheck,
    BadgePercent,
    Users,
    Calculator,
    Share2,
    Mail,
    ShoppingBag,
    CheckSquare,
    UserCheck,
    Shield,
    BarChart3,
    FileText,
    Palette,
    Handshake,
    MessageSquare,
    HelpCircle,
    PanelTop,
    Image,
    Grid3X3,
    ListOrdered,
    DollarSign,
    Languages,
    Settings,
    Blocks,
    Sliders,
    LogOut,
    Menu,
    X,
    Bell,
    ChevronDown,
    ChevronUp,
    Search,
    Zap,
    Hourglass,
    CheckCircle2,
    FolderX,
    RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { BrandingProvider, useBranding, useThemeShield } from '../context/BrandingContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { TenantLogo } from '../../shared/components/branding/TenantLogo';

interface NavItem {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    perm?: string;
    badge?: number | string;
}

interface NavGroup {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    perm?: string;
    items: NavItem[];
}

const AdminLayoutInner: React.FC = () => {
    const { user, logout, can, hasRole } = useAuth();
    const isAdmin = user?.role === 'admin' || hasRole('admin');

    // Same query key as UpdatesPage, so both share one cached result.
    const { data: updateStatus } = useQuery({
        queryKey: ['admin', 'system', 'updates'],
        queryFn: async (): Promise<{ has_update: boolean; latest_version: string; active_run: unknown | null }> =>
            (await apiClient.get('/system/updates')).data.data,
        enabled: isAdmin,
        staleTime: 1000 * 60 * 30,
        retry: false,
    });
    const { branding } = useBranding();
    const { safeMode, setSafeMode } = useThemeShield();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // State for open accordion groups
    const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
        'g-catalog': true,
        'g-clients': false,
        'g-sales': false,
        'g-team': false,
        'g-reports': false,
        'g-content': false,
    });

    const toggleGroup = (groupId: string) => {
        setOpenGroups((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    // Navigation groups definition covering all 34 modules
    const navGroups: NavGroup[] = useMemo(
        () => [
            {
                id: 'g-catalog',
                label: 'الكتالوج والأسطول',
                icon: Car,
                perm: 'manage-cars',
                items: [
                    { label: 'السيارات', path: '/admin/cars', icon: Car, perm: 'manage-cars' },
                    { label: 'الماركات التجارية', path: '/admin/catalog/brands', icon: Bookmark, perm: 'manage-brands' },
                    { label: 'الموديلات', path: '/admin/catalog/models', icon: ListFilter, perm: 'manage-cars' },
                    { label: 'أنواع الماركات', path: '/admin/catalog/brand-types', icon: Layers, perm: 'manage-brands' },
                    { label: 'تصنيفات السيارات', path: '/admin/catalog/categories', icon: FolderOpen, perm: 'manage-cars' },
                    { label: 'أنواع الهياكل', path: '/admin/catalog/types', icon: Tag, perm: 'manage-cars' },
                    { label: 'المواصفات الفنية', path: '/admin/catalog/specs', icon: Cpu, perm: 'manage-specifications' },
                    { label: 'المميزات والكماليات', path: '/admin/catalog/features', icon: Sparkles, perm: 'manage-features' },
                    { label: 'ميزات السلامة', path: '/admin/catalog/safety', icon: ShieldCheck, perm: 'manage-safety-features' },
                    { label: 'العروض الترويجية', path: '/admin/catalog/offers', icon: BadgePercent, perm: 'manage-offers' },
                ],
            },
            {
                id: 'g-clients',
                label: 'إدارة العملاء',
                icon: Users,
                perm: 'manage-leads',
                items: [
                    { label: 'العملاء المحتملين', path: '/admin/leads', icon: Users, perm: 'manage-leads' },
                    { label: 'عملاء الحاسبة', path: '/admin/leads/calculator', icon: Calculator, perm: 'manage-leads' },
                    { label: 'مصادر التواصل', path: '/admin/leads/sources', icon: Share2, perm: 'manage-leads' },
                    { label: 'مشتركو النشرة', path: '/admin/leads/newsletter', icon: Mail, perm: 'manage-leads' },
                ],
            },
            {
                id: 'g-sales',
                label: 'المبيعات',
                icon: ShoppingBag,
                perm: 'manage-bookings',
                items: [
                    { label: 'الطلبات النشطة', path: '/admin/bookings', icon: Zap, perm: 'manage-bookings' },
                    { label: 'طلبات قيد الانتظار', path: '/admin/sales/bookings/pending', icon: Hourglass, perm: 'manage-bookings' },
                    { label: 'طلبات تم التسليم', path: '/admin/sales/bookings/delivered', icon: CheckCircle2, perm: 'manage-bookings' },
                    { label: 'طلبات الإغلاق', path: '/admin/sales/bookings/closed', icon: FolderX, perm: 'manage-bookings' },
                    { label: 'تتبع الحالات (Kanban)', path: '/admin/sales/tracking', icon: Layers, perm: 'manage-tracking' },
                    { label: 'إعدادات الحاسبة', path: '/admin/sales/calculator', icon: Calculator, perm: 'manage-calculator' },
                ],
            },
            {
                id: 'g-team',
                label: 'الفرق والمهام',
                icon: UserCheck,
                perm: 'manage-employees',
                items: [
                    { label: 'المهام اليومية', path: '/admin/tasks', icon: CheckSquare, perm: 'manage-tasks' },
                    { label: 'الموظفون', path: '/admin/employees', icon: UserCheck, perm: 'manage-employees' },
                    { label: 'الأدوار والصلاحيات', path: '/admin/roles', icon: Shield, perm: 'manage-roles' },
                ],
            },
            {
                id: 'g-reports',
                label: 'التقارير والتحليلات',
                icon: BarChart3,
                perm: 'manage-reports',
                items: [
                    { label: 'مصادر العملاء والحملات', path: '/admin/reports/sources', icon: BarChart3, perm: 'manage-reports' },
                    { label: 'المبيعات الشامل', path: '/admin/reports/bookings', icon: BarChart3, perm: 'manage-reports' },
                    { label: 'التقرير الشهري', path: '/admin/reports/monthly', icon: BarChart3, perm: 'manage-reports' },
                ],
            },
            {
                id: 'g-content',
                label: 'إدارة المحتوى (CMS)',
                icon: FileText,
                perm: 'manage-content',
                items: [
                    { label: 'المدونة', path: '/admin/content/blog', icon: FileText, perm: 'manage-blogs' },
                    { label: 'تصنيفات المقالات', path: '/admin/content/blog-categories', icon: Tag, perm: 'manage-blogs' },
                    { label: 'معرض التصاميم', path: '/admin/content/designs', icon: Palette, perm: 'manage-content' },
                    { label: 'شركاء النجاح', path: '/admin/content/partners', icon: Handshake, perm: 'manage-content' },
                    { label: 'آراء العملاء', path: '/admin/content/testimonials', icon: MessageSquare, perm: 'manage-testimonials' },
                    { label: 'الأسئلة الشائعة', path: '/admin/content/faqs', icon: HelpCircle, perm: 'manage-faqs' },
                    { label: 'أقسام الرئيسية', path: '/admin/content/home-sections', icon: PanelTop, perm: 'manage-content' },
                    { label: 'شرائح الهيرو', path: '/admin/content/hero-slides', icon: Image, perm: 'manage-content' },
                    { label: 'البطاقات الترويجية', path: '/admin/content/promo-cards', icon: Grid3X3, perm: 'manage-content' },
                    { label: 'البانرات الترويجية', path: '/admin/content/promo-banners', icon: Image, perm: 'manage-content' },
                    { label: 'خطوات التمويل', path: '/admin/content/finance-steps', icon: ListOrdered, perm: 'manage-content' },
                    { label: 'نطاقات الميزانية', path: '/admin/content/budget-ranges', icon: DollarSign, perm: 'manage-content' },
                    { label: 'إدارة الترجمة', path: '/admin/content/translations', icon: Languages, perm: 'manage-translations' },
                ],
            },
        ],
        []
    );

    // Auto-open active group based on current URL path
    React.useEffect(() => {
        navGroups.forEach((group) => {
            const hasActive = group.items.some((item) => location.pathname.startsWith(item.path));
            if (hasActive) {
                setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
            }
        });
    }, [location.pathname, navGroups]);

    // Filter items if searching in sidebar
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return navGroups;
        const q = searchQuery.toLowerCase();
        return navGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
            }))
            .filter((group) => group.items.length > 0);
    }, [navGroups, searchQuery]);

    return (
        <div className="min-h-screen bg-[var(--app-bg)] flex" dir="rtl">
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 start-0 z-50 w-64 bg-[var(--tenant-sidebar-bg)] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Brand Logo Header */}
                <div className="py-5 px-4 flex flex-col items-center justify-center relative border-b border-white/10 shrink-0 bg-black/10">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden absolute top-3 end-3 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center justify-center text-center w-full">
                        <TenantLogo size="2xl" variant="dark" className="drop-shadow-sm hover:scale-105 transition-transform" />
                        <span className="text-[11px] font-bold text-[var(--tenant-secondary)] mt-2 tracking-wider">
                            إدارة السيارات والتمويل
                        </span>
                    </div>
                </div>

                {/* Sidebar Quick Search */}
                <div className="px-3 pt-3 pb-1 shrink-0">
                    <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="بحث سريع في القائمة..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full ps-8 pe-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-[var(--tenant-primary)] focus:bg-white/10 transition-colors"
                        />
                    </div>
                </div>

                {/* Scrollable Navigation List */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
                    {/* Standalone Dashboard Link */}
                    <NavLink
                        to="/admin"
                        end
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive
                                ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`
                        }
                    >
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        <span>لوحة التحكم الرئيسية</span>
                    </NavLink>

                    {/* Accordion Groups */}
                    {filteredGroups.map((group) => {
                        const GroupIcon = group.icon;
                        const isOpen = openGroups[group.id] || Boolean(searchQuery.trim());
                        const hasActiveChild = group.items.some((item) =>
                            location.pathname.startsWith(item.path)
                        );

                        return (
                            <div key={group.id} className="pt-1.5">
                                {/* Group Toggle Button */}
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors ${hasActiveChild
                                        ? 'text-white bg-white/5'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <GroupIcon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{group.label}</span>
                                    </div>
                                    <div className="flex items-center">
                                        {isOpen ? (
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        ) : (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                </button>

                                {/* Group Sub-items List */}
                                {isOpen && (
                                    <ul className="mt-1 ps-3 space-y-0.5 border-s border-white/10 ms-4">
                                        {group.items.map((item) => {
                                            const ItemIcon = item.icon;
                                            return (
                                                <li key={item.path}>
                                                    <NavLink
                                                        to={item.path}
                                                        onClick={() => setSidebarOpen(false)}
                                                        className={({ isActive }) =>
                                                            `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive
                                                                ? 'bg-[var(--tenant-primary)] text-white shadow-xs font-semibold'
                                                                : 'text-slate-300/80 hover:text-white hover:bg-white/10'
                                                            }`
                                                        }
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                                            <span className="truncate">{item.label}</span>
                                                        </div>
                                                        {item.badge !== undefined && (
                                                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--tenant-secondary)] text-[var(--tenant-primary)] font-bold">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </NavLink>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        );
                    })}

                    {/* System Modules Link */}
                    <div className="pt-2 border-t border-white/10 mt-2">
                        <NavLink
                            to="/admin/modules"
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive
                                    ? 'bg-[var(--tenant-primary)] text-white shadow-xs font-semibold'
                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`
                            }
                        >
                            <Blocks className="h-4 w-4 shrink-0" />
                            <span>الموديولات والأنظمة</span>
                        </NavLink>
                    </div>
                </nav>

                {/* Sidebar Footer: System Settings, Integrations & User Profile */}
                <div className="p-3 border-t border-white/10 shrink-0 space-y-1">
                    <NavLink
                        to="/admin/settings"
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive
                                ? 'bg-white/15 text-white font-semibold'
                                : 'text-slate-300/80 hover:text-white hover:bg-white/10'
                            }`
                        }
                    >
                        <Settings className="h-3.5 w-3.5 shrink-0" />
                        <span>إعدادات النظام</span>
                    </NavLink>

                    {isAdmin && (
                        <NavLink
                            to="/admin/updates"
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive
                                    ? 'bg-white/15 text-white font-semibold'
                                    : 'text-slate-300/80 hover:text-white hover:bg-white/10'
                                }`
                            }
                        >
                            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1">تحديثات النظام</span>
                            {updateStatus?.active_run ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white">جاري</span>
                            ) : updateStatus?.has_update ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                                    v{updateStatus.latest_version}
                                </span>
                            ) : null}
                        </NavLink>
                    )}

                    <div className="flex items-center gap-2.5 px-2.5 py-2 mt-2 rounded-lg bg-black/30 border border-white/5">
                        <div className="h-8 w-8 rounded-full bg-[var(--tenant-primary)] flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{user?.role || 'Admin'}</p>
                        </div>
                        <button
                            onClick={logout}
                            title="تسجيل الخروج"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-[var(--surface-primary)] border-b border-[var(--border-default)] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-2xs">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="primary" className="hidden sm:inline-flex">
                            v2.0 Enterprise
                        </Badge>
                        <button
                            title="الإشعارات"
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] relative transition-colors"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-[var(--tenant-primary)]"></span>
                        </button>
                        <div className="h-6 w-px bg-[var(--border-default)] hidden sm:block"></div>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                            <span className="font-semibold text-xs">{user?.name}</span>
                            <Badge variant="neutral">{user?.role || 'Super Admin'}</Badge>
                        </div>
                    </div>
                </header>

                {/* Safe Mode Alert Banner */}
                {safeMode && (
                    <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-sm z-20">
                        <div className="flex items-center gap-2">
                            <span className="font-bold">🛡️ وضع الأمان (Safe Mode) مفعّل:</span>
                            <span className="hidden sm:inline">
                                تم تعطيل تخصيصات الـ Child Theme وأكواد الـ CSS المخصصة لحماية لوحة التحكم من أي تعطل.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSafeMode(false)}
                            className="px-2.5 py-1 bg-white text-amber-800 rounded-md font-bold text-[11px] hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
                        >
                            إلغاء وضع الأمان
                        </button>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <ErrorBoundary moduleName="محتوى لوحة التحكم">
                        <Outlet />
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
};

export const AdminLayout: React.FC = () => {
    return (
        <BrandingProvider>
            <AdminLayoutInner />
        </BrandingProvider>
    );
};
