import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    ArrowDownRight, ArrowUpRight, BadgeCheck, BarChart3, Bot, Car, Contact, FileText, Info, LayoutDashboard, MessageCircle, Printer, RefreshCw, Target, TrendingUp, Users,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useBranding } from '../context/BrandingContext';
import { ReportChartCard } from '../components/reports/ReportCharts';
import { ReportTable } from '../components/reports/ReportTable';
import { formatValue, type ReportKpi, type ReportPayload, type ReportSectionsMeta } from '../components/reports/types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    'layout-dashboard': LayoutDashboard, users: Users, car: Car, 'badge-check': BadgeCheck, target: Target, contact: Contact,
    'trending-up': TrendingUp, 'message-circle': MessageCircle, bot: Bot,
};

/** Old sidebar links keep working. */
const LEGACY_SECTIONS: Record<string, string> = { bookings: 'overview', sources: 'channels', monthly: 'trend' };

const pad = (n: number) => String(n).padStart(2, '0');
/** Local date (not toISOString, which shifts the day in UTC+3). */
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const PRESETS: { key: string; labelKey: string; range: () => { from?: string; to?: string; all?: boolean } }[] = [
    { key: '7d', labelKey: 'reports.preset_7d', range: () => { const d = new Date(); d.setDate(d.getDate() - 6); return { from: ymd(d), to: ymd(new Date()) }; } },
    { key: '30d', labelKey: 'reports.preset_30d', range: () => { const d = new Date(); d.setDate(d.getDate() - 29); return { from: ymd(d), to: ymd(new Date()) }; } },
    { key: 'month', labelKey: 'reports.preset_month', range: () => { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), to: ymd(d) }; } },
    { key: 'last-month', labelKey: 'reports.preset_last_month', range: () => { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: ymd(new Date(d.getFullYear(), d.getMonth(), 0)) }; } },
    { key: 'quarter', labelKey: 'reports.preset_quarter', range: () => { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)), to: ymd(d) }; } },
    { key: 'year', labelKey: 'reports.preset_year', range: () => { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), 0, 1)), to: ymd(d) }; } },
    { key: 'all', labelKey: 'common.all', range: () => ({ all: true }) },
];

const select = 'rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]';

export const ReportsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    const { branding } = useBranding();
    const { section: rawSection } = useParams<{ section?: string }>();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [printingFull, setPrintingFull] = useState(false);
    const [fullReportSections, setFullReportSections] = useState<Array<{ key: string; label: string; payload: ReportPayload }> | null>(null);

    const { data: meta, isLoading: metaLoading } = useQuery({
        queryKey: ['admin', 'reports', 'sections'],
        queryFn: async (): Promise<ReportSectionsMeta> => (await apiClient.get('/reports/sections')).data.data,
        staleTime: 1000 * 60 * 10,
    });

    const section = LEGACY_SECTIONS[rawSection ?? ''] ?? rawSection ?? meta?.sections[0]?.key ?? 'overview';
    const preset = params.get('preset') ?? '30d';
    const filters = useMemo(() => {
        const out: Record<string, string> = {};
        for (const key of ['from', 'to', 'all', 'employee_id', 'brand_id', 'compare']) {
            const value = params.get(key);
            if (value) out[key] = value;
        }
        return out;
    }, [params]);
    const queryKey = ['admin', 'reports', section, filters];

    const { data: report, isFetching, isError } = useQuery({
        queryKey,
        queryFn: async (): Promise<ReportPayload> => (await apiClient.get(`/reports/sections/${section}`, { params: filters })).data.data,
        enabled: !!meta && meta.sections.some((s) => s.key === section),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5,
    });

    if (rawSection && LEGACY_SECTIONS[rawSection]) {
        return <Navigate to={`/admin/reports/${LEGACY_SECTIONS[rawSection]}?${params.toString()}`} replace />;
    }

    const update = (changes: Record<string, string | null>) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, v)));
        setParams(next, { replace: true });
    };

    const applyPreset = (key: string) => {
        const range = PRESETS.find((p) => p.key === key)!.range();
        update({ preset: key, from: range.from ?? null, to: range.to ?? null, all: range.all ? '1' : null });
    };

    const refresh = async () => {
        setRefreshing(true);
        try {
            const fresh = (await apiClient.get(`/reports/sections/${section}`, { params: { ...filters, fresh: 1 } })).data.data;
            queryClient.setQueryData(queryKey, fresh);
        } finally {
            setRefreshing(false);
        }
    };

    const exportTable = async (table: string) => {
        setExporting(table);
        try {
            const res = await apiClient.get(`/reports/sections/${section}/export`, { params: { ...filters, table }, responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `report-${section}-${table}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(null);
        }
    };

    const printCurrentSection = () => {
        setFullReportSections(null);
        setTimeout(() => window.print(), 80);
    };

    const printFullReport = async () => {
        if (!meta?.sections?.length) return;
        setPrintingFull(true);
        try {
            const results = await Promise.all(
                meta.sections.map(async (s) => {
                    const res = await apiClient.get(`/reports/sections/${s.key}`, { params: filters });
                    return { key: s.key, label: s.label, payload: res.data.data as ReportPayload };
                })
            );
            setFullReportSections(results);
            const cleanup = () => {
                setFullReportSections(null);
                window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(() => window.print(), 250);
        } finally {
            setPrintingFull(false);
        }
    };

    if (metaLoading || !meta) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]" /></div>;
    }
    if (!meta.sections.some((s) => s.key === section)) {
        return <Navigate to="/admin/reports" replace />;
    }

    const compare = params.get('compare') !== '0';

    const currentSectionObj = meta.sections.find((s) => s.key === section);
    const currentSectionLabel = String(t(`reports.sections.${section}`, { defaultValue: currentSectionObj?.label ?? section }));

    return (
        <div className="space-y-5 print:space-y-4">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
                    .print-page-break { break-before: page; page-break-before: always; }
                    .print-page-frame {
                        border: 2px solid var(--tenant-primary, #1877F2) !important;
                        border-radius: 14px !important;
                        padding: 16px !important;
                        background: #ffffff !important;
                    }
                }
            `}</style>

            {/* Screen Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 print:hidden">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-[var(--tenant-primary)]" />
                        {meta.can_view_all ? t('reports.page_title') : t('reports.my_report_title')}
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {report ? t('reports.range_text', { from: report.range.from, to: report.range.to }) : '…'}
                        {report?.range.previous_from && compare && t('reports.compare_text', { from: report.range.previous_from, to: report.range.previous_to })}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                    <button
                        type="button"
                        onClick={printCurrentSection}
                        disabled={!report}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] disabled:opacity-50 cursor-pointer transition-colors"
                    >
                        <Printer className="h-3.5 w-3.5 text-[var(--tenant-primary)]" />
                        <span>{t('reports.print_section_pdf')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={printFullReport}
                        disabled={printingFull}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--tenant-primary)] px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60 cursor-pointer shadow-xs transition-all"
                    >
                        <FileText className={`h-3.5 w-3.5 ${printingFull ? 'animate-pulse' : ''}`} />
                        <span>{printingFull ? t('reports.preparing_pdf') : t('reports.print_full_pdf')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {t('crud.refresh')}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 print:hidden">
                <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                        <button key={p.key} onClick={() => applyPreset(p.key)}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${preset === p.key ? 'bg-[var(--tenant-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'}`}>
                            {t(p.labelKey)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <input type="date" aria-label={t('reports.from')} value={params.get('from') ?? ''} max={params.get('to') ?? undefined} onChange={(e) => update({ preset: 'custom', from: e.target.value, all: null })} className={select} />
                    <span className="text-[var(--text-muted)]">→</span>
                    <input type="date" aria-label={t('reports.to')} value={params.get('to') ?? ''} min={params.get('from') ?? undefined} onChange={(e) => update({ preset: 'custom', to: e.target.value, all: null })} className={select} />
                </div>
                {meta.can_view_all && (
                    <select aria-label={t('reports.employee')} value={params.get('employee_id') ?? ''} onChange={(e) => update({ employee_id: e.target.value })} className={select}>
                        <option value="">{t('reports.all_employees')}</option>
                        {meta.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                )}
                <select aria-label={t('reports.brand')} value={params.get('brand_id') ?? ''} onChange={(e) => update({ brand_id: e.target.value })} className={select}>
                    <option value="">{t('reports.all_brands')}</option>
                    {meta.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] ms-auto">
                    <input type="checkbox" checked={compare} onChange={(e) => update({ compare: e.target.checked ? null : '0' })} className="h-3.5 w-3.5 accent-[var(--tenant-primary)]" />
                    {t('reports.compare_previous')}
                </label>
            </div>

            {/* Sections */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
                {meta.sections.map((s) => {
                    const Icon = ICONS[s.icon] ?? BarChart3;
                    return (
                        <button key={s.key} onClick={() => navigate(`/admin/reports/${s.key}?${params.toString()}`)}
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold ${section === s.key ? 'bg-[var(--tenant-primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                            <Icon className="h-4 w-4" /> {String(t(`reports.sections.${s.key}`, { defaultValue: s.label }))}
                        </button>
                    );
                })}
            </div>

            {isError && <div className="rounded-[var(--radius-md)] bg-rose-50 px-4 py-2.5 text-xs text-rose-800">{t('reports.load_error')}</div>}

            {/* Printable Branded Frame */}
            <div className="print-page-frame">
                {/* Executive Print Header with Platform Logo (visible only in PDF/Print) */}
                <div className="hidden print:block rounded-xl border border-slate-200 bg-slate-50/80 p-4 mb-5 border-t-4 border-t-[var(--tenant-primary,#1877F2)]">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {branding.logo_url && (
                                <img
                                    src={branding.logo_url}
                                    alt={branding.company_name || 'Logo'}
                                    className="h-12 w-auto max-w-[140px] object-contain rounded-lg bg-white p-1 border border-slate-200"
                                />
                            )}
                            <div>
                                <h1 className="text-lg font-extrabold text-slate-900">
                                    {fullReportSections ? t('reports.exec_report_title') : currentSectionLabel}
                                </h1>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    {t('reports.period_label')} {report ? `${report.range.from} → ${report.range.to}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="text-end text-[11px] text-slate-500">
                            <div className="font-bold text-sm text-[var(--tenant-primary,#1877F2)]">
                                {branding.company_name || 'Tameed CRM'}
                            </div>
                            <div>{t('reports.generated_at')} {new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>

                {fullReportSections ? (
                    /* Full Multi-Section Executive Report (for Print/PDF) */
                    <div className="space-y-8">
                        {fullReportSections.map((sec, idx) => (
                            <section key={sec.key} className={`space-y-4 ${idx > 0 ? 'print-page-break' : ''}`}>
                                <div className="flex items-center gap-2 border-b-2 border-[var(--tenant-primary,#1877F2)] pb-2">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--tenant-primary,#1877F2)] text-white text-xs font-bold">
                                        {String(idx + 1).padStart(2, '0')}
                                    </span>
                                    <h2 className="text-base font-extrabold text-slate-900">
                                        {String(t(`reports.sections.${sec.key}`, { defaultValue: sec.label }))}
                                    </h2>
                                </div>
                                {sec.payload.kpis.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 print-avoid-break">
                                        {sec.payload.kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} compare={compare} />)}
                                    </div>
                                )}
                                {sec.payload.charts.length > 0 && (
                                    <div className="grid lg:grid-cols-2 gap-4">
                                        {sec.payload.charts.map((chart) => (
                                            <div key={chart.key} className={`print-avoid-break ${chart.type === 'line' ? 'lg:col-span-2' : ''}`}>
                                                <ReportChartCard chart={chart} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {sec.payload.tables.map((table) => (
                                    <div key={table.key} className="print-avoid-break">
                                        <ReportTable table={table} onExport={() => exportTable(table.key)} exporting={false} />
                                    </div>
                                ))}
                            </section>
                        ))}
                    </div>
                ) : !report ? (
                    <ReportSkeleton />
                ) : (
                    <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                        {report.kpis.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 print-avoid-break">
                                {report.kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} compare={compare} />)}
                            </div>
                        )}
                        {report.charts.length > 0 && (
                            <div className="grid lg:grid-cols-2 gap-4">
                                {report.charts.map((chart) => (
                                    <div key={chart.key} className={`print-avoid-break ${chart.type === 'line' ? 'lg:col-span-2' : ''}`}><ReportChartCard chart={chart} /></div>
                                ))}
                            </div>
                        )}
                        {report.tables.map((table) => (
                            <div key={table.key} className="print-avoid-break">
                                <ReportTable table={table} onExport={() => exportTable(table.key)} exporting={exporting === table.key} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Executive Print Footer */}
                <div className="hidden print:flex items-center justify-between border-t border-slate-200 mt-6 pt-3 text-[10px] text-slate-400">
                    <span>{branding.company_name || 'Tameed CRM'} — {t('reports.exec_footer')}</span>
                    <span>{new Date().toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

const KpiCard: React.FC<{ kpi: ReportKpi; compare: boolean }> = ({ kpi, compare }) => {
    const { t } = useTranslation('admin');
    const change = compare ? kpi.change : null;
    const good = change !== null && change !== 0 && (change > 0) !== kpi.lower_is_better;
    const ChangeIcon = change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;

    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-primary)] p-4">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                {String(t(`reports.kpis.${kpi.key}`, { defaultValue: kpi.label }))}
                {kpi.hint && <span title={kpi.hint}><Info className="h-3 w-3 text-[var(--text-muted)]" /></span>}
            </p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-[var(--text-primary)]">{formatValue(kpi.value, kpi.format)}</p>
            {compare && kpi.previous !== null && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                    {change !== null && change !== 0 && (
                        <span className={`flex items-center font-semibold ${good ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <ChangeIcon className="h-3.5 w-3.5" />
                            {Math.abs(change)}{kpi.format === 'percent' ? t('reports.pts') : '%'}
                        </span>
                    )}
                    <span>{t('reports.prev_value')} {formatValue(kpi.previous, kpi.format)}</span>
                </p>
            )}
        </div>
    );
};

const ReportSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-[var(--radius-lg)] bg-[var(--surface-secondary)]" />)}
        </div>
        <div className="h-56 rounded-[var(--radius-lg)] bg-[var(--surface-secondary)]" />
    </div>
);
