import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Layers,
    Calculator,
    RefreshCw,
    Save,
    CheckCircle2,
    Clock,
    Phone,
    User,
    DollarSign,
    Car,
    GripVertical,
    Search,
    MessageCircle,
    ArrowRightLeft,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';

interface KanbanItem {
    id: number;
    client_name: string;
    client_phone: string;
    car_name?: string;
    car_brand?: string;
    car_year?: string | number;
    total_price?: string | number;
    assigned_to?: string | null;
    status?: string;
    created_at?: string | null;
    updated_at?: string | null;
}

interface KanbanStage {
    key: string;
    title: string;
    color: string;
    group: 'active' | 'lost';
    total_amount: number;
    items: KanbanItem[];
}

const COLOR_STYLES: Record<string, { dot: string; bar: string; badge: string }> = {
    primary: {
        dot: 'bg-[var(--tenant-primary,#1877F2)]',
        bar: 'bg-[var(--tenant-primary,#1877F2)]',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    info: {
        dot: 'bg-sky-500',
        bar: 'bg-sky-500',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    warning: {
        dot: 'bg-amber-500',
        bar: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    success: {
        dot: 'bg-emerald-500',
        bar: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    secondary: {
        dot: 'bg-slate-400',
        bar: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    danger: {
        dot: 'bg-rose-500',
        bar: 'bg-rose-500',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
};

function formatKanbanTime(dateStr: string | null | undefined, t: any, lang: string): string {
    if (!dateStr) return t('sales.now');
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return t('bookings_ui.just_now');
    if (diffMins < 60) return t('bookings_ui.mins_ago', { count: diffMins });
    if (diffHours < 24) return t('bookings_ui.hours_ago', { count: diffHours });
    if (diffDays === 1) return t('bookings_ui.yesterday');
    if (diffDays === 2) return t('bookings_ui.two_days_ago');
    if (diffDays < 7) return t('bookings_ui.days_ago', { count: diffDays });
    if (diffWeeks === 1) return t('bookings_ui.one_week_ago');
    if (diffWeeks === 2) return t('bookings_ui.two_weeks_ago');
    if (diffWeeks <= 4) return t('bookings_ui.weeks_ago', { count: diffWeeks });
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA');
}

function getInitials(name?: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

// 1. Odoo-CRM Style Kanban Tracking Page
export const KanbanTrackingPage: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [groupFilter, setGroupFilter] = useState<'active' | 'lost' | 'all'>('active');
    const [draggedItem, setDraggedItem] = useState<{ id: number; sourceStage: string } | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);
    const [movingId, setMovingId] = useState<number | null>(null);

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['/sales/tracking'],
        queryFn: async () => {
            const res = await apiClient.get('/sales/tracking');
            return (res.data?.data || {}) as Record<string, KanbanStage>;
        },
    });

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
            setMovingId(id);
            return await apiClient.patch(`/sales/tracking/${id}/stage`, { stage });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/sales/tracking'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'summary'] });
        },
        onError: () => {
            refetch();
        },
        onSettled: () => {
            setMovingId(null);
        },
    });

    const stages: Record<string, KanbanStage> = useMemo(() => data || {}, [data]);

    const handleMoveStage = (id: number, targetStage: string, sourceStage: string) => {
        if (targetStage === sourceStage) return;

        queryClient.setQueryData(['/sales/tracking'], (oldData: Record<string, KanbanStage> | undefined) => {
            if (!oldData) return oldData;
            const updated = JSON.parse(JSON.stringify(oldData)) as Record<string, KanbanStage>;

            const sourceItems = updated[sourceStage]?.items || [];
            const index = sourceItems.findIndex((it) => it.id === id);
            if (index === -1) return oldData;

            const [item] = sourceItems.splice(index, 1);
            const price = Number(item.total_price || 0);
            updated[sourceStage].total_amount = Math.max(0, (updated[sourceStage].total_amount || 0) - price);

            if (updated[targetStage]) {
                if (!updated[targetStage].items) updated[targetStage].items = [];
                updated[targetStage].items.unshift(item);
                updated[targetStage].total_amount = (updated[targetStage].total_amount || 0) + price;
            }
            return updated;
        });

        updateStageMutation.mutate({ id, stage: targetStage });
    };

    const { activeCount, lostCount } = useMemo(() => {
        let active = 0;
        let lost = 0;
        for (const col of Object.values(stages)) {
            const len = col.items?.length || 0;
            if (col.group === 'lost') lost += len;
            else active += len;
        }
        return { activeCount: active, lostCount: lost };
    }, [stages]);

    const visibleStages = useMemo(() => {
        return Object.entries(stages).filter(([, col]) => {
            if (groupFilter === 'all') return true;
            return (col.group || 'active') === groupFilter;
        });
    }, [stages, groupFilter]);

    const activeStagesList = useMemo(
        () => Object.entries(stages).filter(([, col]) => (col.group || 'active') === 'active'),
        [stages]
    );
    const lostStagesList = useMemo(
        () => Object.entries(stages).filter(([, col]) => col.group === 'lost'),
        [stages]
    );

    const { visibleCount, visibleValue } = useMemo(() => {
        let cnt = 0;
        let val = 0;
        for (const [, col] of visibleStages) {
            cnt += col.items?.length || 0;
            val += Number(col.total_amount || 0);
        }
        return { visibleCount: cnt, visibleValue: val };
    }, [visibleStages]);

    return (
        <div className="space-y-4">
            {/* Odoo-style Control Panel Header */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Title & Pipeline Summary */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[var(--tenant-primary,#1877F2)]/10 text-[var(--tenant-primary,#1877F2)] flex items-center justify-center shrink-0">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold text-slate-900">{t('sales.kanban_title')}</h1>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--tenant-primary,#1877F2)]/10 text-[var(--tenant-primary,#1877F2)]">
                                    {t('sales.kanban_count', { count: visibleCount })}
                                </span>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {t('sales.pipeline_value')}: {Math.round(visibleValue).toLocaleString()} {t('common.sar')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{t('sales.kanban_sub')}</p>
                        </div>
                    </div>

                    {/* Search + Refresh */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-72">
                            <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('sales.kanban_search_ph')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)] transition-colors"
                            />
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="gap-1.5 text-xs shrink-0 h-[34px]"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            <span>{t('crud.refresh')}</span>
                        </Button>
                    </div>
                </div>

                {/* Group Filter Pills (Active vs Lost vs All) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => setGroupFilter('active')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            groupFilter === 'active'
                                ? 'bg-[var(--tenant-primary,#1877F2)] text-white border-[var(--tenant-primary,#1877F2)] shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${groupFilter === 'active' ? 'bg-white' : 'bg-emerald-500'}`} />
                        <span>{t('sales.filter_active')}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            groupFilter === 'active' ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                            {activeCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setGroupFilter('lost')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            groupFilter === 'lost'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${groupFilter === 'lost' ? 'bg-white' : 'bg-rose-500'}`} />
                        <span>{t('sales.filter_lost')}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            groupFilter === 'lost' ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                            {lostCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setGroupFilter('all')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            groupFilter === 'all'
                                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        <span>{t('sales.filter_all')}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            groupFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                            {activeCount + lostCount}
                        </span>
                    </button>
                </div>
            </div>

            {/* Odoo-style Horizontal Kanban Board */}
            {isLoading ? (
                <div className="py-24 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-[var(--tenant-primary,#1877F2)]" />
                    <span className="text-sm font-medium">{t('sales.kanban_loading')}</span>
                </div>
            ) : (
                <div className="flex gap-3.5 overflow-x-auto pb-4 items-start">
                    {visibleStages.map(([stageKey, col]) => {
                        const style = COLOR_STYLES[col.color || 'secondary'] || COLOR_STYLES.secondary;
                        const stageTitle = String(t(`booking_statuses.${stageKey}`, { defaultValue: col.title }));
                        const isOver = dragOverStage === stageKey;

                        const filteredItems = (col.items || []).filter((item) => {
                            if (!searchQuery.trim()) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                                item.client_name?.toLowerCase().includes(q) ||
                                item.client_phone?.includes(q) ||
                                item.car_name?.toLowerCase().includes(q) ||
                                item.car_brand?.toLowerCase().includes(q) ||
                                String(item.id).includes(q)
                            );
                        });

                        const colSum = filteredItems.reduce((acc, it) => acc + Number(it.total_price || 0), 0);

                        return (
                            <div
                                key={stageKey}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverStage !== stageKey) {
                                        setDragOverStage(stageKey);
                                    }
                                }}
                                onDragLeave={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDragOverStage((curr) => (curr === stageKey ? null : curr));
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverStage(null);
                                    try {
                                        const raw = e.dataTransfer.getData('text/plain');
                                        if (raw) {
                                            const parsed = JSON.parse(raw);
                                            if (parsed?.id && parsed.sourceStage) {
                                                handleMoveStage(parsed.id, stageKey, parsed.sourceStage);
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Drop parse error', err);
                                    }
                                    setDraggedItem(null);
                                }}
                                className={`w-[300px] shrink-0 rounded-xl border transition-all flex flex-col ${
                                    isOver
                                        ? 'bg-blue-50/60 border-[var(--tenant-primary,#1877F2)] ring-2 ring-[var(--tenant-primary,#1877F2)]/25 shadow-md'
                                        : 'bg-slate-100/80 border-slate-200/80'
                                }`}
                            >
                                {/* Odoo Column Header: Title + Count + Progress Bar + Total SAR */}
                                <div className="p-3 pb-2.5 bg-white/80 rounded-t-xl border-b border-slate-200/80">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                                            <span className="font-bold text-xs text-slate-900 truncate" title={stageTitle}>
                                                {stageTitle}
                                            </span>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${style.badge}`}>
                                            {filteredItems.length}
                                        </span>
                                    </div>

                                    {/* Odoo Progress Bar & Sum */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${style.bar}`}
                                                style={{ width: filteredItems.length > 0 ? '100%' : '0%' }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                                            {Math.round(colSum).toLocaleString()} {t('common.sar')}
                                        </span>
                                    </div>
                                </div>

                                {/* Cards Stack */}
                                <div className="p-2.5 space-y-2.5 flex-1 min-h-[160px] max-h-[68vh] overflow-y-auto">
                                    {filteredItems.map((item) => {
                                        const isBeingDragged = draggedItem?.id === item.id;
                                        const isUpdating = movingId === item.id;

                                        return (
                                            <div
                                                key={item.id}
                                                draggable={!isUpdating}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData(
                                                        'text/plain',
                                                        JSON.stringify({ id: item.id, sourceStage: stageKey })
                                                    );
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    setDraggedItem({ id: item.id, sourceStage: stageKey });
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedItem(null);
                                                    setDragOverStage(null);
                                                }}
                                                className={`p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs transition-all select-none cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[var(--tenant-primary,#1877F2)]/60 group ${
                                                    isBeingDragged
                                                        ? 'opacity-30 border-dashed border-[var(--tenant-primary,#1877F2)] scale-95'
                                                        : ''
                                                } ${isUpdating ? 'animate-pulse pointer-events-none' : ''}`}
                                            >
                                                {/* Row 1: Client Name + #ID */}
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-[var(--tenant-primary,#1877F2)] shrink-0" />
                                                        <span className="font-bold text-[13px] text-slate-900 truncate">
                                                            {item.client_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                                                        #{item.id}
                                                    </span>
                                                </div>

                                                {/* Row 2: Car Subtitle */}
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-2.5 ps-5">
                                                    <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate font-medium">
                                                        {[item.car_brand, item.car_name, item.car_year].filter(Boolean).join(' • ') || t('sales.unassigned_car')}
                                                    </span>
                                                </div>

                                                {/* Row 3: Amount + WhatsApp */}
                                                <div className="flex items-center justify-between gap-2 mb-2.5 ps-5">
                                                    {item.total_price ? (
                                                        <span className="font-extrabold text-slate-900 text-xs whitespace-nowrap">
                                                            {Number(item.total_price).toLocaleString()}{' '}
                                                            <span className="text-[10px] font-semibold text-slate-500">{t('common.sar')}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400">{t('sales.price_unset')}</span>
                                                    )}

                                                    {item.client_phone && (
                                                        <a
                                                            href={`https://wa.me/${item.client_phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title={t('sales.whatsapp_chat', { phone: item.client_phone })}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 px-2 py-0.5 rounded-md transition-colors shrink-0"
                                                        >
                                                            <MessageCircle className="h-3 w-3" />
                                                            <span>{t('sales.whatsapp')}</span>
                                                        </a>
                                                    )}
                                                </div>

                                                {/* Row 4: Odoo Footer (Agent Avatar + Time + Compact Status Switcher) */}
                                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span
                                                            className="h-5 w-5 rounded-full bg-[var(--tenant-primary,#1877F2)]/10 text-[var(--tenant-primary,#1877F2)] text-[9px] font-bold flex items-center justify-center shrink-0"
                                                            title={item.assigned_to || t('sales.unassigned')}
                                                        >
                                                            {item.assigned_to ? getInitials(item.assigned_to) : '—'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-600 font-medium truncate max-w-[95px]">
                                                            {item.assigned_to || t('sales.unassigned')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                            {formatKanbanTime(item.created_at, t, i18n.language)}
                                                        </span>
                                                        <select
                                                            value={stageKey}
                                                            onChange={(e) => {
                                                                const newStage = e.target.value;
                                                                if (newStage && newStage !== stageKey) {
                                                                    handleMoveStage(item.id, newStage, stageKey);
                                                                }
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            disabled={isUpdating}
                                                            title={t('sales.move_to')}
                                                            className="w-5 h-5 opacity-60 group-hover:opacity-100 text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 cursor-pointer focus:outline-hidden"
                                                        >
                                                            <optgroup label={t('sales.group_active_label')}>
                                                                {activeStagesList.map(([key, cfg]) => (
                                                                    <option key={key} value={key}>
                                                                        {String(t(`booking_statuses.${key}`, { defaultValue: cfg.title }))}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label={t('sales.group_lost_label')}>
                                                                {lostStagesList.map(([key, cfg]) => (
                                                                    <option key={key} value={key}>
                                                                        {String(t(`booking_statuses.${key}`, { defaultValue: cfg.title }))}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Empty drop zone state */}
                                    {filteredItems.length === 0 && (
                                        <div
                                            className={`h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center p-3 transition-colors ${
                                                isOver
                                                    ? 'border-[var(--tenant-primary,#1877F2)] bg-blue-50/50 text-[var(--tenant-primary,#1877F2)]'
                                                    : 'border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            <span className="text-xs font-medium">
                                                {isOver ? t('sales.drop_here') : t('sales.no_requests')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 mt-0.5">
                                                {t('sales.drag_hint')}
                                            </span>
                                        </div>
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

// 2. Calculator Settings Page
export const CalculatorSettingsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    const queryClient = useQueryClient();
    const [savedMsg, setSavedMsg] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['/sales/calculator'],
        queryFn: async () => {
            const res = await apiClient.get('/sales/calculator');
            return res.data?.data || {};
        },
    });

    const [formState, setFormState] = useState<Record<string, any>>({});

    React.useEffect(() => {
        if (data) {
            setFormState(data);
        }
    }, [data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            return await apiClient.put('/sales/calculator', formState);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/sales/calculator'] });
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 3000);
        },
    });

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                    {t('sales.calc_title')}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {t('sales.calc_sub')}
                </p>
            </div>

            {savedMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t('sales.calc_saved')}</span>
                </div>
            )}

            <Card className="p-6">
                {isLoading ? (
                    <div className="py-12 text-center text-slate-400">
                        {t('sales.calc_loading')}
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveMutation.mutate();
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                {t('sales.profit_rate')}
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formState.profit_rate || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, profit_rate: e.target.value })
                                }
                                placeholder="3.75"
                                className="text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                {t('sales.max_years')}
                            </label>
                            <Input
                                type="number"
                                value={formState.max_years || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, max_years: e.target.value })
                                }
                                placeholder="5"
                                className="text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                {t('sales.min_down')}
                            </label>
                            <Input
                                type="number"
                                value={formState.min_down_payment || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, min_down_payment: e.target.value })
                                }
                                placeholder="10"
                                className="text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                {t('sales.last_payment_max')}
                            </label>
                            <Input
                                type="number"
                                value={formState.last_payment_max || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, last_payment_max: e.target.value })
                                }
                                placeholder="40"
                                className="text-xs"
                            />
                        </div>

                        <div className="pt-4 border-t border-[var(--border-default)] flex justify-end">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={saveMutation.isPending}
                                className="gap-1.5 text-xs"
                            >
                                <Save className="h-4 w-4" />
                                <span>
                                    {saveMutation.isPending ? t('common.saving') : t('sales.save_settings')}
                                </span>
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
};
