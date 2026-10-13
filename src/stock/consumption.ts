import { consumedAmount, type ConsumptionLog } from './advice.ts'

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
