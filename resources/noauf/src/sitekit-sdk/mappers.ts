/**
 * Project-specific mapping: Sitekit API shapes → this frontend's types (@/types).
 *
 * This is the ONLY file a new project needs to write when connecting a static
 * frontend to Sitekit. Pages and components stay untouched.
 */
import type { Article, ArticleSection, ArticleSummary, Brand, Car, CarCategory, CarFilters, FaqItem, FuelType, Offer, OfferTag, Paginated, Testimonial } from '@/types'
import { categoryLabels, fuelLabels, transmissionLabel } from '@/data/cars'
import { offerTagLabels } from '@/data/content'
import { currentLang, tr } from '@/services/api'
import type { SkBlogPost, SkBlogPostDetail, SkBrand, SkCar, SkCarDetail, SkCarQuery, SkCarsMeta, SkContactSubject, SkFaq, SkOffer, SkPaginated, SkPartner, SkTestimonial } from './types'

const PLACEHOLDER_IMAGE = `${import.meta.env.BASE_URL}images/cars/mercedes-thumb.jpg`

/* ---------------------------------------------------------------- registry */

/** slug → numeric Sitekit id (forms need the numeric car_id; URLs use the slug). */
const carIds = new Map<string, number>()
/** brand display name → slug (filter dropdowns show names, the API filters by slug). */
const brandSlugs = new Map<string, string>()
/** category slug → id */
const categoryIds = new Map<string, number>()

export const carIdFromSlug = (slug: string): number | undefined => carIds.get(slug)

export function rememberMeta(meta: SkCarsMeta): void {
  rememberBrands(meta.filter_brands, meta.filter_categories)
}

/** Learn brand slugs / category ids from any payload that has them (e.g. /home's filter_brands). */
export function rememberBrands(brands: SkBrand[] = [], categories: { id: number; slug: string }[] = []): void {
  brands.forEach((b) => b?.name && b.slug && brandSlugs.set(b.name, b.slug))
  categories.forEach((c) => c?.slug && categoryIds.set(c.slug, c.id))
}

export const knowsBrand = (name: string): boolean => brandSlugs.has(name)
export const knowsCategory = (slug: string): boolean => categoryIds.has(slug)

/* ---------------------------------------------------------------- cars */

const FUELS: FuelType[] = ['petrol', 'diesel', 'hybrid', 'electric']
const CATEGORIES: CarCategory[] = ['suv', 'sedan', 'sport', 'luxury', 'electric', 'crossover', 'compact']

/** Find a value in Sitekit's free-form specs list by (Arabic or English) label keywords. */
function specValue(car: SkCar, keywords: string[]): string | undefined {
  for (const spec of Object.values(car.specs ?? {})) {
    if (spec && typeof spec === 'object' && 'label' in spec) {
      const label = String(spec.label ?? '').toLowerCase()
      if (keywords.some((k) => label.includes(k))) return String(spec.value ?? '')
    }
  }
  return undefined
}

const toNumber = (value: unknown): number => {
  const match = String(value ?? '').replace(/,/g, '').match(/\d+/)
  return match ? Number(match[0]) : 0
}

export function toCar(c: SkCar | SkCarDetail): Car {
  carIds.set(c.slug, c.id)

  const fuel = (FUELS.includes(c.specs?.fuel as FuelType) ? c.specs?.fuel : 'petrol') as FuelType
  const categorySlug = c.category?.slug ?? c.type ?? ''
  const category = (CATEGORIES.includes(categorySlug as CarCategory) ? categorySlug : 'sedan') as CarCategory
  const detail = c as Partial<SkCarDetail>
  const gallery = [...(detail.exterior_images ?? []), ...(detail.interior_images ?? [])]

  return {
    id: c.slug,
    refId: c.id,
    brand: c.brand?.name ?? '',
    model: c.name,
    year: Number(c.year),
    category,
    categoryLabel: c.category?.name ?? (categoryLabels[category] ? tr(categoryLabels[category]) : ''),
    fuel,
    fuelLabel: fuelLabels[fuel] ? tr(fuelLabels[fuel]) : fuel,
    seats: toNumber(specValue(c, ['مقاعد', 'seat'])) || 5,
    transmissionLabel: specValue(c, ['ناقل', 'transmission', 'gear']) || tr(transmissionLabel),
    engine: specValue(c, ['محرك', 'engine']) ?? '',
    horsepower: toNumber(c.specs?.hp),
    cashPrice: c.current_price ?? c.cash_price,
    monthlyPrice: c.min_installment ?? 0,
    image: c.main_image || c.thumbnail || PLACEHOLDER_IMAGE,
    gallery: gallery.length ? gallery : (detail.images ?? []).length ? detail.images! : [c.main_image || PLACEHOLDER_IMAGE],
    isNew: c.is_current_year,
    available: (c.availability_status ?? 'available') !== 'out_of_stock',
    series: c.model?.toUpperCase() || undefined,
    description: detail.description ?? undefined,
    features: detail.features_list?.length
      ? detail.features_list.map((f) => f.name)
      : detail.features
        ? detail.features.split(/[،,\n]+/).map((f) => f.trim()).filter(Boolean)
        : undefined,
  }
}

export function toPaginated<S, T>(page: SkPaginated<S>, map: (item: S) => T): Paginated<T> {
  return {
    data: page.data.map(map),
    meta: { currentPage: page.meta.current_page, lastPage: page.meta.last_page, total: page.meta.total },
  }
}

export function toCarQuery(filters: CarFilters, perPage: number): SkCarQuery {
  const query: SkCarQuery = { page: filters.page ?? 1, per_page: perPage }

  const search = [filters.search, filters.model].filter(Boolean).join(' ').trim()
  if (search) query.search = search
  if (filters.brand) query.brands = [brandSlugs.get(filters.brand) ?? filters.brand]
  if (filters.category && filters.category !== 'all') {
    const categoryId = categoryIds.get(filters.category)
    if (categoryId) query.category_id = categoryId
    else query.type = filters.category
  }
  if (filters.year) query.year = filters.year
  if (filters.fuel) query.fuel = filters.fuel
  // The API filters on the cash price; monthly budgets are filtered client-side by the caller.
  if (filters.budgetType !== 'monthly') {
    if (filters.minPrice) query.min_price = filters.minPrice
    if (filters.maxPrice) query.max_price = filters.maxPrice
  }
  query.sort = filters.sort === 'price-asc' ? 'price_asc' : filters.sort === 'price-desc' ? 'price_desc' : 'latest'

  return query
}

export function toFilterOptions(meta: SkCarsMeta): { brands: string[]; models: string[]; years: number[] } {
  rememberMeta(meta)
  return {
    brands: meta.filter_brands.map((b) => b.name),
    models: meta.filter_models.map((m) => m.name),
    years: meta.filter_years.map(Number).sort((a, b) => b - a),
  }
}

/* ---------------------------------------------------------------- content */

const OFFER_TAGS: OfferTag[] = ['popular', 'exclusive', 'new', 'limited']
const asOfferTag = (tag: string | null): OfferTag => (OFFER_TAGS.includes(tag as OfferTag) ? (tag as OfferTag) : 'popular')

export function toOffer(o: SkOffer, featured = false): Offer {
  const tag = asOfferTag(o.tag)
  return {
    id: String(o.id),
    title: o.title,
    benefit: o.description ?? '',
    image: o.image || PLACEHOLDER_IMAGE,
    tag,
    tagLabel: offerTagLabels[tag] ? tr(offerTagLabels[tag]) : (o.tag || 'عروض مميزة'),
    endsAt: o.ends_at ?? new Date(Date.now() + 30 * 864e5).toISOString(),
    featured,
    discountPercent: o.discount_percent,
    specialPrice: o.special_price,
    specialInstallment: o.special_installment,
  }
}

const formatDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString(currentLang() === 'en' ? 'en-GB' : 'ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

const formatReadTime = (minutes: number | null): string => {
  const n = Math.max(1, minutes ?? 1)
  return currentLang() === 'en' ? `${n} min read` : `${n} دقائق قراءة`
}

const resolveCategoryName = (c: any): string => {
  if (!c) return ''
  const name = c.name ?? c
  if (typeof name === 'string') return name
  if (typeof name === 'object' && name !== null) return name[currentLang()] || name.ar || name.en || ''
  return String(name)
}

export function toArticleSummary(p: SkBlogPost): ArticleSummary {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? '',
    category: resolveCategoryName(p.categories?.[0]),
    date: formatDate(p.published_at),
    readTime: formatReadTime(p.reading_time),
    image: p.thumbnail || PLACEHOLDER_IMAGE,
    tag: asOfferTag(p.tag),
  }
}

/**
 * Turn the post's HTML (or plain text) into this design's structured sections:
 * every <h2> starts a section; paragraphs and list items become paragraphs.
 */
function toSections(html: string, fallbackTitle: string): ArticleSection[] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement
  const sections: ArticleSection[] = []
  let current: ArticleSection | null = null

  const ensure = () => (current ??= { id: 'intro', title: fallbackTitle, toc: fallbackTitle, paragraphs: [] })

  for (const node of Array.from(root.childNodes)) {
    if (node instanceof HTMLElement && /^H[23]$/.test(node.tagName)) {
      if (current) sections.push(current)
      const title = node.textContent?.trim() ?? ''
      current = { id: `s${sections.length + 1}`, title, toc: title, paragraphs: [] }
      continue
    }
    const items = node instanceof HTMLElement && /^(UL|OL)$/.test(node.tagName) ? Array.from(node.querySelectorAll('li')) : [node]
    for (const item of items) {
      const htmlOrText = item instanceof HTMLElement ? (item.innerHTML?.trim() || item.textContent?.trim()) : item.textContent?.trim()
      if (!htmlOrText) continue
      htmlOrText.split(/\n{2,}/).forEach((part) => {
        const clean = part.trim()
        if (clean) ensure().paragraphs!.push(clean)
      })
    }
  }
  if (current) sections.push(current)

  return sections.length ? sections : [{ id: 'intro', title: fallbackTitle, toc: fallbackTitle, paragraphs: [] }]
}

export function toArticle(p: SkBlogPostDetail): Article {
  return {
    ...toArticleSummary(p),
    subtitle: p.excerpt ?? '',
    cover: p.thumbnail || PLACEHOLDER_IMAGE,
    sections: toSections(p.content ?? '', p.title),
    figures: [],
  }
}

export const toBrand = (b: SkBrand | SkPartner): Brand => ({ id: String(b.id), name: b.name, logo: b.logo ?? '' })

export const toTestimonial = (t: SkTestimonial): Testimonial => ({
  id: String(t.id),
  name: t.name,
  role: t.title ?? '',
  quote: t.content ?? '',
  avatar: t.image ?? '',
  rating: t.rating ?? 5,
})

export const toFaq = (f: SkFaq): FaqItem => ({ id: String(f.id), question: f.question, answer: f.answer })

/* ---------------------------------------------------------------- forms */

/** Contact page topic keys → Sitekit contact subjects. */
const TOPIC_SUBJECTS: Record<string, SkContactSubject> = {
  general: 'general_inquiry',
  finance: 'financing_request',
  followUp: 'other',
  booking: 'car_booking',
  import: 'car_import',
  complaint: 'complaint',
  other: 'other',
}

export const toContactSubject = (topic: string): SkContactSubject => TOPIC_SUBJECTS[topic] ?? 'general_inquiry'

/** Sitekit's calculator accepts these terms only; snap to the nearest. */
export const toPeriodMonths = (months: number): number =>
  [12, 24, 36, 48, 60, 72, 84].reduce((best, m) => (Math.abs(m - months) < Math.abs(best - months) ? m : best), 60)
