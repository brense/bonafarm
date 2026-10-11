import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { Feed, Item, Storage, StorageType } from '../model/types.ts'
import { OrgContext } from '../org/context.ts'
import { OrgDataContext } from '../org/dataContext.ts'
import ThemeProvider from '../ThemeProvider.tsx'
import VoorraadPage from './VoorraadPage.tsx'

vi.mock('../lib/firebase.ts', () => ({ db: {} }))
vi.mock('../stock/useRecentLogs.ts', () => ({ useRecentLogs: () => null }))

afterEach(cleanup)

const storageTypes = new Map<string, StorageType>([
  ['bin', { name: 'Bak', behaviour: 'counted', order: 0 }],
  ['shute', { name: 'Koker', behaviour: 'consumed', order: 1 }],
])
const storages = new Map<string, Storage>([
  ['ton-roze', { groupId: 'ungrouped', typeId: 'bin', name: 'Ton roze', status: 'active', order: 1 }],
  ['koker-geit', { groupId: 'ungrouped', typeId: 'shute', name: 'Koker geit', status: 'active', order: 2 }],
])
const feeds = new Map<string, Feed>([
  ['hooi', { name: 'Hooi', unit: 'baal', hidden: false, order: 1 }],
  ['geitenkorrel', { name: 'Geitenkorrel', unit: 'zak', hidden: false, order: 2, defaultStorageId: 'koker-geit' }],
])
const items = new Map<string, Item>([
  ['ton-roze_hooi', { storageId: 'ton-roze', feedId: 'hooi', amount: 7.5, updatedAt: {} as Item['updatedAt'] }],
])

function renderPage(roles: Parameters<typeof OrgContext.Provider>[0]['value']['roles']) {
  return render(
    <OrgContext.Provider value={{ orgId: 'test', roles, status: 'ready' }}>
      <OrgDataContext.Provider value={{ feeds, storages, storageTypes, storageGroups: new Map(), items, loading: false, error: null }}>
        <ThemeProvider>
          <VoorraadPage />
        </ThemeProvider>
      </OrgDataContext.Provider>
    </OrgContext.Provider>,
  )
}

describe('VoorraadPage', () => {
  it('lists stock per feed with Dutch amounts', () => {
    renderPage(['view'])
    expect(screen.getByText('Hooi')).toBeInTheDocument()
    expect(screen.getByText('7,5')).toBeInTheDocument()
    expect(screen.getByText('Geitenkorrel')).toBeInTheDocument()
  })

  it('offers the advice toggle only to orderers', () => {
    renderPage(['view'])
    expect(screen.queryByLabelText('Besteladvies')).not.toBeInTheDocument()
    cleanup()
    renderPage(['order'])
    expect(screen.getByLabelText('Besteladvies')).toBeInTheDocument()
  })
})
