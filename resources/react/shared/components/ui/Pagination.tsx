import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export interface PaginationProps {
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage, lastPage, onPageChange, className = '',
}) => {
    if (lastPage <= 1) return null;

    return (
        <div className={`flex items-center justify-between gap-2 px-4 py-3 border-t border-[var(--border-default)] ${className}`}>
            <p className="text-xs text-[var(--text-muted)]">
                صفحة {currentPage} من {lastPage}
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                    className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};
