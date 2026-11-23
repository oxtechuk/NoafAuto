import React from 'react';
import { CrudTableManager, formatLocaleString } from '../../../shared/components/crm/CrudTableManager';

// 1. Blog Posts Page
export const BlogPostsPage: React.FC = () => {
    return (
        <CrudTableManager
            title="مقالات المدونة"
            subtitle="إدارة مقالات وأخبار المعرض ومحتوى الـ SEO"
            endpoint="/api/v1/content/blogs"
            columns={[
                { key: 'image', title: 'صورة المقال', type: 'image' },
                { key: 'title', title: 'عنوان المقال' },
                {
                    key: 'category',
                    title: 'التصنيف',
                    render: (val, row) => (
                        <span className="text-slate-600 font-medium">
                            {formatLocaleString(row.category?.name)}
                        </span>
                    ),
                },
                {
                    key: 'created_at',
                    title: 'تاريخ النشر',
                    render: (val) => (
                        <span className="text-[11px] text-slate-500">
                            {val ? new Date(val).toLocaleDateString('ar-SA') : '-'}
                        </span>
                    ),
                },
                { key: 'is_published', title: 'حالة النشر', type: 'boolean' },
            ]}
            formFields={[
                { name: 'title', label: 'عنوان المقال', type: 'text', required: true, multilingual: true },
                { name: 'content', label: 'محتوى المقال', type: 'textarea', required: true, multilingual: true },
                { name: 'image', label: 'صورة المقال البارزة', type: 'file' },
                { name: 'is_published', label: 'نشر المقال فوراً', type: 'switch' },
            ]}
        />
    );
};

// 2. Blog Categories Page
export const BlogCategoriesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="تصنيفات المدونة"
            subtitle="إدارة أقسام وتصنيفات مقالات المدونة"
            endpoint="/api/v1/content/blog-categories"
            columns={[
                { key: 'name', title: 'اسم التصنيف' },
                {
                    key: 'posts_count',
                    title: 'عدد المقالات',
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">
                            {val ?? 0}
                        </span>
                    ),
                },
            ]}
            formFields={[
                { name: 'name', label: 'اسم التصنيف', type: 'text', required: true, multilingual: true },
            ]}
        />
    );
};

// 3. Partners Page
export const PartnersPage: React.FC = () => {
    return (
        <CrudTableManager
            title="شركاء النجاح والتمويل"
            subtitle="إدارة شعارات البنوك وشركات التمويل والوكلاء المعروضة بالموقع"
            endpoint="/api/v1/content/partners"
            columns={[
                { key: 'image', title: 'الشعار', type: 'image' },
                { key: 'name', title: 'اسم الشريك' },
                {
                    key: 'link',
                    title: 'الرابط',
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
                { name: 'name', label: 'اسم الشريك', type: 'text', required: true },
                { name: 'image', label: 'شعار الشريك', type: 'file', required: true },
                { name: 'link', label: 'رابط الموقع الرسمي', type: 'text', placeholder: 'https://...' },
                { name: 'sort_order', label: 'الترتيب', type: 'number', placeholder: '0' },
            ]}
        />
    );
};

// 4. Testimonials Page
export const TestimonialsPage: React.FC = () => {
    return (
        <CrudTableManager
            title="آراء وتقييمات العملاء"
            subtitle="إدارة المراجعات وتجارب المشترين المعروضة في الصفحة الرئيسية"
            endpoint="/api/v1/content/testimonials"
            columns={[
                { key: 'name', title: 'اسم العميل' },
                {
                    key: 'rating',
                    title: 'التقييم',
                    render: (val) => (
                        <span className="text-amber-500 font-bold">
                            {'★'.repeat(val || 5)}
                        </span>
                    ),
                },
                {
                    key: 'content',
                    title: 'نص الرأي',
                    render: (val) => (
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-sm">
                            {val}
                        </p>
                    ),
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم العميل', type: 'text', required: true },
                { name: 'rating', label: 'التقييم من 5', type: 'number', placeholder: '5' },
                { name: 'content', label: 'نص التقييم / التجربة', type: 'textarea', required: true },
                { name: 'is_active', label: 'معروض بالموقع', type: 'switch' },
            ]}
        />
    );
};

// 5. FAQs Page
export const FaqsPage: React.FC = () => {
    return (
        <CrudTableManager
            title="الأسئلة الشائعة (FAQ)"
            subtitle="إدارة بنك الأسئلة المتكررة وأجوبتها لزوار الموقع"
            endpoint="/api/v1/content/faqs"
            columns={[
                { key: 'question', title: 'السؤال' },
                {
                    key: 'answer',
                    title: 'الإجابة',
                    render: (val) => (
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-sm">
                            {typeof val === 'object' ? val.ar || val.en : val}
                        </p>
                    ),
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'question', label: 'السؤال', type: 'text', required: true, multilingual: true },
                { name: 'answer', label: 'الإجابة الشاملة', type: 'textarea', required: true, multilingual: true },
                { name: 'is_active', label: 'مفعل', type: 'switch' },
            ]}
        />
    );
};

// 6. Hero Slides Page
export const HeroSlidesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="شرائح وسلايدر الهيرو الرئيسي"
            subtitle="الصور الترويجية والعناوين الرئيسية البارزة في مقدمة الموقع"
            endpoint="/api/v1/content/hero-slides"
            columns={[
                { key: 'image', title: 'الصورة', type: 'image' },
                { key: 'title', title: 'العنوان البارز' },
                { key: 'subtitle', title: 'الوصف الفرعي' },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'title', label: 'العنوان الرئيسي', type: 'text', required: true, multilingual: true },
                { name: 'subtitle', label: 'النص التوضيحي', type: 'text', multilingual: true },
                { name: 'image', label: 'صورة الشريحة (HD)', type: 'file', required: true },
                { name: 'link', label: 'رابط الزر (URL)', type: 'text', placeholder: '/cars' },
                { name: 'is_active', label: 'مفعل', type: 'switch' },
            ]}
        />
    );
};
