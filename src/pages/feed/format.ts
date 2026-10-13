import { MONTHS } from '../../stock/months.ts'

export const dateShort = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
export const dateShortYear = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
export const dayMonth = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
export const dayMonthYear = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

/** `okt 2026`. */
export function monthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
