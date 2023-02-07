import { deleteDoc, doc, DocumentData, DocumentReference, DocumentSnapshot, getDoc, getFirestore, onSnapshot, QueryDocumentSnapshot, QuerySnapshot, setDoc, SetOptions, Unsubscribe } from 'firebase/firestore'
import { useCallback, useMemo, useEffect, useState } from 'react'

function useFirestore() {
  return useMemo(() => getFirestore(), [])
}

type UseDocParamsFromPath<T = DocumentData> = {
  getDoc: () => Promise<DocumentSnapshot<T>>
  setDoc: (data: T, options?: SetOptions) => Promise<void>
  deleteDoc: () => Promise<void>
  subscribe: (next: (snapshot: DocumentSnapshot<T>) => void) => Unsubscribe
}

type UseDocParams<T = DocumentData> = {
  getDoc: (path: string) => Promise<DocumentSnapshot<T>>
  setDoc: (path: string, data: T, options?: SetOptions) => Promise<void>
  deleteDoc: (path: string) => Promise<void>
  subscribe: (path: string, next: (snapshot: DocumentSnapshot<T>) => void) => Unsubscribe
}

function useDoc<T = DocumentData>(): UseDocParams<T>
function useDoc<T = DocumentData>(path: string): UseDocParamsFromPath<T>
function useDoc<T = DocumentData>(path?: string) {
  const firestore = useFirestore()

  const getDocumentReference = useCallback((path: string) => {
    return doc(firestore, path) as DocumentReference<T>
  }, [firestore])

  const getFunc = useCallback(async (path: string) => {
    return await getDoc<T>(getDocumentReference(path))
  }, [getDocumentReference])

  const getFromPath = useCallback(() => getFunc(path!), [path, getFunc])

  const setFunc = useCallback(async (path: string, data: T, options?: SetOptions) => {
    return options ? await setDoc<T>(getDocumentReference(path), data, options) : await setDoc<T>(getDocumentReference(path), data)
  }, [getDocumentReference])

  const setFromPath = useCallback((data: T, options?: SetOptions) => setFunc(path!, data, options), [path, setFunc])

  const deleteFunc = useCallback(async (path: string) => {
    return await deleteDoc(getDocumentReference(path))
  }, [getDocumentReference])

  const deleteFromPath = useCallback(() => deleteFunc(path!), [path, deleteFunc])

  const subscribeFunc = useCallback((path: string, next: (snapshot: DocumentSnapshot<T>) => void) => {
    return onSnapshot(getDocumentReference(path), next)
  }, [getDocumentReference])

  const subscribeFromPath = useCallback((next: (snapshot: DocumentSnapshot<T>) => void) => subscribeFunc(path!, next), [path, subscribeFunc])

  return {
    getDoc: !path ? getFunc : getFromPath,
    setDoc: !path ? setFunc : setFromPath,
    deleteDoc: !path ? deleteFunc : deleteFromPath,
    subscribe: !path ? subscribeFunc : subscribeFromPath
  }
}

export default useDoc

export function useSubscribeDocument<T = DocumentData>(path: string) {
  const { subscribe } = useDoc<T>(path)
  const [doc, setDoc] = useState<DocumentSnapshot<T> | null>(null)
  useEffect(() => {
    const unsubscribe = subscribe(setDoc)
    return () => unsubscribe()
  }, [subscribe])
  return doc
}

export function useQuerySnapshot<T = DocumentData, K = unknown>(snapshot: QuerySnapshot<T>, options?: { parseTimestamp?: boolean, transform?: (doc: QueryDocumentSnapshot<T>) => K }) {
  const { transform, parseTimestamp = false } = options || {}
  const transformed = useMemo(() => {
    const docs: Array<(T & { id: string }) | K> = []
    snapshot.forEach(doc => {
      // TODO: parse timestamp...
      docs.push(transform ? transform(doc) : { id: doc.id, ...doc.data() as T })
    })
    return docs
  }, [snapshot, transform])
  return transformed
}
