import { describe, expect, it } from 'vitest'
import { groupIdFor, planMoveToGroup, planNewGroup, planReorderGroups, planReorderStorages } from './catalogue.ts'

const items = [
  { id: 'a', order: 1 },
  { id: 'b', order: 5 },
  { id: 'c', order: 5 },
  { id: 'd', order: 9 },
]

describe('planReorder', () => {
  it('moves an item and writes only changed orders, normalised to 0..n-1', () => {
    // sorted: a(1) b(5) c(5) d(9); move d to the front -> d a b c; a already has order 1
    expect(planReorderStorages('org', items, 3, 0)).toEqual([
      { path: 'organisations/org/storages/d', data: { order: 0 } },
      { path: 'organisations/org/storages/b', data: { order: 2 } },
      { path: 'organisations/org/storages/c', data: { order: 3 } },
    ])
  })

  it('writes nothing for a no-op drop on an already normalised list', () => {
    const tidy = [
      { id: 'a', order: 0 },
      { id: 'b', order: 1 },
    ]
    expect(planReorderGroups('org', tidy, 1, 1)).toEqual([])
    expect(planReorderGroups('org', tidy, 5, 0)).toEqual([])
  })

  it('uses the group path for groups', () => {
    expect(planReorderGroups('org', [{ id: 'x', order: 0 }, { id: 'y', order: 1 }], 1, 0)[0].path).toBe('organisations/org/storageGroups/y')
  })
})

describe('groups', () => {
  it('moves a storage to the end of a group', () => {
    expect(planMoveToGroup('org', 's1', 'stal', [{ id: 'z', order: 3 }])).toEqual({
      path: 'organisations/org/storages/s1',
      data: { groupId: 'stal', order: 4 },
    })
    expect(planMoveToGroup('org', 's1', 'leeg', []).data).toEqual({ groupId: 'leeg', order: 0 })
  })

  it('slugs group names and keeps ids unique', () => {
    expect(groupIdFor('Grote stal', new Set())).toBe('grote-stal')
    expect(groupIdFor('Grote stal', new Set(['grote-stal']))).toBe('grote-stal-2')
    expect(groupIdFor('Été!', new Set())).toBe('ete')
    expect(groupIdFor('###', new Set())).toBe('groep')
  })

  it('creates a group after the last one', () => {
    const groups = new Map([
      ['ungrouped', { id: 'ungrouped', order: 0 }],
      ['stal', { id: 'stal', order: 4 }],
    ])
    expect(planNewGroup('org', ' Kokers ', groups)).toEqual({
      id: 'kokers',
      write: { path: 'organisations/org/storageGroups/kokers', data: { name: 'Kokers', order: 5 } },
    })
  })
})
