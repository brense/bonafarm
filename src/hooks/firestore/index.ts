import { addDoc, doc, collection, CollectionReference, DocumentData, getFirestore, limit, onSnapshot, orderBy, Query, query, Timestamp, where, getDoc, DocumentReference, getDocs, setDoc, deleteDoc, SetOptions, getCountFromServer } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { BehaviorSubject } from 'rxjs'

type DocumentDataWithID<T = DocumentData> = T & { id: string }

const firestore = getFirestore()
const subjects: Record<string, BehaviorSubject<DocumentDataWithID[]> | BehaviorSubject<DocumentDataWithID | null>> = {}
const refs: Record<string, DocumentReference<DocumentData> | CollectionReference<DocumentData>> = {}

export function useDoc<T = DocumentData>(path: string) {
  const docRef = useMemo(() => {
    if (!refs[path]) {
      refs[path] = doc(firestore, path)
    }
    return refs[path] as DocumentReference<T>
  }, [path])

  const get = useCallback(async () => {
    const document = await getDoc(docRef)
    return { ...document.data(), id: document.id } as DocumentDataWithID<T>
  }, [docRef])

  const subscribe = useCallback((next: (doc: DocumentDataWithID<T> | null) => void) => {
    return (getSubject<T>(path, docRef)).subscribe(next)
  }, [docRef, path])

  const set = useCallback(async (data: T, options?: SetOptions) => {
    return options ? await setDoc<T>(docRef, data, options) : await setDoc<T>(docRef, data)
  }, [docRef])

  const deleteFunc = useCallback(async () => {
    return await deleteDoc(docRef)
  }, [docRef])

  return {
    get,
    set,
    delete: deleteFunc,
    subscribe
  }
}

export function useCollection<T = DocumentData>(path: string) {
  const collectionRef = useMemo(() => {
    if (!refs[path]) {
      refs[path] = collection(firestore, path)
    }
    return refs[path] as CollectionReference<T>
  }, [path])

  const get = useCallback(async () => {
    const snapshot = await getDocs(collectionRef)
    const docs: Array<DocumentDataWithID<T>> = []
    snapshot.forEach(doc => docs.push({ ...doc.data(), id: doc.id }))
    return docs
  }, [collectionRef])

  const count = useCallback(async () => {
    const snapshot = await getCountFromServer(collectionRef)
    return snapshot.data().count
  }, [collectionRef])

  const subscribe = useCallback((next: (docs: Array<DocumentDataWithID<T>>) => void) => {
    return getSubject<T>(path, collectionRef).subscribe(next)
  }, [collectionRef, path])

  const add = useCallback(async (data: T) => {
    return await addDoc(collectionRef, data)
  }, [collectionRef])

  return {
    get,
    count,
    add,
    subscribe
  }
}

export function useQuery<T = DocumentData>(name: string, q: Query<T>) {
  const get = useCallback(async () => {
    return await getDocs(q)
  }, [q])

  const count = useCallback(async () => {
    const snapshot = await getCountFromServer(q)
    return snapshot.data().count
  }, [q])

  const subscribe = useCallback((next: (docs: Array<DocumentDataWithID<T>>) => void) => {
    return (getSubject<T>(name, q)).subscribe(next)
  }, [q, name])

  return {
    get,
    count,
    subscribe
  }
}

function getSubject<T = DocumentData>(key: string, q: Query<T> | DocumentReference<T> | CollectionReference<T>) {
  if (!subjects[key]) {
    const subject = isNotDocumentRef(q) ? createQuerySnapshot(q as Query<DocumentData>) : createDocumentSnapshot(q as DocumentReference<DocumentData>)
    subjects[key] = subject
  }
  return subjects[key] as BehaviorSubject<any> // TODO: problem matching type from union
}

function isNotDocumentRef(q: Query<unknown> | DocumentReference<unknown>): q is Query<unknown> {
  return !Object.hasOwn(q, 'id')
}

function createQuerySnapshot(q: Query<DocumentData>) {
  const subject = new BehaviorSubject<Array<DocumentData & { id: string }>>([])
  onSnapshot(q, (querySnapshot) => {
    const docs: Array<DocumentData & { id: string }> = []
    querySnapshot.forEach((doc) => {
      docs.push({ ...doc.data(), id: doc.id })
    })
    subject.next(docs)
  })
  return subject
}

function createDocumentSnapshot(docRef: DocumentReference<DocumentData>) {
  const subject = new BehaviorSubject<DocumentDataWithID | null>(null)
  onSnapshot(docRef, (documentSnapshot) => {
    subject.next({ ...documentSnapshot.data(), id: documentSnapshot.id })
  })
  return subject
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
