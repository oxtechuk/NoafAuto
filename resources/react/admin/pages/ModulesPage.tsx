import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Blocks, Check, X, ShieldAlert } from 'lucide-react';

export const ModulesPage: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: modulesData, isLoading } = useQuery({
        queryKey: ['admin', 'modules'],
        queryFn: async () => {
            const res = await apiClient.get('/modules');
            return res.data?.data;
        },
    });

    const enableMutation = useMutation({
        mutationFn: (key: string) => apiClient.post(`/modules/${key}/enable`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'modules'] }),
    });

    const disableMutation = useMutation({
        mutationFn: (key: string) => apiClient.post(`/modules/${key}/disable`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'modules'] }),
    });

    const modules = modulesData || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-900">نظام الموديولات والوحدات (Sitekit Modules)</h1>
                <p className="text-xs text-slate-500 mt-1">
                    التحكم في تفعيل وتعطيل وحدات النظام المستقلة دون المساس بالنواة
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : modules.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-slate-400 text-xs">
                        <Blocks className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        لا توجد موديولات إضافية مثبتة في <code>app/Modules</code> حالياً.
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modules.map((m: any) => (
                        <Card key={m.key} className="flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                            <Blocks className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-bold text-sm text-slate-800">{m.name}</h3>
                                    </div>
                                    <Badge variant={m.enabled ? 'success' : 'slate'}>
                                        {m.enabled ? 'مفعّل' : 'معطّل'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 font-mono">key: {m.key} | v{m.version}</p>
                            </div>

                            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400">
                                    {m.permissions?.length || 0} صلاحيات
                                </span>
                                {m.enabled ? (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        loading={disableMutation.isPending}
                                        onClick={() => disableMutation.mutate(m.key)}
                                    >
                                        <X className="h-3.5 w-3.5 me-1" /> تعطيل
                                    </Button>
                                ) : (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        loading={enableMutation.isPending}
                                        onClick={() => enableMutation.mutate(m.key)}
                                    >
                                        <Check className="h-3.5 w-3.5 me-1" /> تفعيل
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
