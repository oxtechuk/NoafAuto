/**
 * Data contracts shared by the UI.
 * The Laravel API should return these shapes (already translated
 * according to the `Accept-Language` header the client sends).
 */

export type CarCategory = 'suv' | 'sedan' | 'sport' | 'luxury' | 'electric' | 'crossover' | 'compact'
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric'

export interface Car {
  /** URL identifier (Sitekit car slug) */
  id: string
  /** numeric backend id (needed by forms); absent in mock data */
  refId?: number
  brand: string
  model: string
  year: number
  category: CarCategory
  categoryLabel: string
  fuel: FuelType
  fuelLabel: string
  seats: number
  transmissionLabel: string
  engine: string
  horsepower: number
  cashPrice: number
  monthlyPrice: number
  image: string
  gallery: string[]
  isNew: boolean
  available: boolean
  /** big watermark text on the gallery stage, e.g. "S–CLASS" */
  series?: string
  description?: string
  features?: string[]
}

export interface CarFilters {
  search?: string
  category?: CarCategory | 'all'
  brand?: string
  model?: string
  year?: number
  fuel?: FuelType
  budgetType?: 'cash' | 'monthly'
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price-asc' | 'price-desc'
  page?: number
}

export interface Paginated<T> {
  data: T[]
  meta: { currentPage: number; lastPage: number; total: number }
}

export type OfferTag = 'popular' | 'exclusive' | 'new' | 'limited'

export interface Offer {
  id: string
  title: string
  benefit: string
  image: string
  tag: OfferTag
  tagLabel: string
  /** ISO date-time */
  endsAt: string
  featured?: boolean
  discountPercent?: number | null
  specialPrice?: number | null
  specialInstallment?: number | null
}

export interface ArticleSummary {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  readTime: string
  image: string
  tag: OfferTag
}

export interface ArticleSection {
  id: string
  title: string
  /** short label used in the table of contents */
  toc: string
  paragraphs?: string[]
  options?: { title: string; description: string }[]
  callout?: string
  note?: string
}

export interface Article extends ArticleSummary {
  subtitle: string
  cover: string
  sections: ArticleSection[]
  figures: { value: string; label: string }[]
}

export interface Testimonial {
  id: string
  name: string
  role: string
  quote: string
  avatar: string
  rating: number
}

export interface Brand {
  id: string
  name: string
  logo: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}

/* ---------- Forms (payloads posted to Laravel) ---------- */

export interface ContactPayload {
  name: string
  phone: string
  email?: string
  subject: string
  message: string
  consent: boolean
}

export interface FinanceLeadPayload {
  name: string
  phone: string
  city: string
  consent: boolean
}

export interface FinanceRequestPayload extends FinanceLeadPayload {
  carId: string
  color: string
  salary: number
  obligations: number
  downPayment: number
  months: number
}

export interface CustomCarRequestPayload {
  name: string
  phone: string
  city: string
  email?: string
  consent: boolean
  carName: string
  year: string
  color: string
  budget: number
  condition: string
  sector: string
  employer: string
  salary: number
  extraIncome: number
  obligations: number
  obligationType: string
}
