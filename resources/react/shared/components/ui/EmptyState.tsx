import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title = 'لا توجد بيانات',
    description,
    icon,
    action,
    className = '',
}) => (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
        <div className="p-4 rounded-full bg-[var(--surface-secondary)] mb-4">
            {icon ?? <Inbox className="h-8 w-8 text-[var(--text-muted)]" />}
        </div>
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
        {description && <p className="mt-1 text-xs text-[var(--text-muted)] max-w-xs">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);
