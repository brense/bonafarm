import { describe, expect, it } from 'vitest'
import { relativeTime } from './format.ts'

const NOW = new Date(2026, 9, 18, 12).getTime()
const H = 3_600_000
const D = 24 * H

describe('relativeTime', () => {
  it.each([
    [0, 'zojuist'],
    [5 * 60_000, '5 minuten geleden'],
    [2 * H, '2 uur geleden'],
    [D, 'gisteren'],
    [3 * D, '3 dagen geleden'],
    [14 * D, '2 weken geleden'],
    [40 * D, 'vorige maand'],
    [365 * D, 'vorig jaar'],
    [800 * D, '2 jaar geleden'],
  ])('%i ms ago is %s', (age, text) => {
    expect(relativeTime(NOW - age, NOW)).toBe(text)
  })
})
