import type { ReactNode } from 'react'

/** Wide call-to-action box (sand or dark) used at the bottom of several pages. */
export default function CtaBox({ title, text, actions, dark }: { title: string; text: string; actions: ReactNode; dark?: boolean }) {
  return (
    <div className={`flex flex-col gap-6 rounded-lg px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8 ${dark ? 'bg-ink' : 'bg-sand'}`}>
      <div>
        <h2 className={`text-h3 font-bold ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
        <p className={`mt-3 text-lead ${dark ? 'text-silver' : 'text-muted'}`}>{text}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-6 md:gap-11">{actions}</div>
    </div>
  )
}
