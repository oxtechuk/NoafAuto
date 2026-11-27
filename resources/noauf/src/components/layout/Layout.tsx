import { Suspense, useEffect } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import { Outlet, useLocation, matchPath } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileNav from './MobileNav'
import AssistantWidget from '@/components/assistant/AssistantWidget'
import FloatingContactWidgets from './FloatingContactWidgets'

/** Pages whose hero is dark use the dark navbar (as in the Figma frames). */
const DARK_NAV = ['/', '/cars/:id', '/compare', '/blog', '/blog/:slug']

/** Shown while a lazily loaded page chunk downloads. */
function PageFallback() {
  return (
    <div className="container-x py-12" role="status" aria-busy="true">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="mt-4 h-4 w-96 max-w-full" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[450px] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const dark = DARK_NAV.some((p) => matchPath(p, pathname))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant={dark ? 'dark' : 'light'} />
      <main className="flex-1 pb-20 md:pb-0">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileNav />
      <AssistantWidget />
      <FloatingContactWidgets />
    </div>
  )
}
