import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'
import ThemeProvider from './ThemeProvider.tsx'

describe('App', () => {
  it('renders the shell with the MUI theme', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Voer app' })).toBeInTheDocument()
  })
})
