import { useState } from 'react'
import { asset } from '@/lib/asset'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import CtaBox from '@/components/CtaBox'
import { useApi } from '@/hooks/useApi'
import { getPartners, getTestimonials } from '@/services/content'
import { LogoGridSkeleton, TestimonialSkeleton } from '@/components/skeletons/PageSkeletons'
import { ugcStories } from '@/data/content'

type Metric = { value: string; label: string; context?: string }
type Item = { title: string; text: string }

export default function About() {
  const { t } = useTranslation()
  const metrics = t('about.metrics', { returnObjects: true }) as Metric[]
  const purpose = t('about.purpose', { returnObjects: true }) as Item[]
  const reviewMetrics = t('about.reviewMetrics', { returnObjects: true }) as Metric[]
  const journey = t('about.journey', { returnObjects: true }) as Item[]
  const { data: partners, loading: partnersLoading } = useApi(getPartners)
  const { data: testimonials, loading: testimonialsLoading } = useApi(getTestimonials)

  return (
    <>
      {/* Brand story hero */}
      <section className="bg-ink">
        <div className="container-x grid gap-10 pt-8 pb-16 lg:grid-cols-[1fr_584px] lg:gap-28">
          <div>
            <p className="text-small text-silver">
              <Link to="/" className="hover:text-white">{t('nav.home')}</Link>&nbsp;&nbsp; / &nbsp;&nbsp;{t('about.breadcrumb')}
            </p>
            <h1 className="mt-[34px] text-[40px] leading-[52px] font-extrabold whitespace-pre-line text-white md:text-display md:leading-[76px]">{t('about.title')}</h1>
            <p className="mt-6 max-w-[616px] text-lead text-silver">{t('about.subtitle')}</p>
            <div className="mt-[35px] flex flex-wrap gap-6">
              <Button to="/finance/calculator" className="h-12 w-[200px]">{t('common.applyFinance')}</Button>
              <Button to="/contact" className="h-12 w-[152px] bg-ink-2 text-white hover:bg-[#45464a]">{t('common.contactUs')}</Button>
            </div>
          </div>
          <figure className="overflow-hidden rounded-lg lg:mt-8">
            <img src={asset('/images/finance/cover.png')} alt="" className="h-[300px] w-full object-cover" />
            <figcaption className="flex h-[52px] items-center bg-ink-2 px-6 text-small text-gold">{t('about.photoCaption')}</figcaption>
          </figure>
        </div>
      </section>

      {/* Trust in numbers */}
      <section className="bg-cream py-6">
        <div className="container-x grid grid-cols-2 gap-y-8 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <div key={i} className={`text-center ${i ? 'lg:border-s lg:border-line' : ''}`}>
              <p className="text-h1 font-extrabold"><bdi dir="ltr">{m.value}</bdi></p>
              <p className="mt-0.5 text-body font-bold text-bronze">{m.label}</p>
              <p className="mt-[5px] text-tiny font-medium text-muted">{m.context}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision, mission and values */}
      <section className="bg-cream pt-8 pb-12">
        <div className="container-x">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h2 className="text-h2 font-bold">{t('about.purposeTitle')}</h2>
            <p className="text-small text-bronze">{t('about.purposeEyebrow')}</p>
          </div>
          <div className="mt-8 grid gap-6 md:mt-[34px] md:grid-cols-3">
            {purpose.map((p, i) => (
              <div key={i} className={`min-h-[240px] rounded-lg px-6 pt-7 ${i === 1 ? 'bg-sand' : 'bg-white'}`}>
                <p className="text-end text-tiny font-medium text-bronze">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 text-h3 font-bold">{p.title}</h3>
                <p className="mt-[22px] text-lead text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-white pt-[26px] pb-[34px]">
        <div className="container-x">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <h2 className="text-h3 font-bold">{t('about.partnersTitle')}</h2>
            <p className="text-small text-muted">{t('about.partnersContext')}</p>
          </div>
          <div className="mt-[26px] grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-6">
            {!partners && partnersLoading && <LogoGridSkeleton />}
            {(partners ?? []).map((p) => (
              <div key={p.id} className="flex h-[100px] items-center justify-center rounded-lg border border-line bg-white px-5">
                <img src={p.logo} alt={p.name} loading="lazy" className="max-h-[84px] max-w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <CustomerStories />

      {/* Testimonials */}
      <section className="bg-cream pt-7 pb-8">
        <div className="container-x">
          <h2 className="text-h2 font-bold">{t('about.testimonialsTitle')}</h2>
          <p className="mt-2 text-lead text-muted">{t('about.testimonialsIntro')}</p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {!testimonials && testimonialsLoading && <TestimonialSkeleton />}
            {(testimonials ?? []).map((r, i) => (
              <figure key={r.id} className={`flex min-h-[304px] flex-col rounded-lg px-6 pt-5 pb-7 ${i === 1 ? 'bg-sand' : 'bg-white'}`}>
                <p className="text-body font-bold text-bronze" aria-label={`${r.rating}/5`}>{'★'.repeat(r.rating)}</p>
                <blockquote className="mt-5 text-lead">{r.quote}</blockquote>
                <figcaption className="mt-auto flex items-center gap-6 pt-6">
                  <img src={r.avatar} alt="" className="size-10 rounded-full object-cover" />
                  <div>
                    <p className="text-body font-bold">{r.name}</p>
                    <p className="mt-1 text-tiny font-medium text-muted">{r.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-[38px] grid grid-cols-2 gap-y-6 lg:grid-cols-4">
            {reviewMetrics.map((m, i) => (
              <div key={i} className={`text-center ${i ? 'lg:border-s lg:border-line' : ''}`}>
                <p className="text-h3 font-bold text-bronze"><bdi dir="ltr">{m.value}</bdi></p>
                <p className="mt-2 text-small text-muted">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="bg-sand pt-[26px] pb-[38px]">
        <div className="container-x">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <h2 className="text-h2 font-bold">{t('about.journeyTitle')}</h2>
            <p className="text-small text-bronze">{t('about.journeyContext')}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map((s, i) => (
              <div key={i} className="min-h-[150px] rounded-lg bg-white px-5 pt-[18px] pb-5">
                <p className="text-end text-tiny font-medium text-bronze">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2.5 text-body font-bold">{s.title}</h3>
                <p className="mt-[15px] text-small text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream py-4 pb-8">
        <div className="container-x">
          <CtaBox
            dark
            title={t('about.ctaTitle')}
            text={t('about.ctaText')}
            actions={
              <>
                <Link to="/contact" className="text-body font-bold text-white hover:underline">{t('common.contactUs')}</Link>
                <Button to="/finance/calculator" className="h-12 w-[190px]">{t('common.applyFinance')}</Button>
              </>
            }
          />
        </div>
      </section>
    </>
  )
}

/** Dark UGC section: featured reel + 3 smaller reels with play buttons. */
function CustomerStories() {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  const order = [0, 1, 2, 3]

  return (
    <section className="bg-ink py-[72px]">
      <div className="container-x grid gap-10 lg:grid-cols-[344px_1fr] lg:gap-0">
        <div className="lg:border-e lg:border-ink-2 lg:pe-4 lg:pt-10">
          <p className="text-body font-bold text-gold">{t('about.ugcEyebrow')}</p>
          <h2 className="mt-6 text-h1 font-extrabold whitespace-pre-line text-white">{t('about.ugcTitle')}</h2>
          <p className="mt-[22px] text-lead whitespace-pre-line text-silver">{t('about.ugcIntro')}</p>
          <button onClick={() => setActive(0)} className="mt-11 flex h-[52px] w-[216px] items-center justify-center gap-6 rounded-2xl bg-gold text-body font-bold text-ink">
            {t('about.ugcAction')}
            <Icon name="play" size={18} className="order-first" />
          </button>
          <p className="mt-7 text-small text-silver">{t('about.ugcClosing')}</p>
        </div>

        <div className="lg:ps-4">
          <p className="text-small text-silver">{t('about.ugcCollection')}</p>
          <div className="no-scrollbar mt-1 flex items-end gap-4 overflow-x-auto pb-2">
            {order.map((i) => {
              const story = ugcStories[i]
              const featured = i === active
              return (
                <button
                  key={story.id}
                  onClick={() => setActive(i)}
                  className={`relative shrink-0 overflow-hidden rounded-2xl bg-ink-2 text-start transition-all ${featured ? 'h-[456px] w-[288px] border-2 border-gold' : 'h-[344px] w-[200px] border border-ink-2'}`}
                >
                  <img src={story.image} alt="" className={`w-full object-cover ${featured ? 'h-[384px]' : 'h-[290px]'}`} />
                  <span className="absolute start-3.5 top-3.5 flex h-7 w-9 items-center justify-center rounded-2xl bg-ink text-tiny font-medium text-gold">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full ${featured ? 'top-40 size-16 bg-gold text-ink' : 'top-[121px] size-12 bg-cream text-ink'}`}>
                    <Icon name="play" size={featured ? 22 : 18} />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 flex flex-col justify-center bg-ink-2 px-5" style={{ height: featured ? 72 : 54 }}>
                    {featured && <span className="text-tiny font-medium text-gold">{t('about.ugcFeatured')}</span>}
                    <span className="text-body font-bold text-white">{featured ? t('about.ugcWatch') : t('about.ugcStory', { n: String(i + 1).padStart(2, '0') })}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {order.map((i) => (
                <span key={i} className={`h-[3px] w-[66px] rounded-2xl ${i === active ? 'bg-gold' : 'bg-ink-2'}`} />
              ))}
            </div>
            <p className="text-tiny font-medium text-silver">{t('about.ugcHint')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
