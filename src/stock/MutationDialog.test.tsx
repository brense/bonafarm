import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/context.ts'
import { OrgContext } from '../org/context.ts'
import { OrgDataContext, type OrgDataValue } from '../org/dataContext.ts'
import type { Feed, Item, Storage, StorageType } from '../model/types.ts'
import MutationDialog from './MutationDialog.tsx'
import { applyMutations } from './mutations.ts'

vi.mock('../lib/firebase.ts', () => ({ db: {} }))
vi.mock('./useRecentLogs.ts', () => ({
  useRecentLogs: () => [
    { type: 'dispense', feedId: 'hooi', storageId: 'stal', amount: 10, timestampMs: 1 },
    { type: 'fill', feedId: 'geit', storageId: 'koker', amount: 4, timestampMs: 2 },
    { type: 'dispense', feedId: 'stro', storageId: 'stal', amount: 1, timestampMs: 3 },
  ],
}))
vi.mock('./mutations.ts', async () => ({
  ...(await vi.importActual<typeof import('./mutations.ts')>('./mutations.ts')),
  applyMutations: vi.fn(() => Promise.resolve()),
}))

afterEach(cleanup)

const type = (name: string, behaviour: StorageType['behaviour'], order: number): StorageType => ({ name, behaviour, order })
const storage = (typeId: string, name: string, order: number): Storage => ({ groupId: 'g', typeId, name, status: 'active', order })
const feed = (name: string, unit: Feed['unit'], order: number, defaultStorageId?: string): Feed => ({ name, unit, order, hidden: false, defaultStorageId })
const item = (storageId: string, feedId: string, amount: number) => [`${storageId}_${feedId}`, { storageId, feedId, amount } as Item] as const

const data: OrgDataValue = {
  feeds: new Map([
    ['hooi', feed('Hooi', 'baal', 1)],
    ['geit', feed('Geitenkorrel', 'zak', 2, 'koker')],
    ['stro', feed('Stro', 'baal', 3)],
  ]),
  storages: new Map([
    ['ton', storage('bin', 'Ton roze', 1)],
    ['stal', storage('stable', 'Kalverstal', 2)],
    ['koker', storage('shute', 'Koker geit', 3)],
  ]),
  storageTypes: new Map([
    ['bin', type('Ton', 'counted', 1)],
    ['stable', type('Stal', 'counted', 2)],
    ['shute', type('Koker', 'consumed', 3)],
  ]),
  storageGroups: new Map(),
  items: new Map([item('ton', 'geit', 3), item('stal', 'hooi', 6)]),
  loading: false,
  error: null,
}

function setup() {
  const onDone = vi.fn()
  const onClose = vi.fn()
  render(
    <OrgContext.Provider value={{ orgId: 'test', roles: ['feed'], status: 'ready' }}>
      <AuthContext.Provider value={{ user: { uid: 'u1' } as never, loading: false, signOut: async () => {} }}>
        <OrgDataContext.Provider value={data}>
          <MutationDialog open onClose={onClose} onDone={onDone} />
        </OrgDataContext.Provider>
      </AuthContext.Provider>
    </OrgContext.Provider>,
  )
  return { onDone, onClose }
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('MutationDialog', () => {
  it('shows at most 5 rows with the most used feed first', () => {
    setup()
    const items = within(screen.getByRole('list', { name: 'Voerlijst' })).getAllByRole('listitem')
    expect(items.length).toBeLessThanOrEqual(5)
    expect(items[0].textContent).toContain('Hooi')
  })

  it('suggests the holding bin and the linked koker', () => {
    setup()
    click('Geitenkorrel min')
    const from = screen.getByRole('group', { name: 'Waar vandaan?' })
    expect(within(from).getByRole('button', { name: 'Ton roze' }).getAttribute('aria-pressed')).toBe('true')
    const then = screen.getByRole('group', { name: 'En dan?' })
    expect(within(then).getByRole('button', { name: 'Koker geit' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(then).getByRole('button', { name: 'Verbruikt' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('adds one per tap', () => {
    setup()
    click('Geitenkorrel min')
    click('Geitenkorrel min')
    expect(screen.getByText('−2 zakken')).toBeTruthy()
  })

  it('saves several lines as one batch', () => {
    const { onDone, onClose } = setup()
    click('Geitenkorrel min')
    click('Nog een')
    click('Hooi min')
    click('Wijzigingen opslaan (2)')
    expect(applyMutations).toHaveBeenCalledTimes(1)
    expect(vi.mocked(applyMutations).mock.calls[0][0]).toHaveLength(3)
    expect(onDone).toHaveBeenCalledWith('2 wijzigingen opgeslagen')
    expect(onClose).toHaveBeenCalled()
  })

  it('swipes a row left for minus', () => {
    setup()
    const row = screen.getByRole('button', { name: 'Hooi min' }).parentElement!.parentElement!
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 100, clientY: 10 })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 10, clientY: 12 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 10, clientY: 12 })
    expect(screen.getByText('−1 baal')).toBeTruthy()
  })

  it('filters rows while typing', () => {
    setup()
    fireEvent.change(screen.getByRole('combobox', { name: 'Voer' }), { target: { value: 'st' } })
    const items = within(screen.getByRole('list', { name: 'Voerlijst' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('Stro')
  })
})
