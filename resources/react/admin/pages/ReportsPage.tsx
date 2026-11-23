import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    Activity,
    LineChart,
    PieChart,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronLeft,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';

type PeriodType = 'month' | 'quarter' | 'year' | 'all';
type ReportTab = 'bookings' | 'sources' | 'monthly';

const getLocalized = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
                return String(parsed.ar || parsed.en || Object.values(parsed)[0] || '');
            }
        } catch {
            return val;
        }
        return val;
    }
    if (typeof val === 'object') {
        return String(val.ar || val.en || Object.values(val)[0] || '');
    }
    return String(val);
};

export const ReportsPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const activeTab: ReportTab = useMemo(() => {
        if (location.pathname.includes('/reports/sources')) return 'sources';
        if (location.pathname.includes('/reports/monthly')) return 'monthly';
        return 'bookings';
    }, [location.pathname]);

    const [period, setPeriod] = useState<PeriodType>('month');
    const [loading, setLoading] = useState(true);
    const [bookingReport, setBookingReport] = useState<any>(null);
    const [sourceReport, setSourceReport] = useState<any[]>([]);
    const [monthlyReport, setMonthlyReport] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchReports = async () => {
        setLoading(true);
        setErrorMsg(null);
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

            const [bookingRes, sourceRes, monthlyRes] = await Promise.allSettled([
                apiClient.get<any>('/api/v1/reports/bookings', { params }),
                apiClient.get<any>('/api/v1/reports/sources', { params }),
                apiClient.get<any>('/api/v1/reports/monthly'),
            ]);

            if (bookingRes.status === 'fulfilled') {
                const payload = bookingRes.value.data;
                setBookingReport(payload?.data || payload || null);
            }

            if (sourceRes.status === 'fulfilled') {
                const payload = sourceRes.value.data;
                const channels = payload?.data?.channels || payload?.channels || payload?.data || [];
                setSourceReport(Array.isArray(channels) ? channels : []);
            }

            if (monthlyRes.status === 'fulfilled') {
                const payload = monthlyRes.value.data;
                const months = payload?.data?.months || payload?.months || payload?.data || [];
                setMonthlyReport(Array.isArray(months) ? months : []);
            }
        } catch (err: any) {
            console.error('Failed to load reports', err);
            setErrorMsg('تعذر تحميل بعض البيانات الإحصائية، يرجى المحاولة مرة أخرى.');
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
                        تحليل الأداء المالي، معدل تحويل الحجوزات، وعائد الحملات الإعلانية ونمو المبيعات
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

            {/* Sub-Reports Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                    onClick={() => navigate('/admin/reports/bookings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'bookings'
                            ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                >
                    <DollarSign className="w-4 h-4" />
                    <span>تقرير الحجوزات والمبيعات</span>
                </button>

                <button
                    onClick={() => navigate('/admin/reports/sources')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'sources'
                            ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                >
                    <Target className="w-4 h-4" />
                    <span>عائد الحملات ومصادر العملاء</span>
                </button>

                <button
                    onClick={() => navigate('/admin/reports/monthly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'monthly'
                            ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>النمو السنوي والأداء الشهري</span>
                </button>
            </div>

            {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* TAB 1: Bookings & Financial Performance */}
            {activeTab === 'bookings' && (
                <div className="space-y-6">
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
                                                        {getLocalized(tc.car?.name) || `سيارة #${tc.car_id}`}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {getLocalized(tc.car?.brand?.name) || 'ماركة معتمدة'}
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
                                                        {getLocalized(emp.employee?.name) || `موظف #${emp.assigned_to}`}
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
                </div>
            )}

            {/* TAB 2: Marketing Attribution & Sources */}
            {activeTab === 'sources' && (
                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between border-b pb-3 mb-4">
                        <div>
                            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                                <Target className="h-5 w-5 text-[var(--tenant-primary)]" />
                                عائد الحملات الإعلانية وقنوات الاستقطاب (Marketing Attribution)
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                تتبع مصدر كل عميل محتمل ونسبة التحويل إلى حجز فعلي ومبيعات منجزة
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium text-xs border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-4 text-start">القناة / المنصة الإعلانية</th>
                                    <th className="py-3 px-4 text-center">العملاء المحتملين (Leads)</th>
                                    <th className="py-3 px-4 text-center">الحجوزات المبرمة</th>
                                    <th className="py-3 px-4 text-center">المبيعات المكتملة</th>
                                    <th className="py-3 px-4 text-center">العائد المحقق</th>
                                    <th className="py-3 px-4 text-center">نسبة التحويل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            جاري جلب إحصائيات القنوات...
                                        </td>
                                    </tr>
                                ) : sourceReport.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            لا توجد بيانات قنوات استقطاب مسجلة حتى الآن
                                        </td>
                                    </tr>
                                ) : (
                                    sourceReport.map((s, idx) => {
                                        const leads = Number(s.leads_count || 0);
                                        const bookings = Number(s.bookings_count || 0);
                                        const sold = Number(s.sold_count || 0);
                                        const rev = Number(s.revenue || 0);
                                        const conv = leads > 0 ? Math.round((bookings / leads) * 100) : (bookings > 0 ? 100 : 0);

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/70">
                                                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-[var(--tenant-primary)]"></span>
                                                    {getLocalized(s.channel || s.source) || 'مباشر (Direct / Organic)'}
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-700 font-medium">
                                                    {leads}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-slate-900">
                                                    {bookings}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-emerald-600">
                                                    {sold}
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-900 font-semibold">
                                                    {rev > 0 ? `${rev.toLocaleString()} ر.س` : '—'}
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
                                                        {conv}%
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
            )}

            {/* TAB 3: Monthly Growth (12 Months) */}
            {activeTab === 'monthly' && (
                <Card orientation="vertical" className="p-5">
                    <div className="flex items-center justify-between border-b pb-3 mb-4">
                        <div>
                            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                                <TrendingUp className="h-5 w-5 text-[var(--tenant-primary)]" />
                                تقرير النمو السنوي والأداء الشهري (آخر 12 شهراً)
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                تطور حجم الطلبات، والعملاء المحتملين، وإجمالي العمولات المحصلة شهرياً
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium text-xs border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-4 text-start">الشهر</th>
                                    <th className="py-3 px-4 text-center">العملاء المحتملين (Leads)</th>
                                    <th className="py-3 px-4 text-center">الحجوزات والطلبات</th>
                                    <th className="py-3 px-4 text-center">المبيعات المكتملة</th>
                                    <th className="py-3 px-4 text-center">إجمالي العمولات المحصلة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            جاري جلب إحصائيات الأشهر...
                                        </td>
                                    </tr>
                                ) : monthlyReport.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            لا توجد بيانات كافية مسجلة للأشهر السابقة
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyReport.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/70">
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {m.label || m.key}
                                            </td>
                                            <td className="py-3 px-4 text-center text-slate-700">
                                                {m.leads_count || 0}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-900">
                                                {m.bookings_count || 0}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-emerald-600">
                                                {m.sold_count || 0}
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-slate-900">
                                                {Number(m.revenue || 0) > 0 ? `${Number(m.revenue).toLocaleString()} ر.س` : '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};
