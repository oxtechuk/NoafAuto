import type { Article, ArticleSummary, Brand, FaqItem, Offer, OfferTag, Testimonial } from '@/types'
import { articles, brands, faqs, financeGuide, offerTagLabels, offers, partners, testimonials } from '@/data/content'
import { SitekitApi } from '@/sitekit-sdk/client'
import { toArticle, toArticleSummary, toBrand, toFaq, toOffer, toTestimonial } from '@/sitekit-sdk/mappers'
import type { SkFooter, SkHomeData } from '@/sitekit-sdk/types'
import { cached, peekCached } from '@/lib/requestCache'
import { USE_MOCK, mock, tr } from './api'

/** GET /home — on the first visit it comes inlined in the page (window.__BOOT_HOME__). */
export const getHome = () => cached<SkHomeData>('home', SitekitApi.home, 60_000)
export const peekHome = () => peekCached<SkHomeData>('home', 60_000)

/** GET /settings/footer — inlined in every page as window.__BOOT_SETTINGS__. */
export const getFooter = () => cached<SkFooter>('footer', SitekitApi.footer)
export const peekFooter = () => peekCached<SkFooter>('footer')

/** GET /offers?tag= */
export async function getOffers(tag: OfferTag | 'all' = 'all'): Promise<{ featured: Offer | null; data: Offer[] }> {
  if (!USE_MOCK) {
    const page = await cached(`offers:${tag}`, () => SitekitApi.offers({ per_page: 24, tag: tag === 'all' ? undefined : tag }), 60_000)
    const [first, ...rest] = page.data
    // The first (newest active) offer is the hero card when showing all offers.
    if (tag === 'all' && first) return { featured: toOffer(first, true), data: (rest.length > 0 ? rest : page.data).map((o) => toOffer(o)) }
    return { featured: null, data: page.data.map((o) => toOffer(o)) }
  }
  const all = offers.map((o) => ({ ...o, title: tr(o.title), benefit: tr(o.benefit), tagLabel: tr(offerTagLabels[o.tag]) }))
  const featured = all.find((o) => o.featured) ?? null
  const list = all.filter((o) => !o.featured && (tag === 'all' || o.tag === tag))
  return mock({ featured, data: list })
}

const toSummary = (a: (typeof articles)[number]): ArticleSummary => ({
  slug: a.slug,
  title: tr(a.title),
  excerpt: tr(a.excerpt),
  category: tr(a.category),
  date: tr(a.date),
  readTime: tr(a.readTime),
  image: a.image,
  tag: a.tag,
})

/** GET /articles?tag=&search=&page= */
export async function getArticles(params: { tag?: OfferTag | 'all'; search?: string; page?: number } = {}) {
  if (!USE_MOCK) {
    const query = { page: params.page ?? 1, per_page: 9, tag: params.tag === 'all' ? undefined : params.tag }
    const page = await cached(`blog:${JSON.stringify(query)}`, () => SitekitApi.blog(query))
    const featuredPosts = (page.meta.featured_posts as Parameters<typeof toArticleSummary>[0][] | undefined) ?? []
    let list = page.data.map(toArticleSummary)
    const featured = featuredPosts[0] ? toArticleSummary(featuredPosts[0]) : list[0]
    const q = params.search?.trim()
    if (q) list = list.filter((a) => a.title.includes(q) || a.excerpt.includes(q))
    return {
      featured,
      data: list.filter((a) => a.slug !== featured?.slug),
      meta: { currentPage: page.meta.current_page, lastPage: page.meta.last_page },
    }
  }
  let list = articles.map(toSummary)
  const featured = list[0]
  if (params.tag && params.tag !== 'all') list = list.filter((a) => a.tag === params.tag)
  const q = params.search?.trim()
  if (q) list = list.filter((a) => a.title.includes(q) || a.excerpt.includes(q))
  return mock({ featured, data: list.filter((a) => a.slug !== featured.slug), meta: { currentPage: params.page ?? 1, lastPage: 10 } })
}

/** Article detail and related posts come from one endpoint; share the request. */
const postRequests = new Map<string, ReturnType<typeof SitekitApi.blogPost>>()
function loadPost(slug: string) {
  if (!postRequests.has(slug)) {
    postRequests.set(slug, SitekitApi.blogPost(slug).catch((error) => (postRequests.delete(slug), Promise.reject(error))))
  }
  return postRequests.get(slug)!
}

/** GET /legal/{slug} */
export const getLegalPage = (slug: string) => cached(`legal:${slug}`, () => SitekitApi.legalPage(slug))

/** GET /articles/{slug} */
export async function getArticle(slug: string): Promise<Article | null> {
  if (!USE_MOCK) {
    try {
      return toArticle(await loadPost(slug))
    } catch {
      return null
    }
  }
  const a = articles.find((x) => x.slug === slug)
  if (!a) return mock(null)
  return mock({
    ...toSummary(a),
    subtitle: tr(financeGuide.subtitle),
    cover: a.slug === 'car-finance-guide' ? financeGuide.cover : a.image,
    sections: financeGuide.sections.map((s) => ({
      id: s.id,
      title: tr(s.title),
      toc: tr(s.toc),
      paragraphs: s.paragraphs?.map(tr),
      options: s.options?.map((o) => ({ title: tr(o.title), description: tr(o.description) })),
      callout: s.callout ? tr(s.callout) : undefined,
      note: s.note ? tr(s.note) : undefined,
    })),
    figures: financeGuide.figures.map((f) => ({ value: tr(f.value), label: tr(f.label) })),
  })
}

/** GET /articles/{slug}/related */
export async function getRelatedArticles(slug: string): Promise<ArticleSummary[]> {
  if (!USE_MOCK) {
    try {
      return ((await loadPost(slug)).related_posts ?? []).map(toArticleSummary)
    } catch {
      return []
    }
  }
  return mock(articles.filter((a) => a.slug !== slug).slice(0, 3).map(toSummary))
}

/** GET /brands */
export async function getBrands(): Promise<Brand[]> {
  if (!USE_MOCK) return (await cached('brands', SitekitApi.brands)).map(toBrand)
  return mock(brands)
}

/** GET /partners */
export async function getPartners(): Promise<Brand[]> {
  if (!USE_MOCK) return (await cached('partners', SitekitApi.partners)).map(toBrand)
  return mock(partners)
}

/** GET /testimonials */
export async function getTestimonials(): Promise<Testimonial[]> {
  if (!USE_MOCK) return (await cached('testimonials', SitekitApi.testimonials)).map(toTestimonial)
  return mock(testimonials.map((t) => ({ id: t.id, name: tr(t.name), role: tr(t.role), quote: tr(t.quote), avatar: t.avatar, rating: 5 })))
}

/** GET /faqs */
export async function getFaqs(): Promise<FaqItem[]> {
  if (!USE_MOCK) return (await cached('faqs', SitekitApi.faqs)).map(toFaq)
  return mock(faqs.map((f) => ({ id: f.id, question: tr(f.question), answer: tr(f.answer) })))
}
