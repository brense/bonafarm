import { describe, expect, it } from 'vitest'
import * as api from '../../api/manifest.ts'
import { DEFAULT_BRANDING, resolveBranding } from './defaults.ts'
import { buildManifest } from './manifest.ts'

/**
 * api/manifest.ts cannot import from src/ (Vercel compiles it on its own), so
 * it carries a copy of the defaults and the builder. This test keeps the two
 * copies identical.
 */
describe('api/manifest.ts mirrors src/branding', () => {
  const samples = [
    null,
    {},
    { appName: 'Kinderboerderij Tanthof', themeColor: '#123456', mode: 'light' as const },
    { appName: ' ', primaryColor: 'red', icon192: 'http://x/evil.png', shortName: 'Een veel te lange korte naam' },
  ]

  it('resolves branding identically', () => {
    for (const s of samples) expect(api.resolveBranding(s)).toEqual(resolveBranding(s))
    expect(api.resolveBranding(null)).toEqual(DEFAULT_BRANDING)
  })

  it('builds identical manifests', () => {
    for (const s of samples) {
      expect(api.buildManifest(s, 'tanthof')).toEqual(buildManifest(s, 'tanthof'))
      expect(api.buildManifest(s, null)).toEqual(buildManifest(s, null))
    }
  })
})
