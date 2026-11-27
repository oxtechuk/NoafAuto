import { useMemo } from 'react'
import type { Car } from '@/types'
import { useApi } from './useApi'
import { getCar, getCarOptions } from '@/services/cars'

/**
 * Cars for pickers (compare, finance calculator): the shared showroom list, plus any
 * requested car that isn't in it (e.g. opened from a car page), loaded by slug.
 */
export function useCarPool(wantedIds: (string | null | undefined)[] = []) {
  const { data: options, loading } = useApi(getCarOptions)

  const missing = useMemo(
    () => (options ? [...new Set(wantedIds.filter((id): id is string => !!id && !options.some((c) => c.id === id)))] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, wantedIds.join('|')],
  )

  const { data: extra, loading: extraLoading } = useApi(
    () => Promise.all(missing.map(getCar)),
    [missing.join('|')],
    { enabled: missing.length > 0 },
  )

  const cars = useMemo<Car[]>(() => {
    const found = (extra ?? []).filter((c): c is Car => !!c && !(options ?? []).some((o) => o.id === c.id))
    return [...found, ...(options ?? [])]
  }, [options, extra])

  return { cars, loading: (loading && !options) || (missing.length > 0 && extraLoading) }
}
