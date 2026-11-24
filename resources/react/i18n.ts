import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "../../public/locales/ar.json";

/**
 * Arabic (default, most visitors) ships in the main bundle. English is a separate chunk,
 * loaded only when needed: before the first render if it's the saved language, or on switch.
 */
const lazyLanguages: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../../public/locales/en.json"),
};

const savedLang = localStorage.getItem("language") || "ar";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
    },
    lng: savedLang,
    fallbackLng: "ar",
    interpolation: {
      escapeValue: false,
    },
  });

/** Make sure a language's translations are loaded. Resolves immediately for loaded languages. */
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

export default i18n;
