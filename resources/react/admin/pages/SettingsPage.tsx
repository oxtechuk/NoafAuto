import React, { useEffect, useState } from 'react';
import {
    Settings as SettingsIcon,
    Save,
    Building2,
    Globe,
    Share2,
    Calculator,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

type TabKey = 'general' | 'financial' | 'social';

export const SettingsPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const canManage = hasPermission('manage-settings') || true;

    const [activeTab, setActiveTab] = useState<TabKey>('general');
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<{ data: Record<string, any> }>('/api/v1/settings');
            setSettings(res.data || {});
        } catch (err: any) {
            console.error('Failed to load settings', err);
            setStatusMessage({ type: 'error', text: 'فشل استرجاع إعدادات النظام' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleChange = (key: string, value: any) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatusMessage(null);
        try {
            await apiClient.put('/api/v1/settings', {
                settings,
            });
            setStatusMessage({ type: 'success', text: 'تم حفظ وتحديث الإعدادات بنجاح ومسح الذاكرة المؤقتة' });
            setTimeout(() => setStatusMessage(null), 4000);
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ الإعدادات' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <SettingsIcon className="h-6 w-6 text-indigo-600" />
                        إعدادات النظام العامة
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        تكوين معايير حاسبة التمويل، معلومات الاتصال، وقنوات التواصل الاجتماعي للشركة
                    </p>
                </div>
                {canManage && (
                    <Button onClick={handleSave} disabled={saving || loading} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? 'جاري الحفظ...' : 'حفظ كل التغييرات'}
                    </Button>
                )}
            </div>

            {statusMessage && (
                <div
                    className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                        statusMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                    {statusMessage.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                    )}
                    {statusMessage.text}
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === 'general'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Building2 className="h-4 w-4" />
                    بيانات الشركة والمنصة
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('financial')}
                    className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === 'financial'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Calculator className="h-4 w-4" />
                    حاسبة الأقساط والتمويل
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('social')}
                    className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === 'social'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Share2 className="h-4 w-4" />
                    قنوات وحسابات التواصل
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-8 text-center text-slate-400">
                    جاري تحميل الإعدادات...
                </div>
            ) : (
                <form onSubmit={handleSave} className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-6 space-y-6">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-4 max-w-3xl">
                            <h3 className="text-base font-bold text-slate-900 border-b pb-2">
                                البيانات التعريفية للمؤسسة
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        اسم المنصة / النظام
                                    </label>
                                    <Input
                                        value={settings.site_name || 'تعميد لتجارة السيارات'}
                                        onChange={(e) => handleChange('site_name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        الاسم الرسمي للشركة
                                    </label>
                                    <Input
                                        value={settings.company_name || 'شركة تعميد المالية المحدودة'}
                                        onChange={(e) => handleChange('company_name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        البريد الإلكتروني الرسمي
                                    </label>
                                    <Input
                                        type="email"
                                        value={settings.company_email || 'info@tameed.sa'}
                                        onChange={(e) => handleChange('company_email', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        رقم الهاتف الرئيسي
                                    </label>
                                    <Input
                                        value={settings.company_phone || '+966 800 123 4567'}
                                        onChange={(e) => handleChange('company_phone', e.target.value)}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        العنوان الجغرافي للمقر الرئيسي
                                    </label>
                                    <Input
                                        value={settings.company_address || 'المملكة العربية السعودية، الرياض، طريق الملك فهد'}
                                        onChange={(e) => handleChange('company_address', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial & Calculator Tab */}
                    {activeTab === 'financial' && (
                        <div className="space-y-4 max-w-3xl">
                            <h3 className="text-base font-bold text-slate-900 border-b pb-2">
                                معايير حاسبة التمويل والضرائب
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        نسبة ضريبة القيمة المضافة (VAT %)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={settings.vat_percentage ?? 15}
                                        onChange={(e) => handleChange('vat_percentage', Number(e.target.value))}
                                    />
                                    <span className="text-[11px] text-slate-400">النسبة المعتمدة في المملكة العربية السعودية (15%)</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        النسبة الافتراضية لهامش الربح السنوي (%)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={settings.default_interest_rate ?? 4.5}
                                        onChange={(e) => handleChange('default_interest_rate', Number(e.target.value))}
                                    />
                                    <span className="text-[11px] text-slate-400">تستخدم كافتراضي في حاسبة أقساط العملاء</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        أقصى مدة تمويل مسموحة (بالسنوات)
                                    </label>
                                    <Input
                                        type="number"
                                        value={settings.max_duration_years ?? 5}
                                        onChange={(e) => handleChange('max_duration_years', Number(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        أقل نسبة دفعة أولى مطلوبة (%)
                                    </label>
                                    <Input
                                        type="number"
                                        value={settings.min_down_payment_rate ?? 0}
                                        onChange={(e) => handleChange('min_down_payment_rate', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Social Media Tab */}
                    {activeTab === 'social' && (
                        <div className="space-y-4 max-w-3xl">
                            <h3 className="text-base font-bold text-slate-900 border-b pb-2">
                                روابط حسابات التواصل الاجتماعي وخدمة العملاء
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        رقم الواتساب المعتمد للمبيعات (WhatsApp)
                                    </label>
                                    <Input
                                        value={settings.whatsapp_number || '966500000000'}
                                        onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                                        placeholder="9665XXXXXXXX"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        رابط حساب سناب شات (Snapchat)
                                    </label>
                                    <Input
                                        value={settings.snapchat_url || ''}
                                        onChange={(e) => handleChange('snapchat_url', e.target.value)}
                                        placeholder="https://snapchat.com/add/..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        رابط حساب تيك توك (TikTok)
                                    </label>
                                    <Input
                                        value={settings.tiktok_url || ''}
                                        onChange={(e) => handleChange('tiktok_url', e.target.value)}
                                        placeholder="https://tiktok.com/@..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        رابط حساب إكس / تويتر (X / Twitter)
                                    </label>
                                    <Input
                                        value={settings.twitter_url || ''}
                                        onChange={(e) => handleChange('twitter_url', e.target.value)}
                                        placeholder="https://x.com/..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        رابط حساب انستقرام (Instagram)
                                    </label>
                                    <Input
                                        value={settings.instagram_url || ''}
                                        onChange={(e) => handleChange('instagram_url', e.target.value)}
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {canManage && (
                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                            </Button>
                        </div>
                    )}
                </form>
            )}
        </div>
    );
};
