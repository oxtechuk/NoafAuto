import Skeleton from '@/components/ui/Skeleton'

const cardW = 'w-[300px] shrink-0 sm:w-[355px]'

/** Same footprint as CarCard (355×450) so the page doesn't jump when cars arrive. */
export function CarCardSkeleton({ className = cardW }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex min-h-[450px] flex-col overflow-hidden rounded-2xl border border-line bg-cream ${className}`}>
      <div className="px-5 pt-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="mt-4 h-[150px] w-full rounded-xl" />
      </div>
      <div className="mt-4 flex flex-1 flex-col bg-ink px-5 pt-4 pb-5">
        <Skeleton dark className="h-3 w-3/4" />
        <div className="mt-4 h-px bg-ink-2" />
        <div className="mt-4 flex justify-between">
          <Skeleton dark className="h-7 w-24" />
          <Skeleton dark className="h-7 w-20" />
        </div>
        <div className="mt-auto flex gap-5 pt-4">
          <Skeleton dark className="h-[46px] flex-1" />
          <Skeleton dark className="h-[46px] flex-1" />
        </div>
      </div>
    </div>
  )
}

export function CarRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-6 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <CarCardSkeleton key={i} />
      ))}
    </div>
  )
}

function HeadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-3.5 w-56 max-w-full" />
      </div>
      <Skeleton className="h-12 w-[184px]" />
    </div>
  )
}

/** Homepage placeholder shown while GET /home loads (mirrors Hero, finder, brands and car rows). */
export default function HomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Hero */}
      <section className="bg-ink">
        <div className="container-x">
          <div className="grid gap-12 border-b border-ink-2 pt-10 pb-24 lg:grid-cols-[1fr_614px] lg:gap-[82px] lg:pt-[46px] lg:pb-[99px]">
            <div>
              <Skeleton dark className="h-4 w-32" />
              <Skeleton dark className="mt-6 h-12 w-full max-w-[520px] md:h-16" />
              <Skeleton dark className="mt-3 h-12 w-3/4 max-w-[420px] md:h-16" />
              <Skeleton dark className="mt-6 h-4 w-full max-w-[452px]" />
              <Skeleton dark className="mt-2 h-4 w-2/3 max-w-[340px]" />
              <div className="mt-9 flex flex-wrap gap-5">
                <Skeleton dark className="h-[52px] w-[204px]" />
                <Skeleton dark className="h-[52px] w-[232px]" />
              </div>
            </div>
            <div className="relative mt-4 lg:mt-[45px]">
              <Skeleton dark className="h-[300px] rounded-3xl sm:h-[394px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Car finder */}
      <section className="bg-cream pt-24 pb-[30px] lg:pt-7">
        <div className="container-x">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-9 w-64 max-w-full" />
          <Skeleton className="mt-[18px] h-[200px] rounded-2xl lg:h-[102px]" />
        </div>
      </section>

      {/* Brands */}
      <section className="bg-cream">
        <div className="container-x">
          <div className="flex flex-col gap-6 border-t border-line py-8 lg:h-[142px] lg:flex-row lg:items-center lg:gap-14 lg:py-0">
            <Skeleton className="h-8 w-[168px]" />
            <div className="flex flex-1 gap-8 overflow-hidden sm:gap-12">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="size-[80px] shrink-0 rounded-full sm:size-[92px]" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Latest cars */}
      <section className="bg-white pt-8 pb-[22px]">
        <div className="container-x">
          <HeadingSkeleton />
          <div className="mt-9">
            <CarRowSkeleton />
          </div>
        </div>
      </section>
    </div>
  )
}
