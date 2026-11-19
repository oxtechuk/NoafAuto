import React from 'react';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children, className = '', title, subtitle, action, padding = 'md',
}) => {
    const paddingMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

    return (
        <div className={`bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-xs)] overflow-hidden ${className}`}>
            {(title || action) && (
                <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-start justify-between gap-4">
                    <div>
                        {title && <h3 className="font-semibold text-[var(--text-primary)] text-base">{title}</h3>}
                        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            )}
            <div className={paddingMap[padding]}>{children}</div>
        </div>
    );
};
