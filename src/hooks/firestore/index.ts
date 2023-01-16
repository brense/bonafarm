import { query, where, orderBy, limit, addDoc, doc, collection, CollectionReference, DocumentData, getFirestore, onSnapshot, Query, Timestamp, getDoc, DocumentReference, getDocs, setDoc, deleteDoc, SetOptions, getCountFromServer, QuerySnapshot, DocumentSnapshot, QueryConstraint, Unsubscribe } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { initializeApp } from 'firebase/app'

export { where, orderBy, limit } from 'firebase/firestore'

type DocumentDataWithID<T = DocumentData> = T & { id: string }

// TODO: refactor this...
const { VITE_FIREBASE_CONFIG = '{}' } = import.meta.env
const app = initializeApp(JSON.parse(VITE_FIREBASE_CONFIG))
const firestore = getFirestore(app)

const refs: Record<string, DocumentReference<DocumentData> | CollectionReference<DocumentData>> = {}

type GenericDocReturnType<T = DocumentData> = {
  get: (path: string) => Promise<DocumentDataWithID<T> | undefined>
  getSnapshot: (path: string) => Promise<DocumentSnapshot<T>>
  set: (path: string, data: T, options?: SetOptions) => Promise<void>
  delete: (path: string) => Promise<void>
  subscribe: (path: string, next: (doc: DocumentDataWithID<T> | null) => void) => Unsubscribe
  subscribeSnapshot: (path: string, next: (snapshot: DocumentSnapshot<T>) => void) => Unsubscribe
}

type DocReturnType<T = DocumentData> = {
  get: () => Promise<DocumentDataWithID<T> | undefined>
  getSnapshot: () => Promise<DocumentSnapshot<T>>
  set: (data: T, options?: SetOptions) => Promise<void>
  delete: () => Promise<void>
  subscribe: (next: (doc: DocumentDataWithID<T> | null) => void) => Unsubscribe
  subscribeSnapshot: (next: (snapshot: DocumentSnapshot<T>) => void) => Unsubscribe
}

type GenericDocParameters = Parameters<(options?: { parseTimestamp?: boolean }) => void>
type DocParameters = Parameters<(path: string, options?: { parseTimestamp?: boolean }) => void>

function isDocParameters(params: DocParameters | GenericDocParameters): params is DocParameters {
  return typeof params[0] === 'string'
}

type SubscribeDocParameters<T = DocumentData> = Parameters<(next: (snapshot: DocumentSnapshot<T>) => void) => void>
type GenericSubscribeDocParameters<T = DocumentData> = Parameters<(path:string, next: (snapshot: DocumentSnapshot<T>) => void) => void>

function isSubscribeDocParamters<T = DocumentData>(params: SubscribeDocParameters<T> | GenericSubscribeDocParameters<T>):params is SubscribeDocParameters<T> {
  return typeof params[0] === 'string'
}

export function useDoc<T = DocumentData>(options?: { parseTimestamp?: boolean }): GenericDocReturnType<T>
export function useDoc<T = DocumentData>(path: string, options?: { parseTimestamp?: boolean }): DocReturnType<T>
export function useDoc<T = DocumentData>(...params: GenericDocParameters | DocParameters): GenericDocReturnType<T> | DocReturnType<T> {
  const [path, options] = isDocParameters(params) ? params : [undefined, ...params]
  const { parseTimestamp = false } = options || {}

  const docRef = useMemo(() => {
    if (path && !refs[path]) {
      refs[path] = doc(firestore, path)
    }
    return path ? refs[path] as DocumentReference<T> : undefined
  }, [path])

  const getSnapshot = useCallback(async (path?:string) => {
    return await getDoc(docRef ? docRef : doc(firestore, path || '') as DocumentReference<T>)
  }, [docRef])

  const get = useCallback(async () => {
    const snapshot = await getSnapshot()
    const values = !parseTimestamp ? snapshot.data() : timestampValuesToDate<T>(snapshot.data())
    return { ...values, id: snapshot.id } as DocumentDataWithID<T> | undefined
  }, [getSnapshot, parseTimestamp])

  const subscribeSnapshot = useCallback((...params: SubscribeDocParameters<T> | GenericSubscribeDocParameters<T>) => {
    const [path, next] = !isSubscribeDocParamters<T>(params) ? params : [undefined, ...params]
    return onSnapshot(docRef ? docRef : doc(firestore, path || '') as DocumentReference<T>, next)
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

export function useQuery<T = DocumentData>(q: Query<T>, options?: { parseTimestamp?: boolean }) {
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

export function useSubscribeDoc<T = DocumentData>(path: string, options?: { parseTimestamp?: boolean }) {
  const [result, setResult] = useState<DocumentDataWithID<T> | null>(null)
  const { subscribe } = useDoc<T>(path, options)
  useEffect(() => {
    const unsubscribe = subscribe(setResult)
    return () => unsubscribe()
  }, [subscribe])
  return result
}

export function useSubscribeCollection<T = DocumentData>(path: string, options?: { parseTimestamp?: boolean }) {
  const [result, setResult] = useState<DocumentDataWithID<T>[]>([])
  const { subscribe } = useCollection<T>(path, options)
  useEffect(() => {
    const unsubscribe = subscribe(setResult)
    return () => unsubscribe()
  }, [subscribe])
  return result
}

export function useSubscribeQuery<T = DocumentData>(q: Query<T>, options?: { parseTimestamp?: boolean }) {
  const [result, setResult] = useState<DocumentDataWithID<T>[]>([])
  const { subscribe } = useQuery<T>(q, options)
  useEffect(() => {
    const unsubscribe = subscribe(setResult)
    return () => unsubscribe()
  }, [subscribe])
  return result
}

export function dateToTimestamp(date: Date) {
  return Timestamp.fromDate(date)
}

export function makeQuery<T = DocumentData>(path: string, ...constraints: QueryConstraint[]): Query<T> {
  return query(collection(firestore, path) as CollectionReference<T>, ...constraints)
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










export type Log = {
  id: string
  type: 'mutation' | 'emptied'
  timestamp: Date,
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
    //timestamp: Timestamp.now(),
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
        //logs.push({ ...data, id: doc.id, date: timestamp.toDate() } as MutationLog)
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
        //logs.push({ ...data, id: doc.id, date: timestamp.toDate() } as Log)
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
