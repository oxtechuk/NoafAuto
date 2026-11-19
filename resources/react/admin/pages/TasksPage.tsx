import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { StatusBadge } from '../../shared/components/ui/StatusBadge';
import { Input } from '../../shared/components/ui/Input';
import { CheckCircle, RefreshCw, Plus, Clock, Search } from 'lucide-react';

export const TasksPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState('medium');
    const [newDueDate, setNewDueDate] = useState('');

    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['admin', 'tasks', { status: statusFilter, search }],
        queryFn: async () => {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const res = await apiClient.get('/tasks', { params });
            return res.data?.data;
        },
    });

    const toggleMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/tasks/${id}/toggle`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] }),
    });

    const completeMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/tasks/${id}/complete`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] }),
    });

    const createMutation = useMutation({
        mutationFn: (payload: any) => apiClient.post('/tasks', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
            setShowCreateModal(false);
            setNewTitle('');
            setNewDueDate('');
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            title: newTitle,
            status: 'new',
            priority: newPriority,
            due_date: newDueDate || null,
        });
    };

    const tasks = tasksData || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">إدارة المهام اليومية</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">متابعة وإنجاز مهام الفريق ومواعيد الاستحقاق</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 me-1.5" /> إضافة مهمة جديدة
                </Button>
            </div>

            {/* Filter bar */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                    {[
                        { label: 'الكل', val: '' },
                        { label: 'جديدة', val: 'new' },
                        { label: 'قيد التنفيذ', val: 'in_progress' },
                        { label: 'مكتملة', val: 'done' },
                    ].map((tab) => (
                        <button
                            key={tab.val}
                            onClick={() => setStatusFilter(tab.val)}
                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-colors ${
                                statusFilter === tab.val
                                    ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="بحث بالمهام..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                    />
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
                        لا توجد مهام تطابق هذا التحديد.
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task: any) => {
                        const isDone = task.status === 'done';
                        const isOverdue = task.is_late;

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
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <StatusBadge
                                            status={
                                                task.priority === 'high'
                                                    ? 'rejected'
                                                    : task.priority === 'medium'
                                                    ? 'pending'
                                                    : 'active'
                                            }
                                            label={task.priority_label}
                                        />
                                        <StatusBadge
                                            status={task.status}
                                            label={task.status_label}
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
                                        {task.due_date ? `الاستحقاق: ${task.due_date}` : 'بدون موعد'}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            title="تبديل الحالة"
                                            onClick={() => toggleMutation.mutate(task.id)}
                                            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--tenant-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </button>
                                        {!isDone && (
                                            <button
                                                title="إكمال المهمة"
                                                onClick={() => completeMutation.mutate(task.id)}
                                                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--status-success)] hover:bg-[var(--surface-secondary)] transition-colors"
                                            >
                                                <CheckCircle className="h-4 w-4" />
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
                        <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">إضافة مهمة جديدة</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <Input
                                label="عنوان المهمة"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="مثال: متابعة تمويل بنك الراجحي"
                                required
                            />

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    الأولوية
                                </label>
                                <select
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value)}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="low">منخفضة</option>
                                    <option value="medium">متوسطة</option>
                                    <option value="high">عالية</option>
                                </select>
                            </div>

                            <Input
                                label="تاريخ الاستحقاق"
                                type="date"
                                value={newDueDate}
                                onChange={(e) => setNewDueDate(e.target.value)}
                            />

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                    إلغاء
                                </Button>
                                <Button type="submit" variant="primary" loading={createMutation.isPending}>
                                    حفظ المهمة
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
