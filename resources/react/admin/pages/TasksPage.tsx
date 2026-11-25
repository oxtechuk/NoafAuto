import React, { useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { StatusBadge } from '../../shared/components/ui/StatusBadge';
import { Input } from '../../shared/components/ui/Input';
import { CheckCircle, RefreshCw, Plus, Clock, Search, Calendar, User, Trash2, Lock } from 'lucide-react';

export const TasksPage: React.FC = () => {
    const { t } = useTranslation('admin');
    const { user, hasRole } = useAuth();
    const isAdmin = user?.role === 'admin' || hasRole('admin');
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const [viewFilter, setViewFilter] = useState<'today' | 'month' | 'all'>(() => {
        const v = searchParams.get('view');
        if (v === 'today' || v === 'month' || v === 'all') return v;
        return 'today';
    });
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newPriority, setNewPriority] = useState('medium');
    const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [newAssignedTo, setNewAssignedTo] = useState<string>('');

    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const maxMonthStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
    }, []);

    const debouncedSearch = useDebouncedValue(search.trim());
    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['admin', 'tasks', { view: viewFilter, status: statusFilter, from: dateFrom, to: dateTo, search: debouncedSearch }],
        queryFn: async () => {
            const params: Record<string, any> = { per_page: 100 };
            if (viewFilter !== 'all' && !dateFrom && !dateTo) params.view = viewFilter;
            if (statusFilter) params.status = statusFilter;
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            if (debouncedSearch) params.search = debouncedSearch;
            const res = await apiClient.get('/tasks', { params });
            return res.data?.data ?? [];
        },
        placeholderData: keepPreviousData,
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['admin', 'employees', 'all'],
        queryFn: async () => (await apiClient.get('/employees?all=true')).data?.data ?? [],
        enabled: isAdmin && showCreateModal,
        staleTime: 5 * 60 * 1000,
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'summary'] });
    };

    const toggleMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/tasks/${id}/toggle`),
        onSuccess: invalidateAll,
    });

    const completeMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/tasks/${id}/complete`),
        onSuccess: invalidateAll,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/tasks/${id}`),
        onSuccess: invalidateAll,
    });

    const createMutation = useMutation({
        mutationFn: (payload: any) => apiClient.post('/tasks', payload),
        onSuccess: () => {
            invalidateAll();
            setShowCreateModal(false);
            setNewTitle('');
            setNewDescription('');
            setNewPriority('medium');
            setNewDueDate(todayStr);
            setNewAssignedTo('');
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Record<string, any> = {
            title: newTitle.trim(),
            description: newDescription.trim() || null,
            status: 'new',
            priority: newPriority,
            due_date: newDueDate || todayStr,
        };
        if (isAdmin && newAssignedTo) {
            payload.assigned_to = Number(newAssignedTo);
        }
        createMutation.mutate(payload);
    };

    const tasks = tasksData || [];

    const stats = useMemo(() => {
        let countNew = 0;
        let countProgress = 0;
        let countDone = 0;
        for (const task of tasks) {
            if (task.status === 'done') countDone++;
            else if (task.status === 'in_progress') countProgress++;
            else countNew++;
        }
        return {
            total: tasks.length,
            new: countNew,
            in_progress: countProgress,
            done: countDone,
        };
    }, [tasks]);

    const handleViewChange = (next: 'today' | 'month' | 'all') => {
        setViewFilter(next);
        setDateFrom('');
        setDateTo('');
        if (next === 'today') setSearchParams({ view: 'today' });
        else setSearchParams({});
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('tasks.title')}</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{t('tasks.subtitle')}</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 me-1.5" /> {t('tasks.add_task')}
                </Button>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{t('tasks.stat_total')}</span>
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">{stats.total}</span>
                </div>
                <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{t('tasks.stat_new')}</span>
                    <span className="text-2xl font-extrabold text-blue-600">{stats.new}</span>
                </div>
                <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{t('tasks.stat_in_progress')}</span>
                    <span className="text-2xl font-extrabold text-amber-500">{stats.in_progress}</span>
                </div>
                <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{t('tasks.stat_done')}</span>
                    <span className="text-2xl font-extrabold text-emerald-600">{stats.done}</span>
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {/* View Scope (Today / Month / All) */}
                    <div className="flex items-center gap-1 bg-[var(--surface-secondary)] p-1 rounded-[var(--radius-md)]">
                        {[
                            { label: t('tasks.view_today'), val: 'today' as const },
                            { label: t('tasks.view_month'), val: 'month' as const },
                            { label: t('tasks.view_all'), val: 'all' as const },
                        ].map((v) => (
                            <button
                                key={v.val}
                                type="button"
                                onClick={() => handleViewChange(v.val)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors cursor-pointer ${
                                    viewFilter === v.val && !dateFrom && !dateTo
                                        ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{v.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="h-5 w-px bg-[var(--border-default)] hidden sm:block" />

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                        {[
                            { label: t('common.all'), val: '' },
                            { label: t('tasks.status_new'), val: 'new' },
                            { label: t('tasks.status_in_progress'), val: 'in_progress' },
                            { label: t('tasks.status_done'), val: 'done' },
                        ].map((tab) => (
                            <button
                                key={tab.val}
                                type="button"
                                onClick={() => setStatusFilter(tab.val)}
                                className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-colors cursor-pointer ${
                                    statusFilter === tab.val
                                        ? 'bg-slate-800 text-white shadow-xs'
                                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date range & Search */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            title={t('tasks.date_from')}
                            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
                        />
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            title={t('tasks.date_to')}
                            className="px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="relative flex-1 sm:w-56">
                        <Search className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder={t('tasks.search_ph')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        />
                    </div>
                </div>
            </div>

            {/* Tasks list */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
                </div>
            ) : tasks.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                        <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        {t('tasks.no_tasks')}
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task: any) => {
                        const isDone = task.status === 'done';
                        const isOverdue = task.is_late;
                        const canDelete = isAdmin || task.created_by?.id === user?.id;

                        return (
                            <div
                                key={task.id}
                                className={`bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between transition-all ${
                                    isDone
                                        ? 'border-[var(--border-default)] opacity-60'
                                        : isOverdue
                                        ? 'border-[var(--status-danger)]/40 ring-1 ring-[var(--status-danger)]/20'
                                        : 'border-[var(--border-default)] hover:border-[var(--tenant-primary)]/40'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <div className="flex items-center gap-1.5">
                                            <StatusBadge
                                                status={
                                                    task.priority === 'high'
                                                        ? 'rejected'
                                                        : task.priority === 'medium'
                                                        ? 'pending'
                                                        : 'active'
                                                }
                                                label={task.priority === 'high' ? t('tasks.priority_high') : task.priority === 'medium' ? t('tasks.priority_medium') : t('tasks.priority_low')}
                                            />
                                            {task.assigned_to && (
                                                <span
                                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                                                    title={t('tasks.private_badge')}
                                                >
                                                    <Lock className="h-2.5 w-2.5 text-slate-400" />
                                                    <User className="h-2.5 w-2.5 text-[var(--tenant-primary)]" />
                                                    <span className="truncate max-w-[90px]">{task.assigned_to.name}</span>
                                                </span>
                                            )}
                                        </div>
                                        <StatusBadge
                                            status={task.status}
                                            label={task.status === 'done' ? t('tasks.status_done') : task.status === 'in_progress' ? t('tasks.status_in_progress') : t('tasks.status_new')}
                                        />
                                    </div>

                                    <h3 className={`text-sm font-semibold text-[var(--text-primary)] ${isDone ? 'line-through text-[var(--text-muted)]' : ''}`}>
                                        {task.title}
                                    </h3>
                                    {task.description && (
                                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                                            {task.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                                    <span>
                                        {task.due_date ? `${t('tasks.due_prefix')} ${task.due_date}` : t('tasks.no_due')}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            title={t('tasks.toggle_status')}
                                            onClick={() => toggleMutation.mutate(task.id)}
                                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--tenant-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </button>
                                        {!isDone && (
                                            <button
                                                type="button"
                                                title={t('tasks.complete_task')}
                                                onClick={() => completeMutation.mutate(task.id)}
                                                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--status-success)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                title={t('tasks.delete_task')}
                                                onClick={() => deleteMutation.mutate(task.id)}
                                                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-[var(--surface-primary)] rounded-[var(--radius-xl)] max-w-md w-full p-6 shadow-xl border border-[var(--border-default)]">
                        <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">{t('tasks.add_task')}</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <Input
                                label={t('tasks.task_title')}
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder={t('tasks.task_title_ph')}
                                required
                            />

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    {t('tasks.description')}
                                </label>
                                <textarea
                                    rows={2}
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder={t('tasks.description_ph')}
                                    className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                />
                            </div>

                            {isAdmin ? (
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                        {t('tasks.assign_to')}
                                    </label>
                                    <select
                                        value={newAssignedTo}
                                        onChange={(e) => setNewAssignedTo(e.target.value)}
                                        className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                    >
                                        <option value="">{t('tasks.unassigned_option')}</option>
                                        {employees.map((emp: any) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-[11px] text-blue-800 flex items-center gap-2">
                                    <Lock className="h-3.5 w-3.5 shrink-0" />
                                    <span>{t('tasks.assign_self_note')}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                        {t('tasks.priority')}
                                    </label>
                                    <select
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(e.target.value)}
                                        className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                    >
                                        <option value="low">{t('tasks.priority_low')}</option>
                                        <option value="medium">{t('tasks.priority_medium')}</option>
                                        <option value="high">{t('tasks.priority_high')}</option>
                                    </select>
                                </div>

                                <Input
                                    label={t('tasks.due_date')}
                                    type="date"
                                    min={isAdmin ? undefined : todayStr}
                                    max={isAdmin ? undefined : maxMonthStr}
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" variant="primary" loading={createMutation.isPending}>
                                    {t('tasks.save_task')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
