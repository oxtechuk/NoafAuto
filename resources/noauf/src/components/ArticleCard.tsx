import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ArticleSummary } from '@/types'
import Icon from '@/components/ui/Icon'

/** Two variants from the blog frame: large dark card (560×480) and small light card (363×416). */
export default function ArticleCard({ article, variant = 'light' }: { article: ArticleSummary; variant?: 'dark' | 'light' }) {
  const { t } = useTranslation()
  const dark = variant === 'dark'
  return (
    <Link
      to={`/blog/${article.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-line transition hover:-translate-y-0.5 hover:shadow-lg ${dark ? 'bg-ink' : 'bg-white'}`}
    >
      <div className={`overflow-hidden ${dark ? 'h-[242px]' : 'h-[176px]'}`}>
        <img src={article.image} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className={`flex flex-1 flex-col ${dark ? 'px-6 pt-[18px] pb-4' : 'px-5 pt-[17px] pb-5'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={dark ? 'text-small text-gold' : 'text-tiny font-medium text-bronze'}>{article.category}</span>
          <span className={`text-tiny font-medium ${dark ? 'text-silver' : 'text-muted'}`}>
            {article.date}&nbsp; · &nbsp;{article.readTime}
          </span>
        </div>
        <h3 className={`mt-4 font-bold ${dark ? 'text-h3 text-white' : 'text-body text-ink'}`}>{article.title}</h3>
        <p className={`mt-2 text-small ${dark ? 'text-silver' : 'text-muted'}`}>{article.excerpt}</p>
        <div className={`mt-auto flex items-center justify-between pt-4 ${dark ? 'mt-3 border-t border-ink-2' : ''}`}>
          <span className={`text-body font-bold ${dark ? 'text-gold' : 'text-bronze'}`}>{t('common.readMore')}</span>
          <Icon name="chevron-right" size={18} className={`${dark ? 'text-gold' : 'text-bronze'}`} />
        </div>
      </div>
    </Link>
  )
}
