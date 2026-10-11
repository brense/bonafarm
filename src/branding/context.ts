import { createContext } from 'react'
import type { Branding } from '../model/types.ts'
import { DEFAULT_BRANDING } from './defaults.ts'

export interface BrandingContextValue {
  orgId: string | null
  branding: Required<Branding>
  loading: boolean
}

export const BrandingContext = createContext<BrandingContextValue>({
  orgId: null,
  branding: DEFAULT_BRANDING,
  loading: false,
})
