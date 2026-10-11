import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Branding } from '../model/types.ts'
import { paths } from '../model/paths.ts'
import { BrandingContext } from './context.ts'
import { resolveBranding } from './defaults.ts'
import { manifestUrl } from './manifest.ts'
import { useOrgId } from './useOrgId.ts'

interface Props extends PropsWithChildren {
  /** Overrides the organisation id from the URL / localStorage. Pass null for "no organisation". */
  orgId?: string | null
  /** When given, branding is not fetched. Used by tests and for the no-organisation case. */
  initial?: Partial<Branding>
}

function setHead(selector: string, tag: string, attrs: Record<string, string>, attr: string, value: string) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

export default function BrandingProvider({ children, orgId: orgIdProp, initial }: Props) {
  const urlOrgId = useOrgId()
  const orgId = orgIdProp === undefined ? urlOrgId : orgIdProp
  const [fetched, setFetched] = useState<Partial<Branding> | null>(null)
  const [done, setDone] = useState(false)
  const shouldFetch = orgId !== null && initial === undefined

  useEffect(() => {
    if (!shouldFetch) return
    let cancelled = false
    ;(async () => {
      try {
        // Both the SDK and the app's Firebase init stay out of the initial bundle.
        const [{ db }, { doc, getDoc }] = await Promise.all([import('../lib/firebase.ts'), import('firebase/firestore')])
        const snap = await getDoc(doc(db, paths.branding(orgId)))
        if (!cancelled && snap.exists()) setFetched(snap.data() as Partial<Branding>)
      } catch (err) {
        console.warn('Could not load branding, using defaults', err)
      } finally {
        if (!cancelled) setDone(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [shouldFetch, orgId])

  const branding = useMemo(() => resolveBranding(initial ?? fetched), [initial, fetched])

  useEffect(() => {
    document.title = branding.appName
    setHead('meta[name="theme-color"]', 'meta', { name: 'theme-color' }, 'content', branding.themeColor)
    setHead('link[rel="manifest"]', 'link', { rel: 'manifest' }, 'href', manifestUrl(orgId))
  }, [branding, orgId])

  const value = useMemo(
    () => ({ orgId, branding, loading: shouldFetch && !done }),
    [orgId, branding, shouldFetch, done],
  )
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}
