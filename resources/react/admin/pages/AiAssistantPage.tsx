import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bot, CheckCircle2, KeyRound, MessageSquare, PlugZap, Save, Send, ShieldCheck, Store, Wrench, XCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';

type Dict = Record<string, any>;

interface SettingsPayload {
    settings: Dict;
    api_key: { configured: boolean; masked: string | null };
    ready: boolean;
    catalog: { topics: Record<string, string>; blocked: Record<string, string>; tools: string[] };
}

const BASE = '/modules/ai-assistant';
const KEY = ['admin', 'ai-assistant', 'settings'];

const TOOL_LABELS: Record<string, string> = {
    search_cars: 'البحث في سيارات المعرض',
    get_car: 'تفاصيل سيارة',
    compare_cars: 'المقارنة بين السيارات',
    calculate_installment: 'حساب الأقساط بالبنوك',
    list_offers: 'العروض الحالية',
    get_showroom_info: 'معلومات المعرض',
    create_lead: 'تسجيل طلب العميل في الـ CRM',
};

const SHOWROOM_FIELDS: { key: string; label: string; placeholder: string }[] = [
    { key: 'working_hours', label: 'مواعيد العمل', placeholder: 'السبت - الخميس: 9 ص - 10 م\nالجمعة: 4 م - 10 م\nرمضان: 8 م - 2 ص' },
    { key: 'branches', label: 'الفروع والعناوين', placeholder: 'الرياض - طريق الملك فهد، حي العليا (رابط الخريطة)' },
    { key: 'whatsapp', label: 'رقم واتساب للتحويل لموظف', placeholder: '9665xxxxxxxx' },
    { key: 'documents', label: 'المستندات المطلوبة', placeholder: 'الهوية، تعريف بالراتب، كشف حساب 3 أشهر...' },
    { key: 'financing_terms', label: 'شروط التمويل', placeholder: 'أقل راتب 4000 ريال، أقل مدة خدمة 3 أشهر...' },
    { key: 'warranty', label: 'الضمان والصيانة', placeholder: 'ضمان الوكيل 5 سنوات أو 100 ألف كم...' },
    { key: 'extra_info', label: 'معلومات إضافية', placeholder: 'أي شيء تبغى المساعد يعرفه عن المعرض' },
];

const TABS = [
    { id: 'connect', labelKey: 'ai.tab_connect', icon: PlugZap },
    { id: 'persona', labelKey: 'ai.tab_persona', icon: Bot },
    { id: 'rules', labelKey: 'ai.tab_rules', icon: ShieldCheck },
    { id: 'showroom', labelKey: 'ai.tab_showroom', icon: Store },
    { id: 'tools', labelKey: 'ai.tab_tools', icon: Wrench },
    { id: 'playground', labelKey: 'ai.tab_playground', icon: Send },
    { id: 'conversations', labelKey: 'ai.tab_conversations', icon: MessageSquare },
] as const;

type TabId = (typeof TABS)[number]['id'];

const field = 'w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]';
const errorText = (e: unknown) => (e as any)?.response?.data?.message || (e as Error)?.message || 'Error';

export const AiAssistantPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { t } = useTranslation('admin');
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<TabId>('connect');
    const [draft, setDraft] = useState<Dict | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: KEY,
        queryFn: async (): Promise<SettingsPayload> => (await apiClient.get(`${BASE}/settings`)).data.data,
    });

    useEffect(() => {
        if (data && !draft) setDraft(structuredClone(data.settings));
    }, [data, draft]);

    const save = useMutation({
        mutationFn: async () => {
            const body: Dict = { settings: draft };
            if (apiKey.trim() !== '') body.api_key = apiKey.trim();
            return (await apiClient.put(`${BASE}/settings`, body)).data.data as SettingsPayload;
        },
        onSuccess: (payload) => {
            queryClient.setQueryData(KEY, payload);
            setDraft(structuredClone(payload.settings));
            setApiKey('');
            setNotice({ ok: true, text: t('ai.save_success') });
        },
        onError: (e) => setNotice({ ok: false, text: errorText(e) }),
    });

    const test = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/test-connection`, apiKey.trim() ? { api_key: apiKey.trim() } : {})).data,
        onSuccess: (res) => setNotice({ ok: true, text: t('ai.test_success', { count: res.data?.models?.length ?? 0 }) }),
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

    const toggleInList = (list: string, key: string) => {
        const current: string[] = draft?.[list] ?? [];
        set(list, current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
    };

    if (isLoading || !data || !draft) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
            </div>
        );
    }

    const showSave = tab !== 'playground' && tab !== 'conversations';
    const models: string[] = (test.data as any)?.data?.models ?? [];

    return (
        <div className="space-y-6">
            {!embedded && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Bot className="h-6 w-6 text-[var(--tenant-primary)]" /> {t('ai.title')}
                        </h1>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {t('ai.subtitle')}
                        </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${data.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {data.ready ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {data.ready ? t('ai.ready_on') : !data.api_key.configured ? t('ai.ready_no_key') : t('ai.ready_off')}
                    </span>
                </div>
            )}

            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {TABS.map(({ id, labelKey, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold transition-colors ${
                            tab === id ? 'bg-[var(--tenant-primary)] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <Icon className="h-4 w-4" /> {t(labelKey)}
                    </button>
                ))}
            </div>

            {notice && (
                <div className={`rounded-[var(--radius-md)] px-4 py-2.5 text-xs ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{notice.text}</div>
            )}

            {tab === 'connect' && (
                <Card title={t('ai.connect_title')} subtitle={t('ai.connect_sub')}>
                    <div className="space-y-4">
                        <Toggle label={t('ai.enable_ai')} checked={!!draft.enabled} onChange={(v) => set('enabled', v)} />
                        <Toggle label={t('ai.show_storefront')} checked={!!draft.show_on_storefront} onChange={(v) => set('show_on_storefront', v)} />
                        <div>
                            <label className="block text-xs font-semibold mb-1">{t('ai.api_key')}</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <KeyRound className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                                    <input
                                        type="password"
                                        dir="ltr"
                                        autoComplete="off"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={data.api_key.configured ? `${data.api_key.masked}` : 'AIza...'}
                                        className={`${field} ps-9`}
                                    />
                                </div>
                                <Button variant="outline" loading={test.isPending} onClick={() => test.mutate()}>{t('ai.test_conn')}</Button>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold mb-1">{t('ai.model')}</label>
                                <input dir="ltr" list="gemini-models" value={draft.model ?? ''} onChange={(e) => set('model', e.target.value)} className={field} />
                                <datalist id="gemini-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">{t('ai.temperature')}</label>
                                <input type="number" step="0.1" min={0} max={2} value={draft.temperature} onChange={(e) => set('temperature', Number(e.target.value))} className={field} />
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {tab === 'persona' && (
                <Card title={t('ai.persona_title')}>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <TextField label={t('ai.assistant_name')} value={draft.assistant_name} onChange={(v) => set('assistant_name', v)} />
                        <TextField label={t('ai.tone')} value={draft.tone} onChange={(v) => set('tone', v)} />
                        <TextField label={t('ai.bubble_title')} value={draft.bubble_title} onChange={(v) => set('bubble_title', v)} />
                        <TextField label={t('ai.bubble_text')} value={draft.bubble_text} onChange={(v) => set('bubble_text', v)} />
                        <TextArea className="sm:col-span-2" label={t('ai.greeting')} value={draft.greeting} onChange={(v) => set('greeting', v)} />
                        <TextArea
                            className="sm:col-span-2"
                            label={t('ai.quick_replies')}
                            value={(draft.quick_replies ?? []).join('\n')}
                            onChange={(v) => set('quick_replies', v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6))}
                        />
                    </div>
                </Card>
            )}

            {tab === 'rules' && (
                <div className="grid lg:grid-cols-2 gap-4">
                    <Card title={t('ai.allowed_topics')}>
                        <Checklist items={data.catalog.topics} selected={draft.allowed_topics ?? []} onToggle={(k) => toggleInList('allowed_topics', k)} />
                    </Card>
                    <Card title={t('ai.blocked_topics')}>
                        <Checklist items={data.catalog.blocked} selected={draft.blocked_topics ?? []} onToggle={(k) => toggleInList('blocked_topics', k)} />
                    </Card>
                    <Card title={t('ai.extra_rules')} className="lg:col-span-2">
                        <div className="space-y-4">
                            <TextArea label={t('ai.custom_rules')} value={draft.custom_rules ?? ''} onChange={(v) => set('custom_rules', v)} />
                            <TextArea
                                label={t('ai.blocked_keywords')}
                                value={(draft.blocked_keywords ?? []).join('\n')}
                                onChange={(v) => set('blocked_keywords', v.split('\n').map((s) => s.trim()).filter(Boolean))}
                            />
                            <TextArea label={t('ai.off_topic_reply')} value={draft.off_topic_reply} onChange={(v) => set('off_topic_reply', v)} />
                            <TextField label={t('ai.finance_disclaimer')} value={draft.finance_disclaimer} onChange={(v) => set('finance_disclaimer', v)} />
                            <TextField label={t('ai.unavailable_reply')} value={draft.unavailable_reply} onChange={(v) => set('unavailable_reply', v)} />
                        </div>
                    </Card>
                </div>
            )}

            {tab === 'showroom' && (
                <Card title={t('ai.showroom_title')} subtitle={t('ai.showroom_sub')}>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {SHOWROOM_FIELDS.map((f) => (
                            <TextArea key={f.key} label={f.label} placeholder={f.placeholder} value={draft.showroom?.[f.key] ?? ''} onChange={(v) => set(`showroom.${f.key}`, v)} />
                        ))}
                    </div>
                </Card>
            )}

            {tab === 'tools' && (
                <div className="grid lg:grid-cols-2 gap-4">
                    <Card title="ما يقدر المساعد يسويه">
                        <div className="space-y-3">
                            {data.catalog.tools.map((tool) => (
                                <Toggle key={tool} label={TOOL_LABELS[tool] ?? tool} checked={!!draft.tools?.[tool]} onChange={(v) => set(`tools.${tool}`, v)} />
                            ))}
                            <hr className="border-[var(--border-default)]" />
                            <Toggle label="إظهار الأسعار والأقساط للعميل" checked={!!draft.show_prices} onChange={(v) => set('show_prices', v)} />
                            <div>
                                <label className="block text-xs font-semibold mb-1">متى يطلب بيانات العميل؟</label>
                                <select value={draft.lead_capture} onChange={(e) => set('lead_capture', e.target.value)} className={field}>
                                    <option value="after_recommendation">بعد ما يرشّح سيارة ويبدي العميل اهتمام</option>
                                    <option value="on_request">فقط عندما يطلب العميل التواصل</option>
                                </select>
                            </div>
                            <NumberField label="عدد السيارات في كل ترشيح" value={draft.max_results} min={1} max={8} onChange={(v) => set('max_results', v)} />
                        </div>
                    </Card>
                    <Card title="الحدود والتكلفة">
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField label="رسائل لكل محادثة" value={draft.limits?.max_messages_per_session} onChange={(v) => set('limits.max_messages_per_session', v)} />
                            <NumberField label="رسائل لكل زائر في الساعة" value={draft.limits?.max_messages_per_hour_per_ip} onChange={(v) => set('limits.max_messages_per_hour_per_ip', v)} />
                            <NumberField label="حد الردود اليومي (ميزانية)" value={draft.limits?.daily_message_limit} onChange={(v) => set('limits.daily_message_limit', v)} />
                            <NumberField label="أقصى طول للرسالة" value={draft.limits?.max_message_length} onChange={(v) => set('limits.max_message_length', v)} />
                            <NumberField label="جولات الأدوات لكل رد" value={draft.limits?.max_tool_rounds} min={1} max={8} onChange={(v) => set('limits.max_tool_rounds', v)} />
                            <NumberField label="الاحتفاظ بالمحادثات (يوم)" value={draft.retention_days} onChange={(v) => set('retention_days', v)} />
                        </div>
                    </Card>
                </div>
            )}

            {tab === 'playground' && <Playground ready={Boolean(data?.api_key?.configured)} />}
            {tab === 'conversations' && <Conversations />}

            {showSave && (
                <div className="sticky bottom-3 flex justify-end">
                    <Button loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>{t('ai.save_settings')}</Button>
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ small fields */

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
        <span className="text-[var(--text-primary)]">{label}</span>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
    </label>
);

const TextField: React.FC<{ label: string; value: string; onChange: (v: string) => void; className?: string }> = ({ label, value, onChange, className = '' }) => (
    <div className={className}>
        <label className="block text-xs font-semibold mb-1">{label}</label>
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={field} />
    </div>
);

const TextArea: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }> = ({ label, value, onChange, placeholder, className = '' }) => (
    <div className={className}>
        <label className="block text-xs font-semibold mb-1">{label}</label>
        <textarea rows={3} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={field} />
    </div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }> = ({ label, value, onChange, min, max }) => (
    <div>
        <label className="block text-xs font-semibold mb-1">{label}</label>
        <input type="number" min={min} max={max} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} className={field} />
    </div>
);

const Checklist: React.FC<{ items: Record<string, string>; selected: string[]; onToggle: (k: string) => void }> = ({ items, selected, onToggle }) => (
    <div className="space-y-2.5">
        {Object.entries(items).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={selected.includes(key)} onChange={() => onToggle(key)} className="h-4 w-4 accent-[var(--tenant-primary)]" />
                <span>{label}</span>
            </label>
        ))}
    </div>
);

/* ------------------------------------------------------------------ playground */

interface ChatLine { role: 'user' | 'assistant'; text: string; cards?: Dict[] }

const Playground: React.FC<{ ready: boolean }> = ({ ready }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [lines, setLines] = useState<ChatLine[]>([]);
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    const send = useMutation({
        mutationFn: async (message: string) => (await apiClient.post(`${BASE}/playground`, { message, session_id: sessionId })).data.data,
        onSuccess: (res) => {
            if (!res) return;
            setSessionId(res.session_id);
            setLines((l) => [...l, { role: 'assistant', text: res.reply || '', cards: Array.isArray(res.cards) ? res.cards : [] }]);
        },
        onError: (e) => setLines((l) => [...l, { role: 'assistant', text: `⚠️ ${errorText(e)}` }]),
    });

    useEffect(() => {
        try {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch {
            // ignore
        }
    }, [lines, send.isPending]);

    const submit = () => {
        const message = input.trim();
        if (!message || send.isPending) return;
        setLines((l) => [...l, { role: 'user', text: message }]);
        setInput('');
        send.mutate(message);
    };

    const getCarName = (car: Dict): string => {
        if (!car) return '';
        if (typeof car.name === 'string') return car.name;
        if (typeof car.name === 'object' && car.name !== null) {
            return car.name.ar || car.name.en || Object.values(car.name)[0] || '';
        }
        return String(car.name ?? '');
    };

    return (
        <Card title="جرّب المساعد بإعداداتك الحالية" subtitle="المحادثات هنا لا تظهر للعملاء ولا تُحتسب في حدود المتجر. احفظ الإعدادات قبل التجربة.">
            {!ready ? (
                <p className="text-sm text-amber-700">أضف مفتاح Gemini من تبويب "الربط" أولاً.</p>
            ) : (
                <div className="space-y-3">
                    <div className="h-[420px] overflow-y-auto rounded-[var(--radius-md)] bg-[var(--surface-secondary)] p-3 space-y-3">
                        {lines.length === 0 && <p className="text-xs text-[var(--text-muted)]">مثال: "أبغى سيارة عائلية قسطها أقل من 2500"</p>}
                        {lines.map((line, i) => (
                            <div key={i} className={`flex ${line.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${line.role === 'user' ? 'bg-[var(--tenant-primary)] text-white' : 'bg-white text-[var(--text-primary)] border border-[var(--border-default)]'}`}>
                                    {typeof line.text === 'string' ? line.text : JSON.stringify(line.text)}
                                    {Array.isArray(line.cards) && line.cards.map((card, c) => (
                                        <div key={c} className="mt-2 rounded-lg bg-[var(--surface-secondary)] p-2 text-[11px] font-mono" dir="ltr">
                                            [{card.type}] {card.type === 'cars' && Array.isArray(card.cars) ? card.cars.map((x: Dict) => getCarName(x)).filter(Boolean).join(' · ') : ''}
                                            {card.type === 'installment' ? `${card.best_option?.monthly ?? ''} SAR/mo · ${card.best_option?.bank ?? ''}` : ''}
                                            {card.type === 'comparison' && Array.isArray(card.cars) ? card.cars.map((x: Dict) => getCarName(x)).filter(Boolean).join(' vs ') : ''}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {send.isPending && <p className="text-xs text-[var(--text-muted)]">المساعد يكتب…</p>}
                        <div ref={endRef} />
                    </div>
                    <div className="flex gap-2">
                        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="اكتب رسالة…" className={field} />
                        <Button onClick={submit} loading={send.isPending} icon={<Send className="h-4 w-4" />}>إرسال</Button>
                        <Button variant="ghost" onClick={() => { setLines([]); setSessionId(null); }}>محادثة جديدة</Button>
                    </div>
                </div>
            )}
        </Card>
    );
};

/* ------------------------------------------------------------------ conversations */

const Conversations: React.FC = () => {
    const [channel, setChannel] = useState('storefront');
    const [selected, setSelected] = useState<number | null>(null);

    const { data: list } = useQuery({
        queryKey: ['admin', 'ai-assistant', 'conversations', channel],
        queryFn: async () => (await apiClient.get(`${BASE}/conversations`, { params: { channel } })).data,
    });
    const { data: stats } = useQuery({
        queryKey: ['admin', 'ai-assistant', 'stats'],
        queryFn: async () => (await apiClient.get(`${BASE}/stats`)).data.data,
    });
    const { data: detail } = useQuery({
        queryKey: ['admin', 'ai-assistant', 'conversation', selected],
        queryFn: async () => (await apiClient.get(`${BASE}/conversations/${selected}`)).data.data,
        enabled: selected !== null,
    });

    const rows: Dict[] = list?.data ?? [];
    const statCards = useMemo(
        () => [
            { label: 'محادثات (30 يوم)', value: stats?.conversations ?? 0 },
            { label: 'طلبات من المساعد', value: stats?.leads ?? 0 },
            { label: 'ردود اليوم', value: stats?.replies_today ?? 0 },
            { label: 'ردود فيها أرقام غير مؤكدة', value: stats?.flagged_replies ?? 0 },
        ],
        [stats]
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statCards.map((s) => (
                    <Card key={s.label} padding="sm">
                        <p className="text-[11px] text-[var(--text-muted)]">{s.label}</p>
                        <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </Card>
                ))}
            </div>
            <div className="grid lg:grid-cols-5 gap-4">
                <Card className="lg:col-span-2" padding="none">
                    <div className="flex gap-1 p-3 border-b border-[var(--border-default)]">
                        {[['storefront', 'المتجر'], ['playground', 'التجربة']].map(([value, label]) => (
                            <button key={value} onClick={() => setChannel(value)} className={`px-2.5 py-1 rounded text-xs font-semibold ${channel === value ? 'bg-[var(--tenant-primary)] text-white' : 'bg-[var(--surface-secondary)]'}`}>{label}</button>
                        ))}
                    </div>
                    <div className="max-h-[520px] overflow-y-auto divide-y divide-[var(--border-default)]">
                        {rows.length === 0 && <p className="p-6 text-center text-xs text-[var(--text-muted)]">لا توجد محادثات بعد</p>}
                        {rows.map((c) => (
                            <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-start p-3 text-xs hover:bg-[var(--surface-secondary)] ${selected === c.id ? 'bg-[var(--surface-secondary)]' : ''}`}>
                                <div className="flex justify-between">
                                    <span className="font-semibold">#{c.id} · {c.messages_count} رد</span>
                                    {c.lead_id && <span className="text-emerald-700">✔ طلب #{c.lead_id}</span>}
                                </div>
                                <p className="text-[var(--text-muted)] mt-1">{c.last_activity_at ? new Date(c.last_activity_at).toLocaleString('ar-EG') : ''}</p>
                            </button>
                        ))}
                    </div>
                </Card>
                <Card className="lg:col-span-3" title={selected ? `المحادثة #${selected}` : 'اختر محادثة'}>
                    {detail ? (
                        <div className="space-y-2 max-h-[520px] overflow-y-auto">
                            {Array.isArray(detail.messages) && (detail.messages as Dict[]).map((m) => (
                                <div key={m.id} className={`rounded-lg px-3 py-2 text-xs ${m.role === 'user' ? 'bg-[var(--tenant-primary)]/10' : m.role === 'tool' ? 'bg-slate-100 text-slate-500 font-mono' : 'bg-[var(--surface-secondary)]'}`}>
                                    <span className="font-bold">{m.role === 'user' ? 'العميل' : m.role === 'tool' ? 'نتيجة أداة' : 'المساعد'}: </span>
                                    {typeof m.content === 'string' ? m.content : (Array.isArray(m.tool_calls) ? `استدعاء: ${(m.tool_calls as Dict[]).map((t) => t.name).join('، ')}` : (m.content ? JSON.stringify(m.content) : '…'))}
                                    {Array.isArray(m.guard_flags) && m.guard_flags.length > 0 && <span className="block text-amber-700 mt-1">⚠️ {(m.guard_flags as string[]).join('، ')}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--text-muted)]">اختر محادثة من القائمة لعرضها كاملة.</p>
                    )}
                </Card>
            </div>
        </div>
    );
};
