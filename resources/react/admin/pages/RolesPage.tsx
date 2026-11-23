import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Modal, useConfirm } from '../../shared/components/ui';
import {
    Shield,
    ShieldCheck,
    Plus,
    Edit,
    Trash2,
    Users,
    Key,
    Check,
    Search,
    Lock,
    Sparkles,
    CheckSquare,
    Square,
    Briefcase,
    Car,
    FileText,
    Settings,
    CheckCircle2,
} from 'lucide-react';

interface RoleItem {
    id: number;
    name: string;
    guard_name: string;
    users_count?: number;
    permissions?: string[];
    created_at?: string;
}

interface PermissionItem {
    id: number;
    name: string;
    guard_name: string;
}

// Permission Arabic Human-Readable Dictionary
const PERMISSION_LABELS: Record<string, { label: string; desc: string; category: string }> = {
    // Sales & Bookings
    'manage-bookings': { label: 'إدارة طلبات السيارات', desc: 'استعراض وتعديل حالات طلبات الشراء والتمويل', category: 'sales' },
    'manage-leads': { label: 'إدارة العملاء والمهتمين', desc: 'متابعة العملاء المتوقعين وحملات الاستقطاب', category: 'sales' },
    'manage-tasks': { label: 'إدارة المهام والمتابعات', desc: 'إنهاء وتعيين المهام اليومية لفريق المبيعات', category: 'sales' },
    'manage-calculator-leads': { label: 'عملاء حاسبة التمويل', desc: 'الاطلاع على طلبات العملاء من حاسبة الأقساط', category: 'sales' },
    'manage-calculator-settings': { label: 'إعدادات وبنوك الحاسبة', desc: 'تعديل هوامش الربح ونسب البنوك وشركات التمويل', category: 'sales' },
    'manage-finance-steps': { label: 'خطوات وبرامج التمويل', desc: 'تخصيص مراحل تقديم ودراسة التمويل', category: 'sales' },
    'manage-budget-ranges': { label: 'نطاقات الميزانية والأقساط', desc: 'إدارة شرائح الرواتب والأسعار الاسترشادية', category: 'sales' },

    // Cars & Catalog
    'manage-cars': { label: 'إدارة أسطول السيارات', desc: 'إضافة وتعديل السيارات والأسعار والمواصفات', category: 'catalog' },
    'manage-brands': { label: 'الماركات التجارية', desc: 'إدارة وكالات وعلامات السيارات وشعاراتها', category: 'catalog' },
    'manage-car-categories': { label: 'تصنيفات وفئات المعرض', desc: 'تصنيف السيارات (عائلي، فخم، اقتصادي...) ', category: 'catalog' },
    'manage-car-types': { label: 'أنواع الهياكل', desc: 'إدارة تصاميم الهياكل (سيدان، SUV، هاتشباك...)', category: 'catalog' },
    'manage-brand-types': { label: 'أنواع الماركات وبلد المنشأ', desc: 'تصنيف الماركات حسب بلد الصنع (ياباني، كوري...)', category: 'catalog' },
    'manage-specifications': { label: 'المواصفات الفنية', desc: 'إدارة بنك المواصفات التقنية للسيارات', category: 'catalog' },
    'manage-features': { label: 'المميزات والكماليات', desc: 'تجهيزات المقصورة والراحة والترفيه', category: 'catalog' },
    'manage-safety-features': { label: 'ميزات وأنظمة السلامة', desc: 'أنظمة الأمان والوسائد وحساسات الطوارئ', category: 'catalog' },
    'manage-offers': { label: 'العروض الترويجية والخصومات', desc: 'إدارة حملات التخفيض وبانرات الأسعار الخاصة', category: 'catalog' },

    // Team & System
    'manage-dashboard': { label: 'لوحة التحكم الإحصائية', desc: 'الاطلاع على مؤشرات الأداء وحجم المبيعات', category: 'system' },
    'manage-employees': { label: 'إدارة الموظفين والمسؤولين', desc: 'إضافة وتعيين صلاحيات وحسابات الموظفين', category: 'system' },
    'manage-roles': { label: 'إدارة الأدوار والصلاحيات', desc: 'تخصيص مصفوفة الأذونات ومستويات الوصول', category: 'system' },
    'manage-reports': { label: 'التقارير والمبيعات والأرباح', desc: 'استخراج تقارير التحويلات ونسب الأداء', category: 'system' },
    'manage-settings': { label: 'الإعدادات العامة للمنصة', desc: 'معلومات المعرض، وسائل التواصل، والتوزيع التلقائي', category: 'system' },
    'manage-settings-integrations': { label: 'الربط والتكامل التقني', desc: 'بوابات الرسائل والربط البنكي والـ API', category: 'system' },
    'manage-tracking': { label: 'أكواد التتبع والتحليلات', desc: 'إدارة بيكسل ميتا، جوجل، وسناب شات', category: 'system' },
    'manage-translations': { label: 'الترجمات واللغات', desc: 'إدارة النصوص متعددة اللغات بالمنصة', category: 'system' },
    'manage-designs': { label: 'تصميم ومظهر الموقع', desc: 'تخصيص الألوان والسمات والهوية البصرية', category: 'system' },

    // Content & Marketing
    'manage-contact-sources': { label: 'مصادر التواصل والحملات', desc: 'إدارة قنوات الاستقطاب ومصادر الإعلانات', category: 'marketing' },
    'manage-newsletter': { label: 'مشتركو النشرة البريدية', desc: 'قائمة البريد الإلكتروني للمهتمين بالعروض', category: 'marketing' },
    'manage-blog': { label: 'مقالات وأقسام المدونة', desc: 'نشر الأخبار والمقالات وتحسين الـ SEO', category: 'marketing' },
    'manage-partners': { label: 'شركاء النجاح والتمويل', desc: 'إدارة شعارات البنوك وجهات التمويل المعتمدة', category: 'marketing' },
    'manage-testimonials': { label: 'آراء وتقييمات العملاء', desc: 'تجارب العملاء المعروضة على الموقع', category: 'marketing' },
    'manage-faqs': { label: 'الأسئلة الشائعة', desc: 'إدارة إجابات الاستفسارات المتكررة للعملاء', category: 'marketing' },
    'manage-hero-slides': { label: 'شرائح وبانرات الواجهة', desc: 'إدارة السلايدر الرئيسي في الصفحة الأولى', category: 'marketing' },
    'manage-home-sections': { label: 'أقسام الصفحة الرئيسية', desc: 'ترتيب وتخصيص بلوكات الواجهة الرئيسية', category: 'marketing' },
    'manage-promo-cards': { label: 'البطاقات الترويجية السريعة', desc: 'إدارة كروت المزايا والشارات التسويقية', category: 'marketing' },
    'manage-promo-banners': { label: 'إعلانات البانر المؤقتة', desc: 'حملات البانر في الصفحات الداخلية', category: 'marketing' },
};

const CATEGORIES = [
    { key: 'sales', label: 'المبيعات والطلبات', icon: Briefcase },
    { key: 'catalog', label: 'السيارات والكتالوج', icon: Car },
    { key: 'system', label: 'النظام والإدارة', icon: Settings },
    { key: 'marketing', label: 'المحتوى والتسويق', icon: FileText },
];

export const RolesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm: showConfirm, ConfirmDialogComponent } = useConfirm();

    // Modals state
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [permSearch, setPermSearch] = useState('');

    // Custom Permission Modal state
    const [isPermModalOpen, setIsPermModalOpen] = useState(false);
    const [newPermName, setNewPermName] = useState('');

    // Success floating notification
    const [notice, setNotice] = useState<string | null>(null);
    const triggerNotice = (msg: string) => {
        setNotice(msg);
        setTimeout(() => setNotice(null), 3500);
    };

    // 1. Fetch Roles
    const { data: rolesResponse, isLoading: rolesLoading } = useQuery({
        queryKey: ['admin', 'roles', 'all'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/roles');
            return res.data?.data || [];
        },
    });

    // 2. Fetch Permissions
    const { data: permissionsResponse, isLoading: permsLoading } = useQuery({
        queryKey: ['admin', 'permissions', 'all'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/roles/permissions');
            return res.data?.data || [];
        },
    });

    const roles: RoleItem[] = rolesResponse || [];
    const allPermissions: PermissionItem[] = permissionsResponse || [];

    // Group permissions by category
    const categorizedPermissions = useMemo(() => {
        const groups: Record<string, PermissionItem[]> = {
            sales: [],
            catalog: [],
            system: [],
            marketing: [],
            other: [],
        };

        allPermissions.forEach((perm) => {
            if (permSearch && !perm.name.toLowerCase().includes(permSearch.toLowerCase()) && !PERMISSION_LABELS[perm.name]?.label.includes(permSearch)) {
                return;
            }

            const info = PERMISSION_LABELS[perm.name];
            const cat = info?.category || 'other';
            if (groups[cat]) {
                groups[cat].push(perm);
            } else {
                groups.other.push(perm);
            }
        });

        return groups;
    }, [allPermissions, permSearch]);

    // Mutation: Save Role (Create or Update)
    const saveRoleMutation = useMutation({
        mutationFn: async () => {
            if (editingRole) {
                return await apiClient.put(`/api/v1/roles/${editingRole.id}`, {
                    name: roleName.trim(),
                    permissions: selectedPermissions,
                });
            } else {
                return await apiClient.post('/api/v1/roles', {
                    name: roleName.trim(),
                    permissions: selectedPermissions,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
            setIsRoleModalOpen(false);
            setEditingRole(null);
            triggerNotice(editingRole ? 'تم تحديث الدور والصلاحيات بنجاح' : 'تم إنشاء الدور الجديد بنجاح');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'فشل حفظ الدور، يرجى مراجعة البيانات');
        },
    });

    // Mutation: Delete Role
    const deleteRoleMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/api/v1/roles/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
            triggerNotice('تم حذف الدور بنجاح');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'فشل حذف الدور');
        },
    });

    // Mutation: Add Custom Permission
    const createPermissionMutation = useMutation({
        mutationFn: (name: string) => apiClient.post('/api/v1/roles/permissions', { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
            setIsPermModalOpen(false);
            setNewPermName('');
            triggerNotice('تم إضافة الصلاحية الجديدة بنجاح');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'فشل إضافة الصلاحية');
        },
    });

    // Open Create Modal
    const handleOpenCreateRole = () => {
        setEditingRole(null);
        setRoleName('');
        setSelectedPermissions([]);
        setPermSearch('');
        setIsRoleModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEditRole = (role: RoleItem) => {
        setEditingRole(role);
        setRoleName(role.name);
        setSelectedPermissions(role.permissions || []);
        setPermSearch('');
        setIsRoleModalOpen(true);
    };

    // Toggle Single Permission
    const togglePermission = (name: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
        );
    };

    // Toggle All Permissions in Category
    const toggleCategoryPermissions = (perms: PermissionItem[]) => {
        const names = perms.map((p) => p.name);
        const allSelected = names.every((n) => selectedPermissions.includes(n));

        if (allSelected) {
            setSelectedPermissions((prev) => prev.filter((p) => !names.includes(p)));
        } else {
            setSelectedPermissions((prev) => Array.from(new Set([...prev, ...names])));
        }
    };

    // Select All Permissions in system
    const handleSelectAll = () => {
        setSelectedPermissions(allPermissions.map((p) => p.name));
    };

    // Clear All Permissions
    const handleClearAll = () => {
        setSelectedPermissions([]);
    };

    // Delete Role confirmation
    const handleDeleteRole = async (role: RoleItem) => {
        if (role.name === 'admin') {
            alert('لا يمكن حذف دور المدير الرئيسي (Admin).');
            return;
        }

        const confirmed = await showConfirm({
            title: `تأكيد حذف الدور "${role.name}"`,
            message: `هل أنت متأكد من رغبتك في حذف هذا الدور؟ يوجد ${role.users_count || 0} موظف مسند إليهم هذا الدور حالياً.`,
            detail: 'تنبيه: سيتم إلغاء ارتباط الصلاحيات المحددة بهذا الدور للموظفين المسجلين به.',
            confirmText: 'نعم، حذف الدور',
            cancelText: 'إلغاء الأمر',
            variant: 'danger',
            icon: Trash2,
        });

        if (confirmed) {
            deleteRoleMutation.mutate(role.id);
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Header Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-50 text-[var(--tenant-primary,#1877F2)] border border-sky-100 flex items-center justify-center shrink-0">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-800">الأدوار والصلاحيات</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            إدارة مجموعات الأذونات ومستويات الوصول لفريق العمل بالمنصة
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setIsPermModalOpen(true)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="إضافة صلاحية جديدة للنظام"
                    >
                        <Key className="h-3.5 w-3.5 text-slate-500" />
                        <span>+ إضافة صلاحية مخصصة</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenCreateRole}
                        className="px-4 py-2 rounded-xl bg-[var(--tenant-primary,#1877F2)] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>إنشاء دور جديد</span>
                    </button>
                </div>
            </div>

            {/* 2. Roles Cards Grid */}
            {rolesLoading ? (
                <div className="py-20 flex justify-center bg-white rounded-2xl border border-slate-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary,#1877F2)]" />
                </div>
            ) : roles.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
                    <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <span>لا توجد أدوار مسجلة حالياً. اضغط على زر إنشاء دور جديد للبدء.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {roles.map((role) => {
                        const isPrimaryAdmin = role.name === 'admin';
                        const permCount = role.permissions?.length || 0;

                        return (
                            <div
                                key={role.id}
                                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                                    isPrimaryAdmin
                                                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                        : 'bg-sky-50 text-[var(--tenant-primary,#1877F2)] border-sky-100'
                                                }`}
                                            >
                                                {isPrimaryAdmin ? <Lock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                                    <span>{role.name}</span>
                                                    {isPrimaryAdmin && (
                                                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                                                            مدير عام
                                                        </span>
                                                    )}
                                                </h3>
                                            </div>
                                        </div>

                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                                            <Users className="h-3 w-3" />
                                            <span>{role.users_count || 0} موظف</span>
                                        </span>
                                    </div>

                                    {/* Permissions Summary */}
                                    <div className="pt-2 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                            <span>الصلاحيات الممنوحة:</span>
                                            <span className="font-bold text-slate-800">
                                                {isPrimaryAdmin ? 'كل الصلاحيات (Full Access)' : `${permCount} صلاحية`}
                                            </span>
                                        </div>

                                        {isPrimaryAdmin ? (
                                            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-[11px] text-amber-900 font-medium leading-relaxed">
                                                يمتلك هذا الدور وصولاً مطلقاً لكافة أجزاء المنصة، الإعدادات، طلبات السيارات، وإدارة الفريق.
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin p-1">
                                                {role.permissions && role.permissions.length > 0 ? (
                                                    role.permissions.slice(0, 10).map((permName) => (
                                                        <span
                                                            key={permName}
                                                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/60"
                                                            title={PERMISSION_LABELS[permName]?.desc || permName}
                                                        >
                                                            {PERMISSION_LABELS[permName]?.label || permName}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400">لا توجد صلاحيات مسندة بعد.</span>
                                                )}
                                                {permCount > 10 && (
                                                    <span className="text-[10px] bg-sky-50 text-[var(--tenant-primary,#1877F2)] px-2 py-0.5 rounded-md font-bold">
                                                        +{permCount - 10} المزيد
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400 font-mono">
                                        ID: #{role.id}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditRole(role)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-[var(--tenant-primary,#1877F2)] hover:border-[var(--tenant-primary,#1877F2)] hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                            title="تعديل الصلاحيات الممنوحة"
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                            <span>تعديل</span>
                                        </button>
                                        {!isPrimaryAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRole(role)}
                                                className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                                title="حذف هذا الدور"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 3. Smart Modal: Create / Edit Role with Permissions Matrix */}
            <Modal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                size="2xl"
                title={editingRole ? `تعديل صلاحيات الدور (${editingRole.name})` : 'إنشاء دور وصلاحيات جديدة'}
                subtitle="حدد اسم الدور واختر الصلاحيات المسموح بها لموظفي هذا المستوى"
                icon={ShieldCheck}
                iconVariant="primary"
                primaryAction={{
                    label: saveRoleMutation.isPending ? 'جاري الحفظ...' : 'حفظ الدور والصلاحيات',
                    onClick: () => {
                        if (!roleName.trim()) {
                            alert('الرجاء كتابة اسم الدور.');
                            return;
                        }
                        saveRoleMutation.mutate();
                    },
                    loading: saveRoleMutation.isPending,
                    disabled: !roleName.trim(),
                }}
                secondaryAction={{
                    label: 'إلغاء الأمر',
                    onClick: () => setIsRoleModalOpen(false),
                }}
            >
                <div className="space-y-5">
                    {/* Role Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            اسم الدور الوظيفي <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="مثال: sales, supervisor, accountant, support..."
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            disabled={editingRole?.name === 'admin'}
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 font-semibold focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                        {editingRole?.name === 'admin' && (
                            <p className="text-[11px] text-amber-600 mt-1">
                                دور المدير الرئيسي ثابت ولا يمكن تعديل اسمه للحفاظ على سلامة النظام.
                            </p>
                        )}
                    </div>

                    {/* Permissions Controls Bar */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                                الصلاحيات المحددة: <span className="text-[var(--tenant-primary,#1877F2)]">{selectedPermissions.length}</span> من {allPermissions.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute start-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="بحث في الصلاحيات..."
                                    value={permSearch}
                                    onChange={(e) => setPermSearch(e.target.value)}
                                    className="ps-8 pe-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)] w-40 sm:w-48"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors cursor-pointer"
                            >
                                تحديد الكل
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer"
                            >
                                إلغاء التحديد
                            </button>
                        </div>
                    </div>

                    {/* Categorized Permissions Grid */}
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto scrollbar-thin p-1">
                        {CATEGORIES.map((cat) => {
                            const perms = categorizedPermissions[cat.key] || [];
                            if (perms.length === 0) return null;

                            const CatIcon = cat.icon;
                            const isAllCatSelected = perms.every((p) => selectedPermissions.includes(p.name));

                            return (
                                <div
                                    key={cat.key}
                                    className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs"
                                >
                                    {/* Category Header */}
                                    <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CatIcon className="h-4 w-4 text-[var(--tenant-primary,#1877F2)]" />
                                            <span className="font-bold text-xs text-slate-800">{cat.label}</span>
                                            <span className="text-[11px] text-slate-400">({perms.length})</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleCategoryPermissions(perms)}
                                            className="text-xs text-[var(--tenant-primary,#1877F2)] hover:underline font-semibold cursor-pointer"
                                        >
                                            {isAllCatSelected ? 'إلغاء هذا القسم' : 'تحديد كل القسم'}
                                        </button>
                                    </div>

                                    {/* Category Permissions Checkboxes */}
                                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {perms.map((p) => {
                                            const isSelected = selectedPermissions.includes(p.name);
                                            const info = PERMISSION_LABELS[p.name];

                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => togglePermission(p.name)}
                                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                                                        isSelected
                                                            ? 'bg-sky-50/60 border-sky-300 text-slate-900 shadow-2xs'
                                                            : 'bg-white border-slate-200/70 hover:bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="pt-0.5 shrink-0">
                                                        {isSelected ? (
                                                            <div className="h-4 w-4 rounded bg-[var(--tenant-primary,#1877F2)] text-white flex items-center justify-center">
                                                                <Check className="h-3 w-3 stroke-[3]" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 space-y-0.5">
                                                        <div className="font-bold text-xs leading-tight">
                                                            {info?.label || p.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-mono">
                                                            {p.name}
                                                        </div>
                                                        {info?.desc && (
                                                            <div className="text-[11px] text-slate-500 leading-snug">
                                                                {info.desc}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* 4. Smart Modal: Add New Custom Permission */}
            <Modal
                isOpen={isPermModalOpen}
                onClose={() => setIsPermModalOpen(false)}
                size="md"
                title="إضافة صلاحية جديدة للنظام"
                subtitle="يمكنك إضافة مفتاح صلاحية برمجية جديدة لمطابقتها في لوحة التحكم"
                icon={Key}
                iconVariant="success"
                primaryAction={{
                    label: createPermissionMutation.isPending ? 'جاري الإضافة...' : 'حفظ الصلاحية',
                    onClick: () => {
                        if (!newPermName.trim()) {
                            alert('الرجاء كتابة اسم أو كود الصلاحية.');
                            return;
                        }
                        createPermissionMutation.mutate(newPermName.trim());
                    },
                    loading: createPermissionMutation.isPending,
                    disabled: !newPermName.trim(),
                }}
                secondaryAction={{
                    label: 'إلغاء الأمر',
                    onClick: () => setIsPermModalOpen(false),
                }}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            كود / اسم الصلاحية <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="مثال: manage-discounts أو export-leads أو approve-contracts..."
                            value={newPermName}
                            onChange={(e) => setNewPermName(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 font-mono focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                            يُفضل استخدام أحرف إنجليزية صغيرة ومفصولة بشرطات (-) مثل <code>manage-sales</code> لتسهيل مطابقتها في الأكواد.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Floating Toast Notification */}
            {notice && (
                <div className="fixed bottom-6 start-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{notice}</span>
                </div>
            )}

            {/* Smart Confirmation Dialog without Emojis */}
            {ConfirmDialogComponent}
        </div>
    );
};
