import { useEffect } from 'react'
import { Outlet, useLocation, matchPath } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

/** Pages whose hero is dark use the dark navbar (as in the Figma frames). */
const DARK_NAV = ['/', '/cars/:id', '/compare', '/blog', '/blog/:slug']

export default function Layout() {
  const { pathname } = useLocation()
  const dark = DARK_NAV.some((p) => matchPath(p, pathname))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant={dark ? 'dark' : 'light'} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
