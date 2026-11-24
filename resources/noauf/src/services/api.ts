import axios from 'axios'
import i18n from '@/i18n'

/**
 * Single switch between mock data and the Laravel backend.
 * In .env:  VITE_USE_MOCK=false   VITE_API_URL=http://your-laravel.test/api
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  // Laravel picks the locale from this header (e.g. via a SetLocale middleware)
  config.headers['Accept-Language'] = currentLang()
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export type Lang = 'ar' | 'en'
export const currentLang = (): Lang => (i18n.language?.startsWith('en') ? 'en' : 'ar')

/** Pick the active language from a { ar, en } pair (mock data only). */
export const tr = (v: { ar: string; en: string }) => v[currentLang()]

/** Simulates network latency for mock responses */
export const mock = <T>(data: T, ms = 250) => new Promise<T>((resolve) => setTimeout(() => resolve(data), ms))
