import React, { useState, useCallback } from 'react';
import { Modal, type ModalIcon } from './Modal';
import { AlertTriangle, Trash2, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    detail?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: ModalIcon;
    loading?: boolean;
}

const variantConfig: Record<ConfirmVariant, {
    icon: ModalIcon;
    iconVariant: 'danger' | 'warning' | 'info' | 'success';
    confirmBtnClass: string;
}> = {
    danger: {
        icon: Trash2,
        iconVariant: 'danger',
        confirmBtnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    warning: {
        icon: AlertTriangle,
        iconVariant: 'warning',
        confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
        icon: AlertCircle,
        iconVariant: 'info',
        confirmBtnClass: 'bg-[var(--tenant-primary,#1877F2)] hover:opacity-90 text-white',
    },
    success: {
        icon: CheckCircle2,
        iconVariant: 'success',
        confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    detail,
    confirmText = 'تأكيد الإجراء',
    cancelText = 'إلغاء الأمر',
    variant = 'danger',
    icon: customIcon,
    loading = false,
}) => {
    const [internalLoading, setInternalLoading] = useState(false);
    const cfg = variantConfig[variant];
    const IconToRender = customIcon || cfg.icon;

    const handleConfirm = async () => {
        try {
            setInternalLoading(true);
            await onConfirm();
            onClose();
        } finally {
            setInternalLoading(false);
        }
    };

    const isProcessing = loading || internalLoading;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            closeOnOverlayClick={!isProcessing}
            closeOnEscape={!isProcessing}
            showCloseButton={!isProcessing}
        >
            <div className="text-center py-2 space-y-4">
                {/* Visual Icon Badge (NO EMOJIS - Clean SVG) */}
                <div className="mx-auto flex items-center justify-center">
                    <div
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-xs ${
                            variant === 'danger'
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : variant === 'warning'
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : variant === 'success'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}
                    >
                        <IconToRender className="h-7 w-7" />
                    </div>
                </div>

                {/* Title & Message */}
                <div className="space-y-1.5 px-2">
                    <h3 className="font-bold text-slate-800 text-base leading-snug">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Optional Warning / Details Box */}
                {detail && (
                    <div className="text-[11px] bg-slate-50 border border-slate-200 text-slate-600 p-2.5 rounded-xl text-start">
                        {detail}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer min-w-[85px]"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer min-w-[100px] ${cfg.confirmBtnClass}`}
                    >
                        {isProcessing && (
                            <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/**
 * useConfirm: Smart hook to open enterprise confirmation modals programmatically without window.confirm()
 */
export function useConfirm() {
    const [state, setState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        detail?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: ConfirmVariant;
        icon?: ModalIcon;
        resolve?: (value: boolean) => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
    });

    const confirm = useCallback(
        (options: {
            title: string;
            message: string;
            detail?: string;
            confirmText?: string;
            cancelText?: string;
            variant?: ConfirmVariant;
            icon?: ModalIcon;
        }): Promise<boolean> => {
            return new Promise((resolve) => {
                setState({
                    ...options,
                    isOpen: true,
                    resolve,
                });
            });
        },
        []
    );

    const handleClose = useCallback(() => {
        if (state.resolve) state.resolve(false);
        setState((s) => ({ ...s, isOpen: false }));
    }, [state]);

    const handleConfirm = useCallback(() => {
        if (state.resolve) state.resolve(true);
        setState((s) => ({ ...s, isOpen: false }));
    }, [state]);

    const ConfirmDialogComponent = (
        <ConfirmDialog
            isOpen={state.isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={state.title}
            message={state.message}
            detail={state.detail}
            confirmText={state.confirmText}
            cancelText={state.cancelText}
            variant={state.variant}
            icon={state.icon}
        />
    );

    return {
        confirm,
        ConfirmDialogComponent,
    };
}
