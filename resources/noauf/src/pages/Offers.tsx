import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Offer, OfferTag } from '@/types'
import Button from '@/components/ui/Button'
import OfferCard from '@/components/OfferCard'
import CtaBox from '@/components/CtaBox'
import { FeaturedOfferSkeleton, OfferGridSkeleton } from '@/components/skeletons/PageSkeletons'
import { useApi } from '@/hooks/useApi'
import { useCountdown } from '@/hooks/useCountdown'
import { getOffers } from '@/services/content'

const TAGS: (OfferTag | 'all')[] = ['all', 'popular', 'exclusive', 'new', 'limited']

export default function Offers() {
  const { t } = useTranslation()
  const [tag, setTag] = useState<OfferTag | 'all'>('all')
  const { data, loading } = useApi(() => getOffers(tag), [tag])
  const tagLabel = (x: OfferTag | 'all') => (x === 'all' ? t('common.all') : t(`offerTags.${x}`))

  return (
    <>
      <section className="bg-cream">
        <div className="container-x pt-6 pb-7">
          <p className="text-small text-muted">
            <Link to="/" className="hover:text-ink">{t('nav.home')}</Link>&nbsp;&nbsp; / &nbsp;&nbsp;{t('offers.breadcrumb')}
          </p>
          <h1 className="mt-6 text-[36px] leading-[48px] font-extrabold md:text-h1 md:leading-[56px]">{t('offers.title')}</h1>
          <p className="mt-3 text-lead text-muted">{t('offers.subtitle')}</p>
        </div>
      </section>

      <section className="bg-cream pb-12">
        <div className="container-x">
          {!data && loading ? <FeaturedOfferSkeleton /> : data?.featured && <FeaturedOffer offer={data.featured} />}
        </div>
      </section>

      <section className="bg-cream pb-9">
        <div className="container-x">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-h2 font-bold">{t('offers.catalogTitle')}</h2>
            <p className="text-small text-muted">{t('offers.count', { count: data?.data.length ?? 0 })}</p>
          </div>
          <div className="no-scrollbar mt-[18px] flex gap-3 overflow-x-auto">
            {TAGS.map((x) => (
              <button
                key={x}
                onClick={() => setTag(x)}
                className={`h-[42px] min-w-[112px] shrink-0 rounded-lg text-body font-bold transition ${tag === x ? 'bg-ink text-white' : 'bg-white text-muted hover:bg-sand'}`}
              >
                {tagLabel(x)}
              </button>
            ))}
          </div>
          {!data && loading ? (
            <OfferGridSkeleton />
          ) : (
            <div className={`mt-8 grid gap-6 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {(data?.data ?? []).map((o) => (
                <OfferCard key={o.id} offer={o} />
              ))}
            </div>
          )}
          {data && data.data.length === 0 && <p className="py-20 text-center text-muted">{t('common.empty')}</p>}
        </div>
      </section>

      <section className="bg-cream pb-8">
        <div className="container-x">
          <div className="flex flex-col gap-2 border-t border-line pt-8 md:flex-row md:items-end md:justify-between">
            <h2 className="text-h3 font-bold">{t('offers.howTitle')}</h2>
            <p className="text-small text-muted">{t('offers.howSubtitle')}</p>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-lg bg-white px-6 pt-5 pb-14">
                <div className="flex items-center gap-11">
                  <span className="text-h2 font-bold text-bronze">{String(n).padStart(2, '0')}</span>
                  <h3 className="text-body font-bold">{t(`offers.how${n}Title`)}</h3>
                </div>
                <p className="mt-9 text-small text-muted">{t(`offers.how${n}Text`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <CtaBox
              title={t('offers.helpTitle')}
              text={t('offers.helpText')}
              actions={
                <>
                  <Link to="/cars" className="text-body font-bold text-bronze hover:underline">{t('common.browseCars')}</Link>
                  <Button to="/contact" variant="dark" className="h-12 w-[190px]">{t('common.contactUs')}</Button>
                </>
              }
            />
          </div>
        </div>
      </section>
    </>
  )
}

function FeaturedOffer({ offer }: { offer: Offer }) {
  const { t } = useTranslation()
  const time = useCountdown(offer.endsAt)
  const units = [
    { v: time.days, l: t('offers.days') },
    { v: time.hours, l: t('offers.hours') },
    { v: time.minutes, l: t('offers.minutes') },
    { v: time.seconds, l: t('offers.seconds') },
  ]
  return (
    <div className="grid overflow-hidden rounded-lg bg-ink lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="flex h-[30px] w-20 items-center justify-center rounded-lg bg-gold text-tiny font-medium text-ink">{offer.tagLabel}</span>
          {offer.discountPercent ? (
            <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-tiny font-bold text-emerald-400">
              {t('common.discount', { defaultValue: 'خصم' })} {offer.discountPercent}%
            </span>
          ) : null}
          <span className="text-small text-silver">{t('offers.featured')}</span>
        </div>
        <h2 className="mt-6 text-h2 font-bold text-white">{offer.title}</h2>
        <p className="mt-3 text-h3 font-bold text-gold">{offer.benefit}</p>
        {(offer.specialPrice || offer.specialInstallment) ? (
          <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-ink-2 pt-4">
            {offer.specialPrice ? (
              <div>
                <span className="block text-tiny text-silver">{t('common.specialPrice', { defaultValue: 'السعر الخاص' })}</span>
                <span className="text-body font-bold text-white">{offer.specialPrice.toLocaleString()} {t('common.sar')}</span>
              </div>
            ) : null}
            {offer.specialInstallment ? (
              <div>
                <span className="block text-tiny text-silver">{t('common.monthlyInstallment', { defaultValue: 'القسط الشهري' })}</span>
                <span className="text-body font-bold text-gold">{offer.specialInstallment.toLocaleString()} {t('common.sar')} / {t('common.month', { defaultValue: 'شهر' })}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="mt-7 text-small text-silver">{t('offers.endsIn')}</p>
        <div className="mt-2.5 flex gap-3">
          {units.map((u) => (
            <div key={u.l} className="flex h-[72px] w-[84px] flex-col items-center justify-center rounded-lg bg-ink-2">
              <span className="text-h3 font-bold text-white">{u.v}</span>
              <span className="text-tiny font-medium text-silver">{u.l}</span>
            </div>
          ))}
        </div>
        <div className="mt-[26px] flex flex-wrap items-center gap-10">
          <Button to="/contact" className="h-12 w-[200px]">{t('offers.view')}</Button>
          <span className="text-small text-silver">{t('offers.endingSoon')}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <img src={offer.image} alt={offer.title} className="h-[260px] w-full flex-1 object-cover lg:h-[368px]" />
        <p className="flex h-12 items-center justify-center bg-sand text-small text-bronze">{t('offers.artworkCaption')}</p>
      </div>
    </div>
  )
}
