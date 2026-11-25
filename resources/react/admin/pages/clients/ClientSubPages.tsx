import React from 'react';
import { useTranslation } from 'react-i18next';
import { CrudTableManager, formatLocaleString } from '../../../shared/components/crm/CrudTableManager';

// 1. Calculator Leads Page
export const CalculatorLeadsPage: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const dateLocale = i18n.language === 'en' ? 'en-US' : 'ar-SA';
    return (
        <CrudTableManager
            title={t('clients.calc_leads_title')}
            subtitle={t('clients.calc_leads_sub')}
            endpoint="/api/v1/leads/calculator"
            columns={[
                { key: 'name', title: t('clients.client_name') },
                {
                    key: 'phone',
                    title: t('clients.phone'),
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
                    title: t('clients.interested_car'),
                    render: (val) => (
                        <span className="font-semibold text-slate-800">
                            {formatLocaleString(val?.name)}
                        </span>
                    ),
                },
                {
                    key: 'details',
                    title: t('clients.calc_details'),
                    render: (val) => {
                        if (!val || typeof val !== 'object') return '-';
                        return (
                            <div className="text-[11px] space-y-0.5">
                                {val.salary && <div>{t('clients.salary')}: {val.salary} {t('common.sar')}</div>}
                                {val.down_payment && <div>{t('clients.down_payment')}: {val.down_payment} {t('common.sar')}</div>}
                                {val.months && <div>{t('clients.months')}: {val.months} {t('clients.month_unit')}</div>}
                            </div>
                        );
                    },
                },
                {
                    key: 'created_at',
                    title: t('clients.request_date'),
                    render: (val) => (
                        <span className="text-[11px] text-slate-500">
                            {val ? new Date(val).toLocaleDateString(dateLocale) : '-'}
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
    const { t } = useTranslation('admin');
    return (
        <CrudTableManager
            title={t('clients.sources_title')}
            subtitle={t('clients.sources_sub')}
            endpoint="/api/v1/leads/sources"
            columns={[
                { key: 'name', title: t('clients.source_name') },
                {
                    key: 'leads_count',
                    title: t('clients.leads_count'),
                    render: (val) => (
                        <span className="font-bold text-[var(--tenant-primary)]">
                            {val ?? 0}
                        </span>
                    ),
                },
                { key: 'is_active', title: t('common.status'), type: 'boolean' },
            ]}
            formFields={[
                { name: 'name', label: t('clients.source_name'), type: 'text', required: true, placeholder: t('clients.source_placeholder') },
                { name: 'sort_order', label: t('clients.sort_order'), type: 'number', placeholder: '0' },
                { name: 'is_active', label: t('common.enabled'), type: 'switch' },
            ]}
        />
    );
};

// 3. Newsletter Subscribers Page
export const NewsletterSubscribersPage: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const dateLocale = i18n.language === 'en' ? 'en-US' : 'ar-SA';
    return (
        <CrudTableManager
            title={t('clients.newsletter_title')}
            subtitle={t('clients.newsletter_sub')}
            endpoint="/api/v1/leads/newsletter"
            columns={[
                {
                    key: 'email',
                    title: t('clients.email'),
                    render: (val) => (
                        <span className="font-mono text-slate-700" dir="ltr">
                            {val}
                        </span>
                    ),
                },
                {
                    key: 'created_at',
                    title: t('clients.subscribed_at'),
                    render: (val) => (
                        <span className="text-[11px] text-slate-500">
                            {val ? new Date(val).toLocaleDateString(dateLocale) : '-'}
                        </span>
                    ),
                },
            ]}
            formFields={[]}
        />
    );
};
