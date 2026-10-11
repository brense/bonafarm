import type { PropsWithChildren } from 'react'
import { useOrg } from '../org/useOrg.ts'
import BrandingProvider from './BrandingProvider.tsx'

/** Branding follows the organisation the OrgProvider resolved, also one found after sign-in. */
export default function OrgBranding({ children }: PropsWithChildren) {
  const { orgId } = useOrg()
  return <BrandingProvider orgId={orgId}>{children}</BrandingProvider>
}
