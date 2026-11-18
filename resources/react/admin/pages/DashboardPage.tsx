import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
    CalendarCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Coins,
    Users,
    AlertTriangle,
    ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['admin', 'dashboard', 'stats'],
        queryFn: async () => {
            const res = await apiClient.get('/dashboard/stats');
            return res.data?.data;
        },
    });

    const { data: alertsData, isLoading: alertsLoading } = useQuery({
        queryKey: ['admin', 'dashboard', 'alerts'],
        queryFn: async () => {
            const res = await apiClient.get('/dashboard/alerts');
            return res.data?.data;
        },
    });

    const bStats = statsData?.bookings || {};
    const tStats = statsData?.tasks || {};

    const kpiCards = [
        {
            label: 'إجمالي الحجوزات',
            value: bStats.total ?? 0,
            icon: CalendarCheck,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
        },
        {
            label: 'الطلبات النشطة',
            value: bStats.active ?? 0,
            icon: Clock,
            color: 'text-amber-600 bg-amber-50 border-amber-200/60',
        },
        {
            label: 'الطلبات المكتملة',
            value: bStats.completed ?? 0,
            icon: CheckCircle2,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
        },
        {
            label: 'الطلبات الملغية / المرفوضة',
            value: bStats.closed ?? 0,
            icon: XCircle,
            color: 'text-rose-600 bg-rose-50 border-rose-200/60',
        },
        {
            label: 'إجمالي العمولات المحققة',
            value: `${(bStats.total_commission ?? 0).toLocaleString()} ر.س`,
            icon: Coins,
            color: 'text-violet-600 bg-violet-50 border-violet-200/60',
        },
        {
            label: 'المهام المعلقة',
            value: tStats.today ?? 0,
            icon: Users,
            color: 'text-cyan-600 bg-cyan-50 border-cyan-200/60',
        },
    ];

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">مؤشرات الأداء الرئيسية (KPIs)</h1>
                    <p className="text-xs text-slate-500 mt-1">نظرة عامة ومباشرة على العمليات اليومية والمبيعات</p>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kpiCards.map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <div
                            key={idx}
                            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between"
                        >
                            <div>
                                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl border ${kpi.color}`}>
                                <Icon className="h-6 w-6" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Alerts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overdue tasks */}
                <Card
                    title="المهام المتأخرة التي تتطلب إجراء"
                    action={
                        <Link to="/admin/tasks" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1">
                            عرض كل المهام <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                >
                    {alertsData?.overdue_tasks?.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                            رائع! لا توجد مهام متأخرة حالياً.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {alertsData?.overdue_tasks?.map((task: any) => (
                                <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">{task.title}</p>
                                        <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                                            تاريخ الاستحقاق: {task.due_date}
                                        </p>
                                    </div>
                                    <Badge variant="danger">متأخرة</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Follow ups needed */}
                <Card
                    title="عملاء يحتاجون متابعة"
                    action={
                        <Link to="/admin/bookings" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1">
                            عرض كل الطلبات <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                >
                    {alertsData?.follow_ups_needed?.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                            جميع الحالات تمت متابعتها مؤخراً.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {alertsData?.follow_ups_needed?.map((b: any) => (
                                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">{b.client_name}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{b.client_phone}</p>
                                    </div>
                                    <Badge variant="warning">{b.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
