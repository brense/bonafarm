import { useContext } from 'react'
import { BrandingContext } from './context.ts'

export function useBranding() {
  return useContext(BrandingContext)
}
