import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import ArticleCard from '@/components/ArticleCard'
import { useApi } from '@/hooks/useApi'
import { getArticle, getRelatedArticles } from '@/services/content'

/** Article detail — designed in Figma as "دليل تمويل السيارات" (finance guide). */
export default function Article() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const { data: a, loading } = useApi(() => getArticle(slug), [slug])
  const { data: related } = useApi(() => getRelatedArticles(slug), [slug])
  const [activeId, setActiveId] = useState<string>()

  // Highlight the table-of-contents entry for the section in view
  useEffect(() => {
    if (!a) return
    const obs = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActiveId(e.target.id)), { rootMargin: '-30% 0px -60% 0px' })
    a.sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [a])

  if (loading && !a) return <div className="min-h-[60vh] bg-ink" />
  if (!a) return <p className="container-x py-32 text-center text-muted">{t('article.notFound')}</p>

  return (
    <>
      <section className="bg-ink">
        <div className="container-x pt-[35px] pb-[22px]">
          <p className="text-small text-silver">
            <Link to="/" className="hover:text-white">{t('nav.home')}</Link>&nbsp; / &nbsp;<Link to="/blog" className="hover:text-white">{t('article.breadcrumbBlog')}</Link>&nbsp; / &nbsp;{t('article.breadcrumbGuide')}
          </p>
          <div className="mt-11 flex flex-col gap-8 lg:flex-row lg:justify-between">
            <div className="max-w-[800px]">
              <h1 className="text-[38px] leading-[50px] font-extrabold text-white md:text-display md:leading-[76px]">{a.title}</h1>
              <p className="mt-6 text-lead text-silver">{a.subtitle}</p>
            </div>
            <div className="w-full shrink-0 border-b border-ink-2 pb-6 lg:mt-[63px] lg:w-[288px] lg:self-start">
              <p className="text-body font-bold text-white">{a.date}</p>
              <p className="mt-3.5 text-small text-silver">{t('article.readTime', { time: a.readTime })}</p>
            </div>
          </div>
          <img src={a.cover} alt="" className="mt-10 h-[260px] w-full rounded-2xl object-cover sm:h-[400px]" />
          <div className="mt-[22px] flex justify-between gap-4">
            <p className="text-small text-gold">{t('article.dated')}</p>
            <p className="text-tiny font-medium text-silver">{t('article.credit')}</p>
          </div>
        </div>
      </section>

      <section className="bg-cream pt-16 pb-16">
        <div className="container-x grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-[72px]">
          <article className="flex max-w-[760px] flex-col gap-14">
            {a.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-8">
                <p className="text-tiny font-medium text-bronze">{t('article.sectionLabel', { n: String(i + 1).padStart(2, '0') })}</p>
                <h2 className="mt-3 text-[28px] leading-[38px] font-bold md:text-h2 md:leading-[46px]">{s.title}</h2>
                {s.options && (
                  <div className="mt-6 flex flex-col gap-3">
                    {s.options.map((o, k) => (
                      <div key={k} className="flex items-center justify-between gap-6 rounded-lg border border-line bg-white px-6 py-4">
                        <div>
                          <h3 className="text-h3 font-bold">{o.title}</h3>
                          <p className="mt-1 text-lead text-muted">{o.description}</p>
                        </div>
                        <span className="text-h3 font-bold text-bronze">{String(k + 1).padStart(2, '0')}</span>
                      </div>
                    ))}
                  </div>
                )}
                {s.paragraphs?.map((p, k) => (
                  <p key={k} className="mt-5 text-lead first-of-type:mt-6">{p}</p>
                ))}
                {s.callout && (
                  <blockquote className="mt-6 rounded-lg bg-sand px-7 py-6">
                    <p className="border-s-[3px] border-bronze ps-[22px] text-h3 font-bold">{s.callout}</p>
                  </blockquote>
                )}
                {s.note && <p className="mt-6 text-lead text-muted">{s.note}</p>}
              </section>
            ))}
            <div className="border-t border-line pt-5 text-small text-muted">{t('article.end')}</div>
          </article>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:order-first lg:self-start">
            <nav className="rounded-2xl border border-line bg-white px-4 pt-[26px] pb-10">
              <h3 className="px-2 text-h3 font-bold">{t('article.toc')}</h3>
              <ol className="mt-[22px] flex flex-col gap-1.5">
                {a.sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className={`flex h-12 items-center justify-between rounded-lg px-3 text-body font-bold transition ${activeId === s.id || (!activeId && i === 0) ? 'bg-sand' : 'hover:bg-cream'}`}>
                      <span>{s.toc}</span>
                      <span className="text-bronze">{String(i + 1).padStart(2, '0')}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {a.figures.length > 0 && (
              <div className="rounded-2xl bg-ink px-6 pt-6 pb-8">
                <h3 className="text-body font-bold text-gold">{t('article.figures')}</h3>
                {a.figures.map((f, i) => (
                  <div key={i} className={`py-5 ${i < a.figures.length - 1 ? 'border-b border-ink-2' : ''} ${i === 0 ? 'pt-5' : ''}`}>
                    <p className="text-h3 font-bold text-gold">{f.value}</p>
                    <p className="mt-1.5 text-small text-silver">{f.label}</p>
                  </div>
                ))}
                <p className="mt-10 text-tiny font-medium text-silver">{t('article.figuresSource', { date: a.date })}</p>
              </div>
            )}

            <div className="rounded-2xl bg-sand px-6 pt-6 pb-16">
              <h3 className="text-h3 font-bold">{t('article.noticeTitle')}</h3>
              <p className="mt-5 text-small text-muted">{t('article.noticeText')}</p>
            </div>

            <div className="rounded-2xl border border-line bg-white px-6 pt-6 pb-5">
              <h3 className="text-body font-bold">{t('article.calcTitle')}</h3>
              <p className="mt-3 text-small text-muted">{t('article.calcText')}</p>
              <Button to="/finance/calculator" variant="dark" className="mt-[34px] h-11 w-full">{t('common.calculator')}</Button>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-sand">
        <div className="container-x flex flex-col gap-8 pt-10 pb-14 lg:flex-row lg:justify-between">
          <div>
            <h2 className="text-h2 font-bold">{t('article.nextTitle')}</h2>
            <p className="mt-5 text-lead text-muted">{t('article.nextText')}</p>
          </div>
          <div className="lg:w-[494px]">
            <p className="text-small text-bronze">{t('article.nextEyebrow')}</p>
            <div className="mt-[30px] flex flex-wrap gap-5">
              <Button to="/finance/calculator" variant="outline-bronze" className="h-[52px] w-[202px]">{t('common.calculator')}</Button>
              <Button to="/offers" variant="dark" className="h-[52px] w-[210px]">{t('article.exploreFinance')}</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream pt-10 pb-[60px]">
        <div className="container-x">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-h2 font-bold">{t('article.relatedTitle')}</h2>
            <Button to="/blog" variant="outline" className="h-12 w-[176px]">{t('article.allArticles')}</Button>
          </div>
          <div className="mt-9 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {(related ?? []).map((r) => (
              <ArticleCard key={r.slug} article={r} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
