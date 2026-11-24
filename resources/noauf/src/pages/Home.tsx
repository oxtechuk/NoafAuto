import { useMemo, useState } from 'react'
import { asset } from '@/lib/asset'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import SectionHeading from '@/components/ui/SectionHeading'
import CarCard from '@/components/CarCard'
import Carousel from '@/components/Carousel'
import { useApi } from '@/hooks/useApi'
import { getCarFilterOptions, getCars, getLatestCars } from '@/services/cars'
import { getBrands } from '@/services/content'
import { sar } from '@/lib/format'

const cardW = 'w-[300px] shrink-0 snap-start sm:w-[355px]'

export default function Home() {
  return (
    <>
      <Hero />
      <CarFinder />
      <Brands />
      <LatestCars />
      <Services />
      <SelectedOffers />
      <BudgetCollection />
      <Steps />
      {/* The mascot + AI assistant now lives in Layout (AssistantWidget), on every page. */}
    </>
  )
}

function Hero() {
  const { t } = useTranslation()
  return (
    <section className="bg-ink">
      <div className="container-x">
        <div className="grid gap-12 border-b border-ink-2 pt-10 pb-24 lg:grid-cols-[1fr_614px] lg:gap-[82px] lg:pt-[46px] lg:pb-[99px]">
          <div className="lg:order-none">
            <p className="text-small text-gold">{t('home.eyebrow')}</p>
            <h1 className="mt-6 text-[40px] leading-[52px] font-extrabold whitespace-pre-line text-white md:text-display md:leading-[76px]">{t('home.title')}</h1>
            <p className="mt-6 max-w-[452px] text-lead text-silver">{t('home.subtitle')}</p>
            <div className="mt-9 flex flex-wrap gap-5">
              <Button to="/cars" className="h-[52px] min-w-[204px]">{t('home.exploreCars')}</Button>
              <Button to="/blog/car-finance-guide" variant="outline-dark" className="h-[52px] min-w-[232px]">{t('home.exploreFinance')}</Button>
            </div>
            <p className="mt-7 text-small whitespace-pre text-silver">{t('home.ways')}</p>
          </div>

          {/* Champagne vehicle stage */}
          <div className="relative mt-4 lg:mt-[45px] lg:self-start">
            <div className="relative h-[300px] rounded-3xl bg-gold sm:h-[394px]" dir="ltr">
              <p className="absolute top-3 left-[22px] text-[40px] leading-[52px] font-extrabold whitespace-pre-line text-bronze sm:text-display">{t('home.stageText')}</p>
              <img src={asset('/images/cars/cayenne-gts.png')} alt="Porsche Cayenne GTS" className="absolute top-[54px] left-0 h-[220px] w-full object-contain sm:-left-[26px] sm:h-[350px] sm:w-[670px] sm:max-w-none" />
              <span className="absolute bottom-[30px] left-6 text-small text-ink">PORSCHE CAYENNE GTS</span>
              <span className="absolute right-6 bottom-[30px] text-small text-ink">2024 / SUV</span>
            </div>
            <Link
              to="/cars/porsche-cayenne-gts"
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

function CarFinder() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data } = useApi(getCarFilterOptions)
  const [f, setF] = useState({ brand: '', fuel: '', category: '', model: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const search = () => {
    const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v))
    navigate(`/cars?${p}`)
  }

  const cats = ['suv', 'sedan', 'sport', 'luxury', 'electric'].map((c) => ({ v: c, l: t(`cars.categories.${c}`) }))
  const fuels = ['petrol', 'diesel', 'hybrid', 'electric'].map((v) => ({ v, l: t(`fuel.${v}`, { defaultValue: v }) }))

  return (
    <section className="bg-cream pt-24 pb-[30px] lg:pt-7">
      <div className="container-x">
        <p className="text-tiny font-medium text-bronze">{t('home.finderEyebrow')}</p>
        <h2 className="mt-1.5 text-[28px] leading-[38px] font-bold md:text-h2 md:leading-[46px]">{t('home.finderTitle')}</h2>
        <div className="mt-[18px] flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 lg:h-[102px] lg:flex-row lg:items-center lg:gap-8 lg:py-0 lg:ps-4 lg:pe-4">
          <div className="grid flex-1 grid-cols-2 gap-4 lg:flex lg:gap-10 lg:divide-x lg:divide-line rtl:lg:divide-x-reverse [&>*]:lg:ps-0">
            <FinderField label={t('home.brand')} all={t('home.allBrands')} value={f.brand} onChange={set('brand')} options={(data?.brands ?? []).map((b) => ({ v: b, l: b }))} />
            <FinderField label={t('home.type')} all={t('home.allTypes')} value={f.fuel} onChange={set('fuel')} options={fuels} />
            <FinderField label={t('home.category')} all={t('home.allCategories')} value={f.category} onChange={set('category')} options={cats} />
            <FinderField label={t('home.model')} all={t('home.allModels')} value={f.model} onChange={set('model')} options={(data?.models ?? []).map((m) => ({ v: m, l: m }))} />
          </div>
          <Button variant="dark" onClick={search} className="h-12 w-full lg:w-[118px]">
            {t('home.search')}
            <Icon name="search" size={20} />
          </Button>
        </div>
      </div>
    </section>
  )
}

function Brands() {
  const { t } = useTranslation()
  const { data } = useApi(getBrands)
  const brands = data ?? []
  if (brands.length === 0) return null

  // Duplicate for seamless infinite loop
  const list = [...brands, ...brands]

  return (
    <section className="bg-cream overflow-hidden">
      <div className="container-x">
        <div className="flex flex-col gap-6 border-t border-line py-8 lg:h-[142px] lg:flex-row lg:items-center lg:gap-14 lg:py-0">
          <h2 className="shrink-0 text-h3 font-bold whitespace-pre-line lg:w-[168px]">{t('home.brandsTitle')}</h2>
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
                  <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LatestCars() {
  const { t } = useTranslation()
  const { data } = useApi(getLatestCars)
  return (
    <section className="bg-white pt-8 pb-[22px]">
      <div className="container-x">
        <SectionHeading
          eyebrow={t('home.latestEyebrow')}
          title={t('home.latestTitle')}
          subtitle={t('home.latestSubtitle')}
          aside={<Button to="/cars" variant="outline" className="h-12 w-[184px]">{t('common.viewAllCars')}</Button>}
        />
        <div className="mt-9">
          <Carousel count={data?.length ?? 5}>
            {(data ?? []).map((c) => (
              <CarCard key={c.id} car={c} className={cardW} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  )
}

function Services() {
  const { t } = useTranslation()
  const items = [
    { n: '01', k: 1, to: '/blog/car-finance-guide', gold: true },
    { n: '02', k: 2, to: '/finance/calculator' },
    { n: '03', k: 3, to: '/compare' },
  ]
  return (
    <section className="bg-ink py-[42px] pb-[58px]">
      <div className="container-x">
        <h2 className="text-[28px] leading-[38px] font-bold text-white md:text-h2 md:leading-[46px]">{t('home.servicesTitle')}</h2>
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

function SelectedOffers() {
  const { t } = useTranslation()
  const { data } = useApi(() => getCars({}))
  return (
    <section className="overflow-hidden bg-cream pt-8 pb-[46px]">
      <div className="container-x">
        <SectionHeading
          eyebrow={t('home.offersEyebrow')}
          title={t('home.offersTitle')}
          subtitle={t('home.offersSubtitle')}
          aside={<Button to="/cars" variant="outline" className="h-12 w-[184px]">{t('common.viewAllCars')}</Button>}
        />
        <div className="mt-9">
          <Carousel count={(data?.data.length ?? 4) + 1} bleed>
            <div className={`${cardW} flex min-h-[450px] flex-col rounded-3xl bg-ink px-7 pt-7 pb-[30px]`}>
              <p className="text-tiny font-medium text-gold" dir="ltr">{t('home.editLabel')}</p>
              <h3 className="mt-11 text-h1 font-extrabold whitespace-pre-line text-white">{t('home.editTitle')}</h3>
              <p className="mt-6 text-lead whitespace-pre-line text-silver">{t('home.editText')}</p>
              <div className="mt-auto border-t border-ink-2 pt-7">
                <Link to="/offers" className="text-body font-bold text-gold hover:underline">{t('home.editAction')}</Link>
              </div>
            </div>
            {(data?.data ?? []).map((c) => (
              <CarCard key={c.id} car={c} className={cardW} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  )
}

const BUDGETS = [
  { id: 'all' },
  { id: 'b1', min: 7000, max: 9000 },
  { id: 'b2', min: 9000, max: 12000 },
  { id: 'b3', min: 12000, max: 15000 },
]

function BudgetCollection() {
  const { t } = useTranslation()
  const [active, setActive] = useState('all')
  const b = BUDGETS.find((x) => x.id === active)!
  const { data } = useApi(() => getCars({ budgetType: 'monthly', minPrice: b.min, maxPrice: b.max }), [active])
  const label = (x: (typeof BUDGETS)[number]) => (x.id === 'all' ? t('common.all') : `${(x.min! / 1000).toFixed(0)},000 - ${(x.max! / 1000).toFixed(0)},000 ${t('common.currency')}`)

  const chips = useMemo(
    () => (
      <div className="flex flex-wrap gap-4">
        {BUDGETS.map((x) => (
          <button
            key={x.id}
            onClick={() => setActive(x.id)}
            className={`h-[42px] rounded-[4px] px-2 text-small transition ${x.id === 'all' ? 'min-w-[100px]' : 'min-w-[122px]'} ${active === x.id ? 'bg-ink text-white' : 'bg-sand text-ink hover:bg-line'}`}
          >
            {label(x)}
          </button>
        ))}
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, t],
  )

  return (
    <section className="bg-white pt-8 pb-[42px]">
      <div className="container-x">
        <SectionHeading eyebrow={t('home.budgetEyebrow')} title={t('home.budgetTitle')} subtitle={t('home.budgetSubtitle')} aside={chips} />
        <div className="mt-9">
          {data && data.data.length === 0 ? (
            <p className="py-20 text-center text-muted">{t('common.empty')}</p>
          ) : (
            <Carousel count={data?.data.length ?? 5}>
              {(data?.data ?? []).map((c) => (
                <CarCard key={c.id} car={c} className={cardW} />
              ))}
            </Carousel>
          )}
        </div>
      </div>
    </section>
  )
}

function Steps() {
  const { t } = useTranslation()
  return (
    <section className="bg-sand pt-[38px] pb-[74px]">
      <div className="container-x">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="text-[28px] leading-[38px] font-bold md:text-h2 md:leading-[46px]">{t('home.stepsTitle')}</h2>
          <p className="text-body font-bold text-bronze">{t('home.stepsAside')}</p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {[1, 2, 3, 4].map((n) => (
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

