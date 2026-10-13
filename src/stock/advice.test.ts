import { describe, expect, it } from 'vitest'
import {
  adviseFeed,
  consumptionPerWeek,
  deliverySchedule,
  DELIVERY_ANCHOR,
  estimateShuteStock,
  STATUS_LABEL,
  STATUS_ORDER,
  type AdviceInput,
  type ConsumptionLog,
  type DeliverySchedule,
} from './advice'

const DAY = 86_400_000

describe('deliverySchedule', () => {
  it('finds the anchor when now is before it', () => {
    const now = new Date('2026-10-06T12:00:00+02:00')
    const s = deliverySchedule(now)
    expect(s.next.getTime()).toBe(DELIVERY_ANCHOR.getTime())
    expect(s.after.getTime()).toBe(DELIVERY_ANCHOR.getTime() + 14 * DAY)
    expect(s.daysToNext).toBe(10)
    expect(s.daysToAfter).toBe(24)
    expect(s.targetDays).toBe(31)
  })

  it('moves to the next cycle when now is after the anchor', () => {
    const now = new Date('2026-10-20T12:00:00+02:00')
    const s = deliverySchedule(now)
    expect(s.next.getTime()).toBe(DELIVERY_ANCHOR.getTime() + 14 * DAY)
    expect(s.daysToNext).toBe(10)
  })

  it('is strictly after now when exactly on the anchor', () => {
    const s = deliverySchedule(new Date(DELIVERY_ANCHOR))
    expect(s.next.getTime()).toBe(DELIVERY_ANCHOR.getTime() + 14 * DAY)
    expect(s.daysToNext).toBe(14)
    expect(s.daysToAfter).toBe(28)
  })

  it('works far before the anchor', () => {
    const s = deliverySchedule(new Date(DELIVERY_ANCHOR.getTime() - 20 * DAY))
    expect(s.next.getTime()).toBe(DELIVERY_ANCHOR.getTime() - 14 * DAY)
    expect(s.daysToNext).toBe(6)
  })
})

describe('consumptionPerWeek', () => {
  const now = Date.parse('2026-10-06T12:00:00Z')
  const log = (type: string, amount: number, ageDays: number, feedId = 'a'): ConsumptionLog => ({
    type,
    feedId,
    amount,
    timestampMs: now - ageDays * DAY,
  })

  it('counts only dispense and fill, divided by weeks', () => {
    const logs = [
      log('dispense', 6, 1),
      log('fill', 6, 2),
      log('delivery', 100, 3),
      log('move', 100, 3),
      log('empty', 100, 3),
      log('count', 100, 3),
      log('correction', 100, 3),
    ]
    expect(consumptionPerWeek(logs, 'a', now)).toBe(1)
  })

  it('adds the implied usage of a count with previousAmount', () => {
    const counted: ConsumptionLog = { ...log('count', 4, 1), previousAmount: 10 }
    expect(consumptionPerWeek([counted], 'a', now)).toBe(6 / 12)
    expect(consumptionPerWeek([log('count', 4, 1)], 'a', now)).toBe(0)
    expect(consumptionPerWeek([{ ...counted, previousAmount: 2 }], 'a', now)).toBe(0)
  })

  it('filters on feed and window', () => {
    const logs = [
      log('dispense', 12, 1),
      log('dispense', 50, 1, 'b'),
      log('dispense', 50, 12 * 7 + 1),
      log('dispense', 50, 12 * 7),
      { type: 'dispense', feedId: 'a', amount: 50, timestampMs: now + 1 },
    ]
    expect(consumptionPerWeek(logs, 'a', now)).toBe(1)
  })

  it('respects a custom number of weeks', () => {
    expect(consumptionPerWeek([log('fill', 8, 1)], 'a', now, 4)).toBe(2)
  })
})

describe('adviseFeed', () => {
  const schedule: DeliverySchedule = {
    next: new Date(),
    after: new Date(),
    daysToNext: 10,
    daysToAfter: 24,
    targetDays: 31,
  }
  const advise = (o: Partial<AdviceInput>) =>
    adviseFeed({
      stock: 5,
      ratePerWeek: 1,
      isShute: false,
      lastDeliveryMs: null,
      nowMs: 1_000_000_000_000,
      schedule,
      ...o,
    })

  it('inactive when no rate and no stock', () => {
    const a = advise({ stock: 0, ratePerWeek: 0 })
    expect(a.status).toBe('inactive')
    expect(a.orderQty).toBe(0)
    expect(a.dueInDays).toBeNull()
    expect(a.coverDays).toBeNull()
  })

  it('critical when in use but nothing left', () => {
    const a = advise({ stock: 0, ratePerWeek: 2 })
    expect(a.status).toBe('critical')
    expect(a.dueInDays).toBe(0)
    expect(a.orderQty).toBe(Math.ceil((2 * 31) / 7))
  })

  it('ok when stock but no rate', () => {
    const a = advise({ stock: 3, ratePerWeek: 0 })
    expect(a.status).toBe('ok')
    expect(a.dueInDays).toBeNull()
  })

  it('critical when running out before next delivery', () => {
    const a = advise({ stock: 1, ratePerWeek: 1 })
    expect(a.status).toBe('critical')
    expect(a.coverDays).toBe(7)
    expect(a.dueInDays).toBe(7)
    expect(a.orderQty).toBe(4)
  })

  it('critical on the boundary, warning just after', () => {
    expect(advise({ stock: 10 / 7, ratePerWeek: 1 }).status).toBe('critical')
    expect(advise({ stock: 11 / 7, ratePerWeek: 1 }).status).toBe('warning')
    expect(advise({ stock: 24 / 7, ratePerWeek: 1 }).status).toBe('warning')
    expect(advise({ stock: 25 / 7, ratePerWeek: 1 }).status).toBe('ok')
  })

  it('overstock above 56 days of cover', () => {
    expect(advise({ stock: 8, ratePerWeek: 1 }).status).toBe('ok')
    const a = advise({ stock: 9, ratePerWeek: 1 })
    expect(a.status).toBe('overstock')
    expect(a.orderQty).toBe(0)
  })

  it('rounds orderQty up with a minimum of 1', () => {
    expect(advise({ stock: 0.5, ratePerWeek: 0.42 }).orderQty).toBe(2)
    expect(advise({ stock: 1, ratePerWeek: 1.01, schedule: { ...schedule, targetDays: 7 } }).orderQty).toBe(1)
  })

  it('computes daysSinceDelivery', () => {
    const nowMs = 1_000_000_000_000
    expect(advise({ lastDeliveryMs: nowMs - 3.5 * DAY, nowMs }).daysSinceDelivery).toBe(3)
    expect(advise({ lastDeliveryMs: null }).daysSinceDelivery).toBeNull()
  })

  it('exposes Dutch labels and ordering for every status', () => {
    expect(STATUS_LABEL.critical).toBe('Bestellen')
    expect(STATUS_LABEL.warning).toBe('Bijna op')
    expect(STATUS_LABEL.ok).toBe('Op voorraad')
    expect(STATUS_LABEL.overstock).toBe('Te veel')
    expect(STATUS_LABEL.inactive).toBe('Niet in gebruik')
    expect(STATUS_ORDER.critical).toBeLessThan(STATUS_ORDER.warning)
    expect(STATUS_ORDER.inactive).toBe(4)
  })
})

describe('estimateShuteStock', () => {
  const DAY = 86400000
  const t0 = Date.parse('2026-09-18T10:00:00Z')
  const now = t0 + 14 * DAY
  const logs = [
    { type: 'fill', feedId: 'geit', amount: 1, timestampMs: t0 - 30 * DAY }, // older fill, ignored
    { type: 'fill', feedId: 'geit', amount: 1, timestampMs: t0 },
    { type: 'fill', feedId: 'geit', amount: 1, timestampMs: t0 + 3600000 }, // same day: 2 bags went in
    { type: 'fill', feedId: 'ander', amount: 5, timestampMs: t0 + 6 * DAY },
  ]

  it('treats the last fill day as the delivery and depletes it at the usage rate', () => {
    // 2 bags in, 0.5 per week, 2 weeks later -> 1 left
    const e = estimateShuteStock(logs, 'geit', now, 0.5)
    expect(e.delivered).toBe(2)
    expect(e.onHand).toBe(1)
    expect(e.lastDeliveryMs).toBe(t0 + 3600000)
  })

  it('adds bags delivered to a shelf after the last fill', () => {
    const e = estimateShuteStock([...logs, { type: 'delivery', feedId: 'geit', amount: 3, timestampMs: t0 + 5 * DAY }], 'geit', now, 0.5)
    expect(e.onHand).toBe(4)
    expect(e.delivered).toBe(3)
  })

  it('never goes below zero and assumes empty without any fill or delivery', () => {
    expect(estimateShuteStock(logs, 'geit', now, 5).onHand).toBe(0)
    expect(estimateShuteStock(logs, 'niets', now, 1)).toEqual({ onHand: 0, lastDeliveryMs: null, delivered: 0 })
  })
})
