import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '@/components/ui/Icon'

/** Dark intro band of the multi-step flows (finance calculator / custom request). */
export function WizardHero({ eyebrow, title, subtitle, ctxLabel, ctxValue }: { eyebrow: string; title: string; subtitle: string; ctxLabel: string; ctxValue: string }) {
  return (
    <section className="bg-ink">
      <div className="container-x flex flex-col gap-6 pt-6 pb-7 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-tiny font-medium text-gold">{eyebrow}</p>
          <h1 className="mt-3 text-[30px] leading-[42px] font-extrabold text-white md:text-h1 md:leading-[56px]">{title}</h1>
          <p className="mt-2 text-small text-silver">{subtitle}</p>
        </div>
        <div className="w-full shrink-0 rounded-lg bg-ink-2 px-4 py-[9px] md:mt-6 md:w-[272px]">
          <p className="text-tiny font-medium text-silver">{ctxLabel}</p>
          <p className="text-body font-bold text-gold">{ctxValue}</p>
        </div>
      </div>
    </section>
  )
}

/** White progress band with 3 steps (current step = `current`, 4 = all done). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const { t } = useTranslation()
  return (
    <section className="bg-white">
      <div className="container-x">
        <ol className="grid grid-cols-3 gap-2 py-4 md:gap-8 md:py-7">
          {steps.map((s, i) => {
            const n = i + 1
            const done = n < current
            const active = n === current
            return (
              <li key={s} className="flex items-center gap-3 md:gap-[18px]">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-body font-bold ${done || active ? 'bg-ink text-gold' : 'bg-sand text-muted'}`}>
                  {done ? <Icon name="check" size={20} strokeWidth={2} className="text-gold" /> : n}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-small font-bold md:text-body ${done || active ? 'text-ink' : 'text-muted'}`}>{s}</span>
                  <span className="block text-tiny font-medium text-muted">{done ? t('wizard.completed') : active ? t('wizard.youAreHere') : t('wizard.nextStep')}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export function WizardShell({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <section className="bg-cream pt-6 pb-10">
      <div className="container-x grid items-start gap-8 lg:grid-cols-[1fr_352px]">
        <div className="rounded-lg bg-white px-5 pt-6 pb-7 md:px-8">{main}</div>
        <aside className="flex flex-col gap-6">{aside}</aside>
      </div>
    </section>
  )
}

export function HelpCard() {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg bg-sand px-6 pt-[22px] pb-12">
      <p className="text-body font-bold">{t('wizard.helpTitle')}</p>
      <Link to="/contact" className="mt-3.5 inline-block text-small text-bronze hover:underline">{t('wizard.helpAction')}</Link>
    </div>
  )
}

export function StepHeader({ step, title, text, note }: { step: number; title: string; text: string; note?: string }) {
  const { t } = useTranslation()
  return (
    <>
      <p className="text-tiny font-medium text-bronze">{t('wizard.stepOf', { n: step })}</p>
      <h2 className="mt-1.5 text-h3 font-bold">{title}</h2>
      <p className="mt-2 text-small text-muted">{text}</p>
      {note && <p className="mt-1.5 text-tiny font-medium text-bronze">{note}</p>}
    </>
  )
}

/** Confirmation card body shared by both flows (step 4). */
export function Confirmation({ eyebrow, title, text, clarification, steps, actions }: { eyebrow: string; title: string; text: string; clarification: string; steps: { title: string; text: string }[]; actions: ReactNode }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="flex size-20 items-center justify-center rounded-full bg-sand text-bronze">
        <Icon name="check" size={40} strokeWidth={2} />
      </span>
      <p className="mt-5 text-tiny font-medium text-bronze">{eyebrow}</p>
      <h2 className="mt-2.5 text-[28px] leading-[38px] font-bold md:text-h2 md:leading-[46px]">{title}</h2>
      <p className="mt-3.5 text-lead whitespace-pre-line text-muted">{text}</p>
      <p className="mt-[34px] rounded-lg bg-sand px-4 py-3.5 text-small whitespace-pre-line text-bronze">{clarification}</p>
      <p className="mt-7 text-body font-bold">{t('wizard.whatNow')}</p>
      <ol className="mt-[19px] flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cream text-tiny font-medium text-bronze">{i + 1}</span>
            <span>
              <span className="block text-body font-bold">{s.title}</span>
              <span className="block text-tiny font-medium text-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-[35px] grid gap-4 sm:grid-cols-[1fr_200px] sm:gap-6">{actions}</div>
    </>
  )
}

/** Dark aside card container */
export function DarkAside({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-ink px-6 pt-7 pb-[30px] text-white">{children}</div>
}

export function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-small text-silver">{label}</span>
      <span className={`text-body font-bold ${accent ? 'text-gold' : 'text-white'}`}>{value}</span>
    </div>
  )
}
