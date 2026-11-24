import { useTranslation } from 'react-i18next'
import Icon from '@/components/ui/Icon'

type Props = {
  page: number
  last: number
  onChange: (p: number) => void
  /** 'compact' = white squares with arrows (cars); 'labeled' = prev/next buttons (blog) */
  variant?: 'compact' | 'labeled'
}

function pages(page: number, last: number): (number | '…')[] {
  if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1)
  const set = new Set([1, 2, 3, page, last].filter((p) => p >= 1 && p <= last))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i && p - (sorted[i - 1] as number) > 1) out.push('…')
    out.push(p)
  })
  return out
}

export default function Pagination({ page, last, onChange, variant = 'compact' }: Props) {
  const { t } = useTranslation()
  const go = (p: number) => p >= 1 && p <= last && p !== page && onChange(p)
  const sq = variant === 'compact' ? 'size-11 bg-white' : 'size-12 border border-line'

  const numbers = (
    <div className="flex items-center gap-2 md:gap-4">
      {pages(page, last).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className={`flex items-center justify-center rounded-lg text-body font-bold text-muted ${sq}`}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`rounded-lg text-body font-bold transition ${p === page ? 'border-ink bg-ink text-white' : `${sq} ${variant === 'compact' ? 'text-muted' : 'text-ink'} hover:bg-sand`} ${p === page ? (variant === 'compact' ? 'size-11' : 'size-12') : ''}`}
          >
            {p}
          </button>
        ),
      )}
    </div>
  )

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => go(page - 1)} className="flex size-11 items-center justify-center rounded-lg bg-white text-ink" aria-label={t('common.prev')}>
          <Icon name="chevron-left" size={18} className="flip-rtl" />
        </button>
        {numbers}
        <button onClick={() => go(page + 1)} className="flex size-11 items-center justify-center rounded-lg bg-white text-ink" aria-label={t('common.next')}>
          <Icon name="chevron-right" size={18} className="flip-rtl" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <button onClick={() => go(page - 1)} className="flex h-12 w-[136px] items-center justify-center gap-3 rounded-lg border border-line text-body font-bold text-muted hover:bg-sand">
        <Icon name="chevron-left" size={18} className="flip-rtl" />
        {t('common.prev')}
      </button>
      <div className="hidden sm:block">{numbers}</div>
      <button onClick={() => go(page + 1)} className="flex h-12 w-[136px] items-center justify-center gap-3 rounded-lg bg-ink text-body font-bold text-white hover:bg-[#2f3333]">
        {t('common.next')}
        <Icon name="chevron-right" size={18} className="flip-rtl" />
      </button>
    </div>
  )
}
