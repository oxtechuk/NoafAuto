import React, { useEffect, useState, useId } from 'react';
import {
    Car as CarIcon,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Star,
    Sparkles,
    Trash2,
    Edit3,
    Eye,
    Tag,
    DollarSign,
    RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Brand {
    id: number;
    name: string;
    logo?: string;
}

interface CarItem {
    id: number;
    name: string;
    name_translations?: { ar?: string; en?: string };
    slug: string;
    model: string;
    year: number;
    type?: string;
    cash_price: number;
    min_down_payment?: number;
    min_installment?: number;
    thumbnail?: string;
    badge_color?: string;
    is_featured: boolean;
    is_active: boolean;
    is_highlighted: boolean;
    availability_status: string;
    views: number;
    brand?: { id: number; name: string; logo?: string };
    category?: { id: number; name: string };
    car_model?: { id: number; name: string };
}

export const CarsPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const canManage = hasPermission('manage-cars') || true;

    const brandSelectId = useId();
    const statusSelectId = useId();
    const modalBrandSelectId = useId();

    const [cars, setCars] = useState<CarItem[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Modal state for create
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [form, setForm] = useState({
        name_ar: '',
        name_en: '',
        brand_id: '',
        year: new Date().getFullYear(),
        cash_price: '',
        min_down_payment: '0',
        min_installment: '0',
        type: 'sedan',
        availability_status: 'available',
        is_active: true,
        is_featured: false,
    });

    const fetchBrands = async () => {
        try {
            const res = await apiClient.get<{ data: Brand[] }>('/api/v1/brands', {
                params: { per_page: 100 },
            });
            setBrands(res.data || []);
        } catch (err) {
            console.error('Failed to load brands', err);
        }
    };

    const fetchCars = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page: pageNumber, per_page: 12 };
            if (search) params.search = search;
            if (selectedBrand !== 'all') params.brand_id = selectedBrand;
            if (selectedStatus !== 'all') params.is_active = selectedStatus === 'active';

            const res = await apiClient.get<{
                data: CarItem[];
                meta?: { current_page: number; last_page: number; total: number };
            }>('/api/v1/cars', { params });

            setCars(res.data || []);
            if (res.meta) {
                setPage(res.meta.current_page);
                setLastPage(res.meta.last_page);
                setTotal(res.meta.total);
            }
        } catch (err) {
            console.error('Failed to load cars', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchCars(1);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, selectedBrand, selectedStatus]);

    const handleCreateCar = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            await apiClient.post('/api/v1/cars', {
                name: {
                    ar: form.name_ar,
                    en: form.name_en || form.name_ar,
                },
                brand_id: Number(form.brand_id),
                year: Number(form.year),
                cash_price: Number(form.cash_price),
                min_down_payment: Number(form.min_down_payment || 0),
                min_installment: Number(form.min_installment || 0),
                type: form.type,
                availability_status: form.availability_status,
                is_active: form.is_active,
                is_featured: form.is_featured,
            });

            setIsCreateOpen(false);
            setForm({
                name_ar: '',
                name_en: '',
                brand_id: '',
                year: new Date().getFullYear(),
                cash_price: '',
                min_down_payment: '0',
                min_installment: '0',
                type: 'sedan',
                availability_status: 'available',
                is_active: true,
                is_featured: false,
            });
            fetchCars(1);
        } catch (err: any) {
            setFormError(err.message || 'حدث خطأ أثناء حفظ بيانات السيارة');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCar = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه السيارة؟')) return;
        try {
            await apiClient.delete(`/api/v1/cars/${id}`);
            setCars((prev) => prev.filter((c) => c.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
        } catch (err: any) {
            alert(err.message || 'فشل حذف السيارة');
        }
    };

    const handleToggleActive = async (car: CarItem) => {
        try {
            const nextActive = !car.is_active;
            await apiClient.put(`/api/v1/cars/${car.id}`, {
                is_active: nextActive,
            });
            setCars((prev) =>
                prev.map((c) => (c.id === car.id ? { ...c, is_active: nextActive } : c))
            );
        } catch (err: any) {
            alert(err.message || 'فشل تعديل حالة السيارة');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <CarIcon className="h-6 w-6 text-indigo-600" />
                        كتالوج السيارات
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        إدارة أسطول ومعروضات السيارات وتحديث الأسعار والأقساط الشهرية ({total} سيارة مسجلة)
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        إضافة سيارة جديدة
                    </Button>
                )}
            </div>

            {/* Filter Bar */}
            <Card orientation="vertical" size="sm">
                <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 relative">
                        <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="بحث باسم السيارة أو الموديل أو الفئة..."
                            className="w-full ps-9 pe-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                        />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor={brandSelectId} className="sr-only">الماركة / الشركة</label>
                        <select
                            id={brandSelectId}
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            aria-label="الماركة / الشركة"
                            className="w-full py-2 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700"
                        >
                            <option value="all">جميع الماركات</option>
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor={statusSelectId} className="sr-only">حالة العرض</label>
                        <select
                            id={statusSelectId}
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            aria-label="حالة العرض"
                            className="w-full py-2 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700"
                        >
                            <option value="all">جميع الحالات</option>
                            <option value="active">مفعلة بالموقع</option>
                            <option value="inactive">معطلة / مخفية</option>
                        </select>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setSearch('');
                                setSelectedBrand('all');
                                setSelectedStatus('all');
                            }}
                            title="إعادة تعيين الفلاتر"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Cars Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-64 rounded-xl bg-slate-200/70 animate-pulse" />
                    ))}
                </div>
            ) : cars.length === 0 ? (
                <Card orientation="vertical" className="text-center py-12">
                    <CarIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-800">لا توجد سيارات مطابقة</h3>
                    <p className="text-sm text-slate-500 mt-1">جرب تغيير معايير البحث أو إضافة سيارة جديدة للكتالوج</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cars.map((car) => (
                        <div
                            key={car.id}
                            className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                        >
                            {/* Card Media Header */}
                            <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden group">
                                {car.thumbnail ? (
                                    <img
                                        src={car.thumbnail}
                                        alt={car.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <CarIcon className="h-16 w-16 text-slate-300" />
                                )}

                                {/* Top Badges */}
                                <div className="absolute top-2 start-2 flex items-center gap-1.5">
                                    {car.is_featured && (
                                        <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                            <Star className="h-3 w-3 fill-current" /> مميزة
                                        </span>
                                    )}
                                    {car.is_highlighted && (
                                        <span className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                            <Sparkles className="h-3 w-3" /> عرض خاص
                                        </span>
                                    )}
                                </div>

                                <div className="absolute top-2 end-2">
                                    <Badge variant={car.is_active ? 'success' : 'neutral'}>
                                        {car.is_active ? 'معروضة' : 'مخفية'}
                                    </Badge>
                                </div>

                                <div className="absolute bottom-2 start-2 bg-slate-900/70 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded font-medium">
                                    {car.year}
                                </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                        <span>{car.brand?.name || 'ماركة غير محددة'}</span>
                                        {car.category && <span>{car.category.name}</span>}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base line-clamp-1 mb-2">
                                        {car.name}
                                    </h3>

                                    {/* Pricing breakdown */}
                                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 mb-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">سعر الكاش:</span>
                                            <span className="font-bold text-slate-900">
                                                {Number(car.cash_price).toLocaleString()} ر.س
                                            </span>
                                        </div>
                                        {Number(car.min_installment) > 0 && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-indigo-600 font-medium">القسط الشهري يبدأ:</span>
                                                <span className="font-bold text-indigo-700">
                                                    {Number(car.min_installment).toLocaleString()} ر.س
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <button
                                        onClick={() => handleToggleActive(car)}
                                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                                            car.is_active
                                                ? 'text-amber-700 hover:bg-amber-50'
                                                : 'text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                    >
                                        {car.is_active ? 'تعطيل العرض' : 'تفعيل العرض'}
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {canManage && (
                                            <button
                                                onClick={() => handleDeleteCar(car.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="حذف السيارة"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-600">
                        صفحة {page} من {lastPage}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => fetchCars(page - 1)}
                        >
                            السابق
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page >= lastPage}
                            onClick={() => fetchCars(page + 1)}
                        >
                            التالي
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Car Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">إضافة سيارة جديدة للكتالوج</h2>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCar} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        اسم السيارة بالعربية *
                                    </label>
                                    <Input
                                        required
                                        value={form.name_ar}
                                        onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                                        placeholder="مثال: تويوتا كامري GLE 2026"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        الاسم بالإنجليزية
                                    </label>
                                    <Input
                                        value={form.name_en}
                                        onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                                        placeholder="Toyota Camry GLE 2026"
                                    />
                                </div>

                                <div>
                                    <label htmlFor={modalBrandSelectId} className="block text-xs font-semibold text-slate-700 mb-1">
                                        الماركة / الشركة *
                                    </label>
                                    <select
                                        id={modalBrandSelectId}
                                        required
                                        value={form.brand_id}
                                        onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="">اختر الماركة</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        سنة الصنع *
                                    </label>
                                    <Input
                                        type="number"
                                        required
                                        value={form.year}
                                        onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        سعر الكاش (ر.س) *
                                    </label>
                                    <Input
                                        type="number"
                                        required
                                        value={form.cash_price}
                                        onChange={(e) => setForm({ ...form, cash_price: e.target.value })}
                                        placeholder="125000"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        أقل قسط شهري (ر.س)
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.min_installment}
                                        onChange={(e) => setForm({ ...form, min_installment: e.target.value })}
                                        placeholder="1450"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        أقل دفعة أولى (ر.س)
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.min_down_payment}
                                        onChange={(e) => setForm({ ...form, min_down_payment: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        حالة التوفر
                                    </label>
                                    <select
                                        value={form.availability_status}
                                        onChange={(e) => setForm({ ...form, availability_status: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="available">متوفر للتسليم</option>
                                        <option value="limited">كمية محدودة</option>
                                        <option value="pre_order">طلب مسبق</option>
                                        <option value="out_of_stock">نفذت الكمية</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-3">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    تفعيل وعرض في الموقع فوراً
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={form.is_featured}
                                        onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                                    />
                                    تمييز كسيارة مميزة في الصفحة الرئيسية
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsCreateOpen(false)}
                                    disabled={saving}
                                >
                                    إلغاء
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'جاري الحفظ...' : 'حفظ السيارة'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
