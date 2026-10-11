import type { User } from 'firebase/auth'
import { createContext } from 'react'

export interface AuthContextValue {
  user: User | null
  /** True until Firebase has restored (or ruled out) a persisted session. */
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
})
