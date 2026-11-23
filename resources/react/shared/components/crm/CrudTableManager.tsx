import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    RefreshCw,
    X,
    Save,
    AlertCircle,
    CheckCircle2,
    Upload,
    Check,
} from 'lucide-react';
import { apiClient } from '../../../admin/api/client';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Pagination } from '../ui/Pagination';

export interface CrudColumn {
    key: string;
    title: string;
    type?: 'text' | 'image' | 'boolean' | 'date' | 'badge' | 'custom';
    render?: (val: any, row: any) => React.ReactNode;
}

export interface CrudFormField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'file' | 'color';
    options?: { label: string; value: string | number }[];
    required?: boolean;
    multilingual?: boolean; // Renders AR and EN
    placeholder?: string;
}

export interface CrudTableManagerProps {
    title: string;
    subtitle?: string;
    endpoint: string;
    columns: CrudColumn[];
    formFields: CrudFormField[];
    searchPlaceholder?: string;
    defaultFormData?: Record<string, any>;
    customActions?: (row: any) => React.ReactNode;
}

export function formatLocaleString(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') {
        if ('ar' in val || 'en' in val) {
            return val.ar || val.en || '-';
        }
        const vals = Object.values(val);
        return vals.length > 0 && typeof vals[0] === 'string' ? (vals[0] as string) : '-';
    }
    return String(val);
}

export const CrudTableManager: React.FC<CrudTableManagerProps> = ({
    title,
    subtitle,
    endpoint,
    columns,
    formFields,
    searchPlaceholder = 'بحث...',
    defaultFormData = {},
    customActions,
}) => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [fileUploads, setFileUploads] = useState<Record<string, File>>({});
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // Fetch list query
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: [endpoint, page, search],
        queryFn: async () => {
            const params: Record<string, any> = { page, per_page: 15 };
            if (search.trim()) params.search = search.trim();
            const res = await apiClient.get(endpoint, { params });
            return res.data;
        },
    });

    const rawItems = Array.isArray(data?.data)
        ? data.data
        : (Array.isArray(data?.data?.data) ? data.data.data : (Array.isArray(data) ? data : []));
    const items = Array.isArray(rawItems) ? rawItems : [];
    const meta = data?.data?.meta || data?.meta || {
        current_page: page,
        last_page: 1,
        total: items.length,
        from: 1,
        to: items.length,
    };

    const resolveImgSrc = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http://localhost/') || url.startsWith('http://127.0.0.1:8000/')) {
            return url.replace(/^https?:\/\/[^\/]+/, '');
        }
        if (!url.startsWith('http') && !url.startsWith('/')) {
            return '/' + url;
        }
        return url;
    };

    // Open Add Modal
    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormError(null);
        setFileUploads({});
        const initData: Record<string, any> = { ...defaultFormData };
        formFields.forEach((field) => {
            if (field.multilingual) {
                initData[`${field.name}_ar`] = '';
                initData[`${field.name}_en`] = '';
            } else if (field.type === 'switch') {
                initData[field.name] = true;
            } else {
                initData[field.name] = '';
            }
        });
        setFormData(initData);
        setModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (item: any) => {
        setEditingItem(item);
        setFormError(null);
        setFileUploads({});
        const initData: Record<string, any> = { ...item };
        formFields.forEach((field) => {
            if (field.multilingual) {
                initData[`${field.name}_ar`] =
                    item[`${field.name}_translations`]?.ar ||
                    item[field.name]?.ar ||
                    (typeof item[field.name] === 'string' ? item[field.name] : '');
                initData[`${field.name}_en`] =
                    item[`${field.name}_translations`]?.en ||
                    item[field.name]?.en ||
                    '';
            }
        });
        setFormData(initData);
        setModalOpen(true);
    };

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const isEdit = Boolean(editingItem);
            const url = isEdit ? `${endpoint}/${editingItem.id}` : endpoint;

            // Prepare payload
            const hasFiles = Object.keys(fileUploads).length > 0;
            if (hasFiles) {
                const fd = new FormData();
                if (isEdit) fd.append('_method', 'PUT');

                Object.entries(formData).forEach(([k, v]) => {
                    // Skip multilingual base keys (e.g. name_ar, name_en) handled below
                    const isMultiSubKey = formFields.some(
                        (f) => f.multilingual && (k === `${f.name}_ar` || k === `${f.name}_en`)
                    );
                    if (isMultiSubKey) return;

                    if (typeof v === 'boolean') {
                        fd.append(k, v ? '1' : '0');
                    } else if (v !== undefined && v !== null && typeof v !== 'object') {
                        fd.append(k, String(v));
                    }
                });

                // Append multilingual fields properly as name[ar] and name[en]
                formFields.forEach((f) => {
                    if (f.multilingual) {
                        fd.append(`${f.name}[ar]`, formData[`${f.name}_ar`] || '');
                        fd.append(
                            `${f.name}[en]`,
                            formData[`${f.name}_en`] || formData[`${f.name}_ar`] || ''
                        );
                    }
                });

                Object.entries(fileUploads).forEach(([k, file]) => {
                    if (file) {
                        fd.append(k, file);
                    }
                });

                return await apiClient.post(url, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                // Regular JSON payload
                const payload: Record<string, any> = { ...formData };
                formFields.forEach((f) => {
                    if (f.multilingual) {
                        payload[f.name] = {
                            ar: formData[`${f.name}_ar`] || '',
                            en: formData[`${f.name}_en`] || formData[`${f.name}_ar`] || '',
                        };
                    }
                });

                if (isEdit) {
                    return await apiClient.put(url, payload);
                } else {
                    return await apiClient.post(url, payload);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [endpoint] });
            setModalOpen(false);
            setEditingItem(null);
        },
        onError: (err: any) => {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'حدث خطأ أثناء الحفظ، يرجى مراجعة الحقول.';
            setFormError(msg);
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return await apiClient.delete(`${endpoint}/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [endpoint] });
            setDeleteConfirmId(null);
        },
    });

    // Quick toggle active switch mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            return await apiClient.put(`${endpoint}/${id}`, { is_active });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [endpoint] });
        },
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
                    {subtitle && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        <span>تحديث</span>
                    </Button>
                    <Button variant="primary" onClick={handleOpenAdd} className="gap-1.5 text-xs">
                        <Plus className="h-4 w-4" />
                        <span>إضافة جديد</span>
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="ps-9 text-xs"
                        />
                    </div>
                </div>
            </Card>

            {/* Table Card */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                        <thead>
                            <tr className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold">
                                {columns.map((col) => (
                                    <th key={col.key} className="px-4 py-3 text-start">
                                        {col.title}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-end">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={columns.length + 1}
                                        className="py-12 text-center text-slate-400"
                                    >
                                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[var(--tenant-primary)]" />
                                        <span>جاري تحميل البيانات...</span>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length + 1}
                                        className="py-12 text-center text-slate-400"
                                    >
                                        لا توجد بيانات مسجلة حالياً
                                    </td>
                                </tr>
                            ) : (
                                items.map((row: any) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-[var(--surface-secondary)]/50 transition-colors"
                                    >
                                        {columns.map((col) => {
                                            const val = row[col.key];

                                            if (col.render) {
                                                return (
                                                    <td key={col.key} className="px-4 py-3">
                                                        {col.render(val, row)}
                                                    </td>
                                                );
                                            }

                                            if (col.type === 'image') {
                                                const resolved = resolveImgSrc(val);
                                                return (
                                                    <td key={col.key} className="px-4 py-3">
                                                        {resolved ? (
                                                            <img
                                                                src={resolved}
                                                                alt=""
                                                                className="h-9 w-9 object-contain rounded-md border border-slate-200 bg-white p-0.5"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            }

                                            if (col.type === 'boolean') {
                                                return (
                                                    <td key={col.key} className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleActiveMutation.mutate({
                                                                    id: row.id,
                                                                    is_active: !val,
                                                                })
                                                            }
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                                                                val
                                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            {val ? 'نشط' : 'معطل'}
                                                        </button>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td
                                                    key={col.key}
                                                    className="px-4 py-3 font-medium text-[var(--text-primary)]"
                                                >
                                                    {formatLocaleString(val)}
                                                </td>
                                            );
                                        })}

                                        {/* Actions Column */}
                                        <td className="px-4 py-3 text-end">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {customActions && customActions(row)}
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleOpenEdit(row)}
                                                    className="h-7 w-7 p-0"
                                                    title="تعديل"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirmId(row.id)}
                                                    className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta.last_page > 1 && (
                    <div className="p-4 border-t border-[var(--border-default)]">
                        <Pagination
                            currentPage={meta.current_page}
                            lastPage={meta.last_page}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                )}
            </Card>

            {/* Add / Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <Card className="w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
                            <h3 className="font-bold text-sm text-[var(--text-primary)]">
                                {editingItem ? `تعديل: ${title}` : `إضافة جديد إلى ${title}`}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="m-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveMutation.mutate();
                            }}
                            className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
                        >
                            {formFields.map((field) => {
                                if (field.multilingual) {
                                    return (
                                        <div key={field.name} className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                                    {field.label} (بالعربية){' '}
                                                    {field.required && (
                                                        <span className="text-rose-500">*</span>
                                                    )}
                                                </label>
                                                <Input
                                                    required={field.required}
                                                    value={formData[`${field.name}_ar`] || ''}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            [`${field.name}_ar`]: e.target.value,
                                                        })
                                                    }
                                                    placeholder={`أدخل ${field.label} بالعربية`}
                                                    className="text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                                    {field.label} (بالإنجليزية)
                                                </label>
                                                <Input
                                                    value={formData[`${field.name}_en`] || ''}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            [`${field.name}_en`]: e.target.value,
                                                        })
                                                    }
                                                    placeholder={`Enter ${field.label} in English`}
                                                    className="text-xs"
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>
                                    );
                                }

                                if (field.type === 'switch') {
                                    return (
                                        <div
                                            key={field.name}
                                            className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)]"
                                        >
                                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                                                {field.label}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(formData[field.name])}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        [field.name]: e.target.checked,
                                                    })
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
                                            />
                                        </div>
                                    );
                                }

                                if (field.type === 'select') {
                                    return (
                                        <div key={field.name}>
                                            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                                {field.label}{' '}
                                                {field.required && (
                                                    <span className="text-rose-500">*</span>
                                                )}
                                            </label>
                                            <select
                                                required={field.required}
                                                value={formData[field.name] || ''}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        [field.name]: e.target.value,
                                                    })
                                                }
                                                className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tenant-primary)]"
                                            >
                                                <option value="">اختر {field.label}...</option>
                                                {field.options?.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                }

                                if (field.type === 'file') {
                                    return (
                                        <div key={field.name}>
                                            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                                {field.label}
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[var(--border-default)] hover:border-[var(--tenant-primary)] rounded-lg cursor-pointer bg-[var(--surface-secondary)]/50 transition-colors">
                                                    <Upload className="h-4 w-4 text-slate-400" />
                                                    <span className="text-xs text-slate-500">
                                                        {fileUploads[field.name]
                                                            ? fileUploads[field.name].name
                                                            : 'اضغط لاختيار ملف'}
                                                    </span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                setFileUploads({
                                                                    ...fileUploads,
                                                                    [field.name]:
                                                                        e.target.files[0],
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={field.name}>
                                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                            {field.label}{' '}
                                            {field.required && (
                                                <span className="text-rose-500">*</span>
                                            )}
                                        </label>
                                        <Input
                                            type={field.type}
                                            required={field.required}
                                            placeholder={field.placeholder}
                                            value={formData[field.name] || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    [field.name]: e.target.value,
                                                })
                                            }
                                            className="text-xs"
                                        />
                                    </div>
                                );
                            })}

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setModalOpen(false)}
                                    className="text-xs"
                                >
                                    إلغاء
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={saveMutation.isPending}
                                    className="gap-1.5 text-xs"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>
                                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <Card className="w-full max-w-sm p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
                        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                            <Trash2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-primary)]">
                                تأكيد الحذف
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                هل أنت متأكد من رغبتك في حذف هذا العنصر نهائياً؟ لا يمكن التراجع عن
                                هذه العملية.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs"
                            >
                                إلغاء
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                disabled={deleteMutation.isPending}
                                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                            >
                                {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، احذف'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
