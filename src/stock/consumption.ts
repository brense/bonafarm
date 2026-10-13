import { consumedAmount, consumptionPerWeek, type ConsumptionLog } from './advice.ts'

/** Local-time month key, `'YYYY-MM'`. */
export function monthKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Local midnight on the 1st of the month. */
export function monthStart(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getTime()
}

/**
 * Consumption per calendar month for one feed. Every month from `fromMs` to
 * `toMs` inclusive is present (0-filled, chronological); logs outside
 * `fromMs..toMs` are ignored.
 */
export function consumptionPerMonth(
  logs: ConsumptionLog[],
  feedId: string,
  fromMs: number,
  toMs: number,
): Map<string, number> {
  const result = new Map<string, number>()
  const from = new Date(fromMs)
  const to = new Date(toMs)
  let year = from.getFullYear()
  let month = from.getMonth()
  while (year < to.getFullYear() || (year === to.getFullYear() && month <= to.getMonth())) {
    result.set(monthKey(monthStart(year, month)), 0)
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  for (const log of logs) {
    if (log.feedId !== feedId) continue
    if (log.timestampMs < fromMs || log.timestampMs > toMs) continue
    const key = monthKey(log.timestampMs)
    result.set(key, (result.get(key) ?? 0) + consumedAmount(log))
  }
  return result
}

export interface MonthlyStats {
  /** Mean over the last 12 complete months; null without any logs. */
  average: number | null
  months: number
  thisMonth: number
  /** Same month a year earlier, up to the same day and time. */
  lastYearToDate: number
  lastYearFull: number
  dayOfMonth: number
}

const AVERAGE_MONTHS = 12

function sum(map: Map<string, number>): number {
  let total = 0
  for (const v of map.values()) total += v
  return total
}

export function monthlyStats(logs: ConsumptionLog[], feedId: string, nowMs: number): MonthlyStats {
  const now = new Date(nowMs)
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStartMs = monthStart(year, month)

  const averageFrom = monthStart(year, month - AVERAGE_MONTHS)
  const complete = consumptionPerMonth(logs, feedId, averageFrom, monthStartMs - 1)
  const average = logs.length === 0 ? null : sum(complete) / AVERAGE_MONTHS

  const thisMonth = sum(consumptionPerMonth(logs, feedId, monthStartMs, nowMs))

  const lastYearStart = monthStart(year - 1, month)
  const lastYearEnd = monthStart(year - 1, month + 1) - 1
  const daysInLastYearMonth = new Date(year - 1, month + 1, 0).getDate()
  const cut = new Date(
    year - 1,
    month,
    Math.min(now.getDate(), daysInLastYearMonth),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  ).getTime()
  const lastYearToDate = sum(consumptionPerMonth(logs, feedId, lastYearStart, cut))
  const lastYearFull = sum(consumptionPerMonth(logs, feedId, lastYearStart, lastYearEnd))

  return {
    average,
    months: AVERAGE_MONTHS,
    thisMonth,
    lastYearToDate,
    lastYearFull,
    dayOfMonth: now.getDate(),
  }
}

export interface YearRow {
  year: number
  months: (number | null)[]
}

/** Two rows, last year and this year, jan..dec; future months are null. */
export function yearGrid(logs: ConsumptionLog[], feedId: string, nowMs: number): YearRow[] {
  const now = new Date(nowMs)
  const thisYear = now.getFullYear()
  const perMonth = consumptionPerMonth(logs, feedId, monthStart(thisYear - 1, 0), nowMs)
  return [thisYear - 1, thisYear].map((year) => ({
    year,
    months: Array.from({ length: 12 }, (_, m) => {
      if (year === thisYear && m > now.getMonth()) return null
      return perMonth.get(monthKey(monthStart(year, m))) ?? 0
    }),
  }))
}

export interface DetailLog extends ConsumptionLog {
  storageId: string
  batchId?: string
}

/** Average weekly consumption of one feed taken from one storage. */
export function ratePerStorage(logs: DetailLog[], feedId: string, storageId: string, nowMs: number, weeks = 12): number {
  return consumptionPerWeek(
    logs.filter((l) => l.storageId === storageId),
    feedId,
    nowMs,
    weeks,
  )
}

export interface YearTotal {
  year: number
  amount: number
  partial: boolean
}

/** One entry per calendar year from the first log of the feed to now, ascending. */
export function yearTotals(logs: ConsumptionLog[], feedId: string, nowMs: number): YearTotal[] {
  const perYear = new Map<number, number>()
  for (const log of logs) {
    if (log.feedId !== feedId) continue
    const year = new Date(log.timestampMs).getFullYear()
    perYear.set(year, (perYear.get(year) ?? 0) + consumedAmount(log))
  }
  if (perYear.size === 0) return []
  const thisYear = new Date(nowMs).getFullYear()
  const first = Math.min(...perYear.keys())
  const result: YearTotal[] = []
  for (let year = first; year <= thisYear; year += 1) {
    result.push({ year, amount: perYear.get(year) ?? 0, partial: year === thisYear })
  }
  return result
}

/** Years before the current one that have at least one log of this feed. */
export function completeYears(logs: ConsumptionLog[], feedId: string, nowMs: number): number[] {
  const thisYear = new Date(nowMs).getFullYear()
  const years = new Set<number>()
  for (const log of logs) {
    if (log.feedId !== feedId) continue
    const year = new Date(log.timestampMs).getFullYear()
    if (year < thisYear) years.add(year)
  }
  return [...years].sort((a, b) => a - b)
}

/** Mean consumption per calendar month (jan..dec) over the complete years; all null without any. */
export function seasonality(logs: ConsumptionLog[], feedId: string, nowMs: number): (number | null)[] {
  const years = completeYears(logs, feedId, nowMs)
  if (years.length === 0) return Array.from({ length: 12 }, () => null)
  const yearSet = new Set(years)
  const totals = Array.from({ length: 12 }, () => 0)
  for (const log of logs) {
    if (log.feedId !== feedId) continue
    const d = new Date(log.timestampMs)
    if (!yearSet.has(d.getFullYear())) continue
    totals[d.getMonth()] += consumedAmount(log)
  }
  return totals.map((t) => t / years.length)
}

export interface Delivery {
  dayMs: number
  amount: number
  perStorage: { storageId: string; amount: number }[]
}

function groupDeliveries(logs: DetailLog[], feedId: string): Delivery[] {
  const mine = logs.filter((l) => l.feedId === feedId && l.type === 'delivery').sort((a, b) => a.timestampMs - b.timestampMs)
  const groups = new Map<string, { dayMs: number; amount: number; storages: Map<string, number> }>()
  for (const log of mine) {
    const d = new Date(log.timestampMs)
    const key = log.batchId ? `b:${log.batchId}` : `d:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    let group = groups.get(key)
    if (!group) {
      group = { dayMs: log.timestampMs, amount: 0, storages: new Map() }
      groups.set(key, group)
    }
    group.amount += log.amount
    group.storages.set(log.storageId, (group.storages.get(log.storageId) ?? 0) + log.amount)
  }
  return [...groups.values()]
    .map((g) => ({
      dayMs: g.dayMs,
      amount: g.amount,
      perStorage: [...g.storages.entries()].map(([storageId, amount]) => ({ storageId, amount })).sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.dayMs - a.dayMs)
}

/** Deliveries of one feed (grouped by batch, else by local day), newest first. */
export function deliveries(logs: DetailLog[], feedId: string, limit = 6): Delivery[] {
  return groupDeliveries(logs, feedId).slice(0, limit)
}

/** Median amount over all delivery groups; null without deliveries. */
export function medianDeliverySize(logs: DetailLog[], feedId: string): number | null {
  const amounts = groupDeliveries(logs, feedId)
    .map((d) => d.amount)
    .sort((a, b) => a - b)
  if (amounts.length === 0) return null
  const mid = amounts.length >> 1
  return amounts.length % 2 === 1 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2
}

export interface ShuteStats {
  lastEmptiedMs: number | null
  avgDaysBetweenEmpties: number | null
  cycles: number
  fills: number
  lastFillMs: number | null
}

const DAY = 24 * 60 * 60 * 1000

export function shuteStats(logs: DetailLog[], feedId: string): ShuteStats {
  const empties = logs
    .filter((l) => l.feedId === feedId && l.type === 'empty')
    .map((l) => l.timestampMs)
    .sort((a, b) => a - b)
  const fills = logs
    .filter((l) => l.feedId === feedId && l.type === 'fill')
    .map((l) => l.timestampMs)
    .sort((a, b) => a - b)
  return {
    lastEmptiedMs: empties.at(-1) ?? null,
    avgDaysBetweenEmpties: empties.length < 2 ? null : (empties[empties.length - 1] - empties[0]) / (empties.length - 1) / DAY,
    cycles: empties.length,
    fills: fills.length,
    lastFillMs: fills.at(-1) ?? null,
  }
}
