import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <section className="bg-cream">
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="text-display font-extrabold text-gold">404</p>
        <h1 className="mt-4 text-h2 font-bold">{t('notFound.title')}</h1>
        <p className="mt-3 text-lead text-muted">{t('notFound.text')}</p>
        <Button to="/" variant="dark" className="mt-8 h-12 px-8">{t('notFound.back')}</Button>
      </div>
    </section>
  )
}
