import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CustomCarRequestPayload } from '@/types'
import Button from '@/components/ui/Button'
import { Checkbox, FieldError, Input, Label, Select } from '@/components/ui/Field'
import { Confirmation, DarkAside, HelpCard, StepHeader, Stepper, SummaryRow, WizardHero, WizardShell } from '@/components/Wizard'
import { submitCustomCarRequest } from '@/services/forms'
import { num, sar } from '@/lib/format'
import { COLORS, PHONE_RE } from '@/lib/constants'

const YEARS = ['2026', '2025', '2024', '2023', '2022']
const toNum = (v: string) => Number(v.replace(/\D/g, '')) || 0

/** Request-flow inputs are flat (no border, 4px radius) in the design. */
const flat = 'rounded-[4px] border-transparent font-normal text-small'

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export default function CustomRequest() {
  const { t } = useTranslation()
  const arr = (k: string) => t(k, { returnObjects: true }) as string[]
  const [params] = useSearchParams()
  // ?step=N lets you open a step directly (handy for previews/QA)
  const [step, setStep] = useState(() => Math.min(4, Math.max(1, Number(params.get('step')) || 1)))
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const [f, setF] = useState<CustomCarRequestPayload>({
    name: '',
    phone: '',
    city: arr('wizard.cities')[0],
    email: '',
    consent: false,
    carName: '',
    year: '2024',
    color: 'black',
    budget: 0,
    condition: '0',
    sector: '0',
    employer: '',
    salary: 0,
    extraIncome: 0,
    obligations: 0,
    obligationType: '0',
  })
  const set = <K extends keyof CustomCarRequestPayload>(k: K, v: CustomCarRequestPayload[K]) => setF((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const phoneOk = PHONE_RE.test(f.phone.replace(/\s/g, ''))
  const step1Ok = f.name.trim() && phoneOk && f.city && f.consent
  const step2Ok = f.carName.trim() && f.year && f.budget > 0
  const step3Ok = f.employer.trim() && f.salary > 0

  const conditions = arr('request.conditions')
  const sectors = arr('request.sectors')
  const obligationTypes = arr('request.obligationTypes')
  const colorName = t(`finance.colors.${f.color}`)
  const maskedPhone = f.phone ? `${f.phone.slice(0, 2)}••••••••` : '05••••••••'

  const hero = [
    { title: t('request.title1'), subtitle: t('request.subtitle1'), l: t('request.ctx1Label'), v: t('request.ctx1Value') },
    { title: t('request.title2'), subtitle: t('request.subtitle2'), l: t('request.ctx2Label'), v: t('request.ctx2Value') },
    { title: t('request.title3'), subtitle: t('request.subtitle3'), l: t('request.ctx3Label'), v: t('request.ctx3Value') },
    { title: t('request.title4'), subtitle: t('request.subtitle4'), l: t('request.ctx4Label'), v: t('request.ctx4Value') },
  ][step - 1]

  const submit = async () => {
    setBusy(true)
    await submitCustomCarRequest({
      ...f,
      condition: conditions[Number(f.condition)],
      sector: sectors[Number(f.sector)],
      obligationType: obligationTypes[Number(f.obligationType)],
    })
    setBusy(false)
    setStep(4)
  }

  const phases = (
    <>
      {[1, 2, 3].map((n) => (
        <div key={n} className="mt-9 first:mt-0">
          <p className="text-body font-bold text-gold">{t(`request.phase${n}`)}</p>
          <p className="mt-3 text-small text-silver">{t(`request.phase${n}Text`)}</p>
        </div>
      ))}
    </>
  )

  return (
    <>
      <WizardHero eyebrow={t('request.eyebrow')} title={hero.title} subtitle={hero.subtitle} ctxLabel={hero.l} ctxValue={hero.v} />
      <Stepper steps={arr('request.steps')} current={step} />

      {step === 1 && (
        <WizardShell
          main={
            <>
              <StepHeader step={1} title={t('request.s1Title')} text={t('request.s1Text')} note={t('request.requiredNote')} />
              <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label={t('wizard.fullName')}>
                  <Input className={flat} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={t('contact.namePlaceholder')} />
                </Field>
                <Field label={t('wizard.phone')}>
                  <Input className={`${flat} rtl:text-right`} dir="ltr" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} onBlur={() => setTouched(true)} placeholder="05xxxxxxxx" invalid={touched && !phoneOk} />
                  <FieldError>{touched && !phoneOk ? t('common.invalidPhone') : null}</FieldError>
                </Field>
                <Field label={t('wizard.city')}>
                  <Select value={f.city} onChange={(e) => set('city', e.target.value)} className="[&_select]:rounded-[4px]">
                    {arr('wizard.cities').map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('wizard.emailOptional')}>
                  <Input className={`${flat} rtl:text-right`} dir="ltr" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" />
                </Field>
              </div>
              <div className="mt-7 rounded-[4px] bg-sand px-6 pt-5 pb-10">
                <Checkbox checked={f.consent} onChange={(v) => set('consent', v)}>
                  <span>
                    {t('common.iAgreeTo', { defaultValue: 'أوافق على' })}{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-gold underline underline-offset-4 hover:opacity-80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('footer.privacy', { defaultValue: 'سياسة الخصوصية' })}
                    </a>
                    {' '}
                    {t('request.consentSuffix', { defaultValue: 'واستخدام بياناتي للتواصل بشأن طلب السيارة المخصصة.' })}
                  </span>
                </Checkbox>
              </div>
              <p className="mt-4 text-tiny font-medium text-muted">{t('request.s1Note')}</p>
              <Button variant="dark" className="mt-6 h-[52px] w-full rounded-[4px]" disabled={!step1Ok} onClick={() => setStep(2)}>
                {t('request.s1Next')}
              </Button>
            </>
          }
          aside={
            <>
              <DarkAside>
                <h3 className="text-h3 font-bold">{t('request.asideTitle1')}</h3>
                <p className="mt-7 text-lead">{t('request.asideText1')}</p>
                <div className="mt-9">{phases}</div>
              </DarkAside>
              <HelpCard />
            </>
          }
        />
      )}

      {step === 2 && (
        <WizardShell
          main={
            <>
              <StepHeader step={2} title={t('request.s2Title')} text={t('request.s2Text')} />
              <div className="mt-[26px] rounded-[4px] bg-sand px-6 pt-4 pb-[26px]">
                <p className="text-body font-bold text-bronze">{t('request.carNameTitle')}</p>
                <p className="mt-2.5 text-small">{t('request.carName')}</p>
                <Input className="mt-2.5 rounded-[4px] border-transparent bg-white" value={f.carName} onChange={(e) => set('carName', e.target.value)} placeholder={t('request.carNamePlaceholder')} dir="auto" />
              </div>
              <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label={t('request.year')}>
                  <Select value={f.year} onChange={(e) => set('year', e.target.value)}>
                    {YEARS.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('request.color')}>
                  <Select value={f.color} onChange={(e) => set('color', e.target.value)}>
                    {COLORS.map((c) => (
                      <option key={c.id} value={c.id}>{t(`finance.colors.${c.id}`)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('request.budget')}>
                  <Input className={flat} inputMode="numeric" value={f.budget ? num(f.budget) : ''} onChange={(e) => set('budget', toNum(e.target.value))} placeholder="350,000" />
                </Field>
                <Field label={t('request.condition')}>
                  <Select value={f.condition} onChange={(e) => set('condition', e.target.value)}>
                    {conditions.map((c, i) => (
                      <option key={c} value={i}>{c}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-9 grid gap-4 sm:grid-cols-[1fr_200px] sm:gap-6">
                <Button variant="dark" className="h-[52px] rounded-[4px]" disabled={!step2Ok} onClick={() => setStep(3)}>{t('request.s2Next')}</Button>
                <Button variant="soft" className="h-[52px] rounded-[4px]" onClick={() => setStep(1)}>{t('request.back1')}</Button>
              </div>
            </>
          }
          aside={
            <>
              <DarkAside>
                <h3 className="text-h3 font-bold">{t('request.asideTitle2')}</h3>
                <p className="mt-6 text-small text-silver">{t('request.asideText2')}</p>
                <div className="mt-[52px] border-t border-ink-2 pt-6">
                  <p className="text-body font-bold text-gold">{t('request.needTitle')}</p>
                  <p className="mt-4 text-small whitespace-pre-line text-silver">{t('request.needText')}</p>
                  <p className="mt-8 text-body font-bold text-gold">{t('request.afterTitle')}</p>
                  <p className="mt-4 text-small text-silver">{t('request.afterText')}</p>
                  <p className="mt-10 text-small text-silver">{t('request.noGuarantee')}</p>
                  <p className="mt-2.5 text-tiny font-medium text-gold">{t('request.noPhoto')}</p>
                </div>
              </DarkAside>
              <HelpCard />
            </>
          }
        />
      )}

      {step === 3 && (
        <WizardShell
          main={
            <>
              <StepHeader step={3} title={t('request.s3Title')} text={t('request.s3Text')} />
              <div className="mt-[30px] grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label={t('request.sector')}>
                  <Select value={f.sector} onChange={(e) => set('sector', e.target.value)}>
                    {sectors.map((s, i) => (
                      <option key={s} value={i}>{s}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('request.employer')}>
                  <Input className={flat} value={f.employer} onChange={(e) => set('employer', e.target.value)} />
                </Field>
                <Field label={t('request.salary')}>
                  <Input className={flat} inputMode="numeric" value={f.salary ? num(f.salary) : ''} onChange={(e) => set('salary', toNum(e.target.value))} placeholder="15,000" />
                </Field>
                <Field label={t('request.extraIncome')}>
                  <Input className={flat} inputMode="numeric" value={num(f.extraIncome)} onChange={(e) => set('extraIncome', toNum(e.target.value))} />
                </Field>
                <Field label={t('request.obligations')}>
                  <Input className={flat} inputMode="numeric" value={num(f.obligations)} onChange={(e) => set('obligations', toNum(e.target.value))} />
                </Field>
                <Field label={t('request.obligationType')}>
                  <Select value={f.obligationType} onChange={(e) => set('obligationType', e.target.value)}>
                    {obligationTypes.map((s, i) => (
                      <option key={s} value={i}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <p className="mt-2 text-tiny font-medium text-muted">{t('request.obligationsHint')}</p>
              <p className="mt-8 text-tiny font-medium text-muted">{t('request.finalNote')}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_200px] sm:gap-6">
                <Button variant="dark" className="h-[52px] rounded-[4px]" disabled={!step3Ok || busy} onClick={submit}>{t('request.submit')}</Button>
                <Button variant="soft" className="h-[52px] rounded-[4px]" onClick={() => setStep(2)}>{t('request.back2')}</Button>
              </div>
            </>
          }
          aside={
            <DarkAside>
              <h3 className="text-h3 font-bold">{t('request.reviewTitle')}</h3>
              <p className="mt-7 text-small text-silver" dir="auto">
                <span dir="ltr">{maskedPhone}</span>&nbsp; · &nbsp;{f.city}
              </p>
              <div className="mt-[22px] h-px bg-ink-2" />
              <p className="mt-[25px] text-body font-bold" dir="auto">{f.carName}</p>
              <p className="mt-6 text-small text-silver">{f.year}&nbsp; · &nbsp;{colorName}&nbsp; · &nbsp;{conditions[Number(f.condition)]}</p>
              <p className="mt-3.5 text-tiny font-medium text-gold">{t('request.manualEntry')}</p>
              <div className="my-6 h-px bg-ink-2" />
              <div className="flex flex-col gap-5">
                <SummaryRow label={t('request.budgetShort')} value={sar(f.budget)} />
                <SummaryRow label={t('request.salaryShort')} value={sar(f.salary)} />
                <SummaryRow label={t('request.obligationsShort')} value={sar(f.obligations)} />
              </div>
              <p className="mt-10 text-small text-silver">{t('request.reviewNote')}</p>
              <p className="mt-9 text-tiny font-medium text-gold">{t('request.editNote')}</p>
              <p className="mt-5 text-tiny font-medium text-gold">{t('wizard.sample')}</p>
            </DarkAside>
          }
        />
      )}

      {step === 4 && (
        <WizardShell
          main={
            <Confirmation
              eyebrow={t('request.sentEyebrow')}
              title={f.name.trim() ? t('request.thanks', { name: f.name.trim().split(' ')[0] }) : t('finance.underReview')}
              text={t('request.confirmText', { car: f.carName })}
              clarification={t('request.clarification')}
              steps={[1, 2, 3].map((n) => ({ title: t(`request.next${n}Title`), text: t(`request.next${n}Text`) }))}
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
                <h3 className="text-h3 font-bold">{t('request.summaryTitle')}</h3>
                <p className="mt-[26px] text-body font-bold" dir="auto">{f.carName}</p>
                <p className="mt-9 text-small text-silver">{f.year} · {colorName} · {conditions[Number(f.condition)]} · {t('request.manualEntry').split(' · ')[1]}</p>
                <div className="mt-[23px] h-px bg-ink-2" />
                <p className="mt-[27px] text-small text-silver">{t('request.status')}</p>
                <p className="mt-2.5 text-h2 font-bold text-gold">{t('request.statusValue')}</p>
                <div className="mt-[34px] flex flex-col gap-4">
                  <SummaryRow label={t('request.yourBudget')} value={sar(f.budget)} />
                  <SummaryRow label={t('request.salaryShort')} value={sar(f.salary)} />
                  <SummaryRow label={t('request.obligationsShort')} value={sar(f.obligations)} />
                  <SummaryRow label={t('request.sectorShort')} value={sectors[Number(f.sector)]} />
                </div>
                <p className="mt-[50px] text-small text-silver">{t('request.summaryDisclaimer')}</p>
              </DarkAside>
              <Button
                variant="sand"
                className="h-[52px] w-full"
                onClick={() => {
                  setF((s) => ({ ...s, carName: '', budget: 0 }))
                  setStep(2)
                }}
              >
                {t('request.another')}
              </Button>
            </>
          }
        />
      )}
    </>
  )
}
