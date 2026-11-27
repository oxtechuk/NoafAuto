/**
 * Sitekit Storefront API — raw response types (/api/v1/store/*).
 *
 * Generic for every project: copy this folder (sitekit-sdk/) as-is.
 * Only `mappers.ts` is project specific.
 */

export interface SkEnvelope<T> {
  success: boolean
  message: string
  data: T
  errors: unknown
  meta: SkMeta | null
}

export interface SkMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
  [key: string]: unknown
}

export interface SkPaginated<T> {
  data: T[]
  meta: SkMeta
}

export interface SkSpec {
  label?: string
  value?: string | number
}

export interface SkBrand {
  id: number
  name: string
  slug: string
  logo: string | null
  cars_count?: number
}

export interface SkCategory {
  id: number
  name: string
  slug: string
}

export interface SkOffer {
  id: number
  title: string
  description: string | null
  image: string | null
  discount_percent: number | null
  tag: string | null
  special_price: number | null
  special_installment: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

export interface SkCar {
  id: number
  name: string
  slug: string
  main_image: string | null
  thumbnail: string | null
  cash_price: number
  current_price: number
  savings: number
  min_installment: number | null
  min_down_payment: number | null
  model: string | null
  type: string | null
  year: string | number
  is_current_year: boolean
  specs: (Record<string, SkSpec | string | number | null> & { hp?: string | number; fuel?: string }) | null
  colors: { hex?: string; name?: string; image?: string | null }[] | null
  is_featured: boolean
  availability_status: string | null
  highlight: string | null
  brand?: SkBrand
  category?: SkCategory
}

export interface SkCarDetail extends SkCar {
  images: string[]
  exterior_images: string[]
  interior_images: string[]
  description: string | null
  features: string | null
  active_offer: SkOffer | null
  specifications: { id: number; name: string; icon: string | null }[]
  features_list: { id: number; name: string; icon: string | null }[]
  safety_features: { id: number; name: string; icon: string | null }[]
  related_cars: SkCar[]
}

export interface SkCarsMeta {
  total_cars: number
  total_brands: number
  featured_offer: (Partial<SkOffer> & { cars?: SkCar[]; installment_starts_from?: number }) | null
  filter_brands: SkBrand[]
  filter_models: { id: number; name: string; slug?: string; brand_id?: number }[]
  filter_categories: SkCategory[]
  filter_years: (string | number)[]
  filter_fuels: { value: string; count: number }[]
  filter_prices: { min: number; max: number | null; count: number }[]
}

export interface SkBlogPost {
  id: number
  title: string
  slug: string
  thumbnail: string | null
  excerpt: string | null
  published_at: string | null
  reading_time: number | null
  tag: string | null
  categories: { id: number; name: string; slug: string }[]
  employee: { name: string; role: string | null; avatar: string | null } | null
}

export interface SkBlogPostDetail extends SkBlogPost {
  content: string | null
  meta_title: string | null
  meta_description: string | null
  related_posts: SkBlogPost[]
}

export interface SkTestimonial {
  id: number
  name: string
  title: string | null
  content: string | null
  image: string | null
  rating: number | null
}

export interface SkPartner {
  id: number
  name: string
  logo: string | null
  link: string | null
}

export interface SkFaq {
  id: number
  question: string
  answer: string
}

export interface SkFooter {
  logo: string | null
  header_logo?: string | null
  footer_logo?: string | null
  favicon?: string | null
  request_car_icon?: string | null
  site_name: string
  footer_text: string | null
  contact: { email: string; phone: string; whatsapp: string; address: string }
  social_media: { platform?: string; url?: string; icon?: string }[]
  floating_widgets?: {
    enabled?: boolean
    whatsapp?: string
    whatsapp_message?: string
    phone?: string
    show_badge?: boolean
  }
}

/* ---------- Payloads ---------- */

export type SkContactSubject = 'general_inquiry' | 'financing_request' | 'car_booking' | 'car_import' | 'complaint' | 'other'

export interface SkContactPayload {
  name: string
  phone: string
  email?: string
  subject?: SkContactSubject
  message?: string
}

export interface SkCalculatorLeadPayload {
  /** first id = the car of the request (becomes the booking's car) */
  car_ids: number[]
  name: string
  phone: string
  city: string
  salary: number
  monthly_obligations: number
  email?: string
  down_payment?: number
  period_months?: number
  preferred_color?: string
  employer_type?: string
  employer_name?: string
  is_submitted?: boolean
  notes?: string
}

export interface SkCarQuery {
  page?: number
  per_page?: number
  search?: string
  brands?: string[]
  category_id?: number
  type?: string
  year?: number | string
  fuel?: string
  min_price?: number
  max_price?: number
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'year_desc'
}
