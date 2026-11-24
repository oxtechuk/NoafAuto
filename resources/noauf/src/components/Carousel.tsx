import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './ui/Icon'

/**
 * Horizontal scroll-snap carousel with auto-play, navigation arrows, "01 — 05" counter and progress bar.
 */
export default function Carousel({ children, count, bleed = false }: { children: ReactNode; count: number; bleed?: boolean }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth
      setProgress(max > 0 ? Math.abs(el.scrollLeft) / max : 0)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Auto-scroll cars carousel smoothly every 4s
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      const el = ref.current
      if (!el) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 5) return

      const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl'
      const cardStep = 370
      const currentScroll = Math.abs(el.scrollLeft)

      if (currentScroll >= max - 20) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: isRTL ? -cardStep : cardStep, behavior: 'smooth' })
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [isPaused])

  const scrollNext = () => {
    const el = ref.current
    if (!el) return
    const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl'
    el.scrollBy({ left: isRTL ? -370 : 370, behavior: 'smooth' })
  }

  const scrollPrev = () => {
    const el = ref.current
    if (!el) return
    const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl'
    el.scrollBy({ left: isRTL ? 370 : -370, behavior: 'smooth' })
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const segment = 0.2

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3500)}
    >
      <div
        ref={ref}
        className={`no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1 scroll-smooth xl:gap-[43px] ${bleed ? '-me-4 pe-4 md:-me-8 md:pe-8 xl:-me-16 xl:pe-16' : ''}`}
      >
        {children}
      </div>
      <div className="mt-9 flex items-center justify-between gap-4 sm:gap-8">
        <p className="text-small text-muted">{t('common.discoverMore')}</p>
        <div className="relative hidden h-0.5 max-w-[520px] flex-1 bg-line sm:block">
          <div
            className="absolute top-0 h-0.5 bg-bronze transition-[inset-inline-start] duration-150"
            style={{ width: `${segment * 100}%`, insetInlineStart: `${progress * (1 - segment) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Previous"
            className="flex size-9 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-gold hover:bg-sand active:scale-95"
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next"
            className="flex size-9 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-gold hover:bg-sand active:scale-95"
          >
            <Icon name="chevron-right" size={18} />
          </button>
          <p className="w-[80px] sm:w-[120px] text-end text-small text-bronze">
            <span dir="ltr">
              {pad(1)} — {pad(count)}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
