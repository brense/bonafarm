import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/context.ts'
import { OrgContext } from '../org/context.ts'
import { OrgDataContext, type OrgDataValue } from '../org/dataContext.ts'
import type { Feed, Item, Storage, StorageType } from '../model/types.ts'
import MutationDialog from './MutationDialog.tsx'
import type { MutationPreset } from './mutationDialogContext.ts'
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

// Collapse transitions run on real timers; keep slow runs from tripping the default timeouts.
vi.setConfig({ testTimeout: 20000 })

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

function setup(value: OrgDataValue = data, preset?: MutationPreset) {
  const onDone = vi.fn()
  const onClose = vi.fn()
  render(
    <OrgContext.Provider value={{ orgId: 'test', roles: ['feed'], status: 'ready' }}>
      <AuthContext.Provider value={{ user: { uid: 'u1' } as never, loading: false, signOut: async () => {} }}>
        <OrgDataContext.Provider value={value}>
          <MutationDialog open onClose={onClose} onDone={onDone} preset={preset} />
        </OrgDataContext.Provider>
      </AuthContext.Provider>
    </OrgContext.Provider>,
  )
  return { onDone, onClose }
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
/** The compact sub row of a storage in the cart list. */
const subRow = (name: string) => within(within(screen.getByRole('list', { name: 'Wijzigingen' })).getByText(name).parentElement!.parentElement!.parentElement!.parentElement!)
/** The answered cards fold away and the line joins the cart. */
const lineCommitted = () => waitFor(() => expect(screen.queryAllByRole('button', { name: /^Terug naar:/ })).toHaveLength(0), { timeout: 4000 })

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
    // The feed choice is an answered card now; the cart stays empty until the line is complete.
    expect(screen.getByText('Nog geen wijzigingen')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Wijzigingen' })).toBeNull()
    const feedCard = screen.getByRole('button', { name: 'Terug naar: Welke voorraad wil je wijzigen?' })
    expect(within(feedCard).getByText('Geitenkorrel')).toBeTruthy()
    expect(within(feedCard).getByText('−1 zak')).toBeTruthy()
    const card = screen.getByRole('button', { name: 'Terug naar: Uit welke opslag?' })
    expect(within(card).getByText('Ton roze')).toBeTruthy()
    expect(within(card).getByText('−1 zak')).toBeTruthy()
    expect(screen.getByText('Waar is de zak naartoe?')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Uit welke opslag?' })).toBeNull(), { timeout: 4000 })
    // Step back to the feed question: the row with its buttons, cancel and Klaar.
    fireEvent.click(feedCard)
    const chosen = await screen.findByRole('list', { name: 'Gekozen voer' })
    expect(within(chosen).getByRole('button', { name: 'Geitenkorrel plus' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Regel annuleren' })).toBeTruthy()
    click('Klaar')
    await screen.findByRole('list', { name: 'Opslagen' })
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Gekozen voer' })).toBeNull(), { timeout: 4000 })
    // Step back to the first question: its list returns and the second question goes.
    fireEvent.click(await screen.findByRole('button', { name: 'Terug naar: Uit welke opslag?' }))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Opslagen' })).toBeNull(), { timeout: 4000 })
    expect(screen.getByRole('list', { name: 'Uit welke opslag?' })).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Terug naar: Uit welke opslag?' })).toBeNull(), { timeout: 4000 })
    // Finish it again: the second question comes back.
    click('Klaar')
    const to = await screen.findByRole('list', { name: 'Opslagen' })
    expect(within(to).getAllByRole('listitem')).toHaveLength(3)
    expect(within(to).getAllByRole('listitem')[0].textContent).toContain('Verbruik')
    fireEvent.click(within(to).getByRole('button', { name: 'Koker geit plus' }))
    await lineCommitted()
    const row = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(row.getByText('Geitenkorrel')).toBeTruthy()
    expect(row.getAllByText('−1 zak')).toHaveLength(1)
    expect(subRow('Ton roze').getByText('−1 zak')).toBeTruthy()
    expect(subRow('Koker geit').getByText('+1 zak')).toBeTruthy()
    expect(row.getByRole('button', { name: 'Wijziging weghalen' })).toBeTruthy()
    expect(row.queryByRole('button', { name: /(min|plus)$/ })).toBeNull()
    expect(screen.getByText('1 wijziging')).toBeTruthy()
    expect(screen.getByLabelText('Zoeken…')).toBeTruthy()
    expect(screen.getByText('Nog een voorraad wijzigen?')).toBeTruthy()
    expect(screen.queryByText('Waar is de zak naartoe?')).toBeNull()
    expect((screen.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('swaps the first question for the second with a transition', async () => {
    setup()
    click('Geitenkorrel min')
    expect(screen.getByRole('list', { name: 'Uit welke opslag?' })).toBeTruthy()
    click('Ton roze min')
    expect(screen.getByRole('list', { name: 'Opslagen' })).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Uit welke opslag?' })).toBeNull(), { timeout: 4000 })
    expect(screen.getByRole('list', { name: 'Opslagen' })).toBeTruthy()
    expect(screen.getByText('Waar is de zak naartoe?')).toBeTruthy()
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
    expect(subRow('Kalverstal').getByText('+1 zak')).toBeTruthy()
  })

  it('commits a completed plus line into the cart', async () => {
    setup()
    click('Hooi plus')
    click('Kalverstal plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('Hooi')).toBeTruthy()
    expect(subRow('Kalverstal').getByText('+1 baal')).toBeTruthy()
    expect(subRow('Kalverstal').getByRole('button', { name: 'Kalverstal plus' })).toBeTruthy()
    expect(cart.queryByRole('button', { name: 'Wijziging weghalen' })).toBeNull()
    expect(cart.queryByRole('button', { name: 'Hooi plus' })).toBeNull()
    expect(screen.getByText('1 wijziging')).toBeTruthy()
    expect(screen.getByText('Wijziging toegevoegd')).toBeTruthy()
    expect(screen.getByLabelText('Zoeken…')).toBeTruthy()
  })

  it('shows a multi-target plus line with sub items and lets each target be edited', async () => {
    setup({ ...data, storages: new Map([...data.storages, ['paard', storage('stable', 'Paardenstal', 4)]]) })
    click('Hooi plus')
    for (let n = 0; n < 4; n++) click('Hooi plus')
    click('Paardenstal plus')
    click('Paardenstal plus')
    click('Kalverstal plus')
    click('Kalverstal plus')
    click('Kalverstal plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('Hooi')).toBeTruthy()
    expect(cart.queryByText('+5 balen')).toBeNull()
    expect(subRow('Paardenstal').getByText('+2 balen')).toBeTruthy()
    expect(subRow('Kalverstal').getByText('+3 balen')).toBeTruthy()
    expect(screen.getByText('1 wijziging')).toBeTruthy()
    fireEvent.click(cart.getByRole('button', { name: 'Kalverstal plus' }))
    expect(subRow('Kalverstal').getByText('+4 balen')).toBeTruthy()
    expect(cart.queryByText('+6 balen')).toBeNull()
    // A long minus swipe is capped at the sub item's own amount (2, not 3): it folds out, the line stays with the other target.
    const sub = cart.getByRole('button', { name: 'Paardenstal min' }).parentElement!.parentElement!
    fireEvent.pointerDown(sub, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(sub, { pointerId: 1, clientX: 300, clientY: 12 })
    expect(cart.getByText('−2')).toBeTruthy()
    fireEvent.pointerUp(sub, { pointerId: 1, clientX: 300, clientY: 12 })
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Wijzigingen' })).queryByText('Paardenstal')).toBeNull(), { timeout: 4000 })
    expect(screen.getByText('Wijziging weggehaald')).toBeTruthy()
    expect(screen.getAllByText('+4 balen')).toHaveLength(1)
  })

  it('edits a single-target plus line and removes it at zero', async () => {
    setup()
    click('Hooi plus')
    click('Kalverstal plus')
    await lineCommitted()
    const cart = () => within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart().queryByRole('button', { name: /^Hooi (min|plus)$/ })).toBeNull()
    expect(cart().queryByRole('button', { name: 'Wijziging weghalen' })).toBeNull()
    fireEvent.click(cart().getByRole('button', { name: 'Kalverstal plus' }))
    expect(cart().getAllByText('+2 balen')).toHaveLength(1)
    fireEvent.click(cart().getByRole('button', { name: 'Kalverstal min' }))
    fireEvent.click(cart().getByRole('button', { name: 'Kalverstal min' }))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Wijzigingen' })).toBeNull(), { timeout: 4000 })
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
    expect(subRow('Verbruik').getByText('+1 zak')).toBeTruthy()
    expect(cart.queryByRole('button', { name: /(min|plus)$/ })).toBeNull()
    fireEvent.click(cart.getByRole('button', { name: 'Wijziging weghalen' }))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Wijzigingen' })).toBeNull(), { timeout: 4000 })
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
    click('Grasbrok min')
    click('Overige min')
    click('Overige min')
    click('Verbruik plus')
    click('Ton blauw plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.getByText('Grasbrok')).toBeTruthy()
    expect(cart.getAllByText('−2 zakken')).toHaveLength(1)
    expect(subRow('Overige').getByText('−2 zakken')).toBeTruthy()
    expect(subRow('Verbruik').getByText('+1 zak')).toBeTruthy()
    expect(subRow('Ton blauw').getByText('+1 zak')).toBeTruthy()
    expect(cart.getAllByRole('listitem').length).toBeGreaterThan(0)
    click('Opslaan')
    const plans = vi.mocked(applyMutations).mock.calls.at(-1)![0]
    expect(plans.map((p) => `${p.log.type}:${p.log.storageId}:${p.log.amount}`)).toEqual(['dispense:over:1', 'move:over:1', 'move:blauw:1'])
  })

  it('lists several sources as sub items without a main storage', async () => {
    setup(grasData())
    click('Grasbrok min')
    click('Grasbrok min')
    click('Overige min')
    click('Ton roze min')
    click('Verbruik plus')
    click('Verbruik plus')
    await lineCommitted()
    const cart = within(screen.getByRole('list', { name: 'Wijzigingen' }))
    expect(cart.queryByText('−2 zakken')).toBeNull()
    expect(subRow('Overige').getByText('−1 zak')).toBeTruthy()
    expect(subRow('Ton roze').getByText('−1 zak')).toBeTruthy()
    expect(subRow('Verbruik').getByText('+2 zakken')).toBeTruthy()
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

  it('cancels the line in progress from the feed question', async () => {
    setup()
    click('Geitenkorrel min')
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar: Welke voorraad wil je wijzigen?' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Regel annuleren' }))
    await waitFor(() => expect(screen.getAllByRole('list', { name: 'Voerlijst' })).toHaveLength(1), { timeout: 4000 })
    expect(screen.queryByRole('button', { name: /^Terug naar:/ })).toBeNull()
  })

  it('picking another feed from the feed question starts a fresh pick', async () => {
    setup()
    click('Geitenkorrel min')
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar: Welke voorraad wil je wijzigen?' }))
    await screen.findByRole('list', { name: 'Gekozen voer' })
    const search = within(screen.getAllByRole('list', { name: 'Voerlijst' }).at(-1)!)
    fireEvent.click(search.getByRole('button', { name: 'Hooi min' }))
    const from = await screen.findByRole('list', { name: 'Uit welke opslag?' })
    expect(within(from).getByText('Kalverstal')).toBeTruthy()
    expect(within(screen.getByRole('button', { name: 'Terug naar: Welke voorraad wil je wijzigen?' })).getByText('Hooi')).toBeTruthy()
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
    click('Geitenkorrel min')
    click('Geitenkorrel min')
    expect(screen.getByText('−3 zakken')).toBeTruthy()
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
    expect(rows.queryByText('−3 zakken')).toBeNull()
    expect(subRow('Ton roze').getByText('−1 zak')).toBeTruthy()
    expect(subRow('Ton oranje').getByText('−2 zakken')).toBeTruthy()
    expect(subRow('Verbruik').getByText('+3 zakken')).toBeTruthy()
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
    expect(screen.getByRole('button', { name: 'Terug naar: Welke voorraad wil je wijzigen?' })).toBeTruthy()
  })

  it('filters rows while typing', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Zoeken…'), { target: { value: 'st' } })
    const items = within(screen.getByRole('list', { name: 'Voerlijst' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('Stro')
  })

  it('opens an out preset with the from question answered and asks where it went', () => {
    setup(data, { feedId: 'geit', direction: 'out', amount: 1, storageId: 'ton' })
    const from = screen.getByRole('button', { name: 'Terug naar: Uit welke opslag?' })
    expect(within(from).getByText('Ton roze')).toBeTruthy()
    expect(within(from).getByText('−1 zak')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Terug naar: Welke voorraad wil je wijzigen?' })).toBeTruthy()
    expect(screen.getByText('Waar is de zak naartoe?')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Uit welke opslag?' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('caps an out preset at the stock in its storage', () => {
    setup(data, { feedId: 'geit', direction: 'out', amount: 5, storageId: 'ton' })
    expect(within(screen.getByRole('button', { name: 'Terug naar: Uit welke opslag?' })).getByText('−3 zakken')).toBeTruthy()
  })

  it('opens an in preset as a finished, saveable line', () => {
    setup(data, { feedId: 'hooi', direction: 'in', amount: 1, storageId: 'stal' })
    expect(screen.getByText('1 wijziging')).toBeTruthy()
    expect(subRow('Kalverstal').getByText('+1 baal')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
