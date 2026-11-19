import React from 'react';
import { useBranding } from '../../../admin/context/BrandingContext';

export interface TenantLogoProps {
    className?: string;
    fallbackInitials?: string;
    fallbackBg?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const TenantLogo: React.FC<TenantLogoProps> = ({
    className = '',
    fallbackInitials,
    size = 'md',
}) => {
    const { branding } = useBranding();

    const sizeMap = {
        sm: 'h-8 w-8 text-sm',
        md: 'h-9 w-9 text-base',
        lg: 'h-12 w-12 text-lg',
    };

    const initials = fallbackInitials ?? branding.company_name.charAt(0).toUpperCase();

    if (branding.logo_url) {
        return (
            <img
                src={branding.logo_url}
                alt={branding.company_name}
                className={`${sizeMap[size]} object-contain ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeMap[size]} rounded-[var(--radius-md)] flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${className}`}
            style={{ backgroundColor: 'var(--tenant-primary)' }}
        >
            {initials}
        </div>
    );
};
