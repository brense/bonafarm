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

export interface KokerEstimate {
  /** Bags still on the shelf: last delivery minus what went into the koker since. */
  onHand: number
  lastDeliveryMs: number | null
  delivered: number
  usedSince: number
}

/**
 * Koker feeds are never counted: bags are poured straight in. Usage drives the
 * estimate instead. The last delivery (all delivery logs of that feed on the
 * same day) is what came in; fills since then are what is gone. Without a
 * delivery in the window the shelf is assumed empty, which errs towards ordering.
 */
export function estimateKokerStock(logs: ConsumptionLog[], feedId: string): KokerEstimate {
  const deliveries = logs.filter((l) => l.feedId === feedId && l.type === 'delivery').sort((a, b) => a.timestampMs - b.timestampMs)
  const last = deliveries.at(-1)
  if (!last) return { onHand: 0, lastDeliveryMs: null, delivered: 0, usedSince: 0 }
  const sameDay = deliveries.filter((d) => last.timestampMs - d.timestampMs < DAY_MS)
  const since = sameDay[0].timestampMs
  const delivered = sameDay.reduce((sum, d) => sum + d.amount, 0)
  const usedSince = logs
    .filter((l) => l.feedId === feedId && l.type === 'fill' && l.timestampMs >= since)
    .reduce((sum, l) => sum + l.amount, 0)
  return { onHand: Math.max(0, delivered - usedSince), lastDeliveryMs: last.timestampMs, delivered, usedSince }
}

export interface AdviceInput {
  stock: number
  ratePerWeek: number
  isKoker: boolean
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
