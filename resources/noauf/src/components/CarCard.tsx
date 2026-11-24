import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Car } from '@/types'
import { sar, num } from '@/lib/format'
import { useCompare } from '@/context/CompareContext'

/** "Nawaf / Vehicle card" component from Figma (355×450). */
export default function CarCard({ car, className = '' }: { car: Car; className?: string }) {
  const { t } = useTranslation()
  const { has, toggle } = useCompare()
  const navigate = useNavigate()
  const inCompare = has(car.id)

  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-cream ${className}`}>
      <Link to={`/cars/${car.id}`} className="block px-5 pt-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-small text-muted">
              {car.brand} · {car.year}
            </p>
            <h3 className="mt-1.5 truncate text-h3 font-bold text-ink">{car.model}</h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            {car.isNew && <span className="rounded bg-sand px-3 py-[3px] text-tiny font-medium text-bronze">{t('common.newArrival')}</span>}
            <span className="text-tiny font-medium text-muted">{car.categoryLabel}</span>
          </div>
        </div>
        <div className="-mx-2 mt-1 flex h-[170px] items-center justify-center">
          <img src={car.image} alt={`${car.brand} ${car.model}`} loading="lazy" className="max-h-full max-w-full object-contain" />
        </div>
      </Link>

      <div className="mt-1 flex flex-1 flex-col bg-ink px-5 pt-3 pb-5">
        <p className="text-tiny font-medium text-silver">
          {car.fuelLabel}&nbsp;&nbsp; · &nbsp;&nbsp;{t('common.seats', { count: car.seats })}&nbsp;&nbsp; · &nbsp;&nbsp;{car.transmissionLabel}
        </p>
        <div className="mt-3 h-px bg-ink-2" />
        <div className="mt-2.5 flex items-start justify-between">
          <div>
            <p className="text-tiny font-medium text-silver">{t('common.monthly')}</p>
            <p className="text-h3 font-bold text-gold">{sar(car.monthlyPrice)}</p>
          </div>
          <div className="text-end">
            <p className="text-tiny font-medium text-silver">{t('common.cash')}</p>
            <p className="mt-2.5 text-body font-bold text-white">{sar(car.cashPrice)}</p>
          </div>
        </div>
        <div className="mt-auto flex gap-5 pt-4">
          <button
            onClick={() => navigate(`/finance/calculator?car=${car.id}`)}
            className="h-[46px] flex-1 rounded-lg bg-gold text-body font-bold text-ink transition hover:bg-[#d4c49d]"
          >
            {t('common.requestNow')}
          </button>
          <button
            onClick={() => toggle(car.id)}
            aria-pressed={inCompare}
            title={num(car.cashPrice)}
            className={`h-[46px] flex-1 rounded-lg border text-body font-bold transition ${inCompare ? 'border-gold bg-gold/10 text-gold' : 'border-ink-2 text-gold hover:bg-ink-2/50'}`}
          >
            {inCompare ? t('common.inCompare') : t('common.addToCompare')}
          </button>
        </div>
      </div>
    </article>
  )
}
