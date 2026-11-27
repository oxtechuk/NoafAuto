import { primeCache } from './requestCache'

/**
 * Data Laravel inlines into the page shell (resources/views/app.blade.php):
 * - window.__BOOT_SETTINGS__ = GET /settings/footer
 * - window.__BOOT_HOME__     = GET /home (homepage only)
 * Seeded into the request cache once, so the first render needs no API call.
 */
type BootPayload = { locale?: string; data?: unknown }

const BOOT_KEYS: [cacheKey: string, globalName: string][] = [
  ['footer', '__BOOT_SETTINGS__'],
  ['home', '__BOOT_HOME__'],
]

let seeded = false

export function seedBootData(): void {
  if (seeded || typeof window === 'undefined') return
  seeded = true
  const w = window as unknown as Record<string, BootPayload | undefined>
  for (const [cacheKey, globalName] of BOOT_KEYS) {
    const boot = w[globalName]
    if (boot?.data && boot.locale) primeCache(cacheKey, boot.locale.startsWith('en') ? 'en' : 'ar', boot.data)
  }
}
