const DAY_MS = 86_400_000

export interface DeliverySchedule {
  next: Date
  after: Date
  daysToNext: number
  daysToAfter: number
  targetDays: number
}

// A known delivery Friday. TODO: per-organisation setting.
export const DELIVERY_ANCHOR = new Date('2026-10-16T12:00:00+02:00')
export const DELIVERY_CYCLE_DAYS = 14
export const SAFETY_DAYS = 7

export function deliverySchedule(
  now: Date,
  anchor: Date = DELIVERY_ANCHOR,
  cycleDays: number = DELIVERY_CYCLE_DAYS,
): DeliverySchedule {
  const cycleMs = cycleDays * DAY_MS
  const k = Math.floor((now.getTime() - anchor.getTime()) / cycleMs) + 1
  const next = new Date(anchor.getTime() + k * cycleMs)
  const after = new Date(next.getTime() + cycleMs)
  const daysToNext = Math.round((next.getTime() - now.getTime()) / DAY_MS)
  const daysToAfter = Math.round((after.getTime() - now.getTime()) / DAY_MS)
  return { next, after, daysToNext, daysToAfter, targetDays: daysToAfter + SAFETY_DAYS }
}

export interface ConsumptionLog {
  type: string
  feedId: string
  amount: number
  timestampMs: number
}

export function consumptionPerWeek(
  logs: ConsumptionLog[],
  feedId: string,
  nowMs: number,
  weeks = 12,
): number {
  const from = nowMs - weeks * 7 * DAY_MS
  let total = 0
  for (const log of logs) {
    if (log.feedId !== feedId) continue
    if (log.type !== 'dispense' && log.type !== 'fill') continue
    if (log.timestampMs > from && log.timestampMs <= nowMs) total += log.amount
  }
  return total / weeks
}

export type AdviceStatus = 'critical' | 'warning' | 'ok' | 'overstock' | 'inactive'

export interface ShuteEstimate {
  /** Estimated bags left: what is still in the koker plus bags on the shelf. */
  onHand: number
  /** When bags last came in: the last fill (bags poured straight in) or a later delivery. */
  lastDeliveryMs: number | null
  /** Bags that came in on that day. */
  delivered: number
}

/**
 * Koker feeds are never counted and bags usually go straight into the shute,
 * so the last fill is the last delivery. The koker then empties at the usage
 * rate: left = filled - rate * weeks since. Bags delivered to a shelf after
 * that fill are added on top. Without any fill or delivery in the window the
 * shelf is assumed empty, which errs towards ordering.
 */
export function estimateShuteStock(logs: ConsumptionLog[], feedId: string, nowMs: number, ratePerWeek: number): ShuteEstimate {
  const mine = logs.filter((l) => l.feedId === feedId).sort((a, b) => a.timestampMs - b.timestampMs)
  const fills = mine.filter((l) => l.type === 'fill')
  const lastFill = fills.at(-1)
  const deliveries = mine.filter((l) => l.type === 'delivery')
  const lastDelivery = deliveries.at(-1)
  if (!lastFill && !lastDelivery) return { onHand: 0, lastDeliveryMs: null, delivered: 0 }

  let inShute = 0
  let fillTs = -Infinity
  if (lastFill) {
    const sameDay = fills.filter((f) => lastFill.timestampMs - f.timestampMs < DAY_MS)
    fillTs = sameDay[0].timestampMs
    const filled = sameDay.reduce((sum, f) => sum + f.amount, 0)
    const weeksSince = (nowMs - fillTs) / (7 * DAY_MS)
    inShute = Math.max(0, filled - ratePerWeek * weeksSince)
  }
  // Bags delivered after the last fill are still on the shelf.
  const shelf = deliveries.filter((d) => d.timestampMs > fillTs).reduce((sum, d) => sum + d.amount, 0)

  const last = [lastFill, lastDelivery].filter((l): l is ConsumptionLog => l !== undefined).sort((a, b) => b.timestampMs - a.timestampMs)[0]
  const lastDay = mine.filter((l) => (l.type === 'fill' || l.type === 'delivery') && last.timestampMs - l.timestampMs < DAY_MS && l.timestampMs <= last.timestampMs)
  return {
    onHand: Math.round((inShute + shelf) * 10) / 10,
    lastDeliveryMs: last.timestampMs,
    delivered: lastDay.reduce((sum, l) => sum + l.amount, 0),
  }
}

export interface AdviceInput {
  stock: number
  ratePerWeek: number
  isShute: boolean
  lastDeliveryMs: number | null
  nowMs: number
  schedule: DeliverySchedule
}

export interface Advice {
  status: AdviceStatus
  coverDays: number | null
  dueInDays: number | null
  orderQty: number
  daysSinceDelivery: number | null
}

export const STATUS_LABEL: Record<AdviceStatus, string> = {
  critical: 'Bestellen',
  warning: 'Bijna op',
  ok: 'Op voorraad',
  overstock: 'Te veel',
  inactive: 'Niet in gebruik',
}

export const STATUS_ORDER: Record<AdviceStatus, number> = {
  critical: 0,
  warning: 1,
  ok: 2,
  overstock: 3,
  inactive: 4,
}

export function adviseFeed(input: AdviceInput): Advice {
  const { stock, ratePerWeek: rate, lastDeliveryMs, nowMs, schedule } = input
  const coverDays = rate > 0 ? (stock / rate) * 7 : null
  let dueInDays: number | null = null
  if (rate > 0) dueInDays = stock > 0 && coverDays !== null ? Math.round(coverDays) : stock === 0 ? 0 : null

  let status: AdviceStatus
  if (rate === 0 && stock === 0) status = 'inactive'
  else if (rate === 0) status = 'ok'
  else if (dueInDays !== null && dueInDays <= schedule.daysToNext) status = 'critical'
  else if (dueInDays !== null && dueInDays <= schedule.daysToAfter) status = 'warning'
  else if (coverDays !== null && coverDays > 56) status = 'overstock'
  else status = 'ok'

  const needsOrder = status === 'critical' || status === 'warning'
  const orderQty = needsOrder
    ? Math.max(1, Math.ceil((rate * schedule.targetDays) / 7 - stock))
    : 0

  const daysSinceDelivery =
    lastDeliveryMs === null ? null : Math.floor((nowMs - lastDeliveryMs) / DAY_MS)

  return { status, coverDays, dueInDays, orderQty, daysSinceDelivery }
}
