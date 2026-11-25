import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "../../public/locales/ar.json";
import adminAr from "../../public/locales/admin/ar.json";

/**
 * Arabic (default, most visitors) ships in the main bundle. English is a separate chunk,
 * loaded only when needed: before the first render if it's the saved language, or on switch.
 */
const lazyLanguages: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../../public/locales/en.json"),
};

const lazyAdminLanguages: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../../public/locales/admin/en.json"),
};

const savedLang = localStorage.getItem("language") || "ar";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        translation: ar,
        admin: adminAr,
      },
    },
    lng: savedLang,
    fallbackLng: "ar",
    interpolation: {
      escapeValue: false,
    },
  });

/** Make sure a storefront language's translations are loaded. */
export async function ensureLanguageLoaded(language: string): Promise<void> {
  const loader = lazyLanguages[language];
  if (!loader || i18n.hasResourceBundle(language, "translation")) return;

  try {
    const { default: translations } = await loader();
    i18n.addResourceBundle(language, "translation", translations, true, true);
  } catch {
    // Network error: keep the Arabic fallback rather than breaking the page.
  }
}

/** Make sure an admin dashboard language's translations are loaded. */
export async function ensureAdminLanguageLoaded(language: string): Promise<void> {
  const loader = lazyAdminLanguages[language];
  if (!loader || i18n.hasResourceBundle(language, "admin")) return;

  try {
    const { default: translations } = await loader();
    i18n.addResourceBundle(language, "admin", translations, true, true);
  } catch {
    // Network error: keep the Arabic fallback rather than breaking the page.
  }
}

export function getAdminLanguage(): "ar" | "en" {
  return localStorage.getItem("admin_language") === "en" ? "en" : "ar";
}

export async function switchAdminLanguage(language: "ar" | "en"): Promise<void> {
  await ensureAdminLanguageLoaded(language);
  localStorage.setItem("admin_language", language);
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
  document.documentElement.dir = language === "en" ? "ltr" : "rtl";
}

export default i18n;
