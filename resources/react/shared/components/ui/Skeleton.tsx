import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-secondary)] ${className}`} />
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
    <div className="space-y-0">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-[var(--border-default)]">
                {Array.from({ length: cols }).map((_, j) => (
                    <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-32' : 'flex-1'}`} />
                ))}
            </div>
        ))}
    </div>
);
