import React from 'react';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Map business status strings to semantic variants
const STATUS_MAP: Record<string, StatusVariant> = {
    // Success
    sold: 'success', received: 'success', done: 'success', completed: 'success',
    delivered: 'success', approved: 'success', active: 'success',
    // Warning
    pending: 'warning', bank_review: 'warning', waiting_documents: 'warning',
    waiting: 'warning', requires_attention: 'warning', authorized: 'warning',
    // Danger
    rejected: 'danger', failed: 'danger', cancelled: 'danger',
    // Info
    new: 'info', in_progress: 'info', under_review: 'info',
    // Neutral
    draft: 'neutral', archived: 'neutral', inactive: 'neutral',
};

// Arabic labels for common statuses
const STATUS_LABELS: Record<string, string> = {
    sold: 'تم البيع', received: 'تم الاستلام', done: 'مكتمل', completed: 'مكتمل',
    delivered: 'تم التسليم', approved: 'معتمد', active: 'نشط',
    pending: 'قيد الانتظار', bank_review: 'مراجعة بنكية', waiting_documents: 'بانتظار المستندات',
    waiting: 'قيد الانتظار', authorized: 'مفوّض',
    rejected: 'مرفوض', failed: 'فاشل', cancelled: 'ملغى',
    new: 'جديد', in_progress: 'جارٍ', under_review: 'قيد المراجعة',
    draft: 'مسودة', archived: 'مؤرشف', inactive: 'غير نشط',
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/20',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border border-[var(--status-warning)]/20',
    danger:  'bg-[var(--status-danger-bg)]  text-[var(--status-danger)]  border border-[var(--status-danger)]/20',
    info:    'bg-[var(--status-info-bg)]    text-[var(--status-info)]    border border-[var(--status-info)]/20',
    neutral: 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] border border-[var(--status-neutral)]/20',
};

export interface StatusBadgeProps {
    status: string;
    label?: string;    // override the auto-label
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
    // Handle lost_* pattern
    const normalizedStatus = status?.startsWith('lost_') ? 'danger' : status;
    const variant = STATUS_MAP[normalizedStatus] ?? STATUS_MAP[status] ?? 'neutral';
    const displayLabel = label ?? STATUS_LABELS[status] ?? status;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT_STYLES[variant]} ${className}`}>
            {displayLabel}
        </span>
    );
};

// Also export a hook for getting just the variant (useful for icon colors etc.)
export const getStatusVariant = (status: string): StatusVariant => {
    const normalizedStatus = status?.startsWith('lost_') ? 'danger' : status;
    return STATUS_MAP[normalizedStatus] ?? 'neutral';
};
