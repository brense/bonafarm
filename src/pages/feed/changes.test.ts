import { describe, expect, it } from 'vitest'
import type { FeedLog } from '../../stock/useFeedLogs.ts'
import { buildChanges } from './changes.ts'

const T = new Date(2026, 9, 5, 9, 12).getTime()
const name = (id: string) => id.toUpperCase()

function l(id: string, storageId: string, type: FeedLog['type'], extra: Partial<FeedLog> = {}): FeedLog {
  return { id, type, feedId: 'f', storageId, amount: 2, timestampMs: T, batchId: 'mv-out1', ...extra }
}
const detail = (logsNewestFirst: FeedLog[]) => buildChanges(logsNewestFirst, name)[0].names

describe('move direction', () => {
  it('(a) a fill half marks the destination', () => {
    expect(detail([l('x', 'koker', 'fill'), l('y', 'a', 'move')])).toBe('A → KOKER')
    expect(detail([l('y', 'a', 'move'), l('x', 'koker', 'fill')])).toBe('A → KOKER')
  })
  it('(b) previousAmount marks the source, also at the same timestamp', () => {
    expect(detail([l('x', 'b', 'move'), l('y', 'a', 'move', { previousAmount: 5 })])).toBe('A → B')
    expect(detail([l('y', 'a', 'move', { previousAmount: 5 }), l('x', 'b', 'move')])).toBe('A → B')
  })
  it('(c) migrated moves: batch id carries the id of the out log', () => {
    expect(detail([l('new', 'b', 'move'), l('out1', 'a', 'move')])).toBe('A → B')
    expect(detail([l('out1', 'a', 'move'), l('new', 'b', 'move')])).toBe('A → B')
  })
  it('(d) otherwise the earlier timestamp is the source', () => {
    const early = l('p', 'a', 'move', { batchId: 'zz', timestampMs: T - 1000 })
    const late = l('q', 'b', 'move', { batchId: 'zz' })
    expect(detail([late, early])).toBe('A → B')
  })
})

describe('feed wording and kind', () => {
  const one = (type: FeedLog['type'], extra: Partial<FeedLog> = {}) =>
    buildChanges([l('a', 's', type, { batchId: undefined, ...extra })], name)[0]
  it('dispense is consumed', () => {
    const e = one('dispense', { amount: 1 })
    expect(e.kind).toBe('consumed')
    expect(e).toMatchObject({ sign: '−', amount: 1, names: 'S', label: 'verbruikt' })
  })
  it('a delivery batch is added', () => {
    const e = buildChanges(
      [l('a', 'x', 'delivery', { batchId: 'b' }), l('b', 'y', 'delivery', { batchId: 'b' })],
      name,
    )[0]
    expect(e.kind).toBe('added')
    expect(e).toMatchObject({ sign: '+', amount: 4, label: 'toegevoegd' })
  })
  it('empty and move kinds', () => {
    expect(one('empty').kind).toBe('empty')
    expect(buildChanges([l('x', 'b', 'move'), l('y', 'a', 'move')], name)[0].kind).toBe('move')
  })
  it('count and empty entries', () => {
    expect(one('count', { amount: 6, previousAmount: 8 })).toMatchObject({ kind: 'count', sign: '', amount: 6, label: 'geteld (was 8)' })
    expect(one('count', { amount: 6 }).label).toBe('geteld')
    expect(one('empty')).toMatchObject({ sign: '', amount: null, names: 'Koker leeg gemaakt', label: 'S' })
  })
})
