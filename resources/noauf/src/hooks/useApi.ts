import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Runs an async loader and re-runs it when deps or the UI language change
 * (the API returns translated content based on Accept-Language).
 */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const { i18n } = useTranslation()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
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
  }, [i18n.language, ...deps])

  return { data, loading, error }
}
