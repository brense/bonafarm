import { describe, expect, it } from 'vitest'
import type { ConsumptionLog } from './advice'
import {
  completeYears,
  consumptionPerMonth,
  deliveries,
  medianDeliverySize,
  monthKey,
  monthlyStats,
  monthStart,
  ratePerStorage,
  seasonality,
  shuteStats,
  yearGrid,
  yearTotals,
  type DetailLog,
} from './consumption'

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

const dlog = (type: string, ms: number, amount: number, storageId = 's1', batchId?: string, feedId = 'a'): DetailLog => ({
  type,
  feedId,
  storageId,
  amount,
  timestampMs: ms,
  ...(batchId ? { batchId } : {}),
})

describe('ratePerStorage', () => {
  it('only counts logs of that storage', () => {
    const now = at(2026, 9, 13)
    const logs = [dlog('dispense', at(2026, 9, 1), 24, 's1'), dlog('dispense', at(2026, 9, 2), 12, 's2')]
    expect(ratePerStorage(logs, 'a', 's1', now)).toBe(2)
    expect(ratePerStorage(logs, 'a', 's2', now)).toBe(1)
    expect(ratePerStorage(logs, 'a', 's3', now)).toBe(0)
  })
})

describe('yearTotals', () => {
  const now = at(2026, 9, 13)
  it('spans years with a 0 year and marks only the current year partial', () => {
    const logs = [dispense(at(2023, 3, 1), 5), dispense(at(2023, 4, 1), 5), dispense(at(2025, 0, 2), 7), dispense(at(2026, 1, 1), 2)]
    expect(yearTotals(logs, 'a', now)).toEqual([
      { year: 2023, amount: 10, partial: false },
      { year: 2024, amount: 0, partial: false },
      { year: 2025, amount: 7, partial: false },
      { year: 2026, amount: 2, partial: true },
    ])
  })
  it('is empty for an unknown feed', () => {
    expect(yearTotals([dispense(at(2025, 0, 2), 7)], 'zzz', now)).toEqual([])
  })
})

describe('seasonality', () => {
  const now = at(2026, 9, 13)
  it('averages over complete years only', () => {
    const logs = [
      dispense(at(2024, 0, 5), 10),
      dispense(at(2025, 0, 5), 20),
      dispense(at(2025, 5, 5), 4), // 2025 has june, 2024 counts 0 there
      dispense(at(2026, 0, 5), 1000), // current year excluded
    ]
    expect(completeYears(logs, 'a', now)).toEqual([2024, 2025])
    const s = seasonality(logs, 'a', now)
    expect(s).toHaveLength(12)
    expect(s[0]).toBe(15)
    expect(s[5]).toBe(2)
    expect(s[1]).toBe(0)
  })
  it('counts a year with one log as complete', () => {
    const s = seasonality([dispense(at(2025, 2, 5), 6)], 'a', now)
    expect(s[2]).toBe(6)
    expect(s[0]).toBe(0)
  })
  it('is all null without complete years', () => {
    expect(seasonality([dispense(at(2026, 0, 5), 6)], 'a', now)).toEqual(Array.from({ length: 12 }, () => null))
  })
})

describe('deliveries', () => {
  const logs = [
    dlog('delivery', at(2026, 8, 1, 9), 10, 's1', 'b1'),
    dlog('delivery', at(2026, 8, 3, 9), 30, 's2', 'b1'), // same batch, other day
    dlog('delivery', at(2026, 8, 3, 10), 4, 's1', 'b1'),
    dlog('delivery', at(2026, 9, 5, 9), 8, 's1'),
    dlog('delivery', at(2026, 9, 5, 15), 2, 's2'), // same day, no batch
    dlog('delivery', at(2026, 7, 1), 5, 's1', undefined, 'other'),
    dlog('dispense', at(2026, 9, 6), 99),
  ]
  it('groups by batch or day, newest first, perStorage sorted', () => {
    const d = deliveries(logs, 'a')
    expect(d).toHaveLength(2)
    expect(d[0]).toEqual({
      dayMs: at(2026, 9, 5, 9),
      amount: 10,
      perStorage: [
        { storageId: 's1', amount: 8 },
        { storageId: 's2', amount: 2 },
      ],
    })
    expect(d[1].dayMs).toBe(at(2026, 8, 1, 9))
    expect(d[1].amount).toBe(44)
    expect(d[1].perStorage).toEqual([
      { storageId: 's2', amount: 30 },
      { storageId: 's1', amount: 14 },
    ])
  })
  it('respects the limit', () => {
    expect(deliveries(logs, 'a', 1)).toHaveLength(1)
  })
})

describe('medianDeliverySize', () => {
  it('handles odd and even counts and none', () => {
    const d = (day: number, amount: number) => dlog('delivery', at(2026, 0, day), amount)
    expect(medianDeliverySize([d(1, 10), d(2, 30), d(3, 20)], 'a')).toBe(20)
    expect(medianDeliverySize([d(1, 10), d(2, 30), d(3, 20), d(4, 40)], 'a')).toBe(25)
    expect(medianDeliverySize([], 'a')).toBeNull()
  })
})

describe('shuteStats', () => {
  it('computes the average gap between empties', () => {
    const logs = [
      dlog('empty', at(2026, 0, 1), 0),
      dlog('empty', at(2026, 0, 11), 0),
      dlog('empty', at(2026, 0, 31), 0),
      dlog('fill', at(2026, 1, 1), 5),
      dlog('fill', at(2026, 0, 2), 5),
    ]
    expect(shuteStats(logs, 'a')).toEqual({
      lastEmptiedMs: at(2026, 0, 31),
      avgDaysBetweenEmpties: 15,
      cycles: 3,
      fills: 2,
      lastFillMs: at(2026, 1, 1),
    })
  })
  it('has no average with one empty', () => {
    const s = shuteStats([dlog('empty', at(2026, 0, 1), 0)], 'a')
    expect(s.avgDaysBetweenEmpties).toBeNull()
    expect(s.cycles).toBe(1)
    expect(s.lastFillMs).toBeNull()
  })
})
