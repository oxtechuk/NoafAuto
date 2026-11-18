import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Search, Phone, Mail, User, Calendar } from 'lucide-react';

export const LeadsPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const { data: leadsResponse, isLoading } = useQuery({
        queryKey: ['admin', 'leads', { page, search }],
        queryFn: async () => {
            const res = await apiClient.get('/leads', {
                params: { page, search },
            });
            return res.data;
        },
    });

    const leads = leadsResponse?.data || [];
    const meta = leadsResponse?.meta;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">العملاء المحتملين (Leads)</h1>
                    <p className="text-xs text-slate-500 mt-1">سجل العملاء المتواصلين ومصادر الحملات</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم، الجوال أو البريد..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full ps-9 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600"
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs">
                        لا يوجد عملاء يطابقون هذا البحث.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4 text-start">العميل</th>
                                    <th className="py-3 px-4 text-start">معلومات الاتصال</th>
                                    <th className="py-3 px-4 text-start">المصدر</th>
                                    <th className="py-3 px-4 text-start">الحالة</th>
                                    <th className="py-3 px-4 text-start">المسند إليه</th>
                                    <th className="py-3 px-4 text-start">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {leads.map((lead: any) => (
                                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                                            {lead.client_name}
                                        </td>
                                        <td className="py-3.5 px-4 space-y-0.5">
                                            {lead.client_phone && (
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                    <span dir="ltr">{lead.client_phone}</span>
                                                </div>
                                            )}
                                            {lead.client_email && (
                                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                                    <Mail className="h-3 w-3 text-slate-400" />
                                                    <span>{lead.client_email}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Badge variant="slate">{lead.contact_source?.name || 'موقع زاد'}</Badge>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Badge variant="primary">{lead.status_label || lead.status}</Badge>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600">
                                            {lead.assigned_to?.name || 'غير مسند'}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                                            {lead.started_at || lead.created_at?.slice(0, 10)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};
