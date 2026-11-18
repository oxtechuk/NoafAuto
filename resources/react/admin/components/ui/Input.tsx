import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helper?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helper,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || props.name;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-colors placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-50 ${
                    error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300'
                } ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
            {!error && helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
    );
};
