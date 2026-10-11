import type { Branding } from '../model/types.ts'
import { resolveBranding } from './defaults.ts'

export const ORG_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/

/** URL of the dynamic manifest for an organisation, served by api/manifest.ts. */
export function manifestUrl(orgId: string | null): string {
  return orgId && ORG_ID_PATTERN.test(orgId) ? `/api/manifest?org=${encodeURIComponent(orgId)}` : '/manifest.json'
}

/** Builds the web app manifest for an organisation from its (possibly partial) branding. */
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
