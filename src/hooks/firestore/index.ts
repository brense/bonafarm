import { query, where, orderBy, limit, collection, DocumentData, getFirestore, onSnapshot, Query, Timestamp, getDocs, deleteDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { BehaviorSubject } from 'rxjs'
import { useCollection, useQuery, useDoc as useDocHook } from 'firestore-react-hooks'
import { Log, MutationLog } from '../../types'

export { where, orderBy, limit, Timestamp } from 'firebase/firestore'

type DocumentDataWithID<T = DocumentData> = T & { id: string }

// TODO: refactor this...
const { VITE_FIREBASE_CONFIG = '{}' } = import.meta.env
const app = initializeApp(JSON.parse(VITE_FIREBASE_CONFIG))
const firestore = getFirestore(app)

const docPromises: Record<string, BehaviorSubject<any>> = {}

export function useSubscribeDoc<T = DocumentData>(path: string, options?: { parseTimestamp?: boolean }) {
  const [result, setResult] = useState<DocumentDataWithID<T> | null>(null)
  const { subscribe } = useDocHook<T>(path, { returnDocumentData: true })
  const { parseTimestamp } = options || {}
  useEffect(() => {
    if (!docPromises[path]) {
      docPromises[path] = new BehaviorSubject<DocumentDataWithID<T> | null>(null)
      subscribe(next => {
        const values = !parseTimestamp ? next : timestampValuesToDate<T>(next)
        next && docPromises[path].next(values)
      })
    }
    const subscriber = docPromises[path].subscribe(setResult)
    return () => subscriber.unsubscribe()
  }, [subscribe, path, parseTimestamp])
  return result
}

const collectionPromises: Record<string, BehaviorSubject<any[]>> = {}

export function useSubscribeCollection<T = DocumentData>(path: string, options?: { parseTimestamp?: boolean }) {
  const [result, setResult] = useState<DocumentDataWithID<T>[]>([])
  const { subscribe } = useCollection<T>(path, { returnDocumentData: true })
  const { parseTimestamp } = options || {}
  useEffect(() => {
    if (!collectionPromises[path]) {
      collectionPromises[path] = new BehaviorSubject<DocumentDataWithID<T>[]>([])
      subscribe(next => {
        const newDocs: DocumentDataWithID<T>[] = []
        next.forEach(doc => {
          const values = !parseTimestamp ? doc : timestampValuesToDate<T>(doc)
          newDocs.push(values as DocumentDataWithID<T>)
        })
        next && collectionPromises[path].next(newDocs)
      })
    }
    const subscriber = collectionPromises[path].subscribe(setResult)
    return () => subscriber.unsubscribe()
  }, [subscribe, path, parseTimestamp])
  return result
}

export function useSubscribeQuery<T = DocumentData>(q: Query<T>, options?: { parseTimestamp?: boolean }) {
  const [result, setResult] = useState<DocumentDataWithID<T>[]>([])
  const { subscribe } = useQuery<T>(q, { returnDocumentData: true })
  const { parseTimestamp } = options || {}
  useEffect(() => {
    const unsubscribe = subscribe(next => {
      const newDocs: DocumentDataWithID<T>[] = []
      next.forEach(doc => {
        const values = !parseTimestamp ? doc : timestampValuesToDate<T>(doc)
        newDocs.push(values as DocumentDataWithID<T>)
      })
      next && setResult(newDocs)
    })
    return () => unsubscribe()
  }, [subscribe, parseTimestamp])
  return result
}

export function dateToTimestamp(date: Date) {
  return Timestamp.fromDate(date)
}

export async function emptyCollection(path: string) {
  const collectionRef = collection(firestore, path)
  const snapshot = await getDocs(collectionRef)
  snapshot.forEach(doc => {
    deleteDoc(doc.ref)
  })
}

function timestampValuesToDate<T = DocumentData>(obj?: T) {
  Object.keys(obj || {}).forEach(k => {
    if (obj && obj[k as keyof typeof obj] instanceof Timestamp) {
      const timestamp = obj[k as keyof typeof obj] as Timestamp
      (obj as any)[k as keyof typeof obj] = timestamp.toDate()
    }
  })
  return obj as T
}



type FirestoreLog = {
  type: 'mutation' | 'emptied'
  timestamp: Timestamp
  storageId: string
  feedId?: string
  amount?: number
}



export function useLastEmptied(storageId: string) {
  const [lastEmptied, setLastEmptied] = useState<Date | null>(null)

  useEffect(() => {
    const q = query(collection(firestore, 'logs'), where('storageId', '==', storageId), where('type', '==', 'emptied'), orderBy('timestamp', 'desc'), limit(1))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const { timestamp } = doc.data() as FirestoreLog
        setLastEmptied(timestamp.toDate())
      })
    })
    return () => unsubscribe()
  }, [storageId])

  useEffect(() => {
    setLastEmptied(null)
  }, [])

  return lastEmptied
}

export function useLastEmptiedOrEmptying(storage: { id: string, status: 'emptying' }) {
  const [lastEmptied, setLastEmptied] = useState<Date | null>(null)

  useEffect(() => {
    const q = query(collection(firestore, 'logs'), where('storageId', '==', storage.id), where('type', '==', storage.status === 'emptying' ? 'emptying' : 'emptied'), orderBy('timestamp', 'desc'), limit(1))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const { timestamp } = doc.data() as FirestoreLog
        setLastEmptied(timestamp.toDate())
      })
    })
    return () => unsubscribe()
  }, [storage])

  useEffect(() => {
    setLastEmptied(null)
  }, [])

  return lastEmptied
}


export function useLatestMutations(storageId: string) {
  const [logs, setLogs] = useState<MutationLog[]>([])

  useEffect(() => {
    const q = query(collection(firestore, 'logs'), where('storageId', '==', storageId), where('type', '==', 'mutation'), orderBy('timestamp', 'desc'), limit(1))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs: MutationLog[] = []
      querySnapshot.forEach((doc) => {
        const { timestamp, ...data } = doc.data() as FirestoreLog
        logs.push({ ...data, id: doc.id, timestamp: timestamp.toDate() } as MutationLog)
      })
      setLogs(logs)
    })
    return () => unsubscribe()
  }, [storageId])

  useEffect(() => {
    setLogs([])
  }, [])

  return logs
}


export function useLogs({ key, value, limit: num = 100 }: { key: 'storageId' | 'feedId', value: string, limit?: number }) {
  const [logs, setLogs] = useState<Array<Log | MutationLog>>([])

  useEffect(() => {
    const q = query(collection(firestore, 'logs'), where(key, '==', value), orderBy('timestamp', 'desc'), limit(num))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs: Array<Log | MutationLog> = []
      querySnapshot.forEach((doc) => {
        const { timestamp, ...data } = doc.data() as FirestoreLog
        logs.push({ ...data, id: doc.id, timestamp: timestamp.toDate() } as Log)
      })
      setLogs(logs)
    })
    return () => unsubscribe()
  }, [key, value, num])

  useEffect(() => {
    setLogs([])
  }, [])

  return logs
}
