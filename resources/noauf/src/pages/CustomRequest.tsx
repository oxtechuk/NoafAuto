import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CustomCarRequestPayload } from '@/types'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { Checkbox, FieldError, Input, Label, Select } from '@/components/ui/Field'
import { Confirmation, DarkAside, HelpCard, StepHeader, Stepper, SummaryRow, WizardHero, WizardShell } from '@/components/Wizard'
import { submitCustomCarRequest } from '@/services/forms'
import { SitekitApi } from '@/sitekit-sdk/client'
import type { SkCar } from '@/sitekit-sdk/types'
import { asset } from '@/lib/asset'
import { num, sar } from '@/lib/format'
import { COLORS, PHONE_RE } from '@/lib/constants'

const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020']
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

function getCarAvailableColors(car: SkCar | null): { id: string; name: string; hex?: string }[] {
  if (!car || !car.colors || car.colors.length === 0) return []
  return car.colors.map((c, idx) => ({
    id: c.name ? c.name.toLowerCase().replace(/\s+/g, '-') : `color-${idx}`,
    name: c.name || c.hex || 'لون معتمد',
    hex: c.hex,
  }))
}

export default function CustomRequest() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const arr = (k: string) => t(k, { returnObjects: true }) as string[]
  const [params] = useSearchParams()

  // ?step=N lets you open a step directly (handy for previews/QA)
  const [step, setStep] = useState(() => Math.min(4, Math.max(1, Number(params.get('step')) || 1)))
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  // Form State
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
    carId: undefined,
    isCustom: undefined,
  })
  const set = <K extends keyof CustomCarRequestPayload>(k: K, v: CustomCarRequestPayload[K]) => setF((s) => ({ ...s, [k]: v }))

  // Live Car Search and Selection State
  const [searchQuery, setSearchQuery] = useState('')
  const [allCars, setAllCars] = useState<SkCar[]>([])
  const [searchResults, setSearchResults] = useState<SkCar[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCar, setSelectedCar] = useState<SkCar | null>(null)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Preload showroom cars on mount and check for ?car= or ?car_id= query param
  useEffect(() => {
    let active = true
    SitekitApi.cars({ per_page: 50 })
      .then((res) => {
        if (!active) return
        setAllCars(res.data)
        setSearchResults(res.data)

        const carParam = params.get('car') || params.get('car_id')
        if (carParam) {
          const match = res.data.find(
            (c) => c.slug === carParam || String(c.id) === carParam || c.name.toLowerCase() === carParam.toLowerCase(),
          )
          if (match) {
            handleSelectCar(match, false)
          } else {
            SitekitApi.car(carParam)
              .then((detail) => {
                if (active && detail) handleSelectCar(detail, false)
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [params])

  // Live instant client filtering + debounced backend query
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    const clean = query.trim().toLowerCase()
    if (!clean) {
      setSearchResults(allCars)
      setIsSearching(false)
      return
    }

    const clientMatches = allCars.filter((c) => {
      const name = (c.name || '').toLowerCase()
      const brand = (c.brand?.name || '').toLowerCase()
      const model = (c.model || '').toLowerCase()
      const year = String(c.year || '')
      return name.includes(clean) || brand.includes(clean) || model.includes(clean) || year.includes(clean)
    })
    setSearchResults(clientMatches)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(() => {
      SitekitApi.searchCars(clean)
        .then((serverResults) => {
          if (Array.isArray(serverResults) && serverResults.length > 0) {
            const seen = new Set<number>()
            const merged = [...serverResults, ...clientMatches].filter((c) => {
              if (seen.has(c.id)) return false
              seen.add(c.id)
              return true
            })
            setSearchResults(merged)
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsSearching(false)
        })
    }, 250)
  }

  // Handle selecting an existing showroom car
  // autoAdvance: when true, if the car has no additional specs to configure (<= 1 color), skip directly to Step 3!
  const handleSelectCar = (car: SkCar, autoAdvance = true) => {
    setSelectedCar(car)
    setIsCustomMode(false)
    setSearchQuery(car.name)

    const availableColors = getCarAvailableColors(car)
    const initialColor = availableColors.length > 0 ? availableColors[0].name : 'black'

    setF((prev) => ({
      ...prev,
      carName: car.name,
      year: String(car.year || '2024'),
      budget: car.current_price || car.cash_price || prev.budget || 0,
      carId: car.id,
      isCustom: false,
      color: initialColor,
      condition: '0', // 0 = New / from showroom stock
    }))

    // If car has no multiple colors to choose from, auto-advance to step 3!
    if (autoAdvance && availableColors.length <= 1) {
      setStep(3)
    }
  }

  // Handle choosing to request a custom car not in stock
  const handleChooseCustom = (name?: string) => {
    setSelectedCar(null)
    setIsCustomMode(true)
    const customName = (name || searchQuery).trim() || f.carName || (isEn ? 'Custom Car' : 'سيارة مخصصة')
    setF((prev) => ({
      ...prev,
      carName: customName,
      carId: undefined,
      isCustom: true,
    }))
  }

  // Clear current selection and return to showroom search
  const handleClearSelection = () => {
    setSelectedCar(null)
    setIsCustomMode(false)
    setSearchQuery('')
    setF((prev) => ({
      ...prev,
      carName: '',
      carId: undefined,
      isCustom: undefined,
    }))
    setSearchResults(allCars)
  }

  const phoneOk = PHONE_RE.test(f.phone.replace(/\s/g, ''))
  const step1Ok = f.name.trim() && phoneOk && f.city && f.consent
  const step2Ok = f.carName.trim() && f.year && f.budget > 0
  const step3Ok = f.employer.trim() && f.salary > 0

  const conditions = arr('request.conditions')
  const sectors = arr('request.sectors')
  const obligationTypes = arr('request.obligationTypes')
  const colorName = t(`finance.colors.${f.color}`, { defaultValue: f.color })
  const maskedPhone = f.phone ? `${f.phone.slice(0, 2)}••••••••` : '05••••••••'
  const carColors = getCarAvailableColors(selectedCar)

  const hero = [
    { title: t('request.title1'), subtitle: t('request.subtitle1'), l: t('request.ctx1Label'), v: t('request.ctx1Value') },
    {
      title: selectedCar
        ? (isEn ? 'Showroom Car Selected' : 'سيارة متوفرة في المعرض')
        : isCustomMode
          ? (isEn ? 'Custom Car Request' : 'طلب سيارة غير متوفرة')
          : t('request.title2'),
      subtitle: selectedCar
        ? (isEn ? 'Proceed with your booking & financing inquiry.' : 'أكمل طلب الحجز وحسبة التمويل لسيارتك المختارة.')
        : isCustomMode
          ? (isEn ? 'We source & import luxury cars tailored to your request.' : 'نوفر ونستورد لك أي سيارة غير متوفرة بأفضل المواصفات.')
          : t('request.subtitle2'),
      l: t('request.ctx2Label'),
      v: f.carName || t('request.ctx2Value'),
    },
    { title: t('request.title3'), subtitle: t('request.subtitle3'), l: t('request.ctx3Label'), v: t('request.ctx3Value') },
    { title: t('request.title4'), subtitle: t('request.subtitle4'), l: t('request.ctx4Label'), v: t('request.ctx4Value') },
  ][step - 1]

  const submit = async () => {
    setBusy(true)
    await submitCustomCarRequest({
      ...f,
      condition: selectedCar ? (isEn ? 'New (Showroom)' : 'جديدة (من المعرض)') : conditions[Number(f.condition)],
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

      {/* Step 1: Personal Contact Information */}
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

      {/* Step 2: Car Search, Showroom Selection, or Custom Request */}
      {step === 2 && (
        <WizardShell
          main={
            <>
              <StepHeader
                step={2}
                title={
                  selectedCar
                    ? (isEn ? 'Selected Showroom Car' : 'السيارة المختارة من المعرض')
                    : isCustomMode
                      ? (isEn ? 'Custom Car Request (Not in Showroom)' : 'طلب سيارة غير متوفرة (طلب مخصص)')
                      : (isEn ? 'Search Showroom or Request Car' : 'ابحث في المعرض أو اطلب سيارة')
                }
                text={
                  selectedCar
                    ? (isEn ? 'All specifications are loaded from showroom stock.' : 'تم تعيين كافة المواصفات والأسعار المعتمدة من المعرض مباشرة.')
                    : isCustomMode
                      ? (isEn ? 'Specify the details of the car you want us to source for you.' : 'حدد مواصفات وميزانية السيارة التي ترغب بأن نستوردها لك خصيصاً.')
                      : (isEn ? 'Type to search all showroom cars, or request a car not in stock.' : 'ابحث في كامل سيارات المعرض، أو اطلب سيارة غير متوفرة في حال عدم وجودها.')
                }
              />

              {/* Case 1: A Showroom Car is Selected */}
              {selectedCar ? (
                <div className="mt-6 animate-in fade-in duration-300">
                  <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-cream to-white p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div className="flex items-center gap-4">
                        <div className="relative size-20 sm:size-24 rounded-xl bg-sand/40 p-1 border border-line shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={selectedCar.thumbnail || selectedCar.main_image || asset('/images/cars/mercedes-thumb.jpg')}
                            alt={selectedCar.name}
                            className="size-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-tiny font-bold text-white shadow-sm">
                              <span className="size-1.5 rounded-full bg-white animate-pulse" />
                              {isEn ? 'Showroom Stock (Instant Booking)' : 'متوفرة بالمعرض (حجز فوري)'}
                            </span>
                            <span className="rounded-md bg-sand px-2 py-0.5 text-tiny font-bold text-ink">
                              {selectedCar.year}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-h3 font-bold text-ink">{selectedCar.name}</h3>
                          <p className="text-small text-muted">
                            {selectedCar.brand?.name} {selectedCar.model ? `· ${selectedCar.model}` : ''} {selectedCar.type ? `· ${selectedCar.type}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between border-t sm:border-t-0 border-line/70 pt-3 sm:pt-0">
                        <div className="text-end">
                          <p className="text-tiny font-medium text-muted">{t('common.price', { defaultValue: 'السعر النقدي' })}</p>
                          <p className="text-h3 font-bold text-ink">{sar(selectedCar.current_price || selectedCar.cash_price)}</p>
                          {selectedCar.min_installment ? (
                            <p className="text-tiny font-bold text-gold">{sar(selectedCar.min_installment)} {t('common.monthly')}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="mt-2 text-small font-bold text-bronze underline hover:text-ink transition cursor-pointer"
                        >
                          {isEn ? 'Change car / Search again' : 'تغيير السيارة / بحث آخر'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Color Selector: ONLY show if this specific car has multiple colors defined in the showroom! */}
                  {carColors.length > 1 ? (
                    <div className="mt-6 rounded-2xl border border-line bg-sand/30 p-5">
                      <Label className="mb-3 block text-body font-bold text-ink">
                        {isEn ? 'Choose from available colors for this car in showroom:' : 'اختر من الألوان المتاحة لهذه السيارة في المعرض:'}
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {carColors.map((c) => {
                          const isSelected = f.color === c.name || f.color === c.id
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => set('color', c.name)}
                              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-small font-bold transition border cursor-pointer ${
                                isSelected
                                  ? 'border-gold bg-ink text-white shadow-md'
                                  : 'border-line bg-white text-ink hover:border-gold/60'
                              }`}
                            >
                              {c.hex && (
                                <span
                                  className="size-4 rounded-full border border-black/20"
                                  style={{ backgroundColor: c.hex }}
                                />
                              )}
                              <span>{c.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Actions for Selected Showroom Car */}
                  <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_200px] sm:gap-6">
                    <Button
                      variant="dark"
                      className="h-[52px] rounded-[4px]"
                      onClick={() => setStep(3)}
                    >
                      {isEn ? 'Continue to Financial Details →' : 'المتابعة لإكمال الطلب (المعلومات المالية) ←'}
                    </Button>
                    <Button variant="soft" className="h-[52px] rounded-[4px]" onClick={() => setStep(1)}>
                      {t('request.back1')}
                    </Button>
                  </div>
                </div>
              ) : isCustomMode ? (
                /* Case 2: Custom Car Mode (Car not in showroom - full customization form) */
                <div className="animate-in fade-in duration-300">
                  <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50/60 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-amber-200 text-amber-900 shrink-0 font-bold">
                          ✦
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-tiny font-bold text-white">
                              {isEn ? 'Custom Order (Not in Showroom)' : 'طلب سيارة غير متوفرة (استيراد خاص)'}
                            </span>
                          </div>
                          <h4 className="mt-1 text-h3 font-bold text-ink">{f.carName}</h4>
                          <p className="mt-1 text-small text-muted">
                            {isEn
                              ? 'Our sourcing team will find and import this vehicle specifically for you.'
                              : 'سيقوم فريق نواف أوتو بالبحث عن هذه السيارة وتوفيرها لك بأفضل المواصفات والأسعار.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-small font-bold text-bronze underline hover:text-ink transition self-start sm:self-auto cursor-pointer"
                      >
                        {isEn ? 'Search showroom again' : 'العودة للبحث في المعرض'}
                      </button>
                    </div>
                  </div>

                  {/* Editable Car Name for Custom Request */}
                  <div className="mt-6 rounded-[4px] bg-sand px-6 pt-4 pb-[26px]">
                    <p className="text-body font-bold text-bronze">{t('request.carNameTitle')}</p>
                    <p className="mt-2.5 text-small">{t('request.carName')}</p>
                    <Input
                      className="mt-2.5 rounded-[4px] border-transparent bg-white"
                      value={f.carName}
                      onChange={(e) => set('carName', e.target.value)}
                      placeholder={t('request.carNamePlaceholder')}
                      dir="auto"
                    />
                  </div>

                  {/* Custom Vehicle Specifications */}
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
                      <Input
                        className={flat}
                        inputMode="numeric"
                        value={f.budget ? num(f.budget) : ''}
                        onChange={(e) => set('budget', toNum(e.target.value))}
                        placeholder="350,000"
                      />
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
                    <Button
                      variant="dark"
                      className="h-[52px] rounded-[4px]"
                      disabled={!step2Ok}
                      onClick={() => setStep(3)}
                    >
                      {isEn ? 'Continue Custom Request' : 'المتابعة لإكمال الطلب المخصص'}
                    </Button>
                    <Button variant="soft" className="h-[52px] rounded-[4px]" onClick={() => setStep(1)}>{t('request.back1')}</Button>
                  </div>
                </div>
              ) : (
                /* Case 3: Search & Autocomplete across all showroom cars */
                <div className="mt-6 rounded-2xl border border-line bg-sand/40 p-5">
                  <p className="text-body font-bold text-bronze">
                    {isEn ? 'Search showroom cars or request a car' : 'ابحث في معرض السيارات أو اطلب سيارة:'}
                  </p>
                  <p className="mt-1 text-small text-muted">
                    {isEn
                      ? 'Type car name, brand, model, or year to filter showroom cars in real-time.'
                      : 'اكتب اسم السيارة، الموديل، الماركة، أو السنة للبحث الفوري في كافة سيارات المعرض.'}
                  </p>

                  <div className="relative mt-3">
                    <div className="relative flex items-center">
                      <Input
                        className="rounded-xl border-line bg-white ps-10 pe-10 h-13 text-body shadow-sm focus:border-gold"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={t('request.carNamePlaceholder', { defaultValue: 'اكتب اسم السيارة (مثال: بورش كايين، مرسيدس G63، لاندكروزر...)' })}
                        dir="auto"
                      />
                      <span className="absolute start-3.5 text-muted pointer-events-none">
                        {isSearching ? (
                          <svg className="size-5 animate-spin text-gold" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <Icon name="search" size={20} />
                        )}
                      </span>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => handleSearchChange('')}
                          className="absolute end-3 text-muted hover:text-ink p-1 rounded-full hover:bg-sand transition"
                          aria-label="Clear"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      )}
                    </div>

                    {/* Results / Suggestions Dropdown */}
                    <div className="mt-4 flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pe-1">
                      {searchResults.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between px-1 text-tiny text-muted font-bold">
                            <span>
                              {isEn
                                ? `Found ${searchResults.length} car(s) in showroom:`
                                : `تم العثور على ${searchResults.length} سيارة في المعرض:`}
                            </span>
                            <span className="text-emerald-700">✓ {isEn ? 'Instant booking available' : 'متوفرة للحجز الفوري'}</span>
                          </div>

                          {searchResults.map((car) => (
                            <div
                              key={car.id}
                              onClick={() => handleSelectCar(car, true)}
                              className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-line bg-white hover:border-gold hover:bg-gold/5 cursor-pointer transition shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={car.thumbnail || car.main_image || asset('/images/cars/mercedes-thumb.jpg')}
                                  alt={car.name}
                                  className="size-14 rounded-lg object-contain bg-sand/30 border border-line shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-small font-bold text-ink truncate group-hover:text-gold transition">
                                      {car.name}
                                    </h4>
                                    <span className="rounded bg-emerald-100 text-emerald-800 text-[11px] px-1.5 py-0.5 font-bold shrink-0">
                                      {isEn ? 'In Stock' : 'متوفرة بالمعرض'}
                                    </span>
                                  </div>
                                  <p className="text-tiny text-muted">
                                    {car.brand?.name} · {car.year} {car.type ? `· ${car.type}` : ''}
                                  </p>
                                  <p className="text-small font-bold text-ink">
                                    {sar(car.current_price || car.cash_price)}
                                    {car.min_installment ? (
                                      <span className="text-tiny font-normal text-muted ms-2">
                                        ({sar(car.min_installment)} {t('common.monthly')})
                                      </span>
                                    ) : null}
                                  </p>
                                </div>
                              </div>

                              <Button variant="dark" className="h-9 px-4 shrink-0 rounded-lg pointer-events-none">
                                {isEn ? 'Select' : 'اختيار'}
                              </Button>
                            </div>
                          ))}

                          {/* Option to request custom if user typed something */}
                          {searchQuery.trim() && (
                            <div
                              onClick={() => handleChooseCustom(searchQuery)}
                              className="mt-2 flex items-center justify-between p-3.5 rounded-xl border border-dashed border-bronze bg-sand/60 hover:bg-sand cursor-pointer transition"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-full bg-bronze/10 text-bronze font-bold">
                                  +
                                </span>
                                <div>
                                  <p className="text-small font-bold text-ink">
                                    {isEn ? 'Not the exact car? Request a custom car' : 'لم تجد الموديل أو المواصفات المطلوبة؟ اطلب سيارة غير متوفرة'}
                                  </p>
                                  <p className="text-tiny text-muted">
                                    {isEn ? `Continue as custom request for "${searchQuery}"` : `المتابعة كطلب مخصص لاستيراد: "${searchQuery}"`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-small font-bold text-bronze">
                                {isEn ? 'Custom Request →' : 'طلب مخصص ←'}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Empty State: Car not found in showroom */
                        <div className="p-5 rounded-xl border border-amber-300 bg-amber-50/70 text-center sm:text-start flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-full bg-amber-200 text-amber-800 shrink-0 font-bold text-body">
                              !
                            </span>
                            <div>
                              <p className="text-body font-bold text-ink">
                                {isEn
                                  ? `Car "${searchQuery || 'requested'}" is not currently in our showroom stock`
                                  : `السيارة "${searchQuery || 'المطلوبة'}" غير متوفرة حالياً في المعرض`}
                              </p>
                              <p className="text-small text-muted mt-0.5">
                                {isEn
                                  ? 'No problem! You can place a custom car request and our team will source it for you.'
                                  : 'لا مشكلة! يمكنك طلب سيارة غير متوفرة وسيقوم فريق نواف أوتو بالبحث عنها وتوفيرها لك خصيصاً.'}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="dark"
                            onClick={() => handleChooseCustom(searchQuery)}
                            className="h-11 px-5 whitespace-nowrap rounded-lg shrink-0 w-full sm:w-auto"
                          >
                            {isEn ? 'Request this car (Custom)' : 'طلب سيارة مش موجودة (طلب مخصص)'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          }
          aside={
            <>
              <DarkAside>
                <h3 className="text-h3 font-bold">{t('request.asideTitle2')}</h3>
                <p className="mt-6 text-small text-silver">{t('request.asideText2')}</p>
                <div className="mt-[52px] border-t border-ink-2 pt-6">
                  <p className="text-body font-bold text-gold">
                    {selectedCar ? (isEn ? 'Showroom Guarantee' : 'ضمان نواف أوتو') : t('request.needTitle')}
                  </p>
                  <p className="mt-4 text-small whitespace-pre-line text-silver">
                    {selectedCar
                      ? (isEn
                          ? 'All cars in our showroom undergo rigorous 150+ point inspection and come with full warranties.'
                          : 'جميع السيارات المتوفرة في صالة العرض مفحوصة بدقة ومعتمدة ومشمولة بالضمان الشامل.')
                      : t('request.needText')}
                  </p>
                  <p className="mt-8 text-body font-bold text-gold">{t('request.afterTitle')}</p>
                  <p className="mt-4 text-small text-silver">{t('request.afterText')}</p>
                  <p className="mt-10 text-small text-silver">{t('request.noGuarantee')}</p>
                </div>
              </DarkAside>
              <HelpCard />
            </>
          }
        />
      )}

      {/* Step 3: Financial Information & Review */}
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
                <Button variant="dark" className="h-[52px] rounded-[4px]" disabled={!step3Ok || busy} onClick={submit}>
                  {busy ? (isEn ? 'Submitting...' : 'جاري الإرسال...') : t('request.submit')}
                </Button>
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
              <div className="mt-[25px]">
                <span className={`rounded-full px-2.5 py-0.5 text-tiny font-bold ${selectedCar ? 'bg-emerald-600 text-white' : 'bg-gold text-ink'}`}>
                  {selectedCar ? (isEn ? 'Showroom Car' : 'سيارة متوفرة بالمعرض') : (isEn ? 'Custom Request' : 'طلب مخصص')}
                </span>
                <p className="mt-2 text-body font-bold text-white" dir="auto">{f.carName}</p>
              </div>
              <p className="mt-3 text-small text-silver">
                {f.year}&nbsp; · &nbsp;{colorName}&nbsp; · &nbsp;
                {selectedCar ? (isEn ? 'New' : 'جديدة') : conditions[Number(f.condition)]}
              </p>
              <div className="my-6 h-px bg-ink-2" />
              <div className="flex flex-col gap-5">
                <SummaryRow label={selectedCar ? (isEn ? 'Car Price' : 'سعر السيارة') : t('request.budgetShort')} value={sar(f.budget)} />
                <SummaryRow label={t('request.salaryShort')} value={sar(f.salary)} />
                <SummaryRow label={t('request.obligationsShort')} value={sar(f.obligations)} />
              </div>
              <p className="mt-10 text-small text-silver">{t('request.reviewNote')}</p>
              <p className="mt-9 text-tiny font-medium text-gold">{t('request.editNote')}</p>
            </DarkAside>
          }
        />
      )}

      {/* Step 4: Submission Confirmation */}
      {step === 4 && (
        <WizardShell
          main={
            <Confirmation
              eyebrow={t('request.sentEyebrow')}
              title={
                f.name.trim()
                  ? t('request.thanks', { name: f.name.trim().split(' ')[0] })
                  : t('finance.underReview')
              }
              text={
                selectedCar
                  ? (isEn
                      ? `Your booking request for "${f.carName}" has been received. Our sales specialist will contact you shortly to confirm the reservation.`
                      : `تم استلام طلبك للسيارة "${f.carName}" المتوفرة في المعرض بنجاح. سيتواصل معك مستشارك المالي قريباً لتأكيد الحجز والإجراءات.`)
                  : t('request.confirmText', { car: f.carName })
              }
              clarification={
                selectedCar
                  ? (isEn ? 'Car is reserved under your name pending confirmation.' : 'تم تسجيل رغبتك بالسيارة وسنقوم بتجهيز عرض التمويل المناسب لك.')
                  : t('request.clarification')
              }
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
                <div className="mt-[26px]">
                  <span className={`rounded-full px-2.5 py-0.5 text-tiny font-bold ${selectedCar ? 'bg-emerald-600 text-white' : 'bg-gold text-ink'}`}>
                    {selectedCar ? (isEn ? 'Showroom Car' : 'سيارة متوفرة بالمعرض') : (isEn ? 'Custom Request' : 'طلب مخصص')}
                  </span>
                  <p className="mt-2 text-body font-bold" dir="auto">{f.carName}</p>
                </div>
                <p className="mt-4 text-small text-silver">
                  {f.year} · {colorName} · {selectedCar ? (isEn ? 'New' : 'جديدة') : conditions[Number(f.condition)]}
                </p>
                <div className="mt-[23px] h-px bg-ink-2" />
                <p className="mt-[27px] text-small text-silver">{t('request.status')}</p>
                <p className="mt-2.5 text-h2 font-bold text-gold">{t('request.statusValue')}</p>
                <div className="mt-[34px] flex flex-col gap-4">
                  <SummaryRow label={selectedCar ? (isEn ? 'Car Price' : 'سعر السيارة') : t('request.yourBudget')} value={sar(f.budget)} />
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
                  handleClearSelection()
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
