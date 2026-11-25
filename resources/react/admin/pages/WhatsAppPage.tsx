import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, BadgeCheck, Bell, Bot, Copy, ExternalLink, FileText, History, MessageCircle, PlugZap, RefreshCw, Save, Send, Users, X } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';

type Dict = Record<string, any>;

interface SettingsPayload {
    settings: Dict;
    secrets: Record<string, Record<string, { configured: boolean; masked: string | null }>>;
    configured: boolean;
    webhooks: { meta: string; twilio: string };
    ai_assistant_available: boolean;
    embedded_signup: { available: boolean; app_id: string; config_id: string; graph_version: string };
    catalog: { providers: Record<string, string>; events: Record<string, { label: string; variables: string[] }> };
}

interface WhatsAppTemplate {
    id: number;
    name: string;
    language: string;
    category: string | null;
    category_label: string | null;
    status: string | null;
    rejected_reason: string | null;
    body: string | null;
    parameters: number;
    synced_at: string | null;
}

const TEMPLATE_STATUS: Record<string, { label: string; style: string }> = {
    approved: { label: 'معتمد', style: 'bg-emerald-100 text-emerald-800' },
    pending: { label: 'قيد المراجعة', style: 'bg-amber-100 text-amber-800' },
    rejected: { label: 'مرفوض', style: 'bg-rose-100 text-rose-800' },
    paused: { label: 'موقوف', style: 'bg-slate-200 text-slate-700' },
    disabled: { label: 'معطّل', style: 'bg-slate-200 text-slate-700' },
};
const PRICED_CATEGORIES: [string, string][] = [['marketing', 'تسويق'], ['utility', 'خدمة / تحديثات'], ['authentication', 'تحقق (OTP)']];

/** Where each value is obtained in Meta / Twilio. */
const LINKS = {
    metaApps: 'https://developers.facebook.com/apps',
    businessSettings: 'https://business.facebook.com/settings',
    systemUsers: 'https://business.facebook.com/settings/system-users',
    businessVerification: 'https://business.facebook.com/settings/security',
    whatsappManager: 'https://business.facebook.com/wa/manage/home/',
    templates: 'https://business.facebook.com/wa/manage/message-templates/',
    cloudApiStart: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    embeddedSignup: 'https://developers.facebook.com/docs/whatsapp/embedded-signup',
    techProvider: 'https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers',
    pricing: 'https://developers.facebook.com/docs/whatsapp/pricing',
    twilioConsole: 'https://console.twilio.com/',
    twilioSenders: 'https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders',
    twilioContent: 'https://console.twilio.com/us1/develop/sms/content-template-builder',
};

const ExtLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-[var(--tenant-primary)] hover:underline">
        {children} <ExternalLink className="h-3 w-3" />
    </a>
);

/** Step-by-step: where to get every value, for the company (manual) and for the platform owner (quick connect). */
const ConnectionGuide: React.FC<{ provider: string; embeddedAvailable: boolean }> = ({ provider, embeddedAvailable }) => {
    const { t } = useTranslation('admin');
    return (
        <Card title={t('whatsapp.guide_title')}>
            {provider === 'twilio' ? (
                <ol className="list-decimal ps-5 space-y-1.5 text-xs text-[var(--text-secondary)]">
                    <li>{t('whatsapp.guide_twilio_1')} <ExtLink href={LINKS.twilioConsole}>Twilio Console</ExtLink>.</li>
                    <li>{t('whatsapp.guide_twilio_2')} <ExtLink href={LINKS.twilioSenders}>WhatsApp senders</ExtLink>.</li>
                    <li>{t('whatsapp.guide_twilio_3')} <ExtLink href={LINKS.twilioContent}>Content Template Builder</ExtLink>.</li>
                </ol>
            ) : (
                <div className="space-y-4 text-xs text-[var(--text-secondary)]">
                    <div>
                        <p className="font-semibold text-[var(--text-primary)] mb-1">{t('whatsapp.guide_meta_before')}</p>
                        <ol className="list-decimal ps-5 space-y-1.5">
                            <li>{t('whatsapp.guide_meta_b1')} (<ExtLink href={LINKS.businessVerification}>Business Verification</ExtLink>)</li>
                            <li>{t('whatsapp.guide_meta_b2')}</li>
                        </ol>
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--text-primary)] mb-1">{t('whatsapp.guide_meta_manual')}</p>
                        <ol className="list-decimal ps-5 space-y-1.5">
                            <li>{t('whatsapp.guide_meta_m1')} (<ExtLink href={LINKS.metaApps}>Meta for Developers</ExtLink>)</li>
                            <li>{t('whatsapp.guide_meta_m2')}</li>
                            <li>{t('whatsapp.guide_meta_m3')} (<ExtLink href={LINKS.systemUsers}>System users</ExtLink>)</li>
                            <li>{t('whatsapp.guide_meta_m4')}</li>
                            <li>{t('whatsapp.guide_meta_m5')}</li>
                        </ol>
                    </div>
                    {!embeddedAvailable && (
                        <p className="text-[11px] text-[var(--text-muted)]">
                            {t('whatsapp.guide_useful_links')} <ExtLink href={LINKS.whatsappManager}>WhatsApp Manager</ExtLink> · <ExtLink href={LINKS.templates}>Templates</ExtLink> · <ExtLink href={LINKS.pricing}>Meta Pricing</ExtLink> · <ExtLink href={LINKS.businessSettings}>Business Settings</ExtLink>
                        </p>
                    )}
                </div>
            )}
        </Card>
    );
};

const BASE = '/modules/whatsapp';
const KEY = ['admin', 'whatsapp', 'settings'];
const field = 'w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]';
const errorText = (e: unknown) => (e as any)?.response?.data?.message || (e as Error)?.message || 'حدث خطأ';

const VARIABLE_LABELS: Record<string, string> = { customer_name: 'اسم العميل', car_name: 'اسم السيارة', status: 'الحالة', name: 'الاسم', phone: 'الجوال' };
const STATUS_LABELS: Record<string, string> = { received: 'واردة', queued: 'في الانتظار', sent: 'أُرسلت', delivered: 'وصلت', read: 'قُرئت', failed: 'فشلت' };
const EVENT_LABELS: Record<string, string> = {
    booking_created: 'طلب جديد', booking_status_updated: 'تحديث حالة', campaign: 'حملة', auto_reply: 'رد تلقائي', ai_reply: 'المساعد الذكي', agent_reply: 'موظف',
};

const TABS = [
    { id: 'connect', labelKey: 'whatsapp.tab_connect', icon: PlugZap },
    { id: 'notifications', labelKey: 'whatsapp.tab_notifications', icon: Bell },
    { id: 'templates', labelKey: 'whatsapp.tab_templates', icon: FileText },
    { id: 'inbound', labelKey: 'whatsapp.tab_inbound', icon: Bot },
    { id: 'team', labelKey: 'whatsapp.tab_team', icon: Users },
    { id: 'log', labelKey: 'whatsapp.tab_log', icon: History },
] as const;
type TabId = (typeof TABS)[number]['id'];

export const WhatsAppPage: React.FC = () => {
    const { user, hasRole } = useAuth();
    const isAdmin = user?.role === 'admin' || hasRole('admin');

    // Settings, log and stats stay with the admin; sales only get their inbox.
    if (!isAdmin) {
        return <Navigate to="/admin/whatsapp/conversations" replace />;
    }

    return <AdminWhatsApp />;
};

const AdminWhatsApp: React.FC = () => {
    const { t } = useTranslation('admin');
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<TabId>('connect');
    const [draft, setDraft] = useState<Dict | null>(null);
    const [secrets, setSecrets] = useState<Dict>({});
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const [testTo, setTestTo] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: KEY,
        queryFn: async (): Promise<SettingsPayload> => (await apiClient.get(`${BASE}/settings`)).data.data,
    });

    useEffect(() => {
        if (data && !draft) setDraft(structuredClone(data.settings));
    }, [data, draft]);

    const save = useMutation({
        mutationFn: async () => (await apiClient.put(`${BASE}/settings`, { settings: draft, secrets })).data.data as SettingsPayload,
        onSuccess: (payload) => {
            queryClient.setQueryData(KEY, payload);
            setDraft(structuredClone(payload.settings));
            setSecrets({});
            setNotice({ ok: true, text: t('whatsapp.save_success') });
        },
        onError: (e) => setNotice({ ok: false, text: errorText(e) }),
    });

    const test = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/test-connection`)).data,
        onSuccess: (res) => setNotice({ ok: true, text: res.message }),
        onError: (e) => setNotice({ ok: false, text: errorText(e) }),
    });

    const testSend = useMutation({
        mutationFn: async (event?: string) => (await apiClient.post(`${BASE}/test-send`, { to: testTo, event })).data,
        onSuccess: (res) => setNotice({ ok: true, text: res.message }),
        onError: (e) => setNotice({ ok: false, text: errorText(e) }),
    });

    const set = (path: string, value: any) =>
        setDraft((prev) => {
            const next = structuredClone(prev ?? {});
            const keys = path.split('.');
            let node: Dict = next;
            keys.slice(0, -1).forEach((k) => (node = node[k] ??= {}));
            node[keys[keys.length - 1]] = value;
            return next;
        });

    const setSecret = (provider: string, key: string, value: string) =>
        setSecrets((prev) => ({ ...prev, [provider]: { ...(prev[provider] ?? {}), [key]: value } }));

    if (isLoading || !data || !draft) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
            </div>
        );
    }

    const provider: string = draft.provider;
    const showSave = tab === 'connect' || tab === 'notifications' || tab === 'templates' || tab === 'inbound' || tab === 'team';
    const isEmbedded = data.settings.meta?.connection === 'embedded';
    const onConnected = (payload: SettingsPayload & { warnings?: string[] }, message: string) => {
        queryClient.setQueryData(KEY, payload);
        setDraft(structuredClone(payload.settings));
        queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'health'] });
        setNotice({ ok: !(payload.warnings?.length), text: [message, ...(payload.warnings ?? [])].join(' — ') });
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <MessageCircle className="h-6 w-6 text-emerald-600" /> {t('whatsapp.title')}
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{t('whatsapp.subtitle')}</p>
                    <Link to="/admin/whatsapp/conversations" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[var(--tenant-primary)] hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> {t('whatsapp.inbox_title')}
                    </Link>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${data.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {data.configured ? t('whatsapp.configured_via', { provider: data.catalog.providers[data.settings.provider] }) : t('whatsapp.not_configured')}
                </span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {TABS.map(({ id, labelKey, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold ${tab === id ? 'bg-[var(--tenant-primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>
                        <Icon className="h-4 w-4" /> {t(labelKey)}
                    </button>
                ))}
            </div>

            {notice && <div className={`rounded-[var(--radius-md)] px-4 py-2.5 text-xs ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{notice.text}</div>}

            {tab === 'connect' && (
                <div className="grid lg:grid-cols-2 gap-4">
                    <Card title={t('whatsapp.provider_card')}>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between text-sm">
                                <span>{t('whatsapp.enable_channel')}</span>
                                <input type="checkbox" checked={!!draft.enabled} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(data.catalog.providers).map(([key, label]) => (
                                    <button key={key} onClick={() => set('provider', key)} className={`rounded-[var(--radius-md)] border p-3 text-start text-xs font-semibold ${provider === key ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5' : 'border-[var(--border-default)]'}`}>
                                        {label}
                                        <span className="block font-normal text-[var(--text-muted)] mt-1">{key === 'meta' ? t('whatsapp.meta_direct_sub') : t('whatsapp.twilio_sub')}</span>
                                    </button>
                                ))}
                            </div>

                            {provider === 'meta' ? (
                                <>
                                    <EmbeddedSignup config={data.embedded_signup} connected={isEmbedded && data.configured}
                                        onDone={onConnected} onError={(text) => setNotice({ ok: false, text })} />
                                    <details open={!data.embedded_signup.available} className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-3">
                                        <summary className="cursor-pointer text-xs font-semibold">{t('whatsapp.manual_connect_summary')}</summary>
                                        <div className="space-y-4 mt-3">
                                            <Text label="Phone Number ID" dir="ltr" value={draft.meta?.phone_number_id} onChange={(v) => set('meta.phone_number_id', v)} />
                                            <Text label={t('whatsapp.waba_id_label')} dir="ltr" value={draft.meta?.business_account_id} onChange={(v) => set('meta.business_account_id', v)} />
                                            <Secret label={t('whatsapp.access_token_label')} status={data.secrets.meta?.access_token} onChange={(v) => setSecret('meta', 'access_token', v)} />
                                            <Secret label={t('whatsapp.app_secret_label')} status={data.secrets.meta?.app_secret} onChange={(v) => setSecret('meta', 'app_secret', v)} />
                                            <Text label="Graph API version" dir="ltr" value={draft.meta?.graph_version} onChange={(v) => set('meta.graph_version', v)} />
                                        </div>
                                    </details>
                                </>
                            ) : (
                                <>
                                    <Text label="Account SID" dir="ltr" value={draft.twilio?.account_sid} onChange={(v) => set('twilio.account_sid', v)} />
                                    <Secret label="Auth Token" status={data.secrets.twilio?.auth_token} onChange={(v) => setSecret('twilio', 'auth_token', v)} />
                                    <Text label={t('whatsapp.twilio_from_label')} dir="ltr" placeholder="+14155238886" value={draft.twilio?.from_number} onChange={(v) => set('twilio.from_number', v)} />
                                </>
                            )}
                            <Button variant="outline" loading={test.isPending} onClick={() => test.mutate()}>{t('whatsapp.test_connection')}</Button>
                        </div>
                    </Card>

                    <div className="space-y-4">
                        {provider === 'meta' && data.configured && <MetaHealthCard />}
                        <Card title={t('whatsapp.webhook_card')} subtitle={isEmbedded && provider === 'meta' ? t('whatsapp.webhook_sub_embedded') : t('whatsapp.webhook_sub_manual')}>
                            {provider === 'meta' ? (
                                <div className="space-y-3 text-xs">
                                    <CopyField label="Callback URL" value={data.webhooks.meta} />
                                    <CopyField label="Verify token" value={data.settings.meta?.verify_token} />
                                    <p className="text-[var(--text-muted)]">{t('whatsapp.webhook_meta_hint')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3 text-xs">
                                    <CopyField label="When a message comes in" value={data.webhooks.twilio} />
                                    <p className="text-[var(--text-muted)]">{t('whatsapp.webhook_twilio_hint')}</p>
                                </div>
                            )}
                        </Card>
                        <ConnectionGuide provider={provider} embeddedAvailable={data.embedded_signup.available} />
                        <Card title={t('whatsapp.test_msg_card')}>
                            <div className="flex gap-2">
                                <input dir="ltr" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="05xxxxxxxx" className={field} />
                                <Button loading={testSend.isPending} disabled={!testTo} onClick={() => testSend.mutate(undefined)} icon={<Send className="h-4 w-4" />}>{t('whatsapp.send')}</Button>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] mt-2">{t('whatsapp.test_msg_hint')}</p>
                        </Card>
                    </div>
                </div>
            )}

            {tab === 'templates' && <TemplatesTab draft={draft} set={set} provider={provider} />}

            {tab === 'notifications' && (
                <div className="space-y-4">
                    <TemplateOptions enabled={provider === 'meta'} />
                    <div className="rounded-[var(--radius-md)] bg-amber-50 text-amber-900 text-xs p-3">
                        {t('whatsapp.notif_banner')}
                    </div>
                    {Object.entries(data.catalog.events).map(([event, meta]) => {
                        const n = draft.notifications?.[event] ?? {};
                        return (
                            <Card key={event} title={String(t(`whatsapp.ev_${event}`, { defaultValue: meta.label }))} action={
                                <label className="flex items-center gap-2 text-xs">
                                    {t('whatsapp.notif_enable')}
                                    <input type="checkbox" checked={!!n.enabled} onChange={(e) => set(`notifications.${event}.enabled`, e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                                </label>
                            }>
                                <div className="grid lg:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">{t('whatsapp.notif_text_label')}</label>
                                        <textarea rows={4} value={n.text ?? ''} onChange={(e) => set(`notifications.${event}.text`, e.target.value)} className={field}
                                            placeholder={event === 'campaign' ? t('whatsapp.notif_campaign_ph') : t('whatsapp.notif_default_ph')} />
                                        <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('whatsapp.notif_vars')} {meta.variables.map((v) => `{${v}}`).join('  ')}</p>
                                    </div>
                                    <div className="space-y-3">
                                        {provider === 'meta' ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2"><Text label={t('whatsapp.notif_tpl_name')} dir="ltr" list="wa-approved-templates" value={n.template_name} onChange={(v) => set(`notifications.${event}.template_name`, v.toLowerCase())} /></div>
                                                <Text label={t('whatsapp.notif_tpl_lang')} dir="ltr" value={n.template_language} onChange={(v) => set(`notifications.${event}.template_language`, v)} />
                                            </div>
                                        ) : (
                                            <Text label="Twilio Content SID" dir="ltr" placeholder="HX..." value={n.twilio_content_sid} onChange={(v) => set(`notifications.${event}.twilio_content_sid`, v)} />
                                        )}
                                        <div>
                                            <label className="block text-xs font-semibold mb-1">{t('whatsapp.notif_tpl_params')}</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {meta.variables.map((v) => {
                                                    const params: string[] = n.template_params ?? [];
                                                    const index = params.indexOf(v);
                                                    return (
                                                        <button key={v} onClick={() => set(`notifications.${event}.template_params`, index >= 0 ? params.filter((p) => p !== v) : [...params, v])}
                                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${index >= 0 ? 'bg-[var(--tenant-primary)] text-white' : 'bg-[var(--surface-secondary)]'}`}>
                                                            {index >= 0 ? `{{${index + 1}}} ` : ''}{VARIABLE_LABELS[v] ?? v}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {event !== 'campaign' && (
                                            <Button size="sm" variant="ghost" disabled={!testTo} loading={testSend.isPending} onClick={() => testSend.mutate(event)}>
                                                {t('whatsapp.notif_test_to', { target: testTo || t('whatsapp.notif_enter_phone') })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {tab === 'inbound' && (
                <Card title={t('whatsapp.inbound_title')}>
                    <div className="space-y-4 max-w-2xl">
                        <label className="flex items-center justify-between text-sm">
                            <span>{t('whatsapp.inbound_create_lead')}</span>
                            <input type="checkbox" checked={!!draft.inbound?.create_lead} onChange={(e) => set('inbound.create_lead', e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                        </label>
                        <div>
                            <label className="block text-xs font-semibold mb-2">{t('whatsapp.inbound_auto_reply')}</label>
                            <div className="grid sm:grid-cols-3 gap-2">
                                {[
                                    ['off', t('whatsapp.inbound_off'), t('whatsapp.inbound_off_hint')],
                                    ['ai', t('whatsapp.inbound_ai'), data.ai_assistant_available ? t('whatsapp.inbound_ai_on') : t('whatsapp.inbound_ai_off')],
                                    ['static', t('whatsapp.inbound_static'), t('whatsapp.inbound_static_hint')],
                                ].map(([value, label, hint]) => (
                                    <button key={value} disabled={value === 'ai' && !data.ai_assistant_available} onClick={() => set('inbound.auto_reply', value)}
                                        className={`rounded-[var(--radius-md)] border p-3 text-start text-xs font-semibold disabled:opacity-50 ${draft.inbound?.auto_reply === value ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5' : 'border-[var(--border-default)]'}`}>
                                        {label}
                                        <span className="block font-normal text-[var(--text-muted)] mt-1">{hint}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {draft.inbound?.auto_reply === 'static' && (
                            <div>
                                <label className="block text-xs font-semibold mb-1">{t('whatsapp.inbound_static_label')}</label>
                                <textarea rows={3} value={draft.inbound?.static_reply ?? ''} onChange={(e) => set('inbound.static_reply', e.target.value)} className={field} />
                            </div>
                        )}
                        <div className="max-w-xs">
                            <label className="block text-xs font-semibold mb-1">{t('whatsapp.inbound_pause_label')}</label>
                            <input type="number" min={0} max={168} value={draft.inbound?.human_pause_hours ?? 12} onChange={(e) => set('inbound.human_pause_hours', Number(e.target.value))} className={field} />
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'team' && (
                <Card title={t('whatsapp.team_title')}>
                    <div className="space-y-4 max-w-2xl">
                        <label className="flex items-center justify-between gap-4 text-sm">
                            <span>
                                {t('whatsapp.team_auto_assign')}
                                <span className="block text-[11px] text-[var(--text-muted)]">{t('whatsapp.team_auto_assign_hint')}</span>
                            </span>
                            <input type="checkbox" checked={!!draft.inbox?.auto_assign} onChange={(e) => set('inbox.auto_assign', e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                        </label>
                        <label className="flex items-center justify-between gap-4 text-sm">
                            <span>
                                {t('whatsapp.team_hide_phone')}
                                <span className="block text-[11px] text-[var(--text-muted)]">{t('whatsapp.team_hide_phone_hint')}</span>
                            </span>
                            <input type="checkbox" checked={!!draft.inbox?.hide_phone_from_sales} onChange={(e) => set('inbox.hide_phone_from_sales', e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                        </label>
                        <div>
                            <label className="block text-xs font-semibold mb-1">{t('whatsapp.team_preset_tags')}</label>
                            <TagEditor tags={draft.inbox?.preset_tags ?? []} onChange={(tags) => set('inbox.preset_tags', tags)} />
                            <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('whatsapp.team_preset_tags_hint')}</p>
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'log' && <LogTab />}

            {showSave && (
                <div className="sticky bottom-3 flex justify-end">
                    <Button loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>{t('whatsapp.save_settings')}</Button>
                </div>
            )}
        </div>
    );
};

const Text: React.FC<{ label: string; value?: string; onChange: (v: string) => void; dir?: string; placeholder?: string; list?: string }> = ({ label, value, onChange, dir, placeholder, list }) => (
    <div>
        <label className="block text-xs font-semibold mb-1">{label}</label>
        <input dir={dir} list={list} placeholder={placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={field} />
    </div>
);

const useTemplates = (enabled = true) => useQuery({
    queryKey: ['admin', 'whatsapp', 'templates'],
    queryFn: async (): Promise<WhatsAppTemplate[]> => (await apiClient.get(`${BASE}/templates`)).data.data,
    enabled,
});

/** Suggestions for the template-name inputs: the approved templates synced from Meta. */
const TemplateOptions: React.FC<{ enabled: boolean }> = ({ enabled }) => {
    const { data: templates = [] } = useTemplates(enabled);

    return (
        <datalist id="wa-approved-templates">
            {templates.filter((t) => t.status === 'approved').map((t) => (
                <option key={t.id} value={t.name}>{`${t.language} · ${t.category_label ?? ''} · ${t.parameters} متغير`}</option>
            ))}
        </datalist>
    );
};

type FacebookSdk = {
    init: (options: Dict) => void;
    login: (callback: (response: Dict) => void, options: Dict) => void;
};

const loadFacebookSdk = (appId: string, version: string): Promise<FacebookSdk> => new Promise((resolve, reject) => {
    const w = window as any;
    if (w.FB) {
        w.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version });
        resolve(w.FB);
        return;
    }
    w.fbAsyncInit = () => {
        w.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version });
        resolve(w.FB);
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('تعذّر تحميل Facebook SDK — تأكد من الاتصال بالإنترنت أو مانع الإعلانات'));
    document.body.appendChild(script);
});

/**
 * WhatsApp Embedded Signup: the company logs in with its own Meta account and picks its number
 * (e.g. the unified 9200 number). Meta bills the company directly.
 */
const EmbeddedSignup: React.FC<{
    config: SettingsPayload['embedded_signup'];
    connected: boolean;
    onDone: (payload: SettingsPayload & { warnings?: string[] }, message: string) => void;
    onError: (text: string) => void;
}> = ({ config, connected, onDone, onError }) => {
    const session = useRef<{ waba_id?: string; phone_number_id?: string }>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            if (!/^https:\/\/([a-z]+\.)?facebook\.com$/.test(event.origin)) return;
            try {
                const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (message?.type !== 'WA_EMBEDDED_SIGNUP') return;
                if (message.event === 'FINISH' || message.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
                    session.current = { waba_id: message.data?.waba_id, phone_number_id: message.data?.phone_number_id };
                } else if (message.event === 'CANCEL') {
                    session.current = {};
                }
            } catch {
                // not a JSON message from the signup popup
            }
        };
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, []);

    const finish = async (code: string) => {
        // The popup posts the chosen account a moment before / after the login callback.
        for (let i = 0; i < 30 && !session.current.phone_number_id; i++) {
            await new Promise((r) => setTimeout(r, 100));
        }
        if (!session.current.waba_id || !session.current.phone_number_id) {
            throw new Error('لم يتم اختيار رقم واتساب في نافذة Meta');
        }
        const res = (await apiClient.post(`${BASE}/onboarding/embedded`, { code, ...session.current })).data;
        onDone(res.data, res.message);
    };

    const start = async () => {
        setBusy(true);
        session.current = {};
        try {
            const FB = await loadFacebookSdk(config.app_id, config.graph_version);
            FB.login((response) => {
                const code = response?.authResponse?.code;
                if (!code) {
                    setBusy(false);
                    onError('تم إلغاء الربط من نافذة Meta');
                    return;
                }
                finish(code).catch((e) => onError(errorText(e))).finally(() => setBusy(false));
            }, {
                config_id: config.config_id,
                response_type: 'code',
                override_default_response_type: true,
                extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
            });
        } catch (e) {
            setBusy(false);
            onError(errorText(e));
        }
    };

    const { t } = useTranslation('admin');
    if (!config.available) {
        return (
            <p className="rounded-[var(--radius-md)] bg-[var(--surface-secondary)] p-3 text-[11px] text-[var(--text-muted)]">
                {t('whatsapp.embedded_unavailable')}
            </p>
        );
    }

    return (
        <div className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3 space-y-2">
            <p className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                {connected ? <><BadgeCheck className="h-4 w-4" /> {t('whatsapp.embedded_connected')}</> : t('whatsapp.embedded_ready')}
            </p>
            <p className="text-[11px] text-emerald-800">
                {t('whatsapp.embedded_desc')}
            </p>
            <Button size="sm" loading={busy} onClick={start} icon={<PlugZap className="h-4 w-4" />}>
                {connected ? t('whatsapp.embedded_reconnect') : t('whatsapp.embedded_connect')}
            </Button>
        </div>
    );
};

const QUALITY: Record<string, { label: string; style: string }> = {
    GREEN: { label: 'ممتازة', style: 'bg-emerald-100 text-emerald-800' },
    YELLOW: { label: 'متوسطة — راجع شكاوى العملاء', style: 'bg-amber-100 text-amber-800' },
    RED: { label: 'منخفضة — خطر تقييد الرقم', style: 'bg-rose-100 text-rose-800' },
};
const LIMIT_TIERS: Record<string, string> = {
    TIER_50: '50 عميل/يوم', TIER_250: '250 عميل/يوم', TIER_1K: '1,000 عميل/يوم', TIER_10K: '10,000 عميل/يوم', TIER_100K: '100,000 عميل/يوم', TIER_UNLIMITED: 'بدون حد',
};
const REVIEW_STATUS: Record<string, string> = { APPROVED: 'معتمد', PENDING: 'قيد المراجعة', DECLINED: 'مرفوض', PENDING_REVIEW: 'قيد المراجعة', NONE: '—' };

/** What Meta says about the connected number: display name review, quality rating, daily limit. */
const MetaHealthCard: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const queryClient = useQueryClient();
    const { data: health, isFetching } = useQuery({
        queryKey: ['admin', 'whatsapp', 'health'],
        queryFn: async () => (await apiClient.get(`${BASE}/health`)).data.data,
        staleTime: 5 * 60 * 1000,
    });
    const refresh = async () => {
        const fresh = (await apiClient.get(`${BASE}/health`, { params: { refresh: 1 } })).data.data;
        queryClient.setQueryData(['admin', 'whatsapp', 'health'], fresh);
    };

    const phone = health?.phone ?? {};
    const quality = QUALITY[phone.quality_rating as string];

    return (
        <Card title={t('whatsapp.health_title')} action={
            <button onClick={refresh} disabled={isFetching} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label={t('crud.refresh')}>
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
        }>
            {!health ? (
                <p className="text-xs text-[var(--text-muted)]">{t('whatsapp.health_checking')}</p>
            ) : !health.ok ? (
                <p className="text-xs text-rose-700">{health.message}</p>
            ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                    <dt className="text-[var(--text-muted)]">{t('whatsapp.health_number')}</dt><dd dir="ltr" className="text-end font-semibold">{phone.display_phone_number ?? '—'}</dd>
                    <dt className="text-[var(--text-muted)]">{t('whatsapp.health_display_name')}</dt>
                    <dd>{phone.verified_name ?? '—'} <span className="text-[var(--text-muted)]">({REVIEW_STATUS[phone.name_status] ?? phone.name_status ?? '—'})</span></dd>
                    <dt className="text-[var(--text-muted)]">{t('whatsapp.health_quality')}</dt>
                    <dd>{quality ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${quality.style}`}>{quality.label}</span> : (phone.quality_rating ?? '—')}</dd>
                    <dt className="text-[var(--text-muted)]">{t('whatsapp.health_limit')}</dt><dd>{LIMIT_TIERS[phone.messaging_limit_tier] ?? phone.messaging_limit_tier ?? '—'}</dd>
                    {health.account && (<>
                        <dt className="text-[var(--text-muted)]">{t('whatsapp.health_review')}</dt><dd>{REVIEW_STATUS[health.account.account_review_status] ?? health.account.account_review_status ?? '—'}</dd>
                    </>)}
                    <dt className="text-[var(--text-muted)] flex items-center gap-1"><Activity className="h-3 w-3" /> {t('whatsapp.health_last_check')}</dt>
                    <dd>{health.checked_at ? new Date(health.checked_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG', { timeStyle: 'short', dateStyle: 'short' }) : '—'}</dd>
                    <dd className="col-span-2 pt-1"><ExtLink href={LINKS.whatsappManager}>{t('whatsapp.health_details_link')}</ExtLink></dd>
                </dl>
            )}
        </Card>
    );
};

/** Templates synced from Meta + the per-category prices used for the cost estimate in reports. */
const TemplatesTab: React.FC<{ draft: Dict; set: (path: string, value: any) => void; provider: string }> = ({ draft, set, provider }) => {
    const { t } = useTranslation('admin');
    const queryClient = useQueryClient();
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const { data: templates = [], isLoading } = useTemplates(provider === 'meta');

    const sync = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/templates/sync`)).data,
        onSuccess: (res) => {
            setNotice({ ok: true, text: res.message });
            queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'templates'] });
        },
        onError: (e) => setNotice({ ok: false, text: errorText(e) }),
    });

    return (
        <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2" padding="none" title={t('whatsapp.tpl_card_title')} action={
                provider === 'meta' && (
                    <div className="flex items-center gap-3 text-xs">
                        <ExtLink href={LINKS.templates}>{t('whatsapp.tpl_create_new')}</ExtLink>
                        <Button size="sm" variant="outline" loading={sync.isPending} onClick={() => sync.mutate()} icon={<RefreshCw className="h-3.5 w-3.5" />}>{t('whatsapp.tpl_sync')}</Button>
                    </div>
                )
            }>
                {provider !== 'meta' ? (
                    <p className="p-4 text-xs text-[var(--text-muted)]">{t('whatsapp.tpl_meta_only')}</p>
                ) : (
                    <>
                        {notice && <p className={`px-4 pt-3 text-xs ${notice.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{notice.text}</p>}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                                    <tr><th className="p-2 text-start">{t('whatsapp.tpl_col_name')}</th><th className="p-2 text-start">{t('whatsapp.tpl_col_cat')}</th><th className="p-2 text-start">{t('whatsapp.tpl_col_status')}</th><th className="p-2 text-start">{t('whatsapp.tpl_col_body')}</th></tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-default)]">
                                    {isLoading && <tr><td colSpan={4} className="p-4 text-center text-[var(--text-muted)]">{t('common.loading')}</td></tr>}
                                    {!isLoading && templates.length === 0 && (
                                        <tr><td colSpan={4} className="p-4 text-center text-[var(--text-muted)]">{t('whatsapp.tpl_empty')}</td></tr>
                                    )}
                                    {templates.map((tpl) => (
                                        <tr key={tpl.id}>
                                            <td className="p-2" dir="ltr"><span className="font-semibold">{tpl.name}</span> <span className="text-[var(--text-muted)]">{tpl.language}</span></td>
                                            <td className="p-2">{tpl.category_label ?? '—'}</td>
                                            <td className="p-2" title={tpl.rejected_reason ?? ''}>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMPLATE_STATUS[tpl.status ?? '']?.style ?? 'bg-slate-100'}`}>
                                                    {tpl.status ? String(t(`whatsapp.status_${tpl.status}`, { defaultValue: TEMPLATE_STATUS[tpl.status]?.label ?? tpl.status })) : '—'}
                                                </span>
                                            </td>
                                            <td className="p-2 max-w-[320px] truncate" title={tpl.body ?? ''}>{tpl.body ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            <Card title={t('whatsapp.pricing_title')} subtitle={t('whatsapp.pricing_sub')}>
                <div className="space-y-3">
                    {PRICED_CATEGORIES.map(([key, label]) => (
                        <div key={key}>
                            <label className="block text-xs font-semibold mb-1">{String(t(`whatsapp.cat_${key}`, { defaultValue: label }))}</label>
                            <input type="number" min={0} max={100} step="0.0001" dir="ltr" value={draft.pricing?.rates?.[key] ?? 0}
                                onChange={(e) => set(`pricing.rates.${key}`, Number(e.target.value))} className={field} />
                        </div>
                    ))}
                    <p className="text-[11px] text-[var(--text-muted)]">
                        {t('whatsapp.pricing_note')}
                    </p>
                </div>
            </Card>
        </div>
    );
};

const Secret: React.FC<{ label: string; status?: { configured: boolean; masked: string | null }; onChange: (v: string) => void }> = ({ label, status, onChange }) => {
    const { t } = useTranslation('admin');
    return (
        <div>
            <label className="block text-xs font-semibold mb-1">{label}</label>
            <input type="password" dir="ltr" autoComplete="off" onChange={(e) => onChange(e.target.value)} className={field}
                placeholder={status?.configured ? t('whatsapp.secret_saved', { masked: status.masked }) : t('whatsapp.secret_unset')} />
        </div>
    );
};

const CopyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <p className="font-semibold mb-1">{label}</p>
        <div className="flex gap-2">
            <code dir="ltr" className="flex-1 truncate rounded bg-[var(--surface-secondary)] px-2 py-1.5">{value}</code>
            <button onClick={() => navigator.clipboard?.writeText(value)} className="rounded border border-[var(--border-default)] px-2" aria-label="Copy"><Copy className="h-3.5 w-3.5" /></button>
        </div>
    </div>
);

const TagEditor: React.FC<{ tags: string[]; onChange: (tags: string[]) => void; suggestions?: string[] }> = ({ tags, onChange, suggestions = [] }) => {
    const { t } = useTranslation('admin');
    const [value, setValue] = useState('');
    const add = (raw: string) => {
        const tag = raw.trim().slice(0, 30);
        if (tag && !tags.includes(tag) && tags.length < 10) onChange([...tags, tag]);
        setValue('');
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] px-2 py-0.5 text-[11px] font-semibold">
                        {tag}
                        <button onClick={() => onChange(tags.filter((item) => item !== tag))} aria-label={tag}><X className="h-3 w-3" /></button>
                    </span>
                ))}
                <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={30} placeholder={t('whatsapp.tag_placeholder')}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(value); } }}
                    onBlur={() => value && add(value)}
                    className="w-24 rounded border border-dashed border-[var(--border-default)] bg-transparent px-2 py-0.5 text-[11px] focus:outline-hidden" />
            </div>
            {suggestions.filter((s) => !tags.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {suggestions.filter((s) => !tags.includes(s)).map((s) => (
                        <button key={s} onClick={() => add(s)} className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]">+ {s}</button>
                    ))}
                </div>
            )}
        </div>
    );
};

const LogTab: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const [status, setStatus] = useState('');
    const { data: stats } = useQuery({ queryKey: ['admin', 'whatsapp', 'stats'], queryFn: async () => (await apiClient.get(`${BASE}/stats`)).data.data });
    const { data: log } = useQuery({
        queryKey: ['admin', 'whatsapp', 'log', status],
        queryFn: async () => (await apiClient.get(`${BASE}/log`, { params: { status: status || undefined } })).data,
    });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                    [t('whatsapp.msg_sent'), stats?.sent],
                    [t('whatsapp.msg_delivered'), stats?.delivered],
                    [t('whatsapp.msg_read'), stats?.read],
                    [t('whatsapp.msg_failed'), stats?.failed],
                    [t('whatsapp.msg_received'), stats?.received],
                ].map(([label, value]) => (
                    <Card key={label as string} padding="sm">
                        <p className="text-[11px] text-[var(--text-muted)]">{label} {t('whatsapp.log_30d')}</p>
                        <p className="text-2xl font-bold mt-1">{value ?? 0}</p>
                    </Card>
                ))}
            </div>
            <Card padding="none" title={t('whatsapp.log_title')} action={
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-[var(--border-default)] px-2 py-1 text-xs">
                    <option value="">{t('whatsapp.log_all_statuses')}</option>
                    {['sent', 'delivered', 'read', 'failed'].map((s) => <option key={s} value={s}>{String(t(`whatsapp.msg_${s}`, { defaultValue: STATUS_LABELS[s] }))}</option>)}
                </select>
            }>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                            <tr><th className="p-2 text-start">{t('whatsapp.log_col_client')}</th><th className="p-2 text-start">{t('whatsapp.log_col_type')}</th><th className="p-2 text-start">{t('whatsapp.log_col_msg')}</th><th className="p-2 text-start">{t('whatsapp.log_col_status')}</th><th className="p-2 text-start">{t('whatsapp.log_col_time')}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {((log?.data ?? []) as Dict[]).map((m) => (
                                <tr key={m.id}>
                                    <td className="p-2" dir="ltr">+{m.conversation?.phone}</td>
                                    <td className="p-2">{m.event ? String(t(`whatsapp.ev_${m.event}`, { defaultValue: EVENT_LABELS[m.event] ?? m.event })) : '—'}{m.type === 'template' ? ` ${t('whatsapp.log_template_tag')}` : ''}</td>
                                    <td className="p-2 max-w-[320px] truncate" title={m.body}>{m.body}</td>
                                    <td className={`p-2 ${m.status === 'failed' ? 'text-rose-600' : ''}`} title={m.error ?? ''}>{m.status ? String(t(`whatsapp.msg_${m.status}`, { defaultValue: STATUS_LABELS[m.status] ?? m.status })) : '—'}</td>
                                    <td className="p-2">{new Date(m.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
