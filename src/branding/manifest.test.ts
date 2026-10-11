import { describe, expect, it } from 'vitest'
import { DEFAULT_BRANDING, resolveBranding } from './defaults.ts'
import { buildManifest, manifestUrl } from './manifest.ts'

describe('resolveBranding', () => {
  it('falls back to defaults for missing or invalid values', () => {
    const b = resolveBranding({ appName: '  ', primaryColor: 'red', icon192: 'http://x/evil.png', mode: 'light' })
    expect(b.appName).toBe(DEFAULT_BRANDING.appName)
    expect(b.primaryColor).toBe(DEFAULT_BRANDING.primaryColor)
    expect(b.icon192).toBe(DEFAULT_BRANDING.icon192)
    expect(b.mode).toBe('light')
  })

  it('derives the short name from the app name and caps it at 12 characters', () => {
    expect(resolveBranding({ appName: 'Kinderboerderij Tanthof' }).shortName).toBe('Kinderboerde')
  })
})

describe('buildManifest', () => {
  it('uses the organisation branding and start url', () => {
    const m = buildManifest({ appName: 'Boerderij app', themeColor: '#123456' }, 'tanthof')
    expect(m.name).toBe('Boerderij app')
    expect(m.theme_color).toBe('#123456')
    expect(m.start_url).toBe('/?org=tanthof')
    expect(m.icons).toHaveLength(3)
  })
})

describe('manifestUrl', () => {
  it('only accepts safe organisation ids', () => {
    expect(manifestUrl('tanthof')).toBe('/api/manifest?org=tanthof')
    expect(manifestUrl('../x')).toBe('/manifest.json')
    expect(manifestUrl(null)).toBe('/manifest.json')
  })
})
