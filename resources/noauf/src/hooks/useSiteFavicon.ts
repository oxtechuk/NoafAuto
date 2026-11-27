import { useState, useEffect } from 'react'
import { getFooter } from '@/services/content'

let cachedFavicon: string | null = null

export function useSiteFavicon(): string | null {
  const [favicon, setFavicon] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __SITE_FAVICON__?: string }).__SITE_FAVICON__) {
      return (window as unknown as { __SITE_FAVICON__?: string }).__SITE_FAVICON__ || null
    }
    return cachedFavicon
  })

  useEffect(() => {
    if (favicon) return

    // Fallback 1: inspect HTML head link[rel="icon"]
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link?.href && !link.href.endsWith('/favicon.svg') && !link.href.includes('logo-dark.png')) {
      cachedFavicon = link.href
      setFavicon(link.href)
      return
    }

    // Fallback 2: fetch from API
    getFooter()
      .then((data) => {
        const fav = data.favicon
        if (fav) {
          cachedFavicon = fav
          setFavicon(fav)
        }
      })
      .catch(() => {})
  }, [favicon])

  return favicon
}
