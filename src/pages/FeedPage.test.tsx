import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Feed, Item, Storage, StorageType } from '../model/types.ts'
import { OrgContext } from '../org/context.ts'
import { OrgDataContext } from '../org/dataContext.ts'
import type { FeedLog } from '../stock/useFeedLogs.ts'
import ThemeProvider from '../ThemeProvider.tsx'
import FeedPage from './FeedPage.tsx'

vi.mock('../lib/firebase.ts', () => ({ db: {} }))
const mocks = vi.hoisted(() => ({ logs: [] as unknown[] | null }))
vi.mock('../stock/useFeedLogs.ts', () => ({ useFeedLogs: () => mocks.logs }))

const NOW = new Date(2026, 9, 13, 12).getTime()

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  mocks.logs = []
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const storageTypes = new Map<string, StorageType>([['bin', { name: 'Bak', behaviour: 'counted', order: 0 }]])
const storages = new Map<string, Storage>([
  ['ton-roze', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton roze', status: 'active', order: 1 }],
  ['ton-blauw', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton blauw', status: 'active', order: 2 }],
])
const feeds = new Map<string, Feed>([
  ['hooi', { name: 'Hooi', unit: 'baal', hidden: false, order: 1 }],
  ['stro', { name: 'Stro', unit: 'baal', hidden: true, order: 2 }],
])

function items(amount: number) {
  return new Map<string, Item>([
    ['ton-roze_hooi', { storageId: 'ton-roze', feedId: 'hooi', amount, updatedAt: {} as Item['updatedAt'] }],
  ])
}

function log(date: Date, amount: number, type: FeedLog['type'] = 'dispense'): FeedLog {
  return { type, feedId: 'hooi', storageId: 'ton-roze', amount, timestampMs: date.getTime() }
}

function renderPage(roles: Parameters<typeof OrgContext.Provider>[0]['value']['roles'], path = '/stock/hooi', amount = 7.5) {
  return render(
    <OrgContext.Provider value={{ orgId: 'test', roles, status: 'ready' }}>
      <OrgDataContext.Provider value={{ feeds, storages, storageTypes, storageGroups: new Map(), items: items(amount), loading: false, error: null }}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/stock/:feedId" element={<FeedPage />} />
              <Route path="/stock" element={<div>lijst</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </OrgDataContext.Provider>
    </OrgContext.Provider>,
  )
}

/** One bale a week over the last 12 weeks. */
function weeklyDispenses(): FeedLog[] {
  return Array.from({ length: 12 }, (_, k) => log(new Date(2026, 9, 10 - 7 * k, 12), 1))
}

describe('FeedPage', () => {
  it('shows the feed name, amount and unit', () => {
    renderPage(['view'])
    expect(screen.getByRole('region', { name: 'Hooi' })).toBeInTheDocument()
    expect(screen.getByText('Hooi')).toBeInTheDocument()
    expect(screen.getByText(/^7,5/, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getAllByText('balen')[0]).toBeInTheDocument()
    expect(screen.getByText('Ton roze 7,5')).toBeInTheDocument()
  })

  it('hides the advice from viewers and shows the order quantity to orderers', () => {
    mocks.logs = weeklyDispenses()
    const { unmount } = renderPage(['view'], '/stock/hooi', 1)
    expect(screen.queryByRole('heading', { name: 'Advies' })).toBeNull()
    unmount()
    renderPage(['order'], '/stock/hooi', 1)
    expect(screen.getByRole('heading', { name: 'Advies' })).toBeInTheDocument()
    expect(screen.getByText('3 balen')).toBeInTheDocument()
    expect(screen.getByText(/voor de levering van/)).toBeInTheDocument()
  })

  it('shows monthly consumption against last year', () => {
    mocks.logs = [log(new Date(2025, 9, 5, 12), 3), log(new Date(2026, 9, 10, 12), 2)]
    renderPage(['view'])
    expect(screen.getByText('gemiddeld per maand, laatste 12 maanden')).toBeInTheDocument()
    expect(screen.getByText(/t\/m 13 okt: 2 balen · vorig jaar 3/)).toBeInTheDocument()
    expect(screen.getByLabelText('okt 2025: 3 balen')).toHaveTextContent('3')
    const future = screen.getByLabelText('dec 2026')
    expect(future).toHaveTextContent('')
  })

  it('redirects an unknown feed to the list', () => {
    renderPage(['view'], '/stock/onbekend')
    expect(screen.getByText('lijst')).toBeInTheDocument()
  })

  it('redirects a hidden feed to the list', () => {
    renderPage(['view'], '/stock/stro')
    expect(screen.getByText('lijst')).toBeInTheDocument()
  })
})
