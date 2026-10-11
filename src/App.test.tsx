import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { AuthContext } from './auth/context.ts'
import BrandingProvider from './branding/BrandingProvider.tsx'
import { OrgContext } from './org/context.ts'
import ThemeProvider from './ThemeProvider.tsx'
import type { MemberRole } from './model/types.ts'
import type { OrgStatus } from './org/context.ts'

vi.mock('./lib/firebase.ts', () => ({ auth: {}, db: {} }))
vi.mock('./org/OrgDataProvider.tsx', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

function renderApp(opts: { user?: boolean; status: OrgStatus; roles?: MemberRole[]; path?: string }) {
  const user = opts.user === false ? null : ({ uid: 'u1', email: 'test@example.com' } as never)
  return render(
    <AuthContext.Provider value={{ user, loading: false, signOut: async () => {} }}>
      <OrgContext.Provider value={{ orgId: 'test', roles: opts.roles ?? [], status: opts.status }}>
        <BrandingProvider orgId={null} initial={{ appName: 'Testboerderij' }}>
          <ThemeProvider>
            <MemoryRouter initialEntries={[opts.path ?? '/']}>
              <App />
            </MemoryRouter>
          </ThemeProvider>
        </BrandingProvider>
      </OrgContext.Provider>
    </AuthContext.Provider>,
  )
}

describe('App', () => {
  it('shows the sign-in page when signed out', () => {
    renderApp({ user: false, status: 'loading' })
    expect(screen.getByRole('button', { name: 'Inloggen' })).toBeInTheDocument()
    expect(document.title).toBe('Testboerderij')
  })

  it('shows the no-organisation page', () => {
    renderApp({ status: 'none' })
    expect(screen.getByRole('heading', { level: 1, name: 'Geen organisatie' })).toBeInTheDocument()
  })

  it('renders the shell with only the tabs the roles allow', () => {
    renderApp({ status: 'ready', roles: ['feed'], path: '/muteren' })
    expect(screen.getByRole('heading', { level: 1, name: 'Muteren' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Hoofdmenu' })
    expect(nav).toHaveTextContent('Voorraad')
    expect(nav).toHaveTextContent('Muteren')
    expect(nav).not.toHaveTextContent('Levering')
  })

  it('redirects an unknown route to the first visible tab', () => {
    renderApp({ status: 'ready', roles: ['view'], path: '/levering' })
    expect(screen.getByRole('heading', { level: 1, name: 'Voorraad' })).toBeInTheDocument()
  })
})
