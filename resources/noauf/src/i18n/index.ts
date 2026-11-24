import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import ar from './locales/ar.json'

export const LANGUAGES = ['ar', 'en'] as const

const applyDir = (lng: string) => {
  const lang = lng?.startsWith('en') ? 'en' : 'ar'
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.title = lang === 'ar' ? 'نواف أوتو' : 'Nawaf Auto'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ar: { translation: ar }, en: { translation: en } },
    fallbackLng: 'ar', // the design is Arabic-first
    supportedLngs: LANGUAGES,
    interpolation: { escapeValue: false },
    returnObjects: true,
    detection: { order: ['querystring', 'localStorage'], lookupQuerystring: 'lang', caches: ['localStorage'] },
  })

applyDir(i18n.language)
i18n.on('languageChanged', applyDir)

export default i18n
