import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Options<T> = {
  /** Synchronous read of already-loaded data (e.g. peekCached); when it returns a value no request is made. */
  peek?: () => T | undefined
  /** false = don't load (yet). Defaults to true. */
  enabled?: boolean
}

/**
 * Runs an async loader and re-runs it when deps or the UI language change
 * (the API returns translated content based on Accept-Language).
 */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = [], { peek, enabled = true }: Options<T> = {}) {
  const { i18n } = useTranslation()
  const [data, setData] = useState<T | null>(() => peek?.() ?? null)
  const [loading, setLoading] = useState(() => enabled && data === null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    const ready = peek?.()
    if (ready !== undefined) {
      setData(ready)
      setError(null)
      setLoading(false)
      return
    }

    let alive = true
    setLoading(true)
    loader()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, enabled, ...deps])

  return { data, loading, error }
}
