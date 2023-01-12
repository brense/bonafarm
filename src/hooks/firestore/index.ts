import { addDoc, doc, collection, CollectionReference, DocumentData, getFirestore, limit, onSnapshot, orderBy, Query, query, Timestamp, where, getDoc, DocumentReference, getDocs, setDoc, deleteDoc, SetOptions, getCountFromServer, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useEffect, useState, useMemo, useCallback } from 'react'

type DocumentDataWithID<T = DocumentData> = T & { id: string }

const firestore = getFirestore()
const refs: Record<string, DocumentReference<DocumentData> | CollectionReference<DocumentData>> = {}

export function useDoc<T = DocumentData>(path: string, options?: { parseTimestamp?: boolean }) {
  const { parseTimestamp = false } = options || {}
  const docRef = useMemo(() => {
    if (!refs[path]) {
      refs[path] = doc(firestore, path)
    }
    return refs[path] as DocumentReference<T>
  }, [path])

  const getSnapshot = useCallback(async () => {
    return await getDoc(docRef)
  }, [docRef])

  const get = useCallback(async () => {
    const snapshot = await getSnapshot()
    const values = !parseTimestamp ? snapshot.data() : timestampValuesToDate<T>(snapshot.data())
    return { ...values, id: snapshot.id } as DocumentDataWithID<T> | undefined
  }, [getSnapshot, parseTimestamp])

  const subscribeSnapshot = useCallback((next: (snapshot: DocumentSnapshot<T>) => void) => {
    return onSnapshot(docRef, next)
  }, [docRef])

  const subscribe = useCallback((next: (doc: DocumentDataWithID<T> | null) => void) => {
    return subscribeSnapshot(snapshot => {
      const values = !parseTimestamp ? snapshot.data() : timestampValuesToDate<T>(snapshot.data())
      next({ ...values, id: snapshot.id } as DocumentDataWithID<T>)
    })
  }, [subscribeSnapshot, parseTimestamp])

  const set = useCallback(async (data: T, options?: SetOptions) => {
    return options ? await setDoc<T>(docRef, data, options) : await setDoc<T>(docRef, data)
  }, [docRef])

  const deleteFunc = useCallback(async () => {
    return await deleteDoc(docRef)
  }, [docRef])

  return {
    get,
    getSnapshot,
    set,
    delete: deleteFunc,
    subscribe,
    subscribeSnapshot
  }
}

export function useCollection<T = DocumentData>(path: string, options?: { parseTimestamp?: boolean }) {
  const { parseTimestamp = false } = options || {}
  const collectionRef = useMemo(() => {
    if (!refs[path]) {
      refs[path] = collection(firestore, path)
    }
    return refs[path] as CollectionReference<T>
  }, [path])

  const getSnapshot = useCallback(async () => {
    return await getDocs(collectionRef)
  }, [collectionRef])

  const get = useCallback(async () => {
    const snapshot = await getSnapshot()
    const docs: Array<DocumentDataWithID<T>> = []
    snapshot.forEach(doc => {
      const values = !parseTimestamp ? doc.data() : timestampValuesToDate<T>(doc.data())
      docs.push({ ...values, id: doc.id })
    })
    return docs
  }, [getSnapshot, parseTimestamp])

  const countSnapshot = useCallback(async () => {
    return await getCountFromServer(collectionRef)
  }, [collectionRef])

  const count = useCallback(async () => {
    const snapshot = await countSnapshot()
    return snapshot.data().count
  }, [countSnapshot])

  const subscribeSnapshot = useCallback((next: (snapshot: QuerySnapshot<T>) => void) => {
    return onSnapshot(collectionRef, next)
  }, [collectionRef])

  const subscribe = useCallback((next: (docs: DocumentDataWithID<T>[]) => void) => {
    return subscribeSnapshot(snapshot => {
      const docs: DocumentDataWithID<T>[] = []
      snapshot.forEach((doc) => {
        const values = !parseTimestamp ? doc.data() : timestampValuesToDate<T>(doc.data())
        docs.push({ ...values, id: doc.id })
      })
      next(docs)
    })
  }, [subscribeSnapshot, parseTimestamp])

  const add = useCallback(async (data: T) => {
    return await addDoc<T>(collectionRef, data)
  }, [collectionRef])

  return {
    get,
    getSnapshot,
    count,
    countSnapshot,
    add,
    subscribe,
    subscribeSnapshot
  }
}

export function useQuery<T = DocumentData>(name: string, q: Query<T>, options?: { parseTimestamp?: boolean }) {
  const { parseTimestamp = false } = options || {}
  const getSnapshot = useCallback(async () => {
    return await getDocs(q)
  }, [q])

  const get = useCallback(async () => {
    const snapshot = await getSnapshot()
    const docs: Array<DocumentDataWithID<T>> = []
    snapshot.forEach(doc => {
      const values = !parseTimestamp ? doc.data() : timestampValuesToDate<T>(doc.data())
      docs.push({ ...values, id: doc.id })
    })
    return docs
  }, [getSnapshot, parseTimestamp])

  const countSnapshot = useCallback(async () => {
    return await getCountFromServer(q)
  }, [q])

  const count = useCallback(async () => {
    const snapshot = await countSnapshot()
    return snapshot.data().count
  }, [countSnapshot])

  const subscribeSnapshot = useCallback((next: (snapshot: QuerySnapshot<T>) => void) => {
    return onSnapshot(q, next)
  }, [q])

  const subscribe = useCallback((next: (docs: DocumentDataWithID<T>[]) => void) => {
    return subscribeSnapshot(snapshot => {
      const docs: DocumentDataWithID<T>[] = []
      snapshot.forEach((doc) => {
        const values = !parseTimestamp ? doc.data() : timestampValuesToDate<T>(doc.data())
        docs.push({ ...values, id: doc.id })
      })
      next(docs)
    })
  }, [subscribeSnapshot, parseTimestamp])

  return {
    get,
    getSnapshot,
    count,
    countSnapshot,
    subscribe,
    subscribeSnapshot
  }
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










export type Log = {
  id: string
  type: 'mutation' | 'emptied'
  date: Date,
  storageId: string
}

export type MutationLog = Log & {
  feedId: string
  amount: number
}

export function isMutationLog(logItem: Log | MutationLog): logItem is MutationLog {
  return logItem.type === 'mutation'
}

type FirestoreLog = {
  type: 'mutation' | 'emptied'
  timestamp: Timestamp
  storageId: string
  feedId?: string
  amount?: number
}

const auth = getAuth()

export async function addLog(logItem: Omit<Log, 'date' | 'id'> | Omit<MutationLog, 'date' | 'id'>) {
  return await addDoc(collection(firestore, 'logs'), {
    timestamp: Timestamp.now(),
    uid: auth.currentUser?.uid,
    ...logItem
  })
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


export function useLatestMutations(storageId: string) {
  const [logs, setLogs] = useState<MutationLog[]>([])

  useEffect(() => {
    const q = query(collection(firestore, 'logs'), where('storageId', '==', storageId), where('type', '==', 'mutation'), orderBy('timestamp', 'desc'), limit(1))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs: MutationLog[] = []
      querySnapshot.forEach((doc) => {
        const { timestamp, ...data } = doc.data() as FirestoreLog
        logs.push({ ...data, id: doc.id, date: timestamp.toDate() } as MutationLog)
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
        logs.push({ ...data, id: doc.id, date: timestamp.toDate() } as Log)
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
