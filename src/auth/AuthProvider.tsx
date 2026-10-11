import type { User } from 'firebase/auth'
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { AuthContext } from './context.ts'

/** Tracks the Firebase auth session. Firebase is loaded lazily to keep it out of the first paint. */
export default function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe = () => {}
    let cancelled = false
    ;(async () => {
      const [{ auth }, { onAuthStateChanged }] = await Promise.all([import('../lib/firebase.ts'), import('firebase/auth')])
      if (cancelled) return
      unsubscribe = onAuthStateChanged(auth, (next) => {
        setUser(next)
        setLoading(false)
      })
    })()
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signOut: async () => {
        const [{ auth }, { signOut }] = await Promise.all([import('../lib/firebase.ts'), import('firebase/auth')])
        await signOut(auth)
      },
    }),
    [user, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
