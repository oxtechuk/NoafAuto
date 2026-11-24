/**
 * Sitekit AI Assistant — storefront client (generic, copy as-is to any project).
 *
 * Talks to /api/v1/store/assistant/*; the showroom's Gemini key never reaches the browser.
 * UI is project specific: build it on top of `useAssistant()` (./useAssistant.ts).
 */
import { sitekitHttp } from './client'

export interface SkAssistantConfig {
  enabled: boolean
  name?: string
  greeting?: string
  bubble_title?: string
  bubble_text?: string
  quick_replies?: string[]
  max_message_length?: number
}

export interface SkAssistantCar {
  slug: string
  name: string
  brand?: string
  year?: number
  price?: number
  original_price?: number
  monthly_from?: number
  horsepower?: number
  fuel?: string
  offer?: string
  image?: string
  url: string
}

export type SkAssistantCard =
  | { type: 'cars'; cars: SkAssistantCar[] }
  | { type: 'comparison'; cars: SkAssistantCar[]; sections: { title: string; rows: { label: string; values: string[]; winner?: number | null }[] }[] }
  | {
      type: 'installment'
      car: string
      slug: string
      price: number
      down_payment: number
      months: number
      best_option: { bank: string; annual_rate: number; monthly: number; total: number }
      other_options: { bank: string; monthly: number }[]
      eligibility?: { max_affordable_installment: number; fits_salary: boolean; note: string }
      disclaimer?: string
    }
  | { type: 'showroom_info'; topic: string; phone?: string; whatsapp?: string; working_hours?: string; branches?: string; address?: string }
  | { type: 'lead_created'; lead_id: number }

export interface SkAssistantContext {
  path?: string
  car_slug?: string
  compare?: string[]
}

export interface SkAssistantReply {
  session_id: string
  reply: string
  cards: SkAssistantCard[]
  lead_registered?: boolean
  limit_reached?: boolean
}

const SESSION_KEY = 'sitekit.assistant.session'

export function getAssistantSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function resetAssistantSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable */
  }
}

export async function getAssistantConfig(): Promise<SkAssistantConfig> {
  try {
    return (await sitekitHttp.get<{ data: SkAssistantConfig }>('/assistant/config')).data.data
  } catch {
    return { enabled: false }
  }
}

export async function sendAssistantMessage(message: string, context: SkAssistantContext = {}): Promise<SkAssistantReply> {
  const res = await sitekitHttp.post<{ data: SkAssistantReply }>(
    '/assistant/chat',
    { message, context, session_id: getAssistantSessionId() ?? undefined },
    { timeout: 60000 },
  )
  const reply = res.data.data
  try {
    localStorage.setItem(SESSION_KEY, reply.session_id)
  } catch {
    /* storage unavailable */
  }
  return reply
}

/** Arabic, user-facing message for a failed request (rate limit, unavailable, network). */
export function assistantErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response
  if (response?.data?.message) return response.data.message
  if (response?.status === 429) return 'وصلت للحد المسموح من الرسائل حالياً، حاول بعد قليل.'
  return 'تعذّر الاتصال بالمساعد، تأكد من الإنترنت وحاول مرة أخرى.'
}
