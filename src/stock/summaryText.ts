import type { Unit } from '../model/types.ts'
import type { Advice } from './advice.ts'
import { formatAmount, unitLabel } from './stock.ts'

export function agoLabel(days: number): string {
  if (days === 0) return 'vandaag'
  if (days === 1) return 'gisteren'
  return `${days} dagen geleden`
}

/** Short form: how long the stock lasts. Null when there is no usage to base it on. */
export function stockLeftText(advice: Advice, rough: boolean): string | null {
  if (advice.dueInDays === null) return null
  const days = advice.dueInDays
  if (days <= 0) return rough ? 'Mogelijk niet genoeg' : 'Op'
  return `${rough ? '±' : ''}${days} dagen`
}

/** Sentence form of {@link stockLeftText}, as on the feed summary card. */
export function stockLeftSentence(advice: Advice, rough: boolean): string | null {
  const text = stockLeftText(advice, rough)
  if (text === null) return null
  if (advice.dueInDays! <= 0) return rough ? `${text} voorraad` : 'Voorraad is op'
  return `Nog ${text} voorraad`
}

export function usageText(rate: number, unit: Unit): string {
  return `${formatAmount(rate)} ${unitLabel(unit, rate)}`
}

export function usageSentence(rate: number, unit: Unit): string {
  return rate === 0 ? 'Geen verbruik in de laatste 12 weken' : `Gem. verbruik per week ${usageText(rate, unit)}`
}
