import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ChildThemeData {
    enabled: boolean;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    sidebar_bg_color?: string;
    border_radius?: string; // e.g. '8px', '12px'
    custom_css?: string;
    target_scope?: 'both' | 'store_only' | 'admin_only';
}

export interface BrandingData {
    company_name: string;
    logo_url: string | null;
    primary_color: string;
    primary_hover_color: string;
    secondary_color: string;
    accent_color: string;
    sidebar_bg_color: string;
    child_theme?: ChildThemeData;
    safe_mode?: boolean;
}

const DEFAULTS: BrandingData = {
    company_name: 'تعميد للتمويل',
    logo_url: '/images/logo.png',
    primary_color: '#002F29',
    primary_hover_color: '#001F1B',
    secondary_color: '#D5F500',
    accent_color: '#D5F500',
    sidebar_bg_color: '#002F29',
    child_theme: {
        enabled: false,
        primary_color: '#002F29',
        secondary_color: '#D5F500',
        accent_color: '#D5F500',
        sidebar_bg_color: '#002F29',
        border_radius: '12px',
        custom_css: '',
        target_scope: 'both',
    },
    safe_mode: false,
};

interface ThemeShieldContextType {
    branding: BrandingData;
    isLoading: boolean;
    safeMode: boolean;
    setSafeMode: (enabled: boolean) => void;
    childTheme: ChildThemeData;
    resetToFactoryDefaults: () => Promise<void>;
}

const ThemeShieldContext = createContext<ThemeShieldContextType>({
    branding: DEFAULTS,
    isLoading: false,
    safeMode: false,
    setSafeMode: () => {},
    childTheme: DEFAULTS.child_theme!,
    resetToFactoryDefaults: async () => {},
});

/**
 * Injects safe Child Theme CSS rules and CSS variables into the DOM
 */
function applyThemeToDOM(branding: BrandingData, safeMode: boolean): void {
    const root = document.documentElement;
    const styleId = 'tameed-child-theme-shield';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (safeMode) {
        // Safe Mode: Enforce baseline defaults and purge any injected child theme CSS
        root.style.setProperty('--tenant-primary', DEFAULTS.primary_color);
        root.style.setProperty('--tenant-primary-hover', DEFAULTS.primary_hover_color);
        root.style.setProperty('--tenant-secondary', DEFAULTS.secondary_color);
        root.style.setProperty('--tenant-accent', DEFAULTS.accent_color);
        root.style.setProperty('--tenant-sidebar-bg', DEFAULTS.sidebar_bg_color);
        root.style.setProperty('--app-radius', '12px');
        if (styleTag) {
            styleTag.textContent = '';
        }
        return;
    }

    const child = branding.child_theme;
    const isChildActive = child?.enabled && child.target_scope !== 'store_only';

    const activePrimary = isChildActive && child.primary_color ? child.primary_color : branding.primary_color;
    const activeSecondary = isChildActive && child.secondary_color ? child.secondary_color : branding.secondary_color;
    const activeAccent = isChildActive && child.accent_color ? child.accent_color : branding.accent_color;
    const activeSidebar = isChildActive && child.sidebar_bg_color ? child.sidebar_bg_color : branding.sidebar_bg_color;
    const activeRadius = isChildActive && child.border_radius ? child.border_radius : '12px';

    root.style.setProperty('--tenant-primary', activePrimary);
    root.style.setProperty('--tenant-primary-hover', activePrimary);
    root.style.setProperty('--tenant-secondary', activeSecondary);
    root.style.setProperty('--tenant-accent', activeAccent);
    root.style.setProperty('--tenant-sidebar-bg', activeSidebar);
    root.style.setProperty('--app-radius', activeRadius);

    // Apply custom scoped CSS if provided and child theme is active
    if (isChildActive && child?.custom_css && child.custom_css.trim()) {
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        // Sanitize dangerous rules that might hide body or root
        const sanitizedCss = child.custom_css
            .replace(/body\s*\{[^}]*display\s*:\s*none[^}]*\}/gi, '/* blocked dangerous rule */')
            .replace(/html\s*\{[^}]*display\s*:\s*none[^}]*\}/gi, '/* blocked dangerous rule */');

        styleTag.textContent = `\n/* 🛡️ Tameed Child Theme Overrides */\n${sanitizedCss}\n`;
    } else if (styleTag) {
        styleTag.textContent = '';
    }
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();

    // Check URL or localStorage for safe mode
    const [safeMode, setSafeModeState] = useState<boolean>(() => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('safe_mode') === '1') {
                return true;
            }
            return localStorage.getItem('tameed_safe_mode') === 'true';
        } catch {
            return false;
        }
    });

    const setSafeMode = (enabled: boolean): void => {
        setSafeModeState(enabled);
        try {
            if (enabled) {
                localStorage.setItem('tameed_safe_mode', 'true');
            } else {
                localStorage.removeItem('tameed_safe_mode');
            }
        } catch (e) {
            console.error('Failed to persist safe mode state', e);
        }
    };

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'branding'],
        queryFn: async () => {
            const res = await apiClient.get('/branding');
            return res.data?.data as BrandingData;
        },
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const branding = data ?? DEFAULTS;
    const childTheme = branding.child_theme ?? DEFAULTS.child_theme!;

    useEffect(() => {
        applyThemeToDOM(branding, safeMode);
    }, [branding, safeMode]);

    const resetToFactoryDefaults = async (): Promise<void> => {
        setSafeMode(false);
        try {
            await apiClient.post('/settings', {
                settings: {
                    theme_child_enabled: false,
                    theme_safe_mode: false,
                    theme_child_custom_css: '',
                },
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'branding'] });
            window.location.reload();
        } catch (err) {
            console.error('Failed to reset theme defaults', err);
            window.location.reload();
        }
    };

    return (
        <ThemeShieldContext.Provider
            value={{
                branding,
                isLoading,
                safeMode,
                setSafeMode,
                childTheme,
                resetToFactoryDefaults,
            }}
        >
            {children}
        </ThemeShieldContext.Provider>
    );
};

export const useBranding = () => useContext(ThemeShieldContext);
export const useThemeShield = () => useContext(ThemeShieldContext);
