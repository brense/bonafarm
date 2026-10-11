import { describe, expect, it } from 'vitest'
import { planChange, planChangeLine, planMutation } from './mutations.ts'

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

describe('planChange', () => {
  const line = { feedId: 'hooi', storageId: 'ton-roze', current: 5, counted: true }

  it('negative from a counted storage is a dispense', () => {
    const p = planChange('tanthof', 'u1', { ...line, delta: -2 })
    expect(p.log).toMatchObject({ type: 'dispense', amount: 2 })
    expect(p.item?.op).toEqual({ kind: 'increment', by: -2 })
  })

  it('positive into a koker is a fill without item', () => {
    const p = planChange('tanthof', 'u1', { ...line, storageId: 'koker', counted: false, delta: 1 })
    expect(p.log).toMatchObject({ type: 'fill', amount: 1, storageId: 'koker' })
    expect(p.item).toBeUndefined()
  })

  it('positive into a counted storage is a correction that increments', () => {
    const p = planChange('tanthof', 'u1', { ...line, delta: 1.5 })
    expect(p.log).toMatchObject({ type: 'correction', amount: 1.5, note: 'erbij gezet' })
    expect(p.item?.op).toEqual({ kind: 'increment', by: 1.5 })
  })

  it('refuses taking feed out of a koker', () => {
    expect(() => planChange('tanthof', 'u1', { ...line, counted: false, delta: -1 })).toThrow()
  })
})

describe('planChangeLine', () => {
  const ctx = {
    orgId: 'tanthof',
    uid: 'u1',
    counted: (id: string) => id !== 'koker',
    current: (storageId: string, feedId: string) => (storageId === 'ton' && feedId === 'geit' ? 3 : 0),
    newId: () => 'X',
  }

  it('consumed from a bin is a dispense', () => {
    const plans = planChangeLine({ feedId: 'geit', amount: 1, fromStorageId: 'ton', toStorageId: null }, ctx)
    expect(plans).toHaveLength(1)
    expect(plans[0].log).toMatchObject({ type: 'dispense', amount: 1, storageId: 'ton' })
    expect(plans[0].item?.op).toEqual({ kind: 'increment', by: -1 })
  })

  it('bin to koker is a move out plus a fill in one batch', () => {
    const plans = planChangeLine({ feedId: 'geit', amount: 2, fromStorageId: 'ton', toStorageId: 'koker' }, ctx)
    expect(plans.map((p) => p.log.type)).toEqual(['move', 'fill'])
    expect(plans[0].log.batchId).toBe('mv-X')
    expect(plans[1].log.batchId).toBe('mv-X')
    expect(plans[0].batch).toEqual({ path: 'organisations/tanthof/batches/mv-X', data: { type: 'move', uid: 'u1' } })
    expect(plans[0].item?.op).toEqual({ kind: 'increment', by: -2 })
    expect(plans[1].item).toBeUndefined()
  })

  it('bin to bin moves both items', () => {
    const plans = planChangeLine({ feedId: 'geit', amount: 1, fromStorageId: 'ton', toStorageId: 'ton2' }, ctx)
    expect(plans.map((p) => p.log.type)).toEqual(['move', 'move'])
    expect(plans[1].item?.op).toEqual({ kind: 'increment', by: 1 })
    expect(plans[1].item?.path).toBe('organisations/tanthof/items/ton2_geit')
  })

  it('from outside: fill into a koker, correction into a bin', () => {
    expect(planChangeLine({ feedId: 'geit', amount: 1, fromStorageId: null, toStorageId: 'koker' }, ctx)[0].log.type).toBe('fill')
    expect(planChangeLine({ feedId: 'geit', amount: 1, fromStorageId: null, toStorageId: 'ton' }, ctx)[0].log.type).toBe('correction')
  })

  it('rejects nonsense', () => {
    expect(() => planChangeLine({ feedId: 'geit', amount: 1, fromStorageId: null, toStorageId: null }, ctx)).toThrow()
    expect(() => planChangeLine({ feedId: 'geit', amount: 1, fromStorageId: 'koker', toStorageId: 'ton' }, ctx)).toThrow()
    expect(() => planChangeLine({ feedId: 'geit', amount: 1, fromStorageId: 'ton', toStorageId: 'ton' }, ctx)).toThrow()
  })
})
