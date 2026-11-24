import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SITE } from '@/lib/constants'
import { asset } from '@/lib/asset'
import Icon from '@/components/ui/Icon'
import { useSiteFavicon } from '@/hooks/useSiteFavicon'

export default function MobileNav() {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const favicon = useSiteFavicon()

  // Close menu on route changes
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const switchLang = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar'
    void i18n.changeLanguage(next)
  }

  const isHome = pathname === '/'

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-40 block border-t border-white/10 bg-[#121418]/95 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-10px_35px_rgba(0,0,0,0.65)] backdrop-blur-2xl md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end justify-items-center">
          {/* 1. Cars / السيارات (Far Right in RTL) */}
          <NavLink
            to="/cars"
            className={({ isActive }) =>
              `group relative flex w-full flex-col items-center justify-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
                isActive ? 'font-bold text-gold' : 'text-slate-400 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex size-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gold/15 text-gold shadow-[0_0_12px_rgba(196,166,76,0.3)] ring-1 ring-gold/40'
                      : 'bg-white/[0.03] text-slate-400 group-hover:bg-white/[0.07] group-hover:text-white'
                  }`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? 2.2 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3.5C2.1 11.4 2 11.7 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </div>
                <span className="text-[11px] leading-tight tracking-tight">{t('nav.cars')}</span>
                {isActive && <span className="size-1 rounded-full bg-gold shadow-[0_0_6px_#c4a64c]" />}
              </>
            )}
          </NavLink>

          {/* 2. Finance / التمويل (Right-Center in RTL) */}
          <NavLink
            to="/finance/calculator"
            className={({ isActive }) =>
              `group relative flex w-full flex-col items-center justify-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
                isActive ? 'font-bold text-gold' : 'text-slate-400 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex size-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gold/15 text-gold shadow-[0_0_12px_rgba(196,166,76,0.3)] ring-1 ring-gold/40'
                      : 'bg-white/[0.03] text-slate-400 group-hover:bg-white/[0.07] group-hover:text-white'
                  }`}
                >
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? 2.2 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="20" x="3" y="2" rx="3" />
                    <line x1="7" x2="17" y1="7" y2="7" />
                    <circle cx="7.5" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                    <circle cx="16.5" cy="12" r="1" fill="currentColor" />
                    <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
                    <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                    <line x1="15.5" x2="17.5" y1="15.5" y2="15.5" strokeWidth={2.2} />
                    <line x1="15.5" x2="17.5" y1="17.5" y2="17.5" strokeWidth={2.2} />
                  </svg>
                </div>
                <span className="text-[11px] leading-tight tracking-tight">{t('nav.finance')}</span>
                {isActive && <span className="size-1 rounded-full bg-gold shadow-[0_0_6px_#c4a64c]" />}
              </>
            )}
          </NavLink>

          {/* 3. Home / الرئيسية - Elevated Center Badge */}
          <NavLink
            to="/"
            end
            className="group relative flex w-full flex-col items-center justify-center pb-0.5 pt-0 transition-transform duration-200 active:scale-95"
            aria-label={t('nav.home') || 'الرئيسية'}
          >
            {/* Elevated Floating Circular Button with ring-4 cradle cutting into top border */}
            <div
              className={`relative -top-5 flex size-[54px] items-center justify-center rounded-full transition-all duration-300 ring-4 ring-[#121418] ${
                isHome
                  ? 'border-2 border-gold bg-gradient-to-b from-[#2d303a] via-[#1a1c22] to-[#121418] shadow-[0_8px_25px_rgba(196,166,76,0.45),0_0_15px_rgba(196,166,76,0.25)]'
                  : 'border border-white/20 bg-gradient-to-b from-[#22242a] to-[#121418] shadow-[0_6px_18px_rgba(0,0,0,0.6)] group-hover:border-gold/60'
              }`}
            >
              {favicon && !imgError ? (
                <div className="flex size-9.5 items-center justify-center rounded-full bg-white/[0.08] p-1">
                  <img
                    src={favicon}
                    alt={t('brand') || 'تعميد'}
                    onError={() => setImgError(true)}
                    className="max-h-7 max-w-7 object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isHome ? 'text-gold' : 'text-slate-300 group-hover:text-gold'}
                >
                  <path d="M3 10.5L12 3l9 7.5" />
                  <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
                  <path d="M9 21V12h6v9" />
                </svg>
              )}
            </div>

            <span
              className={`-mt-3.5 text-[11px] leading-tight tracking-tight transition-colors ${
                isHome ? 'font-bold text-gold' : 'text-slate-300 group-hover:text-white'
              }`}
            >
              {t('nav.home') || 'الرئيسية'}
            </span>
            {isHome && <span className="mt-0.5 size-1 rounded-full bg-gold shadow-[0_0_6px_#c4a64c]" />}
          </NavLink>

          {/* 4. WhatsApp / واتساب - Sleek & Refined Luxury Styling (Left-Center in RTL) */}
          <a
            href={SITE.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex w-full flex-col items-center justify-center gap-1 py-1 text-slate-400 transition-all duration-200 hover:text-emerald-400 active:scale-95"
            aria-label="تواصل عبر واتساب"
          >
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-white/[0.03] text-emerald-400 transition-all duration-200 group-hover:bg-emerald-500/15 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:ring-1 group-hover:ring-emerald-500/40">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <path d="M9.5 9.5c.3-.5.7-.5 1 0l1 1.8c.2.4.1.8-.2 1.1l-.6.6c.4 1 1.4 2 2.4 2.4l.6-.6c.3-.3.7-.4 1.1-.2l1.8 1c.5.3.5.7 0 1-.8.8-2 1.2-3.1.7-2.6-1.2-4.7-3.3-5.9-5.9-.5-1.1-.1-2.3.7-3.1z" />
              </svg>
            </div>
            <span className="text-[11px] leading-tight tracking-tight transition-colors group-hover:text-emerald-400">
              واتساب
            </span>
          </a>

          {/* 5. Menu / القائمة (Far Left in RTL) */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`group relative flex w-full flex-col items-center justify-center gap-1 py-1 transition-all duration-200 active:scale-95 ${
              menuOpen ? 'font-bold text-gold' : 'text-slate-400 hover:text-white'
            }`}
            aria-label="فتح القائمة"
            aria-expanded={menuOpen}
          >
            <div
              className={`flex size-9 items-center justify-center rounded-xl transition-all duration-200 ${
                menuOpen
                  ? 'bg-gold/15 text-gold shadow-[0_0_12px_rgba(196,166,76,0.3)] ring-1 ring-gold/40'
                  : 'bg-white/[0.03] text-slate-400 group-hover:bg-white/[0.07] group-hover:text-white'
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="2" />
                <rect x="14" y="3" width="7" height="7" rx="2" />
                <rect x="14" y="14" width="7" height="7" rx="2" />
                <rect x="3" y="14" width="7" height="7" rx="2" />
              </svg>
            </div>
            <span className="text-[11px] leading-tight tracking-tight">{t('nav.menu') || 'القائمة'}</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Drawer for "القائمة / Menu" */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative z-10 max-h-[82vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#16181b] p-5 pb-10 text-white shadow-2xl transition-transform duration-300">
            {/* Top Drag Indicator */}
            <div className="mx-auto -mt-1 mb-4 h-1.5 w-12 rounded-full bg-white/20" />

            {/* Header */}
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                <img src={asset('/images/logo.png')} alt={t('brand')} className="h-8 w-auto object-contain" />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-silver transition-colors hover:bg-white/20 hover:text-white"
                aria-label={t('common.close') || 'إغلاق'}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Quick Primary Actions */}
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              <Link
                to="/request-car"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gold px-3 py-3 text-center text-xs font-bold text-ink shadow-md transition-transform active:scale-95"
              >
                <Icon name="car" size={16} />
                <span>{t('nav.requestCar')}</span>
              </Link>
              <button
                type="button"
                onClick={switchLang}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-center text-xs font-medium text-silver transition-colors hover:bg-white/10 hover:text-white"
              >
                <span>{i18n.language === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
              </button>
            </div>

            {/* Menu Links Grid */}
            <div className="mb-6 grid grid-cols-2 gap-2.5">
              <Link
                to="/offers"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] p-3 text-start transition-colors hover:bg-white/10"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon name="tag" size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t('nav.offers')}</p>
                  <p className="text-[10px] text-silver">أحدث العروض والخصومات</p>
                </div>
              </Link>

              <Link
                to="/compare"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] p-3 text-start transition-colors hover:bg-white/10"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon name="compare" size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t('nav.compare')}</p>
                  <p className="text-[10px] text-silver">مقارنة المواصفات</p>
                </div>
              </Link>

              <Link
                to="/blog"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] p-3 text-start transition-colors hover:bg-white/10"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon name="send" size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t('nav.blog')}</p>
                  <p className="text-[10px] text-silver">مقالات ونصائح السيارات</p>
                </div>
              </Link>

              <Link
                to="/about"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] p-3 text-start transition-colors hover:bg-white/10"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon name="pin" size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t('nav.about')}</p>
                  <p className="text-[10px] text-silver">من نحن ورؤيتنا</p>
                </div>
              </Link>

              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
                className="col-span-2 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] p-3 text-start transition-colors hover:bg-white/10"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon name="phone" size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{t('nav.contact')}</p>
                  <p className="text-[10px] text-silver">تواصل مع فريق خدمة العملاء</p>
                </div>
              </Link>
            </div>

            {/* Direct Contact Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <a
                href={SITE.phoneHref}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                <Icon name="phone" size={15} />
                <span dir="ltr">{SITE.phone}</span>
              </a>
              <a
                href={SITE.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600/90 py-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
              >
                <Icon name="whatsapp" size={15} />
                <span>واتساب مباشر</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
