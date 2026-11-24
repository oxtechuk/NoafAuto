import { useEffect, useState } from 'react'

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')

/** Live countdown to an ISO date: { days, hours, minutes, seconds } as 2-digit strings. */
export function useCountdown(endsAt: string) {
  const calc = () => {
    const diff = Math.max(0, new Date(endsAt).getTime() - Date.now())
    const s = Math.floor(diff / 1000)
    return {
      days: pad(Math.floor(s / 86400)),
      hours: pad(Math.floor((s % 86400) / 3600)),
      minutes: pad(Math.floor((s % 3600) / 60)),
      seconds: pad(s % 60),
      done: diff === 0,
    }
  }
  const [time, setTime] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])
  return time
}
