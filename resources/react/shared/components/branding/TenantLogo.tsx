import React from 'react';
import { useBranding } from '../../../admin/context/BrandingContext';

export interface TenantLogoProps {
    className?: string;
    fallbackInitials?: string;
    fallbackBg?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    variant?: 'dark' | 'light' | 'auto';
}

export const TenantLogo: React.FC<TenantLogoProps> = ({
    className = '',
    fallbackInitials,
    size = 'md',
    variant = 'auto',
}) => {
    const { branding } = useBranding();

    const sizeMap = {
        sm: 'h-8 max-h-8 w-auto',
        md: 'h-10 max-h-10 w-auto',
        lg: 'h-12 max-h-12 w-auto',
        xl: 'h-16 max-h-16 w-auto',
        '2xl': 'h-24 max-h-24 w-auto',
        '3xl': 'h-28 max-h-32 w-auto',
    };

    // Determine correct logo based on background variant:
    // - Custom Admin Sidebar logo if configured in settings
    // - Dark backgrounds (like sidebar): use white wordmark /images/logo.png
    // - Light backgrounds: use dark green wordmark /images/vertcal logo.png
    const adminSidebarLogo =
        typeof window !== 'undefined'
            ? (window as any).__ADMIN_SETTINGS__?.sidebar_logo || null
            : null;

    let logoSrc = adminSidebarLogo || branding.logo_url || '/images/logo.png';
    if (!adminSidebarLogo && (variant === 'light' || (!branding.logo_url && variant === 'light'))) {
        logoSrc = '/images/vertcal logo.png';
    }

    return (
        <img
            src={logoSrc}
            alt={branding.company_name || 'تعميد لإدارة السيارات'}
            className={`${sizeMap[size]} object-contain shrink-0 transition-all ${className}`}
            onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes('/images/logo.png')) {
                    target.src = '/images/logo.png';
                }
            }}
        />
    );
};
