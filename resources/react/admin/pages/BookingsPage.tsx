import React, { useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal, useConfirm } from '../../shared/components/ui';
import {
    Search,
    CalendarCheck,
    Check,
    X,
    Eye,
    Zap,
    Hourglass,
    CheckCircle2,
    FolderX,
    Phone,
    Car as CarIcon,
    DollarSign,
    User,
    Clock,
    FileText,
    TrendingUp,
    Edit,
    Trash2,
    Printer,
    ArrowRight,
    Upload,
    Plus,
    MessageSquare,
    Paperclip,
    ShieldCheck,
    AlertCircle,
    ExternalLink,
    Globe,
    Camera,
    Sparkles,
    Calendar,
    Send,
    Download,
    Building2,
    CreditCard,
    Briefcase,
    LayoutGrid,
    Table as TableIcon,
} from 'lucide-react';

export interface BookingsPageProps {
    group?: 'active' | 'pending' | 'delivered' | 'closed';
}

// WhatsApp Icon SVG
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

// Format relative date helper (localized)
function formatRelativeArabic(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const t = (k: string, opts?: any) => String(i18n.t(`admin:bookings_ui.${k}`, opts));

        if (diffSecs < 60) return t('just_now');
        if (diffMins < 60) return t('mins_ago', { count: diffMins });
        if (diffHours < 24) return t('hours_ago', { count: diffHours });
        if (diffDays === 1) return t('yesterday');
        if (diffDays === 2) return t('two_days_ago');
        if (diffDays < 7) return t('days_ago', { count: diffDays });
        if (diffWeeks === 1) return t('one_week_ago');
        if (diffWeeks === 2) return t('two_weeks_ago');
        if (diffWeeks <= 4) return t('weeks_ago', { count: diffWeeks });
        return d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ar-SA');
    } catch {
        return dateStr;
    }
}

// Format exact date helper (e.g. 09:58 - 12/11/2026)
function formatExactArabic(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
}

// Map channel to badge info
function getChannelBadge(booking: any) {
    const raw = (booking.marketing_channel || booking.source || booking.utm_source || '').toLowerCase();
    const t = (k: string) => String(i18n.t(`admin:bookings_ui.${k}`));
    if (raw.includes('meta') || raw.includes('facebook') || raw.includes('instagram') || raw.includes('fb') || raw.includes('ig')) {
        return {
            label: t('channel_meta'),
            icon: Camera,
            className: 'bg-pink-50 text-pink-600 border border-pink-200',
        };
    }
    if (raw.includes('snap')) {
        return {
            label: t('channel_snap'),
            icon: Sparkles,
            className: 'bg-amber-50 text-amber-700 border border-amber-200',
        };
    }
    if (raw.includes('tiktok')) {
        return {
            label: t('channel_tiktok'),
            icon: Sparkles,
            className: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
        };
    }
    if (raw.includes('google')) {
        return {
            label: t('channel_google'),
            icon: Globe,
            className: 'bg-blue-50 text-blue-600 border border-blue-200',
        };
    }
    return {
        label: t('channel_direct'),
        icon: Globe,
        className: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
}

// Status badge helper for table view
function getStatusBadgeStyle(status?: string | null): string {
    const s = (status || '').toLowerCase();
    if (s === 'new') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (s === 'approved' || s === 'authorized' || s === 'received') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('lost') || s.includes('cancel') || s.includes('reject')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s.includes('wait') || s.includes('recontact') || s.includes('review') || s.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
}

function formatLocaleString(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
        if ('ar' in val || 'en' in val) {
            return i18n.language === 'en' ? (val.en || val.ar || '') : (val.ar || val.en || '');
        }
        const vals = Object.values(val);
        return vals.length > 0 && typeof vals[0] === 'string' ? (vals[0] as string) : '';
    }
    return String(val);
}

const ACTIVE_BOOKING_STATUS_KEYS = [
    'new',
    'contacted_no_answer',
    'recontact_client',
    'waiting_documents',
    'bank_review',
    'approved',
    'authorized',
    'received',
    'pending',
    'waiting_supervisor_approval',
] as const;

const LOST_BOOKING_STATUS_KEYS = [
    'lost_no_answer',
    'lost_no_response',
    'lost_wrong_info',
    'lost_offer_not_suitable',
    'lost_client_cancelled',
    'lost_cancelled_after_approval',
    'lost_rejected_high_liabilities',
    'lost_rejected_simah',
    'lost_rejected_finance_terms',
] as const;

function formatBookingStatus(status?: string | null, fallbackLabel?: any): string {
    if (!status) return formatLocaleString(fallbackLabel) || '';
    const translated = i18n.t(`admin:booking_statuses.${status}`, { defaultValue: '' });
    if (translated) return String(translated);
    return formatLocaleString(fallbackLabel) || status;
}

export const BookingsPage: React.FC<BookingsPageProps> = ({ group: propGroup }) => {
    const { t } = useTranslation('admin');
    const queryClient = useQueryClient();
    const location = useLocation();

    // View mode: 'cards' vs 'table' (with persistence)
    const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
        return (localStorage.getItem('tameed_bookings_view_mode') as 'cards' | 'table') || 'cards';
    });
    const handleViewModeChange = (mode: 'cards' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('tameed_bookings_view_mode', mode);
    };

    // Per-page selector: 20, 50, 100
    const [perPage, setPerPage] = useState<number>(() => {
        return Number(localStorage.getItem('tameed_bookings_per_page')) || 20;
    });
    const handlePerPageChange = (num: number) => {
        setPerPage(num);
        setPage(1);
        localStorage.setItem('tameed_bookings_per_page', String(num));
    };

    // Determine current group from prop or URL
    const effectiveGroup = useMemo<'active' | 'pending' | 'delivered' | 'closed'>(() => {
        if (propGroup) return propGroup;
        if (location.pathname.includes('/pending')) return 'pending';
        if (location.pathname.includes('/delivered')) return 'delivered';
        if (location.pathname.includes('/closed')) return 'closed';
        return 'active';
    }, [propGroup, location.pathname]);

    const groupMeta = useMemo(() => {
        switch (effectiveGroup) {
            case 'pending':
                return {
                    title: t('bookings.pending_title'),
                    badge: t('bookings.pending'),
                    tabs: [
                        { label: t('bookings.all_pending'), val: '' },
                        { label: t('bookings.pending'), val: 'pending' },
                        { label: t('bookings.recontact_client'), val: 'recontact_client' },
                        { label: t('bookings.waiting_documents'), val: 'waiting_documents' },
                    ],
                };
            case 'delivered':
                return {
                    title: t('bookings.delivered_title'),
                    badge: t('bookings.received'),
                    tabs: [
                        { label: t('bookings.all_received'), val: '' },
                        { label: t('bookings.received'), val: 'received' },
                    ],
                };
            case 'closed':
                return {
                    title: t('bookings.closed_title'),
                    badge: t('bookings.all_closed'),
                    tabs: [
                        { label: t('bookings.all_closed'), val: '' },
                        { label: t('bookings.lost_rejected_simah'), val: 'lost_rejected_simah' },
                        { label: t('bookings.lost_client_cancelled'), val: 'lost_client_cancelled' },
                        { label: t('bookings.lost_no_answer'), val: 'lost_no_answer' },
                    ],
                };
            case 'active':
            default:
                return {
                    title: t('bookings.active_title'),
                    tabs: [
                        { label: t('bookings.all_statuses'), val: '' },
                        { label: t('bookings.new'), val: 'new' },
                        { label: t('bookings.waiting_documents'), val: 'waiting_documents' },
                        { label: t('bookings.recontact_client'), val: 'recontact_client' },
                        { label: t('bookings.bank_review'), val: 'bank_review' },
                        { label: t('bookings.approved'), val: 'approved' },
                        { label: t('bookings.authorized'), val: 'authorized' },
                    ],
                };
        }
    }, [effectiveGroup, t]);

    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Selected booking for full details modal (Screenshot 2)
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [detailsTab, setDetailsTab] = useState<'info' | 'offer' | 'history' | 'comments' | 'tasks'>('info');

    // Client card modal state
    const [clientCardData, setClientCardData] = useState<any>(null);

    // Document upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newNoteText, setNewNoteText] = useState('');
    const [selectedStatusInput, setSelectedStatusInput] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | number>('');

    // Authentication & Role check (Admin vs Sales)
    const { user: currentUser, hasRole, can } = useAuth();
    const isAdmin = Boolean(
        currentUser?.role === 'admin' ||
        currentUser?.roles?.includes('admin') ||
        hasRole('admin') ||
        can('manage-bookings')
    );

    // Fetch Bookings
    const debouncedSearch = useDebouncedValue(search, 300);

    const { data: bookingsResponse, isLoading } = useQuery({
        queryKey: ['admin', 'bookings', { group: effectiveGroup, status: statusFilter, search: debouncedSearch, page, perPage }],
        queryFn: async () => {
            const params: any = { page, per_page: perPage, group: effectiveGroup };
            if (statusFilter) params.status = statusFilter;
            if (debouncedSearch) params.search = debouncedSearch;
            const res = await apiClient.get('/api/v1/bookings', { params });
            return res.data;
        },
        placeholderData: keepPreviousData,
    });

    // Fetch Employees list for assignment dropdown (Admin only)
    const { data: employeesData } = useQuery({
        queryKey: ['admin', 'employees', 'all'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/employees?all=true');
            return res.data?.data || [];
        },
        enabled: isAdmin,
    });

    // Filter Sales Team members for Admin assignment
    const salesTeamOptions = useMemo(() => {
        if (!employeesData || !Array.isArray(employeesData)) return [];
        const reps = employeesData.filter((emp: any) => {
            if (!emp.is_active) return false;
            const r = (emp.role || '').toLowerCase();
            const hasSalesRole = emp.roles?.some((role: any) => {
                const name = (typeof role === 'string' ? role : role.name || '').toLowerCase();
                return name.includes('sale') || name === 'employee';
            });
            return r.includes('sale') || r === 'employee' || hasSalesRole;
        });
        return reps.length > 0 ? reps : employeesData.filter((e: any) => e.is_active);
    }, [employeesData]);

    // Fetch platform settings to check if auto-assignment is active
    const { data: settingsData } = useQuery({
        queryKey: ['admin', 'settings', 'all'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/settings');
            return res.data?.data || {};
        },
        enabled: isAdmin,
    });

    const isAutoAssignEnabled = Boolean(
        settingsData?.auto_assign_bookings === '1' ||
        settingsData?.auto_assign_bookings === true ||
        settingsData?.auto_assign_bookings === 1
    );

    // Toggle Auto Assignment Mutation
    const toggleAutoAssignMutation = useMutation({
        mutationFn: async (newValue: boolean) => {
            return await apiClient.put('/api/v1/settings', {
                settings: {
                    auto_assign_bookings: newValue ? '1' : '0',
                },
            });
        },
        onSuccess: (_, newValue) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
            alert(
                newValue
                    ? 'تم تفعيل التوزيع التلقائي للطلبات (Round-Robin) على فريق المبيعات بنجاح'
                    : 'تم إيقاف التوزيع التلقائي للطلبات (أصبح إسناد الطلبات يدوياً من صلاحية الأدمن فقط)'
            );
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'فشل تحديث إعدادات التوزيع التلقائي');
        },
    });

    // Auto-assign specific booking mutation
    const autoAssignBookingMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/api/v1/bookings/${id}/auto-assign`),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            if (selectedBooking) {
                setSelectedBooking(res.data?.data || selectedBooking);
            }
            alert('تم تعيين الطلب آلياً على موظف المبيعات التالي بنجاح');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'فشل التوزيع التلقائي لهذا الطلب');
        },
    });

    // Status update mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            apiClient.post(`/api/v1/bookings/${id}/status`, { status }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            if (selectedBooking) {
                setSelectedBooking(res.data?.data || { ...selectedBooking, status: selectedStatusInput });
            }
            alert('تم تغيير حالة الطلب بنجاح');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'حدث خطأ أثناء تغيير الحالة');
        },
    });

    const [quickNotice, setQuickNotice] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const quickStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            apiClient.patch(`/sales/tracking/${id}/stage`, { stage: status }),
        onSuccess: (_res, vars) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            queryClient.invalidateQueries({ queryKey: ['/sales/tracking'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'summary'] });
            const label = formatBookingStatus(vars.status);
            setQuickNotice(`#${vars.id} → ${label}`);
            setTimeout(() => setQuickNotice(null), 3000);
        },
        onError: (err: any) => {
            alert(err?.response?.data?.message || t('common.error'));
        },
    });

    // Assign employee mutation
    const assignEmployeeMutation = useMutation({
        mutationFn: ({ id, employee_id }: { id: number; employee_id: number }) =>
            apiClient.post(`/api/v1/bookings/${id}/assign`, { employee_id }),
        onSuccess: (res, vars) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            const assignedEmp = employeesData?.find((e: any) => e.id === Number(vars.employee_id));
            if (selectedBooking && selectedBooking.id === vars.id) {
                setSelectedBooking({ ...selectedBooking, assigned_to: assignedEmp || selectedBooking.assigned_to });
            }
            const empName = assignedEmp?.name || 'الموظف';
            setQuickNotice(`تم تحويل الطلب #${vars.id} إلى ${empName} بنجاح`);
            setTimeout(() => setQuickNotice(null), 3500);
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'حدث خطأ أثناء تحويل الطلب');
        },
    });

    // Add note mutation
    const addNoteMutation = useMutation({
        mutationFn: ({ id, note }: { id: number; note: string }) =>
            apiClient.post(`/api/v1/bookings/${id}/notes`, { note }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            setNewNoteText('');
            if (selectedBooking) {
                const updatedList = [
                    { id: Date.now(), note: newNoteText, employee: 'أنا', created_at: new Date().toISOString() },
                    ...(selectedBooking.history || []),
                ];
                setSelectedBooking({ ...selectedBooking, history: updatedList });
            }
        },
    });

    // Delete booking mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/api/v1/bookings/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            if (selectedBooking) setSelectedBooking(null);
            setQuickNotice('تم حذف الطلب بنجاح');
            setTimeout(() => setQuickNotice(null), 3500);
        },
    });

    // Smart Confirm hook for professional popups without emojis
    const { confirm: showConfirm, ConfirmDialogComponent } = useConfirm();

    const handleDeleteBooking = async (bookingId: number) => {
        const confirmed = await showConfirm({
            title: t('bookings_ui.modal.delete_confirm_title', { id: bookingId }),
            message: t('bookings_ui.modal.delete_confirm_msg'),
            detail: t('bookings_ui.modal.delete_confirm_detail'),
            confirmText: t('bookings_ui.modal.delete_confirm_btn'),
            cancelText: t('common.cancel'),
            variant: 'danger',
            icon: Trash2,
        });
        if (confirmed) {
            deleteMutation.mutate(bookingId);
        }
    };

    const [docTitle, setDocTitle] = useState('');
    const [pendingDocFile, setPendingDocFile] = useState<File | null>(null);

    // Upload document mutation
    const uploadDocMutation = useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            apiClient.post(`/api/v1/bookings/${id}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }),
        onSuccess: (res) => {
            const createdDoc = res.data?.data;
            if (createdDoc) {
                setSelectedBooking((prev: any) =>
                    prev ? { ...prev, documents: [...(prev.documents || []), createdDoc] } : prev
                );
            }
            setDocTitle('');
            setPendingDocFile(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            setQuickNotice(t('bookings_ui.modal.doc_uploaded'));
            setTimeout(() => setQuickNotice(null), 3000);
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || t('bookings_ui.modal.doc_upload_failed'));
        },
    });

    const deleteDocMutation = useMutation({
        mutationFn: ({ bookingId, docId }: { bookingId: number; docId: number }) =>
            apiClient.delete(`/api/v1/bookings/${bookingId}/documents/${docId}`),
        onSuccess: (_res, vars) => {
            setSelectedBooking((prev: any) =>
                prev ? { ...prev, documents: (prev.documents || []).filter((d: any) => d.id !== vars.docId) } : prev
            );
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
        },
    });

    const bookings = bookingsResponse?.data || [];
    const meta = bookingsResponse?.meta || {};

    // When details modal opens, initialize inputs and fetch full details (including documents & history)
    const handleOpenDetails = async (booking: any) => {
        setSelectedBooking(booking);
        setSelectedStatusInput(booking.status || '');
        setSelectedEmployeeId(booking.assigned_to?.id || '');
        setDetailsTab('info');
        setDocTitle('');
        setPendingDocFile(null);
        try {
            const res = await apiClient.get(`/api/v1/bookings/${booking.id}`);
            if (res.data?.data) {
                setSelectedBooking(res.data.data);
            }
        } catch {
            // keep list item data if detail fetch fails
        }
    };

    // Open client card modal
    const handleOpenClientCard = (clientInfo: { name: string; phone: string; booking?: any }) => {
        setClientCardData(clientInfo);
    };

    // Handle file selection
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingDocFile(file);
        if (!docTitle.trim()) {
            setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
        e.target.value = '';
    };

    const submitPendingDocument = () => {
        if (!pendingDocFile || !selectedBooking) return;
        const formData = new FormData();
        formData.append('file', pendingDocFile);
        formData.append('title', docTitle.trim() || pendingDocFile.name);
        uploadDocMutation.mutate({ id: selectedBooking.id, formData });
    };

    return (
        <div className="space-y-4">
            {/* ========================================================== */}
            {/* 1. TOP HEADER                                              */}
            {/* ========================================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <h1 className="text-base font-bold text-slate-800">{groupMeta.title}</h1>
                    </div>
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-100">
                        {groupMeta.badge}
                    </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Auto-Assignment Toggle for Admin */}
                    {isAdmin && (
                        <button
                            type="button"
                            disabled={toggleAutoAssignMutation.isPending}
                            onClick={() => toggleAutoAssignMutation.mutate(!isAutoAssignEnabled)}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                isAutoAssignEnabled
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-xs'
                                    : 'bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100'
                            }`}
                            title="تفعيل أو تعطيل التوزيع التلقائي للطلبات على موظفي المبيعات (Round-Robin)"
                        >
                            <Zap className={`h-3.5 w-3.5 ${isAutoAssignEnabled ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                            <span>{t('bookings_ui.auto_assign')} {isAutoAssignEnabled ? t('bookings_ui.auto_on') : t('bookings_ui.auto_off')}</span>
                        </button>
                    )}

                    {/* View Switcher: Cards vs Practical Table */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => handleViewModeChange('cards')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                viewMode === 'cards'
                                    ? 'bg-white text-slate-800 shadow-xs font-bold'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title={t('bookings_ui.cards_view')}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>{t('bookings_ui.cards_view')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewModeChange('table')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white text-slate-800 shadow-xs font-bold text-[var(--tenant-primary,#1877F2)]'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title={t('bookings_ui.table_view')}
                        >
                            <TableIcon className="h-3.5 w-3.5" />
                            <span>{t('bookings_ui.table_view')}</span>
                        </button>
                    </div>

                    {/* Per-Page Selector */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{t('bookings_ui.show')}</span>
                        <select
                            value={perPage}
                            onChange={(e) => handlePerPageChange(Number(e.target.value))}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-semibold focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)] cursor-pointer"
                        >
                            <option value={20}>{t('bookings_ui.per_page_item', { count: 20 })}</option>
                            <option value={50}>{t('bookings_ui.per_page_item', { count: 50 })}</option>
                            <option value={100}>{t('bookings_ui.per_page_item', { count: 100 })}</option>
                        </select>
                    </div>

                    <div className="text-xs font-semibold text-slate-500">
                        {t('bookings_ui.total_shown')} <span className="text-slate-800 font-bold">{meta?.total ?? bookings.length}</span>
                    </div>
                </div>
            </div>

            {/* ========================================================== */}
            {/* 2. FILTER & SEARCH BAR                                     */}
            {/* ========================================================== */}
            <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-thin">
                    {groupMeta.tabs.map((tab) => (
                        <button
                            key={tab.val}
                            onClick={() => {
                                setStatusFilter(tab.val);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                statusFilter === tab.val
                                    ? 'bg-[var(--tenant-primary,#1877F2)] text-white shadow-xs'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80 shrink-0">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('bookings_ui.search_ph')}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)] focus:bg-white"
                    />
                </div>
            </div>

            {/* ========================================================== */}
            {/* 3. BOOKINGS LIST: CARDS OR HIGH-VOLUME TABLE               */}
            {/* ========================================================== */}
            {isLoading ? (
                <div className="flex justify-center py-20 bg-white rounded-xl border border-slate-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary,#1877F2)]"></div>
                </div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-100 text-slate-400 text-xs">
                    <CalendarCheck className="h-10 w-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    <span>{t('bookings_ui.empty')}</span>
                </div>
            ) : viewMode === 'table' ? (
                /* ====================================================== */
                /* HIGH-VOLUME / COMPACT PRACTICAL TABLE VIEW (500+ DAILY)*/
                /* ====================================================== */
                <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start border-collapse">
                            <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-bold">
                                    <th className="py-3 px-3 text-start w-14">#</th>
                                    <th className="py-3 px-3 text-start min-w-[210px]">{t('bookings_ui.col_client')}</th>
                                    <th className="py-3 px-3 text-start min-w-[170px]">{t('bookings_ui.col_car')}</th>
                                    <th className="py-3 px-3 text-start min-w-[120px]">{t('bookings_ui.col_channel')}</th>
                                    <th className="py-3 px-3 text-start min-w-[140px]">{t('bookings_ui.col_dates')}</th>
                                    <th className="py-3 px-3 text-start min-w-[130px]">{t('bookings_ui.col_assigned')}</th>
                                    <th className="py-3 px-3 text-start min-w-[150px]">{t('bookings_ui.col_status')}</th>
                                    <th className="py-3 px-3 text-center min-w-[110px]">{t('bookings_ui.col_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {bookings.map((booking: any, idx: number) => {
                                    const channel = getChannelBadge(booking);
                                    const ChannelIcon = channel.icon;
                                    const statusBadgeClass = getStatusBadgeStyle(booking.status);
                                    const clientName = formatLocaleString(booking.client_name);
                                    const carBrand = formatLocaleString(booking.car?.brand || 'جيلي');
                                    const carModel = formatLocaleString(booking.car?.model || booking.car?.name || '');
                                    const staffName = formatLocaleString(booking.assigned_to?.name);

                                    return (
                                        <tr
                                            key={booking.id}
                                            className="hover:bg-sky-50/40 transition-colors group"
                                        >
                                            <td className="py-2.5 px-3 font-bold text-slate-500">
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                                    #{booking.id}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="space-y-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenClientCard({
                                                            name: clientName,
                                                            phone: booking.client_phone,
                                                            booking: booking,
                                                        })}
                                                        className="font-bold text-slate-800 text-xs hover:text-[var(--tenant-primary,#1877F2)] hover:underline text-start cursor-pointer block max-w-[180px] truncate"
                                                        title={`اضغط لعرض كرت العميل: ${clientName}`}
                                                    >
                                                        {clientName}
                                                    </button>
                                                    {booking.client_phone && (
                                                        <div className="flex items-center gap-1.5">
                                                            <a
                                                                href={`https://wa.me/${booking.client_phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-emerald-600 font-mono text-[11px] hover:underline font-semibold"
                                                                dir="ltr"
                                                                title="محادثة واتساب سريعة"
                                                            >
                                                                <WhatsAppIcon className="h-3 w-3 text-emerald-600 shrink-0" />
                                                                <span>{booking.client_phone}</span>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="font-semibold text-slate-800 max-w-[160px] truncate" title={`${carBrand} ${carModel}`}>
                                                    {carBrand} {carModel}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono">
                                                    {booking.car?.year || '2026'} {booking.car?.type ? `• ${formatLocaleString(booking.car?.type)}` : ''}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${channel.className}`}>
                                                    <ChannelIcon className="h-3 w-3" />
                                                    <span>{channel.label}</span>
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                                                <div>{t('bookings_ui.created_short')}: <span className="font-semibold text-slate-700">{formatRelativeArabic(booking.created_at)}</span></div>
                                                <div className="text-slate-400">{t('bookings_ui.updated_short')}: {formatRelativeArabic(booking.updated_at)}</div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {isAdmin ? (
                                                    <select
                                                        value={booking.assigned_to?.id || ''}
                                                        onChange={(e) => {
                                                            const targetId = Number(e.target.value);
                                                            if (targetId) {
                                                                assignEmployeeMutation.mutate({
                                                                    id: booking.id,
                                                                    employee_id: targetId,
                                                                });
                                                            }
                                                        }}
                                                        disabled={assignEmployeeMutation.isPending}
                                                        className="text-xs bg-slate-50 hover:bg-white border border-slate-200 hover:border-[var(--tenant-primary,#1877F2)] rounded-lg px-2 py-1 text-slate-800 font-semibold focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)] focus:bg-white cursor-pointer max-w-[130px] truncate transition-all shadow-2xs"
                                                        title={t('bookings_ui.click_to_assign')}
                                                    >
                                                        <option value="">{t('bookings_ui.unassigned_option')}</option>
                                                        {salesTeamOptions.map((emp: any) => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.name} {emp.role === 'admin' ? t('bookings_ui.admin_badge') : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="font-semibold text-slate-700 max-w-[120px] truncate block" title={staffName || t('bookings_ui.unassigned_label')}>
                                                        {staffName || <span className="text-slate-400 font-normal">{t('bookings_ui.unassigned_label')}</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <select
                                                    value={booking.status || 'new'}
                                                    onChange={(e) => {
                                                        const nextStatus = e.target.value;
                                                        if (nextStatus && nextStatus !== booking.status) {
                                                            quickStatusMutation.mutate({ id: booking.id, status: nextStatus });
                                                        }
                                                    }}
                                                    disabled={quickStatusMutation.isPending}
                                                    className={`text-[11px] font-semibold rounded-lg px-2 py-1 border cursor-pointer max-w-[165px] truncate focus:outline-hidden focus:ring-2 focus:ring-[var(--tenant-primary,#1877F2)]/30 transition-all ${statusBadgeClass}`}
                                                >
                                                    <optgroup label={t('sales.group_active_label')}>
                                                        {ACTIVE_BOOKING_STATUS_KEYS.map((key) => (
                                                            <option key={key} value={key} className="bg-white text-slate-800">
                                                                {formatBookingStatus(key)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label={t('sales.group_lost_label')}>
                                                        {LOST_BOOKING_STATUS_KEYS.map((key) => (
                                                            <option key={key} value={key} className="bg-white text-slate-800">
                                                                {formatBookingStatus(key)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetails(booking)}
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-[var(--tenant-primary,#1877F2)] hover:border-[var(--tenant-primary,#1877F2)] hover:bg-slate-50 transition-colors cursor-pointer"
                                                        title={t('bookings_ui.view_details')}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetails(booking)}
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer"
                                                        title={t('common.edit')}
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteBooking(booking.id)}
                                                        className="p-1.5 rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ====================================================== */
                /* DETAILED CARDS VIEW (WITH FIXED WIDTHS & TRUNCATION)   */
                /* ====================================================== */
                <div className="space-y-3">
                    {bookings.map((booking: any, idx: number) => {
                        const channel = getChannelBadge(booking);
                        const ChannelIcon = channel.icon;
                        const isClosed = booking.status?.includes('lost') || booking.status === 'rejected';
                        const clientName = formatLocaleString(booking.client_name);
                        const carBrand = formatLocaleString(booking.car?.brand || 'جيلي');
                        const carModel = formatLocaleString(booking.car?.model || booking.car?.name || 'امجراند GK');
                        const carType = formatLocaleString(booking.car?.type || 'سيدان');
                        const staffName = formatLocaleString(booking.assigned_to?.name || t('bookings_ui.unassigned_label'));
                        const statusLabel = formatBookingStatus(booking.status, booking.status_label);

                        return (
                            <div
                                key={booking.id}
                                className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs"
                            >
                                {/* Column 1: Number, ID, Request Type, Client Info */}
                                <div className="flex items-center gap-3 w-full sm:w-[260px] shrink-0">
                                    <div className="text-slate-400 font-bold text-sm min-w-[18px]">
                                        {idx + 1}
                                    </div>
                                    <div className="space-y-1.5 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                                                #{booking.id}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                                                <CarIcon className="h-3 w-3" />
                                                <span>طلبات سيارة</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1 ms-2 min-w-0 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenClientCard({
                                                name: clientName,
                                                phone: booking.client_phone,
                                                booking: booking,
                                            })}
                                            className="font-bold text-slate-800 text-sm hover:text-[var(--tenant-primary,#1877F2)] hover:underline text-start cursor-pointer block truncate max-w-[160px]"
                                            title={`اضغط لعرض كرت العميل: ${clientName}`}
                                        >
                                            {clientName}
                                        </button>
                                        {booking.client_phone && (
                                            <a
                                                href={`https://wa.me/${booking.client_phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-emerald-600 font-mono text-xs hover:underline font-semibold"
                                                dir="ltr"
                                            >
                                                <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                <span>{booking.client_phone}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Column 2: Date, Staff, Source */}
                                <div className="w-full sm:w-[190px] shrink-0 space-y-1 text-slate-600 leading-relaxed border-t xl:border-t-0 pt-2 xl:pt-0">
                                    <div className="truncate">
                                        <span className="text-slate-500 font-medium">{t('bookings_ui.created_short')} : </span>
                                        <span className="text-slate-700 font-semibold">{formatRelativeArabic(booking.created_at)}</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-slate-500 font-medium">{t('bookings_ui.updated_short')} : </span>
                                        <span className="text-slate-700 font-semibold">{formatRelativeArabic(booking.updated_at)}</span>
                                    </div>
                                    <div className="truncate flex items-center gap-1">
                                        <span className="text-slate-500 font-medium shrink-0">{t('bookings_ui.staff_prefix')} : </span>
                                        {isAdmin ? (
                                            <select
                                                value={booking.assigned_to?.id || ''}
                                                onChange={(e) => {
                                                    const targetId = Number(e.target.value);
                                                    if (targetId) {
                                                        assignEmployeeMutation.mutate({
                                                            id: booking.id,
                                                            employee_id: targetId,
                                                        });
                                                    }
                                                }}
                                                disabled={assignEmployeeMutation.isPending}
                                                className="text-xs bg-slate-50 hover:bg-white border border-slate-200 hover:border-[var(--tenant-primary,#1877F2)] rounded-md px-1.5 py-0.5 text-slate-800 font-bold focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)] cursor-pointer max-w-[125px] truncate transition-all"
                                                title={t('bookings_ui.click_to_assign')}
                                            >
                                                <option value="">{t('bookings_ui.unassigned_option')}</option>
                                                {salesTeamOptions.map((emp: any) => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name} {emp.role === 'admin' ? t('bookings_ui.admin_badge') : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-slate-800 font-bold truncate" title={staffName}>{staffName}</span>
                                        )}
                                    </div>
                                    <div className="truncate">
                                        <span className="text-slate-500 font-medium">المصدر : </span>
                                        <span className="text-slate-700">{booking.source || 'api'}</span>
                                    </div>
                                </div>

                                {/* Column 3: Vehicle Specs */}
                                <div className="w-full sm:w-[190px] shrink-0 space-y-1 text-slate-600 leading-relaxed border-t xl:border-t-0 pt-2 xl:pt-0">
                                    <div className="truncate">
                                        <span className="text-slate-500 font-medium">الماركة : </span>
                                        <span className="text-slate-800 font-bold">{carBrand}</span>
                                    </div>
                                    <div className="truncate" title={carModel}>
                                        <span className="text-slate-500 font-medium">موديل : </span>
                                        <span className="text-slate-800 font-semibold">{carModel}</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-slate-500 font-medium">الفئة : </span>
                                        <span className="text-slate-700">{carType}</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-slate-500 font-medium">سنة الصنع : </span>
                                        <span className="text-slate-700 font-mono">{booking.car?.year || '2026'}</span>
                                    </div>
                                </div>

                                {/* Column 4: Platform / Marketing Channel Pill */}
                                <div className="flex items-center justify-start xl:justify-center w-full sm:w-[130px] shrink-0 border-t xl:border-t-0 pt-2 xl:pt-0">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${channel.className}`}>
                                        <ChannelIcon className="h-3.5 w-3.5" />
                                        <span>{channel.label}</span>
                                    </span>
                                </div>

                                {/* Column 5: Status */}
                                <div className="w-full sm:w-[190px] shrink-0 space-y-1 text-slate-600 border-t xl:border-t-0 pt-2 xl:pt-0">
                                    <div className="truncate" title={statusLabel}>
                                        <span className="text-slate-500 font-medium">{t('bookings_ui.col_status')} : </span>
                                        <select
                                            value={booking.status || 'new'}
                                            onChange={(e) => {
                                                const nextStatus = e.target.value;
                                                if (nextStatus && nextStatus !== booking.status) {
                                                    quickStatusMutation.mutate({ id: booking.id, status: nextStatus });
                                                }
                                            }}
                                            disabled={quickStatusMutation.isPending}
                                            className={`mt-1 text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer w-full max-w-[190px] truncate focus:outline-hidden ${getStatusBadgeStyle(booking.status)}`}
                                        >
                                            <optgroup label={t('sales.group_active_label')}>
                                                {ACTIVE_BOOKING_STATUS_KEYS.map((key) => (
                                                    <option key={key} value={key} className="bg-white text-slate-800">
                                                        {formatBookingStatus(key)}
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <optgroup label={t('sales.group_lost_label')}>
                                                {LOST_BOOKING_STATUS_KEYS.map((key) => (
                                                    <option key={key} value={key} className="bg-white text-slate-800">
                                                        {formatBookingStatus(key)}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-medium">الحالة الرئيسية : </span>
                                        <span className={`font-semibold ${isClosed ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {isClosed ? 'مغلق' : 'مفتوح'}
                                        </span>
                                    </div>
                                </div>

                                {/* Column 6: Action Buttons */}
                                <div className="flex items-center gap-1.5 justify-end shrink-0 border-t xl:border-t-0 pt-2 xl:pt-0">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenDetails(booking)}
                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-[var(--tenant-primary,#1877F2)] hover:border-[var(--tenant-primary,#1877F2)] hover:bg-slate-50 transition-colors cursor-pointer"
                                        title="عرض التفاصيل"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenDetails(booking)}
                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer"
                                        title="تعديل الطلب"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteBooking(booking.id)}
                                        className="p-2 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="حذف الطلب"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {meta?.last_page > 1 && (
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 text-xs text-slate-600">
                    <span>
                        صفحة {meta.current_page} من {meta.last_page} (إجمالي {meta.total} طلب)
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={meta.current_page <= 1}
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold cursor-pointer"
                        >
                            السابق
                        </button>
                        <button
                            disabled={meta.current_page >= meta.last_page}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold cursor-pointer"
                        >
                            التالي
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================== */}
            {/* 4. BOOKING DETAILS VIEW (Matching Screenshot 2 exactly)     */}
            {/* ========================================================== */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
                        {/* Top Dark Header Bar (Navy #0f172a) */}
                        <div className="bg-[#0f172a] text-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <span>عرض بيانات الطلب #{selectedBooking.id}</span>
                                </h2>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenClientCard({
                                            name: selectedBooking.client_name,
                                            phone: selectedBooking.client_phone,
                                            booking: selectedBooking,
                                        })}
                                        className="hover:underline flex items-center gap-1 text-white font-semibold cursor-pointer"
                                    >
                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                        <span>العميل: {selectedBooking.client_name}</span>
                                    </button>

                                    {selectedBooking.client_phone && (
                                        <a
                                            href={`https://wa.me/${selectedBooking.client_phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                            dir="ltr"
                                        >
                                            <WhatsAppIcon className="h-3.5 w-3.5" />
                                            <span>{selectedBooking.client_phone}</span>
                                        </a>
                                    )}

                                    <span className="flex items-center gap-1 text-slate-300">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{t('bookings_ui.modal.status_label')} {formatBookingStatus(selectedBooking.status, selectedBooking.status_label)}</span>
                                    </span>

                                    <span className="flex items-center gap-1 text-slate-400">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{formatExactArabic(selectedBooking.created_at)}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Top action buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {selectedBooking.client_phone && (
                                    <a
                                        href={`https://wa.me/${selectedBooking.client_phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                                    >
                                        <WhatsAppIcon className="h-4 w-4" />
                                        <span>{t('bookings_ui.modal.whatsapp_contact')}</span>
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                >
                                    <Printer className="h-4 w-4" />
                                    <span>{t('bookings_ui.modal.print_details')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedBooking(null)}
                                    title={t('common.close')}
                                    aria-label={t('common.close')}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 hover:border-rose-500"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs Bar */}
                        <div className="bg-slate-100 border-b border-slate-200 px-5 flex items-center gap-1 overflow-x-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => setDetailsTab('info')}
                                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                                    detailsTab === 'info'
                                        ? 'border-[var(--tenant-primary,#1877F2)] text-[var(--tenant-primary,#1877F2)] bg-white'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t('bookings_ui.modal.tab_info')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDetailsTab('offer')}
                                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                                    detailsTab === 'offer'
                                        ? 'border-[var(--tenant-primary,#1877F2)] text-[var(--tenant-primary,#1877F2)] bg-white'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t('bookings_ui.modal.tab_offer')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDetailsTab('history')}
                                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                                    detailsTab === 'history'
                                        ? 'border-[var(--tenant-primary,#1877F2)] text-[var(--tenant-primary,#1877F2)] bg-white'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t('bookings_ui.modal.tab_history')} ({selectedBooking.history?.length || 1})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDetailsTab('comments')}
                                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                                    detailsTab === 'comments'
                                        ? 'border-[var(--tenant-primary,#1877F2)] text-[var(--tenant-primary,#1877F2)] bg-white'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t('bookings_ui.modal.tab_comments')} ({selectedBooking.history?.length || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDetailsTab('tasks')}
                                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                                    detailsTab === 'tasks'
                                        ? 'border-[var(--tenant-primary,#1877F2)] text-[var(--tenant-primary,#1877F2)] bg-white'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t('bookings_ui.modal.tab_tasks')} (0)
                            </button>
                        </div>

                        {/* Modal Body / Tab Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                            {detailsTab === 'info' && (
                                <div className="space-y-6">
                                    {/* Two Columns Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                        {/* Right Column: Customer Info & Financial Profile */}
                                        <div className="space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                                            <h3 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
                                                <span>{t('bookings_ui.modal.client_info_title')}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenClientCard({
                                                        name: selectedBooking.client_name,
                                                        phone: selectedBooking.client_phone,
                                                        booking: selectedBooking,
                                                    })}
                                                    className="text-xs text-[var(--tenant-primary,#1877F2)] hover:underline font-normal flex items-center gap-1"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    <span>{t('bookings_ui.modal.open_client_card')}</span>
                                                </button>
                                            </h3>

                                            <div className="divide-y divide-slate-100 text-xs">
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.client_name')}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenClientCard({
                                                            name: selectedBooking.client_name,
                                                            phone: selectedBooking.client_phone,
                                                            booking: selectedBooking,
                                                        })}
                                                        className="font-bold text-slate-800 hover:text-[var(--tenant-primary,#1877F2)] hover:underline cursor-pointer"
                                                    >
                                                        {selectedBooking.client_name}
                                                    </button>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.client_phone')}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-slate-800" dir="ltr">{selectedBooking.client_phone}</span>
                                                        <a
                                                            href={`https://wa.me/${selectedBooking.client_phone?.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1"
                                                        >
                                                            <WhatsAppIcon className="h-3 w-3" />
                                                            <span>{t('bookings_ui.modal.whatsapp')}</span>
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.client_email')}</span>
                                                    <span className="text-slate-700">{selectedBooking.client_email || '—'}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.order_number')}</span>
                                                    <span className="font-bold text-slate-800">#{selectedBooking.id}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.created_at')}</span>
                                                    <span className="text-slate-700">{formatExactArabic(selectedBooking.created_at)}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.order_type')}</span>
                                                    <span className="font-semibold text-slate-800">
                                                        {selectedBooking.booking_type === 'test_drive' ? t('bookings_ui.type_test_drive') : (selectedBooking.booking_type === 'inquiry' ? t('bookings_ui.type_inquiry') : t('bookings_ui.type_purchase'))}
                                                    </span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.location')}</span>
                                                    <span className="text-slate-700">{selectedBooking.location || '—'}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.current_status')}</span>
                                                    <span className="font-bold text-[var(--tenant-primary,#1877F2)]">
                                                        * {formatBookingStatus(selectedBooking.status, selectedBooking.status_label)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Green Box: Financial & Credit details */}
                                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs space-y-3">
                                                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 font-bold text-emerald-900">
                                                    <span>{t('bookings_ui.modal.credit_title')}</span>
                                                    <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                                        {t('bookings_ui.modal.finance_bank')} {selectedBooking.bank_name || '—'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-700 text-[11px]">
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.salary')} </span>
                                                        <span className="font-bold text-slate-900">
                                                            {(selectedBooking.calculator_details?.salary || 0).toLocaleString()} {t('common.sar')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.commitments')} </span>
                                                        <span className="font-bold text-slate-900">
                                                            {(selectedBooking.calculator_details?.commitments || 0).toLocaleString()} {t('common.sar')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.work_sector')} </span>
                                                        <span className="font-semibold text-slate-800">
                                                            {selectedBooking.calculator_details?.work_sector || '—'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.service_period')} </span>
                                                        <span className="font-semibold text-slate-800">
                                                            {selectedBooking.calculator_details?.service_period || '—'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.housing_support')} </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.housing_support ? t('bookings_ui.modal.yes') : t('bookings_ui.modal.no')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.mortgage')} </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.has_mortgage ? t('bookings_ui.modal.yes') : t('bookings_ui.modal.no')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.simah_issues')} </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.has_simah_issues ? t('bookings_ui.modal.yes') : t('bookings_ui.modal.no')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.traffic_violations')} </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.traffic_violations ? t('bookings_ui.modal.yes') : t('bookings_ui.modal.no')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.finance_duration')} </span>
                                                        <span className="font-semibold">{(selectedBooking.financials?.duration_years || 5) * 12} {t('bookings_ui.modal.months_unit')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('bookings_ui.modal.deducted_discount')} </span>
                                                        <span className="font-bold text-emerald-700">
                                                            {(selectedBooking.financials?.monthly_installment || 0).toLocaleString()} {t('common.sar')}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-slate-500">{t('bookings_ui.modal.preferred_color')} </span>
                                                        <span className="font-semibold text-slate-800">{selectedBooking.notes?.color || '—'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Employee Assignment Box */}
                                            {isAdmin ? (
                                                <div className="pt-2 border-t border-slate-100 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                                            <span>{t('bookings_ui.modal.assign_title')}</span>
                                                        </label>
                                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            {t('bookings_ui.modal.admin_perm')}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {t('bookings_ui.modal.current_agent')} <span className="font-bold text-slate-800">{selectedBooking.assigned_to?.name || t('bookings_ui.unassigned_label')}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <select
                                                            value={selectedEmployeeId}
                                                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                                        >
                                                            <option value="">{t('bookings_ui.modal.select_sales_rep')}</option>
                                                            {salesTeamOptions.map((emp: any) => (
                                                                <option key={emp.id} value={emp.id}>
                                                                    {emp.name} {emp.role === 'admin' ? t('bookings_ui.admin_badge') : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={!selectedEmployeeId || assignEmployeeMutation.isPending}
                                                                onClick={() => {
                                                                    if (selectedEmployeeId) {
                                                                        assignEmployeeMutation.mutate({
                                                                            id: selectedBooking.id,
                                                                            employee_id: Number(selectedEmployeeId),
                                                                        });
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                                                            >
                                                                {assignEmployeeMutation.isPending ? t('bookings_ui.modal.transferring') : t('bookings_ui.modal.transfer_btn')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={autoAssignBookingMutation.isPending}
                                                                onClick={() => autoAssignBookingMutation.mutate(selectedBooking.id)}
                                                                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Zap className="h-3.5 w-3.5 fill-white" />
                                                                <span>{autoAssignBookingMutation.isPending ? t('bookings_ui.modal.auto_assigning') : t('bookings_ui.modal.auto_assign_btn')}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-slate-100 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                        <span>{t('bookings_ui.modal.current_agent')} <strong className="text-slate-800">{selectedBooking.assigned_to?.name || t('bookings_ui.unassigned_label')}</strong></span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded font-medium">
                                                        {t('bookings_ui.modal.assign_admin_only')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Status Change Box */}
                                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                                <label className="block text-xs font-bold text-slate-800">{t('bookings_ui.modal.change_status_title')}</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedStatusInput}
                                                        onChange={(e) => setSelectedStatusInput(e.target.value)}
                                                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                                    >
                                                        <optgroup label={t('sales.group_active_label')}>
                                                            {ACTIVE_BOOKING_STATUS_KEYS.map((key) => (
                                                                <option key={key} value={key}>{formatBookingStatus(key)}</option>
                                                            ))}
                                                        </optgroup>
                                                        <optgroup label={t('sales.group_lost_label')}>
                                                            {LOST_BOOKING_STATUS_KEYS.map((key) => (
                                                                <option key={key} value={key}>{formatBookingStatus(key)}</option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        disabled={updateStatusMutation.isPending}
                                                        onClick={() => {
                                                            if (selectedStatusInput) {
                                                                updateStatusMutation.mutate({
                                                                    id: selectedBooking.id,
                                                                    status: selectedStatusInput,
                                                                });
                                                            }
                                                        }}
                                                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                                                    >
                                                        {updateStatusMutation.isPending ? t('bookings_ui.modal.transferring') : t('bookings_ui.modal.save_btn')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Left Column: Vehicle Details & Financing Target */}
                                        <div className="space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                                            <h3 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
                                                {t('bookings_ui.modal.car_info_title')}
                                            </h3>

                                            <div className="divide-y divide-slate-100 text-xs">
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.car_code')}</span>
                                                    <span className="font-mono font-bold text-slate-800">
                                                        {selectedBooking.car?.id || '—'}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.car_brand')}</span>
                                                    <span className="font-bold text-slate-800">{formatLocaleString(selectedBooking.car?.brand) || '—'}</span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.car_model')}</span>
                                                    <span className="font-bold text-slate-800">
                                                        {formatLocaleString(selectedBooking.car?.model || selectedBooking.car?.name) || '—'}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.car_year')}</span>
                                                    <span className="font-mono text-slate-800">{selectedBooking.car?.year || '—'}</span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.car_type')}</span>
                                                    <span className="text-slate-700">{formatLocaleString(selectedBooking.car?.type) || '—'}</span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between bg-amber-50/50 -mx-5 px-5 rounded">
                                                    <span className="text-slate-700 font-bold">{t('bookings_ui.modal.cash_price')}</span>
                                                    <span className="font-bold text-base text-amber-600">
                                                        {(selectedBooking.car?.cash_price || selectedBooking.financials?.total_price || 0).toLocaleString()} {t('common.sar')}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.est_monthly')}</span>
                                                    <span className="font-bold text-slate-800">
                                                        {(selectedBooking.financials?.monthly_installment || 0).toLocaleString()} {t('common.sar')}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">{t('bookings_ui.modal.suggested_down')}</span>
                                                    <span className="font-bold text-slate-800">
                                                        {(selectedBooking.financials?.down_payment || 0).toLocaleString()} {t('common.sar')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Section: Attached Documents */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <h3 className="font-bold text-sm text-slate-800">{t('bookings_ui.modal.documents_title')}</h3>
                                        </div>

                                        {/* Upload Bar: Document Title + File Picker + Submit */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                            <input
                                                type="text"
                                                value={docTitle}
                                                onChange={(e) => setDocTitle(e.target.value)}
                                                placeholder={t('bookings_ui.modal.doc_title_ph')}
                                                maxLength={255}
                                                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                            />
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                            >
                                                <Paperclip className="h-3.5 w-3.5" />
                                                <span className="max-w-[140px] truncate">{pendingDocFile ? pendingDocFile.name : t('bookings_ui.modal.choose_file')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!pendingDocFile || uploadDocMutation.isPending}
                                                onClick={submitPendingDocument}
                                                className="px-4 py-2 rounded-lg bg-[var(--tenant-primary,#1877F2)] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                                            >
                                                <Upload className="h-3.5 w-3.5" />
                                                <span>{t('bookings_ui.modal.upload_doc')}</span>
                                            </button>
                                        </div>

                                        {selectedBooking.documents && selectedBooking.documents.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {selectedBooking.documents.map((doc: any) => (
                                                    <div key={doc.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Paperclip className="h-4 w-4 text-[var(--tenant-primary,#1877F2)] shrink-0" />
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-semibold text-slate-800 truncate">{doc.title}</div>
                                                                {doc.file_type && (
                                                                    <div className="text-[10px] text-slate-400 uppercase">{doc.file_type}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <a
                                                                href={`/api/v1/bookings/${selectedBooking.id}/documents/${doc.id}/download`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-emerald-600 transition-colors"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteDocMutation.mutate({ bookingId: selectedBooking.id, docId: doc.id })}
                                                                className="p-1.5 rounded-md hover:bg-white text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                                title={t('common.delete')}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-400 text-xs">
                                                <FolderX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                <span>{t('bookings_ui.modal.no_documents')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Financial Offer Details */}
                            {detailsTab === 'offer' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                    <h3 className="font-bold text-sm text-slate-800 pb-2 border-b">{t('bookings_ui.modal.offer_title')}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                        <div className="p-3 bg-slate-50 rounded-lg border">
                                            <span className="text-slate-500 block">{t('bookings_ui.modal.purchase_price')}</span>
                                            <span className="font-bold text-sm text-slate-800">
                                                {(selectedBooking.financials?.purchase_price || 0).toLocaleString()} {t('common.sar')}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg border">
                                            <span className="text-slate-500 block">{t('bookings_ui.modal.auth_price')}</span>
                                            <span className="font-bold text-sm text-slate-800">
                                                {(selectedBooking.financials?.authorization_price || 0).toLocaleString()} {t('common.sar')}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <span className="text-emerald-700 block font-medium">{t('bookings_ui.modal.net_commission')}</span>
                                            <span className="font-bold text-sm text-emerald-700">
                                                {(selectedBooking.financials?.net_commission || 0).toLocaleString()} {t('common.sar')}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedBooking.offer_notes && (
                                        <div className="p-3 bg-slate-50 rounded-lg border text-xs">
                                            <span className="font-bold text-slate-700 block mb-1">{t('bookings_ui.modal.offer_notes')}</span>
                                            <p className="text-slate-600">{selectedBooking.offer_notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: History Timeline */}
                            {detailsTab === 'history' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                    <h3 className="font-bold text-sm text-slate-800 pb-2 border-b">{t('bookings_ui.modal.history_title')}</h3>
                                    <div className="space-y-3">
                                        <div className="flex gap-3 text-xs items-start">
                                            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                1
                                            </div>
                                            <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between font-bold text-slate-800">
                                                    <span>{t('bookings_ui.modal.status_label')} {formatBookingStatus(selectedBooking.status, selectedBooking.status_label)}</span>
                                                    <span className="text-[11px] text-slate-400 font-normal">
                                                        {formatExactArabic(selectedBooking.updated_at || selectedBooking.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 mt-1">{t('bookings_ui.modal.by_user')} {selectedBooking.assigned_to?.name || t('bookings_ui.modal.system_user')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Comments & Notes */}
                            {detailsTab === 'comments' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                    <h3 className="font-bold text-sm text-slate-800 pb-2 border-b">{t('bookings_ui.modal.comments_title')}</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder={t('bookings_ui.modal.comment_ph')}
                                            value={newNoteText}
                                            onChange={(e) => setNewNoteText(e.target.value)}
                                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                                        />
                                        <button
                                            type="button"
                                            disabled={!newNoteText.trim() || addNoteMutation.isPending}
                                            onClick={() => addNoteMutation.mutate({ id: selectedBooking.id, note: newNoteText })}
                                            className="px-4 py-2 bg-[var(--tenant-primary,#1877F2)] hover:opacity-90 text-white font-bold text-xs rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                            <span>{t('bookings_ui.modal.send_btn')}</span>
                                        </button>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        {selectedBooking.history && selectedBooking.history.length > 0 ? (
                                            selectedBooking.history.map((n: any, idx: number) => (
                                                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                                    <div className="flex items-center justify-between text-slate-500 mb-1">
                                                        <span className="font-bold text-slate-800">{n.employee || t('bookings_ui.modal.employee_label')}</span>
                                                        <span className="text-[11px]">{formatRelativeArabic(n.created_at)}</span>
                                                    </div>
                                                    <p className="text-slate-700">{n.note}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-xs">{t('bookings_ui.modal.no_comments')}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 5: Tasks */}
                            {detailsTab === 'tasks' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center py-12 text-slate-400 text-xs">
                                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <span>{t('bookings_ui.modal.no_tasks')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================== */}
            {/* 5. CLIENT CARD MODAL                                       */}
            {/* ========================================================== */}
            <Modal
                isOpen={Boolean(clientCardData)}
                onClose={() => setClientCardData(null)}
                size="lg"
                title={clientCardData?.name || t('bookings_ui.modal.client_card_title')}
                subtitle={clientCardData?.phone ? `${t('bookings_ui.modal.client_phone')}: ${clientCardData.phone}` : t('bookings_ui.modal.client_card_sub')}
                icon={User}
                iconVariant="primary"
                badge={
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {t('bookings_ui.modal.verified_client')}
                    </span>
                }
                secondaryAction={{
                    label: t('common.close'),
                    onClick: () => setClientCardData(null),
                }}
            >
                {clientCardData && (
                    <div className="space-y-4 text-xs">
                        {/* Quick Actions */}
                        <div className="flex items-center gap-2">
                            {clientCardData.phone && (
                                <>
                                    <a
                                        href={`https://wa.me/${clientCardData.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <WhatsAppIcon className="h-4 w-4 text-emerald-600" />
                                        <span>{t('bookings_ui.modal.direct_whatsapp')}</span>
                                    </a>
                                    <a
                                        href={`tel:${clientCardData.phone}`}
                                        className="flex-1 py-2 px-3 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Phone className="h-4 w-4 text-sky-600" />
                                        <span>اتصال هاتفي</span>
                                    </a>
                                </>
                            )}
                        </div>

                        {/* Contact Details */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                            <h4 className="font-bold text-slate-800 text-xs pb-1 border-b border-slate-200 flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-slate-500" />
                                <span>بيانات الاتصال</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">رقم الجوال</span>
                                    <span className="font-mono font-bold text-slate-800" dir="ltr">{clientCardData.phone || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">المدينة / المنطقة</span>
                                    <span className="font-semibold text-slate-800">{clientCardData.booking?.location || 'مكة المكرمة'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 block text-[11px]">البريد الإلكتروني</span>
                                    <span className="font-medium text-slate-800">{clientCardData.booking?.client_email || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Financial Profile Card */}
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-2">
                            <h4 className="font-bold text-emerald-900 text-xs pb-1 border-b border-emerald-200/60 flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-700" />
                                <span>الملف المالي والائتماني للعميل</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                                <div>
                                    <span className="text-slate-500 block text-[11px]">الراتب الشهري</span>
                                    <span className="font-bold text-slate-900">
                                        {(clientCardData.booking?.calculator_details?.salary || 9000).toLocaleString()} ريال
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">الالتزامات القائمة</span>
                                    <span className="font-bold text-slate-900">
                                        {(clientCardData.booking?.calculator_details?.commitments || 0).toLocaleString()} ريال
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">جهة العمل</span>
                                    <span className="font-semibold text-slate-800">
                                        {clientCardData.booking?.calculator_details?.work_sector || 'قطاع خاص'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">البنك المحول إليه</span>
                                    <span className="font-semibold text-slate-800">
                                        {clientCardData.booking?.bank_name || 'مصرف الراجحي'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">تمويل عقاري</span>
                                    <span className="font-semibold">
                                        {clientCardData.booking?.calculator_details?.has_mortgage ? 'نعم' : 'لا'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">متعثر في سمة</span>
                                    <span className="font-semibold">
                                        {clientCardData.booking?.calculator_details?.has_simah_issues ? 'نعم' : 'لا'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bookings associated with this client */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <CarIcon className="h-3.5 w-3.5 text-slate-500" />
                                <span>طلبات العميل المسجلة</span>
                            </h4>
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">#{clientCardData.booking?.id || '384'}</span>
                                    <span className="text-slate-600">
                                        {clientCardData.booking?.car?.brand || 'جيلي'} {clientCardData.booking?.car?.model || 'امجراند'}
                                    </span>
                                </div>
                                <span className="font-semibold text-[var(--tenant-primary,#1877F2)]">
                                    {clientCardData.booking?.status_label || clientCardData.booking?.status || 'مفتوح'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Smart Confirmation Dialog without Emojis */}
            {ConfirmDialogComponent}

            {/* Quick Floating Toast for in-line changes */}
            {quickNotice && (
                <div className="fixed bottom-6 start-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{quickNotice}</span>
                </div>
            )}

            <CreateBookingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={(msg) => {
                    setQuickNotice(msg);
                    setTimeout(() => setQuickNotice(null), 3500);
                }}
            />

            <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                title={t('bookings_ui.add_manual')}
                aria-label={t('bookings_ui.add_manual')}
                className="fixed bottom-6 end-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tenant-primary,#1877F2)] text-white shadow-xl transition-all hover:scale-105 hover:brightness-110 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-[var(--tenant-primary,#1877F2)]/30"
            >
                <Plus className="h-6 w-6" />
            </button>
        </div>
    );
};

const CreateBookingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreated: (message: string) => void;
}> = ({ isOpen, onClose, onCreated }) => {
    const { t, i18n } = useTranslation('admin');
    const isEn = i18n.language === 'en';
    const queryClient = useQueryClient();

    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [carId, setCarId] = useState('');
    const [bookingType, setBookingType] = useState<'purchase' | 'test_drive' | 'inquiry'>('purchase');
    const [totalPrice, setTotalPrice] = useState('');
    const [downPayment, setDownPayment] = useState('');
    const [durationYears, setDurationYears] = useState('');
    const [monthlyInstallment, setMonthlyInstallment] = useState('');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { data: cars = [] } = useQuery({
        queryKey: ['admin', 'cars', 'select-list'],
        queryFn: async () => (await apiClient.get('/cars?per_page=100')).data?.data ?? [],
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });

    const resetForm = () => {
        setClientName('');
        setClientPhone('');
        setClientEmail('');
        setCarId('');
        setBookingType('purchase');
        setTotalPrice('');
        setDownPayment('');
        setDurationYears('');
        setMonthlyInstallment('');
        setLocation('');
        setNotes('');
        setError(null);
    };

    const createBooking = useMutation({
        mutationFn: async () => {
            const payload: Record<string, any> = {
                client_name: clientName.trim(),
                client_phone: clientPhone.trim(),
                car_id: Number(carId),
                booking_type: bookingType,
            };
            if (clientEmail.trim()) payload.client_email = clientEmail.trim();
            if (totalPrice !== '') payload.total_price = Number(totalPrice);
            if (downPayment !== '') payload.down_payment = Number(downPayment);
            if (durationYears !== '') payload.duration_years = Number(durationYears);
            if (monthlyInstallment !== '') payload.monthly_installment = Number(monthlyInstallment);
            if (location.trim()) payload.location = location.trim();
            if (notes.trim()) payload.notes = notes.trim();
            return (await apiClient.post('/bookings', payload)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            resetForm();
            onClose();
            onCreated(t('bookings_ui.created_notice'));
        },
        onError: (e: any) => {
            const errors = e?.response?.data?.errors;
            const firstErr = errors ? Object.values(errors).flat()[0] : null;
            setError((firstErr as string) || e?.response?.data?.message || t('common.error'));
        },
    });

    const canSubmit = clientName.trim().length > 0 && clientPhone.trim().length > 0 && carId !== '';

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { resetForm(); onClose(); }}
            title={t('bookings_ui.create_title')}
            subtitle={t('bookings_ui.create_subtitle')}
            icon={Plus}
            size="lg"
            primaryAction={{
                label: t('bookings_ui.create_btn'),
                onClick: () => createBooking.mutate(),
                loading: createBooking.isPending,
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
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_name')}</label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            maxLength={191}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_phone')}</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            maxLength={191}
                            placeholder="05xxxxxxxx"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_email')}</label>
                        <input
                            type="email"
                            dir="ltr"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            maxLength={191}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_car')}</label>
                        <select
                            value={carId}
                            onChange={(e) => {
                                const selectedId = e.target.value;
                                setCarId(selectedId);
                                const found = cars.find((c: any) => String(c.id) === selectedId);
                                if (found?.price && !totalPrice) {
                                    setTotalPrice(String(found.price));
                                }
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        >
                            <option value="">{t('bookings_ui.select_car')}</option>
                            {cars.map((car: any) => {
                                const label = isEn ? (car.name_translations?.en || car.name) : (car.name_translations?.ar || car.name);
                                return <option key={car.id} value={car.id}>{label} {car.year ? `(${car.year})` : ''}</option>;
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_type')}</label>
                        <select
                            value={bookingType}
                            onChange={(e) => setBookingType(e.target.value as 'purchase' | 'test_drive' | 'inquiry')}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        >
                            <option value="purchase">{t('bookings_ui.type_purchase')}</option>
                            <option value="test_drive">{t('bookings_ui.type_test_drive')}</option>
                            <option value="inquiry">{t('bookings_ui.type_inquiry')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_location')}</label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            maxLength={500}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_total_price')}</label>
                        <input
                            type="number"
                            min="0"
                            value={totalPrice}
                            onChange={(e) => setTotalPrice(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_down_payment')}</label>
                        <input
                            type="number"
                            min="0"
                            value={downPayment}
                            onChange={(e) => setDownPayment(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_duration_years')}</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={durationYears}
                            onChange={(e) => setDurationYears(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_monthly')}</label>
                        <input
                            type="number"
                            min="0"
                            value={monthlyInstallment}
                            onChange={(e) => setMonthlyInstallment(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('bookings_ui.field_notes')}</label>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                    />
                </div>
            </div>
        </Modal>
    );
};
