import type { LogType } from '../model/types.ts'
import { paths } from '../model/paths.ts'

export type MutationKind = 'dispense' | 'count' | 'fill' | 'empty'

export interface MutationInput {
  orgId: string
  uid: string
  storageId: string
  feedId: string
  /** Requested amount; ignored for `empty`. */
  amount: number
  /** Stock the app currently knows for this storage/feed pair (0 when there is no item yet). */
  current: number
}

/** What a mutation writes, without touching Firestore. Tested on its own. */
export interface MutationPlan {
  logPath: string
  log: {
    type: LogType
    feedId: string
    storageId: string
    amount: number
    previousAmount?: number
    note?: string
    uid: string
  }
  /** Stock change for counted storages; kokers (fill, empty) have no item. */
  item?: {
    path: string
    storageId: string
    feedId: string
    /** 'increment' adds `by`; 'set' overwrites with `to`. */
    op: { kind: 'increment'; by: number } | { kind: 'set'; to: number }
  }
}

/**
 * Dispensing more than the app knows is allowed (the count was stale, the bag
 * was real): the log keeps the requested amount so consumption stays truthful,
 * the item is clamped at 0 because the rules reject negative stock.
 */
export function planMutation(kind: MutationKind, input: MutationInput): MutationPlan {
  const { orgId, uid, storageId, feedId, current } = input
  const amount = kind === 'empty' ? 0 : round(input.amount)
  if (kind !== 'empty' && !(amount > 0)) throw new Error('amount must be positive')
  if (amount < 0 || current < 0) throw new Error('negative numbers')
  const base = { feedId, storageId, uid }
  const itemPath = paths.item(orgId, storageId, feedId)
  const logPath = paths.logs(orgId)

  switch (kind) {
    case 'dispense':
      return {
        logPath,
        log: { type: 'dispense', amount, ...base },
        item: {
          path: itemPath,
          storageId,
          feedId,
          op: amount <= current ? { kind: 'increment', by: -amount } : { kind: 'set', to: 0 },
        },
      }
    case 'count':
      return {
        logPath,
        log: { type: 'count', amount, previousAmount: current, ...base },
        item: { path: itemPath, storageId, feedId, op: { kind: 'set', to: amount } },
      }
    case 'fill':
      return { logPath, log: { type: 'fill', amount, ...base } }
    case 'empty':
      return { logPath, log: { type: 'empty', amount: 0, ...base } }
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

/** One line of the "Wijziging maken" dialog: a signed delta for a feed in a storage. */
export interface ChangeLine {
  feedId: string
  storageId: string
  /** Negative = taken out, positive = put in. */
  delta: number
  /** Whether the storage counts stock (bin, stable) or consumes it (koker). */
  counted: boolean
  /** Known stock in that storage, for clamping. */
  current: number
}

/**
 * Maps a signed change to the explicit log types: out of a counted storage is
 * `dispense`; into a koker is `fill`; into a counted storage is a `correction`
 * (deliveries have their own flow). Out of a koker makes no sense and throws.
 */
export function planChange(orgId: string, uid: string, line: ChangeLine): MutationPlan {
  const amount = Math.abs(line.delta)
  const input = { orgId, uid, storageId: line.storageId, feedId: line.feedId, amount, current: line.current }
  if (line.delta < 0) {
    if (!line.counted) throw new Error('cannot take feed out of a koker')
    return planMutation('dispense', input)
  }
  if (!line.counted) return planMutation('fill', input)
  const plan = planMutation('count', input) // reuse the paths, then overwrite the semantics
  return {
    logPath: plan.logPath,
    log: { type: 'correction', feedId: line.feedId, storageId: line.storageId, amount, uid, note: 'erbij gezet' },
    item: { path: plan.item!.path, storageId: line.storageId, feedId: line.feedId, op: { kind: 'increment', by: amount } },
  }
}

/**
 * Writes one or more plans as a single batch: each log and, for counted
 * storages, the item upsert. Resolves when the local cache has it; the server
 * may still reject (rules), which surfaces through the returned promise.
 */
export async function applyMutations(plans: MutationPlan[]): Promise<void> {
  if (plans.length === 0) return
  const [{ db }, { collection, doc, increment, serverTimestamp, writeBatch }] = await Promise.all([
    import('../lib/firebase.ts'),
    import('firebase/firestore'),
  ])
  const batch = writeBatch(db)
  for (const plan of plans) {
    batch.set(doc(collection(db, plan.logPath)), { ...plan.log, timestamp: serverTimestamp() })
    if (plan.item) {
      const { path, storageId, feedId, op } = plan.item
      batch.set(
        doc(db, path),
        {
          storageId,
          feedId,
          amount: op.kind === 'increment' ? increment(op.by) : op.to,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }
  }
  await batch.commit()
}

export function applyMutation(plan: MutationPlan): Promise<void> {
  return applyMutations([plan])
}
