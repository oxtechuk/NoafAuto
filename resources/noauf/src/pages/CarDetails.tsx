import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import CarCard from '@/components/CarCard'
import { SITE } from '@/lib/constants'
import { useApi } from '@/hooks/useApi'
import { useCompare } from '@/context/CompareContext'
import { getCar, getSimilarCars } from '@/services/cars'
import { monthlyPayment, num } from '@/lib/format'

const DURATIONS = [24, 36, 48, 60, 72, 84]
const DOWN_PAYMENT_SHARE = 0.2

export default function CarDetails() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { set: setCompare, ids } = useCompare()
  const { data: car, loading } = useApi(() => getCar(id), [id])
  const { data: similar } = useApi(() => getSimilarCars(id), [id])
  const [months, setMonths] = useState(60)
  const [active, setActive] = useState(0)

  if (loading && !car) return <div className="min-h-[60vh] bg-ink" />
  if (!car) return <p className="container-x py-32 text-center text-muted">{t('car.notFound')}</p>

  const monthly = Math.round(monthlyPayment(car.cashPrice * (1 - DOWN_PAYMENT_SHARE), months))
  const fullName = `${car.brand} ${car.model}`
  const highlights = [
    { l: t('car.power'), v: `${car.horsepower} HP` },
    { l: t('car.engine'), v: car.engine },
    { l: t('car.transmission'), v: car.transmissionLabel },
    { l: t('car.seats'), v: t('common.seats', { count: car.seats }) },
  ]
  const specs = [
    { l: t('car.engine'), v: car.engine },
    { l: t('car.power'), v: `${car.horsepower} HP` },
    { l: t('car.fuel'), v: car.fuelLabel },
    { l: t('car.seatsCount'), v: t('common.seats', { count: car.seats }) },
    { l: t('car.transmission'), v: car.transmissionLabel },
    { l: t('car.category'), v: car.categoryLabel },
    { l: t('car.year'), v: String(car.year) },
    { l: t('car.availability'), v: car.available ? t('common.available') : t('common.unavailable'), accent: true },
  ]
  const compareWith = () => {
    const other = ids.find((x) => x !== car.id)
    setCompare(other ? [car.id, other] : [car.id])
    navigate('/compare')
  }
  const financeUrl = `/finance/calculator?car=${car.id}`

  return (
    <>
      {/* Identity */}
      <section className="bg-ink">
        <div className="container-x pt-6 pb-7">
          <p className="text-small text-silver">
            <Link to="/" className="hover:text-white">{t('nav.home')}</Link>&nbsp; / &nbsp;<Link to="/cars" className="hover:text-white">{t('nav.cars')}</Link>&nbsp; / &nbsp;{car.model}
          </p>
          <p className="mt-[30px] text-lead text-gold">
            {car.brand} · {car.year}
          </p>
          <h1 className="mt-2.5 text-[40px] leading-[52px] font-extrabold text-white md:text-display md:leading-[76px]">{car.model}</h1>
        </div>
      </section>

      {/* Gallery + ownership */}
      <section className="bg-ink pt-4 pb-8">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[368px_1fr]">
            <div>
              <div className="relative h-[280px] overflow-hidden rounded-2xl bg-sand sm:h-[440px]" dir="ltr">
                <p className="absolute top-[22px] left-6 text-[40px] leading-[52px] font-extrabold text-bronze sm:text-display">{car.series}</p>
                <img src={car.gallery[active] ?? car.image} alt={fullName} className={`absolute inset-x-3 bottom-3 mx-auto ${car.gallery[active]?.endsWith('.jpg') ? 'inset-0 size-full object-cover' : 'h-[75%] object-contain'}`} />
              </div>
              <div className="mt-[26px] grid grid-cols-4 gap-3 lg:gap-[35px]">
                {car.gallery.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`h-[60px] overflow-hidden rounded-lg sm:h-[98px] ${g.endsWith('.png') ? 'bg-sand' : ''} ${i === active ? 'border-2 border-gold' : 'border-2 border-transparent opacity-80 hover:opacity-100'}`}
                  >
                    <img src={g} alt="" className={`size-full ${g.endsWith('.png') ? 'object-contain' : 'object-cover'}`} />
                  </button>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl bg-ink-2 p-6 lg:order-first lg:self-start">
              <h2 className="text-body font-bold text-gold">{t('car.ownership')}</h2>
              <p className="mt-6 text-small text-silver">{t('common.cash')}</p>
              <p className="mt-[7px] text-h1 font-extrabold text-white">{num(car.cashPrice)}</p>
              <p className="text-small text-silver">{t('common.currencyLong')}</p>
              <div className="mt-4 h-px bg-silver" />
              <p className="mt-[21px] text-small text-silver">{t('car.estimatedMonthly')}</p>
              <p className="mt-1.5 text-h1 font-extrabold text-gold">{num(monthly)}</p>
              <p className="mt-1 text-small text-silver">{t('common.perMonth')}</p>
              <div className="mt-4 flex gap-4">
                <span className="flex h-8 w-[104px] items-center justify-center rounded bg-ink text-tiny font-medium text-silver">{t('common.monthsLong', { count: months })}</span>
                <span className="flex h-8 flex-1 items-center justify-center rounded bg-ink text-tiny font-medium text-silver">{t('car.rate')}</span>
              </div>
              <Button to={financeUrl} className="mt-[25px] h-[52px] w-full">{t('car.applyNow')}</Button>
              <Button to={`/contact?topic=booking&car=${car.id}`} className="mt-3 h-[46px] w-full border border-silver bg-transparent text-white hover:bg-white/5">{t('car.reserve')}</Button>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <a href={SITE.whatsappHref} target="_blank" rel="noreferrer" className="flex h-[38px] items-center justify-center gap-2 rounded-lg bg-whatsapp text-small text-white">
                  <Icon name="whatsapp" size={22} />
                  {t('car.whatsapp')}
                </a>
                <a href={SITE.phoneHref} className="flex h-[38px] items-center justify-center gap-2 rounded-lg bg-ink text-small text-white">
                  <Icon name="phone" size={16} />
                  {t('car.call')}
                </a>
              </div>
            </aside>
          </div>
          <p className="mt-10 text-tiny font-medium text-silver">{t('car.disclaimer')}</p>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-cream">
        <div className="container-x">
          <div className="grid grid-cols-2 gap-y-6 border-b border-line py-6 md:grid-cols-4 md:py-[25px]">
            {highlights.map((h, i) => (
              <div key={i} className={`px-5 ${i ? 'md:border-s md:border-line' : ''}`}>
                <p className="text-small text-muted">{h.l}</p>
                <p className="mt-2 text-h3 font-bold"><bdi>{h.v}</bdi></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-cream py-12">
        <div className="container-x grid gap-10 lg:grid-cols-[448px_1fr] lg:gap-16">
          <div>
            <h2 className="text-h2 font-bold whitespace-pre-line">{t('car.overviewTitle')}</h2>
            <p className="mt-[26px] text-lead text-muted">{car.description ?? t('home.subtitle')}</p>
            <button onClick={compareWith} className="mt-6 flex h-[52px] w-full items-center justify-between rounded-lg border border-line px-[18px] ps-6 text-body font-bold hover:bg-sand/60">
              {t('car.compareWith')}
              <Icon name="compare" size={24} />
            </button>
            <p className="mt-4 text-small text-muted">{t('car.chooseCompare')}</p>
          </div>
          <img src={car.gallery.find((g) => g.endsWith('.jpg')) ?? car.image} alt="" className="h-[320px] w-full rounded-2xl bg-sand object-cover" />
        </div>
      </section>

      {/* Technical specs */}
      <section className="bg-white pt-10 pb-[68px]">
        <div className="container-x">
          <h2 className="text-h2 font-bold">{t('car.specsTitle')}</h2>
          <div className="mt-[42px] grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {specs.map((s, i) => (
              <div key={i} className="rounded-lg border border-line bg-cream px-6 pt-5 pb-6">
                <p className="text-small text-muted">{s.l}</p>
                <p className={`mt-2.5 text-h3 font-bold ${s.accent ? 'text-bronze' : ''}`}><bdi>{s.v}</bdi></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      {car.features && car.features.length > 0 && (
        <section className="bg-cream pt-8 pb-10">
          <div className="container-x">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <h2 className="text-h2 font-bold">{t('car.featuresTitle')}</h2>
              <p className="text-small text-muted">{t('car.featuresSubtitle')}</p>
            </div>
            <div className="mt-[26px] grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {car.features.map((f, i) => (
                <div key={i} className="flex h-24 items-start justify-between gap-4 rounded-lg border border-line bg-white px-5 pt-6">
                  <p className="text-body font-bold">{f}</p>
                  <span className="text-tiny font-medium text-bronze">{String(i + 1).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ownership options */}
      <section className="bg-sand pt-9 pb-9">
        <div className="container-x">
          <h2 className="text-h2 font-bold">{t('car.planTitle')}</h2>
          <div className="mt-[22px] flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-small text-muted">{t('car.duration')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {DURATIONS.map((m) => (
                  <button key={m} onClick={() => setMonths(m)} className={`h-9 w-[62px] rounded-lg text-body font-bold transition ${m === months ? 'bg-ink text-white' : 'bg-cream text-ink hover:bg-white'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-5">
              <Button to="/contact" variant="outline-bronze" className="h-[52px] w-[202px]">{t('common.contactTeam')}</Button>
              <Button to={financeUrl} variant="dark" className="h-[52px] w-[210px]">{t('common.calculator')}</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Similar */}
      <section className="bg-cream pt-10 pb-8">
        <div className="container-x">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-h2 font-bold">{t('car.similarTitle')}</h2>
            <Button to="/cars" variant="outline" className="h-12 w-[176px]">{t('common.allCars')}</Button>
          </div>
          <div className="mt-[30px] grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-[43px]">
            {(similar ?? []).map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
          <p className="mt-[18px] text-small text-muted">{t('car.similarHint')}</p>
        </div>
      </section>
    </>
  )
}
