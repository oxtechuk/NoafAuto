import React, { useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// Format relative date helper in Arabic
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

        if (diffSecs < 60) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays === 1) return 'أمس';
        if (diffDays === 2) return 'منذ يومين';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        if (diffWeeks === 1) return 'منذ أسبوع';
        if (diffWeeks === 2) return 'منذ أسبوعين';
        if (diffWeeks <= 4) return `منذ ${diffWeeks} أسابيع`;
        return d.toLocaleDateString('ar-SA');
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
    if (raw.includes('meta') || raw.includes('facebook') || raw.includes('instagram') || raw.includes('fb') || raw.includes('ig')) {
        return {
            label: 'ميتا (Meta)',
            icon: Camera,
            className: 'bg-pink-50 text-pink-600 border border-pink-200',
        };
    }
    if (raw.includes('snap')) {
        return {
            label: 'سناب شات',
            icon: Sparkles,
            className: 'bg-amber-50 text-amber-700 border border-amber-200',
        };
    }
    if (raw.includes('tiktok')) {
        return {
            label: 'تيك توك',
            icon: Sparkles,
            className: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
        };
    }
    if (raw.includes('google')) {
        return {
            label: 'جوجل',
            icon: Globe,
            className: 'bg-blue-50 text-blue-600 border border-blue-200',
        };
    }
    return {
        label: 'مباشر',
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
            return val.ar || val.en || '';
        }
        const vals = Object.values(val);
        return vals.length > 0 && typeof vals[0] === 'string' ? (vals[0] as string) : '';
    }
    return String(val);
}

export const BookingsPage: React.FC<BookingsPageProps> = ({ group: propGroup }) => {
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
                    title: 'طلبات قيد الانتظار',
                    badge: 'طلبات معلقة',
                    tabs: [
                        { label: 'جميع المعلقات', val: '' },
                        { label: 'قيد الانتظار', val: 'pending' },
                        { label: 'إعادة تواصل', val: 'recontact_client' },
                        { label: 'انتظار مستندات', val: 'waiting_documents' },
                    ],
                };
            case 'delivered':
                return {
                    title: 'طلبات تم التسليم',
                    badge: 'تم التسليم',
                    tabs: [
                        { label: 'الكل المستلم', val: '' },
                        { label: 'تم التسليم والمكتملة', val: 'received' },
                    ],
                };
            case 'closed':
                return {
                    title: 'طلبات الإغلاق والخسارة',
                    badge: 'طلبات مغلقة',
                    tabs: [
                        { label: 'جميع المغلقة', val: '' },
                        { label: 'مرفوض بنكياً', val: 'lost_rejected_simah' },
                        { label: 'ملغي من العميل', val: 'lost_client_cancelled' },
                        { label: 'عدم الرد', val: 'lost_no_answer' },
                    ],
                };
            case 'active':
            default:
                return {
                    title: 'طلبات السيارات ',
                    tabs: [
                        { label: 'جميع الحالات', val: '' },
                        { label: 'طلبات جديدة', val: 'new' },
                        { label: 'انتظار إرسال المستندات', val: 'waiting_documents' },
                        { label: 'إعادة التواصل مع العميل', val: 'recontact_client' },
                        { label: 'تحت الدراسة البنكية', val: 'bank_review' },
                        { label: 'تمت الموافقة', val: 'approved' },
                        { label: 'التعميد تم', val: 'authorized' },
                    ],
                };
        }
    }, [effectiveGroup]);

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
            title: `تأكيد حذف الطلب #${bookingId}`,
            message: 'هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً من النظام؟',
            detail: 'تنبيه: سيتم مسح بيانات الطلب والملاحظات والمستندات المرفقة ولا يمكن استرجاعها.',
            confirmText: 'نعم، حذف الطلب',
            cancelText: 'إلغاء الأمر',
            variant: 'danger',
            icon: Trash2,
        });
        if (confirmed) {
            deleteMutation.mutate(bookingId);
        }
    };

    // Upload document mutation
    const uploadDocMutation = useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
            apiClient.post(`/api/v1/bookings/${id}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            alert('تم رفع المستند بنجاح');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'فشل رفع المستند');
        },
    });

    const bookings = bookingsResponse?.data || [];
    const meta = bookingsResponse?.meta || {};

    // When details modal opens, initialize inputs
    const handleOpenDetails = (booking: any) => {
        setSelectedBooking(booking);
        setSelectedStatusInput(booking.status || '');
        setSelectedEmployeeId(booking.assigned_to?.id || '');
        setDetailsTab('info');
    };

    // Open client card modal
    const handleOpenClientCard = (clientInfo: { name: string; phone: string; booking?: any }) => {
        setClientCardData(clientInfo);
    };

    // Handle document upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBooking) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        uploadDocMutation.mutate({ id: selectedBooking.id, formData });
        e.target.value = '';
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
                            <span>التوزيع التلقائي: {isAutoAssignEnabled ? 'مفعل (آلي)' : 'معطل (يدوي)'}</span>
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
                            title="عرض البطاقات المفصلة"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>عرض البطاقات</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewModeChange('table')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white text-slate-800 shadow-xs font-bold text-[var(--tenant-primary,#1877F2)]'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="جدول عملي وسريع للتعامل مع أكثر من 500 طلب يومياً"
                        >
                            <TableIcon className="h-3.5 w-3.5" />
                            <span>جدول عملي (500+ طلب)</span>
                        </button>
                    </div>

                    {/* Per-Page Selector */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>عرض:</span>
                        <select
                            value={perPage}
                            onChange={(e) => handlePerPageChange(Number(e.target.value))}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-semibold focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)] cursor-pointer"
                        >
                            <option value={20}>20 طلب</option>
                            <option value={50}>50 طلب</option>
                            <option value={100}>100 طلب</option>
                        </select>
                    </div>

                    <div className="text-xs font-semibold text-slate-500">
                        إجمالي المعروض: <span className="text-slate-800 font-bold">{meta?.total ?? bookings.length}</span>
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
                        placeholder="بحث بالعميل أو الجوال..."
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
                    <span>لا توجد طلبات مطابقة في هذا التصنيف.</span>
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
                                    <th className="py-3 px-3 text-start min-w-[210px]">العميل والتواصل</th>
                                    <th className="py-3 px-3 text-start min-w-[170px]">السيارة والموديل</th>
                                    <th className="py-3 px-3 text-start min-w-[120px]">القناة</th>
                                    <th className="py-3 px-3 text-start min-w-[140px]">التواريخ</th>
                                    <th className="py-3 px-3 text-start min-w-[130px]">الموظف المسند</th>
                                    <th className="py-3 px-3 text-start min-w-[150px]">حالة الطلب</th>
                                    <th className="py-3 px-3 text-center min-w-[110px]">إجراءات</th>
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
                                                <div>انشاء: <span className="font-semibold text-slate-700">{formatRelativeArabic(booking.created_at)}</span></div>
                                                <div className="text-slate-400">تعديل: {formatRelativeArabic(booking.updated_at)}</div>
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
                                                        title="اضغط لتغيير الموظف المسند مباشرة من الجدول"
                                                    >
                                                        <option value="">-- غير مسند --</option>
                                                        {salesTeamOptions.map((emp: any) => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.name} {emp.role === 'admin' ? '(مدير)' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="font-semibold text-slate-700 max-w-[120px] truncate block" title={staffName || 'غير مسند'}>
                                                        {staffName || <span className="text-slate-400 font-normal">غير مسند</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadgeClass}`}>
                                                    {formatLocaleString(booking.status_label || booking.status)}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetails(booking)}
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-[var(--tenant-primary,#1877F2)] hover:border-[var(--tenant-primary,#1877F2)] hover:bg-slate-50 transition-colors cursor-pointer"
                                                        title="عرض التفاصيل الكاملة"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetails(booking)}
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer"
                                                        title="تعديل"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteBooking(booking.id)}
                                                        className="p-1.5 rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="حذف"
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
                        const staffName = formatLocaleString(booking.assigned_to?.name || 'غير مسند');
                        const statusLabel = formatLocaleString(booking.status_label || booking.status);

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
                                        <span className="text-slate-500 font-medium">انشاء : </span>
                                        <span className="text-slate-700 font-semibold">{formatRelativeArabic(booking.created_at)}</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-slate-500 font-medium">التعديل : </span>
                                        <span className="text-slate-700 font-semibold">{formatRelativeArabic(booking.updated_at)}</span>
                                    </div>
                                    <div className="truncate flex items-center gap-1">
                                        <span className="text-slate-500 font-medium shrink-0">الموظف : </span>
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
                                                title="اضغط لتغيير الموظف المسند مباشرة من البطاقة"
                                            >
                                                <option value="">-- غير مسند --</option>
                                                {salesTeamOptions.map((emp: any) => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name} {emp.role === 'admin' ? '(مدير)' : ''}
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
                                        <span className="text-slate-500 font-medium">حالة الطلب : </span>
                                        <span className="font-bold text-slate-800">{statusLabel}</span>
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
                                        <span>الحالة: {selectedBooking.status_label || selectedBooking.status}</span>
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
                                        <span>تواصل عبر واتساب</span>
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedBooking(null)}
                                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                                >
                                    <span>← العودة للطلبات</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                >
                                    <Printer className="h-4 w-4" />
                                    <span>طباعة تفاصيل الطلب</span>
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
                                بيانات الطلب
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
                                تفاصيل العرض
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
                                سجل تغير الحالات ({selectedBooking.history?.length || 1})
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
                                التعليقات ({selectedBooking.history?.length || 0})
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
                                المهام (0)
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
                                                <span>بيانات العميل والتواصل</span>
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
                                                    <span>فتح كرت العميل</span>
                                                </button>
                                            </h3>

                                            <div className="divide-y divide-slate-100 text-xs">
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">اسم العميل</span>
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
                                                    <span className="text-slate-500 font-medium">جوال العميل</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-slate-800" dir="ltr">{selectedBooking.client_phone}</span>
                                                        <a
                                                            href={`https://wa.me/${selectedBooking.client_phone?.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1"
                                                        >
                                                            <WhatsAppIcon className="h-3 w-3" />
                                                            <span>واتساب</span>
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">البريد الإلكتروني</span>
                                                    <span className="text-slate-700">{selectedBooking.client_email || '—'}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">رقم الطلب</span>
                                                    <span className="font-bold text-slate-800">#{selectedBooking.id}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">تاريخ إنشاء الطلب</span>
                                                    <span className="text-slate-700">{formatExactArabic(selectedBooking.created_at)}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">نوع الطلب</span>
                                                    <span className="font-semibold text-slate-800">
                                                        {selectedBooking.booking_type === 'test_drive' ? 'تجربة قيادة' : (selectedBooking.booking_type === 'inquiry' ? 'استفسار' : 'شراء')}
                                                    </span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">الموقع الجغرافي</span>
                                                    <span className="text-slate-700">{selectedBooking.location || 'مكة المكرمة'}</span>
                                                </div>
                                                <div className="py-2 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">حالة الطلب الحالية</span>
                                                    <span className="font-bold text-[var(--tenant-primary,#1877F2)]">
                                                        * {selectedBooking.status_label || selectedBooking.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Green Box: Financial & Credit details (Matching Screenshot 2) */}
                                            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs space-y-3">
                                                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 font-bold text-emerald-900">
                                                    <span>تفاصيل الحالة المالية والائتمانية والبنك المفضل</span>
                                                    <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                                        وجهة التمويل: {selectedBooking.bank_name || 'مصرف الراجحي'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-700 text-[11px]">
                                                    <div>
                                                        <span className="text-slate-500">الراتب الشهري: </span>
                                                        <span className="font-bold text-slate-900">
                                                            {(selectedBooking.calculator_details?.salary || 9000).toLocaleString()} ريال
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">الالتزامات الشهرية: </span>
                                                        <span className="font-bold text-slate-900">
                                                            {(selectedBooking.calculator_details?.commitments || 0).toLocaleString()} ريال
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">جهة العمل: </span>
                                                        <span className="font-semibold text-slate-800">
                                                            {selectedBooking.calculator_details?.work_sector || 'قطاع خاص'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">مدة الخدمة: </span>
                                                        <span className="font-semibold text-slate-800">
                                                            {selectedBooking.calculator_details?.service_period || '3 سنة'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">مدعوم سكنيا: </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.housing_support ? 'نعم' : 'لا'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">تمويل عقاري: </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.has_mortgage ? 'نعم' : 'لا'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">متعثر في سمة: </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.has_simah_issues ? 'نعم' : 'لا'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">مخالفات مرورية: </span>
                                                        <span className="font-semibold">{selectedBooking.calculator_details?.traffic_violations ? 'نعم' : 'لا'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">مدة التمويل: </span>
                                                        <span className="font-semibold">{(selectedBooking.financials?.duration_years || 5) * 12} شهر</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">الخصم المحسوم: </span>
                                                        <span className="font-bold text-emerald-700">
                                                            {(selectedBooking.financials?.monthly_installment || 1230).toLocaleString()} ريال
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="text-slate-500">اللون المفضل للسيارة: </span>
                                                        <span className="font-semibold text-slate-800">{selectedBooking.notes?.color || 'أبيض'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Employee Assignment Box */}
                                            {isAdmin ? (
                                                <div className="pt-2 border-t border-slate-100 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                                            <span>إسناد / تحويل الطلب لفريق المبيعات (خاص بالأدمن)</span>
                                                        </label>
                                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            صلاحية مدير
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        الموظف المسؤول الحالي: <span className="font-bold text-slate-800">{selectedBooking.assigned_to?.name || 'غير مسند'}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <select
                                                            value={selectedEmployeeId}
                                                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                                        >
                                                            <option value="">-- اختر موظف من فريق المبيعات (Sales) --</option>
                                                            {salesTeamOptions.map((emp: any) => (
                                                                <option key={emp.id} value={emp.id}>
                                                                    {emp.name} {emp.role === 'admin' ? '(مدير)' : '(مبيعات)'}
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
                                                                {assignEmployeeMutation.isPending ? 'جاري...' : 'تحويل'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={autoAssignBookingMutation.isPending}
                                                                onClick={() => autoAssignBookingMutation.mutate(selectedBooking.id)}
                                                                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                                                                title="توزيع هذا الطلب آلياً على موظف المبيعات التالي بالدوران (Round-Robin)"
                                                            >
                                                                <Zap className="h-3.5 w-3.5 fill-white" />
                                                                <span>{autoAssignBookingMutation.isPending ? 'توزيع...' : 'توزيع تلقائي'}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-slate-100 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                        <span>الموظف المسؤول: <strong className="text-slate-800">{selectedBooking.assigned_to?.name || 'غير مسند'}</strong></span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded font-medium">
                                                        تحويل الطلبات متاح للمدير (الأدمن) فقط
                                                    </span>
                                                </div>
                                            )}

                                            {/* Status Change Box */}
                                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                                <label className="block text-xs font-bold text-slate-800">تغيير حالة الطلب</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedStatusInput}
                                                        onChange={(e) => setSelectedStatusInput(e.target.value)}
                                                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                                    >
                                                        <option value="new">جديد</option>
                                                        <option value="waiting_documents">انتظار إرسال المستندات</option>
                                                        <option value="recontact_client">إعادة التواصل مع العميل</option>
                                                        <option value="contacted_no_answer">تم الاتصال ولم يتم الرد</option>
                                                        <option value="bank_review">تحت الدراسة البنكية</option>
                                                        <option value="approved">تمت الموافقة</option>
                                                        <option value="authorized">التعميد تم</option>
                                                        <option value="received">تم الاستلام</option>
                                                        <option value="pending">قيد الانتظار</option>
                                                        <option value="lost_no_answer">مغلق - لم يتم الرد</option>
                                                        <option value="lost_client_cancelled">مغلق - ملغي من العميل</option>
                                                        <option value="lost_rejected_simah">مغلق - مرفوض سمة</option>
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
                                                        {updateStatusMutation.isPending ? 'جاري...' : 'حفظ'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Left Column: Vehicle Details & Financing Target */}
                                        <div className="space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                                            <h3 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
                                                بيانات السيارة وجهة التمويل
                                            </h3>

                                            <div className="divide-y divide-slate-100 text-xs">
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">كود السيارة</span>
                                                    <span className="font-mono font-bold text-slate-800">
                                                        {selectedBooking.car?.id || '110027'}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">الماركة</span>
                                                    <span className="font-bold text-slate-800">{selectedBooking.car?.brand || 'جيلي'}</span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">الموديل</span>
                                                    <span className="font-bold text-slate-800">
                                                        {selectedBooking.car?.model || selectedBooking.car?.name || 'جيلي امجراند 2026 GK'}
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">سنة الصنع</span>
                                                    <span className="font-mono text-slate-800">{selectedBooking.car?.year || '2026'}</span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">نوع الهيكل</span>
                                                    <span className="text-slate-700">{selectedBooking.car?.type || 'سيدان'}</span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between bg-amber-50/50 -mx-5 px-5 rounded">
                                                    <span className="text-slate-700 font-bold">سعر السيارة النقدي</span>
                                                    <span className="font-bold text-base text-amber-600">
                                                        {(selectedBooking.car?.cash_price || selectedBooking.financials?.total_price || 67900).toLocaleString()} ريال
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">القسط الشهري التقديري</span>
                                                    <span className="font-bold text-slate-800">
                                                        {(selectedBooking.financials?.monthly_installment || 0).toLocaleString()} ريال
                                                    </span>
                                                </div>
                                                <div className="py-2.5 flex items-center justify-between">
                                                    <span className="text-slate-500 font-medium">الدفعة الأولى المقترحة</span>
                                                    <span className="font-bold text-slate-800">
                                                        {(selectedBooking.financials?.down_payment || 0).toLocaleString()} ريال
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Section: Attached Documents (Matching Screenshot 2) */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-sm text-slate-800">المستندات المرفقة</h3>
                                            <div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>رفع مستند جديد</span>
                                                </button>
                                            </div>
                                        </div>

                                        {selectedBooking.documents && selectedBooking.documents.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {selectedBooking.documents.map((doc: any) => (
                                                    <div key={doc.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between bg-slate-50">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                                                            <span className="text-xs text-slate-700 truncate">{doc.title}</span>
                                                        </div>
                                                        <a
                                                            href={`/api/v1/bookings/${selectedBooking.id}/documents/${doc.id}/download`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1 hover:text-emerald-600"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 text-slate-400 text-xs">
                                                <FolderX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                <span>لا توجد مستندات مرفقة بهذا الطلب حالياً</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Financial Offer Details */}
                            {detailsTab === 'offer' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                    <h3 className="font-bold text-sm text-slate-800 pb-2 border-b">تفاصيل العرض المالي والعمولة</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                        <div className="p-3 bg-slate-50 rounded-lg border">
                                            <span className="text-slate-500 block">سعر الشراء</span>
                                            <span className="font-bold text-sm text-slate-800">
                                                {(selectedBooking.financials?.purchase_price || 0).toLocaleString()} ر.س
                                            </span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg border">
                                            <span className="text-slate-500 block">سعر التعميد</span>
                                            <span className="font-bold text-sm text-slate-800">
                                                {(selectedBooking.financials?.authorization_price || 0).toLocaleString()} ر.س
                                            </span>
                                        </div>
                                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <span className="text-emerald-700 block font-medium">صافي العمولة</span>
                                            <span className="font-bold text-sm text-emerald-700">
                                                {(selectedBooking.financials?.net_commission || 0).toLocaleString()} ر.س
                                            </span>
                                        </div>
                                    </div>
                                    {selectedBooking.offer_notes && (
                                        <div className="p-3 bg-slate-50 rounded-lg border text-xs">
                                            <span className="font-bold text-slate-700 block mb-1">ملاحظات العرض:</span>
                                            <p className="text-slate-600">{selectedBooking.offer_notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: History Timeline */}
                            {detailsTab === 'history' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                    <h3 className="font-bold text-sm text-slate-800 pb-2 border-b">سجل التغييرات وحالات الطلب</h3>
                                    <div className="space-y-3">
                                        <div className="flex gap-3 text-xs items-start">
                                            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                1
                                            </div>
                                            <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between font-bold text-slate-800">
                                                    <span>الحالة: {selectedBooking.status_label || selectedBooking.status}</span>
                                                    <span className="text-[11px] text-slate-400 font-normal">
                                                        {formatExactArabic(selectedBooking.updated_at || selectedBooking.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 mt-1">بواسطة: {selectedBooking.assigned_to?.name || 'النظام'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Comments & Notes */}
                            {detailsTab === 'comments' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                                    <h3 className="font-bold text-sm text-slate-800 pb-2 border-b">التعليقات والملاحظات الداخلية</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="أضف ملاحظة أو تعليق جديد..."
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
                                            <span>إرسال</span>
                                        </button>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        {selectedBooking.history && selectedBooking.history.length > 0 ? (
                                            selectedBooking.history.map((n: any, idx: number) => (
                                                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                                    <div className="flex items-center justify-between text-slate-500 mb-1">
                                                        <span className="font-bold text-slate-800">{n.employee || 'موظف'}</span>
                                                        <span className="text-[11px]">{formatRelativeArabic(n.created_at)}</span>
                                                    </div>
                                                    <p className="text-slate-700">{n.note}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-xs">لا توجد ملاحظات مسجلة بعد.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 5: Tasks */}
                            {detailsTab === 'tasks' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-center py-12 text-slate-400 text-xs">
                                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <span>لا توجد مهام معلقة مرتبطة بهذا الطلب.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================== */}
            {/* 5. CLIENT CARD MODAL (كرت العميل)                           */}
            {/* ========================================================== */}
            <Modal
                isOpen={Boolean(clientCardData)}
                onClose={() => setClientCardData(null)}
                size="lg"
                title={clientCardData?.name || 'بيانات العميل'}
                subtitle={clientCardData?.phone ? `رقم الجوال: ${clientCardData.phone}` : 'ملف العميل المعتمد بالمنصة'}
                icon={User}
                iconVariant="primary"
                badge={
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        عميل معتمد
                    </span>
                }
                secondaryAction={{
                    label: 'إغلاق',
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
                                        <span>واتساب مباشر</span>
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
        </div>
    );
};
