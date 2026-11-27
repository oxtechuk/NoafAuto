import { useState } from 'react'
import { asset } from '@/lib/asset'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'

const NAV_LINKS = [
  { to: '/', key: 'home', end: true },
  { to: '/cars', key: 'cars' },
  { to: '/offers', key: 'offers' },
  { to: '/finance/calculator', key: 'finance' },
  { to: '/compare', key: 'compare' },
  { to: '/about', key: 'about' },
] as const

export default function Navbar({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const dark = variant === 'dark'
  const close = () => setOpen(false)

  const switchLang = () => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')

  return (
    <header className={dark ? 'bg-ink' : 'bg-white'}>
      <div className="container-x">
        <div className={`flex h-20 items-center justify-between gap-6 lg:h-[100px] ${dark ? 'border-b border-ink-2' : ''}`}>
          <Link to="/" className="shrink-0" aria-label={t('brand')}>
            <img src={dark ? asset('/images/logo.png') : asset('/images/logo-dark.png')} alt={t('brand')} className="h-9 w-auto lg:h-[47px]" />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-8 lg:flex xl:gap-10">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={'end' in l}
                className={({ isActive }) =>
                  `text-body font-bold whitespace-nowrap transition-colors ${isActive ? 'text-gold' : dark ? 'text-white hover:text-gold' : 'text-ink hover:text-bronze'}`
                }
              >
                {t(`nav.${l.key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4 lg:gap-8">
            <button onClick={switchLang} className={`w-10 text-small ${dark ? 'text-silver hover:text-white' : 'text-ink hover:text-bronze'}`}>
              {t('nav.switchLang')}
            </button>
            <Button to="/request-car" className="hidden h-[52px] w-[150px] lg:inline-flex">
              {t('nav.requestCar')}
            </Button>
            <button
              className={`lg:hidden ${dark ? 'text-white' : 'text-ink'}`}
              onClick={() => setOpen((v) => !v)}
              aria-label={t('nav.menu')}
              aria-expanded={open}
            >
              <Icon name={open ? 'close' : 'menu'} size={26} />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className={`border-t lg:hidden ${dark ? 'border-ink-2 bg-ink' : 'border-line bg-white'}`}>
          <nav className="container-x flex flex-col py-4">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={'end' in l}
                onClick={close}
                className={({ isActive }) => `py-3 text-body font-bold ${isActive ? 'text-gold' : dark ? 'text-white' : 'text-ink'}`}
              >
                {t(`nav.${l.key}`)}
              </NavLink>
            ))}
            <Button to="/request-car" className="mt-3 h-12" onClick={close}>
              {t('nav.requestCar')}
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
