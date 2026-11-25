import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Cloud,
    Database,
    Globe,
    PlugZap,
    RefreshCw,
    Save,
    Trash2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useConfirm } from '../../../shared/components/ui/ConfirmDialog';

interface RedisSettings {
    enabled: boolean;
    host: string;
    port: number;
    database: number;
    has_password: boolean;
    use_for_cache: boolean;
    use_for_session: boolean;
    use_for_queue: boolean;
}

interface CloudflareSettings {
    enabled: boolean;
    zone_id: string;
    zone_name: string | null;
    has_api_token: boolean;
    trust_proxies: boolean;
    ips: string[];
    ips_fetched_at: string | null;
}

interface CdnSettings {
    enabled: boolean;
    url: string;
}

interface InfrastructurePayload {
    settings: { redis: RedisSettings; cloudflare: CloudflareSettings; cdn: CdnSettings };
    environment: {
        redis_client: 'phpredis' | 'predis' | null;
        drivers: { cache: string; session: string; queue: string };
        asset_url: string | null;
        behind_cloudflare: boolean;
        app_url: string;
    };
}

type Feedback = { type: 'success' | 'error'; text: string; warnings?: string[] } | null;

const QUERY_KEY = ['admin', 'system', 'infrastructure'];
const BASE = '/system/infrastructure';

/** Pulls the API message (and CDN warnings) out of an axios error. */
function errorFeedback(error: any, fallback: string): Feedback {
    const data = error?.response?.data;
    const validation = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
    return {
        type: 'error',
        text: validation || data?.message || fallback,
        warnings: data?.data?.warnings,
    };
}

const inputClass =
    'w-full px-3 py-2 text-xs rounded-xl bg-slate-100/70 border-0 focus:ring-2 focus:ring-[var(--tenant-primary)]/20 disabled:opacity-50';

const FeedbackBox: React.FC<{ feedback: Feedback }> = ({ feedback }) => {
    if (!feedback) return null;
    const isSuccess = feedback.type === 'success';
    return (
        <div
            className={`p-3 rounded-xl text-xs font-semibold space-y-1.5 ${
                isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
        >
            <div className="flex items-start gap-2">
                {isSuccess ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{feedback.text}</span>
            </div>
            {feedback.warnings?.map((warning) => (
                <p key={warning} className="ps-6 font-medium">
                    {warning}
                </p>
            ))}
        </div>
    );
};

const Toggle: React.FC<{ checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }> = ({
    checked,
    onChange,
    disabled,
    label,
}) => (
    <label className={`inline-flex items-center gap-2 text-xs font-bold ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
        <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--tenant-primary)]"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
    </label>
);

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; badge: React.ReactNode; children: React.ReactNode }> = ({
    icon,
    title,
    subtitle,
    badge,
    children,
}) => (
    <section className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">{icon}</div>
                <div>
                    <h6 className="text-sm font-bold text-[var(--text-primary)]">{title}</h6>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{subtitle}</p>
                </div>
            </div>
            {badge}
        </div>
        {children}
    </section>
);

const StatusBadge: React.FC<{ active: boolean; activeLabel: string; inactiveLabel: string }> = ({ active, activeLabel, inactiveLabel }) => (
    <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}
    >
        {active ? activeLabel : inactiveLabel}
    </span>
);

export const InfrastructurePanel: React.FC = () => {
    const { t } = useTranslation('admin');
    const queryClient = useQueryClient();
    const { confirm, ConfirmDialogComponent } = useConfirm();

    const { data, isLoading } = useQuery<InfrastructurePayload>({
        queryKey: QUERY_KEY,
        queryFn: async () => (await apiClient.get(BASE)).data.data,
    });

    const [redis, setRedis] = useState<RedisSettings & { password: string; clear_password: boolean }>();
    const [cloudflare, setCloudflare] = useState<CloudflareSettings & { api_token: string }>();
    const [cdn, setCdn] = useState<CdnSettings>();
    const [redisFeedback, setRedisFeedback] = useState<Feedback>(null);
    const [cloudflareFeedback, setCloudflareFeedback] = useState<Feedback>(null);
    const [cdnFeedback, setCdnFeedback] = useState<Feedback>(null);

    useEffect(() => {
        if (!data) return;
        setRedis({ ...data.settings.redis, password: '', clear_password: false });
        setCloudflare({ ...data.settings.cloudflare, api_token: '' });
        setCdn({ ...data.settings.cdn });
    }, [data]);

    const onSaved = (payload: InfrastructurePayload) => queryClient.setQueryData(QUERY_KEY, payload);

    const redisPayload = () => {
        if (!redis) return {};
        const { has_password, ...rest } = redis;
        return rest;
    };

    const testRedis = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/redis/test`, { ...redisPayload(), enabled: true })).data,
        onSuccess: (res) =>
            setRedisFeedback({ type: 'success', text: `${res.message}${res.data?.version ? ` (Redis ${res.data.version})` : ''}` }),
        onError: (error) => setRedisFeedback(errorFeedback(error, t('settings.infra.unexpected_error'))),
    });

    const saveRedis = useMutation({
        mutationFn: async () => (await apiClient.put(`${BASE}/redis`, redisPayload())).data,
        onSuccess: (res) => {
            setRedisFeedback({ type: 'success', text: res.message });
            onSaved(res.data);
        },
        onError: (error) => setRedisFeedback(errorFeedback(error, t('settings.infra.unexpected_error'))),
    });

    const saveCloudflare = useMutation({
        mutationFn: async () => (await apiClient.put(`${BASE}/cloudflare`, cloudflare)).data,
        onSuccess: (res) => {
            setCloudflareFeedback({ type: 'success', text: res.message });
            onSaved(res.data);
        },
        onError: (error) => setCloudflareFeedback(errorFeedback(error, t('settings.infra.unexpected_error'))),
    });

    const purgeCloudflare = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/cloudflare/purge`)).data,
        onSuccess: (res) => setCloudflareFeedback({ type: 'success', text: res.message }),
        onError: (error) => setCloudflareFeedback(errorFeedback(error, t('settings.infra.unexpected_error'))),
    });

    const testCdn = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/cdn/test`, { ...cdn, enabled: true })).data,
        onSuccess: (res) => setCdnFeedback({ type: 'success', text: res.message }),
        onError: (error) => setCdnFeedback(errorFeedback(error, t('settings.infra.unexpected_error'))),
    });

    const saveCdn = useMutation({
        mutationFn: async () => (await apiClient.put(`${BASE}/cdn`, cdn)).data,
        onSuccess: (res) => {
            setCdnFeedback({ type: 'success', text: res.message });
            onSaved(res.data);
        },
        onError: (error) => setCdnFeedback(errorFeedback(error, t('settings.infra.unexpected_error'))),
    });

    const handleSaveRedis = async () => {
        if (!redis || !data) return;
        const sessionWillChange =
            (data.settings.redis.enabled && data.settings.redis.use_for_session) !== (redis.enabled && redis.use_for_session);
        if (sessionWillChange) {
            const ok = await confirm({
                title: t('settings.infra.session_confirm_title'),
                message: t('settings.infra.session_confirm_msg'),
                detail: t('settings.infra.session_confirm_detail'),
                confirmText: t('settings.infra.session_confirm_btn'),
                cancelText: t('common.cancel'),
                variant: 'warning',
            });
            if (!ok) return;
        }
        try {
            await saveRedis.mutateAsync();
        } catch {
            return; // onError already shows the message
        }
        if (sessionWillChange) {
            window.location.href = '/admin/login';
        }
    };

    const handlePurge = async () => {
        const ok = await confirm({
            title: t('settings.infra.purge_confirm_title'),
            message: t('settings.infra.purge_confirm_msg'),
            detail: t('settings.infra.purge_confirm_detail'),
            confirmText: t('settings.infra.purge_confirm_btn'),
            cancelText: t('common.cancel'),
            variant: 'danger',
        });
        if (ok) purgeCloudflare.mutate();
    };

    if (isLoading || !data || !redis || !cloudflare || !cdn) {
        return (
            <div className="p-6 space-y-4" aria-busy="true">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-16 w-full" />
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-56 w-full" />
                ))}
            </div>
        );
    }

    const { environment } = data;
    const redisUnavailable = environment.redis_client === null;

    return (
        <div className="p-6 space-y-6">
            {ConfirmDialogComponent}

            <div className="border-b pb-3">
                <h5 className="text-base font-bold text-[var(--text-primary)]">{t('settings.infra.title')}</h5>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {t('settings.infra.subtitle')}
                </p>
            </div>

            {/* Current state */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: t('settings.infra.driver_cache'), value: environment.drivers.cache },
                    { label: t('settings.infra.driver_session'), value: environment.drivers.session },
                    { label: t('settings.infra.driver_queue'), value: environment.drivers.queue },
                    { label: 'Cloudflare', value: environment.behind_cloudflare ? t('settings.infra.cf_detected') : t('settings.infra.cf_not_detected') },
                ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold text-slate-400">{item.label}</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5" dir="ltr">
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Redis ── */}
            <SectionCard
                icon={<Database className="h-4 w-4" />}
                title="Redis"
                subtitle={t('settings.infra.redis_subtitle')}
                badge={<StatusBadge active={data.settings.redis.enabled} activeLabel={t('settings.infra.enabled')} inactiveLabel={t('settings.infra.disabled')} />}
            >
                {redisUnavailable && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                            {t('settings.infra.redis_missing_ext_1')} <b dir="ltr">ext-redis</b> {t('settings.infra.redis_missing_ext_2')}
                        </span>
                    </div>
                )}

                <Toggle
                    label={t('settings.infra.redis_enable')}
                    checked={redis.enabled}
                    disabled={redisUnavailable}
                    onChange={(enabled) => setRedis({ ...redis, enabled })}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('settings.infra.redis_host')}</label>
                        <input dir="ltr" className={inputClass} value={redis.host} disabled={redisUnavailable} onChange={(e) => setRedis({ ...redis, host: e.target.value })} placeholder="127.0.0.1" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('settings.infra.redis_port')}</label>
                        <input dir="ltr" type="number" className={inputClass} value={redis.port} disabled={redisUnavailable} onChange={(e) => setRedis({ ...redis, port: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('settings.infra.redis_db')}</label>
                        <input dir="ltr" type="number" min={0} max={14} className={inputClass} value={redis.database} disabled={redisUnavailable} onChange={(e) => setRedis({ ...redis, database: Number(e.target.value) })} />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('settings.infra.redis_password')}</label>
                        <input
                            dir="ltr"
                            type="password"
                            autoComplete="new-password"
                            className={inputClass}
                            value={redis.password}
                            disabled={redisUnavailable || redis.clear_password}
                            onChange={(e) => setRedis({ ...redis, password: e.target.value })}
                            placeholder={redis.has_password ? t('settings.infra.password_saved_ph') : t('settings.infra.password_none_ph')}
                        />
                        {redis.has_password && (
                            <div className="mt-2">
                                <Toggle label={t('settings.infra.clear_saved_password')} checked={redis.clear_password} onChange={(clear_password) => setRedis({ ...redis, clear_password, password: '' })} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-500">{t('settings.infra.redis_use_for')}</p>
                    <Toggle label={t('settings.infra.redis_cache_rec')} checked={redis.use_for_cache} disabled={redisUnavailable} onChange={(use_for_cache) => setRedis({ ...redis, use_for_cache })} />
                    <div>
                        <Toggle label={t('settings.infra.redis_sessions')} checked={redis.use_for_session} disabled={redisUnavailable} onChange={(use_for_session) => setRedis({ ...redis, use_for_session })} />
                        <p className="text-[11px] text-slate-400 ms-6 mt-0.5">{t('settings.infra.redis_sessions_hint')}</p>
                    </div>
                    <div>
                        <Toggle label={t('settings.infra.redis_queue')} checked={redis.use_for_queue} disabled={redisUnavailable} onChange={(use_for_queue) => setRedis({ ...redis, use_for_queue })} />
                        <p className="text-[11px] text-slate-400 ms-6 mt-0.5">
                            {t('settings.infra.redis_queue_hint')}
                        </p>
                    </div>
                </div>

                <FeedbackBox feedback={redisFeedback} />

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" icon={<PlugZap className="h-4 w-4" />} loading={testRedis.isPending} disabled={redisUnavailable} onClick={() => testRedis.mutate()}>
                        {t('settings.infra.test_connection')}
                    </Button>
                    <Button size="sm" icon={<Save className="h-4 w-4" />} loading={saveRedis.isPending} disabled={redisUnavailable && redis.enabled} onClick={handleSaveRedis}>
                        {t('common.save')}
                    </Button>
                </div>
            </SectionCard>

            {/* ── Cloudflare ── */}
            <SectionCard
                icon={<Cloud className="h-4 w-4" />}
                title="Cloudflare"
                subtitle={t('settings.infra.cf_subtitle')}
                badge={<StatusBadge active={data.settings.cloudflare.enabled} activeLabel={t('settings.infra.enabled')} inactiveLabel={t('settings.infra.disabled')} />}
            >
                <Toggle label={t('settings.infra.cf_enable')} checked={cloudflare.enabled} onChange={(enabled) => setCloudflare({ ...cloudflare, enabled })} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Zone ID</label>
                        <input dir="ltr" className={inputClass} value={cloudflare.zone_id} onChange={(e) => setCloudflare({ ...cloudflare, zone_id: e.target.value.trim() })} placeholder={t('settings.infra.cf_zone_ph')} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">API Token</label>
                        <input
                            dir="ltr"
                            type="password"
                            autoComplete="new-password"
                            className={inputClass}
                            value={cloudflare.api_token}
                            onChange={(e) => setCloudflare({ ...cloudflare, api_token: e.target.value.trim() })}
                            placeholder={cloudflare.has_api_token ? t('settings.infra.token_saved_ph') : 'Zone Read + Cache Purge'}
                        />
                    </div>
                </div>

                <Toggle
                    label={t('settings.infra.cf_trust_proxies')}
                    checked={cloudflare.trust_proxies}
                    onChange={(trust_proxies) => setCloudflare({ ...cloudflare, trust_proxies })}
                />

                {data.settings.cloudflare.enabled && data.settings.cloudflare.zone_name && (
                    <p className="text-xs text-slate-600">
                        {t('settings.infra.cf_connected_to')} <b dir="ltr">{data.settings.cloudflare.zone_name}</b> · {data.settings.cloudflare.ips.length} {t('settings.infra.cf_ip_ranges')}
                    </p>
                )}

                <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <summary className="font-bold cursor-pointer">{t('settings.infra.cf_guide_title')}</summary>
                    <ol className="list-decimal ps-5 mt-2 space-y-1 leading-relaxed">
                        <li>Cloudflare ← My Profile ← API Tokens ← Create Token ← Custom.</li>
                        <li>{t('settings.infra.cf_guide_step2')}</li>
                        <li>
                            {t('settings.infra.cf_guide_step3')}
                        </li>
                    </ol>
                </details>

                <FeedbackBox feedback={cloudflareFeedback} />

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<Save className="h-4 w-4" />} loading={saveCloudflare.isPending} onClick={() => saveCloudflare.mutate()}>
                        {t('settings.infra.save_and_verify')}
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                        loading={purgeCloudflare.isPending}
                        disabled={!data.settings.cloudflare.enabled}
                        onClick={handlePurge}
                    >
                        {t('settings.infra.purge_cache')}
                    </Button>
                </div>
            </SectionCard>

            {/* ── CDN ── */}
            <SectionCard
                icon={<Globe className="h-4 w-4" />}
                title={t('settings.infra.cdn_title')}
                subtitle={t('settings.infra.cdn_subtitle')}
                badge={<StatusBadge active={data.settings.cdn.enabled} activeLabel={t('settings.infra.enabled')} inactiveLabel={t('settings.infra.disabled')} />}
            >
                <Toggle label={t('settings.infra.cdn_enable')} checked={cdn.enabled} onChange={(enabled) => setCdn({ ...cdn, enabled })} />

                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">{t('settings.infra.cdn_url')}</label>
                    <input dir="ltr" className={inputClass} value={cdn.url} onChange={(e) => setCdn({ ...cdn, url: e.target.value.trim() })} placeholder="https://cdn.example.com" />
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {t('settings.infra.cdn_hint_1')} <span dir="ltr">{environment.app_url}</span> {t('settings.infra.cdn_hint_2')}
                    </p>
                </div>

                {environment.asset_url && (
                    <p className="text-xs text-slate-600">
                        {t('settings.infra.cdn_serving_from')} <b dir="ltr">{environment.asset_url}</b>
                    </p>
                )}

                <FeedbackBox feedback={cdnFeedback} />

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" />} loading={testCdn.isPending} disabled={!cdn.url} onClick={() => testCdn.mutate()}>
                        {t('settings.infra.test_btn')}
                    </Button>
                    <Button size="sm" icon={<Save className="h-4 w-4" />} loading={saveCdn.isPending} onClick={() => saveCdn.mutate()}>
                        {t('common.save')}
                    </Button>
                </div>
            </SectionCard>
        </div>
    );
};

export default InfrastructurePanel;
