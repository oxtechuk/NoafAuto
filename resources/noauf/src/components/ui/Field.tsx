import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import Icon from './Icon'

export function Label({ children, htmlFor, className = '' }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`mb-2 block text-body font-bold text-ink ${className}`}>
      {children}
    </label>
  )
}

const box = 'h-[52px] w-full rounded-lg border border-line bg-cream px-4 text-body text-ink outline-none transition placeholder:text-small placeholder:font-normal placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/30'

export function Input({ className = '', invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`${box} font-bold ${invalid ? 'border-red-400' : ''} ${className}`} {...rest} />
}

/** Input with a trailing unit (e.g. "ر.س") */
export function UnitInput({ unit, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <div className={`relative ${className}`}>
      <input className={`${box} pe-14 font-bold`} inputMode="numeric" {...rest} />
      <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-small text-muted">{unit}</span>
    </div>
  )
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select className={`${box} appearance-none border-transparent pe-10 text-small`} {...rest}>
        {children}
      </select>
      <Icon name="chevron-down" size={18} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink" />
    </div>
  )
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full resize-y rounded-lg border border-line bg-cream px-4 py-3 text-small text-ink outline-none transition placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/30 ${className}`}
      {...rest}
    />
  )
}

export function Checkbox({ checked, onChange, children, className = '' }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-5 ${className}`}>
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border transition ${checked ? 'border-ink bg-ink text-gold' : 'border-line bg-white'}`}
      >
        {checked && <Icon name="check" size={16} strokeWidth={2.5} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-small text-ink">{children}</span>
    </label>
  )
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <p className="mt-1 text-tiny text-red-600">{children}</p>
}
