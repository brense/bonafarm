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
}

/**
 * All logs of one feed since 1 January of the previous year (this year plus a
 * full year to compare with), oldest first. For the biggest feed that is a few
 * hundred documents.
 *
 * The query is `feedId ==` + `timestamp >=` ordered by `timestamp desc`: the
 * only composite index is `feedId ASC, timestamp DESC` (firestore.indexes.json),
 * so the order must be descending; the result is reversed client-side. The
 * cutoff is a local midnight that only changes once a year, so the query stays
 * identical across mounts and the persisted cache can resume from its token
 * instead of re-reading every document.
 */
export function useFeedLogs(orgId: string | null, feedId: string | null): FeedLog[] | null {
  const [logs, setLogs] = useState<FeedLog[] | null>(null)
  const active = Boolean(orgId) && Boolean(feedId)

  useEffect(() => {
    if (!orgId || !feedId) return
    let cancelled = false
    let unsubscribe = () => {}
    ;(async () => {
      const [{ db }, { collection, onSnapshot, orderBy, query, Timestamp, where }] = await Promise.all([
        import('../lib/firebase.ts'),
        import('firebase/firestore'),
      ])
      if (cancelled) return
      const cutoff = Timestamp.fromMillis(new Date(new Date().getFullYear() - 1, 0, 1).getTime())
      unsubscribe = onSnapshot(
        query(
          collection(db, paths.logs(orgId)),
          where('feedId', '==', feedId),
          where('timestamp', '>=', cutoff),
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
                  timestampMs: (data.timestamp as InstanceType<typeof Timestamp>).toMillis(),
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
