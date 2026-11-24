import type { ReactNode } from 'react'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  /** element shown on the opposite side (end) */
  aside?: ReactNode
  dark?: boolean
  className?: string
}

/** Section title block: eyebrow (12px bronze) + 34px title + 14px subtitle, with an optional aside on the end side. */
export default function SectionHeading({ eyebrow, title, subtitle, aside, dark, className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className={`mb-2 text-tiny font-medium ${dark ? 'text-gold' : 'text-bronze'}`}>{eyebrow}</p>}
        <h2 className={`text-[28px] leading-[38px] font-bold md:text-h2 md:leading-[46px] ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
        {subtitle && <p className={`mt-1 text-small ${dark ? 'text-silver' : 'text-muted'}`}>{subtitle}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}
