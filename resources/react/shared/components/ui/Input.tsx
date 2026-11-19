import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helper?: string;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label, error, helper, startIcon, endIcon, className = '', id, ...props
}) => {
    const inputId = id || props.name;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {startIcon && (
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        {startIcon}
                    </span>
                )}
                <input
                    id={inputId}
                    className={`w-full rounded-[var(--radius-md)] border bg-[var(--surface-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors placeholder:text-[var(--text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--tenant-primary)]/20 focus:border-[var(--tenant-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
                        startIcon ? 'ps-9' : ''
                    } ${
                        endIcon ? 'pe-9' : ''
                    } ${
                        error
                            ? 'border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-[var(--status-danger)]/20'
                            : 'border-[var(--border-default)]'
                    } ${className}`}
                    {...props}
                />
                {endIcon && (
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        {endIcon}
                    </span>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-[var(--status-danger)] font-medium">{error}</p>}
            {!error && helper && <p className="mt-1 text-xs text-[var(--text-muted)]">{helper}</p>}
        </div>
    );
};
