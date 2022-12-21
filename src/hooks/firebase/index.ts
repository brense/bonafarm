
import { initializeApp } from 'firebase/app'
import { getDatabase, onValue, ref } from 'firebase/database'
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
