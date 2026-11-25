import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    UserCheck,
    Plus,
    Search,
    Shield,
    Mail,
    Phone,
    Calendar,
    CheckCircle,
    XCircle,
    Trash2,
    Edit2,
    Lock,
    KeyRound,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface RoleItem {
    id: number;
    name: string;
    guard_name: string;
}

interface EmployeeItem {
    id: number;
    name: string;
    username?: string;
    email: string;
    phone?: string;
    role?: string;
    is_active: boolean;
    avatar?: string;
    roles?: string[];
    permissions?: string[];
    created_at?: string;
}

export const EmployeesPage: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const dateLocale = i18n.language === 'en' ? 'en-US' : 'ar-SA';
    const { user: currentUser, can } = useAuth();
    const canManage = can('manage-employees');

    const [employees, setEmployees] = useState<EmployeeItem[]>([]);
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Modal state for create/edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        is_active: true,
        selectedRoles: [] as string[],
    });

    const fetchRoles = async () => {
        try {
            const res = await apiClient.get<any>('/api/v1/roles');
            const roleData = res.data?.data || res.data || [];
            setRoles(Array.isArray(roleData) ? roleData : []);
        } catch (err) {
            console.error('Failed to load roles', err);
        }
    };

    const fetchEmployees = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page: pageNumber, per_page: 15 };
            if (search) params.search = search;

            const res = await apiClient.get<any>('/api/v1/employees', { params });
            const payload = res.data;
            const empList = payload?.data?.data || payload?.data || [];
            setEmployees(Array.isArray(empList) ? empList : []);

            const meta = payload?.data?.meta || payload?.meta;
            if (meta) {
                setPage(meta.current_page || 1);
                setLastPage(meta.last_page || 1);
                setTotal(meta.total || 0);
            }
        } catch (err) {
            console.error('Failed to load employees', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchEmployees(1);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const openCreateModal = () => {
        setEditingEmployee(null);
        setForm({
            name: '',
            email: '',
            phone: '',
            password: '',
            is_active: true,
            selectedRoles: [],
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (emp: EmployeeItem) => {
        setEditingEmployee(emp);
        setForm({
            name: emp.name,
            email: emp.email,
            phone: emp.phone || '',
            password: '',
            is_active: emp.is_active,
            selectedRoles: emp.roles || [],
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            const payload: Record<string, any> = {
                name: form.name,
                email: form.email,
                phone: form.phone || null,
                is_active: form.is_active,
                roles: form.selectedRoles,
            };
            if (form.password) {
                payload.password = form.password;
            }

            if (editingEmployee) {
                await apiClient.put(`/api/v1/employees/${editingEmployee.id}`, payload);
            } else {
                if (!form.password) {
                    setFormError('كلمة المرور مطلوبة للموظف الجديد');
                    setSaving(false);
                    return;
                }
                await apiClient.post('/api/v1/employees', payload);
            }

            setIsModalOpen(false);
            fetchEmployees(page);
        } catch (err: any) {
            setFormError(err.message || 'حدث خطأ أثناء حفظ بيانات الموظف');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (emp: EmployeeItem) => {
        try {
            await apiClient.post(`/api/v1/employees/${emp.id}/toggle-active`);
            setEmployees((prev) =>
                prev.map((e) => (e.id === emp.id ? { ...e, is_active: !e.is_active } : e))
            );
        } catch (err: any) {
            alert(err.message || 'فشل تعديل حالة تفعيل الموظف');
        }
    };

    const handleDeleteEmployee = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
        try {
            await apiClient.delete(`/api/v1/employees/${id}`);
            setEmployees((prev) => prev.filter((e) => e.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
        } catch (err: any) {
            alert(err.message || 'فشل حذف الموظف');
        }
    };

    const toggleRoleSelection = (roleName: string) => {
        setForm((prev) => {
            const exists = prev.selectedRoles.includes(roleName);
            return {
                ...prev,
                selectedRoles: exists
                    ? prev.selectedRoles.filter((r) => r !== roleName)
                    : [...prev.selectedRoles, roleName],
            };
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <UserCheck className="h-6 w-6 text-[var(--tenant-primary)]" />
                        {t('employees.title')}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {t('employees.subtitle', { count: total })}
                    </p>
                </div>
                {canManage && (
                    <Button onClick={openCreateModal} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t('employees.add_employee')}
                    </Button>
                )}
            </div>

            {/* Filter */}
            <Card orientation="vertical" size="sm">
                <div className="p-4 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('employees.search_ph')}
                            className="w-full ps-9 pe-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/20 focus:border-[var(--tenant-primary)] bg-white"
                        />
                    </div>
                </div>
            </Card>

            {/* Employees Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-start text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium text-xs border-b border-slate-100">
                            <tr>
                                <th className="py-3.5 px-4 text-start">{t('employees.col_employee')}</th>
                                <th className="py-3.5 px-4 text-start">{t('employees.col_contact')}</th>
                                <th className="py-3.5 px-4 text-start">{t('employees.col_roles')}</th>
                                <th className="py-3.5 px-4 text-center">{t('common.status')}</th>
                                <th className="py-3.5 px-4 text-center">{t('employees.col_created')}</th>
                                <th className="py-3.5 px-4 text-end">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        {t('employees.loading')}
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        {t('employees.empty')}
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] font-bold flex items-center justify-center text-sm border border-[var(--tenant-primary)]/20">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{emp.name}</div>
                                                    {emp.username && (
                                                        <div className="text-xs text-slate-400">@{emp.username}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="space-y-0.5 text-xs">
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                    {emp.email}
                                                </div>
                                                {emp.phone && (
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                        <span dir="ltr">{emp.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {emp.roles && emp.roles.length > 0 ? (
                                                    emp.roles.map((r) => (
                                                        <span
                                                            key={r}
                                                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200"
                                                        >
                                                            <Shield className="h-3 w-3 text-[var(--tenant-primary)]" />
                                                            {r}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400">{t('employees.no_roles')}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <button
                                                onClick={() => handleToggleActive(emp)}
                                                className="inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                                                title={t('employees.toggle_active_title')}
                                            >
                                                <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                                                    {emp.is_active ? t('common.active') : t('common.inactive')}
                                                </Badge>
                                            </button>
                                        </td>
                                        <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                                            {emp.created_at ? new Date(emp.created_at).toLocaleDateString(dateLocale) : '—'}
                                        </td>
                                        <td className="py-3.5 px-4 text-end">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(emp)}
                                                    className="p-1.5 text-slate-400 hover:text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/10 rounded"
                                                    title={t('employees.edit_title')}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {canManage && currentUser?.id !== emp.id && (
                                                    <button
                                                        onClick={() => handleDeleteEmployee(emp.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title={t('employees.delete_title')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {lastPage > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <div className="text-sm text-slate-600">
                            {t('employees.page_of', { page, lastPage })}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => fetchEmployees(page - 1)}
                            >
                                {t('employees.prev')}
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page >= lastPage}
                                onClick={() => fetchEmployees(page + 1)}
                            >
                                {t('employees.next')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingEmployee ? t('employees.modal_edit') : t('employees.modal_add')}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    {t('employees.full_name')}
                                </label>
                                <Input
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder={t('employees.name_ph')}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {t('employees.email')}
                                    </label>
                                    <Input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="user@tameed.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {t('employees.phone')}
                                    </label>
                                    <Input
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="05XXXXXXXX"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    {editingEmployee
                                        ? t('employees.password_optional')
                                        : t('employees.password_required')}
                                </label>
                                <Input
                                    type="password"
                                    required={!editingEmployee}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2">
                                    {t('employees.roles_label')}
                                </label>
                                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    {roles.map((r) => {
                                        const checked = form.selectedRoles.includes(r.name);
                                        return (
                                            <label
                                                key={r.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border text-xs font-medium transition-colors ${
                                                    checked
                                                        ? 'bg-[var(--tenant-primary)]/10 border-[var(--tenant-primary)]/30 text-[var(--tenant-primary)] font-semibold'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleRoleSelection(r.name)}
                                                    className="rounded text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)] h-4 w-4"
                                                />
                                                <span>{r.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                        className="rounded text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)] h-4 w-4"
                                    />
                                    {t('employees.is_active')}
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={saving}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? t('common.saving') : t('employees.save_employee')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
