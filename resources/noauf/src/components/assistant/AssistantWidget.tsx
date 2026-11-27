import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAssistant } from '@/sitekit-sdk/useAssistant'
import { useCompare } from '@/context/CompareContext'
import { asset } from '@/lib/asset'
import Icon from '@/components/ui/Icon'
import AssistantCards from './AssistantCards'

/** Minimal formatting: **bold** and line breaks (the assistant answers in short Markdown). */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}

/**
 * The mascot (bottom-start corner, every page). Clicking it opens the Sitekit AI assistant.
 * Hidden entirely when the showroom has not connected/enabled the assistant.
 */
export default function AssistantWidget() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { ids: compareIds } = useCompare()
  const [open, setOpen] = useState(false)
  const [isStanding, setIsStanding] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [userDismissed, setUserDismissed] = useState(false)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const { config, enabled, messages, sending, send, reset } = useAssistant(() => ({
    path: pathname,
    car_slug: matchPath('/cars/:id', pathname)?.params.id,
    compare: compareIds,
  }))

  // Preload mascot images for instant zero-flicker transitions
  useEffect(() => {
    const img1 = new Image()
    img1.src = asset('/images/mascot-standing.png')
    const img2 = new Image()
    img2.src = asset('/images/mascot-sitting.png')
  }, [])

  // Periodic sit and stand cycle (stands for 8s with speech bubble, sits for 6s resting)
  useEffect(() => {
    if (open || isHovered) return

    const timer = setTimeout(() => {
      setIsStanding((prev) => !prev)
    }, isStanding ? 8000 : 6000)

    return () => clearTimeout(timer)
  }, [isStanding, isHovered, open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending, open])

  // Assistant not connected/enabled by the showroom: keep the Nawaf mascot character -> custom request.
  if (!enabled || !config) {
    if (config === null) return null
    return (
      <div className="fixed start-3 bottom-24 z-40 hidden items-end gap-2 sm:bottom-6 sm:flex">
        <Link
          to="/request-car"
          onMouseEnter={() => {
            setIsHovered(true)
            setIsStanding(true)
          }}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex items-end justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer select-none"
          style={{ width: '68px', height: '125px' }}
        >
          <img
            src={asset('/images/mascot-sitting.png')}
            alt="نواف"
            className={`absolute bottom-0 start-0 max-h-[85px] sm:max-h-[92px] w-auto object-contain transition-all duration-400 ${
              !isStanding ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
            }`}
          />
          <img
            src={asset('/images/mascot-standing.png')}
            alt="نواف"
            className={`absolute bottom-0 start-0 max-h-[115px] sm:max-h-[125px] w-auto object-contain transition-all duration-400 ${
              isStanding ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
            }`}
          />
        </Link>
        <div
          className={`relative mb-4 cursor-pointer rounded-2xl border border-line bg-white/95 px-[18px] py-3 shadow-xl backdrop-blur-md transition-all duration-400 ease-out ${
            isStanding && !userDismissed ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-2 pointer-events-none'
          }`}
        >
          <div className="absolute -start-1.5 bottom-4 size-3 rotate-45 border-b border-s border-line bg-white" />
          <Link to="/request-car">
            <p className="text-body font-bold text-ink">{t('home.assistantTitle')}</p>
            <p className="mt-1 text-small text-muted">{t('home.assistantText')}</p>
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault()
              setUserDismissed(true)
            }}
            aria-label={t('common.close')}
            className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm hover:bg-sand"
          >
            <Icon name="close" size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    )
  }

  const submit = (text = input) => {
    if (!text.trim() || sending) return
    setInput('')
    void send(text)
  }

  return (
    <>
      {!open && (
        <div className="fixed start-3 bottom-24 z-40 flex items-end gap-2 sm:bottom-6">
          <button
            onClick={() => setOpen(true)}
            onMouseEnter={() => {
              setIsHovered(true)
              setIsStanding(true)
            }}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={config.name}
            className="relative flex items-end justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer select-none"
            style={{ width: '68px', height: '125px' }}
          >
            {/* Sitting mascot (rests when sitting down) */}
            <img
              src={asset('/images/mascot-sitting.png')}
              alt=""
              className={`absolute bottom-0 start-0 max-h-[85px] sm:max-h-[92px] w-auto object-contain transition-all duration-400 ${
                !isStanding ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
              }`}
            />
            {/* Standing mascot (welcomes with hand gesture) */}
            <img
              src={asset('/images/mascot-standing.png')}
              alt=""
              className={`absolute bottom-0 start-0 max-h-[115px] sm:max-h-[125px] w-auto object-contain transition-all duration-400 ${
                isStanding ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
              }`}
            />
          </button>

          {/* Speech bubble: appears when standing, hidden when sitting */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative mb-4 hidden cursor-pointer rounded-2xl border border-line bg-white/95 px-[18px] py-3 text-start shadow-xl backdrop-blur-md transition-all duration-400 ease-out sm:block ${
              isStanding && !userDismissed
                ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
                : 'opacity-0 scale-95 translate-x-2 pointer-events-none'
            }`}
          >
            <div className="absolute -start-1.5 bottom-4 size-3 rotate-45 border-b border-s border-line bg-white" />
            <p className="text-body font-bold text-ink">{config.bubble_title || t('home.assistantTitle')}</p>
            <p className="mt-1 text-small text-muted">{config.bubble_text || t('home.assistantText')}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setUserDismissed(true)
              }}
              aria-label={t('common.close')}
              className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm hover:bg-sand transition-colors"
            >
              <Icon name="close" size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {open && (
        <section
          aria-label={config.name}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-line bg-white shadow-2xl sm:inset-x-auto sm:start-4 sm:bottom-4 sm:h-[600px] sm:w-[400px] sm:rounded-2xl"
        >
          <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
            <img src={asset('/images/mascot-standing.png')} alt="" className="h-10 w-auto object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-bold text-gold">{config.name}</p>
              <p className="text-tiny text-silver">{sending ? 'يكتب الآن…' : 'متصل الآن'}</p>
            </div>
            {messages.length > 0 && (
              <button onClick={reset} className="rounded-lg px-2 py-1 text-tiny text-silver hover:text-white">
                محادثة جديدة
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label={t('common.close')} className="flex size-8 items-center justify-center rounded-full hover:bg-white/10">
              <Icon name="close" size={16} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-cream px-3 py-4">
            <Bubble role="assistant">{config.greeting}</Bubble>
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role} error={m.error}>
                <RichText text={m.text} />
                {m.cards && m.cards.length > 0 && <AssistantCards cards={m.cards} />}
              </Bubble>
            ))}
            {sending && (
              <Bubble role="assistant">
                <span className="inline-flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:120ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
                </span>
              </Bubble>
            )}
            <div ref={endRef} />
          </div>

          {messages.length === 0 && (config.quick_replies?.length ?? 0) > 0 && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-line bg-white px-3 py-2">
              {config.quick_replies!.map((q) => (
                <button key={q} onClick={() => submit(q)} className="shrink-0 rounded-full border border-line bg-cream px-3 py-1.5 text-tiny font-bold text-ink hover:border-bronze">
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="flex items-center gap-2 border-t border-line bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={config.max_message_length ?? 600}
              placeholder="اكتب سؤالك… مثلاً: أبغى سيارة عائلية بقسط 2000"
              className="h-11 flex-1 rounded-lg border border-line bg-cream px-3 text-small text-ink outline-none focus:border-bronze"
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="إرسال" className="flex size-11 items-center justify-center rounded-lg bg-ink text-gold disabled:opacity-40">
              <Icon name="send" size={18} />
            </button>
          </form>
          <p className="bg-white pb-2 text-center text-tiny text-muted">مساعد آلي — المعلومات تقديرية وتأكيدها من المعرض</p>
        </section>
      )}
    </>
  )
}

function Bubble({ role, error, children }: { role: 'user' | 'assistant'; error?: boolean; children: React.ReactNode }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-small leading-6 ${
          isUser ? 'rounded-ee-sm bg-ink text-white' : error ? 'rounded-es-sm bg-red-50 text-red-700' : 'rounded-es-sm border border-line bg-white text-ink'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
