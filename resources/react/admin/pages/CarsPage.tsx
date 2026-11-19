import React, { useEffect, useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Car as CarIcon,
    Plus,
    Search,
    Star,
    Sparkles,
    Trash2,
    Edit3,
    Eye,
    RefreshCw,
    LayoutGrid,
    List,
    ExternalLink,
} from 'lucide-react';
import { Card } from '../../shared/components/ui/Card';
import { Badge } from '../../shared/components/ui/Badge';
import { StatusBadge } from '../../shared/components/ui/StatusBadge';
import { Button } from '../../shared/components/ui/Button';
import { Pagination } from '../../shared/components/ui/Pagination';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Brand {
    id: number;
    name: string;
    logo?: string;
}

interface Category {
    id: number;
    name: string;
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
    is_highlighted: string | boolean;
    availability_status: string;
    views: number;
    brand?: { id: number; name: string; logo?: string };
    category?: { id: number; name: string };
    car_model?: { id: number; name: string };
}

const resolveImgSrc = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://localhost/') || url.startsWith('http://127.0.0.1:8000/')) {
        return url.replace(/^https?:\/\/[^\/]+/, '');
    }
    if (!url.startsWith('http') && !url.startsWith('/')) {
        return '/' + url;
    }
    return url;
};

export const CarsPage: React.FC = () => {
    const { can } = useAuth();
    const canManage = can('manage-cars') || true;
    const navigate = useNavigate();

    const brandSelectId = useId();
    const categorySelectId = useId();
    const statusSelectId = useId();

    const [cars, setCars] = useState<CarItem[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchMeta = async () => {
        try {
            const res = await apiClient.get('/cars/meta-options');
            if (res.data?.data) {
                setBrands(res.data.data.brands || []);
                setCategories(res.data.data.categories || []);
            }
        } catch (err) {
            console.error('Failed to load meta options', err);
        }
    };

    const fetchCars = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page: pageNumber, per_page: 12 };
            if (search) params.search = search;
            if (selectedBrand !== 'all') params.brand_id = selectedBrand;
            if (selectedCategory !== 'all') params.category_id = selectedCategory;
            if (selectedStatus !== 'all') params.is_active = selectedStatus === 'active';

            const res = await apiClient.get<any>('/cars', { params });

            const payload = res.data;
            const items: CarItem[] = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                ? payload
                : [];

            setCars(items);
            const meta = payload?.meta;
            if (meta) {
                setPage(meta.current_page || 1);
                setLastPage(meta.last_page || 1);
                setTotal(meta.total ?? items.length);
            } else {
                setPage(1);
                setLastPage(1);
                setTotal(items.length);
            }
        } catch (err) {
            console.error('Failed to load cars', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeta();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchCars(1);
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, selectedBrand, selectedCategory, selectedStatus]);

    const handleDeleteCar = async (id: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه السيارة نهائياً؟')) return;
        try {
            await apiClient.delete(`/cars/${id}`);
            setCars((prev) => prev.filter((c) => c.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
        } catch (err: any) {
            alert(err.message || 'فشل حذف السيارة');
        }
    };

    const handleToggleActive = async (car: CarItem) => {
        try {
            const nextActive = !car.is_active;
            await apiClient.put(`/cars/${car.id}`, {
                is_active: nextActive,
            });
            setCars((prev) =>
                prev.map((c) => (c.id === car.id ? { ...c, is_active: nextActive } : c))
            );
        } catch (err: any) {
            alert(err.message || 'فشل تعديل حالة السيارة');
        }
    };

    const handleToggleFeatured = async (car: CarItem) => {
        try {
            const nextFeatured = !car.is_featured;
            await apiClient.put(`/cars/${car.id}`, {
                is_featured: nextFeatured,
            });
            setCars((prev) =>
                prev.map((c) => (c.id === car.id ? { ...c, is_featured: nextFeatured } : c))
            );
        } catch (err: any) {
            alert(err.message || 'فشل تعديل التمييز');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <CarIcon className="h-6 w-6 text-[var(--tenant-primary)]" />
                        كتالوج السيارات
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        إدارة أسطول ومعروضات السيارات وتحديث الأسعار والأقساط الشهرية ({total} سيارة مسجلة)
                    </p>
                </div>
                {canManage && (
                    <Button
                        variant="primary"
                        onClick={() => navigate('/admin/cars/create')}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        إضافة سيارة جديدة
                    </Button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)]">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-4 relative">
                        <Search className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="بحث باسم السيارة أو الموديل..."
                            className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor={brandSelectId} className="sr-only">الماركة</label>
                        <select
                            id={brandSelectId}
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            className="w-full py-1.5 px-3 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        >
                            <option value="all">كل الماركات</option>
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor={categorySelectId} className="sr-only">التصنيف</label>
                        <select
                            id={categorySelectId}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full py-1.5 px-3 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        >
                            <option value="all">كل التصنيفات</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor={statusSelectId} className="sr-only">حالة العرض</label>
                        <select
                            id={statusSelectId}
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full py-1.5 px-3 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                        >
                            <option value="all">جميع الحالات</option>
                            <option value="active">مفعلة بالموقع</option>
                            <option value="inactive">معطلة / مخفية</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                        {/* View mode toggle */}
                        <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-default)] p-0.5 bg-[var(--surface-secondary)]">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-[var(--surface-primary)] text-[var(--tenant-primary)] shadow-2xs'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                                title="عرض كروت"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                                    viewMode === 'table'
                                        ? 'bg-[var(--surface-primary)] text-[var(--tenant-primary)] shadow-2xs'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                                title="عرض جدول"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                setSelectedBrand('all');
                                setSelectedCategory('all');
                                setSelectedStatus('all');
                            }}
                            title="إعادة تعيين الفلاتر"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content View */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-64 rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] animate-pulse" />
                    ))}
                </div>
            ) : cars.length === 0 ? (
                <Card className="text-center py-16">
                    <CarIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)]">لا توجد سيارات مطابقة</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        جرب تغيير معايير البحث أو إضافة سيارة جديدة للكتالوج
                    </p>
                </Card>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cars.map((car) => (
                        <div
                            key={car.id}
                            className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-xs)] hover:border-[var(--tenant-primary)]/40 transition-all overflow-hidden flex flex-col justify-between"
                        >
                            {/* Card Media Header */}
                            <div className="relative h-44 bg-[var(--surface-secondary)] flex items-center justify-center overflow-hidden group">
                                {car.thumbnail ? (
                                    <img
                                        src={resolveImgSrc(car.thumbnail)}
                                        alt={car.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <CarIcon className="h-14 w-14 text-[var(--text-muted)] opacity-30" />
                                )}

                                {/* Top Badges */}
                                <div className="absolute top-2 start-2 flex items-center gap-1.5">
                                    {car.is_featured && (
                                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                            <Star className="h-3 w-3 fill-current" /> مميزة
                                        </span>
                                    )}
                                    {car.is_highlighted && car.is_highlighted !== 'none' && (
                                        <span className="bg-[var(--tenant-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                            <Sparkles className="h-3 w-3" /> عرض خاص
                                        </span>
                                    )}
                                </div>

                                <div className="absolute top-2 end-2">
                                    <Badge variant={car.is_active ? 'primary' : 'neutral'}>
                                        {car.is_active ? 'معروضة' : 'مخفية'}
                                    </Badge>
                                </div>

                                <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-[var(--radius-sm)] font-medium">
                                    {car.year}
                                </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
                                        <span>{car.brand?.name || 'ماركة غير محددة'}</span>
                                        {car.category && <span>{car.category.name}</span>}
                                    </div>
                                    <h3 className="font-bold text-[var(--text-primary)] text-sm line-clamp-1 mb-2">
                                        {car.name}
                                    </h3>

                                    {/* Pricing breakdown */}
                                    <div className="bg-[var(--surface-secondary)] rounded-[var(--radius-md)] p-2.5 space-y-1 mb-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-[var(--text-secondary)]">سعر الكاش:</span>
                                            <span className="font-bold text-[var(--text-primary)]">
                                                {Number(car.cash_price).toLocaleString()} ر.س
                                            </span>
                                        </div>
                                        {Number(car.min_installment) > 0 && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-[var(--text-secondary)]">القسط الشهري:</span>
                                                <span className="font-bold text-[var(--status-success)]">
                                                    {Number(car.min_installment).toLocaleString()} ر.س
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(car)}
                                            className={`text-[11px] font-semibold px-2 py-1 rounded-[var(--radius-sm)] transition-colors ${
                                                car.is_active
                                                    ? 'text-[var(--text-muted)] hover:text-rose-600'
                                                    : 'text-[var(--status-success)] hover:underline'
                                            }`}
                                        >
                                            {car.is_active ? 'تعطيل' : 'تفعيل'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleFeatured(car)}
                                            className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                                                car.is_featured
                                                    ? 'text-amber-500 hover:text-slate-400'
                                                    : 'text-[var(--text-muted)] hover:text-amber-500'
                                            }`}
                                            title="تبديل التمييز"
                                        >
                                            <Star className="h-4 w-4 fill-current" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {car.slug && (
                                            <a
                                                href={`/cars/${car.slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--tenant-primary)] hover:bg-[var(--surface-secondary)]"
                                                title="معاينة في المتجر"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                        <Link
                                            to={`/admin/cars/${car.id}/edit`}
                                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--tenant-primary)] hover:bg-[var(--surface-secondary)]"
                                            title="تعديل السيارة"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCar(car.id)}
                                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]"
                                            title="حذف السيارة"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <Card className="p-0 overflow-hidden" padding="none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                            <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-default)]">
                                <tr>
                                    <th className="py-3 px-4 text-start">السيارة</th>
                                    <th className="py-3 px-4 text-start">الماركة / الفئة</th>
                                    <th className="py-3 px-4 text-start">سنة الصنع</th>
                                    <th className="py-3 px-4 text-start">سعر الكاش</th>
                                    <th className="py-3 px-4 text-start">القسط الشهري</th>
                                    <th className="py-3 px-4 text-start">الحالة</th>
                                    <th className="py-3 px-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                                {cars.map((car) => (
                                    <tr key={car.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-14 rounded-[var(--radius-sm)] overflow-hidden bg-[var(--surface-secondary)] shrink-0 border border-[var(--border-default)]">
                                                    {car.thumbnail ? (
                                                        <img
                                                            src={resolveImgSrc(car.thumbnail)}
                                                            alt={car.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <CarIcon className="h-5 w-5 text-[var(--text-muted)] m-auto mt-2.5 opacity-40" />
                                                    )}
                                                </div>
                                                <span className="font-semibold text-[var(--text-primary)]">{car.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span>{car.brand?.name || '-'}</span>
                                            {car.category && <span className="text-[var(--text-muted)] block">{car.category.name}</span>}
                                        </td>
                                        <td className="py-3 px-4 font-mono">{car.year}</td>
                                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                                            {Number(car.cash_price).toLocaleString()} ر.س
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[var(--status-success)]">
                                            {Number(car.min_installment) > 0 ? `${Number(car.min_installment).toLocaleString()} ر.س` : '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant={car.is_active ? 'primary' : 'neutral'}>
                                                {car.is_active ? 'معروضة' : 'مخفية'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link
                                                    to={`/admin/cars/${car.id}/edit`}
                                                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--tenant-primary)] hover:bg-[var(--surface-secondary)]"
                                                    title="تعديل"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCar(car.id)}
                                                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex justify-center pt-2">
                    <Pagination
                        currentPage={page}
                        lastPage={lastPage}
                        onPageChange={(p) => fetchCars(p)}
                    />
                </div>
            )}
        </div>
    );
};
