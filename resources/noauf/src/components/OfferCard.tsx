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
        <img src={offer.image} alt={offer.title} loading="lazy" className="size-full object-cover" />
        <div className="absolute inset-0 bg-ink/15" />
        <div className="absolute end-[17px] top-[14px] flex items-center gap-2">
          {offer.discountPercent ? (
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[12px] font-bold text-white">
              %{offer.discountPercent}
            </span>
          ) : null}
          <span className="rounded-full bg-sand px-3.5 py-1 text-[13px] leading-5 font-medium text-ink">{offer.tagLabel}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[19px] leading-7 font-bold text-white">{offer.title}</h3>
        <p className="mt-1 text-[16.5px] leading-6 text-silver">{offer.benefit}</p>
        {(offer.specialPrice || offer.specialInstallment) ? (
          <div className="mt-3 flex items-center justify-between border-t border-ink-2/60 pt-2.5 text-[13px] text-silver">
            {offer.specialPrice ? (
              <span>{offer.specialPrice.toLocaleString()} {t('common.sar')}</span>
            ) : <span />}
            {offer.specialInstallment ? (
              <span className="font-semibold text-gold">{offer.specialInstallment.toLocaleString()} {t('common.sar')}/{t('common.month', { defaultValue: 'شهر' })}</span>
            ) : null}
          </div>
        ) : null}
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
