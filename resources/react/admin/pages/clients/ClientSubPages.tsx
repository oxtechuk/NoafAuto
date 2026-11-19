import React from 'react';
import { CrudTableManager } from '../../../shared/components/crm/CrudTableManager';

// 1. Calculator Leads Page
export const CalculatorLeadsPage: React.FC = () => {
    return (
        <CrudTableManager
            title="عملاء حاسبة التمويل"
            subtitle="قائمة العملاء الذين استخدموا حاسبة الأقساط وقاموا بطلب تفاصيل الحسبة"
            endpoint="/api/v1/leads/calculator"
            columns={[
                { key: 'name', title: 'اسم العميل' },
                {
                    key: 'phone',
                    title: 'رقم الجوال',
                    render: (val) => (
                        <a
                            href={`tel:${val}`}
                            className="font-mono text-slate-700 hover:text-[var(--tenant-primary)]"
                            dir="ltr"
                        >
                            {val}
                        </a>
                    ),
                },
                {
                    key: 'car',
                    title: 'السيارة المهتم بها',
                    render: (val) => (
                        <span className="font-semibold text-slate-800">
                            {val?.name || '-'}
                        </span>
                    ),
                },
                {
                    key: 'details',
                    title: 'تفاصيل الحسبة',
                    render: (val) => {
                        if (!val || typeof val !== 'object') return '-';
                        return (
                            <div className="text-[11px] space-y-0.5">
                                {val.salary && <div>راتب: {val.salary} ر.س</div>}
                                {val.down_payment && <div>دفعة: {val.down_payment} ر.س</div>}
                                {val.months && <div>المدة: {val.months} شهر</div>}
                            </div>
                        );
                    },
                },
                {
                    key: 'created_at',
                    title: 'تاريخ الطلب',
                    render: (val) => (
                        <span className="text-[11px] text-slate-500">
                            {val ? new Date(val).toLocaleDateString('ar-SA') : '-'}
                        </span>
                    ),
                },
            ]}
            formFields={[]}
        />
    );
};

// 2. Contact Sources Page
export const ContactSourcesPage: React.FC = () => {
    return (
        <CrudTableManager
            title="مصادر التواصل والحملات"
            subtitle="إدارة قنوات ومصادر وصول العملاء (سناب شات، جوجل، إعلانات تيك توك، توصية...)"
            endpoint="/api/v1/leads/sources"
            columns={[
                { key: 'name', title: 'اسم المصدر / القناة' },
                {
                    key: 'leads_count',
                    title: 'العملاء المستقطبين',
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">
                            {val ?? 0}
                        </span>
                    ),
                },
                { key: 'is_active', title: 'الحالة', type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: 'اسم القناة / المصدر', type: 'text', required: true, placeholder: 'مثال: إعلانات سناب شات' },
                { name: 'sort_order', label: 'الترتيب', type: 'number', placeholder: '0' },
                { name: 'is_active', label: 'مفعل', type: 'switch' },
            ]}
        />
    );
};

// 3. Newsletter Subscribers Page
export const NewsletterSubscribersPage: React.FC = () => {
    return (
        <CrudTableManager
            title="مشتركو النشرة البريدية"
            subtitle="قائمة العناوين البريدية المشتركة في العروض وأخبار المعرض"
            endpoint="/api/v1/leads/newsletter"
            columns={[
                {
                    key: 'email',
                    title: 'البريد الإلكتروني',
                    render: (val) => (
                        <span className="font-mono text-slate-700" dir="ltr">
                            {val}
                        </span>
                    ),
                },
                {
                    key: 'created_at',
                    title: 'تاريخ الاشتراك',
                    render: (val) => (
                        <span className="text-[11px] text-slate-500">
                            {val ? new Date(val).toLocaleDateString('ar-SA') : '-'}
                        </span>
                    ),
                },
            ]}
            formFields={[]}
        />
    );
};
