import { describe, expect, it } from 'vitest'
import type { Advice } from './advice.ts'
import { agoLabel, stockLeftSentence, stockLeftText, usageSentence, usageText } from './summaryText.ts'

const advice = (dueInDays: number | null): Advice => ({ status: 'ok', coverDays: null, dueInDays, orderQty: 0, daysSinceDelivery: null })

describe('summaryText', () => {
  it('agoLabel', () => {
    expect(agoLabel(0)).toBe('vandaag')
    expect(agoLabel(1)).toBe('gisteren')
    expect(agoLabel(29)).toBe('29 dagen geleden')
  })
  it('stockLeftText', () => {
    expect(stockLeftText(advice(null), false)).toBeNull()
    expect(stockLeftText(advice(8), false)).toBe('8 dagen')
    expect(stockLeftText(advice(23), true)).toBe('±23 dagen')
    expect(stockLeftText(advice(0), false)).toBe('Op')
    expect(stockLeftText(advice(0), true)).toBe('Mogelijk niet genoeg')
  })
  it('stockLeftSentence', () => {
    expect(stockLeftSentence(advice(null), false)).toBeNull()
    expect(stockLeftSentence(advice(8), false)).toBe('Nog 8 dagen voorraad')
    expect(stockLeftSentence(advice(23), true)).toBe('Nog ±23 dagen voorraad')
    expect(stockLeftSentence(advice(0), false)).toBe('Voorraad is op')
    expect(stockLeftSentence(advice(0), true)).toBe('Mogelijk niet genoeg voorraad')
  })
  it('usage', () => {
    expect(usageText(0.4, 'zak')).toBe('0,4 zakken')
    expect(usageSentence(0.4, 'zak')).toBe('Gem. verbruik per week 0,4 zakken')
    expect(usageSentence(0, 'zak')).toBe('Geen verbruik in de laatste 12 weken')
  })
})
