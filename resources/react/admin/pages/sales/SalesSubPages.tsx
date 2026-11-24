import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Layers,
    Calculator,
    RefreshCw,
    Save,
    CheckCircle2,
    Clock,
    Phone,
    User,
    DollarSign,
    Car,
    GripVertical,
    Search,
    MessageCircle,
    ArrowRightLeft,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';

interface KanbanItem {
    id: number;
    client_name: string;
    client_phone: string;
    car_name?: string;
    total_price?: string | number;
    assigned_to?: string;
    created_at?: string;
}

interface KanbanStage {
    title: string;
    items: KanbanItem[];
}

const STAGE_CONFIG: Record<string, { title: string; color: string; badge: string; border: string }> = {
    new: {
        title: 'طلبات جديدة',
        color: 'bg-blue-500',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        border: 'border-t-blue-500',
    },
    contacted: {
        title: 'تم التواصل',
        color: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        border: 'border-t-amber-500',
    },
    credit_check: {
        title: 'فحص ائتماني',
        color: 'bg-purple-500',
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        border: 'border-t-purple-500',
    },
    bank_approval: {
        title: 'موافقة البنك',
        color: 'bg-indigo-500',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        border: 'border-t-indigo-500',
    },
    shipping: {
        title: 'تجهيز وشحن',
        color: 'bg-cyan-500',
        badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        border: 'border-t-cyan-500',
    },
    delivered: {
        title: 'تم التسليم',
        color: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        border: 'border-t-emerald-500',
    },
};

// 1. Kanban Tracking Page with full Drag & Drop
export const KanbanTrackingPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedItem, setDraggedItem] = useState<{ id: number; sourceStage: string } | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);
    const [movingId, setMovingId] = useState<number | null>(null);

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['/sales/tracking'],
        queryFn: async () => {
            const res = await apiClient.get('/sales/tracking');
            return (res.data?.data || {}) as Record<string, KanbanStage>;
        },
    });

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
            setMovingId(id);
            return await apiClient.patch(`/sales/tracking/${id}/stage`, { stage });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/sales/tracking'] });
        },
        onError: () => {
            // Revert on error
            refetch();
        },
        onSettled: () => {
            setMovingId(null);
        },
    });

    const stages: Record<string, KanbanStage> = useMemo(() => {
        return data || {};
    }, [data]);

    const handleMoveStage = (id: number, targetStage: string, sourceStage: string) => {
        if (targetStage === sourceStage) return;

        // Optimistic UI update
        queryClient.setQueryData(['/sales/tracking'], (oldData: Record<string, KanbanStage> | undefined) => {
            if (!oldData) return oldData;
            const updated = JSON.parse(JSON.stringify(oldData)) as Record<string, KanbanStage>;

            const sourceItems = updated[sourceStage]?.items || [];
            const index = sourceItems.findIndex((it) => it.id === id);
            if (index === -1) return oldData;

            const [item] = sourceItems.splice(index, 1);
            if (updated[targetStage]) {
                if (!updated[targetStage].items) updated[targetStage].items = [];
                updated[targetStage].items.unshift(item);
            }
            return updated;
        });

        updateStageMutation.mutate({ id, stage: targetStage });
    };

    const totalCount = useMemo(() => {
        return Object.values(stages).reduce((sum, col) => sum + (col.items?.length || 0), 0);
    }, [stages]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="h-6 w-6 text-indigo-600" />
                        <span>تتبع مسار الطلبات (Kanban Pipeline)</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {totalCount} طلب
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        اسحب الكرت بالموس وأفلته في المرحلة التالية لنقله مباشرة، أو استخدم القائمة السريعة
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="بحث بالعميل أو السيارة..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="gap-1.5 text-xs shrink-0"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        <span>تحديث</span>
                    </Button>
                </div>
            </div>

            {/* Kanban Columns */}
            {isLoading ? (
                <div className="py-24 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
                    <span className="text-sm font-medium">جاري تحميل مسار الطلبات...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4 items-start">
                    {Object.entries(stages).map(([stageKey, col]) => {
                        const config = STAGE_CONFIG[stageKey] || {
                            title: col.title,
                            color: 'bg-slate-500',
                            badge: 'bg-slate-100 text-slate-700 border-slate-200',
                            border: 'border-t-slate-400',
                        };

                        const isOver = dragOverStage === stageKey;

                        const filteredItems = (col.items || []).filter((item) => {
                            if (!searchQuery.trim()) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                                item.client_name?.toLowerCase().includes(q) ||
                                item.client_phone?.includes(q) ||
                                item.car_name?.toLowerCase().includes(q) ||
                                String(item.id).includes(q)
                            );
                        });

                        return (
                            <div
                                key={stageKey}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverStage !== stageKey) {
                                        setDragOverStage(stageKey);
                                    }
                                }}
                                onDragLeave={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDragOverStage((curr) => (curr === stageKey ? null : curr));
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverStage(null);
                                    try {
                                        const raw = e.dataTransfer.getData('text/plain');
                                        if (raw) {
                                            const parsed = JSON.parse(raw);
                                            if (parsed?.id && parsed.sourceStage) {
                                                handleMoveStage(parsed.id, stageKey, parsed.sourceStage);
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Drop parse error', err);
                                    }
                                    setDraggedItem(null);
                                }}
                                className={`rounded-xl p-2.5 border-t-4 ${config.border} border border-slate-200 transition-all flex flex-col min-w-[210px] ${
                                    isOver
                                        ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/40 shadow-md'
                                        : 'bg-slate-100/70'
                                }`}
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${config.color}`} />
                                        <span className="font-bold text-xs text-slate-800">
                                            {config.title}
                                        </span>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badge}`}
                                    >
                                        {filteredItems.length}
                                    </span>
                                </div>

                                {/* Cards List */}
                                <div className="space-y-2 flex-1 min-h-[120px] max-h-[70vh] overflow-y-auto pr-0.5">
                                    {filteredItems.map((item) => {
                                        const isBeingDragged = draggedItem?.id === item.id;
                                        const isUpdating = movingId === item.id;

                                        return (
                                            <div
                                                key={item.id}
                                                draggable={!isUpdating}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData(
                                                        'text/plain',
                                                        JSON.stringify({ id: item.id, sourceStage: stageKey })
                                                    );
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    setDraggedItem({ id: item.id, sourceStage: stageKey });
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedItem(null);
                                                    setDragOverStage(null);
                                                }}
                                                className={`p-3 rounded-lg bg-white border border-slate-200 shadow-2xs transition-all select-none cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-300 relative group ${
                                                    isBeingDragged
                                                        ? 'opacity-30 border-dashed border-indigo-500 scale-95'
                                                        : ''
                                                } ${isUpdating ? 'animate-pulse pointer-events-none' : ''}`}
                                            >
                                                {/* Card Header */}
                                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                                                        <span className="font-bold text-xs text-slate-900 truncate">
                                                            {item.client_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                                        #{item.id}
                                                    </span>
                                                </div>

                                                {/* Car info */}
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50/60 px-2 py-1 rounded-md mb-2">
                                                    <Car className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{item.car_name || 'سيارة غير محددة'}</span>
                                                </div>

                                                {/* Price & Contact */}
                                                <div className="flex items-center justify-between gap-2 text-xs mb-2">
                                                    {item.total_price ? (
                                                        <span className="font-extrabold text-slate-800 text-[11px]">
                                                            {Number(item.total_price).toLocaleString()} <span className="text-[9px] font-normal text-slate-500">ر.س</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">السعر غير محدد</span>
                                                    )}

                                                    {item.client_phone && (
                                                        <a
                                                            href={`https://wa.me/${item.client_phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title={`مراسلة واتساب: ${item.client_phone}`}
                                                            className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded transition-colors"
                                                        >
                                                            <MessageCircle className="h-2.5 w-2.5" />
                                                            <span>واتساب</span>
                                                        </a>
                                                    )}
                                                </div>

                                                {/* Footer: Date & Assignee */}
                                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                                                    <span>{item.created_at || 'الآن'}</span>
                                                    {item.assigned_to ? (
                                                        <span className="text-slate-600 font-medium truncate max-w-[90px]" title={item.assigned_to}>
                                                            👤 {item.assigned_to}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">غير مسند</span>
                                                    )}
                                                </div>

                                                {/* Quick Stage Mover Selector (Click Alternative to Drag) */}
                                                <div className="mt-2 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                                        <ArrowRightLeft className="h-2.5 w-2.5" />
                                                        <span>نقل إلى:</span>
                                                    </span>
                                                    <select
                                                        value={stageKey}
                                                        onChange={(e) => {
                                                            const newStage = e.target.value;
                                                            if (newStage && newStage !== stageKey) {
                                                                handleMoveStage(item.id, newStage, stageKey);
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        disabled={isUpdating}
                                                        className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                                    >
                                                        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                                                            <option key={key} value={key}>
                                                                {cfg.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Empty drop zone state */}
                                    {filteredItems.length === 0 && (
                                        <div
                                            className={`h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center p-2 transition-colors ${
                                                isOver
                                                    ? 'border-indigo-400 bg-indigo-50/50 text-indigo-600'
                                                    : 'border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            <span className="text-[11px] font-medium">
                                                {isOver ? 'أفلت البطاقة هنا' : 'لا توجد طلبات'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 mt-0.5">
                                                اسحب أي كرت وأفلته هنا
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// 2. Calculator Settings Page
export const CalculatorSettingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [savedMsg, setSavedMsg] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['/sales/calculator'],
        queryFn: async () => {
            const res = await apiClient.get('/sales/calculator');
            return res.data?.data || {};
        },
    });

    const [formState, setFormState] = useState<Record<string, any>>({});

    React.useEffect(() => {
        if (data) {
            setFormState(data);
        }
    }, [data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            return await apiClient.put('/sales/calculator', formState);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/sales/calculator'] });
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 3000);
        },
    });

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                    إعدادات حاسبة التمويل والأقساط
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    تعديل نسب الفائدة البنكية، الحد الأقصى للسنوات، ونسب الدفعة الأولى المعروضة للعملاء
                </p>
            </div>

            {savedMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>تم حفظ إعدادات الحاسبة بنجاح!</span>
                </div>
            )}

            <Card className="p-6">
                {isLoading ? (
                    <div className="py-12 text-center text-slate-400">
                        جاري تحميل إعدادات الحاسبة...
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveMutation.mutate();
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                النسبة السنوية للربح البنكي (%)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formState.profit_rate || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, profit_rate: e.target.value })
                                }
                                placeholder="مثال: 3.75"
                                className="text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                الحد الأقصى لسنوات التمويل (بالسنوات)
                            </label>
                            <Input
                                type="number"
                                value={formState.max_years || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, max_years: e.target.value })
                                }
                                placeholder="مثال: 5"
                                className="text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                الحد الأدنى للدفعة الأولى (%)
                            </label>
                            <Input
                                type="number"
                                value={formState.min_down_payment || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, min_down_payment: e.target.value })
                                }
                                placeholder="مثال: 0 أو 10"
                                className="text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                الحد الأقصى للدفعة الأخيرة (البالون) (%)
                            </label>
                            <Input
                                type="number"
                                value={formState.last_payment_max || ''}
                                onChange={(e) =>
                                    setFormState({ ...formState, last_payment_max: e.target.value })
                                }
                                placeholder="مثال: 40"
                                className="text-xs"
                            />
                        </div>

                        <div className="pt-4 border-t border-[var(--border-default)] flex justify-end">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={saveMutation.isPending}
                                className="gap-1.5 text-xs"
                            >
                                <Save className="h-4 w-4" />
                                <span>
                                    {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                                </span>
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
};
