import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLegalPage } from '@/services/content'
import Button from '@/components/ui/Button'

interface LegalPageProps {
  slug?: 'privacy' | 'terms'
}

interface LegalData {
  slug: string
  title: string
  content: string
  updated_at?: string
}

export default function LegalPage({ slug: propSlug }: LegalPageProps) {
  const { slug: paramSlug } = useParams<{ slug?: string }>()
  const slug = (propSlug || paramSlug || 'privacy') as 'privacy' | 'terms'
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const [data, setData] = useState<LegalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    getLegalPage(slug)
      .then((res) => {
        if (active) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load legal page:', err)
          setError(isEn ? 'Failed to load page content.' : 'تعذر تحميل محتوى الصفحة.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [slug, i18n.language, isEn])

  const defaultTitle = slug === 'privacy'
    ? (isEn ? 'Privacy Policy' : 'سياسة الخصوصية')
    : (isEn ? 'Terms & Conditions' : 'الشروط والأحكام')

  const title = data?.title || defaultTitle
  const formattedDate = data?.updated_at
    ? new Date(data.updated_at).toLocaleDateString(isEn ? 'en-US' : 'ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Hero Header */}
      <section className="bg-ink text-white">
        <div className="container-x pt-8 pb-14">
          <p className="text-small text-silver">
            <Link to="/" className="hover:text-white">{t('nav.home')}</Link>
            &nbsp;&nbsp; / &nbsp;&nbsp;
            <span>{title}</span>
          </p>
          <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1 text-tiny font-semibold text-gold">
                <span>{slug === 'privacy' ? (isEn ? 'Security & Privacy' : 'الأمان والخصوصية') : (isEn ? 'Legal Terms' : 'المستند القانوني')}</span>
              </div>
              <h1 className="mt-4 text-[32px] font-extrabold leading-tight text-white md:text-[44px]">
                {title}
              </h1>
              {formattedDate && (
                <p className="mt-3 text-small text-silver">
                  {isEn ? `Last updated: ${formattedDate}` : `آخر تحديث: ${formattedDate}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-ink-2 px-4 py-2.5 text-small font-semibold text-white transition hover:bg-[#45464a]"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
                <span>{isEn ? 'Print Document' : 'طباعة المستند'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Document Content */}
      <section className="bg-cream py-12 md:py-16">
        <div className="container-x max-w-[960px]">
          {loading ? (
            <div className="rounded-2xl border border-line bg-white p-8 md:p-14 shadow-sm animate-pulse space-y-6">
              <div className="h-6 w-1/3 bg-gray-200 rounded"></div>
              <div className="h-4 w-full bg-gray-100 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
              <div className="h-4 w-4/6 bg-gray-100 rounded"></div>
              <div className="h-20 bg-gray-50 rounded-lg"></div>
              <div className="h-4 w-full bg-gray-100 rounded"></div>
              <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <p className="text-body font-bold text-red-600">{error}</p>
              <Button
                variant="dark"
                className="mt-6 mx-auto"
                onClick={() => window.location.reload()}
              >
                {isEn ? 'Retry' : 'إعادة المحاولة'}
              </Button>
            </div>
          ) : (
            <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              {/* Document Header Decorator */}
              <div className="border-b border-line/60 bg-sand/40 px-8 py-5 flex items-center justify-between text-tiny text-muted">
                <span className="font-semibold text-ink">نواف أوتو — Noaf Auto</span>
                <span>{slug === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</span>
              </div>

              {/* Formatted Content Body */}
              <div
                className="legal-document-body p-8 md:p-14 text-ink leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data?.content || '' }}
              />

              {/* Document Footer */}
              <div className="border-t border-line/60 bg-sand/30 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-small text-muted">
                <p>
                  {isEn
                    ? 'Questions regarding these terms? Contact us at info@noafauto.com'
                    : 'لأي استفسار بخصوص هذه البنود، يرجى التواصل معنا عبر info@noafauto.com'}
                </p>
                <Link to="/contact" className="font-bold text-gold hover:underline">
                  {t('common.contactUs')} &larr;
                </Link>
              </div>
            </article>
          )}

          {/* Quick Nav Between Terms and Privacy */}
          <div className="mt-8 flex items-center justify-between px-2 text-small">
            {slug === 'privacy' ? (
              <Link to="/terms" className="inline-flex items-center gap-2 font-bold text-gold hover:underline">
                <span>&larr;</span>
                <span>{isEn ? 'View Terms and Conditions' : 'الاطلاع على الشروط والأحكام'}</span>
              </Link>
            ) : (
              <Link to="/privacy" className="inline-flex items-center gap-2 font-bold text-gold hover:underline">
                <span>&larr;</span>
                <span>{isEn ? 'View Privacy Policy' : 'الاطلاع على سياسة الخصوصية'}</span>
              </Link>
            )}
            <Link to="/" className="text-muted hover:text-ink">
              {isEn ? 'Back to Home' : 'العودة للرئيسية'}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
