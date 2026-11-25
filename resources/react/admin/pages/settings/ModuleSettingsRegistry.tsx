import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Blocks, ExternalLink } from 'lucide-react';

/**
 * Modules temporarily excluded from automatic inclusion in Site Settings.
 */
export const SKIPPED_SETTINGS_MODULES = new Set<string>();

export interface AdminModuleDescriptor {
    key: string;
    name: string;
    description?: string;
    version?: string;
    enabled: boolean;
    admin?: {
        path?: string;
        label?: string;
    };
}

const AiAssistantPanel = React.lazy(() =>
    import('../AiAssistantPage').then((m) => ({ default: m.AiAssistantPage }))
);
const WhatsAppPanel = React.lazy(() =>
    import('../WhatsAppPage').then((m) => ({ default: m.WhatsAppPage }))
);

/**
 * Registry mapping module keys to their embedded settings component.
 * Any enabled module (except those in SKIPPED_SETTINGS_MODULES) will
 * automatically appear inside Site Settings.
 */
const MODULE_PANELS: Record<string, React.LazyExoticComponent<React.ComponentType<{ embedded?: boolean }>>> = {
    'ai-assistant': AiAssistantPanel,
    whatsapp: WhatsAppPanel,
};

export const ModuleSettingsRenderer: React.FC<{ module: AdminModuleDescriptor }> = ({ module }) => {
    const { t } = useTranslation('admin');
    const Panel = MODULE_PANELS[module.key];

    if (Panel) {
        return (
            <div className="p-6">
                <React.Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">{t('settings.modules.loading', { name: module.name })}</div>}>
                    <Panel embedded />
                </React.Suspense>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]">
                        <Blocks className="h-5 w-5" />
                    </div>
                    <div>
                        <h5 className="font-bold text-sm text-[var(--text-primary)]">{module.name}</h5>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {module.description || t('settings.modules.default_desc', { name: module.name })}
                        </p>
                    </div>
                </div>
                {module.version && (
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">v{module.version}</span>
                )}
            </div>

            {module.admin?.path ? (
                <div className="rounded-xl bg-[var(--surface-secondary)] p-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-[var(--text-secondary)]">
                        {t('settings.modules.manage_dedicated')}
                    </p>
                    <Link
                        to={module.admin.path}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--tenant-primary)] text-white text-xs font-semibold shrink-0"
                    >
                        <span>{t('settings.modules.open_btn', { name: module.admin.label || module.name })}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>
            ) : (
                <p className="text-xs text-[var(--text-muted)]">
                    {t('settings.modules.no_extra_settings')}
                </p>
            )}
        </div>
    );
};
