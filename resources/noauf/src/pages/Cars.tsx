import { useEffect, useState, type ReactNode } from 'react'
import { asset } from '@/lib/asset'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CarCategory, CarFilters, FuelType } from '@/types'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import CarCard from '@/components/CarCard'
import Pagination from '@/components/Pagination'
import CtaBox from '@/components/CtaBox'
import { useApi } from '@/hooks/useApi'
import { getCarFilterOptions, getCars } from '@/services/cars'

const CATEGORIES = ['all', 'suv', 'sedan', 'sport', 'luxury', 'electric'] as const

/** URL search params <-> filters, so results are shareable and survive refresh. */
function useFilters() {
  const [params, setParams] = useSearchParams()
  const filters: CarFilters = {
    search: params.get('search') ?? undefined,
    category: (params.get('category') as CarCategory) ?? 'all',
    brand: params.get('brand') ?? undefined,
    model: params.get('model') ?? undefined,
    year: params.get('year') ? Number(params.get('year')) : undefined,
    fuel: (params.get('fuel') as FuelType) ?? undefined,
    budgetType: (params.get('budgetType') as 'cash' | 'monthly') ?? 'cash',
    minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
    maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    sort: (params.get('sort') as CarFilters['sort']) ?? 'newest',
    page: Number(params.get('page') ?? 1),
  }
  const update = (patch: Partial<CarFilters>, resetPage = true) => {
    const next = { ...filters, ...patch, ...(resetPage ? { page: 1 } : {}) }
    const p = new URLSearchParams()
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === '' || (k === 'category' && v === 'all') || (k === 'page' && v === 1) || (k === 'sort' && v === 'newest') || (k === 'budgetType' && v === 'cash')) return
      p.set(k, String(v))
    })
    setParams(p)
  }
  return { filters, update, key: params.toString() }
}

export default function Cars() {
  const { t } = useTranslation()
  const { filters, update, key } = useFilters()
  const { data, loading } = useApi(() => getCars(filters), [key])
  const [search, setSearch] = useState(filters.search ?? '')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters.page])

  return (
    <>
      {/* Showroom hero */}
      <section className="bg-ink">
        <div className="container-x grid gap-8 py-6 lg:grid-cols-[1fr_570px] lg:gap-24">
          <div className="flex flex-col pt-1">
            <p className="text-small text-silver">
              <Link to="/" className="hover:text-white">{t('nav.home')}</Link>&nbsp;&nbsp; / &nbsp;&nbsp;{t('cars.breadcrumb')}
            </p>
            <h1 className="mt-6 text-[36px] leading-[48px] font-extrabold text-white md:text-h1 md:leading-[56px]">{t('cars.title')}</h1>
            <p className="mt-3 text-lead whitespace-pre-line text-silver">{t('cars.intro')}</p>
            <p className="mt-auto pt-6 text-small whitespace-pre text-gold">{t('cars.brandLine')}</p>
          </div>
          <div className="relative hidden h-[232px] overflow-hidden rounded-lg bg-sand lg:block" dir="ltr">
            <img src={asset('/images/cars/cayenne-gts.png')} alt="" className="absolute inset-x-[18px] top-3 mx-auto h-[208px] object-contain" />
            <p className="absolute bottom-[7px] left-[22px] text-tiny font-medium text-bronze">PORSCHE&nbsp; / &nbsp;CAYENNE GTS</p>
          </div>
        </div>
      </section>

      {/* Search and categories */}
      <section className="bg-white">
        <div className="container-x">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              update({ search })
            }}
            className="flex flex-col gap-3 pt-6 md:flex-row md:gap-6"
          >
            <label className="flex h-[52px] flex-1 items-center gap-2 rounded-lg bg-cream px-[22px]">
              <Icon name="search" size={20} className="text-ink" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('cars.searchPlaceholder')}
                className="h-full flex-1 bg-transparent text-small outline-none placeholder:text-muted"
              />
            </label>
            <Button type="submit" variant="dark" className="h-12 md:mt-0.5 md:w-[288px]">
              {t('cars.searchBtn')}
            </Button>
          </form>
          <div className="flex items-center justify-between gap-4 border-b border-line pt-[26px] pb-8">
            <div className="no-scrollbar -mb-2 flex gap-3 overflow-x-auto pb-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ category: c })}
                  className={`h-[46px] min-w-[112px] shrink-0 rounded-lg px-2 text-body font-bold transition ${filters.category === c ? 'bg-ink text-white' : 'bg-white text-muted hover:bg-cream'}`}
                >
                  {t(`cars.categories.${c}`)}
                </button>
              ))}
            </div>
            <p className="shrink-0 text-small text-muted">{t('cars.count', { count: data?.meta.total ?? 0 })}</p>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="bg-cream pt-[30px] pb-8">
        <div className="container-x grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="flex flex-col gap-6">
            <FiltersPanel filters={filters} onApply={update} />
            <div className="rounded-lg bg-sand p-5 pt-6">
              <Icon name="compare" size={24} className="text-ink" />
              <h3 className="mt-5 text-body font-bold">{t('cars.compareTitle')}</h3>
              <p className="mt-[17px] text-small text-muted">{t('cars.compareText')}</p>
              <Button to="/compare" variant="dark" className="mt-10 h-[46px] w-full">{t('cars.compareBtn')}</Button>
            </div>
          </aside>

          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-h3 font-bold">{t('cars.available')}</h2>
              <label className="relative flex h-10 w-[250px] items-center rounded-lg bg-white ps-4 pe-3">
                <span className="flex-1 text-small">
                  {t('cars.sort', { value: t(filters.sort === 'price-asc' ? 'cars.sortPriceAsc' : filters.sort === 'price-desc' ? 'cars.sortPriceDesc' : 'cars.sortNewest') })}
                </span>
                <Icon name="chevron-down" size={18} />
                <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as CarFilters['sort'] })} className="absolute inset-0 cursor-pointer opacity-0">
                  <option value="newest">{t('cars.sortNewest')}</option>
                  <option value="price-asc">{t('cars.sortPriceAsc')}</option>
                  <option value="price-desc">{t('cars.sortPriceDesc')}</option>
                </select>
              </label>
            </div>

            <div className={`mt-[26px] grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {(data?.data ?? []).map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
            {data && data.data.length === 0 && <p className="py-24 text-center text-muted">{t('common.empty')}</p>}

            {data && (
              <div className="mt-[34px]">
                <Pagination page={data.meta.currentPage} last={Math.max(data.meta.lastPage, 1)} onChange={(p) => update({ page: p }, false)} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Personal assistance */}
      <section className="bg-cream pb-8">
        <div className="container-x">
          <CtaBox
            title={t('cars.assistTitle')}
            text={t('cars.assistText')}
            actions={
              <>
                <Link to="/contact" className="text-body font-bold text-bronze hover:underline">{t('common.contactUs')}</Link>
                <Button to="/request-car" variant="dark" className="h-12 w-[190px]">{t('nav.requestCar')}</Button>
              </>
            }
          />
        </div>
      </section>
    </>
  )
}

function FilterSelect({ label, value, onChange, all, options }: { label: string; value?: string | number; onChange: (v: string) => void; all: string; options: { v: string; l: ReactNode }[] }) {
  return (
    <div>
      <p className="mb-[7px] text-body font-bold">{label}</p>
      <label className="relative flex h-11 items-center rounded-lg bg-cream ps-[30px] pe-2.5">
        <span className="flex-1 truncate text-small text-muted">{options.find((o) => o.v === String(value ?? ''))?.l ?? all}</span>
        <Icon name="chevron-down" size={18} className="text-ink" />
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
          <option value="">{all}</option>
          {options.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function FiltersPanel({ filters, onApply }: { filters: CarFilters; onApply: (f: Partial<CarFilters>) => void }) {
  const { t } = useTranslation()
  const { data: opts } = useApi(getCarFilterOptions)
  const init = () => ({
    brand: filters.brand,
    model: filters.model,
    year: filters.year,
    fuel: filters.fuel,
    budgetType: filters.budgetType ?? 'cash',
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  })
  const [d, setD] = useState(init)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setD(init())
  }, [filters.brand, filters.model, filters.year, filters.fuel, filters.budgetType, filters.minPrice, filters.maxPrice])

  const applied = [filters.brand, filters.model, filters.year, filters.fuel, filters.minPrice, filters.maxPrice].filter(Boolean).length
  const reset = () => onApply({ brand: undefined, model: undefined, year: undefined, fuel: undefined, minPrice: undefined, maxPrice: undefined, budgetType: 'cash' })
  const num = (v: string) => (v ? Number(v.replace(/\D/g, '')) || undefined : undefined)

  return (
    <div className="rounded-lg bg-white p-5">
      <div className="flex items-center justify-between border-b border-line pb-3.5">
        <h3 className="text-h3 font-bold">{t('cars.filters')}</h3>
        <button onClick={reset} className="text-tiny font-medium text-bronze hover:underline">{t('cars.reset')}</button>
      </div>

      <div className="mt-[21px] flex flex-col gap-5">
        <FilterSelect label={t('cars.brand')} all={t('cars.allBrands')} value={d.brand} onChange={(v) => setD({ ...d, brand: v || undefined })} options={(opts?.brands ?? []).map((b) => ({ v: b, l: b }))} />
        <FilterSelect label={t('cars.model')} all={t('cars.allModels')} value={d.model} onChange={(v) => setD({ ...d, model: v || undefined })} options={(opts?.models ?? []).map((b) => ({ v: b, l: b }))} />

        <div>
          <p className="mb-[11px] text-body font-bold">{t('cars.budget')}</p>
          <div className="flex h-[38px] rounded-lg bg-cream p-[3px]">
            {(['cash', 'monthly'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setD({ ...d, budgetType: b })}
                className={`flex-1 rounded-lg text-small transition ${d.budgetType === b ? 'bg-ink text-white' : 'text-muted'}`}
              >
                {t(b === 'cash' ? 'cars.budgetCash' : 'cars.budgetMonthly')}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input inputMode="numeric" value={d.minPrice ?? ''} onChange={(e) => setD({ ...d, minPrice: num(e.target.value) })} placeholder={t('cars.min')} className="h-11 rounded-lg bg-cream text-center text-tiny font-medium outline-none placeholder:text-muted focus:ring-2 focus:ring-gold/40" />
            <input inputMode="numeric" value={d.maxPrice ?? ''} onChange={(e) => setD({ ...d, maxPrice: num(e.target.value) })} placeholder={t('cars.max')} className="h-11 rounded-lg bg-cream text-center text-tiny font-medium outline-none placeholder:text-muted focus:ring-2 focus:ring-gold/40" />
          </div>
          <p className="mt-[11px] text-tiny font-medium text-muted">{t('cars.currencyHint')}</p>
        </div>

        <FilterSelect label={t('cars.year')} all={t('cars.allYears')} value={d.year} onChange={(v) => setD({ ...d, year: v ? Number(v) : undefined })} options={(opts?.years ?? []).map((y) => ({ v: String(y), l: y }))} />
        <FilterSelect
          label={t('cars.fuel')}
          all={t('cars.allFuels')}
          value={d.fuel}
          onChange={(v) => setD({ ...d, fuel: (v || undefined) as FuelType })}
          options={['petrol', 'diesel', 'hybrid', 'electric'].map((f) => ({ v: f, l: t(`fuel.${f}`) }))}
        />
      </div>

      <div className="mt-8 border-t border-line pt-[22px]">
        <Button variant="dark" className="h-[46px] w-full" onClick={() => onApply(d)}>
          {t('cars.apply')}
        </Button>
        <p className="mt-[17px] text-center text-tiny font-medium text-muted">{applied ? t('cars.filtersApplied', { count: applied }) : t('cars.noFilters')}</p>
      </div>
    </div>
  )
}
