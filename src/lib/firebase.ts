import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const env = import.meta.env

export const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(firebaseApp)

/**
 * Stock is read and written in sheds with poor signal, so the local cache is
 * persisted (IndexedDB) and shared between tabs. Listeners then serve from
 * cache first and only changed documents are billed.
 */
export const db = initializeFirestore(firebaseApp, {
  localCache:
    typeof indexedDB === 'undefined'
      ? memoryLocalCache()
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export const storage = getStorage(firebaseApp)

/**
 * In development the app talks to the local emulators by default so that
 * day-to-day work never counts against the project's no-cost quota.
 * Set VITE_USE_EMULATORS=false in .env.local to hit the real project.
 */
export const usingEmulators = env.DEV && env.VITE_USE_EMULATORS !== 'false'

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
