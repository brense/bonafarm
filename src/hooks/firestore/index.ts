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

export function useLogs({ key, value, limit: num = 2 }: { key: 'storageId' | 'feedId', value: string, limit?: number }) {
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
