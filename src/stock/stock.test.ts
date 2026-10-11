import { describe, expect, it } from 'vitest'
import type { Feed, Item, Storage, StorageType } from '../model/types.ts'
import { formatAmount, stockPerFeed, unitLabel } from './stock.ts'

const types = new Map<string, StorageType>([
  ['bin', { name: 'Bak', behaviour: 'counted', order: 0 }],
  ['shute', { name: 'Koker', behaviour: 'consumed', order: 1 }],
])
const storages = new Map<string, Storage>([
  ['ton-roze', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton roze', status: 'active', order: 2 }],
  ['ton-geel', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton geel', status: 'active', order: 1 }],
  ['oud', { groupId: 'ungrouped', typeId: 'bin', name: 'Oud', status: 'archived', order: 9 }],
  ['koker-geit', { groupId: 'ungrouped', typeId: 'shute', name: 'Koker geit', status: 'active', order: 3 }],
])
const feeds = new Map<string, Feed>([
  ['hooi', { name: 'Hooi', unit: 'baal', hidden: false, order: 1 }],
  ['geitenkorrel', { name: 'Geitenkorrel', unit: 'zak', hidden: false, order: 2, defaultStorageId: 'koker-geit' }],
  ['oudvoer', { name: 'Oud voer', unit: 'zak', hidden: true, order: 3 }],
])
const ts = {} as Item['updatedAt']
const items = new Map<string, Item>([
  ['ton-roze_hooi', { storageId: 'ton-roze', feedId: 'hooi', amount: 2.5, updatedAt: ts }],
  ['ton-geel_hooi', { storageId: 'ton-geel', feedId: 'hooi', amount: 1, updatedAt: ts }],
  ['oud_hooi', { storageId: 'oud', feedId: 'hooi', amount: 5, updatedAt: ts }],
  ['koker-geit_geitenkorrel', { storageId: 'koker-geit', feedId: 'geitenkorrel', amount: 3, updatedAt: ts }],
  ['ton-roze_oudvoer', { storageId: 'ton-roze', feedId: 'oudvoer', amount: 1, updatedAt: ts }],
])

describe('stockPerFeed', () => {
  const rows = stockPerFeed(feeds, storages, types, items)

  it('skips hidden feeds and keeps feed order', () => {
    expect(rows.map((r) => r.feedId)).toEqual(['hooi', 'geitenkorrel'])
  })

  it('sums only active counted storages, ordered by storage order', () => {
    const hooi = rows[0]
    expect(hooi.total).toBe(3.5)
    expect(hooi.perStorage.map((s) => [s.storageName, s.amount])).toEqual([
      ['Ton geel', 1],
      ['Ton roze', 2.5],
    ])
  })

  it('never counts kokers and flags koker feeds', () => {
    const geit = rows[1]
    expect(geit.total).toBe(0)
    expect(geit.perStorage).toEqual([])
    expect(geit.isShute).toBe(true)
    expect(rows[0].isShute).toBe(false)
  })
})

describe('formatting', () => {
  it('uses Dutch decimals and plurals', () => {
    expect(formatAmount(7.5)).toBe('7,5')
    expect(formatAmount(2)).toBe('2')
    expect(unitLabel('zak', 1)).toBe('zak')
    expect(unitLabel('zak', 0.5)).toBe('zakken')
    expect(unitLabel('baal', 20)).toBe('balen')
  })
})
