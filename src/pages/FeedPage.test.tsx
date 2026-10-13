import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

const storageTypes = new Map<string, StorageType>([
  ['bin', { name: 'Bak', behaviour: 'counted', order: 0 }],
  ['shute', { name: 'Koker', behaviour: 'consumed', order: 1 }],
])
const storages = new Map<string, Storage>([
  ['ton-roze', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton roze', status: 'active', order: 1 }],
  ['ton-blauw', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton blauw', status: 'active', order: 2 }],
  ['koker-1', { groupId: 'ungrouped', typeId: 'shute', name: 'Koker 1', status: 'active', order: 5 }],
  ['ton-paars', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton paars', status: 'active', order: 3 }],
  ['ton-oranje', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton oranje', status: 'active', order: 4 }],
])
const feeds = new Map<string, Feed>([
  ['hooi', { name: 'Hooi', unit: 'baal', hidden: false, order: 1 }],
  ['stro', { name: 'Stro', unit: 'baal', hidden: true, order: 2 }],
  ['korrel', { name: 'Korrel', unit: 'zak', hidden: false, order: 3, defaultStorageId: 'koker-1' }],
])

function items(amount: number) {
  return new Map<string, Item>([
    ['ton-roze_hooi', { storageId: 'ton-roze', feedId: 'hooi', amount, updatedAt: {} as Item['updatedAt'] }],
  ])
}

let idSeq = 0
function log(date: Date, amount: number, type: FeedLog['type'] = 'dispense', feedId = 'hooi', storageId = 'ton-roze', batchId?: string): FeedLog {
  return { id: `l${idSeq++}`, type, feedId, storageId, amount, timestampMs: date.getTime(), ...(batchId ? { batchId } : {}) }
}

/** An older complete year (2024), last year and this year, plus a delivery split over two storages. */
function history(): FeedLog[] {
  return [
    ...[2024, 2025, 2026].flatMap((y) => [0, 3, 6].map((m) => log(new Date(y, m, 10, 12), 4 + m))),
    log(new Date(2026, 9, 2, 12), 1, 'delivery', 'hooi', 'ton-paars', 'dl-1'),
    log(new Date(2026, 9, 2, 12), 1, 'delivery', 'hooi', 'ton-oranje', 'dl-1'),
  ]
}

function shuteHistory(): FeedLog[] {
  return [
    log(new Date(2025, 0, 10, 12), 5, 'fill', 'korrel'),
    log(new Date(2025, 5, 10, 12), 5, 'fill', 'korrel'),
    log(new Date(2025, 2, 1, 12), 0, 'empty', 'korrel'),
    log(new Date(2025, 8, 1, 12), 0, 'empty', 'korrel'),
  ]
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
    expect(screen.queryByText('Ton roze 7,5')).toBeNull()
  })

  it('hides the advice from viewers and shows the order quantity to orderers', () => {
    mocks.logs = weeklyDispenses()
    const { unmount } = renderPage(['view'], '/stock/hooi', 1)
    expect(screen.queryByRole('heading', { name: 'Bestel advies' })).toBeNull()
    unmount()
    renderPage(['order'], '/stock/hooi', 1)
    expect(screen.getByRole('heading', { name: 'Bestel advies' })).toBeInTheDocument()
    expect(screen.getByText('3 balen')).toBeInTheDocument()
    expect(screen.queryByText(/voor de levering van/)).toBeNull()
    expect(screen.getByText(/^Nog ±?\d+ dagen voorraad$/)).toBeInTheDocument()
    expect(screen.getByText('Gem. verbruik per week 1 baal')).toBeInTheDocument()
  })

  it('shows monthly consumption against last year', () => {
    mocks.logs = [log(new Date(2025, 9, 5, 12), 3), log(new Date(2026, 9, 10, 12), 2)]
    renderPage(['view'])
    expect(screen.getByText('gemiddeld per maand, laatste 12 maanden')).toBeInTheDocument()
    expect(screen.getByText('Deze maand')).toBeInTheDocument()
    expect(screen.getByText('Zelfde periode vorig jaar')).toBeInTheDocument()
    expect(screen.getByText('−1')).toBeInTheDocument()
  })

  it('shows stock per storage with the days left', () => {
    mocks.logs = weeklyDispenses()
    renderPage(['view'], '/stock/hooi', 7.5)
    expect(screen.getByRole('heading', { name: 'Voorraad' })).toBeInTheDocument()
    expect(screen.getAllByText('Ton roze').length).toBeGreaterThan(0)
    expect(screen.getByText(/^nog ±\d+ dagen bij 1 baal\/week/)).toBeInTheDocument()
  })

  it('draws the monthly bar chart with a title for the current month', () => {
    mocks.logs = history()
    renderPage(['view'])
    expect(screen.getByRole('img', { name: /^Verbruik per maand, nov 2025 t\/m okt 2026/ })).toBeInTheDocument()
    expect(screen.getByText(/^okt 2026: /, { selector: 'title' })).toBeInTheDocument()
  })

  it('shows the season inside the consumption card and drops the old cards', () => {
    mocks.logs = history()
    renderPage(['view'])
    expect(screen.getByRole('heading', { name: 'Seizoen', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Verbruik', level: 2 })).toBeInTheDocument()
    expect(screen.getAllByRole('img').some((e) => e.getAttribute('aria-label')?.startsWith('jan:'))).toBe(true)
    expect(screen.queryByText('Per jaar')).toBeNull()
    expect(screen.queryByText('Leveringen')).toBeNull()
  })

  it('shows the latest change big: a delivery batch split over two storages', () => {
    mocks.logs = history()
    renderPage(['view'])
    expect(screen.getByRole('heading', { name: 'Wijzigingen', level: 2 })).toBeInTheDocument()
    const headline = screen.getByText('2 balen geleverd')
    expect(headline.tagName).toBe('P')
    expect(headline).toHaveClass('MuiTypography-h5')
    expect(screen.getByText('1 Ton paars · 1 Ton oranje')).toBeInTheDocument()
    expect(screen.getByText('vr 2 okt 12:00')).toBeInTheDocument()
  })

  it('says so without changes', () => {
    renderPage(['view'])
    expect(screen.getByText('Nog geen wijzigingen.')).toBeInTheDocument()
  })

  it('pages through the changes ten at a time', () => {
    mocks.logs = Array.from({ length: 25 }, (_, k) => log(new Date(2026, 8, 1 + k % 28, 8, k), 1))
    renderPage(['view'])
    expect(screen.getAllByText(/ eruit$|1 baal eruit/).length).toBe(10)
    fireEvent.click(screen.getByRole('button', { name: 'Meer…' }))
    expect(screen.getAllByText(/1 baal eruit/).length).toBe(20)
    fireEvent.click(screen.getByRole('button', { name: 'Meer…' }))
    expect(screen.getAllByText(/1 baal eruit/).length).toBe(25)
    expect(screen.queryByRole('button', { name: 'Meer…' })).toBeNull()
  })

  it('renders a move batch with an arrow', () => {
    mocks.logs = [
      log(new Date(2026, 9, 5, 9, 12), 2, 'move', 'hooi', 'ton-roze', 'mv-1'),
      log(new Date(2026, 9, 5, 9, 12), 2, 'move', 'hooi', 'ton-blauw', 'mv-1'),
    ]
    renderPage(['view'])
    expect(screen.getByText('2 balen verplaatst')).toBeInTheDocument()
    expect(screen.getByText(/→/)).toBeInTheDocument()
  })

  it('shows the koker card only for shute feeds', () => {
    mocks.logs = shuteHistory()
    const { unmount } = renderPage(['view'])
    expect(screen.queryByRole('heading', { name: 'Koker' })).toBeNull()
    unmount()
    renderPage(['view'], '/stock/korrel')
    expect(screen.getByRole('heading', { name: 'Koker' })).toBeInTheDocument()
    expect(screen.getByText('keer leeggemaakt')).toBeInTheDocument()
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
