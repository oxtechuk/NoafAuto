import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant =
  | 'gold' // champagne fill, dark text
  | 'dark' // ink fill, white text
  | 'outline' // light-bg outline (#dedcd3)
  | 'outline-dark' // dark-bg outline (#3a3b3c)
  | 'outline-bronze' // bronze outline on sand
  | 'soft' // cream fill
  | 'sand' // sand fill
  | 'ghost'

const variants: Record<Variant, string> = {
  gold: 'bg-gold text-ink hover:bg-[#d4c49d]',
  dark: 'bg-ink text-white hover:bg-[#2f3333]',
  outline: 'border border-line text-ink hover:bg-sand/60',
  'outline-dark': 'border border-ink-2 text-white hover:bg-ink-2/50',
  'outline-bronze': 'border border-bronze text-ink hover:bg-bronze/5',
  soft: 'bg-cream text-ink hover:bg-sand',
  sand: 'bg-sand text-ink hover:bg-[#e8e3d6]',
  ghost: 'text-bronze hover:underline',
}

type Props = {
  variant?: Variant
  to?: string
  href?: string
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export default function Button({ variant = 'gold', to, href, className = '', children, ...rest }: Props) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg px-5 text-body font-bold transition-colors disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted ${variants[variant]} ${className}`
  if (to) return <Link to={to} className={cls}>{children}</Link>
  if (href) return <a href={href} className={cls} target="_blank" rel="noreferrer">{children}</a>
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}
