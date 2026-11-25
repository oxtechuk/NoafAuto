import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';

export interface SearchableOption {
    value: string;
    label: string;
}

export interface SearchableSelectProps {
    label?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
    options: SearchableOption[];
    value: string;
    onChange: (value: string) => void;
    onQuickCreate?: (nameAr: string, nameEn?: string) => Promise<void>;
    quickCreateLabel?: string;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    required = false,
    disabled = false,
    placeholder,
    searchPlaceholder,
    options,
    value,
    onChange,
    onQuickCreate,
    quickCreateLabel,
    className = '',
}) => {
    const { t } = useTranslation('admin');
    const resolvedPlaceholder = placeholder ?? t('shared.select_placeholder');
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.quick_search');
    const resolvedQuickCreateLabel = quickCreateLabel ?? t('shared.quick_create');
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [creatingMode, setCreatingMode] = useState(false);
    const [newNameAr, setNewNameAr] = useState('');
    const [newNameEn, setNewNameEn] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((o) => String(o.value) === String(value));

    const filtered = options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase().trim())
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && !creatingMode) {
            setTimeout(() => searchInputRef.current?.focus(), 30);
        }
    }, [open, creatingMode]);

    const handleQuickCreateSubmit = async () => {
        if (!onQuickCreate || !newNameAr.trim()) return;
        setCreating(true);
        setCreateError(null);
        try {
            await onQuickCreate(newNameAr.trim(), newNameEn.trim() || undefined);
            setNewNameAr('');
            setNewNameEn('');
            setCreatingMode(false);
            setOpen(false);
            setSearch('');
        } catch (err: any) {
            setCreateError(err?.response?.data?.message || t('shared.create_failed'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">
                        {label} {required && <span className="text-[var(--status-danger)]">*</span>}
                    </label>
                    {onQuickCreate && !disabled && (
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(true);
                                setCreatingMode(true);
                                setCreateError(null);
                            }}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--tenant-primary)] hover:underline"
                        >
                            <Plus className="h-3 w-3" />
                            {resolvedQuickCreateLabel}
                        </button>
                    )}
                </div>
            )}

            {/* Hidden native input to participate in HTML5 required validation */}
            {required && (
                <input
                    tabIndex={-1}
                    aria-hidden="true"
                    required
                    value={value}
                    onChange={() => {}}
                    className="sr-only"
                />
            )}

            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    setOpen((prev) => !prev);
                    setCreatingMode(false);
                }}
                className="w-full flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)] disabled:opacity-50 disabled:cursor-not-allowed text-start"
            >
                <span className={`truncate ${selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {selectedOption ? selectedOption.label : resolvedPlaceholder}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {value && !required && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="p-0.5 rounded hover:bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                            title={t('shared.clear_selection')}
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div className="absolute z-40 mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-lg overflow-hidden">
                    {creatingMode && onQuickCreate ? (
                        <div className="p-3 space-y-2.5 bg-[var(--surface-secondary)]/30">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[var(--text-primary)]">{resolvedQuickCreateLabel}</span>
                                <button
                                    type="button"
                                    onClick={() => setCreatingMode(false)}
                                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={newNameAr}
                                onChange={(e) => setNewNameAr(e.target.value)}
                                placeholder={`${t('common.name_ar')} *`}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickCreateSubmit();
                                    }
                                }}
                                className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                            />
                            <input
                                type="text"
                                value={newNameEn}
                                onChange={(e) => setNewNameEn(e.target.value)}
                                placeholder={`${t('common.name_en')} (${t('common.optional')})`}
                                dir="ltr"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickCreateSubmit();
                                    }
                                }}
                                className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                            />
                            {createError && <p className="text-[11px] text-[var(--status-danger)]">{createError}</p>}
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCreatingMode(false)}
                                    className="px-2.5 py-1 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-secondary)]"
                                >
                                    {t('common.back')}
                                </button>
                                <button
                                    type="button"
                                    disabled={creating || !newNameAr.trim()}
                                    onClick={handleQuickCreateSubmit}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--tenant-primary)] text-white disabled:opacity-50"
                                >
                                    {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {t('shared.save_and_select')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-2 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]/30">
                                <div className="relative">
                                    <Search className="absolute start-2.5 top-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={resolvedSearchPlaceholder}
                                        className="w-full ps-8 pe-2.5 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                    />
                                </div>
                            </div>
                            <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border-default)]/40">
                                {filtered.length === 0 ? (
                                    <div className="p-3 text-center space-y-2">
                                        <p className="text-xs text-[var(--text-muted)]">{t('common.no_results')}</p>
                                        {onQuickCreate && search.trim() && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewNameAr(search.trim());
                                                    setCreatingMode(true);
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-md)] bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] text-xs font-semibold hover:bg-[var(--tenant-primary)]/20"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                {t('shared.add_named', { name: search.trim() })}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filtered.map((opt) => {
                                        const isSelected = String(opt.value) === String(value);
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    onChange(opt.value);
                                                    setOpen(false);
                                                    setSearch('');
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-start transition-colors ${
                                                    isSelected
                                                        ? 'bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] font-semibold'
                                                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                                                }`}
                                            >
                                                <span className="truncate">{opt.label}</span>
                                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
