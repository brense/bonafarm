/**
 * Dynamic web app manifest per organisation: GET /api/manifest?org=<orgId>
 *
 * Reads organisations/{orgId}/branding/public over the Firestore REST API.
 * That document is world-readable by the security rules, so no credentials
 * are involved here. Responses are cached on the Vercel edge for an hour so
 * the Firestore read count stays negligible.
 *
 * Self-contained on purpose: Vercel compiles this file alone and does not
 * follow imports into src/. The defaults and builder mirror
 * src/branding/defaults.ts and src/branding/manifest.ts; the test
 * src/branding/api-manifest.test.ts fails if the two drift apart.
 */

// Typed via globalThis so the file also type-checks inside the browser project (the parity test imports it).
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
const PROJECT_ID = env?.VITE_FIREBASE_PROJECT_ID ?? 'bonafarm-next'
const CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
const ORG_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/
const HEX = /^#[0-9a-fA-F]{6}$/

interface Branding {
  appName?: string
  shortName?: string
  description?: string
  mode?: 'dark' | 'light'
  primaryColor?: string
  secondaryColor?: string
  themeColor?: string
  backgroundColor?: string
  icon192?: string
  icon512?: string
  iconMaskable?: string
}

const DEFAULT_BRANDING: Required<Branding> = {
  appName: 'Voer app',
  shortName: 'Voer app',
  description: 'Voorraad en bestellingen van diervoer',
  mode: 'dark',
  primaryColor: '#03A9F4',
  secondaryColor: '#E91E63',
  themeColor: '#F61767',
  backgroundColor: '#000000',
  icon192: '/manifest-icon-192.maskable.png',
  icon512: '/manifest-icon-512.maskable.png',
  iconMaskable: '/icon.png',
}

export function resolveBranding(input: Partial<Branding> | null | undefined): Required<Branding> {
  const b = input ?? {}
  const text = (v: unknown, fallback: string, max: number) =>
    typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : fallback
  const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v : fallback)
  const url = (v: unknown, fallback: string) =>
    typeof v === 'string' && (v.startsWith('/') || v.startsWith('https://')) ? v : fallback
  const d = DEFAULT_BRANDING
  return {
    appName: text(b.appName, d.appName, 60),
    shortName: text(b.shortName, text(b.appName, d.shortName, 12), 12),
    description: text(b.description, d.description, 200),
    mode: b.mode === 'light' ? 'light' : 'dark',
    primaryColor: color(b.primaryColor, d.primaryColor),
    secondaryColor: color(b.secondaryColor, d.secondaryColor),
    themeColor: color(b.themeColor, d.themeColor),
    backgroundColor: color(b.backgroundColor, d.backgroundColor),
    icon192: url(b.icon192, d.icon192),
    icon512: url(b.icon512, d.icon512),
    iconMaskable: url(b.iconMaskable, d.iconMaskable),
  }
}

export function buildManifest(branding: Partial<Branding> | null | undefined, orgId: string | null) {
  const b = resolveBranding(branding)
  const start = orgId ? `/?org=${encodeURIComponent(orgId)}` : '/'
  return {
    id: start,
    name: b.appName,
    short_name: b.shortName,
    description: b.description,
    lang: 'nl',
    dir: 'auto',
    display: 'standalone',
    theme_color: b.themeColor,
    background_color: b.backgroundColor,
    orientation: 'portrait-primary',
    scope: '/',
    start_url: start,
    icons: [
      { src: b.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: b.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: b.iconMaskable, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

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
