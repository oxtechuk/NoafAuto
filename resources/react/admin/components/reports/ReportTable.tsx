import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, Download } from 'lucide-react';
import { formatValue, type ReportTableData } from './types';

const PAGE = 25;

export const ReportTable: React.FC<{ table: ReportTableData; onExport?: () => void; exporting?: boolean }> = ({ table, onExport, exporting }) => {
    const { t, i18n } = useTranslation('admin');
    const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null);
    const [showAll, setShowAll] = useState(false);

    const rows = useMemo(() => {
        if (!sort) return table.rows;
        return [...table.rows].sort((a, b) => {
            const av = a[sort.key];
            const bv = b[sort.key];
            const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''), i18n.language === 'en' ? 'en' : 'ar');
            return sort.desc ? -result : result;
        });
    }, [table.rows, sort, i18n.language]);

    const visible = showAll ? rows : rows.slice(0, PAGE);
    const tableTitle = String(t(`reports.tables.${table.key}`, { defaultValue: table.title }));

    return (
        <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-default)]">
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{tableTitle}</h3>
                    {table.subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{table.subtitle}</p>}
                </div>
                {onExport && table.rows.length > 0 && (
                    <button onClick={onExport} disabled={exporting} className="print:hidden flex items-center gap-1.5 rounded-md border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-50">
                        <Download className="h-3.5 w-3.5" /> {exporting ? t('reports.exporting') : t('reports.export_csv')}
                    </button>
                )}
            </div>
            {table.rows.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--text-muted)]">{t('reports.no_data')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                            <tr>
                                {table.columns.map((c) => (
                                    <th key={c.key} className={`px-3 py-2 font-semibold whitespace-nowrap ${c.format === 'text' ? 'text-start' : 'text-center'}`}>
                                        <button className="inline-flex items-center gap-1" onClick={() => setSort((s) => ({ key: c.key, desc: s?.key === c.key ? !s.desc : c.format !== 'text' }))}>
                                            {String(t(`reports.cols.${c.key}`, { defaultValue: c.label }))}
                                            <ArrowDownUp className={`h-3 w-3 print:hidden ${sort?.key === c.key ? 'opacity-100' : 'opacity-30'}`} />
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {visible.map((row, i) => (
                                <tr key={i} className="hover:bg-[var(--surface-secondary)]/50">
                                    {table.columns.map((c) => (
                                        <td key={c.key} className={`px-3 py-2 tabular-nums ${c.format === 'text' ? 'text-start font-medium text-[var(--text-primary)]' : 'text-center'}`}>
                                            {formatValue(row[c.key], c.format)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {rows.length > PAGE && (
                <button onClick={() => setShowAll((v) => !v)} className="print:hidden w-full border-t border-[var(--border-default)] py-2 text-xs font-semibold text-[var(--tenant-primary)] hover:bg-[var(--surface-secondary)]">
                    {showAll ? t('reports.show_less') : t('reports.show_all', { count: rows.length })}
                </button>
            )}
        </div>
    );
};
