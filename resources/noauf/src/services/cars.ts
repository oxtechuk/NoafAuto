import type { Car, CarFilters, Paginated } from '@/types'
import { cars, categoryLabels, fuelLabels, transmissionLabel, type CarRecord } from '@/data/cars'
import { SitekitApi } from '@/sitekit-sdk/client'
import { rememberMeta, toCar as fromSitekit, toCarQuery, toFilterOptions, toPaginated } from '@/sitekit-sdk/mappers'
import { USE_MOCK, mock, tr } from './api'

const PER_PAGE = 9

const toCar = (r: CarRecord): Car => ({
  ...r,
  categoryLabel: tr(categoryLabels[r.category]),
  fuelLabel: tr(fuelLabels[r.fuel]),
  transmissionLabel: tr(transmissionLabel),
  description: r.description ? tr(r.description) : undefined,
  features: r.features?.map(tr),
})

/** Filter metadata (brand slugs, category ids) is loaded once per page load. */
let metaPromise: ReturnType<typeof SitekitApi.carsMeta> | null = null
const loadMeta = () => (metaPromise ??= SitekitApi.carsMeta().then((meta) => (rememberMeta(meta), meta)))

/** GET /cars?search=&category=&brand=&...&page= */
export async function getCars(filters: CarFilters = {}): Promise<Paginated<Car>> {
  if (!USE_MOCK) {
    if (filters.brand || (filters.category && filters.category !== 'all')) await loadMeta()
    const page = toPaginated(await SitekitApi.cars(toCarQuery(filters, PER_PAGE)), fromSitekit)
    if (filters.budgetType === 'monthly' && (filters.minPrice || filters.maxPrice)) {
      page.data = page.data.filter((c) => (!filters.minPrice || c.monthlyPrice >= filters.minPrice) && (!filters.maxPrice || c.monthlyPrice <= filters.maxPrice))
    }
    return page
  }

  let list = cars.map(toCar)
  const q = filters.search?.trim().toLowerCase()
  if (q) list = list.filter((c) => `${c.brand} ${c.model} ${c.categoryLabel}`.toLowerCase().includes(q))
  if (filters.category && filters.category !== 'all') {
    const map: Record<string, string[]> = { luxury: ['sedan', 'sport'], suv: ['suv', 'crossover'] }
    const allowed = map[filters.category] ?? [filters.category]
    list = list.filter((c) => allowed.includes(c.category))
  }
  if (filters.brand) list = list.filter((c) => c.brand === filters.brand)
  if (filters.model) list = list.filter((c) => c.model === filters.model)
  if (filters.year) list = list.filter((c) => c.year === filters.year)
  if (filters.fuel) list = list.filter((c) => c.fuel === filters.fuel)
  const priceOf = (c: Car) => (filters.budgetType === 'monthly' ? c.monthlyPrice : c.cashPrice)
  if (filters.minPrice) list = list.filter((c) => priceOf(c) >= filters.minPrice!)
  if (filters.maxPrice) list = list.filter((c) => priceOf(c) <= filters.maxPrice!)
  if (filters.sort === 'price-asc') list.sort((a, b) => a.cashPrice - b.cashPrice)
  if (filters.sort === 'price-desc') list.sort((a, b) => b.cashPrice - a.cashPrice)

  const page = filters.page ?? 1
  const lastPage = Math.max(1, Math.ceil(list.length / PER_PAGE))
  return mock({ data: list.slice((page - 1) * PER_PAGE, page * PER_PAGE), meta: { currentPage: page, lastPage, total: list.length } })
}

/** Car detail + related cars come from one endpoint; share the request between getCar and getSimilarCars. */
const detailRequests = new Map<string, ReturnType<typeof SitekitApi.car>>()
function loadCarDetail(slug: string) {
  if (!detailRequests.has(slug)) {
    detailRequests.set(slug, SitekitApi.car(slug).catch((error) => (detailRequests.delete(slug), Promise.reject(error))))
  }
  return detailRequests.get(slug)!
}

/** Numeric backend id for a car slug (forms post car_id). */
export async function resolveCarRefId(slug: string): Promise<number | undefined> {
  if (USE_MOCK) return undefined
  return (await loadCarDetail(slug)).id
}

/** GET /cars/{id} */
export async function getCar(id: string): Promise<Car | null> {
  if (!USE_MOCK) {
    try {
      return fromSitekit(await loadCarDetail(id))
    } catch {
      return null
    }
  }
  const r = cars.find((c) => c.id === id)
  return mock(r ? toCar(r) : null)
}

/** GET /cars/latest */
export async function getLatestCars(): Promise<Car[]> {
  if (!USE_MOCK) return (await SitekitApi.cars({ sort: 'latest', per_page: 5 })).data.map(fromSitekit)
  return mock(cars.slice(0, 5).map(toCar))
}

/** GET /cars/{id}/similar */
export async function getSimilarCars(id: string): Promise<Car[]> {
  if (!USE_MOCK) return ((await loadCarDetail(id)).related_cars ?? []).slice(0, 3).map(fromSitekit)
  return mock(cars.filter((c) => c.id !== id).slice(0, 3).map(toCar))
}

/** GET /cars/filters — available filter options */
export async function getCarFilterOptions(): Promise<{ brands: string[]; models: string[]; years: number[] }> {
  if (!USE_MOCK) return toFilterOptions(await loadMeta())
  return mock({
    brands: [...new Set(cars.map((c) => c.brand))],
    models: [...new Set(cars.map((c) => c.model))],
    years: [...new Set(cars.map((c) => c.year))].sort((a, b) => b - a),
  })
}
