import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Icon, { type IconName } from '@/components/ui/Icon'
import { Checkbox, FieldError, Input, Label, Textarea } from '@/components/ui/Field'
import { PHONE_RE, SITE } from '@/lib/constants'
import { useApi } from '@/hooks/useApi'
import { getFaqs } from '@/services/content'
import { sendContact } from '@/services/forms'

const TOPICS = ['general', 'finance', 'followUp', 'booking', 'import', 'complaint', 'other'] as const

export default function Contact() {
  const { t } = useTranslation()
  const channels: { icon: IconName; label: string; value: string; hint: string; href: string; soft?: boolean; ltr?: boolean }[] = [
    { icon: 'phone', label: t('contact.callUs'), value: SITE.phone, hint: t('contact.callNow'), href: SITE.phoneHref, ltr: true },
    { icon: 'whatsapp', label: t('contact.whatsapp'), value: t('contact.instantReply'), hint: t('contact.whatsapp247'), href: SITE.whatsappHref, soft: true },
    { icon: 'mail', label: t('contact.email'), value: SITE.contactEmail, hint: t('contact.emailHint'), href: `mailto:${SITE.contactEmail}`, ltr: true },
    { icon: 'pin', label: t('contact.visit'), value: t('contact.visitValue'), hint: t('contact.visitHint'), href: SITE.mapsHref },
  ]

  return (
    <>
      <section className="bg-ink">
        <div className="container-x flex flex-col gap-8 pt-7 pb-11 md:flex-row md:justify-between">
          <div>
            <p className="text-tiny font-medium text-silver">
              <Link to="/" className="hover:text-white">{t('nav.home')}</Link>&nbsp; / &nbsp;{t('contact.breadcrumb')}
            </p>
            <h1 className="mt-6 text-[36px] leading-[48px] font-extrabold text-white md:text-h1 md:leading-[56px]">{t('contact.title')}</h1>
            <p className="mt-4 text-lead text-silver">{t('contact.subtitle')}</p>
          </div>
          <div className="md:w-[320px] md:pt-1 md:text-end">
            <p className="text-tiny font-medium text-silver" dir="ltr">{t('contact.brandLabel')}</p>
            <p className="mt-6 text-h2 font-bold whitespace-pre-line text-gold">{t('contact.brandStatement')}</p>
          </div>
        </div>
      </section>

      <section className="bg-cream pt-[18px]">
        <div className="container-x">
          <h2 className="text-body font-bold">{t('contact.channelsTitle')}</h2>
          <div className="mt-[22px] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map((c) => (
              <a key={c.icon} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={`rounded-lg p-5 transition hover:shadow-md ${c.soft ? 'bg-sand' : 'bg-white'}`}>
                <div className="flex items-center gap-6">
                  <Icon name={c.icon} size={24} className="text-bronze" />
                  <span className="text-body font-bold">{c.label}</span>
                </div>
                <p className={`mt-[21px] text-body font-bold ${c.ltr ? 'text-end' : ''}`}>
                  <span dir="ltr">{c.value}</span>
                </p>
                <p className={`mt-3 text-tiny font-medium text-muted ${c.ltr ? 'text-end' : ''}`}>{c.hint}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream pt-11 pb-10">
        <div className="container-x grid gap-8 lg:grid-cols-[1fr_352px]">
          <ContactForm />
          <aside className="flex flex-col gap-6">
            <div className="rounded-lg bg-white px-6 pt-7 pb-6">
              <div className="flex items-center gap-6">
                <Icon name="pin" size={24} className="text-bronze" />
                <h3 className="text-h3 font-bold">{t('contact.locationTitle')}</h3>
              </div>
              <p className="mt-6 text-body font-bold">{t('contact.street')}</p>
              <p className="mt-3 text-small text-muted">{t('contact.city')}</p>
              <p className="mt-3 text-tiny font-medium text-muted">{t('contact.visitGuide')}</p>
              <a href={SITE.mapsHref} target="_blank" rel="noreferrer" className="mt-3 flex h-11 items-center justify-between rounded-lg bg-cream px-[18px] text-body font-bold text-bronze hover:bg-sand">
                <span className="flex-1 text-center">{t('contact.openMaps')}</span>
                <Icon name="arrow" size={16} className="ltr:-scale-x-100" />
              </a>
            </div>

            <div className="rounded-lg bg-ink px-6 pt-7 pb-6">
              <div className="flex items-center gap-6">
                <Icon name="clock" size={24} className="text-gold" />
                <h3 className="text-h3 font-bold text-white">{t('contact.hoursTitle')}</h3>
              </div>
              <dl className="mt-8">
                {[
                  [t('contact.sunThu'), t('contact.sunThuTime')],
                  [t('contact.fri'), t('contact.friTime')],
                  [t('contact.sat'), t('contact.satTime')],
                ].map(([d, h], i) => (
                  <div key={d} className={`flex items-center justify-between py-3 ${i < 2 ? 'border-b border-ink-2' : ''}`}>
                    <dt className="text-small text-silver">{d}</dt>
                    <dd className="text-body font-bold text-white">{h}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-9 text-tiny font-medium text-gold">{t('contact.whatsapp247')}</p>
            </div>

            <div className="rounded-lg bg-sand px-6 pt-7 pb-6">
              <h3 className="text-h3 font-bold">{t('contact.quickTitle')}</h3>
              <p className="mt-6 text-small text-muted">{t('contact.quickText')}</p>
              <Button href={SITE.whatsappHref} variant="dark" className="mt-[52px] h-12 w-full">{t('contact.quickAction')}</Button>
              <p className="mt-3 text-tiny font-medium text-bronze">{t('contact.quickNote')}</p>
            </div>
          </aside>
        </div>
      </section>

      <Faq />
    </>
  )
}

function ContactForm() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: (params.get('topic') as (typeof TOPICS)[number]) ?? 'general',
    message: params.get('car') ? `${params.get('car')}\n` : '',
    consent: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const ready = form.name.trim() && form.phone.trim() && form.message.trim() && form.consent

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = t('common.required')
    if (!PHONE_RE.test(form.phone.replace(/\s/g, ''))) errs.phone = t('common.invalidPhone')
    if (!form.message.trim()) errs.message = t('common.required')
    setErrors(errs)
    if (Object.keys(errs).length || !form.consent) return
    setStatus('sending')
    // Send the topic key; the service maps it to the backend subject.
    await sendContact({ ...form, subject: form.subject })
    setStatus('sent')
    setForm((f) => ({ ...f, message: '', consent: false }))
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg bg-white p-6 md:px-8 md:pt-6 md:pb-7">
      <p className="text-tiny font-medium text-bronze">{t('contact.formEyebrow')}</p>
      <h2 className="mt-1.5 text-h3 font-bold">{t('contact.formTitle')}</h2>
      <p className="mt-2 text-small text-muted">{t('contact.formHint')}</p>

      <div className="mt-[18px] grid gap-6 md:grid-cols-2 md:gap-8">
        <div>
          <Label htmlFor="c-name">{t('contact.name')}</Label>
          <Input id="c-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('contact.namePlaceholder')} invalid={!!errors.name} />
          <FieldError>{errors.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="c-phone">{t('contact.phone')}</Label>
          <Input id="c-phone" dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xxxxxxxx" className="rtl:text-right" invalid={!!errors.phone} />
          <FieldError>{errors.phone}</FieldError>
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="c-email">{t('contact.emailOptional')}</Label>
        <Input id="c-email" type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" className="rtl:text-right" />
      </div>

      <div className="mt-6">
        <p className="text-body font-bold">{t('contact.subject')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-x-4">
          {TOPICS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => set('subject', k)}
              className={`h-11 rounded-lg text-body font-bold transition ${form.subject === k ? 'bg-ink text-gold' : 'bg-cream text-muted hover:bg-sand'}`}
            >
              {t(`contact.topics.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="c-msg">{t('contact.message')}</Label>
        <Textarea id="c-msg" value={form.message} onChange={(e) => set('message', e.target.value)} placeholder={t('contact.messagePlaceholder')} />
        <FieldError>{errors.message}</FieldError>
        <p className="mt-2.5 text-tiny font-medium text-muted">{t('contact.messageHint')}</p>
      </div>

      <Checkbox checked={form.consent} onChange={(v) => set('consent', v)} className="mt-5 px-2 [&>span:last-of-type]:text-muted">
        {t('contact.consent')}
      </Checkbox>

      {status === 'sent' && <p className="mt-6 rounded-lg bg-sand p-4 text-small text-bronze">{t('contact.sent')}</p>}

      <button
        type="submit"
        disabled={!ready || status === 'sending'}
        className="mt-[34px] flex h-[52px] w-full items-center rounded-lg bg-ink px-6 text-body font-bold text-white transition disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted"
      >
        <span className="flex-1 text-center">{status === 'sending' ? t('contact.sending') : t('contact.send')}</span>
        <Icon name="send" size={20} className="ltr:-scale-x-100" />
      </button>
    </form>
  )
}

function Faq() {
  const { t } = useTranslation()
  const { data } = useApi(getFaqs)
  const [open, setOpen] = useState<string | null>('f1')

  return (
    <section className="bg-cream pb-[90px]">
      <div className="container-x">
        <div className="border-t border-line pt-[22px]">
          <p className="text-tiny font-medium text-bronze">{t('contact.faqEyebrow')}</p>
          <h2 className="mt-1.5 text-h2 font-bold">{t('contact.faqTitle')}</h2>
        </div>
        <div className="mt-1.5 grid gap-8 lg:grid-cols-[1fr_352px]">
          <div className="flex flex-col gap-3">
            {(data ?? []).map((f) => {
              const isOpen = open === f.id
              return (
                <div key={f.id} className="rounded-lg bg-white">
                  <button onClick={() => setOpen(isOpen ? null : f.id)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 px-8 py-[25px] text-start">
                    <span className="text-body font-bold">{f.question}</span>
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} className="shrink-0 text-bronze" />
                  </button>
                  {isOpen && <p className="-mt-2 px-8 pe-16 pb-[26px] text-small text-muted">{f.answer}</p>}
                </div>
              )
            })}
          </div>
          <aside className="rounded-lg bg-sand px-6 pt-6 pb-6 lg:self-start">
            <p className="text-tiny font-medium text-bronze">{t('contact.guideEyebrow')}</p>
            <h3 className="mt-4 text-h3 font-bold">{t('contact.guideTitle')}</h3>
            <p className="mt-[22px] text-lead text-muted">{t('contact.guideIntro')}</p>
            <div className="mt-12 border-t border-line pt-6">
              <p className="text-body font-bold">{t('contact.guideFinanceTitle')}</p>
              <p className="mt-3 text-small text-muted">{t('contact.guideFinanceText')}</p>
              <p className="mt-[22px] text-body font-bold">{t('contact.guideFollowTitle')}</p>
              <p className="mt-3 text-small text-muted">{t('contact.guideFollowText')}</p>
              <p className="mt-6 text-tiny font-medium text-bronze">{t('contact.safety')}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
