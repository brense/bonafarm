import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { getOrgId, rememberOrgId } from '../branding/useOrgId.ts'
import type { Member, MemberRole } from '../model/types.ts'
import { paths } from '../model/paths.ts'
import { OrgContext, type OrgContextValue, type OrgStatus } from './context.ts'

/**
 * Resolves which organisation the app shows and what the signed-in user may do
 * there. The id comes from `?org=` / localStorage; without one, the user's
 * memberships are looked up once after sign-in and the first is remembered.
 */
export default function OrgProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading } = useAuth()
  const [orgId, setOrgId] = useState<string | null>(getOrgId)
  const [discovery, setDiscovery] = useState<'idle' | 'none'>('idle')
  // Membership keyed by organisation and user, so a stale result is never shown for another pair.
  const [member, setMember] = useState<{ key: string; roles: MemberRole[]; status: OrgStatus } | null>(null)
  const uid = user?.uid ?? null
  const key = uid && orgId ? `${orgId}/${uid}` : null

  // Discover an organisation for users who arrive without one.
  useEffect(() => {
    if (!uid || orgId !== null) return
    let cancelled = false
    ;(async () => {
      try {
        const [{ db }, { collectionGroup, getDocs, query, where }] = await Promise.all([
          import('../lib/firebase.ts'),
          import('firebase/firestore'),
        ])
        const snap = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', uid)))
        if (cancelled) return
        const found = snap.docs[0]?.ref.parent.parent?.id ?? null
        if (found) {
          rememberOrgId(found)
          setOrgId(found)
        } else {
          setDiscovery('none')
        }
      } catch (err) {
        console.warn('Could not look up organisations', err)
        if (!cancelled) setDiscovery('none')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, orgId])

  // Follow the member document for the current organisation.
  useEffect(() => {
    if (!uid || orgId === null) return
    const pair = `${orgId}/${uid}`
    let unsubscribe = () => {}
    let cancelled = false
    ;(async () => {
      const [{ db }, { doc, onSnapshot }] = await Promise.all([import('../lib/firebase.ts'), import('firebase/firestore')])
      if (cancelled) return
      unsubscribe = onSnapshot(
        doc(db, paths.member(orgId, uid)),
        (snap) => {
          const data = snap.data() as Member | undefined
          if (data && Array.isArray(data.roles) && data.roles.length > 0) {
            setMember({ key: pair, roles: data.roles, status: 'ready' })
          } else {
            setMember({ key: pair, roles: [], status: 'denied' })
          }
        },
        (err) => {
          // A missing membership surfaces as permission-denied, not as an empty document.
          console.warn('No access to organisation', orgId, err.code)
          setMember({ key: pair, roles: [], status: 'denied' })
        },
      )
    })()
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [uid, orgId])

  const value = useMemo<OrgContextValue>(() => {
    if (authLoading || !uid) return { orgId, roles: [], status: 'loading' }
    if (orgId === null) return { orgId, roles: [], status: discovery === 'none' ? 'none' : 'loading' }
    if (member && member.key === key) return { orgId, roles: member.roles, status: member.status }
    return { orgId, roles: [], status: 'loading' }
  }, [orgId, authLoading, uid, discovery, member, key])
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}
