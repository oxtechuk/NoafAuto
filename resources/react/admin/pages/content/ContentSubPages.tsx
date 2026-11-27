import React from 'react';
import { useTranslation } from 'react-i18next';
import { CrudTableManager, formatLocaleString } from '../../../shared/components/crm/CrudTableManager';
export { BlogPostsPage } from './BlogPostsPage';
export { LegalPagesManager } from './LegalPagesManager';

// 2. Blog Categories Page
export const BlogCategoriesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('content.blog_cats_title')}
            subtitle={t('content.blog_cats_sub')}
            endpoint="/api/v1/content/blog-categories"
            columns={[
                { key: 'name', title: t('content.category_name') },
                {
                    key: 'posts_count',
                    title: t('content.posts_count'),
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">
                            {val ?? 0}
                        </span>
                    ),
                },
            ]}
            formFields={[
                { name: 'name', label: t('content.category_name'), type: 'text', required: true, multilingual: true },
            ]}
        />
    );
};

// 3. Partners Page
export const PartnersPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('content.partners_title')}
            subtitle={t('content.partners_sub')}
            endpoint="/api/v1/content/partners"
            columns={[
                { key: 'image', title: t('content.logo'), type: 'image' },
                { key: 'name', title: t('content.partner_name') },
                {
                    key: 'link',
                    title: t('content.link'),
                    render: (val) => (
                        val ? (
                            <a
                                href={val}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--tenant-primary)] underline truncate max-w-[150px] inline-block"
                            >
                                {val}
                            </a>
                        ) : (
                            '-'
                        )
                    ),
                },
            ]}
            formFields={[
                { name: 'name', label: t('content.partner_name'), type: 'text', required: true },
                { name: 'image', label: t('content.partner_logo'), type: 'file', required: true },
                { name: 'link', label: t('content.official_url'), type: 'text', placeholder: 'https://...' },
                { name: 'sort_order', label: t('content.sort_order'), type: 'number', placeholder: '0' },
            ]}
        />
    );
};

// 4. Testimonials Page
export const TestimonialsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('content.testimonials_title')}
            subtitle={t('content.testimonials_sub')}
            endpoint="/api/v1/content/testimonials"
            columns={[
                { key: 'name', title: t('content.client_name') },
                {
                    key: 'rating',
                    title: t('content.rating'),
                    render: (val) => (
                        <span className="text-amber-500 font-bold">
                            {'★'.repeat(val || 5)}
                        </span>
                    ),
                },
                {
                    key: 'content',
                    title: t('content.review_text'),
                    render: (val) => (
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-sm">
                            {val}
                        </p>
                    ),
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: t('content.client_name'), type: 'text', required: true },
                { name: 'rating', label: t('content.rating_of_5'), type: 'number', placeholder: '5' },
                { name: 'content', label: t('content.review_text'), type: 'textarea', required: true },
                { name: 'is_active', label: t('content.shown_on_site'), type: 'switch' },
            ]}
        />
    );
};

// 5. FAQs Page
export const FaqsPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('content.faqs_title')}
            subtitle={t('content.faqs_sub')}
            endpoint="/api/v1/content/faqs"
            columns={[
                { key: 'question', title: t('content.question') },
                {
                    key: 'answer',
                    title: t('content.answer'),
                    render: (val) => (
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-sm">
                            {typeof val === 'object' ? val.ar || val.en : val}
                        </p>
                    ),
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'question', label: t('content.question'), type: 'text', required: true, multilingual: true },
                { name: 'answer', label: t('content.answer'), type: 'textarea', required: true, multilingual: true },
                { name: 'is_active', label: t('common.enabled'), type: 'switch' },
            ]}
        />
    );
};

// 6. Hero Slides Page
export const HeroSlidesPage: React.FC = () => {
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('content.hero_slides_title')}
            subtitle={t('content.hero_slides_sub')}
            endpoint="/api/v1/content/hero-slides"
            columns={[
                { key: 'image', title: t('content.image'), type: 'image' },
                { key: 'title', title: t('content.main_title') },
                { key: 'subtitle', title: t('content.subtitle') },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'title', label: t('content.main_title'), type: 'text', required: true, multilingual: true },
                { name: 'subtitle', label: t('content.subtitle'), type: 'text', multilingual: true },
                { name: 'image', label: t('content.slide_image'), type: 'file', required: true },
                { name: 'link', label: t('content.button_url'), type: 'text', placeholder: '/cars' },
                { name: 'is_active', label: t('common.enabled'), type: 'switch' },
            ]}
        />
    );
};
