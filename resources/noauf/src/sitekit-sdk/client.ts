import axios from 'axios'
import type {
  SkBlogPost,
  SkBlogPostDetail,
  SkBrand,
  SkCalculatorLeadPayload,
  SkCar,
  SkCarDetail,
  SkCarQuery,
  SkCarsMeta,
  SkContactPayload,
  SkEnvelope,
  SkFaq,
  SkFooter,
  SkOffer,
  SkPaginated,
  SkPartner,
  SkTestimonial,
} from './types'

/**
 * Sitekit Storefront API client (generic — same file in every project).
 *
 * Same-origin by default: the storefront is served by Laravel, so no CORS and no auth.
 * Override with VITE_API_URL (e.g. http://tameed.test/api/v1/store) for local dev against another host.
 */
export const sitekitHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1/store',
  headers: { Accept: 'application/json' },
  timeout: 20000,
})

/** Language sent as Accept-Language; the API returns already-translated content. */
let resolveLocale: () => string = () => document.documentElement.lang || 'ar'

export function setSitekitLocaleResolver(resolver: () => string): void {
  resolveLocale = resolver
}

sitekitHttp.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = resolveLocale()
  return config
})

async function get<T>(url: string, params?: object): Promise<T> {
  const res = await sitekitHttp.get<SkEnvelope<T>>(url, { params })
  return res.data.data
}

async function getPaginated<T>(url: string, params?: object): Promise<SkPaginated<T> & { envelope: SkEnvelope<T[]> }> {
  const res = await sitekitHttp.get<SkEnvelope<T[]>>(url, { params })
  return { data: res.data.data ?? [], meta: res.data.meta!, envelope: res.data }
}

async function post<T = { id?: number }>(url: string, payload: object): Promise<T> {
  const res = await sitekitHttp.post<SkEnvelope<T>>(url, payload)
  return res.data.data
}

export const SitekitApi = {
  home: () => get<Record<string, unknown>>('/home'),
  footer: () => get<SkFooter>('/settings/footer'),
  settings: () => get<{ key: string; value: unknown }[]>('/settings'),

  cars: (query: SkCarQuery = {}) => getPaginated<SkCar>('/cars', query),
  carsMeta: () => get<SkCarsMeta>('/cars/meta'),
  car: (slug: string) => get<SkCarDetail>(`/cars/${encodeURIComponent(slug)}`),
  brands: () => get<SkBrand[]>('/brands'),

  offers: (params: { tag?: string; page?: number; per_page?: number } = {}) => getPaginated<SkOffer>('/offers', params),

  blog: (params: { page?: number; per_page?: number; tag?: string; category?: string } = {}) =>
    getPaginated<SkBlogPost>('/blog', params),
  blogPost: (slug: string) => get<SkBlogPostDetail>(`/blog/${encodeURIComponent(slug)}`),

  testimonials: () => get<SkTestimonial[]>('/testimonials'),
  partners: () => get<SkPartner[]>('/partners'),
  faqs: () => get<SkFaq[]>('/faqs'),

  contact: (payload: SkContactPayload) => post('/contact', payload),
  calculatorLead: (payload: SkCalculatorLeadPayload) => post('/calculator/lead', payload),
  legalPage: (slug: string) => get<{ slug: string; title: string; content: string; updated_at?: string }>(`/legal/${encodeURIComponent(slug)}`),
}
