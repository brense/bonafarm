import { describe, expect, it } from 'vitest'
import type { ConsumptionLog } from './advice'
import { consumptionPerMonth, monthKey, monthlyStats, monthStart, yearGrid } from './consumption'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime()
const dispense = (ms: number, amount: number, feedId = 'a'): ConsumptionLog => ({ type: 'dispense', feedId, amount, timestampMs: ms })

describe('monthKey / monthStart', () => {
  it('uses local time', () => {
    expect(monthKey(at(2026, 0, 1, 0))).toBe('2026-01')
    expect(monthKey(at(2025, 11, 31, 23))).toBe('2025-12')
    expect(monthStart(2026, 9)).toBe(new Date(2026, 9, 1).getTime())
  })
})

describe('consumptionPerMonth', () => {
  it('buckets across a year boundary and 0-fills in order', () => {
    const logs = [dispense(at(2025, 10, 20), 3), dispense(at(2026, 0, 5), 4), dispense(at(2026, 0, 6), 1)]
    const m = consumptionPerMonth(logs, 'a', at(2025, 10, 1, 0), at(2026, 1, 10))
    expect([...m.entries()]).toEqual([
      ['2025-11', 3],
      ['2025-12', 0],
      ['2026-01', 5],
      ['2026-02', 0],
    ])
  })

  it('ignores other feeds and logs outside the range', () => {
    const logs = [dispense(at(2026, 0, 5), 4, 'b'), dispense(at(2025, 9, 5), 9), dispense(at(2026, 0, 5), 2)]
    const m = consumptionPerMonth(logs, 'a', at(2025, 11, 1, 0), at(2026, 0, 31))
    expect(m.get('2026-01')).toBe(2)
    expect(m.has('2025-10')).toBe(false)
  })

  it('counts a count log through previousAmount', () => {
    const logs: ConsumptionLog[] = [
      { type: 'count', feedId: 'a', amount: 4, previousAmount: 10, timestampMs: at(2026, 5, 2) },
      { type: 'count', feedId: 'a', amount: 4, timestampMs: at(2026, 5, 3) },
    ]
    expect(consumptionPerMonth(logs, 'a', at(2026, 5, 1, 0), at(2026, 5, 30)).get('2026-06')).toBe(6)
  })
})

describe('monthlyStats', () => {
  const now = at(2026, 9, 13)

  it('compares this month with last year up to the same day', () => {
    const logs = [
      dispense(at(2026, 9, 2), 5),
      dispense(at(2026, 9, 14), 100), // after now, ignored
      dispense(at(2025, 9, 12), 7),
      dispense(at(2025, 9, 14), 20), // after the cut
    ]
    const s = monthlyStats(logs, 'a', now)
    expect(s.thisMonth).toBe(5)
    expect(s.lastYearToDate).toBe(7)
    expect(s.lastYearFull).toBe(27)
    expect(s.dayOfMonth).toBe(13)
    expect(s.months).toBe(12)
  })

  it('averages exactly the 12 complete months before this one', () => {
    const logs = [
      dispense(at(2025, 9, 1, 0), 12), // oldest included month (oct 2025)
      dispense(at(2026, 8, 30), 24), // sep 2026
      dispense(at(2025, 8, 30), 1000), // 13 months back, excluded
      dispense(at(2026, 9, 5), 1000), // current month, excluded
    ]
    expect(monthlyStats(logs, 'a', now).average).toBe(3)
  })

  it('has a null average without logs', () => {
    expect(monthlyStats([], 'a', now).average).toBeNull()
  })

  it('clamps Feb 29 to Feb 28 a year earlier', () => {
    const feb29 = at(2028, 1, 29)
    const logs = [dispense(at(2027, 1, 28), 2)]
    expect(monthlyStats(logs, 'a', feb29).lastYearToDate).toBe(2)
  })
})

describe('yearGrid', () => {
  it('returns last year and this year with null after the current month', () => {
    const now = at(2026, 9, 13)
    const grid = yearGrid([dispense(at(2025, 0, 5), 4), dispense(at(2026, 9, 1), 2)], 'a', now)
    expect(grid.map((r) => r.year)).toEqual([2025, 2026])
    expect(grid[0].months).toEqual([4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(grid[1].months).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 2, null, null])
  })
})
