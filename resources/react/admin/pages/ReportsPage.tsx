import React, { useEffect, useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Users,
    Car,
    Calendar,
    Target,
    Layers,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';

export const ReportsPage: React.FC = () => {
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
    const [loading, setLoading] = useState(true);
    const [bookingReport, setBookingReport] = useState<any>(null);
    const [sourceReport, setSourceReport] = useState<any[]>([]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            let from = '';
            const now = new Date();
            if (period === 'month') {
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                from = d.toISOString().split('T')[0];
            } else if (period === 'quarter') {
                const d = new Date();
                d.setMonth(d.getMonth() - 3);
                from = d.toISOString().split('T')[0];
            } else if (period === 'year') {
                const d = new Date();
                d.setFullYear(d.getFullYear() - 1);
                from = d.toISOString().split('T')[0];
            }

            const params: Record<string, string> = {};
            if (from) {
                params.from = from;
                params.to = now.toISOString().split('T')[0];
            }

            const [bookingRes, sourceRes] = await Promise.all([
                apiClient.get<{ data: any }>('/api/v1/reports/bookings', { params }),
                apiClient.get<{ data: any[] }>('/api/v1/reports/sources'),
            ]);

            setBookingReport(bookingRes.data || null);
            setSourceReport(sourceRes.data || []);
        } catch (err) {
            console.error('Failed to load reports', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [period]);

    const financial = bookingReport?.financial || {
        total_bookings: 0,
        total_sold: 0,
        total_commission: 0,
        total_down_payment: 0,
        total_remaining: 0,
    };

    const conversionRate =
        financial.total_bookings > 0
            ? Math.round((financial.total_sold / financial.total_bookings) * 100)
            : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-[var(--tenant-primary)]" />
                        التقارير الإحصائية والتحليلات
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        تحليل الأداء المالي، معدل تحويل الطلبات، وعائد الحملات الإعلانية ومصادر العملاء
                    </p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setPeriod('month')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            period === 'month'
                                ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        آخر 30 يوم
                    </button>
                    <button
                        onClick={() => setPeriod('quarter')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            period === 'quarter'
                                ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        آخر 3 أشهر
                    </button>
                    <button
                        onClick={() => setPeriod('year')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            period === 'year'
                                ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        العام الحالي
                    </button>
                    <button
                        onClick={() => setPeriod('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            period === 'all'
                                ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        الكل
                    </button>
                    <Button variant="secondary" size="sm" onClick={fetchReports} title="تحديث البيانات">
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">إجمالي الحجوزات والطلبات</span>
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Target className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                        {loading ? '—' : financial.total_bookings}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                        المبيعات المنجزة:{' '}
                        <span className="font-semibold text-emerald-600">{financial.total_sold}</span>
                    </div>
                </Card>

                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">صافي العمولات المحصلة</span>
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                        {loading ? '—' : `${Number(financial.total_commission).toLocaleString()} ر.س`}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                        الدفوعات المقدمة: {Number(financial.total_down_payment).toLocaleString()} ر.س
                    </div>
                </Card>

                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">معدل الإغلاق والتحويل</span>
                        <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{loading ? '—' : `${conversionRate}%`}</div>
                    <div className="text-xs text-slate-500 mt-2">
                        {conversionRate >= 20 ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <ArrowUpRight className="h-3.5 w-3.5" /> أداء مبيعات استثنائي
                            </span>
                        ) : (
                            <span className="text-slate-400">معدل تحويل قياسي لقطاع التمويل</span>
                        )}
                    </div>
                </Card>

                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">متوسط القسط الشهري</span>
                        <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Layers className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                        {loading
                            ? '—'
                            : `${Math.round(bookingReport?.installments?.avg_monthly || 0).toLocaleString()} ر.س`}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                        متوسط المدة: {Math.round(bookingReport?.installments?.avg_duration || 0)} سنوات
                    </div>
                </Card>
            </div>

            {/* Split Section: Top Cars and Top Agents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Cars */}
                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between border-b pb-3 mb-4">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                            <Car className="h-5 w-5 text-[var(--tenant-primary)]" />
                            السيارات الأكثر طلباً ومبيعاً
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-8 text-slate-400 text-sm">جاري التحميل...</div>
                        ) : !bookingReport?.top_cars || bookingReport.top_cars.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">لا توجد بيانات كافية</div>
                        ) : (
                            bookingReport.top_cars.map((tc: any, index: number) => (
                                <div
                                    key={tc.car_id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 w-7 rounded-full bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] font-bold text-xs flex items-center justify-center">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">
                                                {tc.car?.name || `سيارة #${tc.car_id}`}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {tc.car?.brand?.name || 'ماركة معتمدة'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="text-xs font-semibold text-slate-800">
                                            {tc.total_bookings} طلب
                                        </div>
                                        <div className="text-[11px] text-emerald-600 font-bold">
                                            {tc.total_sold} منجزة
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Sales Consultants Performance */}
                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between border-b pb-3 mb-4">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                            <Users className="h-5 w-5 text-[var(--tenant-primary)]" />
                            إنتاجية مستشاري المبيعات
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-8 text-slate-400 text-sm">جاري التحميل...</div>
                        ) : !bookingReport?.employees || bookingReport.employees.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">لا توجد بيانات موظفين</div>
                        ) : (
                            bookingReport.employees.map((emp: any) => (
                                <div
                                    key={emp.assigned_to}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                                            {emp.employee?.name ? emp.employee.name.charAt(0) : 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">
                                                {emp.employee?.name || `موظف #${emp.assigned_to}`}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {emp.total_bookings} طلب معالج
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="text-xs font-bold text-emerald-600">
                                            {Number(emp.total_commission).toLocaleString()} ر.س عمولة
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {emp.total_sold} مبيعة مكتملة
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Marketing Attribution & Lead Channels */}
            <Card orientation="vertical" className="p-5">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div>
                        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                            <Target className="h-5 w-5 text-[var(--tenant-primary)]" />
                            عائد الحملات الإعلانية وقنوات الاستقطاب (Marketing Attribution)
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            تتبع مصدر كل عميل محتمل ونسبة التحويل إلى حجز فعلي
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-start text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium text-xs border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 text-start">القناة / المنصة الإعلانية</th>
                                <th className="py-3 px-4 text-center">العملاء المحتملين</th>
                                <th className="py-3 px-4 text-center">الحجوزات المبرمة</th>
                                <th className="py-3 px-4 text-center">نسبة التحويل</th>
                                <th className="py-3 px-4 text-center">مستوى الكفاءة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400">
                                        جاري جلب إحصائيات القنوات...
                                    </td>
                                </tr>
                            ) : sourceReport.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400">
                                        لا توجد بيانات قنوات استقطاب مسجلة حتى الآن
                                    </td>
                                </tr>
                            ) : (
                                sourceReport.map((s, idx) => {
                                    const conv = Number(s.conversion_rate || 0);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/70">
                                            <td className="py-3 px-4 font-semibold text-slate-900">
                                                {s.source || 'مباشر (Direct / Organic)'}
                                            </td>
                                            <td className="py-3 px-4 text-center text-slate-700">
                                                {s.leads_count || 0}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-900">
                                                {s.bookings_count || 0}
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-[var(--tenant-primary)]">
                                                {conv}%
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge
                                                    variant={
                                                        conv >= 20
                                                            ? 'success'
                                                            : conv >= 10
                                                            ? 'primary'
                                                            : 'neutral'
                                                    }
                                                >
                                                    {conv >= 20 ? 'ممتاز' : conv >= 10 ? 'جيد جداً' : 'متوسط'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
