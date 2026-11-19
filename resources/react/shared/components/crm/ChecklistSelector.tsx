import React, { useState } from 'react';
import { Search, Check, ShieldCheck, CheckSquare, Square } from 'lucide-react';

export interface ChecklistItem {
    id: number;
    name: string;
    icon?: string | null;
}

export interface ChecklistSelectorProps {
    title: string;
    description?: string;
    items: ChecklistItem[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    icon?: React.ReactNode;
    className?: string;
}

export const ChecklistSelector: React.FC<ChecklistSelectorProps> = ({
    title,
    description,
    items,
    selectedIds,
    onChange,
    icon,
    className = '',
}) => {
    const [search, setSearch] = useState('');

    const filtered = items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase().trim())
    );

    const toggleItem = (id: number) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((item) => item !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const handleSelectAll = () => {
        const allIds = Array.from(new Set([...selectedIds, ...filtered.map((i) => i.id)]));
        onChange(allIds);
    };

    const handleClearAll = () => {
        const filteredIds = new Set(filtered.map((i) => i.id));
        onChange(selectedIds.filter((id) => !filteredIds.has(id)));
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        {icon ?? <ShieldCheck className="h-4 w-4 text-[var(--tenant-primary)]" />}
                        {title}
                        <span className="ms-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]">
                            {selectedIds.length} محدد
                        </span>
                    </h4>
                    {description && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[11px] text-[var(--tenant-primary)] hover:underline font-medium"
                    >
                        تحديد الكل
                    </button>
                    <span className="text-[var(--border-default)]">|</span>
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--status-danger)] transition-colors"
                    >
                        إلغاء التحديد
                    </button>
                </div>
            </div>

            {/* Quick search input */}
            {items.length > 8 && (
                <div className="relative">
                    <Search className="absolute start-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`بحث في ${title}...`}
                        className="w-full ps-8 pe-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                    />
                </div>
            )}

            {/* Items Grid */}
            {items.length === 0 ? (
                <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-secondary)]/30 text-center text-xs text-[var(--text-muted)]">
                    لا توجد عناصر مسجلة في هذا القسم.
                </div>
            ) : filtered.length === 0 ? (
                <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-secondary)]/30 text-center text-xs text-[var(--text-muted)]">
                    لا توجد نتائج تطابق البحث.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                    {filtered.map((item) => {
                        const isChecked = selectedIds.includes(item.id);
                        return (
                            <label
                                key={item.id}
                                onClick={() => toggleItem(item.id)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-[var(--radius-md)] border cursor-pointer select-none transition-all ${
                                    isChecked
                                        ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5 text-[var(--tenant-primary)] font-semibold shadow-2xs'
                                        : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-primary)] text-[var(--text-primary)]'
                                }`}
                            >
                                <span
                                    className={`h-4 w-4 rounded-[var(--radius-sm)] border flex items-center justify-center shrink-0 transition-colors ${
                                        isChecked
                                            ? 'bg-[var(--tenant-primary)] border-[var(--tenant-primary)] text-white'
                                            : 'border-[var(--border-strong)] bg-white'
                                    }`}
                                >
                                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                </span>
                                <span className="text-xs truncate">{item.name}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
