import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Settings as SettingsIcon,
    Save,
    Building2,
    Palette,
    Phone,
    Share2,
    Hourglass,
    Megaphone,
    Calculator,
    Cpu,
    Upload,
    CheckCircle2,
    AlertCircle,
    Plus,
    Trash2,
    X,
    ExternalLink,
    Images,
    BarChart3,
    Car,
    Tag,
    Info,
    CalendarCheck,
    MapPin,
    Clock,
    FileText,
    Sparkles,
    TrendingUp,
    CheckSquare,
    Layers,
    Sliders,
    RefreshCw,
    Lock,
    Eye,
    Blocks,
    Rocket,
    Server,
    ShieldCheck,
} from 'lucide-react';
import { useThemeShield } from '../context/BrandingContext';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    ModuleSettingsRenderer,
    SKIPPED_SETTINGS_MODULES,
    type AdminModuleDescriptor,
} from './settings/ModuleSettingsRegistry';

const UpdatesPanel = React.lazy(() => import('./UpdatesPage').then((m) => ({ default: m.UpdatesPage })));
const InfrastructurePanel = React.lazy(() => import('./settings/InfrastructurePanel'));
const ThemeShieldPanel = React.lazy(() => import('./settings/ThemeShieldPanel').then((m) => ({ default: m.ThemeShieldPanel })));

type TabKey =
    | 'basic'
    | 'appearance'
    | 'contact'
    | 'loader'
    | 'popup'
    | 'gallery'
    | 'homepage_stats'
    | 'finance_stats'
    | 'cars_hero'
    | 'cars_ads'
    | 'offers_hero'
    | 'about_sections'
    | 'about_stats'
    | 'about_branches'
    | 'booking_hero'
    | 'booking_steps'
    | 'booking_sections'
    | 'financial'
    | 'integrations'
    | 'updates'
    | 'infrastructure'
    | 'theme_shield'
    | `module:${string}`;

interface SocialItem {
    icon: string;
    color: string;
    link: string;
}

interface FooterLinkItem {
    title: { ar: string; en: string };
    url: string;
}

interface StatItem {
    value: string;
    label: string;
}

interface BranchItem {
    city: string;
    name: string;
    address: string;
    phone: string;
    working_hours: string;
    map_link: string;
}

interface BookingStepItem {
    icon: string;
    title: { ar: string; en: string };
    description: { ar: string; en: string };
}

export const SettingsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    const { can, hasRole } = useAuth();
    const canManage = can('manage-settings');
    const isAdmin = hasRole('admin');
    const { safeMode, setSafeMode, resetToFactoryDefaults } = useThemeShield();
    const location = useLocation();
    const isCmsMode = location.pathname.startsWith('/admin/content/');
    const [searchParams, setSearchParams] = useSearchParams();

    const initialTab = (searchParams.get('tab') as TabKey) || (isCmsMode ? 'gallery' : 'basic');
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

    useEffect(() => {
        const paramTab = searchParams.get('tab') as TabKey | null;
        if (paramTab && paramTab !== activeTab) {
            setActiveTab(paramTab);
        }
    }, [searchParams]);

    // Fetch enabled modules so their settings appear automatically inside Site Settings (excluding skipped modules)
    const { data: modulesData } = useQuery({
        queryKey: ['admin', 'modules'],
        queryFn: async (): Promise<AdminModuleDescriptor[]> => (await apiClient.get('/modules')).data?.data || [],
        enabled: isAdmin && !isCmsMode,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const autoSettingsModules = useMemo(
        () =>
            (Array.isArray(modulesData) ? modulesData : []).filter(
                (m) => m.enabled && !SKIPPED_SETTINGS_MODULES.has(m.key)
            ),
        [modulesData]
    );

    const [settings, setSettings] = useState<Record<string, any>>({});
    const [socialMedia, setSocialMedia] = useState<SocialItem[]>([]);
    const [footerQuickLinks, setFooterQuickLinks] = useState<FooterLinkItem[]>([]);
    const [footerServiceLinks, setFooterServiceLinks] = useState<FooterLinkItem[]>([]);
    const [homepageStats, setHomepageStats] = useState<StatItem[]>([]);
    const [financeStats, setFinanceStats] = useState<StatItem[]>([]);
    const [aboutStats, setAboutStats] = useState<StatItem[]>([]);
    const [aboutBranches, setAboutBranches] = useState<BranchItem[]>([]);
    const [bookingSteps, setBookingSteps] = useState<BookingStepItem[]>([]);
    const [mainGallery, setMainGallery] = useState<string[]>([]);

    const [fileUploads, setFileUploads] = useState<Record<string, File>>({});
    const [galleryUploads, setGalleryUploads] = useState<File[]>([]);
    const [openAboutSection, setOpenAboutSection] = useState<string>('hero');
    const [openBookingSection, setOpenBookingSection] = useState<string>('hero');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const parseJsonOrArray = (val: any): any[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const parseJsonOrObject = (val: any): Record<string, any> => {
        if (!val) return {};
        if (typeof val === 'object' && !Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
            } catch {
                return {};
            }
        }
        return {};
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<any>('/api/v1/settings');
            const data = res.data?.data || res.data || {};
            setSettings(typeof data === 'object' && data !== null ? data : {});

            setSocialMedia(parseJsonOrArray(data.social_media));
            setFooterQuickLinks(parseJsonOrArray(data.footer_quick_links));
            setFooterServiceLinks(parseJsonOrArray(data.footer_service_links));
            setHomepageStats(parseJsonOrArray(data.homepage_stats));
            setFinanceStats(parseJsonOrArray(data.finance_stats));
            setAboutStats(parseJsonOrArray(data.about_stats));
            setAboutBranches(parseJsonOrArray(data.about_branches));
            setBookingSteps(parseJsonOrArray(data.store_booking_steps));
            setMainGallery(parseJsonOrArray(data.main_gallery));
        } catch (err: any) {
            console.error('Failed to load settings', err);
            setStatusMessage({ type: 'error', text: t('settings.load_error') });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const handleChange = (key: string, value: any) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleNestedChange = (parentKey: string, subKey: string, value: any) => {
        setSettings((prev) => {
            const parentObj = parseJsonOrObject(prev[parentKey]);
            return {
                ...prev,
                [parentKey]: {
                    ...parentObj,
                    [subKey]: value,
                },
            };
        });
    };

    const handleDeepChange = (parentKey: string, sectionKey: string, fieldKey: string, locale: 'ar' | 'en' | 'plain', value: any) => {
        setSettings((prev) => {
            const parentObj = parseJsonOrObject(prev[parentKey]);
            const sectionObj = parseJsonOrObject(parentObj[sectionKey]);
            if (locale === 'plain') {
                return {
                    ...prev,
                    [parentKey]: {
                        ...parentObj,
                        [sectionKey]: {
                            ...sectionObj,
                            [fieldKey]: value,
                        },
                    },
                };
            }
            const fieldObj = parseJsonOrObject(sectionObj[fieldKey]);
            return {
                ...prev,
                [parentKey]: {
                    ...parentObj,
                    [sectionKey]: {
                        ...sectionObj,
                        [fieldKey]: {
                            ...fieldObj,
                            [locale]: value,
                        },
                    },
                },
            };
        });
    };

    const handleFileChange = (key: string, file: File | null) => {
        if (file) {
            setFileUploads((prev) => ({ ...prev, [key]: file }));
        }
    };

    const handleDeleteGalleryImage = async (imagePath: string) => {
        if (!confirm(t('settings.confirm_delete_image'))) return;
        try {
            await apiClient.put('/api/v1/settings', {
                delete_gallery_image: imagePath,
            });
            setMainGallery((prev) => prev.filter((p) => p !== imagePath));
            setStatusMessage({ type: 'success', text: t('settings.delete_image_success') });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err: any) {
            console.error('Delete image error', err);
            setStatusMessage({ type: 'error', text: t('settings.delete_image_error') });
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        setStatusMessage(null);

        try {
            const hasFiles = Object.keys(fileUploads).length > 0 || galleryUploads.length > 0;
            const payloadSettings = {
                ...settings,
                social_media: socialMedia,
                footer_quick_links: footerQuickLinks,
                footer_service_links: footerServiceLinks,
                homepage_stats: homepageStats,
                finance_stats: financeStats,
                about_stats: aboutStats,
                about_branches: aboutBranches,
                store_booking_steps: bookingSteps,
            };

            if (hasFiles) {
                const fd = new FormData();
                fd.append('_method', 'PUT');
                fd.append('settings', JSON.stringify(payloadSettings));

                Object.entries(fileUploads).forEach(([k, file]) => {
                    fd.append(k, file);
                });

                galleryUploads.forEach((file) => {
                    fd.append('main_gallery[]', file);
                });

                await apiClient.post('/api/v1/settings', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await apiClient.put('/api/v1/settings', {
                    settings: payloadSettings,
                });
            }

            setStatusMessage({ type: 'success', text: t('settings.save_success') });
            setFileUploads({});
            setGalleryUploads([]);
            fetchSettings();
            setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: any) {
            console.error('Save error', err);
            setStatusMessage({
                type: 'error',
                text: err.response?.data?.message || err.message || t('settings.save_error'),
            });
        } finally {
            setSaving(false);
        }
    };

    const getDeep = (parentKey: string, sectionKey: string, fieldKey: string, locale?: 'ar' | 'en'): string => {
        const parentObj = parseJsonOrObject(settings[parentKey]);
        const sec = parseJsonOrObject(parentObj[sectionKey]);
        if (!locale) return typeof sec[fieldKey] === 'string' ? sec[fieldKey] : '';
        const field = parseJsonOrObject(sec[fieldKey]);
        return field[locale] || '';
    };

    const navSections = useMemo(() => {
        if (isCmsMode) {
            return [
                {
                    group: t('content.cms.group_home'),
                    items: [
                        { id: 'gallery', label: t('content.cms.tab_gallery'), icon: Images },
                        { id: 'homepage_stats', label: t('content.cms.tab_homepage_stats'), icon: BarChart3 },
                        { id: 'finance_stats', label: t('content.cms.tab_finance_stats'), icon: TrendingUp },
                    ],
                },
                {
                    group: t('content.cms.group_cars'),
                    items: [
                        { id: 'cars_hero', label: t('content.cms.tab_cars_hero'), icon: Car },
                        { id: 'cars_ads', label: t('content.cms.tab_cars_ads'), icon: Sparkles },
                    ],
                },
                {
                    group: t('content.cms.group_offers'),
                    items: [{ id: 'offers_hero', label: t('content.cms.tab_offers_hero'), icon: Tag }],
                },
                {
                    group: t('content.cms.group_about'),
                    items: [
                        { id: 'about_sections', label: t('content.cms.tab_about_sections'), icon: FileText },
                        { id: 'about_stats', label: t('content.cms.tab_about_stats'), icon: BarChart3 },
                        { id: 'about_branches', label: t('content.cms.tab_about_branches'), icon: MapPin },
                    ],
                },
                {
                    group: t('content.cms.group_booking'),
                    items: [
                        { id: 'booking_hero', label: t('content.cms.tab_booking_hero'), icon: CalendarCheck },
                        { id: 'booking_steps', label: t('content.cms.tab_booking_steps'), icon: CheckSquare },
                        { id: 'booking_sections', label: t('content.cms.tab_booking_sections'), icon: Layers },
                    ],
                },
            ];
        }

        return [
            {
                group: t('settings.group_general'),
                items: [
                    { id: 'basic', label: t('settings.tab_basic'), icon: Info },
                    { id: 'appearance', label: t('settings.tab_appearance'), icon: Palette },
                    { id: 'contact', label: t('settings.tab_contact'), icon: Phone },
                    { id: 'loader', label: t('settings.tab_loader'), icon: Hourglass },
                    { id: 'popup', label: t('settings.tab_popup'), icon: Megaphone },
                ],
            },
            {
                group: t('settings.group_finance_seo'),
                items: [
                    { id: 'financial', label: t('settings.tab_financial'), icon: Calculator },
                    { id: 'integrations', label: t('settings.tab_integrations'), icon: Cpu },
                ],
            },
            ...(autoSettingsModules.length > 0
                ? [
                      {
                          group: t('settings.group_modules'),
                          items: autoSettingsModules.map((m) => ({
                              id: `module:${m.key}` as TabKey,
                              label:
                                  m.key === 'ai-assistant'
                                      ? t('nav.items.ai_assistant')
                                      : m.key === 'whatsapp'
                                        ? t('nav.items.whatsapp_settings')
                                        : (m.admin?.label || m.name),
                              icon: Blocks,
                          })),
                      },
                  ]
                : []),
            ...(isAdmin
                ? [
                      {
                          group: t('settings.group_system'),
                          items: [
                              { id: 'updates', label: t('settings.tab_updates'), icon: Rocket },
                              { id: 'infrastructure', label: t('settings.tab_infrastructure'), icon: Server },
                              { id: 'theme_shield', label: t('settings.tab_theme_shield'), icon: ShieldCheck },
                          ],
                      },
                  ]
                : []),
        ];
    }, [isCmsMode, autoSettingsModules, isAdmin, t]);

    const selectedModule = useMemo(() => {
        if (!activeTab.startsWith('module:')) return null;
        const key = activeTab.slice('module:'.length);
        return autoSettingsModules.find((m) => m.key === key) ?? null;
    }, [activeTab, autoSettingsModules]);

    // Find current active label
    const activeItemLabel = useMemo(() => {
        for (const g of navSections) {
            const it = g.items.find((i) => i.id === activeTab);
            if (it) return it.label;
        }
        return isCmsMode ? t('settings.title_cms') : t('settings.tab_basic');
    }, [activeTab, navSections, isCmsMode, t]);

    return (
        <div className="space-y-6">
            {/* Top Page Title */}
            <div>
                <h4 className="text-xl font-bold text-[var(--text-primary)]">
                    {isCmsMode ? t('settings.title_cms') : t('settings.title')}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {isCmsMode ? t('settings.subtitle_cms') : t('settings.subtitle')}
                </p>
            </div>

            {statusMessage && (
                <div
                    className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
                        statusMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                >
                    {statusMessage.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {/* 3-Column Layout: Right Navigation | Center Content | Left Save Sidebar */}
            <div className="flex flex-col lg:flex-row items-start gap-5">
                {/* ========================================================== */}
                {/* 1. RIGHT NAVIGATION SIDEBAR                               */}
                {/* ========================================================== */}
                <div className="w-full lg:w-64 shrink-0">
                    <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl shadow-xs overflow-hidden sticky top-20 p-2">
                        {navSections.map((group, gIdx) => (
                            <div key={gIdx} className="mb-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 m-0">
                                    {group.group}
                                </p>
                                <nav className="flex flex-col gap-0.5">
                                    {group.items.map((item) => {
                                        const ItemIcon = item.icon;
                                        const isActive = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => switchTab(item.id as TabKey)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-start ${
                                                    isActive
                                                        ? 'bg-rose-50 text-[var(--tenant-primary)] font-bold shadow-2xs'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                                }`}
                                            >
                                                <ItemIcon className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* 2. CENTER CONTENT CARD                                     */}
                {/* ========================================================== */}
                <div className="flex-1 w-full min-w-0">
                    <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl shadow-xs overflow-hidden">
                        {selectedModule ? (
                            <ModuleSettingsRenderer module={selectedModule} />
                        ) : activeTab === 'updates' ? (
                            isAdmin ? (
                                <div className="p-6">
                                    <React.Suspense fallback={<div className="py-20 text-center text-slate-400 text-xs">{t('common.loading')}</div>}>
                                        <UpdatesPanel embedded />
                                    </React.Suspense>
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-400 text-xs">{t('settings.admin_only_section')}</div>
                            )
                        ) : activeTab === 'infrastructure' ? (
                            isAdmin ? (
                                <React.Suspense fallback={<div className="py-20 text-center text-slate-400 text-xs">{t('common.loading')}</div>}>
                                    <InfrastructurePanel />
                                </React.Suspense>
                            ) : (
                                <div className="py-20 text-center text-slate-400 text-xs">{t('settings.admin_only_section')}</div>
                            )
                        ) : activeTab === 'theme_shield' ? (
                            isAdmin ? (
                                <div className="p-6">
                                    <React.Suspense fallback={<div className="py-20 text-center text-slate-400 text-xs">{t('common.loading')}</div>}>
                                        <ThemeShieldPanel />
                                    </React.Suspense>
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-400 text-xs">{t('settings.admin_only_section')}</div>
                            )
                        ) : loading ? (
                            <div className="py-20 text-center text-slate-400 text-xs">
                                {t('settings.loading_settings')}
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="p-6 space-y-6">
                                {/* TAB: 1. Basic Info */}
                                {activeTab === 'basic' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('settings.basic.title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('settings.basic.subtitle')}</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    {t('settings.basic.site_name_ar')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        typeof settings.site_name === 'object'
                                                            ? settings.site_name?.ar || ''
                                                            : settings.site_name || ''
                                                    }
                                                    onChange={(e) =>
                                                        handleChange('site_name', {
                                                            ...(typeof settings.site_name === 'object' ? settings.site_name : {}),
                                                            ar: e.target.value,
                                                        })
                                                    }
                                                    placeholder={t('settings.basic.site_name_ar_ph')}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0 focus:outline-hidden focus:ring-1 focus:ring-[var(--tenant-primary)]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    {t('settings.basic.site_name_en')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        typeof settings.site_name === 'object'
                                                            ? settings.site_name?.en || ''
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        handleChange('site_name', {
                                                            ...(typeof settings.site_name === 'object' ? settings.site_name : {}),
                                                            en: e.target.value,
                                                        })
                                                    }
                                                    placeholder="e.g. Zed Capital"
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0 focus:outline-hidden focus:ring-1 focus:ring-[var(--tenant-primary)]"
                                                    dir="ltr"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    {t('settings.basic.footer_text')}
                                                </label>
                                                <textarea
                                                    value={
                                                        typeof settings.footer_text === 'object'
                                                            ? settings.footer_text?.ar || ''
                                                            : settings.footer_text || ''
                                                    }
                                                    onChange={(e) => handleChange('footer_text', e.target.value)}
                                                    rows={3}
                                                    placeholder={t('settings.basic.footer_text_ph')}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0 focus:outline-hidden focus:ring-1 focus:ring-[var(--tenant-primary)]"
                                                />
                                            </div>

                                            <div className="sm:col-span-2 p-4 bg-slate-100/70 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-xs text-slate-800">
                                                        {t('settings.basic.auto_assign')}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        {t('settings.basic.auto_assign_desc')}
                                                    </p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(settings.auto_assign_bookings == '1' || settings.auto_assign_bookings === true)}
                                                    onChange={(e) => handleChange('auto_assign_bookings', e.target.checked ? '1' : '0')}
                                                    className="h-4 w-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)] cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 2. Appearance */}
                                {activeTab === 'appearance' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('settings.appearance.title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('settings.appearance.subtitle')}</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Header Logo */}
                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.header_logo')}</span>
                                                <div className="h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2">
                                                    {fileUploads.site_logo ? (
                                                        <span className="text-xs text-emerald-600 font-semibold truncate">{fileUploads.site_logo.name}</span>
                                                    ) : settings.site_logo ? (
                                                        <img src={`/storage/${settings.site_logo}`} alt="Header Logo" className="max-h-full object-contain" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">{t('settings.appearance.no_logo')}</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange('site_logo', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                            </div>

                                            {/* Footer Logo */}
                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.footer_logo')}</span>
                                                <div className="h-16 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-2">
                                                    {fileUploads.footer_logo ? (
                                                        <span className="text-xs text-emerald-400 font-semibold truncate">{fileUploads.footer_logo.name}</span>
                                                    ) : settings.footer_logo ? (
                                                        <img src={`/storage/${settings.footer_logo}`} alt="Footer Logo" className="max-h-full object-contain" />
                                                    ) : (
                                                        <span className="text-xs text-slate-500">{t('settings.appearance.no_logo')}</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange('footer_logo', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                            </div>

                                            {/* Favicon / Mobile Home Icon */}
                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.favicon')}</span>
                                                    <span className="text-[10px] text-amber-600 font-medium">{t('settings.appearance.mobile_home_btn')}</span>
                                                </div>
                                                <div className="h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-2">
                                                    {fileUploads.site_favicon ? (
                                                        <span className="text-xs text-emerald-600 font-semibold truncate">{fileUploads.site_favicon.name}</span>
                                                    ) : settings.site_favicon ? (
                                                        <img
                                                            src={settings.site_favicon.startsWith('http') ? settings.site_favicon : `/storage/${settings.site_favicon.replace(/^\/?storage\//, '')}`}
                                                            alt="Favicon"
                                                            className="h-8 w-8 object-contain"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">32x32 / PNG</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/x-icon,image/svg+xml,image/webp,image/*,.ico,.png"
                                                    onChange={(e) => handleFileChange('site_favicon', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                                <p className="text-[10px] text-slate-400 leading-tight">
                                                    {t('settings.appearance.favicon_hint')}
                                                </p>
                                            </div>

                                            {/* Breadcrumb Background */}
                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.breadcrumb_bg')}</span>
                                                <div className="h-16 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                                                    {fileUploads.breadcrumb_bg ? (
                                                        <span className="text-xs text-emerald-400 font-semibold">{fileUploads.breadcrumb_bg.name}</span>
                                                    ) : settings.breadcrumb_bg ? (
                                                        <img src={`/storage/${settings.breadcrumb_bg}`} alt="Breadcrumb" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-slate-500">1920x400 px</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange('breadcrumb_bg', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                            </div>

                                            {/* Default Car Image */}
                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.default_car_image')}</span>
                                                <div className="h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                                    {fileUploads.default_car_image ? (
                                                        <span className="text-xs text-emerald-600 font-semibold">{fileUploads.default_car_image.name}</span>
                                                    ) : settings.default_car_image ? (
                                                        <img src={`/storage/${settings.default_car_image}`} alt="Default Car" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">{t('settings.appearance.default_image_ph')}</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange('default_car_image', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                            </div>

                                            {/* Floating Request Car Icon */}
                                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.request_car_icon')}</span>
                                                <div className="h-16 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-2">
                                                    {fileUploads.request_car_icon ? (
                                                        <span className="text-xs text-emerald-400 font-semibold">{fileUploads.request_car_icon.name}</span>
                                                    ) : settings.request_car_icon ? (
                                                        <img src={`/storage/${settings.request_car_icon}`} alt="Request Icon" className="h-8 w-8 object-contain" />
                                                    ) : (
                                                        <span className="text-xs text-slate-500">SVG / PNG</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*,.svg"
                                                    onChange={(e) => handleFileChange('request_car_icon', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Admin Login & Sidebar Branding */}
                                        <div className="pt-6 border-t border-slate-200/80 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h5 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                                                        <Lock className="w-4 h-4 text-[var(--tenant-primary)]" />
                                                        {t('settings.appearance.admin_branding_title')}
                                                    </h5>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {t('settings.appearance.admin_branding_sub')}
                                                    </p>
                                                </div>
                                                <a
                                                    href="/admin/login"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    {t('settings.appearance.preview_login')}
                                                </a>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {/* Login Background Image */}
                                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                    <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.login_bg')}</span>
                                                    <div className="h-20 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                                                        {fileUploads.admin_login_bg ? (
                                                            <span className="text-xs text-emerald-400 font-semibold truncate px-2">{fileUploads.admin_login_bg.name}</span>
                                                        ) : settings.admin_login_bg ? (
                                                            <img
                                                                src={settings.admin_login_bg.startsWith('http') ? settings.admin_login_bg : `/storage/${settings.admin_login_bg.replace(/^\/?storage\//, '')}`}
                                                                alt="Login Background"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-slate-500">{t('settings.appearance.login_bg_default')}</span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange('admin_login_bg', e.target.files?.[0] || null)}
                                                        className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                    />
                                                    <p className="text-[10px] text-slate-400">{t('settings.appearance.login_bg_hint')}</p>
                                                </div>

                                                {/* Login Page Logo */}
                                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                    <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.login_logo')}</span>
                                                    <div className="h-20 rounded-lg bg-[var(--tenant-primary)] border border-slate-200 flex items-center justify-center p-2">
                                                        {fileUploads.admin_login_logo ? (
                                                            <span className="text-xs text-emerald-300 font-semibold truncate px-2">{fileUploads.admin_login_logo.name}</span>
                                                        ) : settings.admin_login_logo ? (
                                                            <img
                                                                src={settings.admin_login_logo.startsWith('http') ? settings.admin_login_logo : `/storage/${settings.admin_login_logo.replace(/^\/?storage\//, '')}`}
                                                                alt="Login Logo"
                                                                className="max-h-full object-contain"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-white/70">{t('settings.appearance.login_logo_default')}</span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange('admin_login_logo', e.target.files?.[0] || null)}
                                                        className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                    />
                                                    <p className="text-[10px] text-slate-400">{t('settings.appearance.login_logo_hint')}</p>
                                                </div>

                                                {/* Admin Sidebar Logo */}
                                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                                    <span className="block text-xs font-semibold text-slate-700">{t('settings.appearance.sidebar_logo')}</span>
                                                    <div className="h-20 rounded-lg bg-[var(--tenant-sidebar-bg)] border border-slate-800 flex items-center justify-center p-2">
                                                        {fileUploads.admin_sidebar_logo ? (
                                                            <span className="text-xs text-emerald-300 font-semibold truncate px-2">{fileUploads.admin_sidebar_logo.name}</span>
                                                        ) : settings.admin_sidebar_logo ? (
                                                            <img
                                                                src={settings.admin_sidebar_logo.startsWith('http') ? settings.admin_sidebar_logo : `/storage/${settings.admin_sidebar_logo.replace(/^\/?storage\//, '')}`}
                                                                alt="Sidebar Logo"
                                                                className="max-h-full object-contain"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-white/70">{t('settings.appearance.sidebar_logo_default')}</span>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange('admin_sidebar_logo', e.target.files?.[0] || null)}
                                                        className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                    />
                                                    <p className="text-[10px] text-slate-400">{t('settings.appearance.sidebar_logo_hint')}</p>
                                                </div>
                                            </div>

                                            {/* Login Title & Subtitle Texts */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-slate-700">
                                                        {t('settings.appearance.login_title_label')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={settings.admin_login_title ?? ''}
                                                        onChange={(e) => handleChange('admin_login_title', e.target.value)}
                                                        placeholder={t('settings.appearance.login_title_ph')}
                                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:border-[var(--tenant-primary)]"
                                                    />
                                                    <p className="text-[10px] text-amber-700 leading-tight">
                                                        {t('settings.appearance.login_title_hint')}
                                                    </p>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-slate-700">
                                                        {t('settings.appearance.login_subtitle_label')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={settings.admin_login_subtitle ?? ''}
                                                        onChange={(e) => handleChange('admin_login_subtitle', e.target.value)}
                                                        placeholder={t('settings.appearance.login_subtitle_ph')}
                                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:border-[var(--tenant-primary)]"
                                                    />
                                                    <p className="text-[10px] text-slate-400 leading-tight">
                                                        {t('settings.appearance.login_subtitle_hint')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 2.5 درع الثيم والتخصيص الآمن (Theme Shield & Child Theme) */}
                                {activeTab === 'theme_shield' && (
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-default)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <ShieldCheck className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-base text-[var(--text-primary)]">
                                                        درع الثيم والتخصيص الآمن (Child Theme & Safe Mode Shield)
                                                    </h5>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                                        نظام عزل وتخصيص ذكي يتيح لك تعديل ألوان وستايل المتجر دون التأثير على لوحة التحكم أو التسبب في كراش
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                                    safeMode ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                }`}>
                                                    {safeMode ? (
                                                        <>
                                                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                                            <span>الوضع الآمن نشط (Safe Mode ON)</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>درع الحماية نشط</span>
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* زر الطوارئ: الوضع الآمن */}
                                        <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                                                    <span className="font-bold text-sm text-amber-900">الوضع الآمن لحالات الطوارئ (Safe Mode)</span>
                                                </div>
                                                <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                                                    عند تفعيل الوضع الآمن، يتم إيقاف وتجاوز جميع أكواد الـ CSS والتخصيصات فوراً وإعادة لوحة التحكم والمتجر للوضع الافتراضي الخام. استخدم هذا الخيار إذا حدث أي خطأ بصري أثناء التعديل.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = !safeMode;
                                                        setSafeMode(next);
                                                        handleChange('theme_safe_mode', next);
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                        safeMode
                                                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                                    }`}
                                                >
                                                    {safeMode ? 'تعطيل الوضع الآمن' : 'تفعيل الوضع الآمن الآن'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* نطاق تطبيق التخصيصات */}
                                        <div className="pt-5 border-t border-[var(--border-default)]">
                                            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                                                نطاق تطبيق التخصيصات (Scope Isolation)
                                            </label>
                                            <p className="text-xs text-[var(--text-secondary)] mb-3">
                                                اختر أين يتم تطبيق التعديلات والألوان وأكواد الـ CSS المخصصة لحماية لوحة التحكم من أي تداخل
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <label className={`relative flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                                                    (settings['theme_child_target_scope'] || 'store_only') === 'store_only'
                                                        ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-slate-300'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="theme_child_target_scope"
                                                        value="store_only"
                                                        checked={(settings['theme_child_target_scope'] || 'store_only') === 'store_only'}
                                                        onChange={(e) => handleChange('theme_child_target_scope', e.target.value)}
                                                        className="sr-only"
                                                    />
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-xs text-[var(--text-primary)]">المتجر والواجهة فقط</span>
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">مستحسن (Safe)</span>
                                                    </div>
                                                    <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                                        يطبق التعديلات على صفحات المتجر فقط ويعزل لوحة التحكم بالكامل لحمايتها 100% من أي خطأ
                                                    </span>
                                                </label>

                                                <label className={`relative flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                                                    settings['theme_child_target_scope'] === 'both'
                                                        ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500'
                                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-slate-300'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="theme_child_target_scope"
                                                        value="both"
                                                        checked={settings['theme_child_target_scope'] === 'both'}
                                                        onChange={(e) => handleChange('theme_child_target_scope', e.target.value)}
                                                        className="sr-only"
                                                    />
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-xs text-[var(--text-primary)]">المتجر + لوحة التحكم</span>
                                                    </div>
                                                    <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                                        يطبق الألوان والـ CSS على كامل المنصة والداشبورد مع تشغيل درع الحماية التلقائي
                                                    </span>
                                                </label>

                                                <label className={`relative flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                                                    settings['theme_child_target_scope'] === 'admin_only'
                                                        ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500'
                                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-slate-300'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="theme_child_target_scope"
                                                        value="admin_only"
                                                        checked={settings['theme_child_target_scope'] === 'admin_only'}
                                                        onChange={(e) => handleChange('theme_child_target_scope', e.target.value)}
                                                        className="sr-only"
                                                    />
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-xs text-[var(--text-primary)]">لوحة التحكم فقط</span>
                                                    </div>
                                                    <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                                        تخصيص هوية وألوان لوحة التحكم مع بقاء المتجر على تصميمه الأساسي
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* تفعيل الثيم الفرعي */}
                                        <div className="pt-5 border-t border-[var(--border-default)] flex items-center justify-between">
                                            <div>
                                                <label className="text-xs font-bold text-[var(--text-primary)] block">
                                                    تفعيل نظام الثيم الفرعي (Enable Child Theme Layer)
                                                </label>
                                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                                    طبقة غير مدمرة تدمج التعديلات والألوان فوق الثيم الأساسي دون تعديل ملفات الكود الأصلية
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!settings['theme_child_enabled']}
                                                    onChange={(e) => handleChange('theme_child_enabled', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--tenant-primary)]"></div>
                                            </label>
                                        </div>

                                        {/* متغيرات التصميم والألوان */}
                                        <div className="pt-5 border-t border-[var(--border-default)] space-y-4">
                                            <h6 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider text-slate-400">
                                                متغيرات التصميم والألوان للثيم الفرعي (Design Tokens)
                                            </h6>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                                                        اللون الأساسي (Primary)
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={settings['theme_child_primary_color'] || '#092C29'}
                                                            onChange={(e) => handleChange('theme_child_primary_color', e.target.value)}
                                                            className="w-9 h-9 rounded-lg border border-[var(--border-default)] cursor-pointer p-0.5"
                                                        />
                                                        <input
                                                            type="text"
                                                            dir="ltr"
                                                            value={settings['theme_child_primary_color'] || '#092C29'}
                                                            onChange={(e) => handleChange('theme_child_primary_color', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] text-xs font-mono"
                                                            placeholder="#092C29"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                                                        اللون الثانوي (Secondary)
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={settings['theme_child_secondary_color'] || '#D5F52B'}
                                                            onChange={(e) => handleChange('theme_child_secondary_color', e.target.value)}
                                                            className="w-9 h-9 rounded-lg border border-[var(--border-default)] cursor-pointer p-0.5"
                                                        />
                                                        <input
                                                            type="text"
                                                            dir="ltr"
                                                            value={settings['theme_child_secondary_color'] || '#D5F52B'}
                                                            onChange={(e) => handleChange('theme_child_secondary_color', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] text-xs font-mono"
                                                            placeholder="#D5F52B"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                                                        لون التمييز (Accent)
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={settings['theme_child_accent_color'] || '#D5F52B'}
                                                            onChange={(e) => handleChange('theme_child_accent_color', e.target.value)}
                                                            className="w-9 h-9 rounded-lg border border-[var(--border-default)] cursor-pointer p-0.5"
                                                        />
                                                        <input
                                                            type="text"
                                                            dir="ltr"
                                                            value={settings['theme_child_accent_color'] || '#D5F52B'}
                                                            onChange={(e) => handleChange('theme_child_accent_color', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] text-xs font-mono"
                                                            placeholder="#D5F52B"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                                                        خلفية القائمة (Sidebar BG)
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={settings['theme_child_sidebar_bg_color'] || '#0D3B37'}
                                                            onChange={(e) => handleChange('theme_child_sidebar_bg_color', e.target.value)}
                                                            className="w-9 h-9 rounded-lg border border-[var(--border-default)] cursor-pointer p-0.5"
                                                        />
                                                        <input
                                                            type="text"
                                                            dir="ltr"
                                                            value={settings['theme_child_sidebar_bg_color'] || '#0D3B37'}
                                                            onChange={(e) => handleChange('theme_child_sidebar_bg_color', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] text-xs font-mono"
                                                            placeholder="#0D3B37"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                                                        انحناء الحواف للعناصر (Border Radius)
                                                    </label>
                                                    <select
                                                        value={settings['theme_child_border_radius'] || '12px'}
                                                        onChange={(e) => handleChange('theme_child_border_radius', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] text-xs bg-[var(--surface-primary)]"
                                                    >
                                                        <option value="6px">صغير حاد (6px)</option>
                                                        <option value="8px">متوسط قياسي (8px)</option>
                                                        <option value="12px">منحني عصري (12px - افتراضي)</option>
                                                        <option value="16px">كبير ناعم (16px)</option>
                                                        <option value="24px">دائري فائق (24px)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* أكواد CSS المخصصة المعزولة */}
                                        <div className="pt-5 border-t border-[var(--border-default)] space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-[var(--text-primary)] block">
                                                    أكواد CSS المخصصة المعزولة (Scoped Custom CSS)
                                                </label>
                                                <span className="text-[10px] text-slate-400">
                                                    مفلترة تلقائياً لحماية لوحة التحكم
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                يمكنك كتابة قواعد CSS إضافية هنا. يتم تغليفها وفلترتها تلقائياً لحماية بنية لوحة التحكم.
                                            </p>
                                            <textarea
                                                rows={6}
                                                dir="ltr"
                                                value={settings['theme_child_custom_css'] || ''}
                                                onChange={(e) => handleChange('theme_child_custom_css', e.target.value)}
                                                placeholder={`/* اكتب أكواد CSS الإضافية هنا */\n.custom-hero-banner {\n    box-shadow: 0 10px 25px rgba(0,0,0,0.05);\n}`}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-mono bg-slate-900 text-emerald-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                            />
                                        </div>

                                        {/* استعادة ضبط المصنع */}
                                        <div className="pt-5 border-t border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h6 className="font-bold text-xs text-rose-700">استعادة ضبط المصنع للثيم</h6>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    إلغاء تفعيل الثيم الفرعي ومسح أكواد الـ CSS المخصصة واسترجاع الهوية الأصلية الافتراضية فوراً
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm('هل أنت متأكد من رغبتك في إعادة ضبط ثيم النظام إلى الإعدادات الافتراضية الأصلية؟')) {
                                                        resetToFactoryDefaults();
                                                    }
                                                }}
                                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-1.5 shrink-0"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                استعادة ضبط المصنع للثيم
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 3. Contact & Social */}
                                {activeTab === 'contact' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('settings.contact.title')}</h5>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.contact.email')}</label>
                                                <input
                                                    type="email"
                                                    value={settings.contact_email || ''}
                                                    onChange={(e) => handleChange('contact_email', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                    dir="ltr"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.contact.phone')}</label>
                                                <input
                                                    type="text"
                                                    value={settings.contact_phone || ''}
                                                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                    dir="ltr"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.contact.whatsapp')}</label>
                                                <input
                                                    type="text"
                                                    value={settings.contact_whatsapp || ''}
                                                    onChange={(e) => handleChange('contact_whatsapp', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                    dir="ltr"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.contact.address')}</label>
                                                <input
                                                    type="text"
                                                    value={typeof settings.contact_address === 'object' ? settings.contact_address?.ar || '' : settings.contact_address || ''}
                                                    onChange={(e) => handleChange('contact_address', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                />
                                            </div>
                                        </div>

                                        {/* Floating Widgets Configuration */}
                                        <div className="pt-4 border-t space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h6 className="font-bold text-xs text-slate-800">الأزرار العائمة على الموقع (Floating Action Widgets)</h6>
                                                    <p className="text-[11px] text-slate-500">أزرار "تواصل معنا" (بأيقونة المنصة والبادج الأحمر) و"واتساب" الثابتة على شاشات الديسكتوب</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(settings.floating_widgets_enabled !== false && settings.floating_widgets_enabled !== '0')}
                                                        onChange={(e) => handleChange('floating_widgets_enabled', e.target.checked ? '1' : '0')}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--tenant-primary)]"></div>
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">رقم واتساب للزر العائم (اختياري)</label>
                                                    <input
                                                        type="text"
                                                        value={settings.floating_whatsapp || ''}
                                                        onChange={(e) => handleChange('floating_whatsapp', e.target.value)}
                                                        placeholder="مثال: 966550000000 (يستخدم رقم واتساب العام إن ترك فارغاً)"
                                                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الاتصال المباشر لزر "تواصل معنا" (اختياري)</label>
                                                    <input
                                                        type="text"
                                                        value={settings.floating_contact_phone || ''}
                                                        onChange={(e) => handleChange('floating_contact_phone', e.target.value)}
                                                        placeholder="مثال: 920018657 (يستخدم هاتف التواصل إن ترك فارغاً)"
                                                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        dir="ltr"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">رسالة واتساب الترحيبية التلقائية</label>
                                                <input
                                                    type="text"
                                                    value={settings.floating_whatsapp_message || ''}
                                                    onChange={(e) => handleChange('floating_whatsapp_message', e.target.value)}
                                                    placeholder="مرحباً نواف أوتو، أود الاستفسار عن تفاصيل السيارات وعروض التمويل المتاحة."
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="floating_contact_badge"
                                                    checked={Boolean(settings.floating_contact_badge !== false && settings.floating_contact_badge !== '0')}
                                                    onChange={(e) => handleChange('floating_contact_badge', e.target.checked ? '1' : '0')}
                                                    className="h-4 w-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)] cursor-pointer"
                                                />
                                                <label htmlFor="floating_contact_badge" className="text-xs text-slate-700 cursor-pointer">
                                                    إظهار نقطة الإشعار الحمراء (Red Notification Badge) على زر تواصل معنا لجذب الانتباه
                                                </label>
                                            </div>
                                        </div>

                                        {/* Social Links */}
                                        <div className="space-y-3 pt-3 border-t">
                                            <div className="flex items-center justify-between">
                                                <h6 className="font-bold text-xs text-slate-800">{t('settings.contact.social_links')}</h6>
                                                <button
                                                    type="button"
                                                    onClick={() => setSocialMedia([...socialMedia, { icon: 'bi-facebook', color: '#1877F2', link: '' }])}
                                                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                                >
                                                    {t('settings.contact.add_btn')}
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {socialMedia.map((sm, idx) => (
                                                    <div key={idx} className="p-2.5 bg-slate-100/70 rounded-xl flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={sm.icon}
                                                            onChange={(e) => {
                                                                const cp = [...socialMedia];
                                                                cp[idx].icon = e.target.value;
                                                                setSocialMedia(cp);
                                                            }}
                                                            placeholder="bi-facebook"
                                                            className="w-28 px-2 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            dir="ltr"
                                                        />
                                                        <input
                                                            type="color"
                                                            value={sm.color || '#333333'}
                                                            onChange={(e) => {
                                                                const cp = [...socialMedia];
                                                                cp[idx].color = e.target.value;
                                                                setSocialMedia(cp);
                                                            }}
                                                            className="h-8 w-10 p-0.5 rounded-lg border border-slate-200 bg-white cursor-pointer"
                                                        />
                                                        <input
                                                            type="url"
                                                            value={sm.link}
                                                            onChange={(e) => {
                                                                const cp = [...socialMedia];
                                                                cp[idx].link = e.target.value;
                                                                setSocialMedia(cp);
                                                            }}
                                                            placeholder="https://..."
                                                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            dir="ltr"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setSocialMedia(socialMedia.filter((_, i) => i !== idx))}
                                                            className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Footer Quick Links */}
                                        <div className="space-y-3 pt-3 border-t">
                                            <div className="flex items-center justify-between">
                                                <h6 className="font-bold text-xs text-slate-800">{t('settings.contact.footer_quick_links')}</h6>
                                                <button
                                                    type="button"
                                                    onClick={() => setFooterQuickLinks([...footerQuickLinks, { title: { ar: '', en: '' }, url: '' }])}
                                                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                                >
                                                    {t('settings.contact.add_btn')}
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {footerQuickLinks.map((fql, idx) => (
                                                    <div key={idx} className="p-2.5 bg-slate-100/70 rounded-xl flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={fql.title?.ar || ''}
                                                            onChange={(e) => {
                                                                const cp = [...footerQuickLinks];
                                                                cp[idx].title = { ...cp[idx].title, ar: e.target.value };
                                                                setFooterQuickLinks(cp);
                                                            }}
                                                            placeholder={t('settings.contact.title_ar_ph')}
                                                            className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={fql.title?.en || ''}
                                                            onChange={(e) => {
                                                                const cp = [...footerQuickLinks];
                                                                cp[idx].title = { ...cp[idx].title, en: e.target.value };
                                                                setFooterQuickLinks(cp);
                                                            }}
                                                            placeholder="Title (EN)"
                                                            className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            dir="ltr"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={fql.url}
                                                            onChange={(e) => {
                                                                const cp = [...footerQuickLinks];
                                                                cp[idx].url = e.target.value;
                                                                setFooterQuickLinks(cp);
                                                            }}
                                                            placeholder="/about"
                                                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            dir="ltr"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setFooterQuickLinks(footerQuickLinks.filter((_, i) => i !== idx))}
                                                            className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Footer Service Links */}
                                        <div className="space-y-3 pt-3 border-t">
                                            <div className="flex items-center justify-between">
                                                <h6 className="font-bold text-xs text-slate-800">{t('settings.contact.footer_service_links')}</h6>
                                                <button
                                                    type="button"
                                                    onClick={() => setFooterServiceLinks([...footerServiceLinks, { title: { ar: '', en: '' }, url: '' }])}
                                                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                                >
                                                    {t('settings.contact.add_btn')}
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {footerServiceLinks.map((fsl, idx) => (
                                                    <div key={idx} className="p-2.5 bg-slate-100/70 rounded-xl flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={fsl.title?.ar || ''}
                                                            onChange={(e) => {
                                                                const cp = [...footerServiceLinks];
                                                                cp[idx].title = { ...cp[idx].title, ar: e.target.value };
                                                                setFooterServiceLinks(cp);
                                                            }}
                                                            placeholder={t('settings.contact.title_ar_ph')}
                                                            className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={fsl.title?.en || ''}
                                                            onChange={(e) => {
                                                                const cp = [...footerServiceLinks];
                                                                cp[idx].title = { ...cp[idx].title, en: e.target.value };
                                                                setFooterServiceLinks(cp);
                                                            }}
                                                            placeholder="Title (EN)"
                                                            className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            dir="ltr"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={fsl.url}
                                                            onChange={(e) => {
                                                                const cp = [...footerServiceLinks];
                                                                cp[idx].url = e.target.value;
                                                                setFooterServiceLinks(cp);
                                                            }}
                                                            placeholder="/calculator"
                                                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            dir="ltr"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setFooterServiceLinks(footerServiceLinks.filter((_, i) => i !== idx))}
                                                            className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 4. Page Loader */}
                                {activeTab === 'loader' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('settings.loader.title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('settings.loader.subtitle')}</p>
                                        </div>

                                        <div className="p-4 bg-slate-100/70 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-xs text-slate-800">{t('settings.loader.enable')}</p>
                                                <p className="text-[11px] text-slate-500">{t('settings.loader.enable_desc')}</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(settings.page_loader_enabled == '1' || settings.page_loader_enabled === true)}
                                                onChange={(e) => handleChange('page_loader_enabled', e.target.checked ? '1' : '0')}
                                                className="h-4 w-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)] cursor-pointer"
                                            />
                                        </div>

                                        <div className="max-w-sm space-y-2">
                                            <label className="block text-xs font-semibold text-slate-700">{t('settings.loader.image_label')}</label>
                                            <div className="h-24 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2">
                                                {fileUploads.page_loader_image ? (
                                                    <span className="text-xs text-emerald-400 font-semibold truncate">{fileUploads.page_loader_image.name}</span>
                                                ) : settings.page_loader_image ? (
                                                    <img src={`/storage/${settings.page_loader_image}`} alt="Loader" className="max-h-full object-contain" />
                                                ) : (
                                                    <span className="text-xs text-slate-500">{t('settings.loader.image_ph')}</span>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange('page_loader_image', e.target.files?.[0] || null)}
                                                className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 5. Promo Popup */}
                                {activeTab === 'popup' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('settings.popup.title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('settings.popup.subtitle')}</p>
                                        </div>

                                        {(() => {
                                            const promoObj = parseJsonOrObject(settings.promo_popup);
                                            return (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-slate-100/70 rounded-xl flex items-center justify-between">
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-800">{t('settings.popup.enable')}</p>
                                                            <p className="text-[11px] text-slate-500">{t('settings.popup.enable_desc')}</p>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(promoObj.enabled)}
                                                            onChange={(e) => handleNestedChange('promo_popup', 'enabled', e.target.checked)}
                                                            className="h-4 w-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)] cursor-pointer"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="sm:col-span-2 space-y-2">
                                                            <label className="block text-xs font-semibold text-slate-700">{t('settings.popup.image_label')}</label>
                                                            <div className="h-32 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                                                                {fileUploads.popup_image ? (
                                                                    <span className="text-xs text-emerald-600 font-semibold">{fileUploads.popup_image.name}</span>
                                                                ) : promoObj.image ? (
                                                                    <img src={`/storage/${promoObj.image}`} alt="Popup" className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">{t('settings.popup.no_image')}</span>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleFileChange('popup_image', e.target.files?.[0] || null)}
                                                                className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.popup.heading_label')}</label>
                                                            <input
                                                                type="text"
                                                                value={promoObj.title || ''}
                                                                onChange={(e) => handleNestedChange('promo_popup', 'title', e.target.value)}
                                                                placeholder={t('settings.popup.heading_ph')}
                                                                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.popup.btn_text_label')}</label>
                                                            <input
                                                                type="text"
                                                                value={promoObj.button_text || ''}
                                                                onChange={(e) => handleNestedChange('promo_popup', 'button_text', e.target.value)}
                                                                placeholder={t('settings.popup.btn_text_ph')}
                                                                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.popup.btn_link_label')}</label>
                                                            <input
                                                                type="text"
                                                                value={promoObj.link || ''}
                                                                onChange={(e) => handleNestedChange('promo_popup', 'link', e.target.value)}
                                                                placeholder="https://..."
                                                                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.popup.desc_label')}</label>
                                                            <textarea
                                                                value={promoObj.text || ''}
                                                                onChange={(e) => handleNestedChange('promo_popup', 'text', e.target.value)}
                                                                rows={3}
                                                                placeholder={t('settings.popup.desc_ph')}
                                                                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* TAB: 6. Main Gallery */}
                                {activeTab === 'gallery' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3 flex items-center justify-between">
                                            <div>
                                                <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.gallery_title')}</h5>
                                                <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.gallery_sub')}</p>
                                            </div>
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                                {t('content.cms.gallery_count', { count: mainGallery.length })}
                                            </span>
                                        </div>

                                        <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                                            <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                            <p className="text-xs font-bold text-slate-700">{t('content.cms.gallery_upload')}</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => setGalleryUploads(Array.from(e.target.files || []))}
                                                className="mt-2 text-xs text-slate-500 file:me-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                            />
                                            {galleryUploads.length > 0 && (
                                                <span className="text-xs text-emerald-600 font-bold mt-2">
                                                    {t('content.cms.gallery_ready', { count: galleryUploads.length })}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                            {mainGallery.map((img, idx) => (
                                                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                                                    <img src={`/storage/${img}`} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteGalleryImage(img)}
                                                        className="absolute top-1 left-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 7. Homepage Stats */}
                                {activeTab === 'homepage_stats' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3 flex items-center justify-between">
                                            <div>
                                                <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.homepage_stats_title')}</h5>
                                                <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.homepage_stats_sub')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setHomepageStats([...homepageStats, { value: '+500', label: '' }])}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                            >
                                                {t('content.cms.add_btn')}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {homepageStats.map((st, idx) => (
                                                <div key={idx} className="p-2.5 bg-slate-100/70 rounded-xl flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={st.value}
                                                        onChange={(e) => {
                                                            const cp = [...homepageStats];
                                                            cp[idx].value = e.target.value;
                                                            setHomepageStats(cp);
                                                        }}
                                                        placeholder="+500"
                                                        className="w-24 px-2.5 py-1.5 text-xs font-bold text-center rounded-lg bg-white border border-slate-200"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={st.label}
                                                        onChange={(e) => {
                                                            const cp = [...homepageStats];
                                                            cp[idx].label = e.target.value;
                                                            setHomepageStats(cp);
                                                        }}
                                                        placeholder={t('content.cms.label_ph')}
                                                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setHomepageStats(homepageStats.filter((_, i) => i !== idx))}
                                                        className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 8. Finance Stats */}
                                {activeTab === 'finance_stats' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3 flex items-center justify-between">
                                            <div>
                                                <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.finance_stats_title')}</h5>
                                                <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.finance_stats_sub')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFinanceStats([...financeStats, { value: '98%', label: '' }])}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                            >
                                                {t('content.cms.add_btn')}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {financeStats.map((st, idx) => (
                                                <div key={idx} className="p-2.5 bg-slate-100/70 rounded-xl flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={st.value}
                                                        onChange={(e) => {
                                                            const cp = [...financeStats];
                                                            cp[idx].value = e.target.value;
                                                            setFinanceStats(cp);
                                                        }}
                                                        placeholder="98%"
                                                        className="w-24 px-2.5 py-1.5 text-xs font-bold text-center rounded-lg bg-white border border-slate-200"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={st.label}
                                                        onChange={(e) => {
                                                            const cp = [...financeStats];
                                                            cp[idx].label = e.target.value;
                                                            setFinanceStats(cp);
                                                        }}
                                                        placeholder={t('content.cms.label_ph')}
                                                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFinanceStats(financeStats.filter((_, i) => i !== idx))}
                                                        className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 9. Cars Hero */}
                                {activeTab === 'cars_hero' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.cars_hero_title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.cars_hero_sub')}</p>
                                        </div>

                                        {(() => {
                                            const heroObj = parseJsonOrObject(settings.store_hero);
                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.title_ar')}</label>
                                                        <input
                                                            type="text"
                                                            value={heroObj.title?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_hero', 'title', { ...heroObj.title, ar: e.target.value })}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.title_en')}</label>
                                                        <input
                                                            type="text"
                                                            value={heroObj.title?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_hero', 'title', { ...heroObj.title, en: e.target.value })}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.desc_ar')}</label>
                                                        <textarea
                                                            value={heroObj.subtitle?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_hero', 'subtitle', { ...heroObj.subtitle, ar: e.target.value })}
                                                            rows={3}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.desc_en')}</label>
                                                        <textarea
                                                            value={heroObj.subtitle?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_hero', 'subtitle', { ...heroObj.subtitle, en: e.target.value })}
                                                            rows={3}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2 space-y-2">
                                                        <label className="block text-xs font-semibold text-slate-700">{t('content.cms.hero_image')}</label>
                                                        <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                                                            {fileUploads.cars_hero_image ? (
                                                                <span className="text-xs text-emerald-400 font-semibold">{fileUploads.cars_hero_image.name}</span>
                                                            ) : heroObj.image ? (
                                                                <img src={`/storage/${heroObj.image}`} alt="Cars Hero" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs text-slate-500">1920x600 px</span>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileChange('cars_hero_image', e.target.files?.[0] || null)}
                                                            className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* TAB: 10. Cars Hero Ads */}
                                {activeTab === 'cars_ads' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.cars_ads_title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.cars_ads_sub')}</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Ad 1 */}
                                            <div className="p-4 bg-slate-100/70 rounded-xl space-y-3">
                                                <p className="font-bold text-xs text-slate-800">{t('content.cms.ad_num', { num: 1 })}</p>
                                                <div className="h-24 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                                    {fileUploads.hero_ad_1_image ? (
                                                        <span className="text-xs text-emerald-600 font-semibold">{fileUploads.hero_ad_1_image.name}</span>
                                                    ) : settings.hero_ad_1_image ? (
                                                        <img src={`/storage/${settings.hero_ad_1_image}`} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">{t('content.cms.no_image')}</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange('hero_ad_1_image', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.link_label')}</label>
                                                    <input
                                                        type="url"
                                                        value={settings.hero_ad_1_link || ''}
                                                        onChange={(e) => handleChange('hero_ad_1_link', e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-200"
                                                        dir="ltr"
                                                    />
                                                </div>
                                            </div>

                                            {/* Ad 2 */}
                                            <div className="p-4 bg-slate-100/70 rounded-xl space-y-3">
                                                <p className="font-bold text-xs text-slate-800">{t('content.cms.ad_num', { num: 2 })}</p>
                                                <div className="h-24 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                                    {fileUploads.hero_ad_2_image ? (
                                                        <span className="text-xs text-emerald-600 font-semibold">{fileUploads.hero_ad_2_image.name}</span>
                                                    ) : settings.hero_ad_2_image ? (
                                                        <img src={`/storage/${settings.hero_ad_2_image}`} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">{t('content.cms.no_image')}</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange('hero_ad_2_image', e.target.files?.[0] || null)}
                                                    className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                />
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.link_label')}</label>
                                                    <input
                                                        type="url"
                                                        value={settings.hero_ad_2_link || ''}
                                                        onChange={(e) => handleChange('hero_ad_2_link', e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-200"
                                                        dir="ltr"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 11. Offers Hero */}
                                {activeTab === 'offers_hero' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.offers_hero_title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.offers_hero_sub')}</p>
                                        </div>

                                        {(() => {
                                            const offersHero = parseJsonOrObject(settings.store_offers_hero);
                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.title_ar')}</label>
                                                        <input
                                                            type="text"
                                                            value={offersHero.title?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'title', { ...offersHero.title, ar: e.target.value })}
                                                            placeholder="عرض رمضان الاستثنائي"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.title_en')}</label>
                                                        <input
                                                            type="text"
                                                            value={offersHero.title?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'title', { ...offersHero.title, en: e.target.value })}
                                                            placeholder="Special Offers"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.desc_ar')}</label>
                                                        <textarea
                                                            value={offersHero.subtitle?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'subtitle', { ...offersHero.subtitle, ar: e.target.value })}
                                                            rows={2}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.desc_en')}</label>
                                                        <textarea
                                                            value={offersHero.subtitle?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'subtitle', { ...offersHero.subtitle, en: e.target.value })}
                                                            rows={2}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">الشارة / التاج — عربي</label>
                                                        <input
                                                            type="text"
                                                            value={offersHero.tag?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'tag', { ...offersHero.tag, ar: e.target.value })}
                                                            placeholder="عرض حصري / لفترة محدودة"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">الشارة / التاج — إنجليزي</label>
                                                        <input
                                                            type="text"
                                                            value={offersHero.tag?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'tag', { ...offersHero.tag, en: e.target.value })}
                                                            placeholder="Exclusive / Limited Time"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">نص الزر — عربي</label>
                                                        <input
                                                            type="text"
                                                            value={offersHero.button_text?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'button_text', { ...offersHero.button_text, ar: e.target.value })}
                                                            placeholder="اطلع على العرض"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">نص الزر — إنجليزي</label>
                                                        <input
                                                            type="text"
                                                            value={offersHero.button_text?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'button_text', { ...offersHero.button_text, en: e.target.value })}
                                                            placeholder="View Offer"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">رابط الزر</label>
                                                        <input
                                                            type="text"
                                                            value={offersHero.button_url || ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'button_url', e.target.value)}
                                                            placeholder="/cars"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ ووقت انتهاء العرض (للعداد التنازلي)</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={offersHero.ends_at ? offersHero.ends_at.replace(' ', 'T').substring(0, 16) : ''}
                                                            onChange={(e) => handleNestedChange('store_offers_hero', 'ends_at', e.target.value)}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    {/* Desktop Image */}
                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-semibold text-slate-700">صورة البانر للموقع (سطح المكتب - Desktop)</label>
                                                        <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                                                            {fileUploads.offers_hero_image ? (
                                                                <span className="text-xs text-emerald-400 font-semibold">{fileUploads.offers_hero_image.name}</span>
                                                            ) : offersHero.image ? (
                                                                <img src={`/storage/${offersHero.image}`} alt="Desktop Offers Banner" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs text-slate-500">1920x600 px</span>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileChange('offers_hero_image', e.target.files?.[0] || null)}
                                                            className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                        />
                                                    </div>
                                                    {/* Mobile Image */}
                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-semibold text-slate-700">صورة البانر للجوال (Mobile)</label>
                                                        <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                                                            {fileUploads.offers_hero_image_mobile ? (
                                                                <span className="text-xs text-emerald-400 font-semibold">{fileUploads.offers_hero_image_mobile.name}</span>
                                                            ) : offersHero.image_mobile ? (
                                                                <img src={`/storage/${offersHero.image_mobile}`} alt="Mobile Offers Banner" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs text-slate-500">800x600 px</span>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileChange('offers_hero_image_mobile', e.target.files?.[0] || null)}
                                                            className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* TAB: 12. About Sections */}
                                {activeTab === 'about_sections' && (
                                    <div className="space-y-4">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.about_sections_title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.about_sections_sub')}</p>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { id: 'hero', label: t('content.cms.sec_hero'), fields: ['badge', 'title', 'subtitle'], textarea: ['subtitle'] },
                                                { id: 'story', label: t('content.cms.sec_story'), fields: ['title', 'content', 'mission_title', 'mission_text', 'vision_title', 'vision_text', 'values_title', 'values_text'], textarea: ['content', 'mission_text', 'vision_text', 'values_text'] },
                                                { id: 'partners', label: t('content.cms.sec_partners'), fields: ['badge', 'title', 'subtitle'], textarea: ['subtitle'] },
                                                { id: 'dealer', label: t('content.cms.sec_dealer'), fields: ['title', 'description', 'partner_button_text', 'contact_button_text'], textarea: ['description'], plain: ['partner_button_link'] },
                                                { id: 'locations', label: t('content.cms.sec_locations'), fields: ['title'], textarea: [] },
                                                { id: 'testimonials', label: t('content.cms.sec_testimonials'), fields: ['badge', 'title', 'rating_text'], textarea: [] },
                                            ].map((sec) => (
                                                <div key={sec.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenAboutSection(openAboutSection === sec.id ? '' : sec.id)}
                                                        className="w-full p-3.5 bg-slate-50 flex items-center justify-between text-start text-xs font-bold text-slate-800"
                                                    >
                                                        <span>{sec.label}</span>
                                                        <span className="text-slate-400 text-xs">{openAboutSection === sec.id ? '▲' : '▼'}</span>
                                                    </button>
                                                    {openAboutSection === sec.id && (
                                                        <div className="p-4 space-y-3 border-t">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {sec.fields.map((f) => (
                                                                    <React.Fragment key={f}>
                                                                        <div>
                                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{f} — عربي</label>
                                                                            {sec.textarea.includes(f) ? (
                                                                                <textarea
                                                                                    value={getDeep('about_sections', sec.id, f, 'ar')}
                                                                                    onChange={(e) => handleDeepChange('about_sections', sec.id, f, 'ar', e.target.value)}
                                                                                    rows={2}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                />
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    value={getDeep('about_sections', sec.id, f, 'ar')}
                                                                                    onChange={(e) => handleDeepChange('about_sections', sec.id, f, 'ar', e.target.value)}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{f} — إنجليزي</label>
                                                                            {sec.textarea.includes(f) ? (
                                                                                <textarea
                                                                                    value={getDeep('about_sections', sec.id, f, 'en')}
                                                                                    onChange={(e) => handleDeepChange('about_sections', sec.id, f, 'en', e.target.value)}
                                                                                    rows={2}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                    dir="ltr"
                                                                                />
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    value={getDeep('about_sections', sec.id, f, 'en')}
                                                                                    onChange={(e) => handleDeepChange('about_sections', sec.id, f, 'en', e.target.value)}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                    dir="ltr"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </React.Fragment>
                                                                ))}
                                                                {sec.plain?.map((f) => (
                                                                    <div key={f} className="sm:col-span-2">
                                                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{f} (رابط URL)</label>
                                                                        <input
                                                                            type="text"
                                                                            value={getDeep('about_sections', sec.id, f)}
                                                                            onChange={(e) => handleDeepChange('about_sections', sec.id, f, 'plain', e.target.value)}
                                                                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                            dir="ltr"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 13. About Stats */}
                                {activeTab === 'about_stats' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3 flex items-center justify-between">
                                            <div>
                                                <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.about_stats_title')}</h5>
                                                <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.about_stats_sub')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setAboutStats([...aboutStats, { value: '+10', label: '' }])}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                            >
                                                {t('content.cms.add_btn')}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {aboutStats.map((st, idx) => (
                                                <div key={idx} className="p-2.5 bg-slate-100/70 rounded-xl flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={st.value}
                                                        onChange={(e) => {
                                                            const cp = [...aboutStats];
                                                            cp[idx].value = e.target.value;
                                                            setAboutStats(cp);
                                                        }}
                                                        placeholder="+10"
                                                        className="w-24 px-2.5 py-1.5 text-xs font-bold text-center rounded-lg bg-white border border-slate-200"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={st.label}
                                                        onChange={(e) => {
                                                            const cp = [...aboutStats];
                                                            cp[idx].label = e.target.value;
                                                            setAboutStats(cp);
                                                        }}
                                                        placeholder={t('content.cms.label_ph')}
                                                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setAboutStats(aboutStats.filter((_, i) => i !== idx))}
                                                        className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 14. Branches */}
                                {activeTab === 'about_branches' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3 flex items-center justify-between">
                                            <div>
                                                <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.about_branches_title')}</h5>
                                                <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.about_branches_sub')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAboutBranches([
                                                        ...aboutBranches,
                                                        { city: '', name: '', address: '', phone: '', working_hours: '', map_link: '' },
                                                    ])
                                                }
                                                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                            >
                                                {t('content.cms.add_branch')}
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {aboutBranches.map((br, idx) => (
                                                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                                                    <div className="flex items-center justify-between border-b pb-2">
                                                        <span className="text-xs font-bold text-slate-800">{t('content.cms.branch_num', { num: idx + 1, name: br.name })}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAboutBranches(aboutBranches.filter((_, i) => i !== idx))}
                                                            className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            <span>{t('common.delete')}</span>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.city')}</label>
                                                            <input
                                                                type="text"
                                                                value={br.city}
                                                                onChange={(e) => {
                                                                    const cp = [...aboutBranches];
                                                                    cp[idx].city = e.target.value;
                                                                    setAboutBranches(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.branch_name')}</label>
                                                            <input
                                                                type="text"
                                                                value={br.name}
                                                                onChange={(e) => {
                                                                    const cp = [...aboutBranches];
                                                                    cp[idx].name = e.target.value;
                                                                    setAboutBranches(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.phone')}</label>
                                                            <input
                                                                type="text"
                                                                value={br.phone}
                                                                onChange={(e) => {
                                                                    const cp = [...aboutBranches];
                                                                    cp[idx].phone = e.target.value;
                                                                    setAboutBranches(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.address')}</label>
                                                            <input
                                                                type="text"
                                                                value={br.address}
                                                                onChange={(e) => {
                                                                    const cp = [...aboutBranches];
                                                                    cp[idx].address = e.target.value;
                                                                    setAboutBranches(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.working_hours')}</label>
                                                            <input
                                                                type="text"
                                                                value={br.working_hours}
                                                                onChange={(e) => {
                                                                    const cp = [...aboutBranches];
                                                                    cp[idx].working_hours = e.target.value;
                                                                    setAboutBranches(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.map_link')}</label>
                                                            <input
                                                                type="url"
                                                                value={br.map_link}
                                                                onChange={(e) => {
                                                                    const cp = [...aboutBranches];
                                                                    cp[idx].map_link = e.target.value;
                                                                    setAboutBranches(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 15. Booking Hero */}
                                {activeTab === 'booking_hero' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.booking_hero_title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.booking_hero_sub')}</p>
                                        </div>

                                        {(() => {
                                            const bHero = parseJsonOrObject(settings.store_booking_hero);
                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.title_ar')}</label>
                                                        <input
                                                            type="text"
                                                            value={bHero.title?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_booking_hero', 'title', { ...bHero.title, ar: e.target.value })}
                                                            placeholder="احجز سيارتك الآن"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.title_en')}</label>
                                                        <input
                                                            type="text"
                                                            value={bHero.title?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_booking_hero', 'title', { ...bHero.title, en: e.target.value })}
                                                            placeholder="Book Your Car Now"
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.desc_ar')}</label>
                                                        <textarea
                                                            value={bHero.subtitle?.ar || ''}
                                                            onChange={(e) => handleNestedChange('store_booking_hero', 'subtitle', { ...bHero.subtitle, ar: e.target.value })}
                                                            rows={3}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('content.cms.desc_en')}</label>
                                                        <textarea
                                                            value={bHero.subtitle?.en || ''}
                                                            onChange={(e) => handleNestedChange('store_booking_hero', 'subtitle', { ...bHero.subtitle, en: e.target.value })}
                                                            rows={3}
                                                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2 space-y-2">
                                                        <label className="block text-xs font-semibold text-slate-700">{t('content.cms.hero_image')}</label>
                                                        <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                                                            {fileUploads.booking_hero_image ? (
                                                                <span className="text-xs text-emerald-400 font-semibold">{fileUploads.booking_hero_image.name}</span>
                                                            ) : bHero.image ? (
                                                                <img src={`/storage/${bHero.image}`} alt="Booking Hero" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs text-slate-500">1920x600 px</span>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileChange('booking_hero_image', e.target.files?.[0] || null)}
                                                            className="w-full text-xs text-slate-500 file:me-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-[var(--tenant-primary)] file:text-white"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* TAB: 16. Booking Steps */}
                                {activeTab === 'booking_steps' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3 flex items-center justify-between">
                                            <div>
                                                <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.booking_steps_title')}</h5>
                                                <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.booking_steps_sub')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setBookingSteps([
                                                        ...bookingSteps,
                                                        { icon: 'bi-calendar-check', title: { ar: '', en: '' }, description: { ar: '', en: '' } },
                                                    ])
                                                }
                                                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-semibold hover:bg-[var(--tenant-primary)]/10"
                                            >
                                                {t('content.cms.add_step')}
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {bookingSteps.map((step, idx) => (
                                                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                                                    <div className="flex items-center justify-between border-b pb-2">
                                                        <span className="text-xs font-bold text-slate-800">{t('content.cms.step_num', { num: idx + 1 })}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setBookingSteps(bookingSteps.filter((_, i) => i !== idx))}
                                                            className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            <span>{t('common.delete')}</span>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                        <div className="sm:col-span-3">
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.step_icon')}</label>
                                                            <input
                                                                type="text"
                                                                value={step.icon}
                                                                onChange={(e) => {
                                                                    const cp = [...bookingSteps];
                                                                    cp[idx].icon = e.target.value;
                                                                    setBookingSteps(cp);
                                                                }}
                                                                placeholder="bi-calendar-check"
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.title_ar')}</label>
                                                            <input
                                                                type="text"
                                                                value={step.title?.ar || ''}
                                                                onChange={(e) => {
                                                                    const cp = [...bookingSteps];
                                                                    cp[idx].title = { ...cp[idx].title, ar: e.target.value };
                                                                    setBookingSteps(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.title_en')}</label>
                                                            <input
                                                                type="text"
                                                                value={step.title?.en || ''}
                                                                onChange={(e) => {
                                                                    const cp = [...bookingSteps];
                                                                    cp[idx].title = { ...cp[idx].title, en: e.target.value };
                                                                    setBookingSteps(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('content.cms.desc_ar')}</label>
                                                            <input
                                                                type="text"
                                                                value={step.description?.ar || ''}
                                                                onChange={(e) => {
                                                                    const cp = [...bookingSteps];
                                                                    cp[idx].description = { ...cp[idx].description, ar: e.target.value };
                                                                    setBookingSteps(cp);
                                                                }}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 17. Booking Sections */}
                                {activeTab === 'booking_sections' && (
                                    <div className="space-y-4">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('content.cms.booking_sections_title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('content.cms.booking_sections_sub')}</p>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { id: 'hero', label: t('content.cms.sec_hero'), fields: ['badge', 'title', 'subtitle'], textarea: ['subtitle'] },
                                                { id: 'form', label: t('content.cms.sec_booking_form'), fields: ['title', 'subtitle'], textarea: ['subtitle'] },
                                                { id: 'success', label: t('content.cms.sec_booking_success'), fields: ['title', 'subtitle', 'description'], textarea: ['subtitle', 'description'] },
                                            ].map((sec) => (
                                                <div key={sec.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenBookingSection(openBookingSection === sec.id ? '' : sec.id)}
                                                        className="w-full p-3.5 bg-slate-50 flex items-center justify-between text-start text-xs font-bold text-slate-800"
                                                    >
                                                        <span>{sec.label}</span>
                                                        <span className="text-slate-400 text-xs">{openBookingSection === sec.id ? '▲' : '▼'}</span>
                                                    </button>
                                                    {openBookingSection === sec.id && (
                                                        <div className="p-4 space-y-3 border-t">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {sec.fields.map((f) => (
                                                                    <React.Fragment key={f}>
                                                                        <div>
                                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{f} — عربي</label>
                                                                            {sec.textarea.includes(f) ? (
                                                                                <textarea
                                                                                    value={getDeep('store_booking_sections', sec.id, f, 'ar')}
                                                                                    onChange={(e) => handleDeepChange('store_booking_sections', sec.id, f, 'ar', e.target.value)}
                                                                                    rows={2}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                />
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    value={getDeep('store_booking_sections', sec.id, f, 'ar')}
                                                                                    onChange={(e) => handleDeepChange('store_booking_sections', sec.id, f, 'ar', e.target.value)}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{f} — إنجليزي</label>
                                                                            {sec.textarea.includes(f) ? (
                                                                                <textarea
                                                                                    value={getDeep('store_booking_sections', sec.id, f, 'en')}
                                                                                    onChange={(e) => handleDeepChange('store_booking_sections', sec.id, f, 'en', e.target.value)}
                                                                                    rows={2}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                    dir="ltr"
                                                                                />
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    value={getDeep('store_booking_sections', sec.id, f, 'en')}
                                                                                    onChange={(e) => handleDeepChange('store_booking_sections', sec.id, f, 'en', e.target.value)}
                                                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100/70 border-0"
                                                                                    dir="ltr"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 18. Financial & Tax */}
                                {activeTab === 'financial' && (
                                    <div className="space-y-5">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('settings.financial.title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('settings.financial.subtitle')}</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.financial.vat')}</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.vat_percentage ?? 15}
                                                    onChange={(e) => handleChange('vat_percentage', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.financial.interest_rate')}</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.interest_rate ?? 3.5}
                                                    onChange={(e) => handleChange('interest_rate', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.financial.max_years')}</label>
                                                <input
                                                    type="number"
                                                    value={settings.max_finance_years ?? 5}
                                                    onChange={(e) => handleChange('max_finance_years', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('settings.financial.min_down_payment')}</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={settings.min_down_payment_percentage ?? 10}
                                                    onChange={(e) => handleChange('min_down_payment_percentage', e.target.value)}
                                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100/70 border-0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: 19. Integrations & SEO */}
                                {activeTab === 'integrations' && (
                                    <div className="space-y-6">
                                        <div className="border-b pb-3">
                                            <h5 className="font-bold text-sm text-[var(--text-primary)]">{t('settings.integrations.title')}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{t('settings.integrations.subtitle')}</p>
                                        </div>

                                        {/* Analytics & SEO */}
                                        <div className="space-y-3">
                                            <h6 className="font-bold text-xs text-slate-800">{t('settings.integrations.title')}</h6>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.ga4')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.google_analytics_id || ''}
                                                        onChange={(e) => handleChange('google_analytics_id', e.target.value)}
                                                        placeholder="G-XXXXXXXXXX"
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.gtm')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.google_tag_manager_id || ''}
                                                        onChange={(e) => handleChange('google_tag_manager_id', e.target.value)}
                                                        placeholder="GTM-XXXXXXX"
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.meta_pixel')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.meta_pixel_id || ''}
                                                        onChange={(e) => handleChange('meta_pixel_id', e.target.value)}
                                                        placeholder="1234567890"
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.tiktok_pixel')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.tiktok_pixel_id || ''}
                                                        onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
                                                        placeholder="DA0MI2JC77UFIU519G0G"
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.snapchat_pixel')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.snapchat_pixel_id || ''}
                                                        onChange={(e) => handleChange('snapchat_pixel_id', e.target.value)}
                                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.meta_title')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.meta_title || ''}
                                                        onChange={(e) => handleChange('meta_title', e.target.value)}
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.meta_desc')}</label>
                                                    <textarea
                                                        value={settings.meta_description || ''}
                                                        onChange={(e) => handleChange('meta_description', e.target.value)}
                                                        rows={2}
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('settings.integrations.meta_keywords')}</label>
                                                    <input
                                                        type="text"
                                                        value={settings.meta_keywords || ''}
                                                        onChange={(e) => handleChange('meta_keywords', e.target.value)}
                                                        placeholder={t('settings.integrations.meta_keywords_ph')}
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>

                {/* ========================================================== */}
                {/* 3. LEFT STICKY SAVE CARD (Matching the image)             */}
                {/* ========================================================== */}
                <div className={`w-full lg:w-64 shrink-0 ${selectedModule || activeTab === 'updates' || activeTab === 'infrastructure' || activeTab === 'theme_shield' ? 'hidden' : ''}`}>
                    <div className="bg-[#0a0a0a] text-white rounded-2xl shadow-xl p-5 sticky top-20 relative overflow-hidden">
                        {/* Background Watermark Decorative Icon */}
                        <Save className="absolute -bottom-5 -right-3 h-28 w-28 text-white/5 pointer-events-none" />

                        <h5 className="font-bold text-base text-white mb-1.5">{t('settings.save_card_title')}</h5>
                        <p className="text-xs text-white/60 mb-5 leading-relaxed">
                            {t('settings.save_card_desc')}
                        </p>

                        {canManage && (
                            <button
                                type="button"
                                onClick={() => handleSave()}
                                disabled={saving || loading}
                                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-4 w-4 text-[var(--tenant-primary)] shrink-0" />
                                <span>{saving ? t('settings.updating') : t('settings.update_settings')}</span>
                            </button>
                        )}

                        <div className="mt-4 pt-3.5 border-t border-white/10 text-center">
                            <p className="text-xs text-white/50 font-medium">
                                {activeItemLabel}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
