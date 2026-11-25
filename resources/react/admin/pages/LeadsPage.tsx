import React, { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Pagination } from '../../shared/components/ui/Pagination';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { Card } from '../../shared/components/ui/Card';
import { StatusBadge } from '../../shared/components/ui/StatusBadge';
import { Badge } from '../../shared/components/ui/Badge';
import { Modal } from '../../shared/components/ui/Modal';
import { Search, Phone, Mail, StickyNote, Trash2, Plus, UserPlus } from 'lucide-react';

interface LeadNote {
    id: number;
    body: string;
    source: string;
    employee_id: number | null;
    employee_name: string | null;
    created_at: string;
}

/** Every note on a lead (manual + WhatsApp), with a quick add box. */
const LeadNotesModal: React.FC<{ lead: { id: number; client_name: string } | null; onClose: () => void }> = ({ lead, onClose }) => {
    const { t, i18n } = useTranslation('admin');
    const queryClient = useQueryClient();
    const { user, hasRole } = useAuth();
    const isAdmin = user?.role === 'admin' || hasRole('admin');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);
    const key = ['admin', 'leads', 'notes', lead?.id];

    const NOTE_SOURCE_LABELS: Record<string, string> = {
        manual: t('leads.source_manual'),
        whatsapp: t('leads.source_whatsapp'),
    };

    const { data: notes = [], isLoading } = useQuery({
        queryKey: key,
        queryFn: async (): Promise<LeadNote[]> => (await apiClient.get(`/leads/${lead?.id}/notes`)).data.data,
        enabled: lead !== null,
    });

    const onError = (e: unknown) => setError((e as any)?.response?.data?.message || 'حدث خطأ');
    const add = useMutation({
        mutationFn: async () => (await apiClient.post(`/leads/${lead?.id}/notes`, { body })).data,
        onSuccess: () => {
            setBody('');
            setError(null);
            queryClient.invalidateQueries({ queryKey: key });
        },
        onError,
    });
    const remove = useMutation({
        mutationFn: async (id: number) => (await apiClient.delete(`/leads/${lead?.id}/notes/${id}`)).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
        onError,
    });

    return (
        <Modal isOpen={lead !== null} onClose={onClose} title={t('leads.notes_title', { name: lead?.client_name ?? '' })} icon={StickyNote} size="lg"
            primaryAction={{ label: t('leads.add_note'), onClick: () => add.mutate(), loading: add.isPending, disabled: !body.trim() }}
            secondaryAction={{ label: t('common.close'), onClick: onClose }}>
            <div className="space-y-3">
                <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder={t('leads.note_ph')}
                    className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]" />
                {error && <p className="text-xs text-rose-700">{error}</p>}
                <div className="max-h-80 overflow-y-auto space-y-2">
                    {isLoading && <p className="text-center text-xs text-[var(--text-muted)] py-4">{t('common.loading')}</p>}
                    {!isLoading && notes.length === 0 && <p className="text-center text-xs text-[var(--text-muted)] py-4">{t('leads.no_notes')}</p>}
                    {notes.map((n) => (
                        <div key={n.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs">
                            <p className="whitespace-pre-wrap text-amber-950">{n.body}</p>
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700">
                                <span>{n.employee_name ?? t('leads.system')} · {NOTE_SOURCE_LABELS[n.source] ?? n.source} · {new Date(n.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                {(isAdmin || n.employee_id === user?.id) && (
                                    <button onClick={() => remove.mutate(n.id)} className="ms-auto hover:text-rose-600" aria-label={t('leads.delete_note')}><Trash2 className="h-3 w-3" /></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

const LEAD_STATUS_OPTIONS = ['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost'] as const;

const CreateLeadModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation('admin');
    const isEn = i18n.language === 'en';
    const queryClient = useQueryClient();
    const today = new Date().toISOString().slice(0, 10);

    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [contactSourceId, setContactSourceId] = useState('');
    const [status, setStatus] = useState<string>('new');
    const [startedAt, setStartedAt] = useState(today);
    const [carId, setCarId] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [statusDetails, setStatusDetails] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { data: sources = [] } = useQuery({
        queryKey: ['admin', 'lead-sources', 'all'],
        queryFn: async () => (await apiClient.get('/leads/sources')).data?.data ?? [],
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });

    const { data: cars = [] } = useQuery({
        queryKey: ['admin', 'cars', 'select-list'],
        queryFn: async () => (await apiClient.get('/cars?per_page=100')).data?.data ?? [],
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['admin', 'employees', 'all'],
        queryFn: async () => (await apiClient.get('/employees?all=true')).data?.data ?? [],
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });

    const resetForm = () => {
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        setContactSourceId('');
        setStatus('new');
        setStartedAt(new Date().toISOString().slice(0, 10));
        setCarId('');
        setAssignedTo('');
        setStatusDetails('');
        setError(null);
    };

    const createLead = useMutation({
        mutationFn: async () => {
            const payload: Record<string, any> = {
                client_name: clientName.trim(),
                contact_source_id: Number(contactSourceId),
                status,
                started_at: startedAt,
            };
            if (clientPhone.trim()) payload.client_phone = clientPhone.trim();
            if (clientEmail.trim()) payload.client_email = clientEmail.trim();
            if (carId) payload.car_id = Number(carId);
            if (assignedTo) payload.assigned_to = Number(assignedTo);
            if (statusDetails.trim()) payload.status_details = statusDetails.trim();
            return (await apiClient.post('/leads', payload)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
            resetForm();
            onClose();
        },
        onError: (e: any) => {
            const errors = e?.response?.data?.errors;
            const firstErr = errors ? Object.values(errors).flat()[0] : null;
            setError((firstErr as string) || e?.response?.data?.message || t('common.error'));
        },
    });

    const canSubmit = clientName.trim().length > 0 && contactSourceId !== '' && startedAt !== '';

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { resetForm(); onClose(); }}
            title={t('leads.create_title')}
            subtitle={t('leads.create_subtitle')}
            icon={UserPlus}
            size="lg"
            primaryAction={{
                label: t('leads.create_btn'),
                onClick: () => createLead.mutate(),
                loading: createLead.isPending,
                disabled: !canSubmit,
            }}
            secondaryAction={{
                label: t('common.cancel'),
                onClick: () => { resetForm(); onClose(); },
            }}
        >
            <div className="space-y-4">
                {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_name')}</label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            maxLength={200}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_phone')}</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            maxLength={40}
                            placeholder="05xxxxxxxx"
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_email')}</label>
                        <input
                            type="email"
                            dir="ltr"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            maxLength={200}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_source')}</label>
                        <select
                            value={contactSourceId}
                            onChange={(e) => setContactSourceId(e.target.value)}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        >
                            <option value="">{t('leads.select_source')}</option>
                            {sources.map((src: any) => (
                                <option key={src.id} value={src.id}>{src.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_status')}</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        >
                            {LEAD_STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>{t(`leads.status_${st}`)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_started_at')}</label>
                        <input
                            type="date"
                            value={startedAt}
                            onChange={(e) => setStartedAt(e.target.value)}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_car')}</label>
                        <select
                            value={carId}
                            onChange={(e) => setCarId(e.target.value)}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        >
                            <option value="">{t('leads.select_car')}</option>
                            {cars.map((car: any) => {
                                const label = isEn ? (car.name_translations?.en || car.name) : (car.name_translations?.ar || car.name);
                                return <option key={car.id} value={car.id}>{label} {car.year ? `(${car.year})` : ''}</option>;
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_assigned')}</label>
                        <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        >
                            <option value="">{t('leads.select_employee')}</option>
                            {employees.map((emp: any) => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t('leads.field_details')}</label>
                    <textarea
                        rows={3}
                        value={statusDetails}
                        onChange={(e) => setStatusDetails(e.target.value)}
                        maxLength={5000}
                        placeholder={t('leads.note_ph')}
                        className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary)]"
                    />
                </div>
            </div>
        </Modal>
    );
};

export const LeadsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
    const [page, setPage] = useState(1);
    const [notesLead, setNotesLead] = useState<{ id: number; client_name: string } | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const debouncedSearch = useDebouncedValue(search, 300);

    const { data: leadsResponse, isLoading } = useQuery({
        queryKey: ['admin', 'leads', { page, search: debouncedSearch }],
        queryFn: async () => {
            const res = await apiClient.get('/leads', {
                params: { page, search: debouncedSearch || undefined },
            });
            return res.data;
        },
        placeholderData: keepPreviousData,
    });

    const leads = leadsResponse?.data || [];
    const meta = leadsResponse?.meta;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('leads.title')}</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{t('leads.subtitle')}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder={t('leads.search_ph')}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="p-0 overflow-hidden" padding="none">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-16 text-[var(--text-muted)] text-xs">
                        {t('leads.no_leads')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                            <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-default)]">
                                <tr>
                                    <th className="py-3 px-4 text-start">{t('leads.col_client')}</th>
                                    <th className="py-3 px-4 text-start">{t('leads.col_contact')}</th>
                                    <th className="py-3 px-4 text-start">{t('leads.col_source')}</th>
                                    <th className="py-3 px-4 text-start">{t('leads.col_status')}</th>
                                    <th className="py-3 px-4 text-start">{t('leads.col_assigned')}</th>
                                    <th className="py-3 px-4 text-start">{t('leads.col_date')}</th>
                                    <th className="py-3 px-4 text-start">{t('leads.col_notes')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                                {leads.map((lead: any) => (
                                    <tr key={lead.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                                            {lead.client_name}
                                        </td>
                                        <td className="py-3.5 px-4 space-y-0.5">
                                            {lead.client_phone && (
                                                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                    <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                    <span dir="ltr">{lead.client_phone}</span>
                                                </div>
                                            )}
                                            {lead.client_email && (
                                                <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
                                                    <Mail className="h-3 w-3 text-[var(--text-muted)]" />
                                                    <span>{lead.client_email}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Badge variant="neutral">{lead.contact_source?.name || t('leads.default_source')}</Badge>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <StatusBadge status={lead.status} label={lead.status_label || lead.status} />
                                        </td>
                                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                                            {lead.assigned_to?.name || t('leads.unassigned')}
                                        </td>
                                        <td className="py-3.5 px-4 text-[var(--text-muted)] text-[11px]">
                                            {lead.started_at || lead.created_at?.slice(0, 10)}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <button onClick={() => setNotesLead({ id: lead.id, client_name: lead.client_name })}
                                                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">
                                                <StickyNote className="h-3 w-3" /> {t('leads.view_notes')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {(meta?.last_page ?? 1) > 1 && (
                <Pagination
                    currentPage={meta?.current_page ?? page}
                    lastPage={meta?.last_page ?? 1}
                    onPageChange={setPage}
                />
            )}

            <LeadNotesModal lead={notesLead} onClose={() => setNotesLead(null)} />
            <CreateLeadModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

            <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                title={t('leads.add_manual')}
                aria-label={t('leads.add_manual')}
                className="fixed bottom-6 end-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tenant-primary,#1877F2)] text-white shadow-xl transition-all hover:scale-105 hover:brightness-110 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-[var(--tenant-primary,#1877F2)]/30"
            >
                <Plus className="h-6 w-6" />
            </button>
        </div>
    );
};
