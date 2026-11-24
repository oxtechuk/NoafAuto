import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Pagination } from '../../shared/components/ui/Pagination';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { Card } from '../../shared/components/ui/Card';
import { StatusBadge } from '../../shared/components/ui/StatusBadge';
import { Badge } from '../../shared/components/ui/Badge';
import { Search, Phone, Mail, User, Calendar } from 'lucide-react';

export const LeadsPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebouncedValue(search, 300);

    const { data: leadsResponse, isLoading } = useQuery({
        queryKey: ['admin', 'leads', { page, search: debouncedSearch }],
        queryFn: async () => {
            const res = await apiClient.get('/leads', {
                params: { page, search: debouncedSearch || undefined },
            });
            return res.data;
        },
        placeholderData: keepPreviousData,
    });

    const leads = leadsResponse?.data || [];
    const meta = leadsResponse?.meta;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">العملاء المحتملين (Leads)</h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">سجل العملاء المتواصلين ومصادر الحملات</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 shadow-[var(--shadow-xs)] flex items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم، الجوال أو البريد..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="p-0 overflow-hidden" padding="none">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary)]"></div>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-16 text-[var(--text-muted)] text-xs">
                        لا يوجد عملاء يطابقون هذا البحث.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                            <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-default)]">
                                <tr>
                                    <th className="py-3 px-4 text-start">العميل</th>
                                    <th className="py-3 px-4 text-start">معلومات الاتصال</th>
                                    <th className="py-3 px-4 text-start">المصدر</th>
                                    <th className="py-3 px-4 text-start">الحالة</th>
                                    <th className="py-3 px-4 text-start">المسند إليه</th>
                                    <th className="py-3 px-4 text-start">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                                {leads.map((lead: any) => (
                                    <tr key={lead.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                                            {lead.client_name}
                                        </td>
                                        <td className="py-3.5 px-4 space-y-0.5">
                                            {lead.client_phone && (
                                                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                    <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                    <span dir="ltr">{lead.client_phone}</span>
                                                </div>
                                            )}
                                            {lead.client_email && (
                                                <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
                                                    <Mail className="h-3 w-3 text-[var(--text-muted)]" />
                                                    <span>{lead.client_email}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Badge variant="neutral">{lead.contact_source?.name || 'موقع زاد'}</Badge>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <StatusBadge status={lead.status} label={lead.status_label || lead.status} />
                                        </td>
                                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                                            {lead.assigned_to?.name || 'غير مسند'}
                                        </td>
                                        <td className="py-3.5 px-4 text-[var(--text-muted)] text-[11px]">
                                            {lead.started_at || lead.created_at?.slice(0, 10)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {(meta?.last_page ?? 1) > 1 && (
                <Pagination
                    currentPage={meta?.current_page ?? page}
                    lastPage={meta?.last_page ?? 1}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
};
