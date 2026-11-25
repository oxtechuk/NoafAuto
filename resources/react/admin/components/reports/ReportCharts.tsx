import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { compactValue, formatValue, SERIES_COLORS, type ReportChart } from './types';

/**
 * Dependency-free charts (plain divs + one SVG) so the reports chunk stays small.
 */
export const ReportChartCard: React.FC<{ chart: ReportChart }> = ({ chart }) => {
    const { t } = useTranslation('admin');
    const hasData = chart.points.some((p) => Object.values(p.values).some((v) => (v ?? 0) > 0));
    const chartTitle = String(t(`reports.charts.${chart.key}`, { defaultValue: chart.title }));

    return (
        <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{chartTitle}</h3>
                {chart.series.length > 1 && (
                    <div className="flex flex-wrap gap-3">
                        {chart.series.map((s, i) => (
                            <span key={s.key} className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                                <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                                {String(t(`reports.series.${s.key}`, { defaultValue: s.label }))}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            {!hasData ? (
                <p className="py-8 text-center text-xs text-[var(--text-muted)]">{t('reports.no_data')}</p>
            ) : chart.type === 'line' ? (
                <LineChart chart={chart} />
            ) : (
                <BarChart chart={chart} />
            )}
        </div>
    );
};

const BarChart: React.FC<{ chart: ReportChart }> = ({ chart }) => {
    const max = Math.max(1, ...chart.points.flatMap((p) => chart.series.map((s) => p.values[s.key] ?? 0)));

    return (
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pe-1">
            {chart.points.map((point) => (
                <div key={point.label} className="grid grid-cols-[minmax(90px,35%)_1fr] items-center gap-3">
                    <span className="truncate text-xs text-[var(--text-secondary)]" title={point.label}>{point.label}</span>
                    <div className="space-y-1">
                        {chart.series.map((s, i) => {
                            const value = point.values[s.key] ?? 0;
                            return (
                                <div key={s.key} className="flex items-center gap-2" title={`${s.label}: ${formatValue(value, chart.format)}`}>
                                    <div className="h-2.5 rounded-full transition-[width] duration-300" style={{ width: `${Math.max(value > 0 ? 2 : 0, (value / max) * 100)}%`, background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                                    <span className="text-[10px] tabular-nums text-[var(--text-muted)] shrink-0">{compactValue(value)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 10, right: 8, bottom: 22, left: 36 };

const LineChart: React.FC<{ chart: ReportChart }> = ({ chart }) => {
    const [hover, setHover] = useState<number | null>(null);
    const points = chart.points;
    const max = Math.max(1, ...points.flatMap((p) => chart.series.map((s) => p.values[s.key] ?? 0)));
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
    const labelEvery = Math.max(1, Math.ceil(points.length / 8));
    const step = points.length > 1 ? innerW / (points.length - 1) : innerW;

    return (
        <div className="relative" dir="ltr">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label={chart.title} onMouseLeave={() => setHover(null)}>
                {[0, 0.5, 1].map((t) => (
                    <g key={t}>
                        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="var(--border-default)" strokeDasharray="3 3" />
                        <text x={PAD.left - 6} y={y(max * t) + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)">{compactValue(Math.round(max * t))}</text>
                    </g>
                ))}
                {points.map((p, i) => i % labelEvery === 0 && (
                    <text key={p.label} x={x(i)} y={HEIGHT - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{p.label.length > 7 ? p.label.slice(5) : p.label}</text>
                ))}
                {chart.series.map((s, si) => (
                    <polyline key={s.key} fill="none" stroke={SERIES_COLORS[si % SERIES_COLORS.length]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                        points={points.map((p, i) => `${x(i)},${y(p.values[s.key] ?? 0)}`).join(' ')} />
                ))}
                {hover !== null && (
                    <>
                        <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text-muted)" strokeOpacity="0.4" />
                        {chart.series.map((s, si) => (
                            <circle key={s.key} cx={x(hover)} cy={y(points[hover].values[s.key] ?? 0)} r="3.5" fill={SERIES_COLORS[si % SERIES_COLORS.length]} />
                        ))}
                    </>
                )}
                {points.map((p, i) => (
                    <rect key={p.label} x={x(i) - step / 2} y={PAD.top} width={step} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
                ))}
            </svg>
            {hover !== null && (
                <div className="pointer-events-none absolute top-0 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-1 text-[11px] shadow-sm"
                    style={{ left: `${Math.min(80, (x(hover) / WIDTH) * 100)}%` }} dir="rtl">
                    <p className="font-semibold">{points[hover].label}</p>
                    {chart.series.map((s) => <p key={s.key}>{s.label}: {formatValue(points[hover].values[s.key], chart.format)}</p>)}
                </div>
            )}
        </div>
    );
};
