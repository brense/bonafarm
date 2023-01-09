import { addDoc, collection, CollectionReference, DocumentData, getFirestore, limit, onSnapshot, orderBy, Query, query, QueryDocumentSnapshot, Timestamp, where } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Subject } from 'rxjs'

type CollectionParams = { getCollection: () => CollectionReference<DocumentData> }
type CollectionQueryParams = { name: string, getQuery: () => Query<DocumentData> }
type UseCollectionParams = CollectionParams | CollectionQueryParams

function isQueryParams(params: UseCollectionParams): params is CollectionQueryParams {
  return Object.hasOwn(params, 'name')
}

const subjects: Record<string, Subject<QueryDocumentSnapshot<DocumentData>[]>> = {}

function getSubject(name: string, q: Query<DocumentData>) {
  if (!subjects[name]) {
    const subject = new Subject<QueryDocumentSnapshot<DocumentData>[]>()
    onSnapshot(q, (querySnapshot) => {
      const docs: QueryDocumentSnapshot<DocumentData>[] = []
      querySnapshot.forEach((doc) => {
        docs.push(doc)
      })
      subject.next(docs)
    })
    subjects[name] = subject
  }
  return subjects[name]
}

export function useCollection(params: UseCollectionParams) {
  const { query: q, name } = isQueryParams(params) ? { name: params.name, query: params.getQuery() } : { name: params.getCollection().path, query: query(params.getCollection()) }
  const [docs, setDocs] = useState<QueryDocumentSnapshot<DocumentData>[]>([])
  useEffect(() => {
    const subscriber = getSubject(name, q).subscribe(docs => setDocs(docs))
    return () => subscriber.unsubscribe()
  }, [name, q])
  return docs
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

const firestore = getFirestore()
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
