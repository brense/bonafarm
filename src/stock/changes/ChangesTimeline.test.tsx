import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../ThemeProvider.tsx'
import type { ChangeLog, Perspective } from './changes.ts'
import ChangesTimeline from './ChangesTimeline.tsx'

const NOW = new Date(2026, 9, 18, 12).getTime()
const perspective: Perspective = { kind: 'storage', storageId: 's', feedName: (id) => `Voer ${id}` }
const log = (id: string, timestampMs: number | null): ChangeLog => ({ id, type: 'dispense', feedId: 'f', storageId: 's', amount: 1, timestampMs })

function renderIt(logs: ChangeLog[], loadMore?: { available: boolean; load: () => void }) {
  return render(
    <ThemeProvider>
      <ChangesTimeline logs={logs} nowMs={NOW} perspective={perspective} loadMore={loadMore} />
    </ThemeProvider>,
  )
}

afterEach(cleanup)

describe('ChangesTimeline', () => {
  it('shows a pending entry as being saved', () => {
    renderIt([log('a', null)])
    expect(screen.getByText('wordt opgeslagen…')).toBeInTheDocument()
  })
  it('offers more from loadMore once everything is shown', () => {
    const load = vi.fn()
    renderIt([log('a', NOW - 1000)], { available: true, load })
    fireEvent.click(screen.getByRole('button', { name: 'Meer…' }))
    expect(load).toHaveBeenCalledTimes(1)
  })
  it('hides Meer… when nothing more is available', () => {
    renderIt([log('a', NOW - 1000)], { available: false, load: vi.fn() })
    expect(screen.queryByRole('button', { name: 'Meer…' })).toBeNull()
  })
})
