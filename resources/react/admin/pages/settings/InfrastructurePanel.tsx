import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
function errorFeedback(error: any): Feedback {
    const data = error?.response?.data;
    const validation = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
    return {
        type: 'error',
        text: validation || data?.message || 'حدث خطأ غير متوقع.',
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

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
    <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}
    >
        {active ? 'مفعّل' : 'غير مفعّل'}
    </span>
);

export const InfrastructurePanel: React.FC = () => {
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
        onError: (error) => setRedisFeedback(errorFeedback(error)),
    });

    const saveRedis = useMutation({
        mutationFn: async () => (await apiClient.put(`${BASE}/redis`, redisPayload())).data,
        onSuccess: (res) => {
            setRedisFeedback({ type: 'success', text: res.message });
            onSaved(res.data);
        },
        onError: (error) => setRedisFeedback(errorFeedback(error)),
    });

    const saveCloudflare = useMutation({
        mutationFn: async () => (await apiClient.put(`${BASE}/cloudflare`, cloudflare)).data,
        onSuccess: (res) => {
            setCloudflareFeedback({ type: 'success', text: res.message });
            onSaved(res.data);
        },
        onError: (error) => setCloudflareFeedback(errorFeedback(error)),
    });

    const purgeCloudflare = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/cloudflare/purge`)).data,
        onSuccess: (res) => setCloudflareFeedback({ type: 'success', text: res.message }),
        onError: (error) => setCloudflareFeedback(errorFeedback(error)),
    });

    const testCdn = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/cdn/test`, { ...cdn, enabled: true })).data,
        onSuccess: (res) => setCdnFeedback({ type: 'success', text: res.message }),
        onError: (error) => setCdnFeedback(errorFeedback(error)),
    });

    const saveCdn = useMutation({
        mutationFn: async () => (await apiClient.put(`${BASE}/cdn`, cdn)).data,
        onSuccess: (res) => {
            setCdnFeedback({ type: 'success', text: res.message });
            onSaved(res.data);
        },
        onError: (error) => setCdnFeedback(errorFeedback(error)),
    });

    const handleSaveRedis = async () => {
        if (!redis || !data) return;
        const sessionWillChange =
            (data.settings.redis.enabled && data.settings.redis.use_for_session) !== (redis.enabled && redis.use_for_session);
        if (sessionWillChange) {
            const ok = await confirm({
                title: 'تغيير مكان حفظ الجلسات',
                message: 'تغيير الجلسات سيُسجّل خروج كل المستخدمين المتصلين الآن، وأنت منهم.',
                detail: 'ستحتاج لتسجيل الدخول مرة أخرى بعد الحفظ.',
                confirmText: 'حفظ وتسجيل الخروج',
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
            title: 'مسح كاش Cloudflare',
            message: 'سيتم مسح كل الملفات المخزنة في Cloudflare، وستُحمّل من السيرفر من جديد.',
            detail: 'قد يبطؤ الموقع قليلاً لدقائق حتى يمتلئ الكاش مرة أخرى.',
            confirmText: 'مسح الكاش',
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
                <h5 className="text-base font-bold text-[var(--text-primary)]">السيرفر والأداء</h5>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                    ربط Redis و Cloudflare و CDN. كل اتصال يتم اختباره قبل تفعيله، وأي خطأ لا يوقف الموقع.
                </p>
            </div>

            {/* Current state */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'الكاش', value: environment.drivers.cache },
                    { label: 'الجلسات', value: environment.drivers.session },
                    { label: 'الطوابير', value: environment.drivers.queue },
                    { label: 'Cloudflare', value: environment.behind_cloudflare ? 'الطلب يمر عبره' : 'غير مكتشف' },
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
                subtitle="كاش في الذاكرة بدل قاعدة البيانات: قراءة الكاش أسرع بكثير وضغط أقل على MySQL. لو توقف Redis يرجع الموقع تلقائياً لقاعدة البيانات."
                badge={<StatusBadge active={data.settings.redis.enabled} />}
            >
                {redisUnavailable && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                            PHP على هذا السيرفر لا يحتوي على عميل Redis. فعّل امتداد <b dir="ltr">ext-redis</b> (phpredis) من لوحة
                            الاستضافة (cPanel ← Select PHP Version)، ثم أعد تحميل الصفحة.
                        </span>
                    </div>
                )}

                <Toggle
                    label="تفعيل Redis"
                    checked={redis.enabled}
                    disabled={redisUnavailable}
                    onChange={(enabled) => setRedis({ ...redis, enabled })}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">العنوان (Host)</label>
                        <input dir="ltr" className={inputClass} value={redis.host} disabled={redisUnavailable} onChange={(e) => setRedis({ ...redis, host: e.target.value })} placeholder="127.0.0.1" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">المنفذ (Port)</label>
                        <input dir="ltr" type="number" className={inputClass} value={redis.port} disabled={redisUnavailable} onChange={(e) => setRedis({ ...redis, port: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">رقم قاعدة البيانات</label>
                        <input dir="ltr" type="number" min={0} max={14} className={inputClass} value={redis.database} disabled={redisUnavailable} onChange={(e) => setRedis({ ...redis, database: Number(e.target.value) })} />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">كلمة المرور</label>
                        <input
                            dir="ltr"
                            type="password"
                            autoComplete="new-password"
                            className={inputClass}
                            value={redis.password}
                            disabled={redisUnavailable || redis.clear_password}
                            onChange={(e) => setRedis({ ...redis, password: e.target.value })}
                            placeholder={redis.has_password ? '•••••••• محفوظة، اتركها فارغة للإبقاء عليها' : 'بدون كلمة مرور'}
                        />
                        {redis.has_password && (
                            <div className="mt-2">
                                <Toggle label="حذف كلمة المرور المحفوظة" checked={redis.clear_password} onChange={(clear_password) => setRedis({ ...redis, clear_password, password: '' })} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-500">استخدام Redis في:</p>
                    <Toggle label="الكاش (موصى به)" checked={redis.use_for_cache} disabled={redisUnavailable} onChange={(use_for_cache) => setRedis({ ...redis, use_for_cache })} />
                    <div>
                        <Toggle label="الجلسات" checked={redis.use_for_session} disabled={redisUnavailable} onChange={(use_for_session) => setRedis({ ...redis, use_for_session })} />
                        <p className="text-[11px] text-slate-400 ms-6 mt-0.5">تغييرها يسجّل خروج كل المستخدمين مرة واحدة.</p>
                    </div>
                    <div>
                        <Toggle label="الطوابير (Queue)" checked={redis.use_for_queue} disabled={redisUnavailable} onChange={(use_for_queue) => setRedis({ ...redis, use_for_queue })} />
                        <p className="text-[11px] text-slate-400 ms-6 mt-0.5">
                            يتم إعادة تشغيل الـ workers تلقائياً. المهام المعلقة في قاعدة البيانات تحتاج worker على <span dir="ltr">database</span> حتى تنتهي.
                        </p>
                    </div>
                </div>

                <FeedbackBox feedback={redisFeedback} />

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" icon={<PlugZap className="h-4 w-4" />} loading={testRedis.isPending} disabled={redisUnavailable} onClick={() => testRedis.mutate()}>
                        اختبار الاتصال
                    </Button>
                    <Button size="sm" icon={<Save className="h-4 w-4" />} loading={saveRedis.isPending} disabled={redisUnavailable && redis.enabled} onClick={handleSaveRedis}>
                        حفظ
                    </Button>
                </div>
            </SectionCard>

            {/* ── Cloudflare ── */}
            <SectionCard
                icon={<Cloud className="h-4 w-4" />}
                title="Cloudflare"
                subtitle="مسح الكاش من هنا، ومعرفة عنوان الزائر الحقيقي خلف Cloudflare (ضروري لحماية تسجيل الدخول و OTP والنماذج من الحظر الجماعي)."
                badge={<StatusBadge active={data.settings.cloudflare.enabled} />}
            >
                <Toggle label="تفعيل ربط Cloudflare" checked={cloudflare.enabled} onChange={(enabled) => setCloudflare({ ...cloudflare, enabled })} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Zone ID</label>
                        <input dir="ltr" className={inputClass} value={cloudflare.zone_id} onChange={(e) => setCloudflare({ ...cloudflare, zone_id: e.target.value.trim() })} placeholder="32 حرف من صفحة Overview" />
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
                            placeholder={cloudflare.has_api_token ? '•••••••• محفوظ، اتركه فارغاً للإبقاء عليه' : 'Zone Read + Cache Purge'}
                        />
                    </div>
                </div>

                <Toggle
                    label="الثقة في عناوين Cloudflare لمعرفة IP الزائر الحقيقي"
                    checked={cloudflare.trust_proxies}
                    onChange={(trust_proxies) => setCloudflare({ ...cloudflare, trust_proxies })}
                />

                {data.settings.cloudflare.enabled && data.settings.cloudflare.zone_name && (
                    <p className="text-xs text-slate-600">
                        متصل بـ <b dir="ltr">{data.settings.cloudflare.zone_name}</b> · {data.settings.cloudflare.ips.length} نطاق IP لـ Cloudflare
                    </p>
                )}

                <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <summary className="font-bold cursor-pointer">طريقة إنشاء التوكن وتسريع الـ API</summary>
                    <ol className="list-decimal ps-5 mt-2 space-y-1 leading-relaxed">
                        <li>Cloudflare ← My Profile ← API Tokens ← Create Token ← Custom.</li>
                        <li>الصلاحيات: <span dir="ltr">Zone → Zone → Read</span> و <span dir="ltr">Zone → Cache Purge → Purge</span>، على الدومين ده بس.</li>
                        <li>
                            للاستفادة من كاش الـ API: Caching ← Cache Rules ← قاعدة لـ <span dir="ltr">/api/v1/store/*</span> بـ
                            «Eligible for cache» و «Respect origin». الموقع يرسل مدة الكاش المناسبة لكل رابط.
                        </li>
                    </ol>
                </details>

                <FeedbackBox feedback={cloudflareFeedback} />

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<Save className="h-4 w-4" />} loading={saveCloudflare.isPending} onClick={() => saveCloudflare.mutate()}>
                        حفظ والتحقق
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                        loading={purgeCloudflare.isPending}
                        disabled={!data.settings.cloudflare.enabled}
                        onClick={handlePurge}
                    >
                        مسح كاش Cloudflare
                    </Button>
                </div>
            </SectionCard>

            {/* ── CDN ── */}
            <SectionCard
                icon={<Globe className="h-4 w-4" />}
                title="CDN للملفات والصور"
                subtitle="تقديم ملفات الواجهة والصور من شبكة CDN (مثل BunnyCDN أو CloudFront) أقرب للزائر. الموقع نفسه يبقى على السيرفر."
                badge={<StatusBadge active={data.settings.cdn.enabled} />}
            >
                <Toggle label="تفعيل الـ CDN" checked={cdn.enabled} onChange={(enabled) => setCdn({ ...cdn, enabled })} />

                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">رابط الـ CDN</label>
                    <input dir="ltr" className={inputClass} value={cdn.url} onChange={(e) => setCdn({ ...cdn, url: e.target.value.trim() })} placeholder="https://cdn.example.com" />
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        أنشئ Pull Zone مصدرها (Origin) <span dir="ltr">{environment.app_url}</span> وفعّل CORS. الاختبار يتأكد أن الـ CDN يقدم
                        نفس ملفات الموقع قبل التفعيل.
                    </p>
                </div>

                {environment.asset_url && (
                    <p className="text-xs text-slate-600">
                        الملفات تُقدَّم الآن من <b dir="ltr">{environment.asset_url}</b>
                    </p>
                )}

                <FeedbackBox feedback={cdnFeedback} />

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" />} loading={testCdn.isPending} disabled={!cdn.url} onClick={() => testCdn.mutate()}>
                        اختبار
                    </Button>
                    <Button size="sm" icon={<Save className="h-4 w-4" />} loading={saveCdn.isPending} onClick={() => saveCdn.mutate()}>
                        حفظ
                    </Button>
                </div>
            </SectionCard>
        </div>
    );
};

export default InfrastructurePanel;
