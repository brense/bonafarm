import { useEffect, useState } from 'react'
import type { LogType } from '../model/types.ts'
import { paths } from '../model/paths.ts'

export interface RecentLog {
  type: LogType
  feedId: string
  storageId: string
  amount: number
  previousAmount?: number
  timestampMs: number
}

/**
 * Logs of the last `weeks` weeks, one bounded listener (single-field range on
 * timestamp, no composite index). About 200 documents for 12 weeks; only
 * subscribed while the caller needs them.
 */
export function useRecentLogs(orgId: string | null, weeks: number, enabled: boolean) {
  const [logs, setLogs] = useState<RecentLog[] | null>(null)
  const active = Boolean(orgId) && enabled

  useEffect(() => {
    if (!orgId || !enabled) return
    let cancelled = false
    let unsubscribe = () => {}
    ;(async () => {
      const [{ db }, { collection, onSnapshot, orderBy, query, Timestamp, where }] = await Promise.all([
        import('../lib/firebase.ts'),
        import('firebase/firestore'),
      ])
      if (cancelled) return
      const cutoff = Timestamp.fromMillis(Date.now() - weeks * 7 * 86400000)
      unsubscribe = onSnapshot(
        query(collection(db, paths.logs(orgId)), where('timestamp', '>=', cutoff), orderBy('timestamp')),
        (snap) => {
          setLogs(
            snap.docs.map((d) => {
              const data = d.data()
              return {
                type: data.type as LogType,
                feedId: data.feedId as string,
                storageId: data.storageId as string,
                amount: data.amount as number,
                ...(typeof data.previousAmount === 'number' ? { previousAmount: data.previousAmount } : {}),
                timestampMs: (data.timestamp as InstanceType<typeof Timestamp>).toMillis(),
              }
            }),
          )
        },
        (err) => console.warn('Recent logs listener failed', err.code),
      )
    })()
    return () => {
      cancelled = true
      unsubscribe()
      setLogs(null)
    }
  }, [orgId, weeks, enabled])

  return active ? logs : null
}
