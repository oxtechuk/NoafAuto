import { useCallback, useEffect, useRef, useState } from 'react'
import {
  assistantErrorMessage,
  getAssistantConfig,
  resetAssistantSession,
  sendAssistantMessage,
  type SkAssistantCard,
  type SkAssistantConfig,
  type SkAssistantContext,
} from './assistant'

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  cards?: SkAssistantCard[]
  error?: boolean
}

const HISTORY_KEY = 'sitekit.assistant.messages'
const MAX_STORED = 40

const loadHistory = (): AssistantMessage[] => {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]') as AssistantMessage[]
  } catch {
    return []
  }
}

/**
 * Headless assistant state (generic). The project draws its own UI.
 * `getContext` is called on every send so the assistant knows the current page / compare list.
 */
export function useAssistant(getContext: () => SkAssistantContext) {
  const [config, setConfig] = useState<SkAssistantConfig | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>(loadHistory)
  const [sending, setSending] = useState(false)
  const contextRef = useRef(getContext)
  contextRef.current = getContext

  useEffect(() => {
    let alive = true
    getAssistantConfig().then((c) => alive && setConfig(c))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED)))
    } catch {
      /* storage unavailable */
    }
  }, [messages])

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || sending) return
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text: message }])
      setSending(true)
      try {
        const reply = await sendAssistantMessage(message, contextRef.current())
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', text: reply.reply, cards: reply.cards }])
      } catch (error) {
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', text: assistantErrorMessage(error), error: true }])
      } finally {
        setSending(false)
      }
    },
    [sending],
  )

  const reset = useCallback(() => {
    resetAssistantSession()
    setMessages([])
  }, [])

  return { config, enabled: !!config?.enabled, messages, sending, send, reset }
}
