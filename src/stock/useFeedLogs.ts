import { useEffect, useState } from 'react'
import type { LogType } from '../model/types.ts'
import { paths } from '../model/paths.ts'

export interface FeedLog {
  type: LogType
  feedId: string
  storageId: string
  amount: number
  previousAmount?: number
  timestampMs: number
  batchId?: string
}

/**
 * The full history of one feed, oldest first. That is about 1.5k documents for
 * the biggest feed (hooi): read once per device, after which the persisted
 * cache serves it and only changes are fetched. Needed for the per-year and
 * seasonality cards.
 *
 * The query is `feedId ==` ordered by `timestamp desc`: the only composite
 * index is `feedId ASC, timestamp DESC` (firestore.indexes.json), so the order
 * must be descending; the result is reversed client-side.
 */
export function useFeedLogs(orgId: string | null, feedId: string | null): FeedLog[] | null {
  const [logs, setLogs] = useState<FeedLog[] | null>(null)
  const active = Boolean(orgId) && Boolean(feedId)

  useEffect(() => {
    if (!orgId || !feedId) return
    let cancelled = false
    let unsubscribe = () => {}
    ;(async () => {
      const [{ db }, { collection, onSnapshot, orderBy, query, where }] = await Promise.all([
        import('../lib/firebase.ts'),
        import('firebase/firestore'),
      ])
      if (cancelled) return
      unsubscribe = onSnapshot(
        query(
          collection(db, paths.logs(orgId)),
          where('feedId', '==', feedId),
          orderBy('timestamp', 'desc'),
        ),
        (snap) => {
          setLogs(
            snap.docs
              .map((d): FeedLog => {
                const data = d.data()
                return {
                  type: data.type as LogType,
                  feedId: data.feedId as string,
                  storageId: data.storageId as string,
                  amount: data.amount as number,
                  ...(typeof data.previousAmount === 'number' ? { previousAmount: data.previousAmount } : {}),
                  timestampMs: (data.timestamp as { toMillis(): number }).toMillis(),
                  ...(typeof data.batchId === 'string' ? { batchId: data.batchId } : {}),
                }
              })
              .reverse(),
          )
        },
        (err) => console.warn('Feed logs listener failed', err.code),
      )
    })()
    return () => {
      cancelled = true
      unsubscribe()
      setLogs(null)
    }
  }, [orgId, feedId])

  return active ? logs : null
}
