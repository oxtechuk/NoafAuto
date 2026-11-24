import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Bot, CheckCheck, Copy, History, Inbox, MessageCircle, PlugZap, Save, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';

type Dict = Record<string, any>;

interface SettingsPayload {
    settings: Dict;
    secrets: Record<string, Record<string, { configured: boolean; masked: string | null }>>;
    configured: boolean;
    webhooks: { meta: string; twilio: string };
    ai_assistant_available: boolean;
    catalog: { providers: Record<string, string>; events: Record<string, { label: string; variables: string[] }> };
}

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
    { id: 'connect', label: 'الربط', icon: PlugZap },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'inbound', label: 'الرد التلقائي', icon: Bot },
    { id: 'inbox', label: 'المحادثات', icon: Inbox },
    { id: 'log', label: 'سجل الإرسال', icon: History },
] as const;
type TabId = (typeof TABS)[number]['id'];

export const WhatsAppPage: React.FC = () => {
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
            setNotice({ ok: true, text: 'تم حفظ إعدادات واتساب' });
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
    const showSave = tab === 'connect' || tab === 'notifications' || tab === 'inbound';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <MessageCircle className="h-6 w-6 text-emerald-600" /> واتساب
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">ربط المعرض بواتساب: إشعارات الطلبات، صندوق المحادثات، والرد التلقائي بالمساعد الذكي</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${data.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {data.configured ? `مربوط عبر ${data.catalog.providers[data.settings.provider]}` : 'غير مربوط — تُرسل الإشعارات بإعدادات Twilio القديمة إن وُجدت'}
                </span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold ${tab === id ? 'bg-[var(--tenant-primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>
                        <Icon className="h-4 w-4" /> {label}
                    </button>
                ))}
            </div>

            {notice && <div className={`rounded-[var(--radius-md)] px-4 py-2.5 text-xs ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{notice.text}</div>}

            {tab === 'connect' && (
                <div className="grid lg:grid-cols-2 gap-4">
                    <Card title="مزوّد واتساب">
                        <div className="space-y-4">
                            <label className="flex items-center justify-between text-sm">
                                <span>تفعيل قناة واتساب</span>
                                <input type="checkbox" checked={!!draft.enabled} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(data.catalog.providers).map(([key, label]) => (
                                    <button key={key} onClick={() => set('provider', key)} className={`rounded-[var(--radius-md)] border p-3 text-start text-xs font-semibold ${provider === key ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5' : 'border-[var(--border-default)]'}`}>
                                        {label}
                                        <span className="block font-normal text-[var(--text-muted)] mt-1">{key === 'meta' ? 'مباشرة من Meta — بدون وسيط' : 'عبر حساب Twilio'}</span>
                                    </button>
                                ))}
                            </div>

                            {provider === 'meta' ? (
                                <>
                                    <Text label="Phone Number ID" dir="ltr" value={draft.meta?.phone_number_id} onChange={(v) => set('meta.phone_number_id', v)} />
                                    <Text label="WhatsApp Business Account ID (اختياري)" dir="ltr" value={draft.meta?.business_account_id} onChange={(v) => set('meta.business_account_id', v)} />
                                    <Secret label="Access Token (System User — دائم)" status={data.secrets.meta?.access_token} onChange={(v) => setSecret('meta', 'access_token', v)} />
                                    <Secret label="App Secret (للتحقق من الـ Webhook)" status={data.secrets.meta?.app_secret} onChange={(v) => setSecret('meta', 'app_secret', v)} />
                                    <Text label="Graph API version" dir="ltr" value={draft.meta?.graph_version} onChange={(v) => set('meta.graph_version', v)} />
                                </>
                            ) : (
                                <>
                                    <Text label="Account SID" dir="ltr" value={draft.twilio?.account_sid} onChange={(v) => set('twilio.account_sid', v)} />
                                    <Secret label="Auth Token" status={data.secrets.twilio?.auth_token} onChange={(v) => setSecret('twilio', 'auth_token', v)} />
                                    <Text label="رقم واتساب في Twilio" dir="ltr" placeholder="+14155238886" value={draft.twilio?.from_number} onChange={(v) => set('twilio.from_number', v)} />
                                </>
                            )}
                            <Button variant="outline" loading={test.isPending} onClick={() => test.mutate()}>اختبار الاتصال (بعد الحفظ)</Button>
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <Card title="رابط الـ Webhook" subtitle="ضعه في لوحة المزوّد لاستقبال رسائل العملاء وحالة التسليم.">
                            {provider === 'meta' ? (
                                <div className="space-y-3 text-xs">
                                    <CopyField label="Callback URL" value={data.webhooks.meta} />
                                    <CopyField label="Verify token" value={data.settings.meta?.verify_token} />
                                    <p className="text-[var(--text-muted)]">Meta for Developers ← تطبيقك ← WhatsApp ← Configuration ← Webhook، واشترك في الحقل <b>messages</b>.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 text-xs">
                                    <CopyField label="When a message comes in" value={data.webhooks.twilio} />
                                    <p className="text-[var(--text-muted)]">Twilio Console ← Messaging ← WhatsApp senders ← رقمك ← Webhook (POST). حالة التسليم تُرسل تلقائياً لنفس الرابط.</p>
                                </div>
                            )}
                        </Card>
                        <Card title="رسالة تجريبية">
                            <div className="flex gap-2">
                                <input dir="ltr" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="05xxxxxxxx" className={field} />
                                <Button loading={testSend.isPending} disabled={!testTo} onClick={() => testSend.mutate(undefined)} icon={<Send className="h-4 w-4" />}>إرسال</Button>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] mt-2">في Meta: الرسالة الحرة تصل فقط لرقم راسلك خلال 24 ساعة؛ لغير ذلك جرّب إشعاراً بقالب معتمد من تبويب الإشعارات.</p>
                        </Card>
                    </div>
                </div>
            )}

            {tab === 'notifications' && (
                <div className="space-y-4">
                    <div className="rounded-[var(--radius-md)] bg-amber-50 text-amber-900 text-xs p-3">
                        واتساب يسمح بالرسالة الحرة فقط خلال 24 ساعة من آخر رسالة للعميل. لإشعارات الطلبات استخدم <b>قالب معتمد</b>
                        ({provider === 'meta' ? 'اسم القالب في WhatsApp Manager' : 'Content SID يبدأ بـ HX من Twilio Content Template Builder'})، وإلا يُرسل النص العادي.
                    </div>
                    {Object.entries(data.catalog.events).map(([event, meta]) => {
                        const n = draft.notifications?.[event] ?? {};
                        return (
                            <Card key={event} title={meta.label} action={
                                <label className="flex items-center gap-2 text-xs">
                                    تفعيل
                                    <input type="checkbox" checked={!!n.enabled} onChange={(e) => set(`notifications.${event}.enabled`, e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                                </label>
                            }>
                                <div className="grid lg:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">نص الرسالة (بدون قالب / داخل 24 ساعة)</label>
                                        <textarea rows={4} value={n.text ?? ''} onChange={(e) => set(`notifications.${event}.text`, e.target.value)} className={field}
                                            placeholder={event === 'campaign' ? 'فارغ = نص الحملة الذي يكتبه الموظف' : 'مرحباً {customer_name}، تم تحديث طلبك ({car_name}) إلى: {status}'} />
                                        <p className="text-[11px] text-[var(--text-muted)] mt-1">المتغيرات: {meta.variables.map((v) => `{${v}}`).join('  ')}</p>
                                    </div>
                                    <div className="space-y-3">
                                        {provider === 'meta' ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2"><Text label="اسم القالب المعتمد" dir="ltr" value={n.template_name} onChange={(v) => set(`notifications.${event}.template_name`, v.toLowerCase())} /></div>
                                                <Text label="اللغة" dir="ltr" value={n.template_language} onChange={(v) => set(`notifications.${event}.template_language`, v)} />
                                            </div>
                                        ) : (
                                            <Text label="Twilio Content SID" dir="ltr" placeholder="HX..." value={n.twilio_content_sid} onChange={(v) => set(`notifications.${event}.twilio_content_sid`, v)} />
                                        )}
                                        <div>
                                            <label className="block text-xs font-semibold mb-1">متغيرات القالب بالترتيب ({'{{1}}'}, {'{{2}}'}, …)</label>
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
                                                إرسال تجربة لـ {testTo || '(أدخل رقماً في تبويب الربط)'}
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
                <Card title="رسائل العملاء الواردة">
                    <div className="space-y-4 max-w-2xl">
                        <label className="flex items-center justify-between text-sm">
                            <span>تسجيل العميل الجديد كـ Lead في الـ CRM (المصدر: واتساب)</span>
                            <input type="checkbox" checked={!!draft.inbound?.create_lead} onChange={(e) => set('inbound.create_lead', e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                        </label>
                        <div>
                            <label className="block text-xs font-semibold mb-2">الرد التلقائي</label>
                            <div className="grid sm:grid-cols-3 gap-2">
                                {[
                                    ['off', 'بدون رد تلقائي', 'الموظفون يردون من صندوق المحادثات'],
                                    ['ai', 'المساعد الذكي', data.ai_assistant_available ? 'يرد بنفس إعدادات المساعد وأدواته' : 'فعّل موديول المساعد وأضف مفتاح Gemini أولاً'],
                                    ['static', 'رد ثابت', 'رسالة واحدة كل 12 ساعة'],
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
                                <label className="block text-xs font-semibold mb-1">نص الرد الثابت</label>
                                <textarea rows={3} value={draft.inbound?.static_reply ?? ''} onChange={(e) => set('inbound.static_reply', e.target.value)} className={field} />
                            </div>
                        )}
                        <div className="max-w-xs">
                            <label className="block text-xs font-semibold mb-1">إيقاف الرد التلقائي بعد رد الموظف (ساعات)</label>
                            <input type="number" min={0} max={168} value={draft.inbound?.human_pause_hours ?? 12} onChange={(e) => set('inbound.human_pause_hours', Number(e.target.value))} className={field} />
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'inbox' && <InboxTab />}
            {tab === 'log' && <LogTab />}

            {showSave && (
                <div className="sticky bottom-3 flex justify-end">
                    <Button loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>حفظ الإعدادات</Button>
                </div>
            )}
        </div>
    );
};

const Text: React.FC<{ label: string; value?: string; onChange: (v: string) => void; dir?: string; placeholder?: string }> = ({ label, value, onChange, dir, placeholder }) => (
    <div>
        <label className="block text-xs font-semibold mb-1">{label}</label>
        <input dir={dir} placeholder={placeholder} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={field} />
    </div>
);

const Secret: React.FC<{ label: string; status?: { configured: boolean; masked: string | null }; onChange: (v: string) => void }> = ({ label, status, onChange }) => (
    <div>
        <label className="block text-xs font-semibold mb-1">{label}</label>
        <input type="password" dir="ltr" autoComplete="off" onChange={(e) => onChange(e.target.value)} className={field}
            placeholder={status?.configured ? `محفوظ ${status.masked} — اكتب قيمة جديدة للتغيير` : 'غير مضاف'} />
    </div>
);

const CopyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <p className="font-semibold mb-1">{label}</p>
        <div className="flex gap-2">
            <code dir="ltr" className="flex-1 truncate rounded bg-[var(--surface-secondary)] px-2 py-1.5">{value}</code>
            <button onClick={() => navigator.clipboard?.writeText(value)} className="rounded border border-[var(--border-default)] px-2" aria-label="نسخ"><Copy className="h-3.5 w-3.5" /></button>
        </div>
    </div>
);

const InboxTab: React.FC = () => {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<number | null>(null);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    const { data: list } = useQuery({
        queryKey: ['admin', 'whatsapp', 'conversations'],
        queryFn: async () => (await apiClient.get(`${BASE}/conversations`)).data,
        refetchInterval: 15000,
    });
    const { data: thread } = useQuery({
        queryKey: ['admin', 'whatsapp', 'thread', selected],
        queryFn: async () => (await apiClient.get(`${BASE}/conversations/${selected}`)).data.data,
        enabled: selected !== null,
        refetchInterval: 8000,
    });

    useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [thread]);

    const reply = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/conversations/${selected}/reply`, { text })).data,
        onSuccess: () => {
            setText('');
            setError(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
        },
        onError: (e) => setError(errorText(e)),
    });

    const resumeAi = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/conversations/${selected}/resume-ai`)).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'thread', selected] }),
    });

    const rows: Dict[] = list?.data ?? [];
    const conversation = thread?.conversation;

    return (
        <div className="grid lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-2" padding="none">
                <div className="max-h-[600px] overflow-y-auto divide-y divide-[var(--border-default)]">
                    {rows.length === 0 && <p className="p-6 text-center text-xs text-[var(--text-muted)]">لا توجد محادثات بعد — ستظهر هنا رسائل العملاء بعد ربط الـ Webhook</p>}
                    {rows.map((c) => (
                        <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-start p-3 text-xs hover:bg-[var(--surface-secondary)] ${selected === c.id ? 'bg-[var(--surface-secondary)]' : ''}`}>
                            <div className="flex justify-between gap-2">
                                <span className="font-semibold truncate">{c.name || '+' + c.phone}</span>
                                {c.unread_count > 0 && <span className="rounded-full bg-emerald-600 text-white px-1.5">{c.unread_count}</span>}
                            </div>
                            <p className="text-[var(--text-muted)] truncate mt-0.5">{c.last_message}</p>
                        </button>
                    ))}
                </div>
            </Card>
            <Card className="lg:col-span-3" padding="none">
                {!conversation ? (
                    <p className="p-6 text-xs text-[var(--text-muted)]">اختر محادثة</p>
                ) : (
                    <div className="flex flex-col h-[600px]">
                        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] p-3 text-xs">
                            <div>
                                <p className="font-bold">{conversation.name || 'عميل'} <span dir="ltr" className="font-normal text-[var(--text-muted)]">+{conversation.phone}</span></p>
                                <p className={conversation.within_window ? 'text-emerald-700' : 'text-amber-700'}>
                                    {conversation.within_window ? 'داخل نافذة الـ 24 ساعة — يمكنك الرد بحرية' : 'خارج نافذة الـ 24 ساعة — القوالب المعتمدة فقط'}
                                </p>
                            </div>
                            {conversation.ai_paused_until && new Date(conversation.ai_paused_until) > new Date() && (
                                <Button size="sm" variant="ghost" onClick={() => resumeAi.mutate()}>تشغيل الرد التلقائي</Button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto bg-[var(--surface-secondary)] p-3 space-y-2">
                            {(thread.messages as Dict[]).map((m) => (
                                <div key={m.id} className={`flex ${m.direction === 'in' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.direction === 'in' ? 'bg-white border border-[var(--border-default)]' : 'bg-emerald-50 border border-emerald-100'}`}>
                                        {m.body || <i className="text-[var(--text-muted)]">[{m.type}]</i>}
                                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                                            {m.direction === 'out' && <span>{EVENT_LABELS[m.event] ?? m.event}{m.sent_by ? ` · ${m.sent_by}` : ''}</span>}
                                            <span>{new Date(m.created_at).toLocaleString('ar-EG', { timeStyle: 'short', dateStyle: 'short' })}</span>
                                            {m.direction === 'out' && <span className={m.status === 'failed' ? 'text-rose-600' : m.status === 'read' ? 'text-sky-600' : ''}>{m.status === 'read' || m.status === 'delivered' ? <CheckCheck className="inline h-3 w-3" /> : null} {STATUS_LABELS[m.status]}</span>}
                                        </div>
                                        {m.error && <p className="text-[10px] text-rose-600 mt-1">{m.error}</p>}
                                    </div>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>
                        {error && <p className="px-3 pt-2 text-xs text-rose-700">{error}</p>}
                        <div className="flex gap-2 p-3 border-t border-[var(--border-default)]">
                            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب ردك… (يوقف الرد التلقائي لهذا العميل مؤقتاً)" className={field} />
                            <Button loading={reply.isPending} disabled={!text.trim()} onClick={() => reply.mutate()} icon={<Send className="h-4 w-4" />}>إرسال</Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

const LogTab: React.FC = () => {
    const [status, setStatus] = useState('');
    const { data: stats } = useQuery({ queryKey: ['admin', 'whatsapp', 'stats'], queryFn: async () => (await apiClient.get(`${BASE}/stats`)).data.data });
    const { data: log } = useQuery({
        queryKey: ['admin', 'whatsapp', 'log', status],
        queryFn: async () => (await apiClient.get(`${BASE}/log`, { params: { status: status || undefined } })).data,
    });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[['أُرسلت', stats?.sent], ['وصلت', stats?.delivered], ['قُرئت', stats?.read], ['فشلت', stats?.failed], ['رسائل واردة', stats?.received]].map(([label, value]) => (
                    <Card key={label as string} padding="sm">
                        <p className="text-[11px] text-[var(--text-muted)]">{label} (30 يوم)</p>
                        <p className="text-2xl font-bold mt-1">{value ?? 0}</p>
                    </Card>
                ))}
            </div>
            <Card padding="none" title="سجل الرسائل المرسلة" action={
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-[var(--border-default)] px-2 py-1 text-xs">
                    <option value="">كل الحالات</option>
                    {['sent', 'delivered', 'read', 'failed'].map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
            }>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                            <tr><th className="p-2 text-start">العميل</th><th className="p-2 text-start">النوع</th><th className="p-2 text-start">الرسالة</th><th className="p-2 text-start">الحالة</th><th className="p-2 text-start">الوقت</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {((log?.data ?? []) as Dict[]).map((m) => (
                                <tr key={m.id}>
                                    <td className="p-2" dir="ltr">+{m.conversation?.phone}</td>
                                    <td className="p-2">{EVENT_LABELS[m.event] ?? m.event ?? '—'}{m.type === 'template' ? ' (قالب)' : ''}</td>
                                    <td className="p-2 max-w-[320px] truncate" title={m.body}>{m.body}</td>
                                    <td className={`p-2 ${m.status === 'failed' ? 'text-rose-600' : ''}`} title={m.error ?? ''}>{STATUS_LABELS[m.status] ?? m.status}</td>
                                    <td className="p-2">{new Date(m.created_at).toLocaleString('ar-EG')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
