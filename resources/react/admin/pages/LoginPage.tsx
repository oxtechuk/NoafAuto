import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { switchAdminLanguage } from '../../i18n';
import { Button } from '../../shared/components/ui/Button';
import { Input } from '../../shared/components/ui/Input';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const isEn = i18n.language === 'en';
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login({ username, password });
            navigate('/admin');
        } catch (err: any) {
            setError(err.response?.data?.message || t('login.error_invalid'));
        } finally {
            setLoading(false);
        }
    };

    // Dynamic Admin Branding Settings from backend window injection
    const adminSettings =
        typeof window !== 'undefined'
            ? (window as any).__ADMIN_SETTINGS__ || {}
            : {};

    const bgImage = adminSettings.login_bg || null;
    const logoSrc = adminSettings.login_logo || adminSettings.site_logo || '/images/logo.png';

    // Title and Subtitle handling:
    // If user saved custom settings:
    //   - If they wrote title/subtitle: show them.
    //   - If they left them blank: show NO text (logo only).
    // If never configured (initial default state): show default text.
    const hasCustomSetting = adminSettings.has_title_setting;
    const title = hasCustomSetting
        ? (adminSettings.login_title?.trim() || null)
        : t('login.default_title');
    const subtitle = hasCustomSetting
        ? (adminSettings.login_subtitle?.trim() || null)
        : t('login.default_subtitle');
    const hasText = Boolean(title || subtitle);

    return (
        <div
            className="min-h-screen relative flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat transition-all duration-300"
            style={{
                backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                backgroundColor: !bgImage ? 'var(--tenant-sidebar-bg)' : undefined,
            }}
            dir={isEn ? 'ltr' : 'rtl'}
        >
            {/* Language Switcher on Login */}
            <button
                type="button"
                onClick={() => switchAdminLanguage(isEn ? 'ar' : 'en')}
                className="fixed top-4 end-4 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold shadow-md transition-all"
            >
                <span className="text-base leading-none">{isEn ? '🇸🇦' : '🇺🇸'}</span>
                <span>{isEn ? 'العربية' : 'English'}</span>
            </button>
            {/* Dark blur overlay when custom background image is applied */}
            {bgImage && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
            )}

            <div className="relative z-10 w-full max-w-md bg-[var(--surface-primary)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden border border-white/10 backdrop-blur-md">
                <div className="p-8 text-center bg-[var(--tenant-primary)] text-white transition-all">
                    <img
                        src={logoSrc}
                        alt={t('login.logo_alt')}
                        className={`${hasText ? 'h-20 max-h-20' : 'h-28 max-h-28'} w-auto mx-auto ${hasText ? 'mb-4' : 'mb-2'} object-contain drop-shadow-md transition-all`}
                        onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('/images/logo.png')) {
                                target.src = '/images/logo.png';
                            }
                        }}
                    />
                    {title && (
                        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                    )}
                    {subtitle && (
                        <p className="text-xs text-white/80 mt-1">{subtitle}</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
                    {error && (
                        <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--status-danger-bg)] border border-[var(--status-danger)]/20 text-xs text-[var(--status-danger)] font-medium">
                            {error}
                        </div>
                    )}

                    <Input
                        label={t('login.username_label')}
                        type="text"
                        placeholder={t('login.username_placeholder')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    <Input
                        label={t('login.password_label')}
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
                        <LogIn className="h-4 w-4 me-2" />
                        {t('login.submit')}
                    </Button>
                </form>
            </div>
        </div>
    );
};
