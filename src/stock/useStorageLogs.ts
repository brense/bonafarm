import { useEffect, useState } from 'react'
import type { LogType } from '../model/types.ts'
import type { ChangeLog } from './changes/changes.ts'
import { paths } from '../model/paths.ts'

export type StorageLog = ChangeLog

/** The latest few logs of one storage (composite index storageId + timestamp desc). */
export function useStorageLogs(orgId: string | null, storageId: string | null, count = 5) {
  const [logs, setLogs] = useState<StorageLog[] | null>(null)
  useEffect(() => {
    if (!orgId || !storageId) return
    let cancelled = false
    let unsubscribe = () => {}
    ;(async () => {
      const [{ db }, { collection, limit, onSnapshot, orderBy, query, where }] = await Promise.all([
        import('../lib/firebase.ts'),
        import('firebase/firestore'),
      ])
      if (cancelled) return
      unsubscribe = onSnapshot(
        query(collection(db, paths.logs(orgId)), where('storageId', '==', storageId), orderBy('timestamp', 'desc'), limit(count)),
        (snap) =>
          setLogs(
            snap.docs.map((d): StorageLog => {
              const data = d.data()
              return {
                id: d.id,
                type: data.type as LogType,
                feedId: data.feedId as string,
                storageId: data.storageId as string,
                amount: data.amount as number,
                ...(typeof data.previousAmount === 'number' ? { previousAmount: data.previousAmount } : {}),
                ...(typeof data.batchId === 'string' ? { batchId: data.batchId } : {}),
                // Pending writes have no server timestamp yet.
                timestampMs: data.timestamp ? (data.timestamp as { toMillis(): number }).toMillis() : null,
              }
            }),
          ),
        (err) => console.warn('Storage logs listener failed', err.code),
      )
    })()
    return () => {
      cancelled = true
      unsubscribe()
      setLogs(null)
    }
  }, [orgId, storageId, count])
  return logs
}
