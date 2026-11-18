import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { CheckCircle, Play, RefreshCw, Plus, Clock, Search } from 'lucide-react';

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
                    <h1 className="text-xl font-bold text-slate-900">إدارة المهام اليومية</h1>
                    <p className="text-xs text-slate-500 mt-1">متابعة وإنجاز مهام الفريق ومواعيد الاستحقاق</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 me-1.5" /> إضافة مهمة جديدة
                </Button>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
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

                <div className="relative w-full sm:w-64">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="بحث بالمهام..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600"
                    />
                </div>
            </div>

            {/* Tasks list */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : tasks.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-400 text-xs">
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
                                className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                                    isDone
                                        ? 'border-slate-200 opacity-60'
                                        : isOverdue
                                        ? 'border-rose-300 ring-1 ring-rose-200'
                                        : 'border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <Badge
                                            variant={
                                                task.priority === 'high'
                                                    ? 'danger'
                                                    : task.priority === 'medium'
                                                    ? 'warning'
                                                    : 'success'
                                            }
                                        >
                                            {task.priority_label}
                                        </Badge>
                                        <Badge
                                            variant={
                                                task.status === 'done'
                                                    ? 'success'
                                                    : task.status === 'in_progress'
                                                    ? 'primary'
                                                    : 'slate'
                                            }
                                        >
                                            {task.status_label}
                                        </Badge>
                                    </div>

                                    <h3 className={`text-sm font-semibold text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>
                                        {task.title}
                                    </h3>
                                    {task.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                            {task.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        {task.due_date ? `الاستحقاق: ${task.due_date}` : 'بدون موعد'}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            title="تبديل الحالة"
                                            onClick={() => toggleMutation.mutate(task.id)}
                                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </button>
                                        {!isDone && (
                                            <button
                                                title="إكمال المهمة"
                                                onClick={() => completeMutation.mutate(task.id)}
                                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
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
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                        <h2 className="text-base font-bold text-slate-900 mb-4">إضافة مهمة جديدة</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <Input
                                label="عنوان المهمة"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="مثال: متابعة تمويل بنك الراجحي"
                                required
                            />

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    الأولوية
                                </label>
                                <select
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:border-indigo-600"
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
