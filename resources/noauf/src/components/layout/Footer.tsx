import { Link } from 'react-router-dom'
import { asset } from '@/lib/asset'
import { useTranslation } from 'react-i18next'
import { SITE } from '@/lib/constants'



export default function Footer() {
  const { t } = useTranslation()
  const col = 'flex flex-col gap-[15px] text-small text-silver'
  const head = 'mb-6 text-body font-bold text-gold'
  const link = 'hover:text-white transition-colors w-fit'

  return (
    <footer className="hidden md:block bg-ink">
      <div className="container-x pt-16 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[340px_1fr_1fr_1fr] lg:gap-6">
          <div>
            <img src={asset('/images/logo.png')} alt={t('brand')} className="mb-10 h-[47px] w-auto" />
            <p className="text-lead whitespace-pre-line text-silver">{t('footer.tagline')}</p>
          </div>

          <div className="lg:ps-[45px]">
            <h3 className={head}>{t('footer.discover')}</h3>
            <ul className={col}>
              <li><Link className={link} to="/">{t('nav.home')}</Link></li>
              <li><Link className={link} to="/cars">{t('nav.cars')}</Link></li>
              <li><Link className={link} to="/offers">{t('nav.offers')}</Link></li>
              <li><Link className={link} to="/blog">{t('nav.blog')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className={head}>{t('footer.ownYourWay')}</h3>
            <ul className={col}>
              <li><Link className={link} to="/blog/car-finance-guide">{t('footer.carFinance')}</Link></li>
              <li><Link className={link} to="/finance/calculator">{t('footer.calculator')}</Link></li>
              <li><Link className={link} to="/compare">{t('footer.compareCars')}</Link></li>
              <li><Link className={link} to="/cars">{t('footer.cashPurchase')}</Link></li>
              <li><Link className={link} to="/request-car">{t('footer.customRequest')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className={head}>{t('footer.letsTalk')}</h3>
            <ul className={col}>
              <li><Link className={link} to="/contact">{t('nav.contact')}</Link></li>
              <li><Link className={link} to="/about">{t('nav.about')}</Link></li>
              <li><a className={link} href={SITE.phoneHref} dir="ltr">{SITE.phone}</a></li>
              <li><a className={link} href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li>{t('footer.address')}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-ink-2 pt-6 text-small text-silver md:mt-[74px] md:flex-row md:items-center md:justify-between">
          <p>{t('footer.copyright')}</p>
          <p className="flex gap-5">
            <a href="#" className={link}>{t('footer.privacy')}</a>
            <span>/</span>
            <a href="#" className={link}>{t('footer.terms')}</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
