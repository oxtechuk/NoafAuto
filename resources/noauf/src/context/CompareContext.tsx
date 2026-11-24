import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/** Up to two car ids selected for comparison, persisted in localStorage. */
type Ctx = { ids: string[]; toggle: (id: string) => void; has: (id: string) => boolean; set: (ids: string[]) => void }

const CompareContext = createContext<Ctx | null>(null)
const KEY = 'compare'

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]')
    } catch {
      return []
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids))
    } catch {
      /* storage unavailable */
    }
  }, [ids])

  const toggle = (id: string) =>
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)))

  return <CompareContext.Provider value={{ ids, toggle, has: (id) => ids.includes(id), set: setIds }}>{children}</CompareContext.Provider>
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider')
  return ctx
}
