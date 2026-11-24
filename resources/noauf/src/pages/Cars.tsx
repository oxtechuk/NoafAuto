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
      if (
        v === undefined ||
        v === '' ||
        (k === 'category' && v === 'all') ||
        (k === 'page' && v === 1) ||
        (k === 'sort' && v === 'newest') ||
        (k === 'budgetType' && v === 'cash')
      )
        return
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Count active applied filters (excluding category and page)
  const activeCount = [
    filters.brand,
    filters.model,
    filters.year,
    filters.fuel,
    filters.minPrice,
    filters.maxPrice,
    filters.budgetType && filters.budgetType !== 'cash' ? filters.budgetType : undefined,
  ].filter(Boolean).length

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters.page])

  // Prevent background scroll when mobile filter drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileDrawerOpen])

  return (
    <>
      {/* Showroom hero */}
      <section className="bg-ink">
        <div className="container-x grid gap-8 py-6 lg:grid-cols-[1fr_570px] lg:gap-24">
          <div className="flex flex-col pt-1">
            <p className="text-small text-silver">
              <Link to="/" className="hover:text-white">
                {t('nav.home')}
              </Link>
              &nbsp;&nbsp; / &nbsp;&nbsp;{t('cars.breadcrumb')}
            </p>
            <h1 className="mt-6 text-[36px] font-extrabold leading-[48px] text-white md:text-h1 md:leading-[56px]">
              {t('cars.title')}
            </h1>
            <p className="mt-3 whitespace-pre-line text-lead text-silver">{t('cars.intro')}</p>
            <p className="mt-auto pt-6 whitespace-pre text-small text-gold">{t('cars.brandLine')}</p>
          </div>
          <div className="relative hidden h-[232px] overflow-hidden rounded-lg bg-sand lg:block" dir="ltr">
            <img
              src={asset('/images/cars/cayenne-gts.png')}
              alt=""
              className="absolute inset-x-[18px] top-3 mx-auto h-[208px] object-contain"
            />
            <p className="absolute bottom-[7px] left-[22px] text-tiny font-medium text-bronze">
              PORSCHE&nbsp; / &nbsp;CAYENNE GTS
            </p>
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
                  className={`h-[46px] min-w-[112px] shrink-0 rounded-lg px-2 text-body font-bold transition ${
                    filters.category === c ? 'bg-ink text-white' : 'bg-white text-muted hover:bg-cream'
                  }`}
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
      <section className="bg-cream pt-[24px] pb-12">
        <div className="container-x">
          {/* MOBILE FAST FILTERS & SORT BAR (Visible on mobile/tablet, hidden on desktop lg+) */}
          <div className="mb-5 flex flex-col gap-3 lg:hidden">
            {/* Top row: Fast Filter Trigger Button + Sort Selector */}
            <div className="flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-sm ${
                  activeCount > 0
                    ? 'bg-ink text-white ring-2 ring-gold/60'
                    : 'bg-white text-ink border border-line hover:bg-cream'
                }`}
              >
                {/* Sliders / Filter icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" x2="4" y1="21" y2="14" />
                  <line x1="4" x2="4" y1="10" y2="3" />
                  <line x1="12" x2="12" y1="21" y2="12" />
                  <line x1="12" x2="12" y1="8" y2="3" />
                  <line x1="20" x2="20" y1="21" y2="16" />
                  <line x1="20" x2="20" y1="12" y2="3" />
                  <line x1="1" x2="7" y1="14" y2="14" />
                  <line x1="9" x2="15" y1="8" y2="8" />
                  <line x1="17" x2="23" y1="16" y2="16" />
                </svg>
                <span>{t('cars.filters')}</span>
                {activeCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-gold text-[11px] font-extrabold text-ink">
                    {activeCount}
                  </span>
                )}
              </button>

              {/* Mobile Sort Dropdown */}
              <label className="relative flex h-[42px] flex-1 items-center justify-between rounded-xl border border-line bg-white px-3.5 text-xs font-medium text-ink shadow-2xs">
                <span className="truncate">
                  {t(
                    filters.sort === 'price-asc'
                      ? 'cars.sortPriceAsc'
                      : filters.sort === 'price-desc'
                        ? 'cars.sortPriceDesc'
                        : 'cars.sortNewest'
                  )}
                </span>
                <Icon name="chevron-down" size={16} className="shrink-0 text-muted" />
                <select
                  value={filters.sort}
                  onChange={(e) => update({ sort: e.target.value as CarFilters['sort'] })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  <option value="newest">{t('cars.sortNewest')}</option>
                  <option value="price-asc">{t('cars.sortPriceAsc')}</option>
                  <option value="price-desc">{t('cars.sortPriceDesc')}</option>
                </select>
              </label>
            </div>

            {/* Quick 1-Tap Filter Chips (Horizontal scrollable) */}
            <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1">
              {/* 1-tap Cash / Monthly toggle chip */}
              <button
                type="button"
                onClick={() =>
                  update({ budgetType: filters.budgetType === 'monthly' ? 'cash' : 'monthly' })
                }
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.budgetType === 'monthly'
                    ? 'bg-ink text-white ring-1 ring-ink'
                    : 'bg-white text-ink border border-line hover:bg-cream'
                }`}
              >
                <span>{filters.budgetType === 'monthly' ? 'تمويل بالتقسيط' : 'شراء نقدي'}</span>
                <span className="text-[10px] text-gold">⇄</span>
              </button>

              {/* Quick Brand Chip */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.brand
                    ? 'bg-ink text-white ring-1 ring-gold/60'
                    : 'bg-white text-ink border border-line hover:bg-cream'
                }`}
              >
                <span>{filters.brand || 'الماركة'}</span>
                <Icon name="chevron-down" size={13} className={filters.brand ? 'text-gold' : 'text-muted'} />
              </button>

              {/* Quick Year Chip */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.year
                    ? 'bg-ink text-white ring-1 ring-gold/60'
                    : 'bg-white text-ink border border-line hover:bg-cream'
                }`}
              >
                <span>{filters.year ? `موديل ${filters.year}` : 'سنة الصنع'}</span>
                <Icon name="chevron-down" size={13} className={filters.year ? 'text-gold' : 'text-muted'} />
              </button>

              {/* Quick Fuel Chip */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.fuel
                    ? 'bg-ink text-white ring-1 ring-gold/60'
                    : 'bg-white text-ink border border-line hover:bg-cream'
                }`}
              >
                <span>{filters.fuel ? t(`fuel.${filters.fuel}`) : 'نوع الوقود'}</span>
                <Icon name="chevron-down" size={13} className={filters.fuel ? 'text-gold' : 'text-muted'} />
              </button>
            </div>

            {/* Active dismissible tags row */}
            {activeCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {filters.brand && (
                  <button
                    type="button"
                    onClick={() => update({ brand: undefined, model: undefined })}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-gold/25"
                  >
                    <span>{filters.brand}</span>
                    <span className="text-muted">✕</span>
                  </button>
                )}
                {filters.model && (
                  <button
                    type="button"
                    onClick={() => update({ model: undefined })}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-gold/25"
                  >
                    <span>{filters.model}</span>
                    <span className="text-muted">✕</span>
                  </button>
                )}
                {filters.year && (
                  <button
                    type="button"
                    onClick={() => update({ year: undefined })}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-gold/25"
                  >
                    <span>{filters.year}</span>
                    <span className="text-muted">✕</span>
                  </button>
                )}
                {filters.fuel && (
                  <button
                    type="button"
                    onClick={() => update({ fuel: undefined })}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-gold/25"
                  >
                    <span>{t(`fuel.${filters.fuel}`)}</span>
                    <span className="text-muted">✕</span>
                  </button>
                )}
                {(filters.minPrice || filters.maxPrice) && (
                  <button
                    type="button"
                    onClick={() => update({ minPrice: undefined, maxPrice: undefined })}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-gold/25"
                  >
                    <span>
                      {filters.minPrice ? `من ${filters.minPrice.toLocaleString()}` : ''}{' '}
                      {filters.maxPrice ? `إلى ${filters.maxPrice.toLocaleString()}` : ''}
                    </span>
                    <span className="text-muted">✕</span>
                  </button>
                )}
                {filters.budgetType === 'monthly' && (
                  <button
                    type="button"
                    onClick={() => update({ budgetType: 'cash' })}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-gold/25"
                  >
                    <span>أقساط</span>
                    <span className="text-muted">✕</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    update({
                      brand: undefined,
                      model: undefined,
                      year: undefined,
                      fuel: undefined,
                      minPrice: undefined,
                      maxPrice: undefined,
                      budgetType: 'cash',
                    })
                  }
                  className="px-2 py-1 text-[11px] font-bold text-bronze hover:underline"
                >
                  مسح الكل
                </button>
              </div>
            )}
          </div>

          {/* Main Grid: Desktop Sidebar + Cars List */}
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            {/* Desktop-only Sidebar: Hidden on mobile so cars show immediately */}
            <aside className="hidden flex-col gap-6 lg:flex">
              <FiltersPanel filters={filters} onApply={update} />
              <div className="rounded-lg bg-sand p-5 pt-6">
                <Icon name="compare" size={24} className="text-ink" />
                <h3 className="mt-5 text-body font-bold">{t('cars.compareTitle')}</h3>
                <p className="mt-[17px] text-small text-muted">{t('cars.compareText')}</p>
                <Button to="/compare" variant="dark" className="mt-10 h-[46px] w-full">
                  {t('cars.compareBtn')}
                </Button>
              </div>
            </aside>

            {/* Cars catalog view */}
            <div>
              {/* Desktop header with title and sort */}
              <div className="hidden items-center justify-between gap-4 lg:flex">
                <h2 className="text-h3 font-bold">{t('cars.available')}</h2>
                <label className="relative flex h-10 w-[250px] items-center rounded-lg bg-white ps-4 pe-3">
                  <span className="flex-1 text-small">
                    {t('cars.sort', {
                      value: t(
                        filters.sort === 'price-asc'
                          ? 'cars.sortPriceAsc'
                          : filters.sort === 'price-desc'
                            ? 'cars.sortPriceDesc'
                            : 'cars.sortNewest'
                      ),
                    })}
                  </span>
                  <Icon name="chevron-down" size={18} />
                  <select
                    value={filters.sort}
                    onChange={(e) => update({ sort: e.target.value as CarFilters['sort'] })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    <option value="newest">{t('cars.sortNewest')}</option>
                    <option value="price-asc">{t('cars.sortPriceAsc')}</option>
                    <option value="price-desc">{t('cars.sortPriceDesc')}</option>
                  </select>
                </label>
              </div>

              {/* Cars Cards Grid */}
              <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
                {(data?.data ?? []).map((c) => (
                  <CarCard key={c.id} car={c} />
                ))}
              </div>

              {data && data.data.length === 0 && (
                <div className="rounded-2xl border border-line bg-white py-20 text-center">
                  <p className="text-base font-bold text-ink">{t('common.empty')}</p>
                  <p className="mt-2 text-xs text-muted">جرّب تغيير خيارات البحث أو إعادة ضبط الفلاتر</p>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        brand: undefined,
                        model: undefined,
                        year: undefined,
                        fuel: undefined,
                        minPrice: undefined,
                        maxPrice: undefined,
                        budgetType: 'cash',
                        search: undefined,
                      })
                    }
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-white transition hover:bg-gold hover:text-ink"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              )}

              {data && (
                <div className="mt-[34px]">
                  <Pagination
                    page={data.meta.currentPage}
                    last={Math.max(data.meta.lastPage, 1)}
                    onChange={(p) => update({ page: p }, false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAST MOBILE FILTERS SLIDE-UP DRAWER SHEET */}
      {mobileDrawerOpen && (
        <MobileFilterSheet
          filters={filters}
          onClose={() => setMobileDrawerOpen(false)}
          onApply={(patch) => {
            update(patch)
            setMobileDrawerOpen(false)
          }}
        />
      )}

      {/* Personal assistance */}
      <section className="bg-cream pb-8">
        <div className="container-x">
          <CtaBox
            title={t('cars.assistTitle')}
            text={t('cars.assistText')}
            actions={
              <>
                <Link to="/contact" className="text-body font-bold text-bronze hover:underline">
                  {t('common.contactUs')}
                </Link>
                <Button to="/request-car" variant="dark" className="h-12 w-[190px]">
                  {t('nav.requestCar')}
                </Button>
              </>
            }
          />
        </div>
      </section>
    </>
  )
}

/** FAST MOBILE FILTER BOTTOM SHEET */
function MobileFilterSheet({
  filters,
  onClose,
  onApply,
}: {
  filters: CarFilters
  onClose: () => void
  onApply: (patch: Partial<CarFilters>) => void
}) {
  const { data: opts } = useApi(getCarFilterOptions)
  const [d, setD] = useState({
    brand: filters.brand,
    model: filters.model,
    year: filters.year,
    fuel: filters.fuel,
    budgetType: filters.budgetType ?? 'cash',
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  })

  const resetAll = () => {
    setD({
      brand: undefined,
      model: undefined,
      year: undefined,
      fuel: undefined,
      budgetType: 'cash',
      minPrice: undefined,
      maxPrice: undefined,
    })
  }

  const num = (v: string) => (v ? Number(v.replace(/\D/g, '')) || undefined : undefined)

  // Popular brands list for fast chips
  const popularBrands = [
    'تويوتا',
    'هيونداي',
    'كيا',
    'نيسان',
    'جيتور',
    'مرسيدس بنز',
    'بي إم دبليو',
    'شانجان',
    'شيري',
    'ام جي',
    'جي اي سي',
    'بورشه',
  ]
  const allBrands = opts?.brands && opts.brands.length > 0 ? opts.brands : popularBrands

  // Quick price budget presets
  const cashPresets = [
    { label: 'الكل', min: undefined, max: undefined },
    { label: 'أقل من 80 ألف', min: undefined, max: 80000 },
    { label: '80 - 150 ألف', min: 80000, max: 150000 },
    { label: '150 - 250 ألف', min: 150000, max: 250000 },
    { label: 'أكثر من 250 ألف', min: 250000, max: undefined },
  ]

  const monthlyPresets = [
    { label: 'الكل', min: undefined, max: undefined },
    { label: 'أقل من 1,200 ر.س', min: undefined, max: 1200 },
    { label: '1,200 - 2,000 ر.س', min: 1200, max: 2000 },
    { label: '2,000 - 3,500 ر.س', min: 2000, max: 3500 },
    { label: 'أكثر من 3,500 ر.س', min: 3500, max: undefined },
  ]

  const currentPresets = d.budgetType === 'monthly' ? monthlyPresets : cashPresets

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative z-10 flex max-h-[88vh] w-full flex-col rounded-t-3xl border-t border-line bg-white text-ink shadow-2xl transition-transform duration-300">
        {/* Drag handle */}
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-300" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-ink">تصفية السيارات</h3>
            <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-bold text-bronze">
              سريع
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-bold text-bronze hover:underline"
            >
              إعادة ضبط
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-cream text-muted transition hover:bg-slate-200 hover:text-ink"
              aria-label="إغلاق"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 1. طريقة الشراء (نقدي أم قسط شهري) */}
          <div>
            <p className="mb-2 text-xs font-bold text-ink">نوع الشراء / الميزانية</p>
            <div className="flex h-10 rounded-xl bg-cream p-1">
              <button
                type="button"
                onClick={() => setD({ ...d, budgetType: 'cash', minPrice: undefined, maxPrice: undefined })}
                className={`flex-1 rounded-lg text-xs font-bold transition ${
                  d.budgetType === 'cash' ? 'bg-ink text-white shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                شراء نقدي (كاش)
              </button>
              <button
                type="button"
                onClick={() => setD({ ...d, budgetType: 'monthly', minPrice: undefined, maxPrice: undefined })}
                className={`flex-1 rounded-lg text-xs font-bold transition ${
                  d.budgetType === 'monthly' ? 'bg-ink text-white shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                تمويل بالتقسيط (شهري)
              </button>
            </div>

            {/* Quick Price Range Chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {currentPresets.map((p, idx) => {
                const isSelected = d.minPrice === p.min && d.maxPrice === p.max
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setD({ ...d, minPrice: p.min, maxPrice: p.max })}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                      isSelected
                        ? 'bg-gold text-ink font-bold shadow-xs'
                        : 'bg-cream text-muted hover:bg-slate-200 hover:text-ink'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            {/* Custom Min / Max Inputs */}
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  inputMode="numeric"
                  value={d.minPrice ?? ''}
                  onChange={(e) => setD({ ...d, minPrice: num(e.target.value) })}
                  placeholder="الحد الأدنى"
                  className="h-10 w-full rounded-xl bg-cream px-3 text-center text-xs font-medium outline-none placeholder:text-muted focus:ring-2 focus:ring-gold/50"
                />
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                  ر.س
                </span>
              </div>
              <div className="relative">
                <input
                  inputMode="numeric"
                  value={d.maxPrice ?? ''}
                  onChange={(e) => setD({ ...d, maxPrice: num(e.target.value) })}
                  placeholder="الحد الأعلى"
                  className="h-10 w-full rounded-xl bg-cream px-3 text-center text-xs font-medium outline-none placeholder:text-muted focus:ring-2 focus:ring-gold/50"
                />
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                  ر.س
                </span>
              </div>
            </div>
          </div>

          {/* 2. العلامة التجارية (الماركة) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-ink">العلامة التجارية (الماركة)</p>
              {d.brand && (
                <button
                  type="button"
                  onClick={() => setD({ ...d, brand: undefined, model: undefined })}
                  className="text-[11px] text-bronze hover:underline"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>

            {/* Visual Touch Chips for Brands */}
            <div className="no-scrollbar -mx-1 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => setD({ ...d, brand: undefined, model: undefined })}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  !d.brand ? 'bg-ink text-white font-bold' : 'bg-cream text-muted hover:bg-slate-200'
                }`}
              >
                كل العلامات
              </button>
              {allBrands.map((b) => {
                const isSelected = d.brand === b
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setD({ ...d, brand: isSelected ? undefined : b, model: undefined })}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-ink text-white font-bold ring-1.5 ring-gold'
                        : 'bg-cream text-muted hover:bg-slate-200 hover:text-ink'
                    }`}
                  >
                    {b}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. الموديل (يظهر عند اختيار ماركة) */}
          {d.brand && (
            <div>
              <p className="mb-2 text-xs font-bold text-ink">موديل {d.brand}</p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setD({ ...d, model: undefined })}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    !d.model ? 'bg-ink text-white font-bold' : 'bg-cream text-muted hover:bg-slate-200'
                  }`}
                >
                  كل الموديلات
                </button>
                {(opts?.models ?? []).map((m) => {
                  const isSelected = d.model === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setD({ ...d, model: isSelected ? undefined : m })}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-ink text-white font-bold ring-1.5 ring-gold'
                          : 'bg-cream text-muted hover:bg-slate-200 hover:text-ink'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 4. سنة الصنع */}
          <div>
            <p className="mb-2 text-xs font-bold text-ink">سنة الصنع (الموديل)</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setD({ ...d, year: undefined })}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  !d.year ? 'bg-ink text-white font-bold' : 'bg-cream text-muted hover:bg-slate-200'
                }`}
              >
                الكل
              </button>
              {(opts?.years && opts.years.length > 0 ? opts.years : [2026, 2025, 2024, 2023]).map((y) => {
                const isSelected = d.year === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setD({ ...d, year: isSelected ? undefined : y })}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-ink text-white font-bold ring-1.5 ring-gold'
                        : 'bg-cream text-muted hover:bg-slate-200 hover:text-ink'
                    }`}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 5. نوع الوقود */}
          <div>
            <p className="mb-2 text-xs font-bold text-ink">نوع الوقود</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setD({ ...d, fuel: undefined })}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  !d.fuel ? 'bg-ink text-white font-bold' : 'bg-cream text-muted hover:bg-slate-200'
                }`}
              >
                الكل
              </button>
              {[
                { id: 'petrol', label: 'بنزين', icon: '⛽' },
                { id: 'hybrid', label: 'هجين', icon: '⚡' },
                { id: 'electric', label: 'كهرباء', icon: '🔋' },
                { id: 'diesel', label: 'ديزل', icon: '🛢️' },
              ].map((f) => {
                const isSelected = d.fuel === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setD({ ...d, fuel: isSelected ? undefined : (f.id as FuelType) })}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-ink text-white font-bold ring-1.5 ring-gold'
                        : 'bg-cream text-muted hover:bg-slate-200 hover:text-ink'
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="border-t border-line bg-white p-4">
          <Button
            variant="dark"
            className="h-12 w-full rounded-xl bg-ink text-sm font-bold text-white shadow-md transition active:scale-95"
            onClick={() => onApply(d)}
          >
            تطبيق الفلاتر وعرض النتائج
          </Button>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  all,
  options,
}: {
  label: string
  value?: string | number
  onChange: (v: string) => void
  all: string
  options: { v: string; l: ReactNode }[]
}) {
  return (
    <div>
      <p className="mb-[7px] text-body font-bold">{label}</p>
      <label className="relative flex h-11 items-center rounded-lg bg-cream ps-[30px] pe-2.5">
        <span className="flex-1 truncate text-small text-muted">
          {options.find((o) => o.v === String(value ?? ''))?.l ?? all}
        </span>
        <Icon name="chevron-down" size={18} className="text-ink" />
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={label}
        >
          <option value="">{all}</option>
          {options.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function FiltersPanel({
  filters,
  onApply,
}: {
  filters: CarFilters
  onApply: (f: Partial<CarFilters>) => void
}) {
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
  }, [
    filters.brand,
    filters.model,
    filters.year,
    filters.fuel,
    filters.budgetType,
    filters.minPrice,
    filters.maxPrice,
  ])

  const applied = [
    filters.brand,
    filters.model,
    filters.year,
    filters.fuel,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length
  const reset = () =>
    onApply({
      brand: undefined,
      model: undefined,
      year: undefined,
      fuel: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      budgetType: 'cash',
    })
  const num = (v: string) => (v ? Number(v.replace(/\D/g, '')) || undefined : undefined)

  return (
    <div className="rounded-lg bg-white p-5">
      <div className="flex items-center justify-between border-b border-line pb-3.5">
        <h3 className="text-h3 font-bold">{t('cars.filters')}</h3>
        <button onClick={reset} className="text-tiny font-medium text-bronze hover:underline">
          {t('cars.reset')}
        </button>
      </div>

      <div className="mt-[21px] flex flex-col gap-5">
        <FilterSelect
          label={t('cars.brand')}
          all={t('cars.allBrands')}
          value={d.brand}
          onChange={(v) => setD({ ...d, brand: v || undefined })}
          options={(opts?.brands ?? []).map((b) => ({ v: b, l: b }))}
        />
        <FilterSelect
          label={t('cars.model')}
          all={t('cars.allModels')}
          value={d.model}
          onChange={(v) => setD({ ...d, model: v || undefined })}
          options={(opts?.models ?? []).map((b) => ({ v: b, l: b }))}
        />

        <div>
          <p className="mb-[11px] text-body font-bold">{t('cars.budget')}</p>
          <div className="flex h-[38px] rounded-lg bg-cream p-[3px]">
            {(['cash', 'monthly'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setD({ ...d, budgetType: b })}
                className={`flex-1 rounded-lg text-small transition ${
                  d.budgetType === b ? 'bg-ink text-white' : 'text-muted'
                }`}
              >
                {t(b === 'cash' ? 'cars.budgetCash' : 'cars.budgetMonthly')}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              inputMode="numeric"
              value={d.minPrice ?? ''}
              onChange={(e) => setD({ ...d, minPrice: num(e.target.value) })}
              placeholder={t('cars.min')}
              className="h-11 rounded-lg bg-cream text-center text-tiny font-medium outline-none placeholder:text-muted focus:ring-2 focus:ring-gold/40"
            />
            <input
              inputMode="numeric"
              value={d.maxPrice ?? ''}
              onChange={(e) => setD({ ...d, maxPrice: num(e.target.value) })}
              placeholder={t('cars.max')}
              className="h-11 rounded-lg bg-cream text-center text-tiny font-medium outline-none placeholder:text-muted focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <p className="mt-[11px] text-tiny font-medium text-muted">{t('cars.currencyHint')}</p>
        </div>

        <FilterSelect
          label={t('cars.year')}
          all={t('cars.allYears')}
          value={d.year}
          onChange={(v) => setD({ ...d, year: v ? Number(v) : undefined })}
          options={(opts?.years ?? []).map((y) => ({ v: String(y), l: y }))}
        />
        <FilterSelect
          label={t('cars.fuel')}
          all={t('cars.allFuels')}
          value={d.fuel}
          onChange={(v) => setD({ ...d, fuel: (v || undefined) as FuelType })}
          options={['petrol', 'diesel', 'hybrid', 'electric'].map((f) => ({
            v: f,
            l: t(`fuel.${f}`),
          }))}
        />
      </div>

      <div className="mt-8 border-t border-line pt-[22px]">
        <Button variant="dark" className="h-[46px] w-full" onClick={() => onApply(d)}>
          {t('cars.apply')}
        </Button>
        <p className="mt-[17px] text-center text-tiny font-medium text-muted">
          {applied ? t('cars.filtersApplied', { count: applied }) : t('cars.noFilters')}
        </p>
      </div>
    </div>
  )
}
