
import { initializeApp } from 'firebase/app'
import { getDatabase, onValue, ref, remove, set, update } from 'firebase/database'
import { useEffect, useState } from 'react'

const { VITE_FIREBASE_CONFIG = '{}' } = import.meta.env
initializeApp(JSON.parse(VITE_FIREBASE_CONFIG))

const db = getDatabase()

/**
 * Storage
 */
const storageRef = ref(db, 'storage/')

export type Storage = {
  id: string
  name: string
  color?: string
  canEmpty: boolean
  items?: Record<string, { amount: number }>
}

export function setStorage(storageId: string, storage: Omit<Storage, 'id'>) {
  return set(ref(db, 'storage/' + storageId), storage)
}

export function updateStorage(storageId: string, changes: Partial<Storage>) {
  return update(ref(db, 'storage/' + storageId), changes)
}

export function removeStorage(storageId: string) {
  return remove(ref(db, 'storage/' + storageId))
}

export function useStorages() {
  const [storages, setStorages] = useState<Storage[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const unsubscribe = onValue(storageRef, (snapshot) => {
      const data = snapshot.val()
      setStorages(Object.keys(data).map((id) => ({ ...data[id], id })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])
  return { data: storages, loading }
}

/**
 * Feed
 */
const feedRef = ref(db, 'feed/')

export type Feed = {
  id: string
  name: string
  linkedStorageId?: string
}

export function setFeed(feedId: string, feed: Omit<Feed, 'id'>) {
  return set(ref(db, 'feed/' + feedId), feed)
}

export function updateFeed(feedId: string, changes: Partial<Feed>) {
  return update(ref(db, 'feed/' + feedId), changes)
}

export function removeFeed(feedId: string) {
  return remove(ref(db, 'feed/' + feedId))
}

export function useFeed() {
  const [feed, setFeed] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const unsubscribe = onValue(feedRef, (snapshot) => {
      const data = snapshot.val()
      setFeed(Object.keys(data).map((id) => ({ ...data[id], id })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])
  return { data: feed, loading }
}
