import React from 'react';
import { useTranslation } from 'react-i18next';
import { CrudTableManager, formatLocaleString } from '../../../shared/components/crm/CrudTableManager';

// 1. Brands Page
export const BrandsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.brands_title')}
            subtitle={t('catalog.brands_sub')}
            endpoint="/api/v1/brands"
            columns={[
                { key: 'logo', title: t('catalog.logo'), type: 'image' },
                { key: 'name', title: t('catalog.brand_name') },
                {
                    key: 'brand_type',
                    title: t('catalog.brand_type'),
                    render: (val, row) => (
                        <span className="text-slate-600">
                            {formatLocaleString(row.brand_type?.name)}
                        </span>
                    ),
                },
                {
                    key: 'cars_count',
                    title: t('catalog.cars_count'),
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">
                            {val ?? 0}
                        </span>
                    ),
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.brand_name'), type: 'text', required: true, multilingual: true },
                { name: 'logo', label: t('catalog.brand_logo'), type: 'file' },
                { name: 'is_active', label: t('catalog.active_in_showroom'), type: 'switch' },
            ]}
        />
    );
};

// 2. Car Models Page
export const CarModelsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.models_title')}
            subtitle={t('catalog.models_sub')}
            endpoint="/api/v1/catalog/models"
            columns={[
                { key: 'name', title: t('catalog.model_name') },
                {
                    key: 'brand',
                    title: t('catalog.brand'),
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
                    title: t('catalog.count_cars'),
                    render: (val) => (
                        <span className="font-semibold text-slate-700">{val ?? 0}</span>
                    ),
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.model_name'), type: 'text', required: true, multilingual: true },
                { name: 'brand_id', label: t('catalog.parent_brand'), type: 'number', required: true, placeholder: 'Brand ID' },
                { name: 'is_active', label: t('catalog.activate_model'), type: 'switch' },
            ]}
        />
    );
};

// 3. Brand Types Page
export const BrandTypesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.brand_types_title')}
            subtitle={t('catalog.brand_types_sub')}
            endpoint="/api/v1/catalog/brand-types"
            columns={[
                { key: 'name', title: t('catalog.brand_type') },
                {
                    key: 'brands_count',
                    title: t('catalog.brands_count'),
                    render: (val) => (
                        <span className="font-semibold text-slate-700">{val ?? 0}</span>
                    ),
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.type_name'), type: 'text', required: true, multilingual: true },
                { name: 'sort_order', label: t('catalog.sort_order'), type: 'number', placeholder: '0' },
                { name: 'is_active', label: t('common.enabled'), type: 'switch' },
            ]}
        />
    );
};

// 4. Car Categories Page
export const CarCategoriesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.categories_title')}
            subtitle={t('catalog.categories_sub')}
            endpoint="/api/v1/catalog/categories"
            columns={[
                { key: 'name', title: t('catalog.category_name') },
                {
                    key: 'cars_count',
                    title: t('catalog.count_cars'),
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">{val ?? 0}</span>
                    ),
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.category_name'), type: 'text', required: true, multilingual: true },
                { name: 'sort_order', label: t('catalog.sort_order'), type: 'number', placeholder: '0' },
                { name: 'is_active', label: t('catalog.active_in_showroom'), type: 'switch' },
            ]}
        />
    );
};

// 5. Car Types Page
export const CarTypesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.car_types_title')}
            subtitle={t('catalog.car_types_sub')}
            endpoint="/api/v1/catalog/types"
            columns={[
                { key: 'name', title: t('catalog.body_type') },
                { key: 'slug', title: t('catalog.slug') },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.body_type'), type: 'text', required: true, multilingual: true },
                { name: 'sort_order', label: t('catalog.sort_order'), type: 'number', placeholder: '0' },
                { name: 'is_active', label: t('common.enabled'), type: 'switch' },
            ]}
        />
    );
};

// 6. Specifications Page
export const SpecsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.specs_title')}
            subtitle={t('catalog.specs_sub')}
            endpoint="/api/v1/catalog/specs"
            columns={[
                { key: 'name', title: t('catalog.spec_name') },
                { key: 'icon', title: t('catalog.icon') },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.spec_name'), type: 'text', required: true, multilingual: true },
                { name: 'icon', label: t('catalog.icon'), type: 'text', placeholder: 'gauge, zap, shield' },
            ]}
        />
    );
};

// 7. Features Page
export const FeaturesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.features_title')}
            subtitle={t('catalog.features_sub')}
            endpoint="/api/v1/catalog/features"
            columns={[
                { key: 'name', title: t('catalog.feature_name') },
                { key: 'icon', title: t('catalog.icon') },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.feature_name'), type: 'text', required: true, multilingual: true },
                { name: 'icon', label: t('catalog.icon'), type: 'text', placeholder: 'music, wifi, sun' },
            ]}
        />
    );
};

// 8. Safety Features Page
export const SafetyFeaturesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.safety_title')}
            subtitle={t('catalog.safety_sub')}
            endpoint="/api/v1/catalog/safety"
            columns={[
                { key: 'name', title: t('catalog.safety_name') },
                { key: 'icon', title: t('catalog.icon') },
            ]}
            formFields={[
                { name: 'name', label: t('catalog.safety_name'), type: 'text', required: true, multilingual: true },
                { name: 'icon', label: t('catalog.icon'), type: 'text', placeholder: 'shield-check, eye, bell' },
            ]}
        />
    );
};

// 9. Offers Manager Page
export const OffersManagerPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('catalog.offers_title')}
            subtitle={t('catalog.offers_sub')}
            endpoint="/api/v1/catalog/offers"
            columns={[
                { key: 'image', title: t('catalog.offer_banner'), type: 'image' },
                { key: 'title', title: t('catalog.offer_title') },
                {
                    key: 'tag',
                    title: t('catalog.offer_tag', { defaultValue: 'نوع العرض' }),
                    render: (val) => {
                        const labels: Record<string, string> = {
                            popular: 'شائع',
                            exclusive: 'حصري',
                            new: 'جديد',
                            limited: 'محدود',
                        };
                        return val ? (
                            <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {labels[String(val)] || val}
                            </span>
                        ) : '-';
                    },
                },
                {
                    key: 'discount_percent',
                    title: t('catalog.discount_percent'),
                    render: (val) =>
                        val ? (
                            <span className="font-bold text-emerald-600">{val}%</span>
                        ) : (
                            '-'
                        ),
                },
                {
                    key: 'special_price',
                    title: t('catalog.special_price'),
                    render: (val) =>
                        val ? `${Number(val).toLocaleString()} ${t('common.sar')}` : '-',
                },
                {
                    key: 'special_installment',
                    title: t('catalog.special_installment', { defaultValue: 'القسط الخاص' }),
                    render: (val) =>
                        val ? `${Number(val).toLocaleString()} ${t('common.sar')}` : '-',
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'title', label: t('catalog.offer_title'), type: 'text', required: true, multilingual: true },
                { name: 'description', label: t('catalog.offer_description', { defaultValue: 'وصف / فائدة العرض' }), type: 'textarea', multilingual: true },
                {
                    name: 'tag',
                    label: t('catalog.offer_tag', { defaultValue: 'نوع / شارة العرض' }),
                    type: 'select',
                    options: [
                        { label: 'شائع (Popular)', value: 'popular' },
                        { label: 'حصري (Exclusive)', value: 'exclusive' },
                        { label: 'جديد (New)', value: 'new' },
                        { label: 'محدود (Limited)', value: 'limited' },
                    ],
                },
                { name: 'discount_percent', label: t('catalog.discount_percent'), type: 'number', placeholder: '15' },
                { name: 'special_price', label: t('catalog.special_price'), type: 'number' },
                { name: 'special_installment', label: t('catalog.special_installment', { defaultValue: 'القسط الشهري الخاص' }), type: 'number' },
                { name: 'ends_at', label: t('catalog.ends_at', { defaultValue: 'تاريخ انتهاء العرض (YYYY-MM-DD)' }), type: 'text', placeholder: '2026-12-31' },
                { name: 'image', label: t('catalog.offer_banner'), type: 'file' },
                { name: 'is_active', label: t('catalog.activate_offer'), type: 'switch' },
            ]}
        />
    );
};
