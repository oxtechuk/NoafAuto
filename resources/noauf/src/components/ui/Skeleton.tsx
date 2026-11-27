/** Pulsing placeholder block. `dark` = for dark (ink) surfaces. */
export default function Skeleton({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg ${dark ? 'bg-ink-2' : 'bg-line/70'} ${className}`} />
}
