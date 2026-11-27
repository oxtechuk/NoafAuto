import Skeleton from '@/components/ui/Skeleton'
import { CarCardSkeleton } from './HomeSkeleton'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Grid of CarCard placeholders (cars listing). */
export function CarGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-busy="true">
      {range(count).map((i) => (
        <CarCardSkeleton key={i} className="" />
      ))}
    </div>
  )
}

/** ArticleCard placeholder: dark (560×480) or light (363×416). */
export function ArticleCardSkeleton({ variant = 'light' }: { variant?: 'dark' | 'light' }) {
  const dark = variant === 'dark'
  return (
    <div aria-hidden="true" className={`flex flex-col overflow-hidden rounded-2xl border border-line ${dark ? 'bg-ink' : 'bg-white'}`}>
      <Skeleton dark={dark} className={`rounded-none ${dark ? 'h-[242px]' : 'h-[176px]'}`} />
      <div className={dark ? 'px-6 pt-[18px] pb-4' : 'px-5 pt-[17px] pb-5'}>
        <div className="flex justify-between gap-3">
          <Skeleton dark={dark} className="h-3 w-20" />
          <Skeleton dark={dark} className="h-3 w-28" />
        </div>
        <Skeleton dark={dark} className="mt-4 h-5 w-4/5" />
        <Skeleton dark={dark} className="mt-3 h-3.5 w-full" />
        <Skeleton dark={dark} className="mt-2 h-3.5 w-2/3" />
        <Skeleton dark={dark} className="mt-6 h-4 w-24" />
      </div>
    </div>
  )
}

/** Blog listing body: 2 dark + 3 light cards, same grid as the page. */
export function ArticleListSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <div className="mt-[18px] grid gap-8 md:grid-cols-2">
        <ArticleCardSkeleton variant="dark" />
        <ArticleCardSkeleton variant="dark" />
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {range(3).map((i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/** Blog featured-post block (dark). */
export function FeaturedPostSkeleton() {
  return (
    <section className="bg-ink pt-6 pb-8" aria-hidden="true">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-[452px_1fr] lg:gap-12">
          <div>
            <Skeleton dark className="h-6 w-48" />
            <Skeleton dark className="mt-8 h-10 w-full" />
            <Skeleton dark className="mt-3 h-10 w-3/4" />
            <Skeleton dark className="mt-5 h-4 w-full" />
            <Skeleton dark className="mt-2 h-4 w-2/3" />
            <Skeleton dark className="mt-10 h-[52px] w-[224px]" />
          </div>
          <Skeleton dark className="h-[280px] rounded-2xl sm:h-[416px]" />
        </div>
      </div>
    </section>
  )
}

/** OfferCard placeholder. */
export function OfferCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col overflow-hidden rounded-[19px] border border-line bg-ink">
      <Skeleton dark className="h-[226px] rounded-none" />
      <div className="p-6">
        <Skeleton dark className="h-6 w-3/4" />
        <Skeleton dark className="mt-3 h-4 w-1/2" />
        <div className="mt-6 flex gap-3">
          {range(3).map((i) => (
            <Skeleton key={i} dark className="h-[60px] flex-1" />
          ))}
        </div>
        <Skeleton dark className="mt-6 h-12 w-full" />
      </div>
    </div>
  )
}

export function OfferGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
      {range(count).map((i) => (
        <OfferCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Featured offer (dark split card). */
export function FeaturedOfferSkeleton() {
  return (
    <div aria-hidden="true" className="grid overflow-hidden rounded-lg bg-ink lg:grid-cols-2">
      <div className="px-6 py-8 lg:px-8">
        <Skeleton dark className="h-[30px] w-40" />
        <Skeleton dark className="mt-6 h-9 w-3/4" />
        <Skeleton dark className="mt-3 h-6 w-1/2" />
        <div className="mt-10 flex gap-3">
          {range(4).map((i) => (
            <Skeleton key={i} dark className="h-[72px] w-[84px]" />
          ))}
        </div>
        <Skeleton dark className="mt-[26px] h-12 w-[200px]" />
      </div>
      <Skeleton dark className="h-[260px] rounded-none lg:h-auto" />
    </div>
  )
}

/** Car details page: identity header, gallery and the ownership panel. */
export function CarDetailsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <section className="bg-ink">
        <div className="container-x pt-6 pb-7">
          <Skeleton dark className="h-4 w-56" />
          <Skeleton dark className="mt-[30px] h-5 w-40" />
          <Skeleton dark className="mt-3 h-12 w-80 max-w-full md:h-16" />
        </div>
      </section>
      <section className="bg-ink pt-4 pb-8">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[368px_1fr]">
            <div>
              <Skeleton dark className="h-[280px] rounded-2xl sm:h-[440px]" />
              <div className="mt-4 flex gap-3">
                {range(4).map((i) => (
                  <Skeleton key={i} dark className="h-16 flex-1 rounded-lg" />
                ))}
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {range(4).map((i) => (
                  <Skeleton key={i} dark className="h-[84px] rounded-xl" />
                ))}
              </div>
              <Skeleton dark className="mt-8 h-[260px] rounded-2xl" />
              <div className="mt-6 flex flex-wrap gap-4">
                <Skeleton dark className="h-[52px] w-[200px]" />
                <Skeleton dark className="h-[52px] w-[200px]" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-cream py-12">
        <div className="container-x grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {range(8).map((i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      </section>
    </div>
  )
}

/** Article page: dark header with cover, then the body column. */
export function ArticleSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <section className="bg-ink">
        <div className="container-x pt-[35px] pb-[22px]">
          <Skeleton dark className="h-4 w-56" />
          <Skeleton dark className="mt-11 h-12 w-full max-w-[800px] md:h-16" />
          <Skeleton dark className="mt-3 h-12 w-2/3 max-w-[560px] md:h-16" />
          <Skeleton dark className="mt-6 h-5 w-full max-w-[640px]" />
          <Skeleton dark className="mt-10 h-[260px] rounded-2xl sm:h-[400px]" />
        </div>
      </section>
      <section className="bg-cream pt-16 pb-16">
        <div className="container-x grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-[72px]">
          <div className="hidden space-y-3 lg:block">
            {range(5).map((i) => (
              <Skeleton key={i} className="h-4 w-4/5" />
            ))}
          </div>
          <div className="max-w-[760px] space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-2/3" />
            {range(6).map((i) => (
              <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-3/5' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/** FAQ accordion rows. */
export function FaqSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      {range(count).map((i) => (
        <div key={i} className="flex items-center justify-between gap-6 rounded-lg bg-white px-8 py-[25px]">
          <Skeleton className={`h-4 ${i % 2 ? 'w-1/2' : 'w-2/3'}`} />
          <Skeleton className="size-5 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Partner logo tiles (About). */
export function LogoGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {range(count).map((i) => (
        <Skeleton key={i} className="h-[100px] rounded-lg" />
      ))}
    </>
  )
}

/** Testimonial cards (About). */
export function TestimonialSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {range(count).map((i) => (
        <div key={i} aria-hidden="true" className={`flex min-h-[304px] flex-col rounded-lg px-6 pt-5 pb-7 ${i === 1 ? 'bg-sand' : 'bg-white'}`}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-auto flex items-center gap-6 pt-6">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
