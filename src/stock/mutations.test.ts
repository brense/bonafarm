import { describe, expect, it } from 'vitest'
import { planMutation } from './mutations.ts'

const base = { orgId: 'tanthof', uid: 'u1', storageId: 'ton-roze', feedId: 'hooi' }

describe('planMutation', () => {
  it('dispense decrements the item and logs the amount', () => {
    const p = planMutation('dispense', { ...base, amount: 2, current: 5 })
    expect(p.log).toEqual({ type: 'dispense', amount: 2, feedId: 'hooi', storageId: 'ton-roze', uid: 'u1' })
    expect(p.logPath).toBe('organisations/tanthof/logs')
    expect(p.item).toEqual({
      path: 'organisations/tanthof/items/ton-roze_hooi',
      storageId: 'ton-roze',
      feedId: 'hooi',
      op: { kind: 'increment', by: -2 },
    })
  })

  it('dispensing more than known clamps the item at 0 but logs what was taken', () => {
    const p = planMutation('dispense', { ...base, amount: 3, current: 1 })
    expect(p.log.amount).toBe(3)
    expect(p.item?.op).toEqual({ kind: 'set', to: 0 })
  })

  it('count sets the item and records the previous amount', () => {
    const p = planMutation('count', { ...base, amount: 7.5, current: 10 })
    expect(p.log).toMatchObject({ type: 'count', amount: 7.5, previousAmount: 10 })
    expect(p.item?.op).toEqual({ kind: 'set', to: 7.5 })
  })

  it('fill and empty only log', () => {
    expect(planMutation('fill', { ...base, amount: 1, current: 0 })).toEqual({
      logPath: 'organisations/tanthof/logs',
      log: { type: 'fill', amount: 1, feedId: 'hooi', storageId: 'ton-roze', uid: 'u1' },
    })
    expect(planMutation('empty', { ...base, amount: 99, current: 0 }).log).toMatchObject({ type: 'empty', amount: 0 })
  })

  it('rejects zero and negative amounts', () => {
    expect(() => planMutation('dispense', { ...base, amount: 0, current: 1 })).toThrow()
    expect(() => planMutation('count', { ...base, amount: -1, current: 1 })).toThrow()
  })
})
