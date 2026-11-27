import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Car } from '@/types'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { Checkbox, FieldError, Input, Label, UnitInput } from '@/components/ui/Field'
import { Confirmation, DarkAside, HelpCard, StepHeader, Stepper, SummaryRow, WizardHero, WizardShell } from '@/components/Wizard'
import { useApi } from '@/hooks/useApi'
import { getCars } from '@/services/cars'
import { saveFinanceLead, submitFinanceRequest } from '@/services/forms'
import { monthlyPayment, num, sar } from '@/lib/format'
import { COLORS, PHONE_RE } from '@/lib/constants'

const DURATIONS = [24, 36, 48, 60, 72, 84]
const DEFAULT_CAR = 'mercedes-s500-4matic'

export default function FinanceCalculator() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { data } = useApi(() => getCars({}))
  const cars = data?.data ?? []

  // ?step=N lets you open a step directly (handy for previews/QA)
  const [step, setStep] = useState(() => Math.min(4, Math.max(1, Number(params.get('step')) || 1)))
  const [busy, setBusy] = useState(false)
  const [leadId, setLeadId] = useState<string>()
  const [lead, setLead] = useState({ name: '', phone: '', city: '', consent: false })
  const [carId, setCarId] = useState(params.get('car') ?? DEFAULT_CAR)
  const [color, setColor] = useState<string>('black')
  const [salary, setSalary] = useState(15000)
  const [obligations, setObligations] = useState(0)
  const [downPct, setDownPct] = useState(20)
  const [months, setMonths] = useState(60)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const car: Car | undefined = cars.find((c) => c.id === carId) ?? cars[0]
  const price = car?.cashPrice ?? 0
  const down = Math.round((price * downPct) / 100)
  const principal = price - down
  const calc = useMemo(() => {
    const m = monthlyPayment(principal, months)
    const total = Math.round(m * months)
    return { monthly: Math.round(m), total, profit: total - principal, grand: total + down }
  }, [principal, months, down])

  const colorName = t(`finance.colors.${color}`)
  const steps = t('finance.steps', { returnObjects: true }) as string[]

  const hero = {
    1: { title: t('finance.title1'), ctxLabel: t('finance.journeyLabel'), ctxValue: t('finance.journeyValue') },
    2: { title: t('finance.title2'), ctxLabel: t('finance.priceLabel'), ctxValue: sar(price) },
    3: { title: t('finance.title2'), ctxLabel: t('finance.priceLabel'), ctxValue: sar(price) },
    4: { title: t('finance.title4'), ctxLabel: t('finance.priceLabel'), ctxValue: sar(price) },
  }[step]!

  const reset = () => {
    setStep(1)
    setLeadId(undefined)
    setLead({ name: '', phone: '', city: '', consent: false })
  }

  return (
    <>
      <WizardHero eyebrow={t('finance.eyebrow')} title={hero.title} subtitle={step === 4 ? t('finance.subtitle4') : t('finance.subtitle')} ctxLabel={hero.ctxLabel} ctxValue={hero.ctxValue} />
      <Stepper steps={steps} current={step} />

      {step === 1 && (
        <StepDetails
          lead={lead}
          setLead={setLead}
          busy={busy}
          onNext={async () => {
            setBusy(true)
            const res = await saveFinanceLead(lead)
            setLeadId(res.id)
            setBusy(false)
            setStep(2)
          }}
        />
      )}

      {step === 2 && car && (
        <WizardShell
          main={
            <>
              <StepHeader step={2} title={t('finance.s2Title')} text={t('finance.s2Text')} />
              <label className="relative mt-6 flex cursor-pointer items-center gap-5 rounded-lg border border-line bg-cream p-4">
                <img src={car.image} alt="" className="h-20 w-[120px] shrink-0 rounded-lg bg-ink object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-h3 font-bold">{car.brand} {car.model}</span>
                  <span className="mt-4 block text-small text-muted">{car.year}&nbsp; · &nbsp;{car.fuelLabel}&nbsp; · &nbsp;{car.transmissionLabel}</span>
                </span>
                <Icon name="chevron-down" size={18} />
                <select value={car.id} onChange={(e) => setCarId(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>{c.brand} {c.model}</option>
                  ))}
                </select>
              </label>
              <div className="mt-5 grid grid-cols-3 gap-4">
                {[
                  [t('car.year'), String(car.year)],
                  [t('car.fuel'), car.fuelLabel],
                  [t('car.transmission'), car.transmissionLabel],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-sand py-2.5 text-center">
                    <p className="text-tiny font-medium text-muted">{l}</p>
                    <p className="mt-1 text-body font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-body font-bold">{t('finance.colorTitle')}</p>
              <div className="mt-4 grid grid-cols-3 gap-y-1.5 sm:grid-cols-5 sm:gap-4">
                {COLORS.map((c) => {
                  const sel = c.id === color
                  return (
                    <button key={c.id} onClick={() => setColor(c.id)} className="flex h-[72px] flex-col items-center gap-2 pt-0.5">
                      <span className={`size-8 rounded-full ${sel ? 'border-[3px] border-gold' : 'border border-line'}`} style={{ background: c.hex }} />
                      <span className={`text-tiny font-medium ${sel ? 'text-bronze' : 'text-muted'}`}>
                        {t(`finance.colors.${c.id}`)}
                        {sel && ` · ${t('finance.selected')}`}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-6 text-small text-muted">{t('finance.colorNote')}</p>
              <div className="mt-[44px] grid gap-4 sm:grid-cols-[1fr_200px] sm:gap-6">
                <Button variant="dark" className="h-[52px]" onClick={() => setStep(3)}>{t('finance.s2Next')}</Button>
                <Button variant="soft" className="h-[52px]" onClick={() => setStep(1)}>{t('finance.s2Back')}</Button>
              </div>
            </>
          }
          aside={
            <>
              <DarkAside>
                <h3 className="text-h3 font-bold">{t('finance.currentChoice')}</h3>
                <img src={car.image} alt="" className="mt-[26px] h-20 w-[120px] rounded-lg bg-ink-2 object-contain" />
                <p className="mt-[22px] text-body font-bold">{car.brand} {car.model}</p>
                <p className="mt-3 text-small text-silver">{car.year} · {car.fuelLabel} · {car.transmissionLabel}</p>
                <div className="mt-[23px] h-px bg-ink-2" />
                <p className="mt-6 text-small text-silver">{t('finance.carPrice')}</p>
                <p className="mt-3 text-h1 font-extrabold text-gold">{num(price)}</p>
                <p className="mt-1 text-small text-silver">{t('common.currencyLong')}</p>
                <p className="mt-[30px] text-body font-bold">{t('finance.chosenColor', { color: colorName })}</p>
                <p className="mt-[18px] text-small text-silver">{t('finance.editHelper')}</p>
                <button onClick={() => setStep(1)} className="mt-2 text-small text-gold hover:underline">{t('finance.editDetails')}</button>
              </DarkAside>
              <HelpCard />
            </>
          }
        />
      )}

      {step === 3 && car && (
        <WizardShell
          main={
            <>
              <StepHeader step={3} title={t('finance.s3Title')} text={t('finance.s3Text')} />
              <p className="mt-1 text-tiny font-medium text-muted">
                {car.brand} {car.model}&nbsp; · &nbsp;{colorName}
              </p>
              <div className="mt-1.5 grid gap-6 sm:grid-cols-2 sm:gap-8">
                <div>
                  <Label>{t('finance.salary')}</Label>
                  <UnitInput unit={t('common.currency')} value={num(salary)} onChange={(e) => setSalary(Number(e.target.value.replace(/\D/g, '')) || 0)} />
                </div>
                <div>
                  <Label>{t('finance.obligations')}</Label>
                  <UnitInput unit={t('common.currency')} value={num(obligations)} onChange={(e) => setObligations(Number(e.target.value.replace(/\D/g, '')) || 0)} />
                </div>
              </div>
              <p className="mt-3 text-tiny font-medium text-muted">{t('finance.obligationsHint')}</p>

              <p className="mt-[34px] text-body font-bold">{t('finance.downPayment')}</p>
              <div className="mt-[9px] grid gap-4 sm:grid-cols-2 sm:gap-8">
                <div className="flex h-[52px] items-center rounded-lg bg-cream px-4 text-body font-bold">{sar(down)}</div>
                <div className="flex h-[52px] items-center justify-center rounded-lg bg-sand text-body font-bold text-bronze">{t('finance.downShare', { pct: downPct })}</div>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={downPct}
                onChange={(e) => setDownPct(Number(e.target.value))}
                className="mt-5 h-1 w-full cursor-pointer accent-ink"
                aria-label={t('finance.downPayment')}
              />

              <p className="mt-[30px] text-body font-bold">{t('finance.duration')}</p>
              <div className="mt-[13px] grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
                {DURATIONS.map((m) => (
                  <button key={m} onClick={() => setMonths(m)} className={`h-12 rounded-lg text-body font-bold transition ${m === months ? 'bg-ink text-gold' : 'bg-cream text-muted hover:bg-sand'}`}>
                    {t('common.months', { count: m })}
                  </button>
                ))}
              </div>
              <p className="mt-[31px] rounded-lg bg-sand px-4 py-3 text-small whitespace-pre-line text-bronze">{t('finance.assumption')}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_200px] sm:gap-6">
                <Button
                  variant="dark"
                  className="h-[52px]"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    await submitFinanceRequest({ ...lead, leadId, carId: car.id, color, salary, obligations, downPayment: down, months })
                    setBusy(false)
                    setStep(4)
                  }}
                >
                  {t('finance.submit')}
                </Button>
                <Button variant="soft" className="h-[52px]" onClick={() => setStep(2)}>{t('finance.s3Back')}</Button>
              </div>
            </>
          }
          aside={
            <DarkAside>
              <p className="text-tiny font-medium text-gold">{t('finance.resultEyebrow')}</p>
              <p className="mt-2.5 text-body font-bold">{t('finance.monthlyEstimate')}</p>
              <p className="mt-2.5 text-h1 font-extrabold text-gold"><bdi dir="ltr">≈ {num(calc.monthly)}</bdi></p>
              <p className="mt-1.5 text-small text-silver">{t('finance.monthlyUnit', { months })}</p>
              <div className="my-[18px] h-px bg-ink-2" />
              <div className="flex flex-col gap-3">
                <SummaryRow label={t('finance.carPrice')} value={num(price)} />
                <SummaryRow label={t('finance.downPayment')} value={num(down)} />
                <SummaryRow label={t('finance.financeAmount')} value={num(principal)} accent />
              </div>
              <div className="my-5 h-px bg-ink-2" />
              <div className="flex flex-col gap-3">
                <SummaryRow label={t('finance.totalInstallments')} value={num(calc.total)} />
                <SummaryRow label={t('finance.estimatedProfit')} value={num(calc.profit)} />
                <div className="pt-2">
                  <SummaryRow label={t('finance.totalWithDown')} value={num(calc.grand)} accent />
                </div>
              </div>
              <p className="mt-4 text-tiny font-medium text-silver">{t('finance.currencyNote')}</p>
              <div className="mt-[19px] h-2 overflow-hidden rounded-lg bg-silver">
                <div className="h-full rounded-lg bg-gold" style={{ width: `${calc.total ? (principal / calc.total) * 100 : 0}%` }} />
              </div>
              <p className="mt-4 text-tiny font-medium text-silver">{t('finance.composition', { principal: num(principal), profit: num(calc.profit) })}</p>
              <p className="mt-[38px] text-small text-silver">{t('finance.disclaimer')}</p>
              <button onClick={() => setStep(2)} className="mt-8 text-tiny font-medium text-gold hover:underline">{t('finance.changeCar')}</button>
            </DarkAside>
          }
        />
      )}

      {step === 4 && car && (
        <WizardShell
          main={
            <Confirmation
              eyebrow={t('finance.sent')}
              title={t('finance.underReview')}
              text={t('finance.confirmText', { car: `${car.brand} ${car.model}` })}
              clarification={t('finance.clarification')}
              steps={[1, 2, 3].map((n) => ({ title: t(`finance.next${n}Title`), text: t(`finance.next${n}Text`) }))}
              actions={
                <>
                  <Button to="/contact?topic=followUp" variant="dark" className="h-[52px]">{t('wizard.followUp')}</Button>
                  <Button to="/cars" variant="soft" className="h-[52px]">{t('common.browseCars')}</Button>
                </>
              }
            />
          }
          aside={
            <>
              <DarkAside>
                <h3 className="text-h3 font-bold">{t('finance.summaryTitle')}</h3>
                <p className="mt-[26px] text-body font-bold">{car.brand} {car.model}</p>
                <p className="mt-3 text-small text-silver">{car.year} · {colorName} · {car.transmissionLabel}</p>
                <div className="mt-[23px] h-px bg-ink-2" />
                <p className="mt-[27px] text-small text-silver">{t('finance.monthlyEstimate')}</p>
                <p className="mt-2.5 text-h2 font-bold text-gold"><bdi dir="ltr">≈ {sar(calc.monthly)}</bdi></p>
                <div className="mt-[34px] flex flex-col gap-4">
                  <SummaryRow label={t('finance.carPrice')} value={sar(price)} />
                  <SummaryRow label={t('finance.downPayment')} value={sar(down)} />
                  <SummaryRow label={t('finance.financeAmount')} value={sar(principal)} />
                  <SummaryRow label={t('finance.duration')} value={t('common.monthsLong', { count: months })} />
                </div>
                <p className="mt-[50px] text-small text-silver">{t('finance.summaryDisclaimer')}</p>
              </DarkAside>
              <Button variant="sand" className="h-[52px] w-full" onClick={reset}>{t('finance.newEstimate')}</Button>
            </>
          }
        />
      )}
    </>
  )
}

function StepDetails({ lead, setLead, busy, onNext }: { lead: { name: string; phone: string; city: string; consent: boolean }; setLead: (l: typeof lead) => void; busy: boolean; onNext: () => void }) {
  const { t } = useTranslation()
  const [touched, setTouched] = useState(false)
  const phoneOk = PHONE_RE.test(lead.phone.replace(/\s/g, ''))
  const valid = lead.name.trim() && phoneOk && lead.city.trim()
  const ready = valid && lead.consent

  return (
    <WizardShell
      main={
        <>
          <StepHeader step={1} title={t('finance.s1Title')} text={t('finance.s1Text')} note={t('wizard.sample')} />
          <div className="mt-[21px]">
            <Label htmlFor="f-name">{t('wizard.fullName')}</Label>
            <Input id="f-name" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder={t('contact.namePlaceholder')} />
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-8">
            <div>
              <Label htmlFor="f-phone">{t('wizard.phone')}</Label>
              <Input id="f-phone" dir="ltr" inputMode="tel" className="rtl:text-right" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} onBlur={() => setTouched(true)} placeholder="05xxxxxxxx" invalid={touched && !phoneOk} />
              <FieldError>{touched && !phoneOk ? t('common.invalidPhone') : null}</FieldError>
            </div>
            <div>
              <Label htmlFor="f-city">{t('wizard.city')}</Label>
              <Input id="f-city" list="cities" value={lead.city} onChange={(e) => setLead({ ...lead, city: e.target.value })} placeholder={(t('wizard.cities', { returnObjects: true }) as string[])[0]} />
              <datalist id="cities">
                {(t('wizard.cities', { returnObjects: true }) as string[]).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="mt-8 rounded-lg bg-sand px-[22px] py-[18px]">
            <Checkbox checked={lead.consent} onChange={(v) => setLead({ ...lead, consent: v })}>
              <span>
                {t('common.iAgreeShare', { defaultValue: 'أوافق على مشاركة البيانات مع فريق نواف وفق' })}{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-gold underline underline-offset-4 hover:opacity-80"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('footer.privacy', { defaultValue: 'سياسة الخصوصية' })}
                </a>
                {' '}{t('common.and', { defaultValue: 'و' })}{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-gold underline underline-offset-4 hover:opacity-80"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('footer.terms', { defaultValue: 'الشروط والأحكام' })}
                </a>
              </span>
            </Checkbox>
          </div>
          <p className="mt-[18px] text-small text-muted">{t('finance.reassurance')}</p>
          <Button variant="dark" className="mt-11 h-[52px] w-full" disabled={!ready || busy} onClick={onNext}>
            {t('finance.s1Next')}
          </Button>
          {!lead.consent && <p className="mt-2.5 text-tiny font-medium text-muted">{t('finance.consentHelper')}</p>}
        </>
      }
      aside={
        <>
          <DarkAside>
            <h3 className="text-h3 font-bold">{t('finance.whyTitle')}</h3>
            <p className="mt-[34px] text-lead">{t('finance.whyText')}</p>
            <p className="mt-14 text-small text-silver">{t('finance.journeyWith')}</p>
            {[1, 2, 3].map((n) => (
              <div key={n} className="mt-6">
                <p className="text-body font-bold text-silver">{t(`finance.j${n}`)}</p>
                <p className={`mt-3 text-small ${n === 1 ? 'text-gold' : 'text-white'}`}>{t(`finance.j${n}Text`)}</p>
              </div>
            ))}
          </DarkAside>
          <HelpCard />
        </>
      }
    />
  )
}
