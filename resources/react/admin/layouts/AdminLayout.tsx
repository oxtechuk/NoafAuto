import React, { useState, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
    Bot,
    MessageCircle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { switchAdminLanguage } from '../../i18n';
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
    const { t, i18n } = useTranslation('admin');
    const isEn = i18n.language === 'en';
    const queryClient = useQueryClient();
    const { user, logout, can, hasRole } = useAuth();
    const isAdmin = user?.role === 'admin' || hasRole('admin');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const notifRef = React.useRef<HTMLDivElement>(null);
    const seenStorageKey = `admin_notif_seen_${user?.id ?? 'guest'}`;
    const [seenNotifs, setSeenNotifs] = useState<{ tasks: number[]; bookings: number[] }>(() => {
        try {
            const raw = localStorage.getItem(`admin_notif_seen_${user?.id ?? 'guest'}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
                    bookings: Array.isArray(parsed?.bookings) ? parsed.bookings : [],
                };
            }
        } catch {
            // ignore storage errors
        }
        return { tasks: [], bookings: [] };
    });

    React.useEffect(() => {
        try {
            const raw = localStorage.getItem(seenStorageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                setSeenNotifs({
                    tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
                    bookings: Array.isArray(parsed?.bookings) ? parsed.bookings : [],
                });
            }
        } catch {
            // ignore
        }
    }, [seenStorageKey]);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { data: notifSummary } = useQuery({
        queryKey: ['admin', 'notifications', 'summary'],
        queryFn: async () => {
            const res = await apiClient.get('/notifications/summary');
            return res.data?.data as {
                today_tasks: Array<{ id: number; title: string; priority: string; due_date?: string; assigned_to_name?: string }>;
                new_bookings: Array<{ id: number; client_name: string; client_phone?: string; car_name?: string; created_at?: string }>;
                counts: { today_tasks: number; new_bookings: number; total: number };
            };
        },
        refetchInterval: 60 * 1000,
        staleTime: 30 * 1000,
    });

    const unreadTasksCount = useMemo(() => {
        if (!notifSummary) return 0;
        const seenSet = new Set(seenNotifs.tasks);
        const unseenInList = notifSummary.today_tasks.filter((t) => !seenSet.has(t.id)).length;
        const extraBeyondList = Math.max(0, (notifSummary.counts.today_tasks ?? 0) - notifSummary.today_tasks.length);
        const allListSeen = notifSummary.today_tasks.length > 0 && unseenInList === 0;
        return allListSeen ? 0 : unseenInList + extraBeyondList;
    }, [notifSummary, seenNotifs.tasks]);

    const unreadBookingsCount = useMemo(() => {
        if (!notifSummary) return 0;
        const seenSet = new Set(seenNotifs.bookings);
        const unseenInList = notifSummary.new_bookings.filter((b) => !seenSet.has(b.id)).length;
        const extraBeyondList = Math.max(0, (notifSummary.counts.new_bookings ?? 0) - notifSummary.new_bookings.length);
        const allListSeen = notifSummary.new_bookings.length > 0 && unseenInList === 0;
        return allListSeen ? 0 : unseenInList + extraBeyondList;
    }, [notifSummary, seenNotifs.bookings]);

    const unreadTotal = unreadTasksCount + unreadBookingsCount;

    const handleMarkAllNotifsRead = () => {
        if (!notifSummary) return;
        const next = {
            tasks: Array.from(new Set([...seenNotifs.tasks, ...notifSummary.today_tasks.map((t) => t.id)])),
            bookings: Array.from(new Set([...seenNotifs.bookings, ...notifSummary.new_bookings.map((b) => b.id)])),
        };
        setSeenNotifs(next);
        try {
            localStorage.setItem(seenStorageKey, JSON.stringify(next));
        } catch {
            // ignore
        }
    };

    const handleLanguageToggle = async () => {
        const nextLang = isEn ? 'ar' : 'en';
        await switchAdminLanguage(nextLang);
        await queryClient.invalidateQueries();
    };

    // Same query key as UpdatesPage, so both share one cached result.
    const { data: updateStatus } = useQuery({
        queryKey: ['admin', 'system', 'updates'],
        queryFn: async (): Promise<{ has_update: boolean; latest_version: string; active_run: unknown | null }> =>
            (await apiClient.get('/system/updates')).data.data,
        enabled: isAdmin,
        staleTime: 1000 * 60 * 30,
        retry: false,
    });

    // Same query key as ModulesPage, so enabling/disabling a module updates the sidebar.
    const { data: modules } = useQuery({
        queryKey: ['admin', 'modules'],
        queryFn: async () => (await apiClient.get('/modules')).data?.data,
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
    const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = { 'ai-assistant': Bot, whatsapp: MessageCircle };

    // Build module links: admins see all enabled modules; employees see enabled modules they have permission for (never settings).
    const enabledModuleLinks: { path: string; label: string; icon: React.ComponentType<{ className?: string }>; unread?: number }[] = (Array.isArray(modules) ? modules : [])
        .filter((m: any) => m.enabled && m.admin?.path && (isAdmin || (can(`manage-module-${m.key}`) && !String(m.admin.path).includes('settings'))))
        .flatMap((m: any) => {
            const icon = MODULE_ICONS[m.key] ?? Blocks;
            if (m.key === 'whatsapp') {
                return [
                    { path: '/admin/whatsapp/conversations', label: t('nav.items.whatsapp_conversations'), icon: MessageCircle },
                ];
            }
            if (m.key === 'ai-assistant') {
                return [{ path: m.admin.path, label: t('nav.items.ai_assistant'), icon }];
            }
            return [{ path: m.admin.path, label: m.admin.label ?? m.name, icon }];
        });
    const { branding } = useBranding();
    const { safeMode, setSafeMode } = useThemeShield();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // State for open accordion groups (smart single-open accordion)
    const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});

    const toggleGroup = (groupId: string) => {
        setOpenGroups((prev) => (prev[groupId] ? {} : { [groupId]: true }));
    };

    // Navigation groups definition covering all modules
    const navGroups: NavGroup[] = useMemo(
        () => [
            {
                id: 'g-catalog',
                label: t('nav.groups.catalog'),
                icon: Car,
                perm: 'manage-cars',
                items: [
                    { label: t('nav.items.cars'), path: '/admin/cars', icon: Car, perm: 'manage-cars' },
                    { label: t('nav.items.brands'), path: '/admin/catalog/brands', icon: Bookmark, perm: 'manage-brands' },
                    { label: t('nav.items.models'), path: '/admin/catalog/models', icon: ListFilter, perm: 'manage-cars' },
                    { label: t('nav.items.brand_types'), path: '/admin/catalog/brand-types', icon: Layers, perm: 'manage-brands' },
                    { label: t('nav.items.categories'), path: '/admin/catalog/categories', icon: FolderOpen, perm: 'manage-cars' },
                    { label: t('nav.items.types'), path: '/admin/catalog/types', icon: Tag, perm: 'manage-cars' },
                    { label: t('nav.items.specs'), path: '/admin/catalog/specs', icon: Cpu, perm: 'manage-specifications' },
                    { label: t('nav.items.features'), path: '/admin/catalog/features', icon: Sparkles, perm: 'manage-features' },
                    { label: t('nav.items.safety'), path: '/admin/catalog/safety', icon: ShieldCheck, perm: 'manage-safety-features' },
                    { label: t('nav.items.offers'), path: '/admin/catalog/offers', icon: BadgePercent, perm: 'manage-offers' },
                ],
            },
            {
                id: 'g-clients',
                label: t('nav.groups.clients'),
                icon: Users,
                perm: 'manage-leads',
                items: [
                    { label: t('nav.items.leads'), path: '/admin/leads', icon: Users, perm: 'manage-leads' },
                    { label: t('nav.items.calculator_leads'), path: '/admin/leads/calculator', icon: Calculator, perm: 'manage-leads' },
                    { label: t('nav.items.contact_sources'), path: '/admin/leads/sources', icon: Share2, perm: 'manage-leads' },
                    { label: t('nav.items.newsletter'), path: '/admin/leads/newsletter', icon: Mail, perm: 'manage-leads' },
                ],
            },
            {
                id: 'g-sales',
                label: t('nav.groups.sales'),
                icon: ShoppingBag,
                perm: 'manage-bookings',
                items: [
                    { label: t('nav.items.bookings_active'), path: '/admin/bookings', icon: Zap, perm: 'manage-bookings' },
                    { label: t('nav.items.bookings_pending'), path: '/admin/sales/bookings/pending', icon: Hourglass, perm: 'manage-bookings' },
                    { label: t('nav.items.bookings_delivered'), path: '/admin/sales/bookings/delivered', icon: CheckCircle2, perm: 'manage-bookings' },
                    { label: t('nav.items.bookings_closed'), path: '/admin/sales/bookings/closed', icon: FolderX, perm: 'manage-bookings' },
                    { label: t('nav.items.tracking'), path: '/admin/sales/tracking', icon: Layers, perm: 'manage-tracking' },
                    { label: t('nav.items.calculator_settings'), path: '/admin/sales/calculator', icon: Calculator, perm: 'manage-calculator' },
                ],
            },
            {
                id: 'g-team',
                label: t('nav.groups.team'),
                icon: UserCheck,
                perm: 'manage-employees',
                items: [
                    { label: t('nav.items.tasks'), path: '/admin/tasks', icon: CheckSquare, perm: 'manage-tasks' },
                    { label: t('nav.items.employees'), path: '/admin/employees', icon: UserCheck, perm: 'manage-employees' },
                    { label: t('nav.items.roles'), path: '/admin/roles', icon: Shield, perm: 'manage-roles' },
                ],
            },
            {
                id: 'g-reports',
                label: t('nav.groups.reports'),
                icon: BarChart3,
                items: [
                    { label: t('nav.items.reports_overview'), path: '/admin/reports/overview', icon: BarChart3 },
                    { label: t('nav.items.reports_team'), path: '/admin/reports/team', icon: BarChart3 },
                    { label: t('nav.items.reports_cars'), path: '/admin/reports/cars', icon: BarChart3 },
                    { label: t('nav.items.reports_channels'), path: '/admin/reports/channels', icon: BarChart3 },
                    { label: t('nav.items.reports_trend'), path: '/admin/reports/trend', icon: BarChart3 },
                ],
            },
            {
                id: 'g-content',
                label: t('nav.groups.content'),
                icon: FileText,
                perm: 'manage-content',
                items: [
                    { label: t('nav.items.privacy_policy', { defaultValue: 'سياسة الخصوصية' }), path: '/admin/content/privacy-policy', icon: ShieldCheck, perm: 'manage-content' },
                    { label: t('nav.items.terms_conditions', { defaultValue: 'الشروط والأحكام' }), path: '/admin/content/terms-conditions', icon: FileText, perm: 'manage-content' },
                    { label: t('nav.items.blog'), path: '/admin/content/blog', icon: FileText, perm: 'manage-blogs' },
                    { label: t('nav.items.blog_categories'), path: '/admin/content/blog-categories', icon: Tag, perm: 'manage-blogs' },
                    { label: t('nav.items.designs'), path: '/admin/content/designs', icon: Palette, perm: 'manage-content' },
                    { label: t('nav.items.partners'), path: '/admin/content/partners', icon: Handshake, perm: 'manage-content' },
                    { label: t('nav.items.testimonials'), path: '/admin/content/testimonials', icon: MessageSquare, perm: 'manage-testimonials' },
                    { label: t('nav.items.faqs'), path: '/admin/content/faqs', icon: HelpCircle, perm: 'manage-faqs' },
                    { label: t('nav.items.home_sections'), path: '/admin/content/home-sections', icon: PanelTop, perm: 'manage-content' },
                    { label: t('nav.items.hero_slides'), path: '/admin/content/hero-slides', icon: Image, perm: 'manage-content' },
                    { label: t('nav.items.promo_cards'), path: '/admin/content/promo-cards', icon: Grid3X3, perm: 'manage-content' },
                    { label: t('nav.items.promo_banners'), path: '/admin/content/promo-banners', icon: Image, perm: 'manage-content' },
                    { label: t('nav.items.finance_steps'), path: '/admin/content/finance-steps', icon: ListOrdered, perm: 'manage-content' },
                    { label: t('nav.items.budget_ranges'), path: '/admin/content/budget-ranges', icon: DollarSign, perm: 'manage-content' },
                    { label: t('nav.items.translations'), path: '/admin/content/translations', icon: Languages, perm: 'manage-translations' },
                ],
            },
        ],
        [t]
    );

    // Auto-open only the active group based on current URL path (closes others automatically)
    React.useEffect(() => {
        const activeGroup = navGroups.find((group) =>
            group.items.some((item) => location.pathname.startsWith(item.path))
        );
        setOpenGroups(activeGroup ? { [activeGroup.id]: true } : {});
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
        <div className="min-h-screen bg-[var(--app-bg)] flex" dir={isEn ? 'ltr' : 'rtl'}>
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`print:hidden fixed lg:sticky lg:top-0 lg:h-screen lg:shrink-0 inset-y-0 start-0 z-50 w-64 bg-[var(--tenant-sidebar-bg)] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : (isEn ? '-translate-x-full lg:translate-x-0' : 'translate-x-full lg:translate-x-0')
                    }`}
            >
                {/* Brand Logo Header */}
                <div className="py-3.5 px-4 flex flex-col items-center justify-center relative border-b border-white/10 shrink-0 bg-black/10">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden absolute top-3 end-3 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center justify-center text-center w-full">
                        <TenantLogo size="lg" variant="dark" className="drop-shadow-sm hover:scale-105 transition-transform" />
                        {Boolean((window as any).__ADMIN_SETTINGS__?.login_subtitle?.trim()) && (
                            <span className="text-[11px] font-bold text-[var(--tenant-secondary)] mt-1.5 tracking-wider">
                                {(window as any).__ADMIN_SETTINGS__.login_subtitle}
                            </span>
                        )}
                    </div>
                </div>

                {/* Sidebar Quick Search */}
                <div className="px-3 pt-3 pb-1 shrink-0">
                    <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('nav.quick_search')}
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
                        <span>{t('nav.dashboard')}</span>
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
                    {(isAdmin || enabledModuleLinks.length > 0) && (
                    <div className="pt-2 border-t border-white/10 mt-2">
                        {isAdmin && (
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
                            <span>{t('nav.items.modules')}</span>
                        </NavLink>
                        )}

                        {/* Pages of enabled modules (each module declares admin.path / admin.label in module.json) */}
                        {enabledModuleLinks.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg text-xs font-medium transition-colors ${isActive
                                        ? 'bg-[var(--tenant-primary)] text-white shadow-xs font-semibold'
                                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                                    }`
                                }
                            >
                                <link.icon className="h-4 w-4 shrink-0" />
                                <span>{link.label}</span>
                            </NavLink>
                        ))}
                    </div>
                    )}
                </nav>

                {/* Sidebar Footer: System Settings (Admin Only) & User Profile */}
                <div className="p-3 border-t border-white/10 shrink-0 space-y-1">
                    {isAdmin && (
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
                        <span>{t('nav.items.settings')}</span>
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
                            title={t('nav.logout')}
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
                <header className="print:hidden h-16 bg-[var(--surface-primary)] border-b border-[var(--border-default)] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-2xs">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                    </div>

                    <div className="flex items-center gap-3">
                        {/* Flag Language Switcher */}
                        <button
                            type="button"
                            onClick={handleLanguageToggle}
                            title={t('header.switch_lang_title')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)]/60 hover:bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                            <span className="text-base leading-none">{isEn ? '🇸🇦' : '🇺🇸'}</span>
                            <span className="hidden sm:inline">{isEn ? t('header.switch_to_ar') : t('header.switch_to_en')}</span>
                        </button>
                        <div className="relative" ref={notifRef}>
                            <button
                                type="button"
                                onClick={() => setNotificationsOpen((prev) => !prev)}
                                title={t('header.notifications')}
                                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] relative transition-colors cursor-pointer"
                            >
                                <Bell className="h-5 w-5" />
                                {unreadTotal > 0 ? (
                                    <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                                        {unreadTotal > 99 ? '99+' : unreadTotal}
                                    </span>
                                ) : null}
                            </button>

                            {notificationsOpen && (
                                <div className="absolute end-0 mt-2 w-80 sm:w-96 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-xl z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between gap-2 bg-[var(--surface-secondary)]/50">
                                        <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                            <Bell className="h-4 w-4 text-[var(--tenant-primary)]" />
                                            <span>{t('header.notifications')}</span>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]">
                                                {unreadTotal}
                                            </span>
                                        </span>
                                        {unreadTotal > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleMarkAllNotifsRead}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span>{t('header.mark_all_read')}</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border-default)]">
                                        {(notifSummary?.counts?.total ?? 0) === 0 ? (
                                            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                                                {t('header.notif_empty')}
                                            </div>
                                        ) : (
                                            <>
                                                {(notifSummary?.today_tasks?.length ?? 0) > 0 && (
                                                    <div className="p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                                                <CheckSquare className="h-3.5 w-3.5" />
                                                                <span>{t('header.notif_today_tasks')} ({notifSummary!.counts.today_tasks})</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setNotificationsOpen(false); navigate('/admin/tasks?view=today'); }}
                                                                className="text-[11px] font-semibold text-[var(--tenant-primary)] hover:underline cursor-pointer"
                                                            >
                                                                {t('header.notif_view_tasks')}
                                                            </button>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {notifSummary!.today_tasks.map((task) => (
                                                                <button
                                                                    key={task.id}
                                                                    type="button"
                                                                    onClick={() => { setNotificationsOpen(false); navigate('/admin/tasks?view=today'); }}
                                                                    className="w-full text-start p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/70 transition-colors cursor-pointer"
                                                                >
                                                                    <div className="text-xs font-semibold text-slate-800 truncate">{task.title}</div>
                                                                    {task.assigned_to_name && (
                                                                        <div className="text-[10px] text-amber-700 mt-0.5">{task.assigned_to_name}</div>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {(notifSummary?.new_bookings?.length ?? 0) > 0 && (
                                                    <div className="p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-[var(--tenant-primary)] flex items-center gap-1">
                                                                <Zap className="h-3.5 w-3.5" />
                                                                <span>{t('header.notif_new_bookings')} ({notifSummary!.counts.new_bookings})</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setNotificationsOpen(false); navigate('/admin/bookings'); }}
                                                                className="text-[11px] font-semibold text-[var(--tenant-primary)] hover:underline cursor-pointer"
                                                            >
                                                                {t('header.notif_view_bookings')}
                                                            </button>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {notifSummary!.new_bookings.map((bk) => (
                                                                <button
                                                                    key={bk.id}
                                                                    type="button"
                                                                    onClick={() => { setNotificationsOpen(false); navigate('/admin/bookings'); }}
                                                                    className="w-full text-start p-2 rounded-lg bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 transition-colors cursor-pointer"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-xs font-semibold text-slate-800 truncate">{bk.client_name}</span>
                                                                        <span className="text-[10px] font-bold text-slate-400">#{bk.id}</span>
                                                                    </div>
                                                                    {bk.car_name && (
                                                                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{bk.car_name}</div>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-6 w-px bg-[var(--border-default)] hidden sm:block"></div>
                        <div className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
                            <span className="font-semibold text-xs">{user?.name}</span>
                            <button
                                type="button"
                                onClick={logout}
                                title={t('nav.logout')}
                                className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t('nav.logout')}</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Safe Mode Alert Banner */}
                {safeMode && (
                    <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-sm z-20">
                        <div className="flex items-center gap-2">
                            <span className="font-bold">{t('header.safe_mode_title')}</span>
                            <span className="hidden sm:inline">
                                {t('header.safe_mode_desc')}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSafeMode(false)}
                            className="px-2.5 py-1 bg-white text-amber-800 rounded-md font-bold text-[11px] hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
                        >
                            {t('header.safe_mode_disable')}
                        </button>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <ErrorBoundary moduleName={t('header.page_content_error')}>
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
