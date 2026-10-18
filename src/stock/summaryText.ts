import type { Unit } from '../model/types.ts'
import type { Advice } from './advice.ts'
import { formatAmount, unitLabel } from './stock.ts'

export function agoLabel(days: number): string {
  if (days === 0) return 'vandaag'
  if (days === 1) return 'gisteren'
  return `${days} dagen geleden`
}

/** Short form: how many days the stock lasts, never below 0 ("±0 dagen" when nothing is left). Null when there is no usage to base it on. */
export function stockLeftText(advice: Advice, rough: boolean): string | null {
  if (advice.dueInDays === null) return null
  const days = Math.max(0, advice.dueInDays)
  return `${rough ? '±' : ''}${days} dagen`
}

/** Sentence form for the feed summary card; spells out an empty stock instead of "0 dagen". */
export function stockLeftSentence(advice: Advice, rough: boolean): string | null {
  const text = stockLeftText(advice, rough)
  if (text === null) return null
  if (advice.dueInDays! <= 0) return rough ? 'Mogelijk niet genoeg voorraad' : 'Voorraad is op'
  return `Nog ${text} voorraad`
}

export function usageText(rate: number, unit: Unit): string {
  return `${formatAmount(rate)} ${unitLabel(unit, rate)}`
}

export function usageSentence(rate: number, unit: Unit): string {
  return rate === 0 ? 'Geen verbruik in de laatste 12 weken' : `Gem. verbruik per week ${usageText(rate, unit)}`
}
