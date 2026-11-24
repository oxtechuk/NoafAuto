import { useTranslation } from 'react-i18next'
import type { Offer } from '@/types'
import { useCountdown } from '@/hooks/useCountdown'
import Button from '@/components/ui/Button'

export default function OfferCard({ offer }: { offer: Offer }) {
  const { t } = useTranslation()
  const time = useCountdown(offer.endsAt)
  const units = [
    { v: time.days, l: t('offers.days') },
    { v: time.hours, l: t('offers.hours') },
    { v: time.minutes, l: t('offers.minutes') },
  ]
  return (
    <article className="flex flex-col overflow-hidden rounded-[19px] border border-line bg-ink">
      <div className="relative h-[226px] overflow-hidden">
        <img src={offer.image} alt={offer.title} loading="lazy" className="size-full object-fill" />
        <div className="absolute inset-0 bg-ink/15" />
        <span className="absolute end-[17px] top-[14px] rounded-full bg-sand px-3.5 py-1 text-[13px] leading-5 font-medium text-ink">{offer.tagLabel}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[19px] leading-7 font-bold text-white">{offer.title}</h3>
        <p className="mt-1 text-[16.5px] leading-6 text-silver">{offer.benefit}</p>
        <div className="mt-[19px] grid grid-cols-3 gap-[9px]">
          {units.map((u) => (
            <div key={u.l} className="flex flex-col items-center rounded-[14px] border border-ink-2 bg-ink-2 py-2.5">
              <span className="text-[16.5px] leading-6 font-bold text-gold">{u.v}</span>
              <span className="text-[10.5px] leading-4 font-medium text-silver">{u.l}</span>
            </div>
          ))}
        </div>
        <Button to="/contact" className="mt-[19px] h-12 rounded-[19px] text-[16.5px]">
          {t('offers.claim')}
        </Button>
      </div>
    </article>
  )
}
