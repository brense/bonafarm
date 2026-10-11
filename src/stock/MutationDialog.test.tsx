import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
/** The feed row of the line in progress (the search list may still be animating out with a duplicate). */
const clickInCart = (name: string) => fireEvent.click(within(screen.getByRole('list', { name: 'Gekozen voer' })).getByRole('button', { name }))
const lineCommitted = () => waitFor(() => expect(screen.queryByRole('list', { name: 'Gekozen voer' })).toBeNull())

describe('MutationDialog', () => {
  it('shows at most 5 rows with the most used feed first', () => {
    setup()
    expect(screen.getByText('Welke voorraad wil je wijzigen?')).toBeTruthy()
    const items = within(screen.getByRole('list', { name: 'Voerlijst' })).getAllByRole('listitem')
    expect(items.length).toBeLessThanOrEqual(5)
    expect(items[0].textContent).toContain('Hooi')
  })

  it('asks one question at a time and commits the line when it is complete', async () => {
    setup()
    click('Geitenkorrel min')
    const from = screen.getByRole('list', { name: 'Uit welke opslag?' })
    expect(within(from).getAllByRole('listitem').map((r) => r.textContent)).toEqual(['Ton roze3 zakken'])
    expect(within(from).queryByRole('button', { name: /plus$/ })).toBeNull()
    expect(screen.queryByText('Waar is de zak naartoe?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nog eentje' })).toBeNull()
    const saveBtn = screen.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
    fireEvent.click(within(from).getByRole('button', { name: 'Ton roze min' }))
    const cart = screen.getByRole('list', { name: 'Wijzigingen' })
    expect(within(cart).getByText('Van: Ton roze 1')).toBeTruthy()
    expect(screen.getByText('Waar is de zak naartoe?')).toBeTruthy()
    expect(within(cart).queryByText('Waar is de zak naartoe?')).toBeNull()
    // Reopen the first question and close it again.
    fireEvent.click(within(cart).getByRole('button', { name: 'Wijzig' }))
    expect(screen.getByText('Uit welke opslag?')).toBeTruthy()
    click('Klaar')
    const to = screen.getByRole('list', { name: 'Opslagen' })
    expect(within(to).getAllByRole('listitem')).toHaveLength(3)
    expect(within(to).getAllByRole('listitem')[0].textContent).toContain('Verbruik')
    fireEvent.click(within(to).getByRole('button', { name: 'Koker geit plus' }))
    await lineCommitted()
    const row = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(row.getByText('Geitenkorrel')).toBeTruthy()
    expect(row.getByText('Ton roze')).toBeTruthy()
    expect(row.getByText('−1 zak')).toBeTruthy()
    expect(row.getByText('+1 zak Koker geit')).toBeTruthy()
    expect(row.getByRole('button', { name: 'Wijziging weghalen' })).toBeTruthy()
    expect(row.queryByRole('button', { name: /(min|plus)$/ })).toBeNull()
    expect(screen.getByText('1 wijziging')).toBeTruthy()
    expect(screen.getByLabelText('Zoeken…')).toBeTruthy()
    expect(screen.getByText('Nog een voorraad wijzigen?')).toBeTruthy()
    expect(screen.queryByText('Waar is de zak naartoe?')).toBeNull()
    expect((screen.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('opens a searchable storage picker', async () => {
    setup()
    click('Geitenkorrel min')
    click('Ton roze min')
    expect(screen.getByLabelText('Zoek opslag')).toBeTruthy()
    const picker = screen.getByRole('list', { name: 'Opslagen' })
    expect(within(picker).getAllByRole('listitem').length).toBe(3)
    fireEvent.change(screen.getByLabelText('Zoek opslag'), { target: { value: 'stal' } })
    fireEvent.click(within(picker).getByRole('button', { name: 'Kalverstal plus' }))
    await lineCommitted()
    expect(screen.queryByLabelText('Zoek opslag')).toBeNull()
    const cartRows = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cartRows.getByText('Ton roze')).toBeTruthy()
    expect(cartRows.getByText('+1 zak Kalverstal')).toBeTruthy()
  })

  it('commits a completed plus line into the cart', async () => {
    setup()
    click('Hooi plus')
    click('Kalverstal plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('Hooi')).toBeTruthy()
    expect(cart.getByText('Kalverstal')).toBeTruthy()
    expect(cart.getByText('+1 baal')).toBeTruthy()
    expect(cart.getByRole('button', { name: 'Wijziging weghalen' })).toBeTruthy()
    expect(screen.getByText('1 wijziging')).toBeTruthy()
    expect(screen.getByText('Wijziging toegevoegd')).toBeTruthy()
    expect(screen.getByLabelText('Zoeken…')).toBeTruthy()
  })

  it('shows a multi-target plus line with sub items and lets each target be edited', async () => {
    setup({ ...data, storages: new Map([...data.storages, ['paard', storage('stable', 'Paardenstal', 4)]]) })
    click('Hooi plus')
    for (let n = 0; n < 4; n++) clickInCart('Hooi plus')
    click('Paardenstal plus')
    click('Paardenstal plus')
    click('Kalverstal plus')
    click('Kalverstal plus')
    click('Kalverstal plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('Hooi')).toBeTruthy()
    expect(cart.getByText('+5 balen')).toBeTruthy()
    expect(cart.getByText('+2 balen Paardenstal')).toBeTruthy()
    expect(cart.getByText('+3 balen Kalverstal')).toBeTruthy()
    expect(screen.getByText('1 wijziging')).toBeTruthy()
    fireEvent.click(cart.getByRole('button', { name: 'Kalverstal plus' }))
    expect(cart.getByText('+4 balen Kalverstal')).toBeTruthy()
    expect(cart.getByText('+6 balen')).toBeTruthy()
    // A sub item at zero folds out; the line stays with the other target.
    fireEvent.click(cart.getByRole('button', { name: 'Paardenstal min' }))
    fireEvent.click(cart.getByRole('button', { name: 'Paardenstal min' }))
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Wijzigingen' })).queryByText('+2 balen Paardenstal')).toBeNull())
    expect(screen.getByText('Wijziging weggehaald')).toBeTruthy()
    expect(screen.getByText('+4 balen')).toBeTruthy()
  })

  it('edits a single-target plus line and removes it at zero', async () => {
    setup()
    click('Hooi plus')
    click('Kalverstal plus')
    await lineCommitted()
    const cart = () => within(screen.getByRole('list', { name: 'Wijzigingen' }))
    fireEvent.click(cart().getByRole('button', { name: 'Hooi plus' }))
    expect(cart().getByText('+2 balen')).toBeTruthy()
    fireEvent.click(cart().getByRole('button', { name: 'Hooi min' }))
    fireEvent.click(cart().getByRole('button', { name: 'Hooi min' }))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Wijzigingen' })).toBeNull())
    expect(screen.getByText('Wijziging weggehaald')).toBeTruthy()
    expect(screen.getByText('Nog geen wijzigingen')).toBeTruthy()
  })

  it('removes a read-only minus line with the cross', async () => {
    setup()
    click('Geitenkorrel min')
    click('Ton roze min')
    click('Verbruik plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('Geitenkorrel')).toBeTruthy()
    expect(cart.getByText('+1 zak Verbruik')).toBeTruthy()
    expect(cart.queryByRole('button', { name: /(min|plus)$/ })).toBeNull()
    fireEvent.click(cart.getByRole('button', { name: 'Wijziging weghalen' }))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Wijzigingen' })).toBeNull())
    expect(screen.getByText('Wijziging weggehaald')).toBeTruthy()
    expect(screen.getByText('Nog geen wijzigingen')).toBeTruthy()
  })

  const grasData = (): OrgDataValue => ({
    ...data,
    feeds: new Map([...data.feeds, ['gras', feed('Grasbrok', 'zak', 4)]]),
    storages: new Map([...data.storages, ['over', storage('stable', 'Overige', 4)], ['blauw', storage('bin', 'Ton blauw', 5)]]),
    items: new Map([item('over', 'gras', 5), item('ton', 'gras', 1)]),
  })

  it('shows a split minus line as a main row with sub items and saves it as a move plus a dispense', async () => {
    setup(grasData())
    click('Grasbrok min')
    clickInCart('Grasbrok min')
    click('Overige min')
    click('Overige min')
    click('Verbruik plus')
    click('Ton blauw plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('Grasbrok')).toBeTruthy()
    expect(cart.getByText('Overige')).toBeTruthy()
    expect(cart.getByText('−2 zakken')).toBeTruthy()
    expect(cart.getByText('+1 zak Verbruik')).toBeTruthy()
    expect(cart.getByText('+1 zak Ton blauw')).toBeTruthy()
    click('Opslaan')
    const plans = vi.mocked(applyMutations).mock.calls.at(-1)![0]
    expect(plans.map((p) => `${p.log.type}:${p.log.storageId}:${p.log.amount}`)).toEqual(['dispense:over:1', 'move:over:1', 'move:blauw:1'])
  })

  it('lists several sources as sub items without a main storage', async () => {
    setup(grasData())
    click('Grasbrok min')
    clickInCart('Grasbrok min')
    click('Overige min')
    click('Ton roze min')
    click('Verbruik plus')
    click('Verbruik plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('−2 zakken')).toBeTruthy()
    expect(cart.getByText('−1 zak Overige')).toBeTruthy()
    expect(cart.getByText('−1 zak Ton roze')).toBeTruthy()
    expect(cart.getByText('+2 zakken Verbruik')).toBeTruthy()
  })

  it('counts cart lines in the heading', async () => {
    setup()
    expect(screen.getByText('Nog geen wijzigingen')).toBeTruthy()
    click('Geitenkorrel min')
    expect(screen.getByText('Nog geen wijzigingen')).toBeTruthy()
    click('Ton roze min')
    click('Koker geit plus')
    await lineCommitted()
    expect(screen.getByText('1 wijziging')).toBeTruthy()
  })

  it('cancels the line in progress', () => {
    setup()
    click('Geitenkorrel min')
    click('Regel annuleren')
    expect(screen.queryByRole('list', { name: 'Gekozen voer' })).toBeNull()
    expect(screen.getByRole('list', { name: 'Voerlijst' })).toBeTruthy()
  })

  it('adds one per tap', () => {
    setup()
    click('Geitenkorrel min')
    clickInCart('Geitenkorrel min')
    expect(screen.getByText('−2 zakken')).toBeTruthy()
  })

  it('saves several lines as one batch', () => {
    const { onDone, onClose } = setup()
    click('Geitenkorrel min')
    click('Ton roze min')
    click('Koker geit plus')
    click('Hooi min')
    click('Kalverstal min')
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

  it('allocates a minus line over several storages', async () => {
    setup({
      ...data,
      storages: new Map([...data.storages, ['ton2', storage('bin', 'Ton oranje', 4)]]),
      items: new Map([item('ton', 'geit', 1), item('ton2', 'geit', 2)]),
    })
    click('Geitenkorrel min')
    clickInCart('Geitenkorrel min')
    clickInCart('Geitenkorrel min')
    expect(screen.getByText('Er ligt maar 3 zakken')).toBeTruthy()
    expect(screen.getByText('Uit welke opslagen?')).toBeTruthy()
    click('Ton roze min')
    click('Ton oranje min')
    expect(screen.queryByText('Waar is de zak naartoe?')).toBeNull()
    click('Ton oranje min')
    expect(screen.getByText('Waar is de zak naartoe?')).toBeTruthy()
    click('Verbruik plus')
    click('Verbruik plus')
    expect((screen.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement).disabled).toBe(true)
    click('Verbruik plus')
    await lineCommitted()
    const rows = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(rows.getByText('−3 zakken')).toBeTruthy()
    expect(rows.getByText('−1 zak Ton roze')).toBeTruthy()
    expect(rows.getByText('−2 zakken Ton oranje')).toBeTruthy()
    expect(rows.getByText('+3 zakken Verbruik')).toBeTruthy()
    click('Opslaan')
    expect(vi.mocked(applyMutations).mock.calls.at(-1)![0]).toHaveLength(2)
  })

  it('disables minus for a feed without stock', () => {
    setup()
    expect((screen.getByRole('button', { name: 'Stro min' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('caps a long swipe at 3 by default and honours swipeMax', () => {
    setup()
    const swipe = () => {
      const row = screen.getByRole('button', { name: 'Hooi min' }).parentElement!.parentElement!
      fireEvent.pointerDown(row, { pointerId: 1, clientX: 10, clientY: 10 })
      fireEvent.pointerMove(row, { pointerId: 1, clientX: 300, clientY: 12 })
      fireEvent.pointerUp(row, { pointerId: 1, clientX: 300, clientY: 12 })
    }
    swipe()
    expect(screen.getByText('−3 balen')).toBeTruthy()
    cleanup()
    setup({
      ...data,
      feeds: new Map([...data.feeds, ['hooi', { ...data.feeds.get('hooi')!, swipeMax: 30 }]]),
      items: new Map([item('stal', 'hooi', 50)]),
    })
    swipe()
    expect(screen.getByText('−30 balen')).toBeTruthy()
  })

  it('shows "Geen voorraad" when swiping right on a feed without stock', () => {
    setup()
    const row = screen.getByRole('button', { name: 'Stro min' }).parentElement!.parentElement!
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(screen.getAllByText('Geen voorraad')).toHaveLength(2)
    expect(screen.queryByText('−1')).toBeNull()
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(screen.getAllByText('Geen voorraad')).toHaveLength(1)
    expect(screen.queryByRole('list', { name: 'Gekozen voer' })).toBeNull()
  })

  it('only allows adding in the storage search list', () => {
    setup()
    click('Geitenkorrel min')
    click('Ton roze min')
    const picker = screen.getByRole('list', { name: 'Opslagen' })
    expect(within(picker).queryByRole('button', { name: /min$/ })).toBeNull()
    expect(within(picker).getByText('Kalverstal')).toBeTruthy()
    const row = within(picker).getByRole('button', { name: 'Kalverstal plus' }).parentElement!.parentElement!
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(within(picker).queryByText('−1')).toBeNull()
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 100, clientY: 12 })
    expect(screen.getByLabelText('Zoek opslag')).toBeTruthy()
    expect(within(picker).queryByText(/^\+\d/)).toBeNull()
    expect(screen.getByRole('list', { name: 'Gekozen voer' })).toBeTruthy()
  })

  it('filters rows while typing', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Zoeken…'), { target: { value: 'st' } })
    const items = within(screen.getByRole('list', { name: 'Voerlijst' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('Stro')
  })
})
