import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { StatusBadge } from '../../shared/components/ui/StatusBadge';
import { Button } from '../../shared/components/ui/Button';
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
} from 'lucide-react';

export interface BookingsPageProps {
    group?: 'active' | 'pending' | 'delivered' | 'closed';
}

export const BookingsPage: React.FC<BookingsPageProps> = ({ group: propGroup }) => {
    const queryClient = useQueryClient();
    const location = useLocation();

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
                    title: 'طلبات قيد الانتظار (Pending Bookings)',
                    subtitle: 'الطلبات المعلقة التي تتطلب متابعة وجدولة مواعيد مع العملاء لاستكمال الملف',
                    icon: Hourglass,
                    accentColor: 'text-amber-500',
                    tabs: [
                        { label: 'جميع المعلقات', val: '' },
                        { label: 'قيد الانتظار', val: 'pending' },
                        { label: 'إعادة تواصل', val: 'recontact_client' },
                        { label: 'انتظار مستندات', val: 'waiting_documents' },
                    ],
                };
            case 'delivered':
                return {
                    title: 'طلبات تم التسليم (Delivered Bookings)',
                    subtitle: 'الطلبات المكتملة التي تم تسليم سياراتها للعملاء وتحصيل عمولاتها بنجاح',
                    icon: CheckCircle2,
                    accentColor: 'text-emerald-500',
                    tabs: [
                        { label: 'الكل المستلم', val: '' },
                        { label: 'تم التسليم والمكتملة', val: 'received' },
                    ],
                };
            case 'closed':
                return {
                    title: 'طلبات الإغلاق والخسارة (Closed / Lost)',
                    subtitle: 'الطلبات المرفوضة والملغاة والمعتذر عنها مع بيان وتوثيق أسباب الإغلاق',
                    icon: FolderX,
                    accentColor: 'text-rose-500',
                    tabs: [
                        { label: 'جميع المغلقة', val: '' },
                        { label: 'مرفوض بنكياً', val: 'rejected' },
                        { label: 'ملغي من العميل', val: 'cancelled' },
                        { label: 'اعتذار وخسارة', val: 'closed_lost' },
                        { label: 'تعذر الوصول', val: 'unreachable' },
                    ],
                };
            case 'active':
            default:
                return {
                    title: 'الطلبات النشطة (Active Bookings)',
                    subtitle: 'متابعة طلبات الشراء وتقسيط السيارات الجارية في مسار المبيعات الفعّال',
                    icon: Zap,
                    accentColor: 'text-[var(--tenant-primary)]',
                    tabs: [
                        { label: 'الكل النشط', val: '' },
                        { label: 'طلبات جديدة', val: 'new' },
                        { label: 'تم التواصل - لا رد', val: 'contacted_no_answer' },
                        { label: 'انتظار مستندات', val: 'waiting_documents' },
                        { label: 'دراسة بنكية', val: 'bank_review' },
                        { label: 'موافقة مبدئية', val: 'approved' },
                        { label: 'تم التعميد', val: 'authorized' },
                    ],
                };
        }
    }, [effectiveGroup]);

    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    const { data: bookingsResponse, isLoading } = useQuery({
        queryKey: ['admin', 'bookings', { group: effectiveGroup, status: statusFilter, search, page }],
        queryFn: async () => {
            const params: any = { page, group: effectiveGroup };
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const res = await apiClient.get('/api/v1/bookings', { params });
            return res.data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/api/v1/bookings/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            setSelectedBooking(null);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/api/v1/bookings/${id}/reject`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            setSelectedBooking(null);
        },
    });

    const bookings = bookingsResponse?.data || [];
    const meta = bookingsResponse?.meta || {};
    const Icon = groupMeta.icon;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                        <Icon className={`h-5 w-5 ${groupMeta.accentColor}`} />
                        <span>{groupMeta.title}</span>
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{groupMeta.subtitle}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
                    {groupMeta.tabs.map((tab) => (
                        <button
                            key={tab.val}
                            onClick={() => {
                                setStatusFilter(tab.val);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold whitespace-nowrap transition-colors ${
                                statusFilter === tab.val
                                    ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="بحث بالعميل أو الجوال..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                    />
                </div>
            </div>

            {/* Bookings Table */}
            <Card className="p-0 overflow-hidden" padding="none">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-16 text-[var(--text-muted)] text-xs">
                        <CalendarCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <span>لا توجد طلبات مطابقة في هذا التصنيف.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                            <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-default)]">
                                <tr>
                                    <th className="py-3 px-4 text-start">رقم الطلب / العميل</th>
                                    <th className="py-3 px-4 text-start">السيارة المطلوبة</th>
                                    <th className="py-3 px-4 text-start">تفاصيل التمويل</th>
                                    <th className="py-3 px-4 text-start">الحالة</th>
                                    <th className="py-3 px-4 text-start">المسند إليه</th>
                                    <th className="py-3 px-4 text-start">تاريخ الإنشاء</th>
                                    <th className="py-3 px-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                                {bookings.map((booking: any) => (
                                    <tr key={booking.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--text-muted)]">
                                                    <User className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[var(--text-primary)]">
                                                        #{booking.id} - {booking.client_name}
                                                    </p>
                                                    <p className="text-[11px] text-[var(--text-muted)]" dir="ltr">
                                                        {booking.client_phone}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <p className="font-medium text-[var(--text-primary)]">
                                                {booking.car?.name || 'غير محدد'}
                                            </p>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                {booking.car?.brand || ''}
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4 space-y-0.5">
                                            <p className="font-semibold text-[var(--text-primary)]">
                                                قسط: {(booking.financials?.monthly_installment || 0).toLocaleString()} ر.س
                                            </p>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                دفعة: {(booking.financials?.down_payment || 0).toLocaleString()} ر.س
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <StatusBadge
                                                status={booking.status}
                                                label={booking.status_label || booking.status}
                                            />
                                            {booking.proposed_status && (
                                                <p className="text-[10px] text-[var(--status-warning)] font-medium mt-1">
                                                    بانتظار اعتماد: {booking.proposed_status_label}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                                            {booking.assigned_to?.name || 'غير مسند'}
                                        </td>
                                        <td className="py-3.5 px-4 text-[11px] text-[var(--text-muted)]">
                                            {booking.created_at ? new Date(booking.created_at).toLocaleDateString('ar-SA') : '-'}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedBooking(booking)}
                                                className="text-xs gap-1"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>التفاصيل</span>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {meta?.last_page > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
                        <span>
                            صفحة {meta.current_page} من {meta.last_page} (إجمالي {meta.total} طلب)
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={meta.current_page <= 1}
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            >
                                السابق
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={meta.current_page >= meta.last_page}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                التالي
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Details Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-[var(--surface-primary)] rounded-[var(--radius-xl)] max-w-lg w-full p-6 shadow-xl border border-[var(--border-default)]">
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
                            <div>
                                <h2 className="text-base font-bold text-[var(--text-primary)]">
                                    طلب #{selectedBooking.id} - {selectedBooking.client_name}
                                </h2>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedBooking.client_phone}</p>
                            </div>
                            <StatusBadge
                                status={selectedBooking.status}
                                label={selectedBooking.status_label || selectedBooking.status}
                            />
                        </div>

                        <div className="py-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2 bg-[var(--surface-secondary)] p-3 rounded-[var(--radius-md)] border border-[var(--border-default)]">
                                <div>
                                    <span className="text-[var(--text-muted)] block text-[11px]">السيارة المطلوبة</span>
                                    <span className="font-semibold text-[var(--text-primary)]">{selectedBooking.car?.name || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-[var(--text-muted)] block text-[11px]">الماركة</span>
                                    <span className="font-semibold text-[var(--text-primary)]">{selectedBooking.car?.brand || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-[var(--text-muted)] block text-[11px]">القسط الشهري</span>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        {(selectedBooking.financials?.monthly_installment || 0).toLocaleString()} ر.س
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[var(--text-muted)] block text-[11px]">الدفعة الأولى</span>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        {(selectedBooking.financials?.down_payment || 0).toLocaleString()} ر.س
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[var(--text-muted)] block text-[11px]">العمولة الصافية</span>
                                    <span className="font-semibold text-[var(--status-success)]">
                                        {(selectedBooking.financials?.net_commission || 0).toLocaleString()} ر.س
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[var(--text-muted)] block text-[11px]">المسند إليه</span>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        {selectedBooking.assigned_to?.name || 'غير مسند'}
                                    </span>
                                </div>
                            </div>

                            {selectedBooking.proposed_status && (
                                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-warning-bg)] border border-[var(--status-warning)]/20 text-[var(--status-warning)]">
                                    <p className="font-semibold">طلب إغلاق بانتظار موافقة المشرف:</p>
                                    <p className="text-[11px] mt-0.5">{selectedBooking.proposed_status_label}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                            <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                                إغلاق
                            </Button>

                            {selectedBooking.proposed_status && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        loading={rejectMutation.isPending}
                                        onClick={() => rejectMutation.mutate(selectedBooking.id)}
                                    >
                                        <X className="h-3.5 w-3.5 me-1" /> رفض الإغلاق
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        loading={approveMutation.isPending}
                                        onClick={() => approveMutation.mutate(selectedBooking.id)}
                                    >
                                        <Check className="h-3.5 w-3.5 me-1" /> اعتماد الإغلاق
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
