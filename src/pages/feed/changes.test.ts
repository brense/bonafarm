import { describe, expect, it } from 'vitest'
import type { FeedLog } from '../../stock/useFeedLogs.ts'
import { buildChanges } from './changes.ts'

const T = new Date(2026, 9, 5, 9, 12).getTime()
const name = (id: string) => id.toUpperCase()

function l(id: string, storageId: string, type: FeedLog['type'], extra: Partial<FeedLog> = {}): FeedLog {
  return { id, type, feedId: 'f', storageId, amount: 2, timestampMs: T, batchId: 'mv-out1', ...extra }
}
const detail = (logsNewestFirst: FeedLog[]) => buildChanges(logsNewestFirst, 'baal', name, T)[0].detail

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
