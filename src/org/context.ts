import { createContext } from 'react'
import type { MemberRole } from '../model/types.ts'

export type OrgStatus =
  /** Not signed in, or still resolving the organisation and membership. */
  | 'loading'
  /** Signed in but no organisation is known for this user. */
  | 'none'
  /** An organisation is selected but the user is not a member of it. */
  | 'denied'
  /** Membership loaded; roles are valid. */
  | 'ready'

export interface OrgContextValue {
  /** Known before sign-in when it comes from the URL or localStorage, so branding can load early. */
  orgId: string | null
  roles: MemberRole[]
  status: OrgStatus
}

export const OrgContext = createContext<OrgContextValue>({ orgId: null, roles: [], status: 'loading' })
