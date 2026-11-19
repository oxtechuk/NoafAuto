import React, { useState } from 'react';
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
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';

// 1. Kanban Tracking Page
export const KanbanTrackingPage: React.FC = () => {
    const queryClient = useQueryClient();

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['/api/v1/sales/tracking'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/sales/tracking');
            return res.data?.data || {};
        },
    });

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
            return await apiClient.patch(`/api/v1/sales/tracking/${id}/stage`, { stage });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/tracking'] });
        },
    });

    const stages: Record<string, { title: string; items: any[] }> = data || {};

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">
                        تتبع حالات الطلبات (Kanban Pipeline)
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        مسار تقدم طلبات الشراء والتمويل عبر المراحل المختلفة
                    </p>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="gap-1.5 text-xs"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    <span>تحديث اللوحة</span>
                </Button>
            </div>

            {isLoading ? (
                <div className="py-20 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--tenant-primary)]" />
                    <span>جاري تحميل مسار الطلبات...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
                    {Object.entries(stages).map(([stageKey, col]) => (
                        <div
                            key={stageKey}
                            className="bg-[var(--surface-secondary)]/60 rounded-xl p-3 border border-[var(--border-default)] flex flex-col min-w-[220px]"
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-default)]">
                                <span className="font-bold text-xs text-[var(--text-primary)]">
                                    {col.title}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--tenant-primary)] text-white">
                                    {col.items?.length || 0}
                                </span>
                            </div>

                            {/* Cards Container */}
                            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[65vh]">
                                {col.items?.map((item: any) => (
                                    <Card
                                        key={item.id}
                                        className="p-3 shadow-2xs hover:shadow-md transition-shadow bg-white text-xs space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800">
                                                #{item.id} {item.client_name}
                                            </span>
                                        </div>

                                        <p className="text-[11px] font-medium text-[var(--tenant-primary)] truncate">
                                            🚗 {item.car_name || 'سيارة غير محددة'}
                                        </p>

                                        {item.total_price && (
                                            <div className="text-[11px] font-bold text-slate-700">
                                                {Number(item.total_price).toLocaleString()} ر.س
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                                            <span>{item.created_at || 'الآن'}</span>
                                            {item.assigned_to && (
                                                <span className="text-slate-600 font-medium">
                                                    👤 {item.assigned_to}
                                                </span>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
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
        queryKey: ['/api/v1/sales/calculator'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/sales/calculator');
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
            return await apiClient.put('/api/v1/sales/calculator', formState);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/calculator'] });
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
