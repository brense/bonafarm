import { MONTHS } from '../../stock/months.ts'

export const dateShort = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
export const dateShortYear = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
export const dayMonth = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
export const dayMonthYear = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

/** `okt 2026`. */
export function monthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

const changeDate = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const changeDateYear = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** `vr 2 okt 09:12`; with the year (`vr 2 okt 2025 09:12`) when it is not the current one. */
export function changeDateTime(ms: number, nowMs: number): string {
  const sameYear = new Date(ms).getFullYear() === new Date(nowMs).getFullYear()
  return (sameYear ? changeDate : changeDateYear).format(ms).replace(',', '')
}

const rtf = new Intl.RelativeTimeFormat('nl', { numeric: 'auto' })
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** `zojuist`, `2 uur geleden`, `gisteren`, `3 dagen geleden`, `vorige maand`, `vorig jaar`. */
export function relativeTime(ms: number, nowMs: number): string {
  const age = Math.max(0, nowMs - ms)
  if (age < MINUTE / 2) return 'zojuist'
  if (age < HOUR) return rtf.format(-Math.round(age / MINUTE), 'minute')
  if (age < DAY) return rtf.format(-Math.round(age / HOUR), 'hour')
  if (age < 7 * DAY) return rtf.format(-Math.round(age / DAY), 'day')
  if (age < 35 * DAY) return rtf.format(-Math.round(age / (7 * DAY)), 'week')
  if (age < 365 * DAY) return rtf.format(-Math.round(age / (30 * DAY)), 'month')
  return rtf.format(-Math.round(age / (365 * DAY)), 'year')
}
