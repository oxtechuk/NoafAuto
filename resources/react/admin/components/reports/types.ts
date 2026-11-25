import i18n from '../../../i18n';

export type ValueFormat = 'text' | 'number' | 'money' | 'percent' | 'days' | 'seconds';

export interface ReportKpi {
    key: string;
    label: string;
    format: ValueFormat;
    hint: string | null;
    lower_is_better: boolean;
    value: number | null;
    previous: number | null;
    change: number | null;
}

export interface ReportChart {
    key: string;
    title: string;
    type: 'bar' | 'line';
    format: ValueFormat;
    series: { key: string; label: string }[];
    points: { label: string; values: Record<string, number | null> }[];
}

export interface ReportTableData {
    key: string;
    title: string;
    subtitle: string | null;
    columns: { key: string; label: string; format: ValueFormat }[];
    rows: Record<string, string | number | null>[];
}

export interface ReportPayload {
    section: string;
    label: string;
    range: { from: string; to: string; previous_from: string | null; previous_to: string | null };
    kpis: ReportKpi[];
    charts: ReportChart[];
    tables: ReportTableData[];
    generated_at: string;
}

export interface ReportSectionsMeta {
    can_view_all: boolean;
    sections: { key: string; label: string; icon: string }[];
    employees: { id: number; name: string }[];
    brands: { id: number; name: string }[];
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const formatValue = (value: string | number | null | undefined, format: ValueFormat = 'number'): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (format === 'text' || typeof value === 'string') return String(value);

    switch (format) {
        case 'money':
            return `${numberFormat.format(Math.round(value))} ${i18n.t('admin:common.sar')}`;
        case 'percent':
            return `${numberFormat.format(value)}%`;
        case 'days':
            return `${numberFormat.format(value)} ${i18n.t('admin:reports.unit_day')}`;
        case 'seconds':
            return `${numberFormat.format(value)} ${i18n.t('admin:reports.unit_sec')}`;
        default:
            return numberFormat.format(value);
    }
};

/** Short axis/bar label for big numbers: 12500 → 12.5K */
export const compactValue = (value: number): string =>
    Math.abs(value) >= 1000 ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : numberFormat.format(value);

export const SERIES_COLORS = ['var(--tenant-primary)', '#10b981', '#f59e0b', '#8b5cf6'];
