import i18n from '@/i18n'

/** Latin digits with thousands separators, as in the design (e.g. 10,600). */
export const num = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

/** "10,600 ر.س" / "SAR 10,600" */
export const sar = (n: number) => (i18n.language?.startsWith('en') ? `SAR ${num(n)}` : `${num(n)} ر.س`)

export const ANNUAL_RATE = 0.045

/** Monthly installment on a declining balance (standard amortization). */
export function monthlyPayment(principal: number, months: number, annualRate = ANNUAL_RATE) {
  if (principal <= 0 || months <= 0) return 0
  const r = annualRate / 12
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}
