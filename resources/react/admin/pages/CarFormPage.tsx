import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Car as CarIcon,
    ArrowRight,
    Save,
    Info,
    DollarSign,
    Sliders,
    Palette,
    Images,
    CheckCircle2,
    AlertCircle,
    Eye,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { Input } from '../../shared/components/ui/Input';
import { ImageDropzone, type ExistingImage } from '../../shared/components/crm/ImageDropzone';
import { ColorVariantsBuilder, type ColorVariant } from '../../shared/components/crm/ColorVariantsBuilder';
import { ChecklistSelector } from '../../shared/components/crm/ChecklistSelector';

export const CarFormPage: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'specs' | 'colors' | 'media'>('general');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form fields state
    const [nameAr, setNameAr] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [brandId, setBrandId] = useState('');
    const [carModelId, setCarModelId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [type, setType] = useState('sedan');
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [modelVariant, setModelVariant] = useState('');
    const [descriptionAr, setDescriptionAr] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [availabilityStatus, setAvailabilityStatus] = useState('available');

    // Pricing & Badges
    const [cashPrice, setCashPrice] = useState('');
    const [minDownPayment, setMinDownPayment] = useState('0');
    const [minInstallment, setMinInstallment] = useState('0');
    const [isHighlighted, setIsHighlighted] = useState('none');
    const [badgeColor, setBadgeColor] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);

    // Relations selections
    const [selectedSpecs, setSelectedSpecs] = useState<number[]>([]);
    const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
    const [selectedSafety, setSelectedSafety] = useState<number[]>([]);
    const [colors, setColors] = useState<ColorVariant[]>([]);

    // Uploaded files
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);
    const [interiorFiles, setInteriorFiles] = useState<File[]>([]);
    const [exteriorFiles, setExteriorFiles] = useState<File[]>([]);
    const [existingInterior, setExistingInterior] = useState<ExistingImage[]>([]);
    const [existingExterior, setExistingExterior] = useState<ExistingImage[]>([]);

    // Available models for currently selected brand
    const [brandModels, setBrandModels] = useState<Array<{ id: number; name: string }>>([]);

    // Fetch Meta Options
    const { data: metaData, isLoading: metaLoading } = useQuery({
        queryKey: ['admin', 'cars', 'meta-options'],
        queryFn: async () => {
            const res = await apiClient.get('/cars/meta-options');
            return res.data?.data;
        },
    });

    // Fetch Car data if Edit mode
    const { data: carData, isLoading: carLoading } = useQuery({
        queryKey: ['admin', 'cars', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await apiClient.get(`/cars/${id}`);
            return res.data?.data;
        },
        enabled: isEdit,
    });

    // Populate form when carData arrives
    useEffect(() => {
        if (!carData) return;

        setNameAr(carData.name_translations?.ar || carData.name || '');
        setNameEn(carData.name_translations?.en || '');
        setBrandId(carData.brand_id ? String(carData.brand_id) : '');
        setCarModelId(carData.car_model_id ? String(carData.car_model_id) : '');
        setCategoryId(carData.category_id ? String(carData.category_id) : '');
        setType(carData.type || 'sedan');
        setYear(carData.year || new Date().getFullYear());
        setModelVariant(carData.model || '');
        setDescriptionAr(carData.description_translations?.ar || carData.description || '');
        setDescriptionEn(carData.description_translations?.en || '');
        setAvailabilityStatus(carData.availability_status || 'available');

        setCashPrice(carData.cash_price ? String(carData.cash_price) : '');
        setMinDownPayment(carData.min_down_payment ? String(carData.min_down_payment) : '0');
        setMinInstallment(carData.min_installment ? String(carData.min_installment) : '0');
        setIsHighlighted(carData.is_highlighted ? String(carData.is_highlighted) : 'none');
        setBadgeColor(carData.badge_color || '');
        setIsActive(Boolean(carData.is_active));
        setIsFeatured(Boolean(carData.is_featured));

        setSelectedSpecs((carData.specifications || []).map(Number));
        setSelectedFeatures((carData.features_list || []).map(Number));
        setSelectedSafety((carData.safety_features || []).map(Number));

        if (Array.isArray(carData.colors)) {
            setColors(carData.colors);
        }

        if (carData.thumbnail) {
            setExistingThumbnail(carData.thumbnail);
        }

        if (Array.isArray(carData.images)) {
            const interior = carData.images
                .filter((img: any) => img.type === 'interior')
                .map((img: any) => ({ id: img.id, url: img.image_path, type: 'interior' }));
            const exterior = carData.images
                .filter((img: any) => img.type === 'exterior')
                .map((img: any) => ({ id: img.id, url: img.image_path, type: 'exterior' }));
            setExistingInterior(interior);
            setExistingExterior(exterior);
        }
    }, [carData]);

    // Load models whenever brand changes
    useEffect(() => {
        if (!brandId) {
            setBrandModels([]);
            return;
        }

        apiClient
            .get(`/brands/${brandId}/models`)
            .then((res) => {
                setBrandModels(res.data?.data || []);
            })
            .catch((err) => {
                console.error('Failed to load brand models', err);
            });
    }, [brandId]);

    // Delete single existing gallery image
    const handleDeleteImage = async (imageId: number) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه الصورة نهائياً؟')) return;
        await apiClient.delete(`/cars/images/${imageId}`);
        setExistingInterior((prev) => prev.filter((img) => img.id !== imageId));
        setExistingExterior((prev) => prev.filter((img) => img.id !== imageId));
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        try {
            const formData = new FormData();

            // Names
            formData.append('name[ar]', nameAr);
            formData.append('name[en]', nameEn || nameAr);

            // General fields
            if (brandId) formData.append('brand_id', brandId);
            if (carModelId) formData.append('car_model_id', carModelId);
            if (categoryId) formData.append('category_id', categoryId);
            formData.append('type', type);
            formData.append('year', String(year));
            if (modelVariant) formData.append('model', modelVariant);

            // Descriptions
            if (descriptionAr) formData.append('description[ar]', descriptionAr);
            if (descriptionEn) formData.append('description[en]', descriptionEn);
            formData.append('availability_status', availabilityStatus);

            // Pricing
            formData.append('cash_price', cashPrice || '0');
            formData.append('min_down_payment', minDownPayment || '0');
            formData.append('min_installment', minInstallment || '0');
            formData.append('is_highlighted', isHighlighted);
            if (badgeColor) formData.append('badge_color', badgeColor);
            formData.append('is_active', isActive ? '1' : '0');
            formData.append('is_featured', isFeatured ? '1' : '0');

            // Relations
            selectedSpecs.forEach((specId, idx) => {
                formData.append(`specifications[${idx}]`, String(specId));
            });
            selectedFeatures.forEach((featId, idx) => {
                formData.append(`features_list[${idx}]`, String(featId));
            });
            selectedSafety.forEach((safeId, idx) => {
                formData.append(`safety_features[${idx}]`, String(safeId));
            });

            // Colors
            colors.forEach((col, idx) => {
                formData.append(`color_names[${idx}]`, col.name);
                formData.append(`color_hexes[${idx}]`, col.hex || '#000000');
                if (col.imageFile) {
                    formData.append(`color_images[${idx}]`, col.imageFile);
                }
            });

            // Thumbnail
            if (thumbnailFile) {
                formData.append('thumbnail', thumbnailFile);
            }

            // Interior images
            interiorFiles.forEach((file) => {
                formData.append('interior_images[]', file);
            });

            // Exterior images
            exteriorFiles.forEach((file) => {
                formData.append('exterior_images[]', file);
            });

            if (isEdit) {
                formData.append('_method', 'PUT');
                await apiClient.post(`/cars/${id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await apiClient.post('/cars', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            queryClient.invalidateQueries({ queryKey: ['admin', 'cars'] });
            navigate('/admin/cars');
        } catch (err: any) {
            console.error('Save car error', err);
            let msg = 'حدث خطأ أثناء حفظ السيارة. يرجى مراجعة البيانات المدخلة.';
            if (err.response?.data?.errors && typeof err.response.data.errors === 'object') {
                msg = Object.values(err.response.data.errors).flat().join(' | ');
            } else if (err.response?.data?.message) {
                msg = err.response.data.message;
            } else if (err.message) {
                msg = err.message;
            }
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (metaLoading || (isEdit && carLoading)) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--tenant-primary)] mb-4"></div>
                <p className="text-xs text-[var(--text-muted)]">جاري تحميل بيانات السيارة والمواصفات...</p>
            </div>
        );
    }

    const brands = metaData?.brands || [];
    const categories = metaData?.categories || [];
    const carTypes = metaData?.car_types || [];
    const specifications = metaData?.specifications || [];
    const features = metaData?.features || [];
    const safetyFeatures = metaData?.safety_features || [];

    const tabs = [
        { id: 'general', label: 'البيانات الأساسية', icon: Info },
        { id: 'pricing', label: 'التسعير والتمويل', icon: DollarSign },
        { id: 'specs', label: 'المواصفات والكماليات', icon: Sliders },
        { id: 'colors', label: 'خيارات الألوان', icon: Palette },
        { id: 'media', label: 'الصور والمعرض', icon: Images },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/cars"
                        className="p-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--tenant-primary)] hover:border-[var(--tenant-primary)]/40 transition-colors"
                        title="العودة لكتالوج السيارات"
                    >
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <CarIcon className="h-6 w-6 text-[var(--tenant-primary)]" />
                            {isEdit ? `تعديل السيارة: ${nameAr || 'السيارة'}` : 'إضافة سيارة جديدة للمنصة'}
                        </h1>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {isEdit
                                ? 'قم بتحديث مواصفات وصور وتفاصيل السيارة'
                                : 'أدخل البيانات الكاملة للسيارة لعرضها في المتجر للعملاء'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/admin/cars')}
                    >
                        إلغاء
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={submitting}
                        className="px-6"
                    >
                        <Save className="h-4 w-4 me-1.5" />
                        {isEdit ? 'حفظ التعديلات' : 'إضافة السيارة'}
                    </Button>
                </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--status-danger-bg)] border border-[var(--status-danger)]/20 text-xs text-[var(--status-danger)] flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">تعذر حفظ بيانات السيارة:</p>
                        <p className="mt-0.5">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Tabs Header */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-1.5 flex items-center gap-1 overflow-x-auto shadow-[var(--shadow-xs)]">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActiveTab = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-semibold whitespace-nowrap transition-all ${
                                isActiveTab
                                    ? 'bg-[var(--tenant-primary)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab 1: General Info */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <Card title="بيانات الهوية والموديل">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="اسم السيارة بالعربية *"
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                placeholder="مثال: تويوتا لاندكروزر VXR"
                                required
                            />
                            <Input
                                label="اسم السيارة بالإنجليزية"
                                value={nameEn}
                                onChange={(e) => setNameEn(e.target.value)}
                                placeholder="مثال: Toyota Land Cruiser VXR"
                                dir="ltr"
                            />

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    الماركة / الشركة المصنعة *
                                </label>
                                <select
                                    value={brandId}
                                    onChange={(e) => {
                                        setBrandId(e.target.value);
                                        setCarModelId('');
                                    }}
                                    required
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="">-- اختر الماركة --</option>
                                    {brands.map((b: any) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    الموديل (Car Model)
                                </label>
                                <select
                                    value={carModelId}
                                    onChange={(e) => setCarModelId(e.target.value)}
                                    disabled={!brandId}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)] disabled:opacity-50"
                                >
                                    <option value="">
                                        {brandId ? '-- اختر الموديل --' : '-- اختر الماركة أولاً --'}
                                    </option>
                                    {brandModels.map((m: any) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    سنة الصنع *
                                </label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(Number(e.target.value))}
                                    required
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    {Array.from({ length: 15 }).map((_, i) => {
                                        const y = new Date().getFullYear() + 1 - i;
                                        return (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <Input
                                label="الفئة / الطراز (Model Trim)"
                                value={modelVariant}
                                onChange={(e) => setModelVariant(e.target.value)}
                                placeholder="مثال: فل كامل / Premium Edition"
                            />

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    نوع الهيكل
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="sedan">سيدان (Sedan)</option>
                                    <option value="suv">دفع رباعي / عائلية (SUV)</option>
                                    <option value="coupe">كوبيه (Coupe)</option>
                                    <option value="hatchback">هاتشباك (Hatchback)</option>
                                    <option value="pickup">بيك أب (Pickup / Truck)</option>
                                    {carTypes.map((ct: any) => (
                                        <option key={ct.id} value={ct.slug}>
                                            {ct.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    التصنيف (Category)
                                </label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="">-- بدون تصنيف محدد --</option>
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    حالة التوفر
                                </label>
                                <select
                                    value={availabilityStatus}
                                    onChange={(e) => setAvailabilityStatus(e.target.value)}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="available">متوفرة للتسليم الفوري</option>
                                    <option value="on_request">متوفرة عند الطلب</option>
                                    <option value="order_now">حجز مسبق</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    الوصف التعريفي (بالعربية)
                                </label>
                                <textarea
                                    rows={4}
                                    value={descriptionAr}
                                    onChange={(e) => setDescriptionAr(e.target.value)}
                                    placeholder="اكتب نبذة عامة ومميزات السيارة لزوار الموقع..."
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    الوصف التعريفي (بالإنجليزية)
                                </label>
                                <textarea
                                    rows={4}
                                    value={descriptionEn}
                                    onChange={(e) => setDescriptionEn(e.target.value)}
                                    placeholder="Enter vehicle description in English..."
                                    dir="ltr"
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab 2: Pricing & Finance */}
            {activeTab === 'pricing' && (
                <div className="space-y-6">
                    <Card title="أسعار السيارة وشروط التمويل">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="سعر الكاش الإجمالي (ر.س) *"
                                type="number"
                                value={cashPrice}
                                onChange={(e) => setCashPrice(e.target.value)}
                                placeholder="مثال: 150000"
                                required
                            />
                            <Input
                                label="أقل دفعة أولى (ر.س)"
                                type="number"
                                value={minDownPayment}
                                onChange={(e) => setMinDownPayment(e.target.value)}
                                placeholder="0"
                            />
                            <Input
                                label="أقل قسط شهري تقديري (ر.س)"
                                type="number"
                                value={minInstallment}
                                onChange={(e) => setMinInstallment(e.target.value)}
                                placeholder="مثال: 1850"
                            />
                        </div>

                        <div className="mt-6 pt-6 border-t border-[var(--border-default)] grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    الشارة التسويقية البارزة (Highlight Badge)
                                </label>
                                <select
                                    value={isHighlighted}
                                    onChange={(e) => setIsHighlighted(e.target.value)}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="none">بدون شارة</option>
                                    <option value="new_arrival">أحدث السيارات (New Arrival)</option>
                                    <option value="featured">سيارة مختارة (Featured)</option>
                                    <option value="trending">الأكثر طلباً (Trending)</option>
                                    <option value="exclusive">إصدار حصري (Exclusive)</option>
                                </select>
                            </div>

                            <Input
                                label="لون الشارة المخصص (Hex Code)"
                                value={badgeColor}
                                onChange={(e) => setBadgeColor(e.target.value)}
                                placeholder="#D5F52B أو #DC5555"
                                dir="ltr"
                            />
                        </div>
                    </Card>

                    <Card title="إعدادات الظهور والترويج">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="h-4 w-4 rounded-[var(--radius-sm)] text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
                                />
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                                        تفعيل العرض في الموقع (Active)
                                    </p>
                                    <p className="text-[11px] text-[var(--text-muted)]">
                                        عند إلغاء التفعيل ستكون السيارة مخفية عن زوار المتجر
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isFeatured}
                                    onChange={(e) => setIsFeatured(e.target.checked)}
                                    className="h-4 w-4 rounded-[var(--radius-sm)] text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
                                />
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                                        تمييز في الصفحة الرئيسية (Featured Car)
                                    </p>
                                    <p className="text-[11px] text-[var(--text-muted)]">
                                        عرض السيارة في سلايدر السيارات المميزة بالصفحة الرئيسية
                                    </p>
                                </div>
                            </label>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab 3: Specs & Features */}
            {activeTab === 'specs' && (
                <div className="space-y-6">
                    <Card title="المواصفات والتجهيزات التقنية">
                        <div className="space-y-8">
                            <ChecklistSelector
                                title="المواصفات العامة والمحرك"
                                description="اختر المواصفات الميكانيكية والهندسية للسيارة"
                                items={specifications}
                                selectedIds={selectedSpecs}
                                onChange={setSelectedSpecs}
                            />

                            <div className="border-t border-[var(--border-default)] pt-6">
                                <ChecklistSelector
                                    title="المميزات والتجهيزات الداخلية والخارجية"
                                    description="تجهيزات المقصورة، نظام الصوت، والشاشات، والفتحة البانورامية"
                                    items={features}
                                    selectedIds={selectedFeatures}
                                    onChange={setSelectedFeatures}
                                />
                            </div>

                            <div className="border-t border-[var(--border-default)] pt-6">
                                <ChecklistSelector
                                    title="أنظمة السلامة ومساعدة السائق"
                                    description="الوسائد الهوائية، الرادار، الفرملة التلقائية، وكاميرات الرؤية المحيطية"
                                    items={safetyFeatures}
                                    selectedIds={selectedSafety}
                                    onChange={setSelectedSafety}
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab 4: Colors */}
            {activeTab === 'colors' && (
                <div className="space-y-6">
                    <Card title="ألوان السيارة المتاحة للطلب">
                        <ColorVariantsBuilder
                            colors={colors}
                            onChange={setColors}
                        />
                    </Card>
                </div>
            )}

            {/* Tab 5: Media & Gallery */}
            {activeTab === 'media' && (
                <div className="space-y-6">
                    <Card title="الصورة المصغرة الرئيسية (Thumbnail)">
                        {existingThumbnail && (
                            <div className="mb-4">
                                <p className="text-[11px] text-[var(--text-muted)] mb-2">الصورة الرئيسية الحالية:</p>
                                <div className="h-32 w-52 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)]">
                                    <img src={existingThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        )}
                        <ImageDropzone
                            label="تحديث أو رفع الصورة الرئيسية"
                            description="هذه الصورة هي التي ستظهر كغلاف للسيارة في الكتالوج وشبكة العرض"
                            multiple={false}
                            onFilesSelected={(files) => setThumbnailFile(files[0] || null)}
                        />
                    </Card>

                    <Card title="ألبوم الصور الداخلية (Interior Gallery)">
                        <ImageDropzone
                            description="صور المقصورة، المقاعد، لوحة العدادات، والشاشات الداخلية"
                            multiple={true}
                            existingImages={existingInterior}
                            onDeleteExisting={handleDeleteImage}
                            onFilesSelected={setInteriorFiles}
                        />
                    </Card>

                    <Card title="ألبوم الصور الخارجية (Exterior Gallery)">
                        <ImageDropzone
                            description="صور الهيكل من الأمام والخلف والجانبين والجنوط"
                            multiple={true}
                            existingImages={existingExterior}
                            onDeleteExisting={handleDeleteImage}
                            onFilesSelected={setExteriorFiles}
                        />
                    </Card>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 flex items-center justify-between shadow-[var(--shadow-xs)]">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin/cars')}
                >
                    إلغاء والعودة
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    loading={submitting}
                    className="px-8"
                >
                    <Save className="h-4 w-4 me-1.5" />
                    {isEdit ? 'حفظ التعديلات' : 'إضافة السيارة'}
                </Button>
            </div>
        </form>
    );
};
