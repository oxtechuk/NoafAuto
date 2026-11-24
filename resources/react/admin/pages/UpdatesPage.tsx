import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    ExternalLink,
    GitBranch,
    History,
    Loader2,
    RefreshCw,
    Rocket,
    XCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';

export interface UpdateRun {
    id: number;
    from_version: string | null;
    to_version: string;
    status: 'queued' | 'running' | 'success' | 'failed' | 'needs_review' | string;
    source: string | null;
    step: string | null;
    run_url: string | null;
    triggered_by: string | null;
    started_at: string | null;
    finished_at: string | null;
    error: string | null;
    log: string[];
}

export interface UpdateStatus {
    current_version: string;
    latest_version: string;
    has_update: boolean;
    channel: string;
    changelog: string | null;
    source: 'github' | 'manifest' | 'none' | string;
    release_name: string | null;
    release_url: string | null;
    published_at: string | null;
    prerelease: boolean;
    checked_at: string;
    error: string | null;
    can_install: boolean;
    configuration: {
        auto_update_ready: boolean;
        missing: string[];
        upstream_repo: string | null;
        client_repo: string | null;
    };
    active_run: UpdateRun | null;
    history: UpdateRun[];
}

export const SYSTEM_UPDATES_QUERY_KEY = ['admin', 'system', 'updates'];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    queued: { label: 'في الانتظار', className: 'bg-amber-100 text-amber-800' },
    running: { label: 'جاري التنفيذ', className: 'bg-blue-100 text-blue-800' },
    success: { label: 'تم بنجاح', className: 'bg-emerald-100 text-emerald-800' },
    failed: { label: 'فشل', className: 'bg-rose-100 text-rose-800' },
    needs_review: { label: 'يحتاج مراجعة مطوّر', className: 'bg-orange-100 text-orange-800' },
};

const STEPS: { key: string; label: string }[] = [
    { key: 'dispatch', label: 'بدء التحديث' },
    { key: 'merge', label: 'دمج التحديث' },
    { key: 'test', label: 'الاختبارات' },
    { key: 'build', label: 'بناء الواجهة' },
    { key: 'deploy', label: 'النشر على السيرفر' },
    { key: 'done', label: 'اكتمل' },
];

const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const meta = STATUS_LABELS[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>;
};

const apiErrorMessage = (error: unknown): string =>
    (error as any)?.response?.data?.message || (error as Error)?.message || 'حدث خطأ غير متوقع';

export const UpdatesPage: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: status, isLoading } = useQuery({
        queryKey: SYSTEM_UPDATES_QUERY_KEY,
        queryFn: async (): Promise<UpdateStatus> => (await apiClient.get('/system/updates')).data.data,
        // Poll while an update is running so the progress steps move on their own.
        refetchInterval: (query) => (query.state.data?.active_run ? 5000 : false),
        staleTime: 0,
    });

    const checkMutation = useMutation({
        mutationFn: async (): Promise<UpdateStatus> => (await apiClient.post('/system/updates/check')).data.data,
        onSuccess: (data) => queryClient.setQueryData(SYSTEM_UPDATES_QUERY_KEY, data),
    });

    const installMutation = useMutation({
        mutationFn: (version: string) => apiClient.post('/system/updates/install', { version }),
        onSettled: () => queryClient.invalidateQueries({ queryKey: SYSTEM_UPDATES_QUERY_KEY }),
    });

    const handleInstall = () => {
        if (!status) return;
        const confirmed = window.confirm(
            `سيتم تحديث النظام من v${status.current_version} إلى v${status.latest_version}.\n\n` +
                'سيتم أخذ نسخة احتياطية من قاعدة البيانات، وتشغيل الاختبارات، ثم النشر. قد يتوقف الموقع دقيقة أثناء النشر.\n\nهل تريد المتابعة؟'
        );
        if (confirmed) installMutation.mutate(status.latest_version);
    };

    if (isLoading || !status) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
            </div>
        );
    }

    const activeRun = status.active_run;
    const activeStepIndex = activeRun ? STEPS.findIndex((s) => s.key === activeRun.step) : -1;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">تحديثات النظام</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        التحديثات تصل من النظام الأساسي، وتُثبَّت عبر GitHub Actions مع نسخة احتياطية واختبارات قبل النشر
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    loading={checkMutation.isPending}
                    icon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => checkMutation.mutate()}
                >
                    فحص التحديثات الآن
                </Button>
            </div>

            {!status.configuration.auto_update_ready && (
                <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold mb-1">التحديث التلقائي غير مُعدّ بالكامل على هذا السيرفر</p>
                        <p>
                            يلزم ضبط المتغيرات التالية في ملف <code>.env</code>:{' '}
                            <span className="font-mono">{status.configuration.missing.join('، ')}</span>
                        </p>
                    </div>
                </div>
            )}

            {status.error && (
                <div className="rounded-[var(--radius-lg)] border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex gap-3">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold mb-1">تعذّر الاتصال بمصدر التحديثات</p>
                        <p className="font-mono break-all">{status.error}</p>
                    </div>
                </div>
            )}

            {checkMutation.isError && (
                <p className="text-xs text-rose-700">{apiErrorMessage(checkMutation.error)}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="sm">
                    <p className="text-[11px] text-[var(--text-muted)]">النسخة الحالية</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">v{status.current_version}</p>
                </Card>
                <Card padding="sm">
                    <p className="text-[11px] text-[var(--text-muted)]">قناة التحديث</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                        {status.channel === 'beta' ? 'تجريبية (beta)' : 'مستقرة (stable)'}
                    </p>
                </Card>
                <Card padding="sm">
                    <p className="text-[11px] text-[var(--text-muted)]">آخر فحص</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">{formatDate(status.checked_at)}</p>
                    {status.configuration.upstream_repo && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1 font-mono" dir="ltr">
                            <GitBranch className="h-3 w-3" /> {status.configuration.upstream_repo}
                        </p>
                    )}
                </Card>
            </div>

            {activeRun ? (
                <Card title={`جاري التحديث إلى v${activeRun.to_version}`} action={<StatusPill status={activeRun.status} />}>
                    <ol className="flex flex-wrap gap-2 mb-4">
                        {STEPS.map((step, index) => {
                            const isDone = activeStepIndex > index;
                            const isCurrent = activeStepIndex === index;
                            return (
                                <li
                                    key={step.key}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                                        isDone
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : isCurrent
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    {isDone ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : isCurrent ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : null}
                                    {step.label}
                                </li>
                            );
                        })}
                    </ol>
                    <RunLog run={activeRun} />
                </Card>
            ) : status.has_update ? (
                <Card
                    title={`تحديث جديد متاح: v${status.latest_version}`}
                    subtitle={`${status.release_name ?? ''} · نُشر ${formatDate(status.published_at)}${status.prerelease ? ' · نسخة تجريبية' : ''}`}
                    action={
                        status.release_url ? (
                            <a
                                href={status.release_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[var(--tenant-primary)] inline-flex items-center gap-1"
                            >
                                التفاصيل <ExternalLink className="h-3 w-3" />
                            </a>
                        ) : undefined
                    }
                >
                    {status.changelog && (
                        <div className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-6 max-h-72 overflow-y-auto bg-[var(--surface-secondary)] rounded-[var(--radius-md)] p-3 mb-4">
                            {status.changelog}
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Button
                            loading={installMutation.isPending}
                            disabled={!status.can_install}
                            icon={<Download className="h-4 w-4" />}
                            onClick={handleInstall}
                        >
                            تثبيت التحديث الآن
                        </Button>
                        {!status.configuration.auto_update_ready && (
                            <span className="text-[11px] text-amber-700">أكمل إعدادات التحديث التلقائي أولاً</span>
                        )}
                    </div>
                    {installMutation.isError && (
                        <p className="text-xs text-rose-700 mt-3">{apiErrorMessage(installMutation.error)}</p>
                    )}
                </Card>
            ) : (
                <Card>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                        <Rocket className="h-6 w-6 text-emerald-600" />
                        <span>
                            {status.source === 'none'
                                ? 'لم يتم ربط مصدر للتحديثات بعد.'
                                : `النظام محدَّث — أنت على آخر نسخة (v${status.current_version}).`}
                        </span>
                    </div>
                </Card>
            )}

            <Card title="سجل التحديثات" action={<History className="h-4 w-4 text-[var(--text-muted)]" />} padding="none">
                {status.history.length === 0 ? (
                    <p className="text-center text-xs text-[var(--text-muted)] py-10">لا توجد تحديثات سابقة</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                                <tr>
                                    <th className="py-2.5 px-4 text-start">النسخة</th>
                                    <th className="py-2.5 px-4 text-start">الحالة</th>
                                    <th className="py-2.5 px-4 text-start">بواسطة</th>
                                    <th className="py-2.5 px-4 text-start">البداية</th>
                                    <th className="py-2.5 px-4 text-start">النهاية</th>
                                    <th className="py-2.5 px-4 text-start">السجل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)]">
                                {status.history.map((run) => (
                                    <tr key={run.id}>
                                        <td className="py-2.5 px-4 font-mono" dir="ltr">
                                            {run.from_version ? `v${run.from_version} → ` : ''}v{run.to_version}
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <StatusPill status={run.status} />
                                        </td>
                                        <td className="py-2.5 px-4">{run.triggered_by ?? (run.source === 'github' ? '—' : 'النظام')}</td>
                                        <td className="py-2.5 px-4">{formatDate(run.started_at)}</td>
                                        <td className="py-2.5 px-4">{formatDate(run.finished_at)}</td>
                                        <td className="py-2.5 px-4">
                                            {run.run_url ? (
                                                <a
                                                    href={run.run_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[var(--tenant-primary)] inline-flex items-center gap-1"
                                                >
                                                    GitHub <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">{run.error ?? '—'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

const RunLog: React.FC<{ run: UpdateRun }> = ({ run }) => (
    <div className="space-y-2">
        <div className="bg-slate-900 text-slate-100 rounded-[var(--radius-md)] p-3 text-[11px] font-mono max-h-56 overflow-y-auto" dir="ltr">
            {run.log.length === 0 ? <p className="text-slate-400">Waiting for GitHub Actions…</p> : run.log.map((line, i) => <p key={i}>{line}</p>)}
        </div>
        {run.run_url && (
            <a href={run.run_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--tenant-primary)] inline-flex items-center gap-1">
                متابعة التنفيذ على GitHub Actions <ExternalLink className="h-3 w-3" />
            </a>
        )}
    </div>
);
