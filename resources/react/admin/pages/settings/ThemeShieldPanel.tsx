import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useThemeShield } from '../../context/BrandingContext';
import { apiClient } from '../../api/client';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';

export const ThemeShieldPanel: React.FC = () => {
    const { t } = useTranslation('admin');
    const { safeMode, setSafeMode, resetToFactoryDefaults } = useThemeShield();
    const [scope, setScope] = useState<'store_only' | 'both' | 'disabled'>('store_only');
    const [customCss, setCustomCss] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        apiClient
            .get('/settings')
            .then((res) => {
                const data = res.data?.data || {};
                if (data.theme_child_target_scope) setScope(data.theme_child_target_scope);
                if (typeof data.theme_child_custom_css === 'string') setCustomCss(data.theme_child_custom_css);
            })
            .catch(() => {});
    }, []);

    const saveShieldSettings = async (nextSafeMode?: boolean) => {
        setSaving(true);
        setMessage(null);
        try {
            await apiClient.post('/settings', {
                theme_safe_mode: nextSafeMode !== undefined ? nextSafeMode : safeMode,
                theme_child_target_scope: scope,
                theme_child_custom_css: customCss,
            });
            setMessage(t('theme_shield.saved'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h5 className="font-bold text-sm text-[var(--text-primary)]">
                                {t('theme_shield.title')}
                            </h5>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                {t('theme_shield.subtitle')}
                            </p>
                        </div>
                    </div>

                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            safeMode
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                    >
                        {safeMode ? (
                            <>
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                <span>{t('theme_shield.safe_mode_on')}</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{t('theme_shield.shield_active')}</span>
                            </>
                        )}
                    </span>
                </div>

                {message && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                        {message}
                    </div>
                )}

                {/* Safe Mode Toggle */}
                <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-700" />
                            <span className="font-bold text-sm text-amber-900">{t('theme_shield.emergency_title')}</span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                            {t('theme_shield.emergency_desc')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const next = !safeMode;
                            setSafeMode(next);
                            saveShieldSettings(next);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            safeMode
                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                    >
                        {safeMode ? t('theme_shield.disable_safe') : t('theme_shield.enable_safe')}
                    </button>
                </div>

                {/* Scope Isolation */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                        {t('theme_shield.scope_label')}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                            { value: 'store_only', title: t('theme_shield.scope_store'), badge: t('theme_shield.scope_store_badge'), desc: t('theme_shield.scope_store_desc') },
                            { value: 'both', title: t('theme_shield.scope_both'), badge: '', desc: t('theme_shield.scope_both_desc') },
                            { value: 'disabled', title: t('theme_shield.scope_disabled'), badge: '', desc: t('theme_shield.scope_disabled_desc') },
                        ].map((opt) => (
                            <label
                                key={opt.value}
                                className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    scope === opt.value
                                        ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="theme_child_target_scope"
                                    value={opt.value}
                                    checked={scope === opt.value}
                                    onChange={(e) => setScope(e.target.value as any)}
                                    className="sr-only"
                                />
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs text-[var(--text-primary)]">{opt.title}</span>
                                    {opt.badge && (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                                            {opt.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-[var(--text-secondary)]">{opt.desc}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Custom CSS */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] block">
                        {t('theme_shield.custom_css')}
                    </label>
                    <textarea
                        rows={5}
                        dir="ltr"
                        value={customCss}
                        onChange={(e) => setCustomCss(e.target.value)}
                        placeholder="/* Custom CSS */"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-mono bg-slate-900 text-emerald-400"
                    />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border-default)]">
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm(t('theme_shield.reset_confirm'))) {
                                resetToFactoryDefaults();
                            }
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all inline-flex items-center gap-1.5"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t('theme_shield.reset_btn')}
                    </button>

                    <Button loading={saving} onClick={() => saveShieldSettings()}>
                        {t('theme_shield.save_btn')}
                    </Button>
                </div>
            </div>
        </Card>
    );
};
