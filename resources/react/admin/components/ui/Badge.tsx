import React from 'react';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'slate';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'slate',
    className = '',
}) => {
    const variants = {
        primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
        warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
        danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
        slate: 'bg-slate-100 text-slate-700 border-slate-200/60',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
        >
            {children}
        </span>
    );
};
