import { useEffect, useMemo, useState } from 'react'
import { asset } from '@/lib/asset'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import SectionHeading from '@/components/ui/SectionHeading'
import CarCard from '@/components/CarCard'
import Carousel from '@/components/Carousel'
import HomeSkeleton, { CarRowSkeleton } from '@/components/skeletons/HomeSkeleton'
import { useApi } from '@/hooks/useApi'
import { getCarFilterOptions, getCars, getLatestCars } from '@/services/cars'
import { getBrands, getHome, peekHome } from '@/services/content'
import { toCar } from '@/sitekit-sdk/mappers'
import type { SkCar, SkHomeData } from '@/sitekit-sdk/types'
import { sar } from '@/lib/format'

const cardW = 'w-[300px] shrink-0 snap-start sm:w-[355px]'

/**
 * Everything on this page comes from GET /home (inlined in the HTML on first visit).
 * The per-section requests below are fallbacks only: they run when /home failed or a list is empty.
 */
export default function Home() {
  const { data: homeData, loading } = useApi(getHome, [], { peek: peekHome })

  if (loading && !homeData) return <HomeSkeleton />

  return (
    <>
      <Hero data={homeData} />
      <CarFinder data={homeData} />
      <Brands data={homeData} />
      <LatestCars data={homeData} />
      <Services data={homeData} />
      <SelectedOffers data={homeData} />
      <BudgetCollection data={homeData} />
      <Steps data={homeData} />
      {/* The mascot + AI assistant now lives in Layout (AssistantWidget), on every page. */}
    </>
  )
}

function Hero({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const slides = data?.hero_slides ?? []
  const [activeIdx, setActiveIdx] = useState(0)

  const activeSlide = slides[activeIdx] || null
  const heroSection = data?.page_sections?.hero

  // Dynamic values with fallbacks to translations
  const eyebrow = activeSlide?.badge || heroSection?.badge || t('home.eyebrow')
  const title = activeSlide?.title || heroSection?.title || t('home.title')
  const subtitle = activeSlide?.description || activeSlide?.subtitle || heroSection?.subtitle || t('home.subtitle')
  const primaryBtnText = activeSlide?.button_text || heroSection?.button_text || t('home.exploreCars')
  const primaryBtnUrl = activeSlide?.button_url || heroSection?.button_url || '/cars'
  const slideImage = activeSlide?.image_desktop || activeSlide?.image || data?.hero?.image || asset('/images/cars/cayenne-gts.png')

  return (
    <section className="bg-ink">
      <div className="container-x">
        <div className="grid gap-12 border-b border-ink-2 pt-10 pb-24 lg:grid-cols-[1fr_614px] lg:gap-[82px] lg:pt-[46px] lg:pb-[99px]">
          <div className="lg:order-none">
            {eyebrow && <p className="text-small text-gold">{eyebrow}</p>}
            <h1 className="mt-6 text-[40px] leading-[52px] font-extrabold whitespace-pre-line text-white md:text-display md:leading-[76px]">
              {title}
            </h1>
            <p className="mt-6 max-w-[452px] text-lead text-silver whitespace-pre-line">
              {subtitle}
            </p>
            <div className="mt-9 flex flex-wrap gap-5">
              <Button to={primaryBtnUrl} className="h-[52px] min-w-[204px]">
                {primaryBtnText}
              </Button>
              <Button to="/blog/car-finance-guide" variant="outline-dark" className="h-[52px] min-w-[232px]">
                {t('home.exploreFinance')}
              </Button>
            </div>
            <p className="mt-7 text-small whitespace-pre text-silver">{t('home.ways')}</p>

            {/* Slide Indicators if multiple hero slides exist */}
            {slides.length > 1 && (
              <div className="mt-6 flex items-center gap-2">
                {slides.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      idx === activeIdx ? 'w-8 bg-gold' : 'w-2.5 bg-ink-2 hover:bg-silver/40'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Champagne vehicle stage */}
          <div className="relative mt-4 lg:mt-[45px] lg:self-start">
            <div className="relative h-[300px] rounded-3xl bg-gold sm:h-[394px]" dir="ltr">
              <p className="absolute top-3 left-[22px] text-[40px] leading-[52px] font-extrabold whitespace-pre-line text-bronze sm:text-display">
                {activeSlide?.subtitle || t('home.stageText')}
              </p>
              <img
                src={slideImage}
                alt={title}
                className="absolute top-[54px] left-0 h-[220px] w-full object-contain sm:-left-[26px] sm:h-[350px] sm:w-[670px] sm:max-w-none"
              />
              <span className="absolute bottom-[30px] left-6 text-small text-ink">
                {activeSlide ? activeSlide.title : 'PORSCHE CAYENNE GTS'}
              </span>
              <span className="absolute right-6 bottom-[30px] text-small text-ink">
                {activeSlide?.badge || '2024 / SUV'}
              </span>
            </div>
            <Link
              to={primaryBtnUrl}
              className="absolute inset-x-4 -bottom-[69px] flex items-center justify-between rounded-2xl bg-cream px-6 py-4 shadow-sm sm:inset-x-[28px]"
            >
              <div>
                <p className="text-small text-muted">Porsche · 2024</p>
                <p className="text-h3 font-bold text-ink">Cayenne GTS</p>
              </div>
              <div className="text-end">
                <p className="text-small text-muted">{t('common.monthly')}</p>
                <p className="text-h3 font-bold text-ink">{sar(10600)}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinderField({ label, value, onChange, options, all }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; all: string }) {
  return (
    <label className="relative flex min-w-0 flex-1 cursor-pointer items-end gap-0.5 py-1">
      <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
        <span className="text-tiny font-medium text-muted">{label}</span>
        <span className="truncate text-body font-bold text-ink">{options.find((o) => o.v === value)?.l ?? all}</span>
      </span>
      <Icon name="chevron-down" size={16} className="mb-1 text-ink" />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </label>
  )
}

function CarFinder({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Models only exist in /cars/meta: load it after first paint (or as soon as the user reaches for the finder).
  const [wantOpts, setWantOpts] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setWantOpts(true), 2500)
    return () => clearTimeout(timer)
  }, [])
  const loadOpts = () => setWantOpts(true)
  const { data: filterOpts } = useApi(getCarFilterOptions, [], { enabled: wantOpts })
  const [f, setF] = useState({ brand: '', fuel: '', category: '', model: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const search = () => {
    const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v))
    navigate(`/cars?${p}`)
  }

  const section = data?.page_sections?.filter || data?.page_sections?.search
  const eyebrow = section?.badge || section?.subtitle || t('home.finderEyebrow')
  const title = section?.title || t('home.finderTitle')
  const searchBtnText = section?.button_text || t('home.search')

  const cats = ['suv', 'sedan', 'sport', 'luxury', 'electric'].map((c) => ({ v: c, l: t(`cars.categories.${c}`) }))
  const fuels = ['petrol', 'diesel', 'hybrid', 'electric'].map((v) => ({ v, l: t(`fuel.${v}`, { defaultValue: v }) }))

  // Prefer dynamic brands from home API if available
  const availableBrands = (data?.brands && data.brands.length > 0)
    ? data.brands.map((b) => b.name)
    : (filterOpts?.brands ?? [])

  return (
    <section className="bg-cream pt-24 pb-[30px] lg:pt-7">
      <div className="container-x">
        {eyebrow && <p className="text-tiny font-medium text-bronze">{eyebrow}</p>}
        <h2 className="mt-1.5 text-[28px] leading-[38px] font-bold md:text-h2 md:leading-[46px]">{title}</h2>
        <div
          onPointerEnter={loadOpts}
          onTouchStart={loadOpts}
          onFocus={loadOpts}
          className="mt-[18px] flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 lg:h-[102px] lg:flex-row lg:items-center lg:gap-8 lg:py-0 lg:ps-4 lg:pe-4">
          <div className="grid flex-1 grid-cols-2 gap-4 lg:flex lg:gap-10 lg:divide-x lg:divide-line rtl:lg:divide-x-reverse [&>*]:lg:ps-0">
            <FinderField label={t('home.brand')} all={t('home.allBrands')} value={f.brand} onChange={set('brand')} options={availableBrands.map((b) => ({ v: b, l: b }))} />
            <FinderField label={t('home.type')} all={t('home.allTypes')} value={f.fuel} onChange={set('fuel')} options={fuels} />
            <FinderField label={t('home.category')} all={t('home.allCategories')} value={f.category} onChange={set('category')} options={cats} />
            <FinderField label={t('home.model')} all={t('home.allModels')} value={f.model} onChange={set('model')} options={(filterOpts?.models ?? []).map((m) => ({ v: m, l: m }))} />
          </div>
          <Button variant="dark" onClick={search} className="h-12 w-full lg:w-[118px]">
            {searchBtnText}
            <Icon name="search" size={20} />
          </Button>
        </div>
      </div>
    </section>
  )
}

function Brands({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const { data: fallbackBrands } = useApi(getBrands, [], { enabled: !data?.brands?.length })

  const section = data?.page_sections?.brands
  const title = section?.title || t('home.brandsTitle')

  // Dynamic brands list from API or fallback
  const brandsList = (data?.brands && data.brands.length > 0)
    ? data.brands.map((b) => ({ id: b.id, name: b.name, logo: b.logo || '' }))
    : (fallbackBrands ?? [])

  if (brandsList.length === 0) return null

  // Duplicate for seamless infinite loop
  const list = [...brandsList, ...brandsList]

  return (
    <section className="bg-cream overflow-hidden">
      <div className="container-x">
        <div className="flex flex-col gap-6 border-t border-line py-8 lg:h-[142px] lg:flex-row lg:items-center lg:gap-14 lg:py-0">
          <h2 className="shrink-0 text-h3 font-bold whitespace-pre-line lg:w-[168px]">{title}</h2>
          <div className="relative flex-1 overflow-hidden" dir="ltr">
            {/* Fade gradients on edges */}
            <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-8 bg-gradient-to-r from-cream to-transparent sm:w-16" />
            <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-8 bg-gradient-to-l from-cream to-transparent sm:w-16" />

            <div className="flex w-max items-center gap-8 sm:gap-12 animate-marquee hover:[animation-play-state:paused]">
              {list.map((b, idx) => (
                <Link
                  key={`${b.id}-${idx}`}
                  to={`/cars?brand=${encodeURIComponent(b.name)}`}
                  className="flex size-[80px] shrink-0 items-center justify-center transition-transform hover:scale-110 sm:size-[92px] lg:size-[104px]"
                  title={b.name}
                >
                  {b.logo ? (
                    <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                  ) : (
                    <span className="text-small font-bold text-ink">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LatestCars({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const { data: fallbackCars } = useApi(getLatestCars, [], { enabled: !data?.featured_cars?.length })

  const section = data?.page_sections?.latest_cars || data?.page_sections?.featured_cars
  const eyebrow = section?.badge || t('home.latestEyebrow')
  const title = section?.title || t('home.latestTitle')
  const subtitle = section?.subtitle || t('home.latestSubtitle')
  const btnText = section?.button_text || t('common.viewAllCars')
  const btnUrl = section?.button_url || '/cars'

  const cars = (data?.featured_cars && data.featured_cars.length > 0)
    ? data.featured_cars.map(toCar)
    : (fallbackCars ?? [])

  return (
    <section className="bg-white pt-8 pb-[22px]">
      <div className="container-x">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          aside={<Button to={btnUrl} variant="outline" className="h-12 w-[184px]">{btnText}</Button>}
        />
        <div className="mt-9">
          <Carousel count={cars.length || 5}>
            {cars.map((c) => (
              <CarCard key={c.id} car={c} className={cardW} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  )
}

function Services({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const section = data?.page_sections?.promo
  const title = section?.title || t('home.servicesTitle')

  const promoCards = data?.promo_cards ?? []

  // If CMS promo cards are present, use them dynamically!
  if (promoCards.length > 0) {
    return (
      <section className="bg-ink py-[42px] pb-[58px]">
        <div className="container-x">
          <h2 className="text-[28px] leading-[38px] font-bold text-white md:text-h2 md:leading-[46px]">{title}</h2>
          <div className="mt-11 grid gap-6 md:grid-cols-3 lg:gap-9">
            {promoCards.map((card, idx) => {
              const isGold = idx === 0 || card.type === 'large'
              const num = String(idx + 1).padStart(2, '0')
              return (
                <Link
                  key={card.id || num}
                  to={card.button_url || '/cars'}
                  className={`group flex min-h-[270px] flex-col rounded-2xl p-6 transition hover:-translate-y-1 ${
                    isGold ? 'bg-gold' : 'bg-ink-2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {card.badge ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-tiny font-bold ${isGold ? 'bg-ink text-gold' : 'bg-gold text-ink'}`}>
                        {card.badge}
                      </span>
                    ) : <span />}
                    <p className={`text-h2 font-bold ${isGold ? 'text-bronze' : 'text-silver'}`}>{num}</p>
                  </div>
                  <h3 className={`mt-2.5 text-h3 font-bold ${isGold ? 'text-ink' : 'text-white'}`}>{card.title}</h3>
                  <p className={`mt-3 text-lead whitespace-pre-line ${isGold ? 'text-ink' : 'text-silver'}`}>{card.subtitle}</p>
                  <div className="mt-auto flex items-center justify-between pt-6">
                    <span className={`text-body font-bold ${isGold ? 'text-ink' : 'text-white'}`}>
                      {card.button_text || t('common.explore', { defaultValue: 'اكتشف المزيد' })}
                    </span>
                    <span
                      className={`flex size-10 items-center justify-center rounded-full transition group-hover:scale-110 ${
                        isGold ? 'bg-ink text-white' : 'bg-gold text-ink'
                      }`}
                    >
                      <Icon name="chevron-right" size={20} />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // Fallback to static items
  const items = [
    { n: '01', k: 1, to: '/blog/car-finance-guide', gold: true },
    { n: '02', k: 2, to: '/finance/calculator' },
    { n: '03', k: 3, to: '/compare' },
  ]
  return (
    <section className="bg-ink py-[42px] pb-[58px]">
      <div className="container-x">
        <h2 className="text-[28px] leading-[38px] font-bold text-white md:text-h2 md:leading-[46px]">{title}</h2>
        <div className="mt-11 grid gap-6 md:grid-cols-3 lg:gap-9">
          {items.map((s) => (
            <Link key={s.n} to={s.to} className={`group flex min-h-[270px] flex-col rounded-2xl p-6 transition hover:-translate-y-1 ${s.gold ? 'bg-gold' : 'bg-ink-2'}`}>
              <p className={`text-end text-h2 font-bold ${s.gold ? 'text-bronze' : 'text-silver'}`}>{s.n}</p>
              <h3 className={`mt-2.5 text-h3 font-bold ${s.gold ? 'text-ink' : 'text-white'}`}>{t(`home.service${s.k}Title`)}</h3>
              <p className={`mt-3 text-lead whitespace-pre-line ${s.gold ? 'text-ink' : 'text-silver'}`}>{t(`home.service${s.k}Text`)}</p>
              <div className="mt-auto flex items-center justify-between pt-6">
                <span className={`text-body font-bold ${s.gold ? 'text-ink' : 'text-white'}`}>{t(`home.service${s.k}Action`)}</span>
                <span className={`flex size-10 items-center justify-center rounded-full transition group-hover:scale-110 ${s.gold ? 'bg-ink text-white' : 'bg-gold text-ink'}`}>
                  <Icon name="chevron-right" size={20} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function SelectedOffers({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const { data: fallbackCars } = useApi(() => getCars({}), [], { enabled: !data?.offer_cars?.length })

  const section = data?.page_sections?.offers
  const eyebrow = section?.badge || t('home.offersEyebrow')
  const title = section?.title || t('home.offersTitle')
  const subtitle = section?.subtitle || t('home.offersSubtitle')
  const btnText = section?.button_text || t('common.viewAllCars')
  const btnUrl = section?.button_url || '/offers'

  const banner = data?.featured_section
  const bannerLabel = banner?.badge || t('home.editLabel')
  const bannerTitle = banner?.title || t('home.editTitle')
  const bannerText = banner?.description || banner?.subtitle || t('home.editText')
  const bannerAction = banner?.button_text || t('home.editAction')
  const bannerUrl = banner?.button_url || '/offers'

  const cars = (data?.offer_cars && data.offer_cars.length > 0)
    ? data.offer_cars.map(toCar)
    : (fallbackCars?.data ?? [])

  return (
    <section className="overflow-hidden bg-cream pt-8 pb-[46px]">
      <div className="container-x">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          aside={<Button to={btnUrl} variant="outline" className="h-12 w-[184px]">{btnText}</Button>}
        />
        <div className="mt-9">
          <Carousel count={cars.length + 1} bleed>
            <div className={`${cardW} flex min-h-[450px] flex-col rounded-3xl bg-ink px-7 pt-7 pb-[30px]`}>
              <p className="text-tiny font-medium text-gold" dir="ltr">{bannerLabel}</p>
              <h3 className="mt-11 text-h1 font-extrabold whitespace-pre-line text-white">{bannerTitle}</h3>
              <p className="mt-6 text-lead whitespace-pre-line text-silver">{bannerText}</p>
              <div className="mt-auto border-t border-ink-2 pt-7">
                <Link to={bannerUrl} className="text-body font-bold text-gold hover:underline">{bannerAction}</Link>
              </div>
            </div>
            {cars.map((c) => (
              <CarCard key={c.id} car={c} className={cardW} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  )
}

const DEFAULT_BUDGETS = [
  { id: 'all', min: undefined, max: undefined },
  { id: 'b1', min: 7000, max: 9000 },
  { id: 'b2', min: 9000, max: 12000 },
  { id: 'b3', min: 12000, max: 15000 },
]

function BudgetCollection({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const cmsRanges = data?.budget_ranges ?? []

  const [activeId, setActiveId] = useState('all')

  // Section headings from CMS
  const section = data?.page_sections?.budget
  const eyebrow = section?.badge || t('home.budgetEyebrow')
  const title = section?.title || t('home.budgetTitle')
  const subtitle = section?.subtitle || section?.description || t('home.budgetSubtitle')

  // When activeId is 'all', use getCars fallback; when a specific CMS range is selected, get its preloaded cars or fetch
  const selectedCmsRange = cmsRanges.find((_, idx) => `cms-${idx}` === activeId)
  const defaultBudget = DEFAULT_BUDGETS.find((x) => x.id === activeId)

  // Cars already shipped with /home: the selected range, or every range (deduplicated) for "all".
  const preloadedCars = useMemo(() => {
    const source: SkCar[] = selectedCmsRange
      ? (selectedCmsRange.cars ?? [])
      : activeId === 'all'
        ? cmsRanges.flatMap((r) => r.cars ?? [])
        : []
    const seen = new Set<number>()
    return source.filter((c) => !seen.has(c.id) && seen.add(c.id)).map(toCar)
  }, [selectedCmsRange, activeId, cmsRanges])

  const { data: fallbackData, loading: fallbackLoading } = useApi(
    () =>
      getCars({
        budgetType: 'monthly',
        minPrice: selectedCmsRange ? selectedCmsRange.min : defaultBudget?.min,
        maxPrice: selectedCmsRange ? (selectedCmsRange.max ?? undefined) : defaultBudget?.max,
      }),
    [activeId, selectedCmsRange?.min, selectedCmsRange?.max, defaultBudget?.min, defaultBudget?.max],
    { enabled: preloadedCars.length === 0 },
  )

  const displayedCars = preloadedCars.length > 0 ? preloadedCars : (fallbackData?.data ?? [])

  const chips = useMemo(() => {
    if (cmsRanges.length > 0) {
      return (
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setActiveId('all')}
            className={`h-[42px] rounded-[4px] px-3 text-small transition min-w-[80px] ${
              activeId === 'all' ? 'bg-ink text-white' : 'bg-sand text-ink hover:bg-line'
            }`}
          >
            {t('common.all')}
          </button>
          {cmsRanges.map((range, idx) => {
            const chipId = `cms-${idx}`
            return (
              <button
                key={chipId}
                type="button"
                onClick={() => setActiveId(chipId)}
                className={`h-[42px] rounded-[4px] px-3 text-small transition whitespace-nowrap ${
                  activeId === chipId ? 'bg-ink text-white' : 'bg-sand text-ink hover:bg-line'
                }`}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      )
    }

    // Fallback static chips
    return (
      <div className="flex flex-wrap gap-4">
        {DEFAULT_BUDGETS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setActiveId(x.id)}
            className={`h-[42px] rounded-[4px] px-2 text-small transition ${
              x.id === 'all' ? 'min-w-[100px]' : 'min-w-[122px]'
            } ${activeId === x.id ? 'bg-ink text-white' : 'bg-sand text-ink hover:bg-line'}`}
          >
            {x.id === 'all'
              ? t('common.all')
              : `${(x.min! / 1000).toFixed(0)},000 - ${(x.max! / 1000).toFixed(0)},000 ${t('common.currency')}`}
          </button>
        ))}
      </div>
    )
  }, [cmsRanges, activeId, t])

  return (
    <section className="bg-white pt-8 pb-[42px]">
      <div className="container-x">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} aside={chips} />
        <div className="mt-9">
          {displayedCars.length === 0 && fallbackLoading ? (
            <CarRowSkeleton />
          ) : displayedCars.length === 0 ? (
            <p className="py-20 text-center text-muted">{t('common.empty')}</p>
          ) : (
            <Carousel count={displayedCars.length}>
              {displayedCars.map((c) => (
                <CarCard key={c.id} car={c} className={cardW} />
              ))}
            </Carousel>
          )}
        </div>
      </div>
    </section>
  )
}

function Steps({ data }: { data?: SkHomeData | null }) {
  const { t } = useTranslation()
  const section = data?.page_sections?.finance
  const title = section?.title || t('home.stepsTitle')
  const aside = section?.subtitle || section?.description || t('home.stepsAside')

  const cmsSteps = data?.finance_steps ?? []

  return (
    <section className="bg-sand pt-[38px] pb-[74px]">
      <div className="container-x">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="text-[28px] leading-[38px] font-bold md:text-h2 md:leading-[46px]">{title}</h2>
          <p className="text-body font-bold text-bronze">{aside}</p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {cmsSteps.length > 0
            ? cmsSteps.map((step, idx) => (
                <div
                  key={step.number || idx}
                  className="lg:border-s lg:border-line lg:px-4 lg:first:border-s-0 lg:first:ps-0 lg:last:pe-0"
                >
                  <p className="text-display font-extrabold text-bronze">
                    {String(step.number || idx + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-3 text-h3 font-bold">{step.title}</h3>
                  <p className="mt-4 text-lead whitespace-pre-line text-muted">{step.description}</p>
                </div>
              ))
            : [1, 2, 3, 4].map((n) => (
                <div key={n} className="lg:border-s lg:border-line lg:px-4 lg:first:border-s-0 lg:first:ps-0 lg:last:pe-0">
                  <p className="text-display font-extrabold text-bronze">{String(n).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-h3 font-bold">{t(`home.step${n}Title`)}</h3>
                  <p className="mt-4 text-lead whitespace-pre-line text-muted">{t(`home.step${n}Text`)}</p>
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}
