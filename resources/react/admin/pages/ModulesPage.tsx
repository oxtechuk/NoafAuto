import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Blocks,
    Check,
    CheckCircle2,
    Power,
    Search,
    Settings,
    Sparkles,
    MessageCircle,
    ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface ModuleDescriptor {
    key: string;
    name: string;
    description?: string;
    version?: string;
    enabled: boolean;
    admin?: {
        path?: string;
        label?: string;
    };
    permissions?: string[];
}

/**
 * Odoo-inspired visual cover + app icon tile tailored to each module.
 */
const ModuleArtwork: React.FC<{ moduleKey: string; enabled: boolean }> = ({ moduleKey, enabled }) => {
    if (moduleKey === 'whatsapp') {
        return (
            <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 p-4 flex items-center justify-between">
                {/* Decorative SVG background waves & chat bubbles */}
                <svg
                    className="absolute inset-0 h-full w-full opacity-15 pointer-events-none"
                    viewBox="0 0 320 120"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle cx="270" cy="24" r="52" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
                    <circle cx="270" cy="24" r="30" stroke="white" strokeWidth="1.5" />
                    <path
                        d="M0 95C60 70 120 115 190 85C240 65 280 80 320 60V120H0V95Z"
                        fill="white"
                    />
                </svg>

                {/* Odoo-style App Icon Tile */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-white/95 shadow-lg shadow-emerald-950/20 flex items-center justify-center border border-white/60">
                        <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            <path d="M9.5 9.5c.3 1.8 2.2 3.7 4 4l1.2-.8c.3-.2.7-.1.9.2l.8 1.2c.2.3.1.7-.2.9-.8.5-1.9.6-3 .2-2.4-.9-4.5-3-5.4-5.4-.4-1.1-.3-2.2.2-3 .2-.3.6-.4.9-.2l1.2.8c.3.2.4.6.2.9l-.8 1.2z" fill="currentColor" stroke="none" />
                        </svg>
                    </div>
                </div>

                {/* Floating decorative mini cards */}
                <div className="relative z-10 hidden sm:flex flex-col items-end gap-1.5 opacity-90">
                    <div className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 text-[10px] font-semibold text-white flex items-center gap-1.5">
                        <MessageCircle className="h-3 w-3" />
                        <span>Cloud API</span>
                    </div>
                    <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-lime-300 animate-pulse' : 'bg-white/40'}`} />
                </div>
            </div>
        );
    }

    if (moduleKey === 'ai-assistant') {
        return (
            <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-800 p-4 flex items-center justify-between">
                {/* Decorative SVG neural grid */}
                <svg
                    className="absolute inset-0 h-full w-full opacity-20 pointer-events-none"
                    viewBox="0 0 320 120"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle cx="255" cy="35" r="44" stroke="white" strokeWidth="1.2" strokeDasharray="3 3" />
                    <circle cx="290" cy="85" r="26" stroke="white" strokeWidth="1.2" />
                    <path d="M180 20 L255 35 L290 85 L210 95 Z" stroke="white" strokeWidth="1" />
                    <circle cx="180" cy="20" r="3" fill="white" />
                    <circle cx="255" cy="35" r="4" fill="white" />
                    <circle cx="290" cy="85" r="3" fill="white" />
                    <circle cx="210" cy="95" r="3" fill="white" />
                </svg>

                {/* Odoo-style App Icon Tile (Google Gemini Logo) */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-white shadow-lg shadow-indigo-950/30 flex items-center justify-center border border-white/70">
                        <svg className="h-9 w-9" viewBox="0 0 28 28" fill="none" aria-label="Gemini">
                            <defs>
                                <linearGradient id="geminiGrad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#1C7DFF" />
                                    <stop offset="45%" stopColor="#6366F1" />
                                    <stop offset="80%" stopColor="#A855F7" />
                                    <stop offset="100%" stopColor="#EC4899" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M14 2C14.35 8.65 19.35 13.65 26 14C19.35 14.35 14.35 19.35 14 26C13.65 19.35 8.65 14.35 2 14C8.65 13.65 13.65 8.65 14 2Z"
                                fill="url(#geminiGrad)"
                            />
                        </svg>
                    </div>
                </div>

                <div className="relative z-10 hidden sm:flex flex-col items-end gap-1.5 opacity-90">
                    <div className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 text-[10px] font-semibold text-white flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        <span>Gemini AI</span>
                    </div>
                    <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-cyan-300 animate-pulse' : 'bg-white/40'}`} />
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4 flex items-center justify-between">
            <svg
                className="absolute inset-0 h-full w-full opacity-10 pointer-events-none"
                viewBox="0 0 320 120"
                fill="none"
                aria-hidden="true"
            >
                <rect x="210" y="-10" width="90" height="90" rx="20" stroke="white" strokeWidth="2" />
                <rect x="245" y="40" width="70" height="70" rx="16" stroke="white" strokeWidth="1.5" />
            </svg>
            <div className="relative z-10 h-14 w-14 rounded-2xl bg-white/95 shadow-lg flex items-center justify-center border border-white/60">
                <Blocks className="h-7 w-7 text-slate-700" />
            </div>
        </div>
    );
};

export const ModulesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [pendingKey, setPendingKey] = useState<string | null>(null);

    const { data: modulesData, isLoading } = useQuery<ModuleDescriptor[]>({
        queryKey: ['admin', 'modules'],
        queryFn: async () => {
            const res = await apiClient.get('/modules');
            return res.data?.data || [];
        },
    });

    const enableMutation = useMutation({
        mutationFn: (key: string) => {
            setPendingKey(key);
            return apiClient.post(`/modules/${key}/enable`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'modules'] }),
        onSettled: () => setPendingKey(null),
    });

    const disableMutation = useMutation({
        mutationFn: (key: string) => {
            setPendingKey(key);
            return apiClient.post(`/modules/${key}/disable`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'modules'] }),
        onSettled: () => setPendingKey(null),
    });

    const modules = modulesData || [];

    const filteredModules = useMemo(() => {
        const q = search.trim().toLowerCase();
        return modules.filter((m) => {
            if (statusFilter === 'enabled' && !m.enabled) return false;
            if (statusFilter === 'disabled' && m.enabled) return false;
            if (!q) return true;
            const localName = String(t(`modules.items.${m.key}.name`, { defaultValue: m.name })).toLowerCase();
            const localDesc = String(t(`modules.items.${m.key}.desc`, { defaultValue: m.description || '' })).toLowerCase();
            return (
                m.key.toLowerCase().includes(q) ||
                m.name.toLowerCase().includes(q) ||
                localName.includes(q) ||
                localDesc.includes(q)
            );
        });
    }, [modules, search, statusFilter, t]);

    const getSettingsPath = (m: ModuleDescriptor): string => {
        if (m.key === 'whatsapp') return '/admin/settings?tab=module:whatsapp';
        if (m.admin?.path) return m.admin.path;
        return `/admin/settings?tab=module:${m.key}`;
    };

    return (
        <div className="space-y-6">
            {/* Header & Odoo Apps Search/Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-[var(--tenant-primary,#1877F2)]/10 text-[var(--tenant-primary,#1877F2)] flex items-center justify-center shrink-0">
                        <Blocks className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">{t('modules.title')}</h1>
                        <p className="text-xs text-slate-500 mt-0.5">{t('modules.subtitle')}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute start-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('modules.search_ph')}
                            className="ps-8 pe-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[var(--tenant-primary)]/20 focus:border-[var(--tenant-primary)] w-48 sm:w-56"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                        {(['all', 'enabled', 'disabled'] as const).map((filterKey) => (
                            <button
                                key={filterKey}
                                type="button"
                                onClick={() => setStatusFilter(filterKey)}
                                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                    statusFilter === filterKey
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {t(`modules.filter_${filterKey}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Apps Grid */}
            {isLoading ? (
                <div className="flex justify-center py-20 bg-white rounded-2xl border border-slate-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
                </div>
            ) : filteredModules.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-400 text-xs">
                        <Blocks className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        {t('modules.empty')}
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredModules.map((m) => {
                        const displayName = String(t(`modules.items.${m.key}.name`, { defaultValue: m.name }));
                        const displayDesc = String(t(`modules.items.${m.key}.desc`, { defaultValue: m.description || '' }));
                        const isBusy = pendingKey === m.key && (enableMutation.isPending || disableMutation.isPending);

                        return (
                            <div
                                key={m.key}
                                className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between"
                            >
                                <div>
                                    {/* Top Visual Cover */}
                                    <div className="relative">
                                        <ModuleArtwork moduleKey={m.key} enabled={m.enabled} />

                                        {/* Status Pill Overlay */}
                                        <div className="absolute top-3 end-3 flex items-center gap-1.5">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow-xs ${
                                                    m.enabled
                                                        ? 'bg-emerald-500/90 text-white'
                                                        : 'bg-slate-900/70 text-slate-200'
                                                }`}
                                            >
                                                {m.enabled && <CheckCircle2 className="h-3 w-3" />}
                                                <span>{m.enabled ? t('modules.installed') : t('common.disabled')}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* App Body */}
                                    <div className="p-5 space-y-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900 leading-tight">{displayName}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {m.key}
                                                    </span>
                                                    {m.version && (
                                                        <span className="text-[11px] font-mono text-slate-400">
                                                            v{m.version}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {displayDesc && (
                                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                                                {displayDesc}
                                            </p>
                                        )}

                                        <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                                            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                                            <span>{t('modules.permissions_count', { count: m.permissions?.length || 0 })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Odoo-Style Action Footer */}
                                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                                    {m.enabled ? (
                                        <Link
                                            to={getSettingsPath(m)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--tenant-primary,#1877F2)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-2xs"
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                            <span>{t('modules.settings_btn')}</span>
                                        </Link>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {t('modules.enable_to_configure')}
                                        </span>
                                    )}

                                    {isAdmin && (
                                        m.enabled ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                loading={isBusy}
                                                onClick={() => disableMutation.mutate(m.key)}
                                                className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                                            >
                                                <Power className="h-3.5 w-3.5 me-1" /> {t('modules.disable')}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                loading={isBusy}
                                                onClick={() => enableMutation.mutate(m.key)}
                                            >
                                                <Check className="h-3.5 w-3.5 me-1" /> {t('modules.enable')}
                                            </Button>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
