import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BrandingProvider from '../branding/BrandingProvider.tsx'
import SignInPage, { signInErrorMessage } from './SignInPage.tsx'
import { signInWithEmailAndPassword } from 'firebase/auth'

vi.mock('../lib/firebase.ts', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: class {},
}))

function renderPage() {
  return render(
    <BrandingProvider orgId={null} initial={{ appName: 'Testboerderij' }}>
      <SignInPage />
    </BrandingProvider>,
  )
}

afterEach(cleanup)

describe('SignInPage', () => {
  beforeEach(() => {
    vi.mocked(signInWithEmailAndPassword).mockReset()
  })

  it('renders heading and buttons', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Testboerderij' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inloggen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inloggen met Google' })).toBeInTheDocument()
  })

  it('submits typed credentials', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as never)
    renderPage()
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'a@b.nl' } })
    fireEvent.change(screen.getByLabelText(/Wachtwoord/), { target: { value: 'geheim' } })
    fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }))
    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'a@b.nl', 'geheim'))
  })

  it('shows a Dutch error on invalid credentials', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/invalid-credential' })
    renderPage()
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'a@b.nl' } })
    fireEvent.change(screen.getByLabelText(/Wachtwoord/), { target: { value: 'fout' } })
    fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail of wachtwoord klopt niet.')
  })

  it('ignores popup-closed errors', () => {
    expect(signInErrorMessage('auth/popup-closed-by-user')).toBeNull()
  })
})
