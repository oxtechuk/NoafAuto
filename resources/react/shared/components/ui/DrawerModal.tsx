import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ModalIcon } from './Modal';

export type DrawerPosition = 'start' | 'end';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DrawerModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: ModalIcon;
    badge?: React.ReactNode;
    position?: DrawerPosition;
    size?: DrawerSize;
    children: React.ReactNode;
    footer?: React.ReactNode;
    headerActions?: React.ReactNode;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    className?: string;
    bodyClassName?: string;
    preventScroll?: boolean;
}

const sizeWidths: Record<DrawerSize, string> = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
};

export const DrawerModal: React.FC<DrawerModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: IconComponent,
    badge,
    position = 'start', // Start = right in RTL
    size = 'md',
    children,
    footer,
    headerActions,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    className = '',
    bodyClassName = '',
    preventScroll = true,
}) => {
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
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    if (!isOpen) return null;

    const drawerContent = (
        <div
            className="fixed inset-0 z-50 overflow-hidden"
            aria-modal="true"
            role="dialog"
            dir="rtl"
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
                onClick={() => {
                    if (closeOnOverlayClick) onClose();
                }}
            />

            <div
                className={`fixed inset-y-0 ${
                    position === 'start' ? 'end-0' : 'start-0'
                } flex max-w-full`}
            >
                {/* Slide-over panel */}
                <div
                    className={`w-screen ${sizeWidths[size]} bg-white shadow-2xl border-s border-slate-200/80 flex flex-col h-full overflow-hidden transition-transform duration-300 animate-in ${
                        position === 'start'
                            ? 'slide-in-from-right'
                            : 'slide-in-from-left'
                    } ${className}`}
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            {IconComponent && (
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-sky-50 text-[var(--tenant-primary,#1877F2)] border border-sky-100">
                                    <IconComponent className="h-4.5 w-4.5" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    {typeof title === 'string' ? (
                                        <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">
                                            {title}
                                        </h3>
                                    ) : (
                                        title
                                    )}
                                    {badge}
                                </div>
                                {subtitle && (
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {headerActions}
                            {showCloseButton && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="إغلاق"
                                >
                                    <X className="h-4.5 w-4.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className={`flex-1 overflow-y-auto p-5 scrollbar-thin ${bodyClassName}`}>
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 shrink-0">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(drawerContent, document.body);
    }

    return drawerContent;
};
