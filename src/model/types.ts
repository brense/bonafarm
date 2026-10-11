import type { GeoPoint, Timestamp } from 'firebase/firestore'

/**
 * Firestore data model for the multi-tenant app.
 *
 * organisations/{orgId}
 *   branding/public                  world-readable, drives title/theme/manifest
 *   members/{uid}                    roles: owner | admin | order | deliver | feed | view
 *   feeds/{feedId}
 *   storageTypes/{typeId}            seeded: bin, shute, stable
 *   storageGroups/{groupId}          seeded: ungrouped
 *   storages/{storageId}             groupId and typeId reference the two above
 *   items/{storageId}_{feedId}       current stock, flat so one listener covers the organisation
 *   batches/{batchId}                groups logs, e.g. one delivery
 *   logs/{logId}
 *
 * The path always identifies the organisation; documents carry no orgId field.
 * Storages are flat under the organisation so moving one to another group is a
 * single field update. Items are flat too, with a compound id, so org-wide
 * stock is one query and one storage is `where('storageId', '==', id)`.
 */

/**
 * A member holds one or more roles.
 * - owner: admin plus cannot be removed; only owners manage owners and admins
 * - admin: manages feeds, storages, members, branding; may log anything
 * - order: stock overview with order advice and export (use case 1)
 * - deliver: logs deliveries and koker fills, opens delivery batches (use case 2)
 * - feed: dispenses, counts, empties, moves (use case 3)
 * - view: read only
 */
export type MemberRole = 'owner' | 'admin' | 'order' | 'deliver' | 'feed' | 'view'

/**
 * Per-organisation branding. Lives in organisations/{orgId}/branding/public and
 * is readable without signing in, because the web app manifest is fetched by
 * the browser without credentials. All fields optional; see DEFAULT_BRANDING.
 */
export interface Branding {
  /** Full name, e.g. "Voer app". Used for the manifest name and the page title. */
  appName?: string
  /** Short name for the home screen, 12 characters or fewer. */
  shortName?: string
  description?: string
  /** 'dark' or 'light' MUI palette mode. */
  mode?: 'dark' | 'light'
  /** Hex colours. */
  primaryColor?: string
  secondaryColor?: string
  /** Browser chrome / splash colours for the manifest and the theme-color meta tag. */
  themeColor?: string
  backgroundColor?: string
  /** Absolute URLs or site-relative paths to PNG icons. */
  icon192?: string
  icon512?: string
  /** 512x512 PNG with safe-zone padding for maskable icons. */
  iconMaskable?: string
}

export interface Organisation {
  name: string
  createdAt: Timestamp
}

export interface Member {
  /** Same as the doc id; a field too so a user can find their organisations. */
  uid: string
  /** At least one role. */
  roles: MemberRole[]
  /** Name and avatar come from the auth user token, not from this doc. */
  email?: string
  createdAt: Timestamp
}

export type Unit = 'zak' | 'baal'

export interface Feed {
  name: string
  unit: Unit
  /** Other names this feed goes by, e.g. on the supplier's delivery list. */
  aliases?: string[]
  /** Largest amount one swipe can select in the change dialog; default 3 (hooi 30, stro 20). */
  swipeMax?: number
  /** Default storage this feed lives in, used to prefill forms. */
  defaultStorageId?: string
  hidden: boolean
  order: number
}

/** How a storage type behaves for stock and statistics. */
export type StorageBehaviour =
  /** Counted stock, e.g. a bin of bags. Deliveries add, dispensing removes. */
  | 'counted'
  /** Consumed on fill, e.g. a shute. Whatever goes in is used; no stock count. */
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
  /** Where the storage stands; used to sort pickers by distance, never to auto-select. */
  location?: GeoPoint
}

/**
 * Current stock of one feed in one storage.
 * Doc id = `${storageId}_${feedId}` (see itemId), so writes are upserts.
 */
export interface Item {
  storageId: string
  feedId: string
  amount: number
  updatedAt: Timestamp
}

/** Storage and feed ids are slugs without underscores, so the join is unambiguous. */
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export function itemId(storageId: string, feedId: string): string {
  return `${storageId}_${feedId}`
}

/**
 * A batch groups logs that belong together, e.g. the lines of one delivery.
 * An open batch (no closedAt) can be resumed after the app was closed.
 */
export interface Batch {
  type: 'delivery' | 'move'
  uid: string
  startedAt: Timestamp
  closedAt?: Timestamp
  note?: string
}

/**
 * Explicit event types replace the sign-and-timing inference of the old app.
 * Amounts are always positive; the type says what happened.
 */
export type LogType =
  /** Supplier delivery arrived in a storage. */
  | 'delivery'
  /** The stock in a storage was set to `amount`. */
  | 'count'
  /** Feed taken out of a counted storage for use. */
  | 'dispense'
  /** Feed poured into a consumed storage (shute). */
  | 'fill'
  /** A consumed storage was emptied. */
  | 'empty'
  /** Feed moved between storages (two logs share a batchId). */
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
  /** References batches/{batchId}: the delivery this line belongs to, or the two halves of a move. */
  batchId?: string
  note?: string
  uid: string
  timestamp: Timestamp
}
