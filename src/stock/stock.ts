import type { Feed, Item, Storage, StorageType, Unit } from '../model/types.ts'

type DocMap<T> = ReadonlyMap<string, T>

export interface StorageStock {
  storageId: string
  storageName: string
  amount: number
}

export interface FeedStock {
  feedId: string
  name: string
  unit: Unit
  order: number
  /** Sum over active, counted storages. Kokers never hold stock. */
  total: number
  perStorage: StorageStock[]
  /** The feed's default storage is a koker: bags go straight in, stock is rarely counted. */
  isKoker: boolean
}

/** Stock per visible feed. Only items in active storages whose type is counted contribute. */
export function stockPerFeed(
  feeds: DocMap<Feed>,
  storages: DocMap<Storage>,
  storageTypes: DocMap<StorageType>,
  items: DocMap<Item>,
): FeedStock[] {
  const counted = (storageId: string) => {
    const s = storages.get(storageId)
    return s !== undefined && s.status === 'active' && storageTypes.get(s.typeId)?.behaviour === 'counted'
  }
  const byFeed = new Map<string, StorageStock[]>()
  for (const item of items.values()) {
    if (!counted(item.storageId) || item.amount === 0) continue
    const list = byFeed.get(item.feedId) ?? []
    list.push({ storageId: item.storageId, storageName: storages.get(item.storageId)!.name, amount: item.amount })
    byFeed.set(item.feedId, list)
  }
  const rows: FeedStock[] = []
  for (const [feedId, feed] of feeds) {
    if (feed.hidden) continue
    const perStorage = (byFeed.get(feedId) ?? []).sort(
      (a, b) => (storages.get(a.storageId)?.order ?? 0) - (storages.get(b.storageId)?.order ?? 0),
    )
    const defaultType = feed.defaultStorageId ? storages.get(feed.defaultStorageId)?.typeId : undefined
    rows.push({
      feedId,
      name: feed.name,
      unit: feed.unit,
      order: feed.order,
      total: perStorage.reduce((sum, s) => sum + s.amount, 0),
      perStorage,
      isKoker: defaultType !== undefined && storageTypes.get(defaultType)?.behaviour === 'consumed',
    })
  }
  return rows.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'nl'))
}

const nl1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 })

export function formatAmount(n: number): string {
  return nl1.format(n)
}

export function unitLabel(unit: Unit, amount: number): string {
  const one = amount === 1
  return unit === 'baal' ? (one ? 'baal' : 'balen') : one ? 'zak' : 'zakken'
}
