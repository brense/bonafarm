import { describe, expect, it } from 'vitest'
import { buildChanges, type ChangeLog, type Perspective } from './changes.ts'

const T = new Date(2026, 9, 5, 9, 12).getTime()
const name = (id: string) => id.toUpperCase()
const feedP: Perspective = { kind: 'feed', storageName: name }
const storageP: Perspective = { kind: 'storage', storageId: 's', feedName: (id) => `Voer ${id}` }

function l(id: string, storageId: string, type: ChangeLog['type'], extra: Partial<ChangeLog> = {}): ChangeLog {
  return { id, type, feedId: 'f', storageId, amount: 2, timestampMs: T, batchId: 'mv-out1', ...extra }
}
const detail = (logsNewestFirst: ChangeLog[]) => buildChanges(logsNewestFirst, feedP)[0].names

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
  const one = (type: ChangeLog['type'], extra: Partial<ChangeLog> = {}) =>
    buildChanges([l('a', 's', type, { batchId: undefined, ...extra })], feedP)[0]
  it('dispense is consumed', () => {
    const e = one('dispense', { amount: 1 })
    expect(e.kind).toBe('consumed')
    expect(e).toMatchObject({ sign: '−', amount: 1, names: 'S', label: 'verbruikt' })
  })
  it('a delivery batch is added', () => {
    const e = buildChanges(
      [l('a', 'x', 'delivery', { batchId: 'b' }), l('b', 'y', 'delivery', { batchId: 'b' })],
      feedP,
    )[0]
    expect(e.kind).toBe('added')
    expect(e).toMatchObject({ sign: '+', amount: 4, label: 'toegevoegd' })
  })
  it('empty and move kinds', () => {
    expect(buildChanges([l('x', 'b', 'move'), l('y', 'a', 'move')], feedP)[0].kind).toBe('move')
  })
  it('empty logs give no entry in the feed perspective', () => {
    expect(buildChanges([l('a', 's', 'empty', { batchId: undefined }), l('b', 's', 'dispense', { batchId: undefined })], feedP)).toHaveLength(1)
  })
  it('count entries', () => {
    expect(one('count', { amount: 6, previousAmount: 8 })).toMatchObject({ kind: 'count', sign: '', amount: 6, label: 'geteld (was 8)' })
    expect(one('count', { amount: 6 }).label).toBe('geteld')
  })
})

describe('storage perspective', () => {
  const one = (type: ChangeLog['type'], extra: Partial<ChangeLog> = {}) =>
    buildChanges([l('a', 's', type, { batchId: undefined, ...extra })], storageP)[0]
  it('uses the feed name', () => {
    expect(one('dispense')).toMatchObject({ names: 'Voer f', sign: '−' })
  })
  it('empty keeps its entry', () => {
    expect(one('empty')).toMatchObject({ kind: 'empty', sign: '', amount: null, names: 'Koker leeg gemaakt', label: 'Voer f' })
  })
  it('move out half (previousAmount) is a minus', () => {
    expect(one('move', { previousAmount: 5 })).toMatchObject({ kind: 'move', sign: '−', label: 'verplaatst' })
  })
  it('migrated out half is a minus', () => {
    expect(one('move', { id: 'o1', batchId: 'mv-o1' })).toMatchObject({ sign: '−' })
  })
  it('in half is a plus', () => {
    expect(one('move', { id: 'n1', batchId: 'mv-o1' })).toMatchObject({ sign: '+', label: 'verplaatst' })
  })
  it('delivery batch names per feed', () => {
    const e = buildChanges(
      [l('a', 's', 'delivery', { batchId: 'b', feedId: 'x' }), l('b', 's', 'delivery', { batchId: 'b', feedId: 'x' }), l('c', 's', 'delivery', { batchId: 'b', feedId: 'y' })],
      storageP,
    )[0]
    expect(e).toMatchObject({ sign: '+', amount: 6, names: '2 Voer y · 4 Voer x' })
    expect(buildChanges([l('a', 's', 'delivery', { batchId: 'b' })], storageP)[0].names).toBe('Voer f')
  })
  it('pending logs keep a null timestamp', () => {
    expect(one('count', { timestampMs: null }).timestampMs).toBeNull()
  })
})
