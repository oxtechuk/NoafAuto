import { currentLang } from '@/services/api'

/**
 * Tiny in-memory response cache for GET requests.
 *
 * - Keys are scoped by UI language (the API returns translated content).
 * - Identical requests made at the same time share one promise (no duplicates).
 * - A fresh entry can be read synchronously with `peekCached`, so revisiting a page renders instantly.
 */
type Entry = { at: number; value?: unknown; promise?: Promise<unknown> }

const DEFAULT_TTL = 5 * 60_000
const entries = new Map<string, Entry>()

const scoped = (key: string, lang: string = currentLang()) => `${lang}:${key}`

export function cached<T>(key: string, loader: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const k = scoped(key)
  const entry = entries.get(k)
  if (entry?.promise) return entry.promise as Promise<T>
  if (entry && 'value' in entry && Date.now() - entry.at < ttl) return Promise.resolve(entry.value as T)

  const promise = loader().then(
    (value) => (entries.set(k, { at: Date.now(), value }), value),
    (error) => (entries.delete(k), Promise.reject(error)),
  )
  entries.set(k, { at: Date.now(), promise })
  return promise
}

export function peekCached<T>(key: string, ttl = DEFAULT_TTL): T | undefined {
  const entry = entries.get(scoped(key))
  return entry && 'value' in entry && Date.now() - entry.at < ttl ? (entry.value as T) : undefined
}

/** Seed the cache with data the server already rendered into the page (window.__BOOT_*__). */
export function primeCache(key: string, lang: string, value: unknown): void {
  entries.set(scoped(key, lang), { at: Date.now(), value })
}
