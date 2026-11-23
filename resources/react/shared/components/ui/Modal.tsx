import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalIcon = React.ComponentType<{ className?: string }>;

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';

export type ModalIconVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type ModalHeaderVariant = 'light' | 'dark' | 'glass';

export interface ModalAction {
    label: string;
    onClick?: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    type?: 'button' | 'submit';
}

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: ModalIcon;
    iconVariant?: ModalIconVariant;
    headerVariant?: ModalHeaderVariant;
    badge?: React.ReactNode;
    size?: ModalSize;
    children: React.ReactNode;
    footer?: React.ReactNode;
    primaryAction?: ModalAction;
    secondaryAction?: ModalAction;
    headerActions?: React.ReactNode;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    className?: string;
    bodyClassName?: string;
    preventScroll?: boolean;
    portal?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
    xs: 'max-w-sm',
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    '4xl': 'max-w-7xl',
    full: 'max-w-[96vw] max-h-[96vh]',
};

const iconVariantClasses: Record<ModalIconVariant, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    danger: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    info: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    neutral: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: IconComponent,
    iconVariant = 'primary',
    headerVariant = 'light',
    badge,
    size = 'md',
    children,
    footer,
    primaryAction,
    secondaryAction,
    headerActions,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    className = '',
    bodyClassName = '',
    preventScroll = true,
    portal = true,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Escape key listener & Body scroll prevention
    useEffect(() => {
        if (!isOpen) return;

        if (preventScroll) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen, preventScroll]);

    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    if (!isOpen) return null;

    const iconStyle = iconVariantClasses[iconVariant];

    const content = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                onClick={() => {
                    if (closeOnOverlayClick) onClose();
                }}
            />

            {/* Modal Dialog Card */}
            <div
                ref={dialogRef}
                className={`relative w-full bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto transition-all duration-200 animate-in fade-in zoom-in-95 ${sizeClasses[size]} ${className}`}
                dir="rtl"
            >
                {/* Header */}
                {(title || showCloseButton || IconComponent) && (
                    <div
                        className={`px-5 py-4 flex items-center justify-between gap-3 shrink-0 border-b ${
                            headerVariant === 'dark'
                                ? 'bg-[#0f172a] text-white border-slate-800'
                                : headerVariant === 'glass'
                                ? 'bg-slate-50/90 backdrop-blur-md text-slate-800 border-slate-200/70'
                                : 'bg-white text-slate-800 border-slate-100'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            {IconComponent && (
                                <div
                                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                        headerVariant === 'dark'
                                            ? 'bg-slate-800 text-sky-400 border-slate-700'
                                            : `${iconStyle.bg} ${iconStyle.text} ${iconStyle.border}`
                                    }`}
                                >
                                    <IconComponent className="h-4.5 w-4.5" />
                                </div>
                            )}

                            <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                    {typeof title === 'string' ? (
                                        <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                                            {title}
                                        </h3>
                                    ) : (
                                        title
                                    )}
                                    {badge && (
                                        <div className="shrink-0">{badge}</div>
                                    )}
                                </div>
                                {subtitle && (
                                    <p
                                        className={`text-xs truncate ${
                                            headerVariant === 'dark'
                                                ? 'text-slate-300'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Header Actions & Close Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {headerActions}
                            {showCloseButton && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        headerVariant === 'dark'
                                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                                    title="إغلاق النافذة"
                                    aria-label="إغلاق"
                                >
                                    <X className="h-4.5 w-4.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Body Content */}
                <div
                    className={`p-5 overflow-y-auto max-h-[calc(88vh-130px)] scrollbar-thin ${bodyClassName}`}
                >
                    {children}
                </div>

                {/* Footer */}
                {(footer || primaryAction || secondaryAction) && (
                    <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                        {footer || (
                            <>
                                {secondaryAction && (
                                    <button
                                        type="button"
                                        onClick={secondaryAction.onClick || onClose}
                                        disabled={secondaryAction.disabled}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {secondaryAction.label}
                                    </button>
                                )}
                                {primaryAction && (
                                    <button
                                        type={primaryAction.type || 'button'}
                                        onClick={primaryAction.onClick}
                                        disabled={primaryAction.disabled || primaryAction.loading}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs ${
                                            primaryAction.variant === 'danger'
                                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                                : primaryAction.variant === 'secondary'
                                                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                                : 'bg-[var(--tenant-primary,#1877F2)] hover:opacity-90 text-white'
                                        }`}
                                    >
                                        {primaryAction.loading && (
                                            <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        )}
                                        <span>{primaryAction.label}</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    if (portal && typeof document !== 'undefined') {
        return createPortal(content, document.body);
    }

    return content;
};
