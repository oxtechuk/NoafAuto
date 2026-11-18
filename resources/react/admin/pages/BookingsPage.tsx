import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Search, Phone, CalendarCheck, Check, X, Shield, Eye } from 'lucide-react';

export const BookingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    const { data: bookingsResponse, isLoading } = useQuery({
        queryKey: ['admin', 'bookings', { status: statusFilter, search, page }],
        queryFn: async () => {
            const params: any = { page };
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const res = await apiClient.get('/bookings', { params });
            return res.data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/bookings/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            setSelectedBooking(null);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/bookings/${id}/reject`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            setSelectedBooking(null);
        },
    });

    const bookings = bookingsResponse?.data || [];

    const getStatusBadgeVariant = (status: string) => {
        if (['sold', 'received', 'done'].includes(status)) return 'success';
        if (['approved', 'authorized'].includes(status)) return 'primary';
        if (['pending', 'bank_review', 'waiting_documents'].includes(status)) return 'warning';
        if (status.startsWith('lost_') || status === 'rejected') return 'danger';
        return 'slate';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">إدارة الحجوزات وطلبات التمويل</h1>
                    <p className="text-xs text-slate-500 mt-1">متابعة طلبات شراء وتقسيط السيارات وحالات البنوك</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                    {[
                        { label: 'الكل', val: '' },
                        { label: 'جديدة', val: 'new' },
                        { label: 'معلقة', val: 'pending' },
                        { label: 'دراسة بنكية', val: 'bank_review' },
                        { label: 'موافقة', val: 'approved' },
                        { label: 'مكتملة', val: 'received' },
                    ].map((tab) => (
                        <button
                            key={tab.val}
                            onClick={() => {
                                setStatusFilter(tab.val);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                statusFilter === tab.val
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="بحث بالعميل أو الجوال..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600"
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs">
                        <CalendarCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        لا توجد حجوزات تطابق هذا البحث.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4 text-start">رقم الطلب / العميل</th>
                                    <th className="py-3 px-4 text-start">السيارة</th>
                                    <th className="py-3 px-4 text-start">تفاصيل التمويل</th>
                                    <th className="py-3 px-4 text-start">الحالة</th>
                                    <th className="py-3 px-4 text-start">المسند إليه</th>
                                    <th className="py-3 px-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {bookings.map((booking: any) => (
                                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <p className="font-semibold text-slate-900">{booking.client_name}</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5" dir="ltr">
                                                {booking.client_phone}
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <p className="font-medium text-slate-800">
                                                {booking.car?.name || 'غير محدد'}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {booking.car?.brand || ''}
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4 space-y-0.5">
                                            <p className="font-semibold text-indigo-700">
                                                قسط: {(booking.financials?.monthly_installment || 0).toLocaleString()} ر.س
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                دفعة: {(booking.financials?.down_payment || 0).toLocaleString()} ر.س
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Badge variant={getStatusBadgeVariant(booking.status)}>
                                                {booking.status_label || booking.status}
                                            </Badge>
                                            {booking.proposed_status && (
                                                <p className="text-[10px] text-amber-600 font-medium mt-1">
                                                    بانتظار اعتماد: {booking.proposed_status_label}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600">
                                            {booking.assigned_to?.name || 'غير مسند'}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedBooking(booking)}
                                            >
                                                <Eye className="h-3.5 w-3.5 me-1" /> التفاصيل
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Details Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    طلب #{selectedBooking.id} - {selectedBooking.client_name}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">{selectedBooking.client_phone}</p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(selectedBooking.status)}>
                                {selectedBooking.status_label}
                            </Badge>
                        </div>

                        <div className="py-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">السيارة المطلوبة</span>
                                    <span className="font-semibold text-slate-800">{selectedBooking.car?.name || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">القسط الشهري</span>
                                    <span className="font-semibold text-indigo-700">
                                        {(selectedBooking.financials?.monthly_installment || 0).toLocaleString()} ر.س
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">الدفعة الأولى</span>
                                    <span className="font-semibold text-slate-800">
                                        {(selectedBooking.financials?.down_payment || 0).toLocaleString()} ر.س
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">العمولة الصافية</span>
                                    <span className="font-semibold text-emerald-700">
                                        {(selectedBooking.financials?.net_commission || 0).toLocaleString()} ر.س
                                    </span>
                                </div>
                            </div>

                            {selectedBooking.proposed_status && (
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                                    <p className="font-semibold">طلب إغلاق بانتظار موافقة المشرف:</p>
                                    <p className="text-[11px] mt-0.5">{selectedBooking.proposed_status_label}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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
