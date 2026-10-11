import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BrandingProvider from './BrandingProvider.tsx'
import { DEFAULT_BRANDING } from './defaults.ts'
import { useBranding } from './useBranding.ts'

afterEach(cleanup)

const loaded = vi.fn()
vi.mock('../lib/firebase.ts', () => {
  loaded()
  throw new Error('must not load')
})

function Name() {
  return <p>{useBranding().branding.appName}</p>
}

describe('BrandingProvider', () => {
  it('applies initial branding to the document head', () => {
    render(
      <BrandingProvider orgId="tanthof" initial={{ themeColor: '#112233' }}>
        <Name />
      </BrandingProvider>,
    )
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#112233')
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute('href')).toMatch(
      /\/api\/manifest\?org=tanthof$/,
    )
  })

  it('uses defaults and never loads Firebase without an organisation', async () => {
    render(
      <BrandingProvider orgId={null}>
        <Name />
      </BrandingProvider>,
    )
    expect(screen.getByText(DEFAULT_BRANDING.appName)).toBeInTheDocument()
    expect(document.title).toBe(DEFAULT_BRANDING.appName)
    await Promise.resolve()
    expect(loaded).not.toHaveBeenCalled()
  })
})
