import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Horizontal scroll-snap carousel with the "01 — 05" counter and progress bar from the design.
 */
export default function Carousel({ children, count, bleed = false }: { children: ReactNode; count: number; bleed?: boolean }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

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

  const pad = (n: number) => String(n).padStart(2, '0')
  const segment = 0.2

  return (
    <div>
      <div
        ref={ref}
        className={`no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1 xl:gap-[43px] ${bleed ? '-me-4 pe-4 md:-me-8 md:pe-8 xl:-me-16 xl:pe-16' : ''}`}
      >
        {children}
      </div>
      <div className="mt-9 flex items-center justify-between gap-8">
        <p className="text-small text-muted">{t('common.discoverMore')}</p>
        <div className="relative hidden h-0.5 max-w-[520px] flex-1 bg-line sm:block">
          <div
            className="absolute top-0 h-0.5 bg-bronze transition-[inset-inline-start] duration-150"
            style={{ width: `${segment * 100}%`, insetInlineStart: `${progress * (1 - segment) * 100}%` }}
          />
        </div>
        <p className="w-[140px] text-end text-small text-bronze">
          <span dir="ltr">
            {pad(1)} — {pad(count)}
          </span>
        </p>
      </div>
    </div>
  )
}
