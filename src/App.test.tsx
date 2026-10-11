import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'
import BrandingProvider from './branding/BrandingProvider.tsx'
import ThemeProvider from './ThemeProvider.tsx'

describe('App', () => {
  it('renders the shell with the organisation branding', () => {
    render(
      <BrandingProvider orgId={null} initial={{ appName: 'Testboerderij' }}>
        <ThemeProvider>
          <MemoryRouter>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </BrandingProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Testboerderij' })).toBeInTheDocument()
    expect(document.title).toBe('Testboerderij')
  })
})
