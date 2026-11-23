import React from 'react';
import { CrudTableManager, formatLocaleString } from '../../../shared/components/crm/CrudTableManager';

// 1. Brands Page
export const BrandsPage: React.FC = () => {
    return (
        <CrudTableManager
            title="الماركات التجارية"
            subtitle="إدارة العلامات التجارية للسيارات، الشعارات، ونوع الماركة"
            endpoint="/api/v1/brands"
            columns={[
                { key: 'logo', title: 'الشعار', type: 'image' },
                { key: 'name', title: 'اسم الماركة' },
                {
                    key: 'brand_type',
                    title: 'نوع الماركة',
                    render: (val, row) => (
                        <span className="text-slate-600">
                            {formatLocaleString(row.brand_type?.name)}
                        </span>
                    ),
                },
                {
                    key: 'cars_count',
                    title: 'السيارات المسجلة',
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">
                            {val ?? 0}
                        </span>
                    ),
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم الماركة', type: 'text', required: true, multilingual: true },
                { name: 'logo', label: 'شعار الماركة', type: 'file' },
                { name: 'is_active', label: 'نشط في المعرض', type: 'switch' },
            ]}
        />
    );
};

// 2. Car Models Page
export const CarModelsPage: React.FC = () => {
    return (
        <CrudTableManager
            title="موديلات السيارات"
            subtitle="إدارة موديلات وطرازات السيارات التابعة لكل ماركة"
            endpoint="/api/v1/catalog/models"
            columns={[
                { key: 'name', title: 'اسم الموديل' },
                {
                    key: 'brand',
                    title: 'الماركة',
                    render: (val, row) => (
                        <div className="flex items-center gap-2">
                            {row.brand?.logo && (
                                <img
                                    src={row.brand.logo}
                                    alt=""
                                    className="h-5 w-5 object-contain"
                                />
                            )}
                            <span className="font-medium text-slate-700">
                                {formatLocaleString(row.brand?.name)}
                            </span>
                        </div>
                    ),
                },
                {
                    key: 'cars_count',
                    title: 'عدد السيارات',
                    render: (val) => (
                        <span className="font-semibold text-slate-700">{val ?? 0}</span>
                    ),
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم الموديل', type: 'text', required: true, multilingual: true },
                { name: 'brand_id', label: 'الماركة التابع لها', type: 'number', required: true, placeholder: 'رقم الماركة (Brand ID)' },
                { name: 'is_active', label: 'تفعيل الموديل', type: 'switch' },
            ]}
        />
    );
};

// 3. Brand Types Page
export const BrandTypesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="أنواع الماركات"
            subtitle="تصنيف الماركات حسب بلد المنشأ (ياباني، كوري، صيني، ألماني...)"
            endpoint="/api/v1/catalog/brand-types"
            columns={[
                { key: 'name', title: 'نوع الماركة' },
                {
                    key: 'brands_count',
                    title: 'عدد الماركات',
                    render: (val) => (
                        <span className="font-semibold text-slate-700">{val ?? 0}</span>
                    ),
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم النوع', type: 'text', required: true, multilingual: true },
                { name: 'sort_order', label: 'الترتيب', type: 'number', placeholder: '0' },
                { name: 'is_active', label: 'مفعل', type: 'switch' },
            ]}
        />
    );
};

// 4. Car Categories Page
export const CarCategoriesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="تصنيفات السيارات"
            subtitle="إدارة فئات وتصنيفات المعرض (عائلي، اقتصادي، فخم، دفع رباعي...)"
            endpoint="/api/v1/catalog/categories"
            columns={[
                { key: 'name', title: 'اسم التصنيف' },
                {
                    key: 'cars_count',
                    title: 'عدد السيارات',
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">{val ?? 0}</span>
                    ),
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم التصنيف', type: 'text', required: true, multilingual: true },
                { name: 'sort_order', label: 'ترتيب الظهور', type: 'number', placeholder: '0' },
                { name: 'is_active', label: 'مفعل في المعرض', type: 'switch' },
            ]}
        />
    );
};

// 5. Car Types Page
export const CarTypesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="أنواع الهياكل"
            subtitle="أنواع هياكل وتصاميم السيارات (سيدان، هاتشباك، كروس أوفر، SUV...)"
            endpoint="/api/v1/catalog/types"
            columns={[
                { key: 'name', title: 'نوع الهيكل' },
                { key: 'slug', title: 'المعرّف (Slug)' },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: 'نوع الهيكل', type: 'text', required: true, multilingual: true },
                { name: 'sort_order', label: 'ترتيب العرض', type: 'number', placeholder: '0' },
                { name: 'is_active', label: 'مفعل', type: 'switch' },
            ]}
        />
    );
};

// 6. Specifications Page
export const SpecsPage: React.FC = () => {
    return (
        <CrudTableManager
            title="المواصفات الفنية"
            subtitle="قائمة المواصفات التقنية والميكانيكية المتاحة للاختيار عند إضافة سيارة"
            endpoint="/api/v1/catalog/specs"
            columns={[
                { key: 'name', title: 'اسم المواصفة' },
                { key: 'icon', title: 'رمز الأيقونة (Icon)' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم المواصفة', type: 'text', required: true, multilingual: true },
                { name: 'icon', label: 'رمز الأيقونة (Lucide icon)', type: 'text', placeholder: 'مثال: gauge, zap, shield' },
            ]}
        />
    );
};

// 7. Features Page
export const FeaturesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="المميزات والكماليات"
            subtitle="تجهيزات الراحة وكماليات المقصورة للسيارات (شاشات، تبريد مقاعد، فتحة سقف...)"
            endpoint="/api/v1/catalog/features"
            columns={[
                { key: 'name', title: 'الميزة / الخاصية' },
                { key: 'icon', title: 'الأيقونة' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم الميزة', type: 'text', required: true, multilingual: true },
                { name: 'icon', label: 'رمز الأيقونة', type: 'text', placeholder: 'مثال: music, wifi, sun' },
            ]}
        />
    );
};

// 8. Safety Features Page
export const SafetyFeaturesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="ميزات وأنظمة السلامة"
            subtitle="أنظمة الأمان والوسائد الهوائية وحساسات الطوارئ"
            endpoint="/api/v1/catalog/safety"
            columns={[
                { key: 'name', title: 'نظام السلامة' },
                { key: 'icon', title: 'الأيقونة' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم نظام السلامة', type: 'text', required: true, multilingual: true },
                { name: 'icon', label: 'رمز الأيقونة', type: 'text', placeholder: 'مثال: shield-check, eye, bell' },
            ]}
        />
    );
};

// 9. Offers Manager Page
export const OffersManagerPage: React.FC = () => {
    return (
        <CrudTableManager
            title="العروض الترويجية والخصومات"
            subtitle="إدارة حملات التخفيض، شارات الأسعار الخاصة، وفترات سريان العروض"
            endpoint="/api/v1/catalog/offers"
            columns={[
                { key: 'image', title: 'بانر العرض', type: 'image' },
                { key: 'title', title: 'عنوان العرض' },
                {
                    key: 'discount_percent',
                    title: 'نسبة الخصم',
                    render: (val) =>
                        val ? (
                            <span className="font-bold text-emerald-600">{val}%</span>
                        ) : (
                            '-'
                        ),
                },
                {
                    key: 'special_price',
                    title: 'السعر الخاص',
                    render: (val) =>
                        val ? `${Number(val).toLocaleString()} ر.س` : '-',
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'title', label: 'عنوان العرض', type: 'text', required: true, multilingual: true },
                { name: 'discount_percent', label: 'نسبة الخصم (%)', type: 'number', placeholder: 'مثال: 15' },
                { name: 'special_price', label: 'السعر الترويجي الخاص (ر.س)', type: 'number' },
                { name: 'image', label: 'صورة بانر العرض', type: 'file' },
                { name: 'is_active', label: 'تفعيل العرض', type: 'switch' },
            ]}
        />
    );
};
