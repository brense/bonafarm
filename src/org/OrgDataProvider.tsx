import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Feed, Item, Storage, StorageType } from '../model/types.ts'
import { paths } from '../model/paths.ts'
import { EMPTY_ORG_DATA, OrgDataContext, type DocMap, type OrgDataValue } from './dataContext.ts'
import { useOrg } from './useOrg.ts'

type Collections = Pick<OrgDataValue, 'feeds' | 'storages' | 'storageTypes' | 'items'>
const NAMES = ['feeds', 'storages', 'storageTypes', 'items'] as const

/**
 * Live copies of the small catalogue collections every page needs: feeds,
 * storages, storage types and current stock. Four listeners, about 80
 * documents on first load, only changes afterwards. Mount only once the
 * membership is known, so nothing is read before access is confirmed.
 */
export default function OrgDataProvider({ children }: PropsWithChildren) {
  const { orgId } = useOrg()
  const [data, setData] = useState<Collections>(() => ({ ...EMPTY_ORG_DATA }))
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    const unsubscribes: Array<() => void> = []
    ;(async () => {
      const [{ db }, { collection, onSnapshot }] = await Promise.all([import('../lib/firebase.ts'), import('firebase/firestore')])
      if (cancelled) return
      const collectionPaths: Record<(typeof NAMES)[number], string> = {
        feeds: paths.feeds(orgId),
        storages: paths.storages(orgId),
        storageTypes: paths.storageTypes(orgId),
        items: paths.items(orgId),
      }
      for (const name of NAMES) {
        unsubscribes.push(
          onSnapshot(
            collection(db, collectionPaths[name]),
            (snap) => {
              const map = new Map<string, unknown>()
              for (const d of snap.docs) map.set(d.id, d.data())
              setData((prev) => ({ ...prev, [name]: map as DocMap<Feed & Storage & StorageType & Item> }))
              setLoaded((prev) => (prev.has(name) ? prev : new Set(prev).add(name)))
            },
            (err) => {
              console.warn('Listener failed', name, err.code)
              setError(err.code)
            },
          ),
        )
      }
    })()
    return () => {
      cancelled = true
      unsubscribes.forEach((u) => u())
    }
  }, [orgId])

  const value = useMemo<OrgDataValue>(
    () => ({ ...data, loading: loaded.size < NAMES.length, error }),
    [data, loaded, error],
  )
  return <OrgDataContext.Provider value={value}>{children}</OrgDataContext.Provider>
}
