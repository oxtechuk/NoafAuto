import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Car as CarIcon,
    ArrowRight,
    ArrowLeft,
    Save,
    FileText,
    Palette,
    AlertCircle,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Card } from '../../shared/components/ui/Card';
import { Button } from '../../shared/components/ui/Button';
import { Input } from '../../shared/components/ui/Input';
import { ImageDropzone, type ExistingImage } from '../../shared/components/crm/ImageDropzone';
import { ColorVariantsBuilder, type ColorVariant } from '../../shared/components/crm/ColorVariantsBuilder';
import { ChecklistSelector } from '../../shared/components/crm/ChecklistSelector';
import { SearchableSelect } from '../../shared/components/crm/SearchableSelect';

const QUICK_TRIMS = ['ستاندر', 'نص فل', 'فل كامل', 'سبورت', 'VIP'];

export const CarFormPage: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const isEn = i18n.language === 'en';
    const { id } = useParams<{ id?: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'details' | 'media_colors'>('details');
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

    // Quick-create handlers
    const handleQuickCreateBrand = async (ar: string, en?: string) => {
        const res = await apiClient.post('/brands', {
            name: { ar, en: en || ar },
            is_active: true,
        });
        const created = res.data?.data;
        await queryClient.invalidateQueries({ queryKey: ['admin', 'cars', 'meta-options'] });
        if (created?.id) {
            setBrandId(String(created.id));
            setCarModelId('');
        }
    };

    const handleQuickCreateModel = async (ar: string, en?: string) => {
        if (!brandId) return;
        const res = await apiClient.post('/catalog/models', {
            brand_id: Number(brandId),
            name: { ar, en: en || ar },
            is_active: true,
        });
        const created = res.data?.data;
        const modelsRes = await apiClient.get(`/brands/${brandId}/models`);
        setBrandModels(modelsRes.data?.data || []);
        if (created?.id) {
            setCarModelId(String(created.id));
        }
    };

    const handleQuickCreateCategory = async (ar: string, en?: string) => {
        const res = await apiClient.post('/catalog/categories', {
            name: { ar, en: en || ar },
            is_active: true,
        });
        const created = res.data?.data;
        await queryClient.invalidateQueries({ queryKey: ['admin', 'cars', 'meta-options'] });
        if (created?.id) {
            setCategoryId(String(created.id));
        }
    };

    const handleQuickCreateCarType = async (ar: string, en?: string) => {
        const res = await apiClient.post('/catalog/types', {
            name: { ar, en: en || ar },
            is_active: true,
        });
        const created = res.data?.data;
        await queryClient.invalidateQueries({ queryKey: ['admin', 'cars', 'meta-options'] });
        if (created?.slug) {
            setType(String(created.slug));
        }
    };

    const handleQuickCreateChecklistItem = async (
        endpoint: '/catalog/specs' | '/catalog/features' | '/catalog/safety',
        ar: string,
        setter: React.Dispatch<React.SetStateAction<number[]>>
    ) => {
        const res = await apiClient.post(endpoint, { name: { ar, en: ar } });
        const created = res.data?.data;
        await queryClient.invalidateQueries({ queryKey: ['admin', 'cars', 'meta-options'] });
        if (created?.id) {
            setter((prev) => Array.from(new Set([...prev, Number(created.id)])));
        }
    };

    // Delete single existing gallery image
    const handleDeleteImage = async (imageId: number) => {
        if (!window.confirm(t('car_form.confirm_delete_image'))) return;
        await apiClient.delete(`/cars/images/${imageId}`);
        setExistingInterior((prev) => prev.filter((img) => img.id !== imageId));
        setExistingExterior((prev) => prev.filter((img) => img.id !== imageId));
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameAr.trim() || !brandId || !cashPrice) {
            setActiveTab('details');
            setErrorMessage(t('car_form.required_tab1_error'));
            return;
        }

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

    const bodyTypeOptions = [
        { value: 'sedan', label: 'سيدان (Sedan)' },
        { value: 'suv', label: 'دفع رباعي / عائلية (SUV)' },
        { value: 'coupe', label: 'كوبيه (Coupe)' },
        { value: 'hatchback', label: 'هاتشباك (Hatchback)' },
        { value: 'pickup', label: 'بيك أب (Pickup / Truck)' },
        ...carTypes.map((ct: any) => ({ value: String(ct.slug), label: ct.name })),
    ];

    const tabs = [
        { id: 'details', label: t('car_form.tab_details'), icon: FileText },
        { id: 'media_colors', label: t('car_form.tab_media_colors'), icon: Palette },
    ] as const;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/cars"
                        className="p-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--tenant-primary)] hover:border-[var(--tenant-primary)]/40 transition-colors"
                        title={t('car_form.back_to_cars')}
                    >
                        <ArrowRight className={`h-5 w-5 ${isEn ? 'rotate-180' : ''}`} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <CarIcon className="h-6 w-6 text-[var(--tenant-primary)]" />
                            {isEdit ? t('car_form.edit_title', { name: nameAr || '' }) : t('car_form.create_title')}
                        </h1>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {isEdit ? t('car_form.edit_subtitle') : t('car_form.create_subtitle')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/admin/cars')}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={submitting}
                        className="px-6"
                    >
                        <Save className="h-4 w-4 me-1.5" />
                        {isEdit ? t('common.save_changes') : t('car_form.add_car')}
                    </Button>
                </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--status-danger-bg)] border border-[var(--status-danger)]/20 text-xs text-[var(--status-danger)] flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">{t('car_form.save_error_title')}</p>
                        <p className="mt-0.5">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* 2-Tab Navigation */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-1.5 grid grid-cols-2 gap-1.5 shadow-[var(--shadow-xs)]">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActiveTab = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
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

            {/* TAB 1: All Text Inputs, Pricing & Selections */}
            {activeTab === 'details' && (
                <div className="space-y-6">
                    <Card title={t('car_form.card_basic')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label={t('car_form.name_ar')}
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                placeholder={t('car_form.name_ar_ph')}
                                required
                            />
                            <Input
                                label={t('car_form.name_en')}
                                value={nameEn}
                                onChange={(e) => setNameEn(e.target.value)}
                                placeholder="Toyota Land Cruiser VXR"
                                dir="ltr"
                            />

                            <SearchableSelect
                                label={t('car_form.brand')}
                                required
                                placeholder={t('car_form.brand_ph')}
                                searchPlaceholder={t('car_form.brand_search')}
                                options={brands.map((b: any) => ({ value: String(b.id), label: b.name }))}
                                value={brandId}
                                onChange={(val) => {
                                    setBrandId(val);
                                    setCarModelId('');
                                }}
                                onQuickCreate={handleQuickCreateBrand}
                                quickCreateLabel={t('car_form.new_brand')}
                            />

                            <SearchableSelect
                                label={t('car_form.model')}
                                disabled={!brandId}
                                placeholder={brandId ? t('car_form.model_ph') : t('car_form.model_need_brand')}
                                searchPlaceholder={t('car_form.model_search')}
                                options={brandModels.map((m: any) => ({ value: String(m.id), label: m.name }))}
                                value={carModelId}
                                onChange={setCarModelId}
                                onQuickCreate={brandId ? handleQuickCreateModel : undefined}
                                quickCreateLabel={t('car_form.new_model')}
                            />

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    {t('car_form.year')}
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

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    {t('car_form.availability')}
                                </label>
                                <select
                                    value={availabilityStatus}
                                    onChange={(e) => setAvailabilityStatus(e.target.value)}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="available">{t('car_form.avail_available')}</option>
                                    <option value="on_request">{t('car_form.avail_on_request')}</option>
                                    <option value="order_now">{t('car_form.avail_order_now')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    {t('car_form.desc_ar')}
                                </label>
                                <textarea
                                    rows={3}
                                    value={descriptionAr}
                                    onChange={(e) => setDescriptionAr(e.target.value)}
                                    placeholder={t('car_form.desc_ar_ph')}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    {t('car_form.desc_en')}
                                </label>
                                <textarea
                                    rows={3}
                                    value={descriptionEn}
                                    onChange={(e) => setDescriptionEn(e.target.value)}
                                    placeholder="Enter vehicle description in English..."
                                    dir="ltr"
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title={t('car_form.card_pricing')}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label={t('car_form.cash_price')}
                                type="number"
                                value={cashPrice}
                                onChange={(e) => setCashPrice(e.target.value)}
                                placeholder="150000"
                                required
                            />
                            <Input
                                label={t('car_form.min_down')}
                                type="number"
                                value={minDownPayment}
                                onChange={(e) => setMinDownPayment(e.target.value)}
                                placeholder="0"
                            />
                            <Input
                                label={t('car_form.min_installment')}
                                type="number"
                                value={minInstallment}
                                onChange={(e) => setMinInstallment(e.target.value)}
                                placeholder="1850"
                            />
                        </div>

                        <div className="mt-4 pt-4 border-t border-[var(--border-default)] grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                                    {t('car_form.highlight_badge')}
                                </label>
                                <select
                                    value={isHighlighted}
                                    onChange={(e) => setIsHighlighted(e.target.value)}
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                >
                                    <option value="none">{t('car_form.badge_none')}</option>
                                    <option value="new_arrival">{t('car_form.badge_new')}</option>
                                    <option value="featured">{t('car_form.badge_featured')}</option>
                                    <option value="trending">{t('car_form.badge_trending')}</option>
                                    <option value="exclusive">{t('car_form.badge_exclusive')}</option>
                                </select>
                            </div>
                            <Input
                                label={t('car_form.badge_color')}
                                value={badgeColor}
                                onChange={(e) => setBadgeColor(e.target.value)}
                                placeholder="#D5F52B"
                                dir="ltr"
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="h-4 w-4 rounded-[var(--radius-sm)] text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
                                />
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-primary)]">{t('car_form.is_active')}</p>
                                    <p className="text-[11px] text-[var(--text-muted)]">{t('car_form.is_active_hint')}</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isFeatured}
                                    onChange={(e) => setIsFeatured(e.target.checked)}
                                    className="h-4 w-4 rounded-[var(--radius-sm)] text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
                                />
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-primary)]">{t('car_form.is_featured')}</p>
                                    <p className="text-[11px] text-[var(--text-muted)]">{t('car_form.is_featured_hint')}</p>
                                </div>
                            </label>
                        </div>
                    </Card>

                    <Card title={t('car_form.card_specs')}>
                        <div className="space-y-6">
                            <ChecklistSelector
                                title={t('car_form.specs_title')}
                                items={specifications}
                                selectedIds={selectedSpecs}
                                onChange={setSelectedSpecs}
                                onQuickCreate={(name) => handleQuickCreateChecklistItem('/catalog/specs', name, setSelectedSpecs)}
                            />

                            <div className="border-t border-[var(--border-default)] pt-5">
                                <ChecklistSelector
                                    title={t('car_form.features_title')}
                                    items={features}
                                    selectedIds={selectedFeatures}
                                    onChange={setSelectedFeatures}
                                    onQuickCreate={(name) => handleQuickCreateChecklistItem('/catalog/features', name, setSelectedFeatures)}
                                />
                            </div>

                            <div className="border-t border-[var(--border-default)] pt-5">
                                <ChecklistSelector
                                    title={t('car_form.safety_title')}
                                    items={safetyFeatures}
                                    selectedIds={selectedSafety}
                                    onChange={setSelectedSafety}
                                    onQuickCreate={(name) => handleQuickCreateChecklistItem('/catalog/safety', name, setSelectedSafety)}
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 2: Colors, Images & Car Category */}
            {activeTab === 'media_colors' && (
                <div className="space-y-6">
                    <Card title={t('car_form.card_category')}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Input
                                    label={t('car_form.trim')}
                                    value={modelVariant}
                                    onChange={(e) => setModelVariant(e.target.value)}
                                    placeholder={t('car_form.trim_ph')}
                                />
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {QUICK_TRIMS.map((trim) => (
                                        <button
                                            key={trim}
                                            type="button"
                                            onClick={() => setModelVariant(trim)}
                                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${
                                                modelVariant === trim
                                                    ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-white'
                                                    : 'border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-[var(--tenant-primary)]'
                                            }`}
                                        >
                                            {trim}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <SearchableSelect
                                label={t('car_form.body_type')}
                                placeholder={t('car_form.body_type_ph')}
                                searchPlaceholder={t('car_form.body_type_search')}
                                options={bodyTypeOptions}
                                value={type}
                                onChange={setType}
                                onQuickCreate={handleQuickCreateCarType}
                                quickCreateLabel={t('car_form.new_body_type')}
                            />

                            <SearchableSelect
                                label={t('car_form.category')}
                                placeholder={t('car_form.category_ph')}
                                searchPlaceholder={t('car_form.category_search')}
                                options={categories.map((c: any) => ({ value: String(c.id), label: c.name }))}
                                value={categoryId}
                                onChange={setCategoryId}
                                onQuickCreate={handleQuickCreateCategory}
                                quickCreateLabel={t('car_form.new_category')}
                            />
                        </div>
                    </Card>

                    <Card title={t('car_form.card_colors')}>
                        <ColorVariantsBuilder
                            colors={colors}
                            onChange={setColors}
                        />
                    </Card>

                    <Card title={t('car_form.card_thumbnail')}>
                        {existingThumbnail ? (
                            <div className="mb-4">
                                <p className="text-[11px] text-[var(--text-muted)] mb-2">{t('car_form.current_thumb')}</p>
                                <div className="h-32 w-52 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)]">
                                    <img
                                        src={existingThumbnail}
                                        alt="Thumbnail"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            if (!target.dataset.fallback) {
                                                target.dataset.fallback = 'true';
                                                target.src = '/storage/settings/tjJk5THeSKGpLVocAHCqqSvhy9S055LxICF8iXEU.webp';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <p className="text-[11px] text-[var(--text-muted)] mb-2">{t('car_form.default_thumb')}</p>
                                <div className="h-32 w-52 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)]">
                                    <img src="/storage/settings/tjJk5THeSKGpLVocAHCqqSvhy9S055LxICF8iXEU.webp" alt="Default Car" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        )}
                        <ImageDropzone
                            label={t('car_form.upload_thumb')}
                            description={t('car_form.upload_thumb_desc')}
                            multiple={false}
                            onFilesSelected={(files) => setThumbnailFile(files[0] || null)}
                        />
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title={t('car_form.card_exterior')}>
                            <ImageDropzone
                                description={t('car_form.exterior_desc')}
                                multiple={true}
                                existingImages={existingExterior}
                                onDeleteExisting={handleDeleteImage}
                                onFilesSelected={setExteriorFiles}
                            />
                        </Card>

                        <Card title={t('car_form.card_interior')}>
                            <ImageDropzone
                                description={t('car_form.interior_desc')}
                                multiple={true}
                                existingImages={existingInterior}
                                onDeleteExisting={handleDeleteImage}
                                onFilesSelected={setInteriorFiles}
                            />
                        </Card>
                    </div>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 flex items-center justify-between shadow-[var(--shadow-xs)]">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/admin/cars')}
                    >
                        {t('common.cancel')}
                    </Button>
                    {activeTab === 'media_colors' && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab('details')}
                        >
                            <ArrowRight className={`h-4 w-4 me-1 ${isEn ? 'rotate-180' : ''}`} />
                            {t('car_form.prev_step')}
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'details' && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab('media_colors')}
                        >
                            {t('car_form.next_step')}
                            <ArrowLeft className={`h-4 w-4 ms-1 ${isEn ? 'rotate-180' : ''}`} />
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        loading={submitting}
                        className="px-8"
                    >
                        <Save className="h-4 w-4 me-1.5" />
                        {isEdit ? t('common.save_changes') : t('car_form.add_car')}
                    </Button>
                </div>
            </div>
        </form>
    );
};
