import { addDoc, collection, getFirestore, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'

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

export async function addLog(logItem: Omit<Log, 'date' | 'id'> | Omit<MutationLog, 'date' | 'id'>) {
  return await addDoc(collection(firestore, 'logs'), {
    timestamp: Timestamp.now(),
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
