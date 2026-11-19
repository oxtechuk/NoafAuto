import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'start' | 'end';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'start',
    className = '',
    disabled,
    ...props
}) => {
    const variants: Record<string, string> = {
        primary:   'bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)] text-white shadow-xs',
        secondary: 'bg-[var(--surface-secondary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] border border-[var(--border-default)]',
        outline:   'border border-[var(--border-default)] bg-white hover:bg-[var(--surface-secondary)] text-[var(--text-primary)]',
        ghost:     'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
        danger:    'bg-[var(--status-danger)] hover:opacity-90 text-white shadow-xs',
        link:      'underline-offset-4 hover:underline text-[var(--tenant-primary)]',
    };

    const sizes: Record<string, string> = {
        sm: 'px-3 py-1.5 text-xs gap-1.5',
        md: 'px-4 py-2 text-sm gap-2',
        lg: 'px-5 py-2.5 text-base gap-2',
    };

    const Spinner = () => (
        <svg className="animate-spin h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );

    return (
        <button
            className={`inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Spinner />
            ) : (
                icon && iconPosition === 'start' && <span className="shrink-0">{icon}</span>
            )}
            {children}
            {!loading && icon && iconPosition === 'end' && <span className="shrink-0">{icon}</span>}
        </button>
    );
};
