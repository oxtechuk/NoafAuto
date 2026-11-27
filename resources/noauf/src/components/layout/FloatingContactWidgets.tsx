import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SitekitApi } from '@/sitekit-sdk/client'
import type { SkFooter } from '@/sitekit-sdk/types'
import { useSiteFavicon } from '@/hooks/useSiteFavicon'
import { SITE } from '@/lib/constants'

/** Clean a phone number for wa.me links */
function formatWhatsAppUrl(rawNumber: string, message: string): string {
  const digits = rawNumber.replace(/\D/g, '')
  let international = digits
  if (digits.startsWith('05')) {
    international = '966' + digits.slice(1)
  } else if (digits.startsWith('5') && digits.length === 9) {
    international = '966' + digits
  } else if (!digits.startsWith('966') && digits.length === 10) {
    international = '966' + digits.slice(1)
  }
  const textParam = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${international || '966550000000'}${textParam}`
}

/** Format display phone */
function formatDisplayPhone(phone: string): string {
  if (!phone) return SITE.phone
  return phone
}

export default function FloatingContactWidgets() {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const siteFavicon = useSiteFavicon()

  const [footerData, setFooterData] = useState<SkFooter | null>(null)
  const [openCard, setOpenCard] = useState(false)
  const [badgeDismissed, setBadgeDismissed] = useState(() => {
    try {
      return localStorage.getItem('noaf_floating_badge_seen') === 'true'
    } catch {
      return false
    }
  })
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    SitekitApi.footer()
      .then((data) => {
        if (active) setFooterData(data)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  // Close card when clicking outside or pressing Escape
  useEffect(() => {
    if (!openCard) return

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpenCard(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCard(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openCard])

  const widgetsConfig = footerData?.floating_widgets
  if (widgetsConfig?.enabled === false) {
    return null
  }

  const rawPhone = widgetsConfig?.phone || footerData?.contact.phone || SITE.phone
  const rawWhatsApp = widgetsConfig?.whatsapp || footerData?.contact.whatsapp || rawPhone
  const defaultMsg =
    widgetsConfig?.whatsapp_message ||
    (isEn
      ? 'Hello Noaf Auto, I would like to inquire about car details and financing offers.'
      : 'مرحباً نواف أوتو، أود الاستفسار عن تفاصيل السيارات وعروض التمويل المتاحة.')

  const waUrl = formatWhatsAppUrl(rawWhatsApp, defaultMsg)
  const phoneHref = `tel:${rawPhone.replace(/\s+/g, '')}`
  const showBadge = (widgetsConfig?.show_badge ?? true) && !badgeDismissed

  const handleToggleCard = () => {
    setOpenCard((prev) => !prev)
    if (!badgeDismissed) {
      setBadgeDismissed(true)
      try {
        localStorage.setItem('noaf_floating_badge_seen', 'true')
      } catch {}
    }
  }

  const effectiveFavicon = siteFavicon || footerData?.favicon

  return (
    <div
      ref={cardRef}
      className="fixed left-6 bottom-8 z-50 hidden md:flex flex-col items-center gap-3.5 select-none print:hidden"
      dir="rtl"
    >
      {/* Quick Contact Modal / Popover Card */}
      {openCard && (
        <div className="absolute left-0 bottom-[125px] w-[320px] rounded-2xl border border-line/70 bg-white/95 p-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-line/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-ink text-gold">
                {effectiveFavicon ? (
                  <img src={effectiveFavicon} alt="" className="size-4 object-contain" />
                ) : (
                  <svg viewBox="0 0 24 24" className="size-4 text-gold fill-current">
                    <rect x="3" y="19" width="18" height="2" rx="1" />
                    <rect x="5" y="13" width="3.5" height="4" rx="0.75" />
                    <rect x="10.25" y="9" width="3.5" height="8" rx="0.75" />
                    <rect x="15.5" y="5" width="3.5" height="12" rx="0.75" />
                  </svg>
                )}
              </span>
              <div>
                <h4 className="text-small font-bold text-ink">
                  {isEn ? 'Noaf Auto Team' : 'فريق نواف أوتو'}
                </h4>
                <div className="flex items-center gap-1.5 text-tiny text-emerald-600 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isEn ? 'Available now' : 'متاحون لخدمتك الآن'}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenCard(false)}
              className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-sand/60 hover:text-ink transition"
              aria-label="Close"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <p className="mt-3 text-tiny text-muted leading-relaxed">
            {isEn
              ? 'Have questions about car specs, cash purchase, or financing calculator? Connect with us directly:'
              : 'هل لديك استفسار عن مواصفات سيارة أو عروض التمويل والأقساط؟ تواصل مع مستشارينا مباشرة:'}
          </p>

          <div className="mt-4 space-y-2.5">
            {/* Direct Call */}
            <a
              href={phoneHref}
              className="flex items-center justify-between rounded-xl border border-line bg-cream px-3.5 py-2.5 text-small font-bold text-ink hover:border-gold hover:bg-sand/40 transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-ink text-white group-hover:bg-gold group-hover:text-ink transition">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <p className="text-tiny font-medium text-muted">{isEn ? 'Call Us Directly' : 'اتصال هاتفي مباشر'}</p>
                  <p className="text-small font-bold text-ink" dir="ltr">{formatDisplayPhone(rawPhone)}</p>
                </div>
              </div>
              <span className="text-tiny font-bold text-gold group-hover:translate-x-[-2px] transition-transform">
                &larr;
              </span>
            </a>

            {/* Direct WhatsApp */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-small font-bold text-emerald-900 hover:bg-emerald-100/70 transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#25D366] text-white">
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.48 0-2.93-.39-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28s-1.44-.71-1.66-.79c-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.53.06s-1.06-.39-2.02-1.25c-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.55-.42-.14-.01-.3-.01-.46-.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-tiny font-medium text-emerald-700">{isEn ? 'WhatsApp Chat' : 'محادثة فورية واتساب'}</p>
                  <p className="text-small font-bold text-emerald-950">{isEn ? 'Instant Reply' : 'رد فوري على مدار الساعة'}</p>
                </div>
              </div>
              <span className="text-tiny font-bold text-emerald-700 group-hover:translate-x-[-2px] transition-transform">
                &larr;
              </span>
            </a>

            {/* Custom Car Request link */}
            <Link
              to="/request-car"
              onClick={() => setOpenCard(false)}
              className="flex items-center justify-between rounded-xl px-3.5 py-2 text-tiny font-semibold text-muted hover:bg-sand/50 hover:text-ink transition"
            >
              <span>{isEn ? 'Custom Car Request' : 'طلب سيارة بمواصفات خاصة'}</span>
              <span>&larr;</span>
            </Link>

            {/* Contact Page link */}
            <Link
              to="/contact"
              onClick={() => setOpenCard(false)}
              className="flex items-center justify-between rounded-xl px-3.5 py-2 text-tiny font-semibold text-muted hover:bg-sand/50 hover:text-ink transition"
            >
              <span>{isEn ? 'Full Contact & Branches Page' : 'صفحة التواصل الكاملة والفروع'}</span>
              <span>&larr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* Top Button: Contact Us (Favicon + Red Notification Badge) */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleToggleCard}
          aria-label={isEn ? 'Contact Us' : 'تواصل معنا'}
          className={`relative flex size-[54px] items-center justify-center rounded-full bg-[#111827] text-gold shadow-xl border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
            openCard ? 'ring-2 ring-gold/60 scale-105' : ''
          }`}
        >
          {effectiveFavicon ? (
            <img src={effectiveFavicon} alt="" className="size-6 object-contain" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-6 text-gold fill-current">
              <rect x="3" y="19" width="18" height="2" rx="1" />
              <rect x="5" y="13" width="3.5" height="4" rx="0.75" />
              <rect x="10.25" y="9" width="3.5" height="8" rx="0.75" />
              <rect x="15.5" y="5" width="3.5" height="12" rx="0.75" />
            </svg>
          )}

          {/* Red Notification Badge */}
          {showBadge && (
            <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-3.5 rounded-full bg-red-500 ring-2 ring-white" />
            </span>
          )}
        </button>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute start-[66px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-tiny font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          {isEn ? 'Contact Us' : 'تواصل معنا'}
          <div className="absolute -start-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-ink" />
        </div>
      </div>

      {/* Bottom Button: WhatsApp with Soft Pulsing Halo */}
      <div className="relative group">
        {/* Soft light-green pulsing halo as in screenshot */}
        <div className="absolute -inset-2.5 -z-10 rounded-full bg-emerald-500/15 animate-pulse pointer-events-none" />

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={isEn ? 'Chat on WhatsApp' : 'تواصل عبر واتساب'}
          className="relative flex size-[54px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <svg className="size-7 fill-current" viewBox="0 0 24 24">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.48 0-2.93-.39-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28s-1.44-.71-1.66-.79c-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.53.06s-1.06-.39-2.02-1.25c-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.55-.42-.14-.01-.3-.01-.46-.01" />
          </svg>
        </a>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute start-[66px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-tiny font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          {isEn ? 'WhatsApp Chat' : 'تواصل عبر واتساب'}
          <div className="absolute -start-1 top-1/2 -translate-y-1/2 size-2 rotate-45 bg-ink" />
        </div>
      </div>
    </div>
  )
}
