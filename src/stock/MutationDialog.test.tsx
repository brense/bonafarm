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

function setup(value: OrgDataValue = data) {
  const onDone = vi.fn()
  const onClose = vi.fn()
  render(
    <OrgContext.Provider value={{ orgId: 'test', roles: ['feed'], status: 'ready' }}>
      <AuthContext.Provider value={{ user: { uid: 'u1' } as never, loading: false, signOut: async () => {} }}>
        <OrgDataContext.Provider value={value}>
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
    expect(screen.getByText('Welk voorraad wil je wijzigen?')).toBeTruthy()
    const items = within(screen.getByRole('list', { name: 'Voerlijst' })).getAllByRole('listitem')
    expect(items.length).toBeLessThanOrEqual(5)
    expect(items[0].textContent).toContain('Hooi')
  })

  it('asks where from and where to with allocation rows', () => {
    setup()
    click('Geitenkorrel min')
    const from = screen.getByRole('list', { name: 'Uit welke opslag?' })
    expect(within(from).getAllByRole('listitem').map((r) => r.textContent)).toEqual(['Ton roze'])
    expect(screen.getByText('Waar is de zak naartoe?')).toBeTruthy()
    const to = screen.getByRole('list', { name: 'Waar naartoe?' })
    expect(within(to).getAllByRole('listitem').map((r) => r.textContent)).toEqual(['Verbruik', 'Koker geit'])
    expect(screen.getByRole('button', { name: 'Selecteer andere opslag' })).toBeTruthy()
    const another = screen.getByRole('button', { name: 'Nog eentje' }) as HTMLButtonElement
    const saveBtn = screen.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement
    expect(another.disabled).toBe(true)
    expect(saveBtn.disabled).toBe(true)
    fireEvent.click(within(from).getByRole('button', { name: 'Ton roze plus' }))
    expect(within(from).getByText('1 zak')).toBeTruthy()
    expect(another.disabled).toBe(true)
    expect(within(from).queryByRole('button', { name: /min$/ })).toBeNull()
    fireEvent.click(within(to).getByRole('button', { name: 'Koker geit plus' }))
    expect(another.disabled).toBe(false)
    fireEvent.click(within(to).getByRole('button', { name: 'Koker geit wissen' }))
    expect(another.disabled).toBe(true)
    fireEvent.click(within(to).getByRole('button', { name: 'Koker geit plus' }))
    expect(another.disabled).toBe(false)
    expect(saveBtn.disabled).toBe(false)
  })

  it('opens a searchable storage picker', () => {
    setup()
    click('Geitenkorrel min')
    click('Selecteer andere opslag')
    expect(screen.getByLabelText('Zoek opslag')).toBeTruthy()
    const picker = screen.getByRole('list', { name: 'Opslagen' })
    expect(within(picker).getAllByRole('listitem').length).toBe(2)
    fireEvent.change(screen.getByLabelText('Zoek opslag'), { target: { value: 'stal' } })
    fireEvent.click(within(picker).getByRole('button', { name: 'Kalverstal plus' }))
    expect(screen.queryByLabelText('Zoek opslag')).toBeNull()
    const to = screen.getByRole('list', { name: 'Waar naartoe?' })
    expect(within(to).getByText('Kalverstal')).toBeTruthy()
    expect(within(to).getByText('1 zak')).toBeTruthy()
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
    click('Ton roze plus')
    click('Koker geit plus')
    click('Nog eentje')
    click('Hooi min')
    click('Kalverstal plus')
    click('Verbruik plus')
    click('Opslaan')
    expect(applyMutations).toHaveBeenCalledTimes(1)
    expect(vi.mocked(applyMutations).mock.calls[0][0]).toHaveLength(3)
    expect(onDone).toHaveBeenCalledWith('2 wijzigingen opgeslagen')
    expect(onClose).toHaveBeenCalled()
  })

  it('swipes a row right for minus', () => {
    setup()
    const row = screen.getByRole('button', { name: 'Hooi min' }).parentElement!.parentElement!
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 100, clientY: 12 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(screen.getByText('−1 baal')).toBeTruthy()
  })

  it('allocates a minus line over several storages', () => {
    setup({
      ...data,
      storages: new Map([...data.storages, ['ton2', storage('bin', 'Ton oranje', 4)]]),
      items: new Map([item('ton', 'geit', 1), item('ton2', 'geit', 2)]),
    })
    click('Geitenkorrel min')
    click('Geitenkorrel min')
    click('Geitenkorrel min')
    expect(screen.getByText('Er ligt maar 3 zakken')).toBeTruthy()
    expect(screen.getByText('Uit welke opslagen?')).toBeTruthy()
    click('Ton roze plus')
    click('Ton oranje plus')
    click('Verbruik plus')
    click('Verbruik plus')
    click('Verbruik plus')
    expect((screen.getByRole('button', { name: 'Nog eentje' }) as HTMLButtonElement).disabled).toBe(true)
    click('Ton oranje plus')
    expect((screen.getByRole('button', { name: 'Nog eentje' }) as HTMLButtonElement).disabled).toBe(false)
    click('Nog eentje')
    expect(screen.getByText(/Ton roze 1, Ton oranje 2 → verbruik 3/)).toBeTruthy()
    click('Opslaan')
    expect(vi.mocked(applyMutations).mock.calls.at(-1)![0]).toHaveLength(2)
  })

  it('disables minus for a feed without stock', () => {
    setup()
    expect((screen.getByRole('button', { name: 'Stro min' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows "Geen voorraad" when swiping right on a feed without stock', () => {
    setup()
    const row = screen.getByRole('button', { name: 'Stro min' }).parentElement!.parentElement!
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(screen.getByText('Geen voorraad')).toBeTruthy()
    expect(screen.queryByText('−1')).toBeNull()
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(screen.queryByText('Geen voorraad')).toBeNull()
    expect(screen.queryByRole('list', { name: 'Gekozen voer' })).toBeNull()
  })

  it('only allows adding in the storage search list', () => {
    setup()
    click('Geitenkorrel min')
    click('Selecteer andere opslag')
    const picker = screen.getByRole('list', { name: 'Opslagen' })
    expect(within(picker).queryByRole('button', { name: /min$/ })).toBeNull()
    expect(within(picker).getByText('Kalverstal')).toBeTruthy()
    const row = within(picker).getByRole('button', { name: 'Kalverstal plus' }).parentElement!.parentElement!
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(within(picker).queryByText('−1')).toBeNull()
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(screen.getByLabelText('Zoek opslag')).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Waar naartoe?' })).queryByText('Kalverstal')).toBeNull()
  })

  it('filters rows while typing', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Zoeken…'), { target: { value: 'st' } })
    const items = within(screen.getByRole('list', { name: 'Voerlijst' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('Stro')
  })
})
