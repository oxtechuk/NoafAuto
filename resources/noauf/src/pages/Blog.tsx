import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { OfferTag } from '@/types'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import ArticleCard from '@/components/ArticleCard'
import Pagination from '@/components/Pagination'
import { useApi } from '@/hooks/useApi'
import { getArticles } from '@/services/content'

const TAGS: (OfferTag | 'all')[] = ['all', 'popular', 'exclusive', 'new', 'limited']

export default function Blog() {
  const { t } = useTranslation()
  const [tag, setTag] = useState<OfferTag | 'all'>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const { data } = useApi(() => getArticles({ tag, search: query, page }), [tag, query, page])
  const featured = data?.featured
  const list = data?.data ?? []

  return (
    <>
      <section className="bg-ink">
        <div className="container-x">
          <div className="border-b border-ink-2 pt-[39px] pb-10">
            <p className="text-small text-gold">{t('blog.breadcrumb')}</p>
            <h1 className="mt-[30px] text-[40px] leading-[52px] font-extrabold text-white md:text-display md:leading-[76px]">{t('blog.title')}</h1>
          </div>
        </div>
      </section>

      {featured && (
        <section className="bg-ink pt-6 pb-8">
          <div className="container-x">
            <div className="grid gap-8 lg:grid-cols-[452px_1fr] lg:gap-12">
              <div className="flex flex-col">
                <div className="flex items-center gap-6">
                  <span className="rounded bg-ink-2 px-2 py-1 text-tiny font-medium text-gold">{featured.category}</span>
                  <span className="text-small text-silver">{featured.date}&nbsp;&nbsp; · &nbsp;&nbsp;{featured.readTime}</span>
                </div>
                <h2 className="mt-8 text-[32px] leading-[44px] font-extrabold text-white md:text-h1 md:leading-[56px]">{featured.title}</h2>
                <p className="mt-5 text-lead text-silver">{featured.excerpt}</p>
                <Button to={`/blog/${featured.slug}`} className="mt-10 h-[52px] w-[224px] lg:mt-auto">
                  <span className="flex-1 text-center">{t('common.readMore')}</span>
                  <Icon name="chevron-right" size={20} />
                </Button>
              </div>
              <Link to={`/blog/${featured.slug}`} className="relative block h-[280px] overflow-hidden rounded-2xl sm:h-[416px] lg:order-none">
                <img src={featured.image} alt="" className="size-full object-cover" />
                <span className="absolute end-6 top-6 flex h-9 w-32 items-center justify-center rounded bg-gold text-small text-ink">{t('blog.editorPick')}</span>
              </Link>
            </div>
            <div className="mt-7 flex justify-between gap-4">
              <p className="text-small text-gold">{t('blog.trends')}</p>
              <p className="text-tiny font-medium text-silver">{t('blog.spotlight')}</p>
            </div>
          </div>
        </section>
      )}

      <section className="bg-cream">
        <div className="container-x">
          <div className="flex flex-col gap-1 pt-[31px] md:flex-row md:items-end md:justify-between">
            <h2 className="text-h3 font-bold">{t('blog.browseTitle')}</h2>
            <p className="text-small text-muted">{t('blog.browseSubtitle')}</p>
          </div>
          <div className="mt-7 flex flex-col gap-4 border-b border-line pb-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar flex gap-3.5 overflow-x-auto">
              {TAGS.map((x) => (
                <button
                  key={x}
                  onClick={() => (setTag(x), setPage(1))}
                  className={`h-12 min-w-[90px] shrink-0 rounded-lg px-3 text-body font-bold transition ${tag === x ? 'bg-ink text-white' : 'bg-sand text-ink hover:bg-line'}`}
                >
                  {x === 'all' ? t('common.all') : t(`offerTags.${x}`)}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setQuery(search)
                setPage(1)
              }}
              className="flex h-12 items-center gap-3 rounded-lg border border-line bg-white px-5 lg:w-[420px]"
            >
              <Icon name="search" size={20} className="text-ink" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('blog.searchPlaceholder')} className="h-full flex-1 bg-transparent text-small outline-none placeholder:text-muted" />
            </form>
          </div>
        </div>
      </section>

      <section className="bg-cream pt-6 pb-12">
        <div className="container-x">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <h2 className="text-h2 font-bold">{t('blog.moreTitle')}</h2>
            <p className="text-small text-muted">{t('blog.moreSubtitle')}</p>
          </div>
          {list.length === 0 && !featured && data && <p className="py-20 text-center text-muted">{t('common.empty')}</p>}
          <div className="mt-[18px] grid gap-8 md:grid-cols-2">
            {list.slice(0, 2).map((a) => (
              <ArticleCard key={a.slug} article={a} variant="dark" />
            ))}
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {list.slice(2).map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
          {data && (
            <div className="mt-12">
              <Pagination variant="labeled" page={page} last={data.meta.lastPage} onChange={setPage} />
            </div>
          )}
        </div>
      </section>

      <section className="bg-sand">
        <div className="container-x">
          <div className="flex flex-col gap-8 border-b border-line pt-[75px] pb-16 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-h2 font-bold">{t('blog.ctaTitle')}</h2>
              <p className="mt-[19px] text-lead text-muted">{t('blog.ctaText')}</p>
            </div>
            <div className="flex flex-wrap gap-5">
              <Button to="/finance/calculator" variant="outline-bronze" className="h-[52px] w-[202px]">{t('common.calculator')}</Button>
              <Button to="/contact" variant="dark" className="h-[52px] w-[190px]">{t('common.contactUs')}</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
