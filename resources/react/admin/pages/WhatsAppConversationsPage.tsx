import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowRight, Bot, Check, CheckCheck, ClipboardList, ListFilter, Lock, MessageCircle, NotebookPen, PanelLeft, Search, SendHorizontal,
    StickyNote, Tag, Trash2, UserRound, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { Modal } from '../../shared/components/ui/Modal';

type Dict = Record<string, any>;

const BASE = '/modules/whatsapp';
const errorText = (e: unknown) => (e as any)?.response?.data?.message || (e as Error)?.message || 'حدث خطأ';

const EVENT_LABELS: Record<string, string> = {
    booking_created: 'إشعار طلب جديد', booking_status_updated: 'إشعار تحديث حالة', campaign: 'حملة', auto_reply: 'رد تلقائي', ai_reply: 'المساعد الذكي', agent_reply: '',
};
const STATUS_DOT: Record<string, string> = { open: 'bg-[#25d366]', pending: 'bg-amber-400', closed: 'bg-slate-400' };
const STATUS_PILL: Record<string, string> = {
    open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    closed: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const NOTE_SOURCE_LABELS: Record<string, string> = { manual: 'ملف العميل', whatsapp: 'واتساب' };
const CONVERSATION_NOTE = 'whatsapp_conversation';
const MESSAGE_NOTE = 'whatsapp_message';
const AVATAR_COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];
const CHAT_PATTERN = "url(\"data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d6cfc4' fill-opacity='.35'%3E%3Ccircle cx='10' cy='10' r='1.6'/%3E%3Ccircle cx='50' cy='30' r='1.2'/%3E%3Cpath d='M30 58l3 5h-6z'/%3E%3Crect x='62' y='62' width='4' height='4' rx='1'/%3E%3C/g%3E%3C/svg%3E\")";

interface InboxMeta {
    is_admin: boolean;
    phone_hidden: boolean;
    statuses: { key: string; label: string; count: number; unread: number }[];
    preset_tags: string[];
    employees: { id: number; name: string }[];
}

interface LeadNote {
    id: number;
    body: string;
    source: string;
    employee_id: number | null;
    employee_name: string | null;
    notable_type: string | null;
    notable_id: number | null;
    created_at: string;
}

type TimelineItem =
    | { kind: 'day'; key: string; label: string }
    | { kind: 'message'; key: string; at: string; message: Dict }
    | { kind: 'note'; key: string; at: string; note: LeadNote };

/* ---------- formatting helpers ---------- */

import i18n from '../../i18n';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (iso: string) => Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);
const clock = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'ar-EG', { hour: 'numeric', minute: '2-digit' });

const listTime = (iso?: string | null) => {
    if (!iso) return '';
    const isEn = i18n.language === 'en';
    const locale = isEn ? 'en-US' : 'ar-EG';
    const ago = daysAgo(iso);
    if (ago === 0) return clock(iso);
    if (ago === 1) return isEn ? 'Yesterday' : 'أمس';
    if (ago < 7) return new Date(iso).toLocaleDateString(locale, { weekday: 'long' });
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: '2-digit' });
};

const dayLabel = (iso: string) => {
    const isEn = i18n.language === 'en';
    const locale = isEn ? 'en-US' : 'ar-EG';
    const ago = daysAgo(iso);
    if (ago === 0) return isEn ? 'Today' : 'اليوم';
    if (ago === 1) return isEn ? 'Yesterday' : 'أمس';
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};

const initials = (name?: string | null) => {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
};

/* ---------- small pieces ---------- */

const Avatar: React.FC<{ name?: string | null; seed: number; size?: 'sm' | 'md' | 'lg'; status?: string }> = ({ name, seed, size = 'md', status }) => {
    const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-24 w-24 text-3xl' };
    const text = initials(name);

    return (
        <span className="relative shrink-0">
            <span className={`flex items-center justify-center rounded-full font-bold text-white ${sizes[size]} ${AVATAR_COLORS[seed % AVATAR_COLORS.length]}`}>
                {text || <UserRound className={size === 'lg' ? 'h-12 w-12' : 'h-5 w-5'} />}
            </span>
            {status && <span className={`absolute bottom-0 end-0 h-3 w-3 rounded-full ring-2 ring-white ${STATUS_DOT[status] ?? 'bg-slate-400'}`} />}
        </span>
    );
};

const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }> = ({ label, active, className = '', children, ...props }) => (
    <button type="button" title={label} aria-label={label} {...props}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] transition-colors hover:bg-black/5 disabled:opacity-40 ${active ? 'bg-black/10' : ''} ${className}`}>
        {children}
    </button>
);

const TagEditor: React.FC<{ tags: string[]; onChange: (tags: string[]) => void; suggestions?: string[] }> = ({ tags, onChange, suggestions = [] }) => {
    const [value, setValue] = useState('');
    const add = (raw: string) => {
        const tag = raw.trim().slice(0, 30);
        if (tag && !tags.includes(tag) && tags.length < 10) onChange([...tags, tag]);
        setValue('');
    };
    const remaining = suggestions.filter((s) => !tags.includes(s));

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#e7fce3] px-2.5 py-1 text-[11px] font-semibold text-[#008069]">
                        {tag}
                        <button onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`حذف ${tag}`} className="hover:text-rose-600"><X className="h-3 w-3" /></button>
                    </span>
                ))}
                <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={30} placeholder="+ إضافة"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(value); } }}
                    onBlur={() => value && add(value)}
                    className="w-20 rounded-full border border-dashed border-slate-300 bg-transparent px-2.5 py-1 text-[11px] focus:border-[#00a884] focus:outline-hidden" />
            </div>
            {remaining.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {remaining.map((s) => (
                        <button key={s} onClick={() => add(s)} className="rounded-full bg-[#f0f2f5] px-2 py-0.5 text-[10px] text-[#54656f] hover:bg-[#e9edef]">+ {s}</button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ---------- page ---------- */

export const WhatsAppConversationsPage: React.FC = () => {
    const [contactNoteOpen, setContactNoteOpen] = useState(false);

    return (
        <>
            <InboxShell onContactNote={() => setContactNoteOpen(true)} />
            <ContactNoteModal isOpen={contactNoteOpen} onClose={() => setContactNoteOpen(false)} />
        </>
    );
};

/** Note on any phone number: saved on its CRM lead, which is registered if the number is new. */
const ContactNoteModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ phone: '', name: '', body: '' });
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#00a884] focus:outline-hidden';

    const save = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/contacts/notes`, { ...form, name: form.name || undefined })).data,
        onSuccess: (res) => {
            setNotice({ ok: true, text: res.message });
            setForm({ phone: '', name: '', body: '' });
            queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
        },
        onError: (e) => setNotice({ ok: false, text: errorText(e) }),
    });

    const close = () => {
        setNotice(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={close} title="ملاحظة على رقم" subtitle="تُحفظ في ملف العميل، ولو الرقم جديد يتسجل كعميل في المنصة" icon={NotebookPen} size="md"
            primaryAction={{ label: 'حفظ الملاحظة', onClick: () => save.mutate(), loading: save.isPending, disabled: !form.phone.trim() || !form.body.trim() }}
            secondaryAction={{ label: 'إغلاق', onClick: close }}>
            <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold mb-1">رقم الجوال</label>
                        <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1">الاسم (لو العميل جديد)</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} className={input} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold mb-1">الملاحظة</label>
                    <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={2000} className={`${input} resize-none`} />
                </div>
                {notice && <p className={`text-xs ${notice.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{notice.text}</p>}
            </div>
        </Modal>
    );
};

const InboxShell: React.FC<{ onContactNote: () => void }> = ({ onContactNote }) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [selected, setSelected] = useState<number | null>(null);
    const [text, setText] = useState('');
    const [mode, setMode] = useState<'reply' | 'note'>('reply');
    const [noteTarget, setNoteTarget] = useState<Dict | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('open');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [tag, setTag] = useState('');
    const [assignee, setAssignee] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [infoOpen, setInfoOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
    const debouncedSearch = useDebouncedValue(search);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { data: meta } = useQuery({
        queryKey: ['admin', 'whatsapp', 'inbox-meta'],
        queryFn: async (): Promise<InboxMeta> => (await apiClient.get(`${BASE}/inbox/meta`)).data.data,
        refetchInterval: 30000,
    });

    const filters = {
        status: status || undefined, unread: unreadOnly ? 1 : undefined, tag: tag || undefined,
        assigned_to: assignee || undefined, search: debouncedSearch.trim() || undefined,
    };
    const { data: list, isLoading: listLoading } = useQuery({
        queryKey: ['admin', 'whatsapp', 'conversations', filters],
        queryFn: async () => (await apiClient.get(`${BASE}/conversations`, { params: filters })).data,
        refetchInterval: 8000,
    });

    const { data: thread } = useQuery({
        queryKey: ['admin', 'whatsapp', 'thread', selected],
        queryFn: async () => (await apiClient.get(`${BASE}/conversations/${selected}`)).data.data,
        enabled: selected !== null,
        refetchInterval: 8000,
    });

    const messageCount = thread?.messages?.length ?? 0;
    const noteCount = thread?.notes?.length ?? 0;
    useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [selected, messageCount, noteCount]);

    const resetComposer = () => {
        setText('');
        setNoteTarget(null);
        setError(null);
        if (inputRef.current) inputRef.current.style.height = '';
    };

    const selectConversation = (id: number) => {
        setSelected(id);
        setMode('reply');
        resetComposer();
    };

    const update = useMutation({
        mutationFn: async (changes: Dict) => (await apiClient.patch(`${BASE}/conversations/${selected}`, changes)).data,
        onSuccess: () => {
            setError(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
        },
        onError: (e) => setError(errorText(e)),
    });

    const reply = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/conversations/${selected}/reply`, { text })).data,
        onSuccess: () => {
            resetComposer();
            queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
        },
        onError: (e) => setError(errorText(e)),
    });

    const addNote = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/conversations/${selected}/notes`, { body: text, message_id: noteTarget?.id })).data,
        onSuccess: () => {
            resetComposer();
            queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
        },
        onError: (e) => setError(errorText(e)),
    });

    const deleteNote = useMutation({
        mutationFn: async (noteId: number) => (await apiClient.delete(`${BASE}/conversations/${selected}/notes/${noteId}`)).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'thread', selected] }),
        onError: (e) => setError(errorText(e)),
    });

    const resumeAi = useMutation({
        mutationFn: async () => (await apiClient.post(`${BASE}/conversations/${selected}/resume-ai`)).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'thread', selected] }),
    });

    const rows: Dict[] = list?.data ?? [];
    const conversation = selected !== null ? thread?.conversation : undefined;
    const customer: Dict | null = thread?.customer ?? null;
    const notes: LeadNote[] = thread?.notes ?? [];
    const messages: Dict[] = thread?.messages ?? [];
    const isAdmin = !!meta?.is_admin;
    const totalUnread = meta?.statuses.reduce((sum, s) => sum + s.unread, 0) ?? 0;
    const canDeleteNote = (note: LeadNote) => isAdmin || (user?.id !== undefined && note.employee_id === user.id);
    const aiPaused = conversation?.ai_paused_until && new Date(conversation.ai_paused_until) > new Date();
    const activeFilters = (tag ? 1 : 0) + (assignee ? 1 : 0);

    const messagesById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

    // Messages + the notes written on this conversation (or its messages), with day separators.
    const timeline = useMemo<TimelineItem[]>(() => {
        if (!conversation) return [];
        const items = [
            ...messages.map((m) => ({ kind: 'message' as const, key: `m${m.id}`, at: m.created_at as string, message: m })),
            ...notes
                .filter((n) => (n.notable_type === CONVERSATION_NOTE && n.notable_id === conversation.id) || (n.notable_type === MESSAGE_NOTE && messagesById.has(n.notable_id)))
                .map((n) => ({ kind: 'note' as const, key: `n${n.id}`, at: n.created_at, note: n })),
        ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

        const withDays: TimelineItem[] = [];
        let lastDay = '';
        for (const item of items) {
            const day = new Date(item.at).toDateString();
            if (day !== lastDay) {
                withDays.push({ kind: 'day', key: `d${day}`, label: dayLabel(item.at) });
                lastDay = day;
            }
            withDays.push(item);
        }
        return withDays;
    }, [conversation, messages, notes, messagesById]);

    const submit = () => {
        if (!text.trim() || reply.isPending || addNote.isPending) return;
        if (mode === 'note') addNote.mutate();
        else reply.mutate();
    };

    const startNoteOn = (message: Dict | null) => {
        setMode('note');
        setNoteTarget(message);
        inputRef.current?.focus();
    };

    const statusTabs = [
        { key: '', label: 'الكل', count: meta?.statuses.reduce((sum, s) => sum + s.count, 0) ?? 0 },
        ...(meta?.statuses ?? []).map((s) => ({ key: s.key, label: s.label, count: s.count })),
    ];

    return (
        <div className="-m-4 flex h-[calc(100dvh-4rem)] overflow-hidden bg-white lg:m-0 lg:h-[calc(100dvh-8.5rem)] lg:rounded-xl lg:border lg:border-[#e9edef] lg:shadow-sm">
            {/* ---------- Conversation list ---------- */}
            <aside className={`${selected !== null ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] lg:w-[380px] shrink-0 flex-col border-e border-[#e9edef] bg-white`}>
                <header className="flex h-16 items-center justify-between gap-2 bg-[#f0f2f5] px-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366] text-white"><MessageCircle className="h-5 w-5" /></span>
                        <div className="min-w-0">
                            <p className="text-[15px] font-bold text-[#111b21]">المحادثات</p>
                            <p className="truncate text-[11px] text-[#667781]">{isAdmin ? 'كل محادثات رقم الشركة' : 'المحادثات الموزعة عليك'}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <IconButton label="ملاحظة على رقم" onClick={onContactNote}><NotebookPen className="h-5 w-5" /></IconButton>
                        <IconButton label="فلاتر" active={filtersOpen || activeFilters > 0} onClick={() => setFiltersOpen((v) => !v)} className="relative">
                            <ListFilter className="h-5 w-5" />
                            {activeFilters > 0 && <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-[#25d366]" />}
                        </IconButton>
                    </div>
                </header>

                <div className="space-y-2 border-b border-[#e9edef] px-3 py-2">
                    <div className="relative">
                        <Search className="absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-[#54656f]" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={meta?.phone_hidden ? 'ابحث بالاسم' : 'ابحث بالاسم أو الرقم'}
                            className="w-full rounded-lg bg-[#f0f2f5] py-2 ps-10 pe-8 text-sm text-[#111b21] placeholder:text-[#667781] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#00a884]" />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute top-1/2 end-2 -translate-y-1/2 text-[#54656f]" aria-label="مسح البحث"><X className="h-4 w-4" /></button>
                        )}
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                        <button onClick={() => setUnreadOnly((v) => !v)}
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${unreadOnly ? 'bg-[#e7fce3] text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'}`}>
                            غير مقروءة {totalUnread > 0 && <span className="ms-0.5">{totalUnread}</span>}
                        </button>
                        {statusTabs.map((s) => (
                            <button key={s.key} onClick={() => setStatus(s.key)}
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${status === s.key ? 'bg-[#e7fce3] text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'}`}>
                                {s.label} <span className="opacity-70">{s.count}</span>
                            </button>
                        ))}
                    </div>
                    {filtersOpen && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <select value={tag} onChange={(e) => setTag(e.target.value)} className="rounded-lg border border-[#e9edef] bg-white px-2 py-1.5 text-xs">
                                <option value="">كل التاجز</option>
                                {(meta?.preset_tags ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {isAdmin ? (
                                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="rounded-lg border border-[#e9edef] bg-white px-2 py-1.5 text-xs">
                                    <option value="">كل الموظفين</option>
                                    <option value="none">غير موزعة</option>
                                    {meta?.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            ) : <span />}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {listLoading && Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                            <span className="h-12 w-12 rounded-full bg-[#f0f2f5]" />
                            <span className="flex-1 space-y-2"><span className="block h-3 w-1/2 rounded bg-[#f0f2f5]" /><span className="block h-3 w-3/4 rounded bg-[#f0f2f5]" /></span>
                        </div>
                    ))}
                    {!listLoading && rows.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-[#667781]">
                            <MessageCircle className="h-10 w-10 opacity-30" />
                            <p className="text-sm">لا توجد محادثات هنا</p>
                            {(status || unreadOnly || activeFilters > 0 || search) && (
                                <button onClick={() => { setStatus(''); setUnreadOnly(false); setTag(''); setAssignee(''); setSearch(''); }} className="text-xs font-semibold text-[#008069] hover:underline">
                                    عرض كل المحادثات
                                </button>
                            )}
                        </div>
                    )}
                    {rows.map((c) => {
                        const unread = c.unread_count > 0;
                        const name = c.name || `+${c.phone}`;
                        return (
                            <button key={c.id} onClick={() => selectConversation(c.id)}
                                className={`flex w-full items-center gap-3 px-3 text-start transition-colors ${selected === c.id ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'}`}>
                                <Avatar name={c.name} seed={c.id} status={c.status} />
                                <span className="min-w-0 flex-1 border-b border-[#e9edef] py-3">
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className={`truncate text-[15px] text-[#111b21] ${unread ? 'font-bold' : 'font-medium'}`} dir={c.name ? undefined : 'ltr'}>{name}</span>
                                        <span className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-[#25d366]' : 'text-[#667781]'}`}>{listTime(c.last_message_at)}</span>
                                    </span>
                                    <span className="mt-0.5 flex items-center justify-between gap-2">
                                        <span className={`truncate text-[13px] ${unread ? 'text-[#111b21]' : 'text-[#667781]'}`}>{c.last_message || '—'}</span>
                                        {unread && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-bold text-white">{c.unread_count}</span>}
                                    </span>
                                    {(c.tags?.length > 0 || isAdmin) && (
                                        <span className="mt-1 flex items-center gap-1 overflow-hidden">
                                            {(c.tags as string[]).slice(0, 3).map((t) => <span key={t} className="shrink-0 rounded bg-[#f0f2f5] px-1.5 py-px text-[10px] text-[#54656f]">{t}</span>)}
                                            {isAdmin && <span className="ms-auto flex shrink-0 items-center gap-0.5 text-[10px] text-[#8696a0]"><UserRound className="h-3 w-3" />{c.assignee_name ?? 'غير موزعة'}</span>}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* ---------- Chat ---------- */}
            <section className={`${selected !== null ? 'flex' : 'hidden md:flex'} relative min-w-0 flex-1 flex-col`}>
                {!conversation ? (
                    selected !== null ? (
                        <div className="flex flex-1 items-center justify-center bg-[#efeae2]"><span className="h-8 w-8 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" /></div>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 border-b-[6px] border-[#25d366] bg-[#f0f2f5] px-8 text-center">
                            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm"><MessageCircle className="h-12 w-12 text-[#25d366]" /></span>
                            <h2 className="text-2xl font-light text-[#41525d]">واتساب الأعمال</h2>
                            <p className="max-w-md text-sm leading-relaxed text-[#667781]">
                                اختر محادثة من القائمة للرد على العميل. الملاحظات الداخلية تُحفظ في ملف العميل بالمنصة ولا تصل له.
                            </p>
                            <p className="mt-6 flex items-center gap-1.5 text-xs text-[#8696a0]"><Lock className="h-3.5 w-3.5" /> متصل رسمياً عبر WhatsApp Business Platform</p>
                        </div>
                    )
                ) : (
                    <>
                        <header className="flex h-16 shrink-0 items-center gap-3 border-s border-[#e9edef] bg-[#f0f2f5] px-3 lg:px-4">
                            <IconButton label="رجوع" className="md:hidden" onClick={() => setSelected(null)}><ArrowRight className="h-5 w-5" /></IconButton>
                            <button onClick={() => setInfoOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                                <Avatar name={conversation.name} seed={conversation.id} size="sm" />
                                <span className="min-w-0">
                                    <span className="block truncate text-[15px] font-semibold text-[#111b21]">{conversation.name || 'عميل'}</span>
                                    <span className="block truncate text-xs text-[#667781]">
                                        {!conversation.phone_hidden && <span dir="ltr">+{conversation.phone}</span>}
                                        {!conversation.phone_hidden && ' · '}
                                        <span className={conversation.within_window ? 'text-[#008069]' : 'text-amber-600'}>
                                            {conversation.within_window ? 'داخل نافذة الرد' : 'خارج نافذة الـ 24 ساعة'}
                                        </span>
                                    </span>
                                </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-1.5">
                                {aiPaused && (
                                    <IconButton label="تشغيل الرد التلقائي لهذا العميل" onClick={() => resumeAi.mutate()} className="text-violet-600"><Bot className="h-5 w-5" /></IconButton>
                                )}
                                <select aria-label="حالة المحادثة" value={conversation.status} disabled={update.isPending}
                                    onChange={(e) => update.mutate({ status: e.target.value })}
                                    className={`hidden sm:block cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ring-1 focus:outline-hidden ${STATUS_PILL[conversation.status] ?? ''}`}>
                                    {meta?.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                                {isAdmin && (
                                    <select aria-label="الموظف المسؤول" value={conversation.assigned_to ?? ''} disabled={update.isPending}
                                        onChange={(e) => update.mutate({ assigned_to: e.target.value ? Number(e.target.value) : null })}
                                        className="hidden lg:block max-w-36 cursor-pointer truncate rounded-full bg-white px-3 py-1 text-xs ring-1 ring-[#e9edef] focus:outline-hidden">
                                        <option value="">غير موزعة</option>
                                        {meta?.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                )}
                                <IconButton label="ملاحظة داخلية" onClick={() => startNoteOn(null)}><StickyNote className="h-5 w-5" /></IconButton>
                                <IconButton label="معلومات العميل" active={infoOpen} onClick={() => setInfoOpen((v) => !v)}><PanelLeft className="h-5 w-5" /></IconButton>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto bg-[#efeae2] px-4 py-3 lg:px-12" style={{ backgroundImage: CHAT_PATTERN }}>
                            <div className="mx-auto flex max-w-3xl flex-col gap-1">
                                <p className="mx-auto my-2 flex max-w-md items-center gap-1.5 rounded-lg bg-[#ffeecd] px-3 py-1.5 text-center text-[11px] text-[#54656f] shadow-sm">
                                    <Lock className="h-3 w-3 shrink-0" /> الرسائل عبر واتساب الأعمال الرسمي. الملاحظات الصفراء داخلية ولا تُرسل للعميل.
                                </p>
                                {timeline.map((item) => {
                                    if (item.kind === 'day') {
                                        return <span key={item.key} className="mx-auto my-2 rounded-lg bg-white px-3 py-1 text-[11px] font-medium text-[#54656f] shadow-sm">{item.label}</span>;
                                    }
                                    if (item.kind === 'note') {
                                        return (
                                            <NoteBubble key={item.key} note={item.note}
                                                onMessage={item.note.notable_type === MESSAGE_NOTE && item.note.notable_id !== null ? messagesById.get(item.note.notable_id) : undefined}
                                                canDelete={canDeleteNote(item.note)} onDelete={() => deleteNote.mutate(item.note.id)} />
                                        );
                                    }
                                    return <MessageBubble key={item.key} message={item.message} onNote={() => startNoteOn(item.message)} />;
                                })}
                                <div ref={endRef} />
                            </div>
                        </div>

                        {/* Composer */}
                        <footer className={`shrink-0 px-3 py-2 lg:px-4 ${mode === 'note' ? 'bg-[#fff8e1]' : 'bg-[#f0f2f5]'}`}>
                            {error && <p className="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{error}</p>}
                            {mode === 'reply' && !conversation.within_window && (
                                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                                    مرّ أكثر من 24 ساعة على آخر رسالة من العميل؛ واتساب يسمح هنا بالقوالب المعتمدة فقط. تقدر تكتب ملاحظة داخلية.
                                </p>
                            )}
                            <div className="mb-2 flex items-center gap-1 text-xs">
                                <button onClick={() => { setMode('reply'); setNoteTarget(null); }}
                                    className={`rounded-full px-3 py-1 font-semibold transition-colors ${mode === 'reply' ? 'bg-[#00a884] text-white' : 'text-[#54656f] hover:bg-black/5'}`}>رد على العميل</button>
                                <button onClick={() => setMode('note')}
                                    className={`rounded-full px-3 py-1 font-semibold transition-colors ${mode === 'note' ? 'bg-amber-500 text-white' : 'text-[#54656f] hover:bg-black/5'}`}>ملاحظة داخلية</button>
                                {mode === 'note' && noteTarget && (
                                    <span className="ms-1 inline-flex min-w-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] text-amber-900">
                                        <span className="truncate">على: «{(noteTarget.body || `[${noteTarget.type}]`).slice(0, 40)}»</span>
                                        <button onClick={() => setNoteTarget(null)} aria-label="إلغاء"><X className="h-3 w-3" /></button>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={text}
                                    onChange={(e) => {
                                        setText(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                                    placeholder={mode === 'note' ? 'ملاحظة للفريق — تُحفظ في ملف العميل ولا تُرسل له' : 'اكتب رسالة'}
                                    className={`max-h-[140px] min-h-[42px] flex-1 resize-none rounded-lg px-4 py-2.5 text-sm text-[#111b21] placeholder:text-[#8696a0] focus:outline-hidden ${mode === 'note' ? 'bg-white ring-1 ring-amber-300' : 'bg-white'}`}
                                />
                                <button onClick={submit} disabled={!text.trim() || reply.isPending || addNote.isPending}
                                    aria-label={mode === 'note' ? 'حفظ الملاحظة' : 'إرسال'}
                                    className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40 ${mode === 'note' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#00a884] hover:bg-[#008f72]'}`}>
                                    {reply.isPending || addNote.isPending
                                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        : mode === 'note' ? <StickyNote className="h-5 w-5" /> : <SendHorizontal className="h-5 w-5 rotate-180" />}
                                </button>
                            </div>
                            <p className="mt-1 hidden text-[10px] text-[#8696a0] lg:block">Enter للإرسال · Shift+Enter لسطر جديد{mode === 'reply' ? ' · ردك يوقف الرد التلقائي لهذا العميل مؤقتاً' : ''}</p>
                        </footer>
                    </>
                )}
            </section>

            {/* ---------- Customer info ---------- */}
            {conversation && infoOpen && (
                <CustomerPanel
                    conversation={conversation} customer={customer} notes={notes} meta={meta}
                    canDeleteNote={canDeleteNote} onDeleteNote={(id) => deleteNote.mutate(id)} onAddNote={() => startNoteOn(null)}
                    onTags={(tags) => update.mutate({ tags })} onStatus={(value) => update.mutate({ status: value })}
                    onClose={() => setInfoOpen(false)}
                />
            )}
        </div>
    );
};

const MessageBubble: React.FC<{ message: Dict; onNote: () => void }> = ({ message: m, onNote }) => {
    const inbound = m.direction === 'in';
    const label = !inbound ? [EVENT_LABELS[m.event] ?? m.event, m.sent_by].filter(Boolean).join(' · ') : '';

    return (
        <div className={`group flex items-center gap-1 ${inbound ? 'justify-start' : 'justify-end'}`}>
            {!inbound && <NoteOnMessageButton onClick={onNote} />}
            <div className={`relative max-w-[78%] rounded-lg px-2.5 pt-1.5 pb-1 text-[14.2px] leading-relaxed text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,.13)] ${inbound ? 'rounded-ss-none bg-white' : 'rounded-se-none bg-[#d9fdd3]'}`}>
                {label && <p className="mb-0.5 text-[11px] font-semibold text-[#008069]">{label}</p>}
                {m.type === 'template' && <p className="mb-0.5 text-[10px] text-[#667781]">قالب معتمد</p>}
                <span className="whitespace-pre-wrap break-words">{m.body || <i className="text-[#8696a0]">[{m.type}]</i>}</span>
                <span className="float-end ms-3 mt-1.5 flex translate-y-0.5 items-center gap-0.5 text-[11px] text-[#667781]">
                    {clock(m.created_at)}
                    {!inbound && <DeliveryTicks status={m.status} />}
                </span>
                {m.error && <p className="clear-both mt-1 text-[11px] text-rose-600">{m.error}</p>}
            </div>
            {inbound && <NoteOnMessageButton onClick={onNote} />}
        </div>
    );
};

const DeliveryTicks: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'failed') return <span className="font-bold text-rose-500" title="فشل الإرسال">!</span>;
    if (status === 'read') return <CheckCheck className="h-4 w-4 text-[#53bdeb]" />;
    if (status === 'delivered') return <CheckCheck className="h-4 w-4" />;
    if (status === 'sent') return <Check className="h-4 w-4" />;
    return <span className="h-3 w-3 rounded-full border border-current opacity-60" title="في الانتظار" />;
};

const NoteOnMessageButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} title="ملاحظة على هذه الرسالة" aria-label="ملاحظة على هذه الرسالة"
        className="rounded-full bg-white/80 p-1.5 text-amber-600 opacity-0 shadow-sm transition-opacity hover:bg-amber-50 focus:opacity-100 group-hover:opacity-100">
        <StickyNote className="h-3.5 w-3.5" />
    </button>
);

const NoteBubble: React.FC<{ note: LeadNote; onMessage?: Dict; canDelete: boolean; onDelete: () => void }> = ({ note, onMessage, canDelete, onDelete }) => (
    <div className="my-1 flex justify-center">
        <div className="w-full max-w-[88%] rounded-lg border-s-4 border-amber-400 bg-[#fff8e1] px-3 py-2 text-sm text-[#3b3205] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                <StickyNote className="h-3.5 w-3.5" /> ملاحظة داخلية
                <span className="font-normal text-amber-600">· {note.employee_name ?? 'النظام'} · {clock(note.created_at)}</span>
                {canDelete && (
                    <button onClick={onDelete} className="ms-auto text-amber-500 hover:text-rose-600" aria-label="حذف الملاحظة"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
            </div>
            {onMessage && <p className="mb-1 truncate rounded bg-amber-100/70 px-2 py-1 text-[12px] text-amber-900">↩ «{onMessage.body || `[${onMessage.type}]`}»</p>}
            <p className="whitespace-pre-wrap">{note.body}</p>
        </div>
    </div>
);

const CustomerPanel: React.FC<{
    conversation: Dict;
    customer: Dict | null;
    notes: LeadNote[];
    meta?: InboxMeta;
    canDeleteNote: (n: LeadNote) => boolean;
    onDeleteNote: (id: number) => void;
    onAddNote: () => void;
    onTags: (tags: string[]) => void;
    onStatus: (status: string) => void;
    onClose: () => void;
}> = ({ conversation, customer, notes, meta, canDeleteNote, onDeleteNote, onAddNote, onTags, onStatus, onClose }) => (
    <aside className="absolute inset-y-0 end-0 z-20 flex w-full max-w-[340px] flex-col border-s border-[#e9edef] bg-[#f0f2f5] shadow-2xl xl:static xl:w-[340px] xl:shadow-none">
        <header className="flex h-16 shrink-0 items-center gap-3 bg-[#f0f2f5] px-4">
            <IconButton label="إغلاق" onClick={onClose}><X className="h-5 w-5" /></IconButton>
            <p className="text-[15px] font-semibold text-[#111b21]">معلومات العميل</p>
        </header>
        <div className="flex-1 space-y-2.5 overflow-y-auto pb-4">
            <section className="flex flex-col items-center gap-2 bg-white px-4 py-6 text-center">
                <Avatar name={conversation.name || customer?.name} seed={conversation.id} size="lg" />
                <p className="mt-1 text-lg font-semibold text-[#111b21]">{conversation.name || customer?.name || 'عميل'}</p>
                {!conversation.phone_hidden && <p dir="ltr" className="text-sm text-[#667781]">+{conversation.phone}</p>}
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                    {meta?.statuses.map((s) => (
                        <button key={s.key} onClick={() => onStatus(s.key)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors ${conversation.status === s.key ? STATUS_PILL[s.key] : 'bg-white text-[#667781] ring-[#e9edef] hover:bg-[#f5f6f6]'}`}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="bg-white px-4 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#008069]"><UserRound className="h-3.5 w-3.5" /> ملف العميل في المنصة</p>
                {!customer ? (
                    <p className="text-xs leading-relaxed text-[#667781]">الرقم غير مسجّل كعميل بعد. أول ملاحظة تكتبها تسجّله تلقائياً في عملاء المنصة.</p>
                ) : (
                    <>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                            <dt className="text-[#667781]">الحالة</dt><dd className="font-medium text-[#111b21]">{customer.status_label}</dd>
                            <dt className="text-[#667781]">المسؤول</dt><dd className="text-[#111b21]">{customer.assignee_name ?? 'غير مسند'}</dd>
                            <dt className="text-[#667781]">المصدر</dt><dd className="text-[#111b21]">{customer.source ?? '—'}</dd>
                            <dt className="text-[#667781]">منذ</dt><dd className="text-[#111b21]">{customer.created_at ? new Date(customer.created_at).toLocaleDateString('ar-EG') : '—'}</dd>
                        </dl>
                        <Link to={`/admin/leads?search=${encodeURIComponent(customer.name ?? '')}`} className="mt-2 inline-block text-xs font-semibold text-[#008069] hover:underline">فتح في العملاء ←</Link>
                    </>
                )}
            </section>

            {customer?.bookings?.length > 0 && (
                <section className="bg-white px-4 py-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#008069]"><ClipboardList className="h-3.5 w-3.5" /> طلبات التمويل</p>
                    <ul className="space-y-1.5">
                        {(customer!.bookings as Dict[]).map((b) => (
                            <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#f5f6f6] px-2.5 py-1.5 text-xs">
                                <span className="truncate text-[#111b21]">#{b.id} {b.car_name ?? ''}</span>
                                <span className="shrink-0 text-[#667781]">{b.status_label}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="bg-white px-4 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#008069]"><Tag className="h-3.5 w-3.5" /> تصنيفات المحادثة</p>
                <TagEditor tags={conversation.tags ?? []} suggestions={meta?.preset_tags} onChange={onTags} />
            </section>

            <section className="bg-white px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#008069]"><StickyNote className="h-3.5 w-3.5" /> كل الملاحظات ({notes.length})</p>
                    <button onClick={onAddNote} className="text-xs font-semibold text-[#008069] hover:underline">+ ملاحظة</button>
                </div>
                {notes.length === 0 && <p className="py-3 text-center text-[11px] text-[#8696a0]">لا توجد ملاحظات</p>}
                <div className="space-y-2">
                    {notes.map((n) => (
                        <div key={n.id} className="rounded-lg border-s-4 border-amber-400 bg-[#fff8e1] p-2.5 text-xs">
                            <p className="whitespace-pre-wrap text-[#3b3205]">{n.body}</p>
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-700">
                                <span>{n.employee_name ?? 'النظام'} · {NOTE_SOURCE_LABELS[n.source] ?? n.source} · {listTime(n.created_at)}</span>
                                {canDeleteNote(n) && <button onClick={() => onDeleteNote(n.id)} className="ms-auto hover:text-rose-600" aria-label="حذف الملاحظة"><Trash2 className="h-3 w-3" /></button>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    </aside>
);
