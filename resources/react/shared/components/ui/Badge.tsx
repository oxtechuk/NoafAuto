import React from 'react';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'neutral';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
    const variants: Record<string, string> = {
        primary:   'bg-[var(--tenant-secondary)] text-[var(--tenant-primary)] border border-[var(--tenant-secondary)]',
        secondary: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]',
        neutral:   'bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-default)]',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
