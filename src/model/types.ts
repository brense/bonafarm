import type { Timestamp } from 'firebase/firestore'

/**
 * Firestore data model for the multi-tenant app.
 *
 * organisations/{orgId}
 *   members/{uid}
 *   feeds/{feedId}
 *   logs/{logId}
 *   storageTypes/{typeId}            seeded: bin, shute, stable
 *   storageGroups/{groupId}          seeded: ungrouped
 *   storages/{storageId}             groupId and typeId reference the two above
 *     items/{feedId}
 *
 * The path always identifies the organisation; documents carry no orgId field.
 * Storages are flat under the organisation so moving one to another group is a
 * single field update.
 */

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Organisation {
  name: string
  createdAt: Timestamp
}

export interface Member {
  /** Same as the doc id; a field too so a user can find their organisations. */
  uid: string
  role: MemberRole
  displayName: string
  email?: string
  createdAt: Timestamp
}

export type Unit = 'zak' | 'baal'

export interface Feed {
  name: string
  unit: Unit
  /** Default storage this feed lives in, used to prefill forms. */
  defaultStorageId?: string
  hidden: boolean
  order: number
}

/** How a storage type behaves for stock and statistics. */
export type StorageBehaviour =
  /** Counted stock, e.g. a bin of bags. Deliveries add, dispensing removes. */
  | 'counted'
  /** Consumed on fill, e.g. a koker. Whatever goes in is used; no stock count. */
  | 'consumed'

export interface StorageType {
  name: string
  behaviour: StorageBehaviour
  order: number
}

export interface StorageGroup {
  name: string
  order: number
}

export interface Storage {
  /** References storageGroups/{groupId}. Change it to move the storage. */
  groupId: string
  /** References storageTypes/{typeId}. */
  typeId: string
  name: string
  status: 'active' | 'archived'
  order: number
  color?: string
  image?: string
}

/** Current stock of one feed in one storage. Doc id = feedId. */
export interface Item {
  /** Same as the doc id. */
  feedId: string
  amount: number
  updatedAt: Timestamp
}

/**
 * Explicit event types replace the sign-and-timing inference of the old app.
 * Amounts are always positive; the type says what happened.
 */
export type LogType =
  /** Supplier delivery arrived in a storage. */
  | 'delivery'
  /** Weekly count: the stock in a storage was set to `amount`. */
  | 'count'
  /** Feed taken out of a counted storage for use. */
  | 'dispense'
  /** Feed poured into a consumed storage (koker). */
  | 'fill'
  /** A consumed storage was emptied. */
  | 'empty'
  /** Feed moved between storages (two logs share `moveId`). */
  | 'move'
  /** Manual correction of a mistake. */
  | 'correction'

export interface Log {
  type: LogType
  feedId: string
  storageId: string
  amount: number
  /** For `count`: the stock before the count, so the implied usage is known. */
  previousAmount?: number
  /** Links the two halves of a move. */
  moveId?: string
  note?: string
  uid: string
  timestamp: Timestamp
}
