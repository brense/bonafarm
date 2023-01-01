import { addDoc, collection, getFirestore, Timestamp } from 'firebase/firestore'

export type Log = {
  type: 'mutation' | 'emptied'
  timestamp: Date,
  storageId: string
}

export type MutationLog = Log & {
  feedId: string
  amount: number
}

const firestore = getFirestore()

export async function addLog(logItem: Omit<Log, 'timestamp'> | Omit<MutationLog, 'timestamp'>) {
  return await addDoc(collection(firestore, 'logs'), {
    timestamp: Timestamp.now(),
    ...logItem
  })
}

export function useLogs() {

}
