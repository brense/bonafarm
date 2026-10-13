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
