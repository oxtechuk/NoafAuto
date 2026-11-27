import type { ContactPayload, CustomCarRequestPayload, FinanceLeadPayload, FinanceRequestPayload } from '@/types'
import { SitekitApi } from '@/sitekit-sdk/client'
import { carIdFromSlug, toContactSubject, toPeriodMonths } from '@/sitekit-sdk/mappers'
import { resolveCarRefId } from './cars'
import { USE_MOCK, mock } from './api'

type Ok = { id: string; message?: string }

/** Sitekit returns { lead_id } for contact/calculator submissions. */
const okFrom = (data: unknown): Ok => {
  const body = data as { id?: number | string; lead_id?: number | string } | null
  return { id: String(body?.lead_id ?? body?.id ?? crypto.randomUUID()) }
}

/** POST /contact — `subject` is the Contact page topic key (general, finance, booking, …). */
export async function sendContact(payload: ContactPayload): Promise<Ok> {
  if (!USE_MOCK) {
    return okFrom(
      await SitekitApi.contact({
        name: payload.name,
        phone: payload.phone,
        email: payload.email || undefined,
        subject: toContactSubject(payload.subject),
        message: payload.message,
      })
    )
  }
  console.info('[mock] POST /contact', payload)
  return mock({ id: crypto.randomUUID() }, 600)
}

/**
 * Step 1 of the calculator. Sitekit needs the car + income to create a lead, so the
 * contact details are only kept here and sent with the final request.
 */
export async function saveFinanceLead(payload: FinanceLeadPayload): Promise<Ok> {
  if (!USE_MOCK) return { id: `draft:${payload.phone}` }
  console.info('[mock] POST /finance/leads', payload)
  return mock({ id: crypto.randomUUID() }, 500)
}

/** Final finance request → Sitekit calculator lead (appears in CRM "calculator leads"). */
export async function submitFinanceRequest(payload: FinanceRequestPayload & { leadId?: string }): Promise<Ok> {
  if (!USE_MOCK) {
    const carId = carIdFromSlug(payload.carId) ?? (await resolveCarRefId(payload.carId))
    if (!carId) throw new Error(`Unknown car: ${payload.carId}`)

    return okFrom(
      await SitekitApi.calculatorLead({
        car_ids: [carId],
        name: payload.name,
        phone: payload.phone,
        city: payload.city,
        salary: payload.salary,
        monthly_obligations: payload.obligations,
        down_payment: payload.downPayment,
        period_months: toPeriodMonths(payload.months),
        preferred_color: payload.color,
        is_submitted: true,
      })
    )
  }
  console.info('[mock] POST /finance/requests', payload)
  return mock({ id: crypto.randomUUID() }, 600)
}

/** Custom car request or showroom car inquiry → Sitekit contact message with all the details. */
export async function submitCustomCarRequest(payload: CustomCarRequestPayload): Promise<Ok> {
  if (!USE_MOCK) {
    const isShowroom = Boolean(payload.carId && !payload.isCustom)
    const details = [
      isShowroom
        ? `نوع الطلب: حجز/طلب سيارة متوفرة في المعرض (معرّف #${payload.carId})`
        : `نوع الطلب: استيراد / طلب سيارة مخصصة غير متوفرة في المعرض`,
      `السيارة المطلوبة: ${payload.carName} (${payload.year}) — اللون: ${payload.color}`,
      `الحالة: ${payload.condition} — السعر/الميزانية: ${payload.budget}`,
      `المدينة: ${payload.city}`,
      `القطاع: ${payload.sector} — جهة العمل: ${payload.employer}`,
      `الراتب: ${payload.salary} — دخل إضافي: ${payload.extraIncome}`,
      `الالتزامات: ${payload.obligations} (${payload.obligationType})`,
    ].join('\n')

    return okFrom(
      await SitekitApi.contact({
        name: payload.name,
        phone: payload.phone,
        email: payload.email || undefined,
        subject: isShowroom ? 'car_booking' : 'car_import',
        message: details,
      })
    )
  }
  console.info('[mock] POST /car-requests', payload)
  return mock({ id: crypto.randomUUID() }, 600)
}
