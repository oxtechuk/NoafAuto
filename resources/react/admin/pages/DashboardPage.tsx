import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { StatCard } from '../../shared/components/ui/StatCard';
import { StatusBadge } from '../../shared/components/ui/StatusBadge';
import {
    CalendarCheck,
    Clock,
    CheckCircle2,
    XCircle,
    Coins,
    Users,
    ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
    const { t } = useTranslation('admin');
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
            label: t('dashboard.total_bookings'),
            value: bStats.total ?? 0,
            icon: <CalendarCheck className="h-6 w-6" />,
        },
        {
            label: t('dashboard.active_requests'),
            value: bStats.active ?? 0,
            icon: <Clock className="h-6 w-6" />,
        },
        {
            label: t('dashboard.completed_requests'),
            value: bStats.completed ?? 0,
            icon: <CheckCircle2 className="h-6 w-6 text-[var(--status-success)]" />,
        },
        {
            label: t('dashboard.closed_requests'),
            value: bStats.closed ?? 0,
            icon: <XCircle className="h-6 w-6 text-[var(--status-danger)]" />,
        },
        {
            label: t('dashboard.total_commission'),
            value: `${(bStats.total_commission ?? 0).toLocaleString()} ${t('common.sar')}`,
            icon: <Coins className="h-6 w-6" />,
        },
        {
            label: t('dashboard.pending_tasks'),
            value: tStats.today ?? 0,
            icon: <Users className="h-6 w-6" />,
        },
    ];

    if (statsLoading || alertsLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('dashboard.title')}</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{t('dashboard.subtitle')}</p>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kpiCards.map((kpi, idx) => (
                    <StatCard
                        key={idx}
                        label={kpi.label}
                        value={kpi.value}
                        icon={kpi.icon}
                    />
                ))}
            </div>

            {/* Alerts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overdue tasks */}
                <Card
                    title={t('dashboard.overdue_tasks')}
                    action={
                        <Link to="/admin/tasks" className="text-xs text-[var(--tenant-primary)] hover:opacity-80 font-medium inline-flex items-center gap-1">
                            {t('dashboard.view_all_tasks')} <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                >
                    {alertsData?.overdue_tasks?.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)] text-xs">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[var(--status-success)] opacity-80" />
                            {t('dashboard.no_overdue_tasks')}
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-default)]">
                            {alertsData?.overdue_tasks?.map((task: any) => (
                                <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{task.title}</p>
                                        <p className="text-[11px] text-[var(--status-danger)] font-medium mt-0.5">
                                            {t('dashboard.due_date')} {task.due_date}
                                        </p>
                                    </div>
                                    <StatusBadge status="rejected" label={t('dashboard.overdue_badge')} />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Follow ups needed */}
                <Card
                    title={t('dashboard.follow_ups_needed')}
                    action={
                        <Link to="/admin/bookings" className="text-xs text-[var(--tenant-primary)] hover:opacity-80 font-medium inline-flex items-center gap-1">
                            {t('dashboard.view_all_bookings')} <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    }
                >
                    {alertsData?.follow_ups_needed?.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)] text-xs">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[var(--status-success)] opacity-80" />
                            {t('dashboard.all_followed_up')}
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-default)]">
                            {alertsData?.follow_ups_needed?.map((b: any) => (
                                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{b.client_name}</p>
                                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{b.client_phone}</p>
                                    </div>
                                    <StatusBadge status={b.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
