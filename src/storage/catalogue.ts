import { paths } from '../model/paths.ts'

export interface Ordered {
  id: string
  order: number
}

export interface OrderWrite {
  path: string
  data: { order: number } | { groupId: string; order: number } | { name: string; order: number } | { name: string }
}

/** Keeps the planning free of Firestore so it stays testable. */
export interface CataloguePlan {
  /** `update` on existing documents. */
  updates: OrderWrite[]
  /** `set` on new documents (a new group). */
  creates: OrderWrite[]
}

function sortedByOrder<T extends Ordered>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

/**
 * Moves one item within a list and renumbers 0..n-1. Only items whose order
 * actually changes are written, so a drag costs a few writes. Migrated data has
 * gaps and ties; the first drag in a list normalises them.
 */
export function planReorder(
  items: readonly Ordered[],
  fromIndex: number,
  toIndex: number,
  pathFor: (id: string) => string,
): OrderWrite[] {
  const list = sortedByOrder(items)
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return []
  const [moved] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, moved)
  const writes: OrderWrite[] = []
  list.forEach((item, index) => {
    if (item.order !== index) writes.push({ path: pathFor(item.id), data: { order: index } })
  })
  return writes
}

export function planReorderStorages(orgId: string, items: readonly Ordered[], fromIndex: number, toIndex: number): OrderWrite[] {
  return planReorder(items, fromIndex, toIndex, (id) => paths.storage(orgId, id))
}

export function planReorderGroups(orgId: string, groups: readonly Ordered[], fromIndex: number, toIndex: number): OrderWrite[] {
  return planReorder(groups, fromIndex, toIndex, (id) => paths.storageGroup(orgId, id))
}

/** Puts a storage at the end of another group. */
export function planMoveToGroup(orgId: string, storageId: string, groupId: string, groupStorages: readonly Ordered[]): OrderWrite {
  const last = groupStorages.reduce((max, s) => Math.max(max, s.order), -1)
  return { path: paths.storage(orgId, storageId), data: { groupId, order: last + 1 } }
}

/**
 * Drops a storage at `index` in another group: the moved storage gets `index`,
 * the target's storages at or after it shift up by one. Only changes are written.
 */
export function planMoveToGroupAt(
  orgId: string,
  storageId: string,
  groupId: string,
  groupStorages: readonly Ordered[],
  index: number,
): OrderWrite[] {
  const others = sortedByOrder(groupStorages.filter((s) => s.id !== storageId))
  const at = Math.max(0, index)
  const writes: OrderWrite[] = [{ path: paths.storage(orgId, storageId), data: { groupId, order: at } }]
  others.forEach((s, position) => {
    if (position < at) return
    const order = position + 1
    if (s.order !== order) writes.push({ path: paths.storage(orgId, s.id), data: { order } })
  })
  return writes
}

const GROUP_ID = /^[a-z0-9][a-z0-9-]*$/

/** Slug from a name, unique among the existing groups. */
export function groupIdFor(name: string, existing: ReadonlySet<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'groep'
  let id = base
  let n = 2
  while (existing.has(id) || !GROUP_ID.test(id)) id = `${base}-${n++}`
  return id
}

export function planNewGroup(orgId: string, name: string, groups: ReadonlyMap<string, Ordered>): { id: string; write: OrderWrite } {
  const id = groupIdFor(name, new Set(groups.keys()))
  const last = [...groups.values()].reduce((max, g) => Math.max(max, g.order), -1)
  return { id, write: { path: paths.storageGroup(orgId, id), data: { name: name.trim(), order: last + 1 } } }
}

export function planRenameGroup(orgId: string, groupId: string, name: string): OrderWrite {
  return { path: paths.storageGroup(orgId, groupId), data: { name: name.trim() } }
}

/** One batch for everything; `update` for existing docs, `set` for new ones. */
export async function applyCatalogue(plan: CataloguePlan): Promise<void> {
  if (plan.updates.length === 0 && plan.creates.length === 0) return
  const [{ db }, { doc, writeBatch }] = await Promise.all([import('../lib/firebase.ts'), import('firebase/firestore')])
  const batch = writeBatch(db)
  for (const w of plan.creates) batch.set(doc(db, w.path), w.data)
  for (const w of plan.updates) batch.update(doc(db, w.path), w.data)
  await batch.commit()
}
