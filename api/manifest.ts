/**
 * Dynamic web app manifest per organisation: GET /api/manifest?org=<orgId>
 *
 * Reads organisations/{orgId}/branding/public over the Firestore REST API.
 * That document is world-readable by the security rules, so no credentials
 * are involved here. Responses are cached on the Vercel edge for an hour so
 * the Firestore read count stays negligible.
 */
import { buildManifest, ORG_ID_PATTERN } from '../src/branding/manifest.ts'
import type { Branding } from '../src/model/types.ts'

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? 'bonafarm-next'
const CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'

export async function GET(request: Request): Promise<Response> {
  const org = new URL(request.url).searchParams.get('org')
  const orgId = org && ORG_ID_PATTERN.test(org) ? org : null
  const branding = orgId ? await fetchBranding(orgId) : null
  return Response.json(buildManifest(branding, orgId), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': CACHE,
    },
  })
}

type FirestoreValue = { stringValue?: string }
type FirestoreDoc = { fields?: Record<string, FirestoreValue> }

async function fetchBranding(orgId: string): Promise<Partial<Branding> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/organisations/${orgId}/branding/public`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const doc = (await res.json()) as FirestoreDoc
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(doc.fields ?? {})) {
      if (typeof value.stringValue === 'string') out[key] = value.stringValue
    }
    return out as Partial<Branding>
  } catch (err) {
    console.warn('[manifest] branding fetch failed', err)
    return null
  }
}
