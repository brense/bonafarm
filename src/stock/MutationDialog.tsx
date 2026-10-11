import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Collapse,
  Dialog,
  IconButton,
  List,
  ListItem,
  Paper,
  Snackbar,
  Stack,
  useMediaQuery,
  useTheme,
  Toolbar,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { useOrg } from '../org/useOrg.ts'
import { useOrgData } from '../org/useOrgData.ts'
import type { Feed } from '../model/types.ts'
import { applyMutations, planChangeLine, type Change } from './mutations.ts'
import { FeedRow } from './FeedRow.tsx'
import { SearchList } from './SearchList.tsx'
import { formatAmount, unitLabel } from './stock.ts'
import { useRecentLogs } from './useRecentLogs.ts'

interface Props {
  open: boolean
  onClose: () => void
  onDone: (message: string) => void
}

/** An amount allocated to a storage; `null` means consumed (verbruik). */
interface Alloc {
  storageId: string | null
  amount: number
}

const round2 = (n: number) => Math.round(n * 100) / 100
const sumOf = (list: Alloc[]) => round2(list.reduce((sum, a) => sum + a.amount, 0))

/** Keeps allocations in order, trimming the last ones when the amount shrinks. */
function fitAllocs(list: Alloc[], amount: number): Alloc[] {
  let rest = amount
  const out: Alloc[] = []
  for (const a of list) {
    const take = round2(Math.min(a.amount, rest))
    if (take > 0) out.push({ storageId: a.storageId, amount: take })
    rest = round2(rest - take)
  }
  return out
}

/** Changes one row's allocation by `delta`, capped by the row's own limit and the line total. */
function adjustAlloc(list: Alloc[], key: string | null, delta: number, cap: number, total: number): Alloc[] {
  const current = list.find((a) => a.storageId === key)?.amount ?? 0
  const others = round2(sumOf(list) - current)
  const next = round2(Math.max(0, Math.min(current + delta, cap, total - others)))
  if (next === current) return list
  if (next <= 0) return list.filter((a) => a.storageId !== key)
  return current > 0 ? list.map((a) => (a.storageId === key ? { storageId: key, amount: next } : a)) : [...list, { storageId: key, amount: next }]
}

/** Walks sources and targets in order, splitting amounts, so every pair has one from and one to. */
function pairAllocs(feedId: string, sources: Alloc[], targets: Alloc[]): Change[] {
  const out: Change[] = []
  let j = 0
  let targetLeft = targets[0]?.amount ?? 0
  for (const src of sources) {
    let srcLeft = src.amount
    while (srcLeft > 0 && j < targets.length) {
      const take = round2(Math.min(srcLeft, targetLeft))
      out.push({ feedId, amount: take, fromStorageId: src.storageId, toStorageId: targets[j].storageId })
      srcLeft = round2(srcLeft - take)
      targetLeft = round2(targetLeft - take)
      if (targetLeft <= 0) {
        j += 1
        targetLeft = targets[j]?.amount ?? 0
      }
    }
  }
  return out
}

/** Stable ids so a line keeps its DOM node when it moves from "in progress" to the cart. */
let nextLineId = 0

/** One storage change in the cart; `closing` rows are folding away after their amount reached zero. */
interface CartRow extends Change {
  id: number
  closing?: boolean
}

const sameChange = (a: Change, b: Change) =>
  a.feedId === b.feedId && a.fromStorageId === b.fromStorageId && a.toStorageId === b.toStorageId

interface Line {
  id: number
  feedId: string
  direction: 'out' | 'in'
  amount: number
  /** Where a minus line takes it from; empty for plus. */
  sources: Alloc[]
  /** Where it goes (null storage = verbruik). */
  targets: Alloc[]
}

/**
 * "Wijziging maken": search a feed, tap min (taken out) or plus (put in), then
 * pick where it came from / went to on the same screen. "Nog een" keeps the
 * line and starts the next; everything is written as one batch.
 */
export default function MutationDialog({ open, onClose, onDone }: Props) {
  const { user } = useAuth()
  const { orgId } = useOrg()
  const { feeds, storages, storageTypes, items } = useOrgData()
  const recent = useRecentLogs(orgId, 12, open)
  const [search, setSearch] = useState('')
  const [line, setLine] = useState<Line | null>(null)
  const [cart, setCart] = useState<CartRow[]>([])
  const [notice, setNotice] = useState<{ id: number; text: string; severity: 'success' | 'warning'; open: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [storageQuery, setStorageQuery] = useState('')
  const [reopen, setReopen] = useState<'from' | 'to' | null>(null)
  const cartRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = cartRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [cart, line, reopen])
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'))
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const motion = reduceMotion ? 0 : 450

  const isCounted = (storageId: string) => {
    const s = storages.get(storageId)
    return s !== undefined && storageTypes.get(s.typeId)?.behaviour === 'counted'
  }
  const isConsumed = (storageId: string) => {
    const s = storages.get(storageId)
    return s !== undefined && storageTypes.get(s.typeId)?.behaviour === 'consumed'
  }
  const activeStorages = () =>
    [...storages.entries()].filter(([, s]) => s.status === 'active').sort((a, b) => a[1].order - b[1].order)
  const stockOf = (storageId: string, feedId: string) => items.get(`${storageId}_${feedId}`)?.amount ?? 0

  /** Active counted storages that hold the feed, most first. */
  const holdersOf = (feedId: string): string[] =>
    activeStorages()
      .filter(([id]) => isCounted(id) && stockOf(id, feedId) > 0)
      .sort((a, b) => stockOf(b[0], feedId) - stockOf(a[0], feedId) || a[1].order - b[1].order)
      .map(([id]) => id)

  /** The feed's linked shute, when it has an active one. */
  const linkedShute = (feedId: string): string | null => {
    const def = feeds.get(feedId)?.defaultStorageId
    return def !== undefined && storages.get(def)?.status === 'active' && isConsumed(def) ? def : null
  }

  const newLine = (feedId: string, direction: 'out' | 'in'): Line => ({
    id: ++nextLineId,
    feedId,
    direction,
    amount: 1,
    sources: [],
    targets: [],
  })

  /** Stock of a feed across active counted storages. */
  const totalOf = (feedId: string) =>
    round2(activeStorages().reduce((sum, [id]) => sum + (isCounted(id) ? stockOf(id, feedId) : 0), 0))

  /** Counted stock under a feed's name; shute feeds without counted stock show nothing. */
  const stockText = (feedId: string, unit: Feed['unit']) => {
    const total = totalOf(feedId)
    if (total > 0) return `${formatAmount(total)} ${unitLabel(unit, total)}`
    return linkedShute(feedId) ? undefined : 'Geen voorraad'
  }

  /** Moves a line into the cart once; a late `onExited` or a second caller cannot push it twice. */
  const committedId = useRef<number | null>(null)
  const commit = (l: Line) => {
    if (committedId.current === l.id) return
    committedId.current = l.id
    const changes = toChanges(l)
    setCart((prev) => {
      const next = [...prev]
      for (const ch of changes) {
        const i = next.findIndex((r) => !r.closing && sameChange(r, ch))
        if (i >= 0) next[i] = { ...next[i], amount: round2(next[i].amount + ch.amount) }
        else next.push({ ...ch, id: ++nextLineId })
      }
      return next
    })
    notify('Wijziging toegevoegd', 'success')
  }

  const notify = (text: string, severity: 'success' | 'warning') => setNotice({ id: ++nextLineId, text, severity, open: true })

  const liveRows = cart.filter((r) => !r.closing)

  /** Most a cart row drawing from a storage may take: its stock minus other rows and the line in progress. */
  const rowCap = (row: CartRow) => {
    if (row.fromStorageId === null) return Infinity
    const others = liveRows.filter((r) => r.id !== row.id && r.fromStorageId === row.fromStorageId && r.feedId === row.feedId).reduce((sum, r) => sum + r.amount, 0)
    const drawn = line && line.feedId === row.feedId ? line.sources.filter((src) => src.storageId === row.fromStorageId).reduce((sum, src) => sum + src.amount, 0) : 0
    return Math.max(0, round2(stockOf(row.fromStorageId, row.feedId) - others - drawn))
  }

  /** `delta` > 0 is plus: for rows taking from a storage that lowers the amount, for plain plus rows it raises it. */
  const changeRow = (id: number, delta: number) => {
    const row = cart.find((r) => r.id === id)
    if (!row || row.closing) return
    const next = round2(row.amount + (row.fromStorageId ? -delta : delta))
    if (next <= 0) {
      setCart(cart.map((r) => (r.id === id ? { ...r, closing: true } : r)))
      notify('Wijziging weggehaald', 'warning')
      return
    }
    setCart(cart.map((r) => (r.id === id ? { ...r, amount: Math.min(next, rowCap(row)) } : r)))
  }
  const removeRow = (id: number) => setCart((prev) => prev.filter((r) => r.id !== id))

  const tap = (feedId: string, direction: 'out' | 'in', by = 1) => {
    const cap = direction === 'out' ? totalOf(feedId) : Infinity
    if (cap <= 0) return
    if (line && line.feedId === feedId && line.direction === direction) {
      const amount = round2(Math.min(cap, line.amount + by))
      setLine({ ...line, amount, sources: fitAllocs(line.sources, amount), targets: fitAllocs(line.targets, amount) })
    } else {
      if (line && lineComplete) commit(line)
      setLine({ ...newLine(feedId, direction), amount: round2(Math.min(cap, by)) })
      setStorageQuery('')
      setReopen(null)
    }
  }

  const usage = useMemo(() => {
    const sums = new Map<string, number>()
    for (const l of recent ?? []) {
      if (l.type === 'dispense' || l.type === 'fill') sums.set(l.feedId, (sums.get(l.feedId) ?? 0) + l.amount)
    }
    return sums
  }, [recent])

  const visibleFeeds = useMemo(
    () => [...feeds.entries()].filter(([, f]) => !f.hidden).map(([id, f]) => ({ id, ...f })).sort((a, b) => a.order - b.order),
    [feeds],
  )

  const rows = useMemo(
    () => [...visibleFeeds].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order),
    [visibleFeeds, usage],
  )

  const lineComplete =
    line !== null && sumOf(line.targets) === line.amount && (line.direction === 'in' || sumOf(line.sources) === line.amount)

  const toChanges = (l: Line): Change[] =>
    pairAllocs(l.feedId, l.direction === 'in' ? [{ storageId: null, amount: l.amount }] : l.sources, l.targets)

  const pendingChanges = line && lineComplete ? toChanges(line) : []
  const count = liveRows.length + pendingChanges.length
  const cartCount = count
  const saveDisabled = count === 0 || (line !== null && !lineComplete)

  const storageName = (id: string | null) => (id ? (storages.get(id)?.name ?? id) : '')
  const amountText = (feedId: string, direction: 'out' | 'in', amount: number) => {
    const unit = feeds.get(feedId)?.unit ?? 'zak'
    return `${direction === 'out' ? '−' : '+'}${formatAmount(amount)} ${unitLabel(unit, amount)}`
  }
  const allocText = (list: Alloc[]) =>
    list.map((a) => `${a.storageId === null ? 'verbruik' : storageName(a.storageId)} ${formatAmount(a.amount)}`).join(', ')
  const reset = () => {
    setSearch('')
    setLine(null)
    setStorageQuery('')
    setReopen(null)
    setCart([])
    setNotice(null)
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const cancelLine = () => {
    setLine(null)
    setStorageQuery('')
    setReopen(null)
  }

  /** Called when the editable block has folded away after the last answer: the line joins the cart. */
  const finishLine = () => {
    if (!line || !lineComplete) return
    commit(line)
    setLine(null)
    setStorageQuery('')
    setReopen(null)
    setSearch('')
  }

  const save = () => {
    if (!orgId || !user) return
    const changes: Change[] = [...liveRows.map(({ feedId, amount, fromStorageId, toStorageId }) => ({ feedId, amount, fromStorageId, toStorageId })), ...pendingChanges]
    if (changes.length === 0) return
    const ctx = {
      orgId,
      uid: user.uid,
      counted: isCounted,
      current: stockOf,
      newId: () => crypto.randomUUID().slice(0, 8),
    }
    try {
      const plans = changes.flatMap((c) => planChangeLine(c, ctx))
      applyMutations(plans).catch((err: { code?: string }) => onDone(`Niet opgeslagen (${err.code ?? 'fout'})`))
      onDone(`${changes.length} ${changes.length === 1 ? 'wijziging' : 'wijzigingen'} opgeslagen`)
      close()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const feed = line ? feeds.get(line.feedId) : undefined

  const changeSource = (id: string | null, delta: number) => {
    if (!line || id === null) return
    const sources = adjustAlloc(line.sources, id, delta, stockOf(id, line.feedId), line.amount)
    const targets = delta > 0 ? line.targets.filter((t) => t.storageId !== id) : line.targets
    setLine({ ...line, sources, targets })
  }
  const changeTarget = (id: string | null, delta: number) => {
    if (!line) return
    setLine({ ...line, targets: adjustAlloc(line.targets, id, delta, Infinity, line.amount) })
  }

  const sectionBox = { border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }
  const sectionTitle = (text: string) => (
    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
      {text}
    </Typography>
  )

  /** How much of the line's feed a storage holds, as a small second line. */
  const holdsText = (id: string | null) => {
    const held = id && line ? stockOf(id, line.feedId) : 0
    const unit = line ? feeds.get(line.feedId)?.unit : undefined
    return held > 0 && unit ? `${formatAmount(held)} ${unitLabel(unit, held)}` : undefined
  }

  type Row = { id: string | null; name: string; badge?: string; secondary?: string }

  const allocRow = (r: Row, list: Alloc[], capOf: (id: string | null) => number, onChange: (id: string | null, delta: number) => void, mode: 'minus' | 'plus', bare = false) => {
    const a = list.find((x) => x.storageId === r.id)?.amount ?? 0
    const room = Math.max(0, round2(Math.min(capOf(r.id), (line?.amount ?? 0) - sumOf(list) + a) - a))
    return (
      <FeedRow
        key={r.id ?? 'verbruik'}
        bare={bare}
        surface={bare ? 'var(--row-surface)' : undefined}
        name={r.name}
        badge={r.badge}
        secondary={r.secondary}
        active={a > 0}
        gesture={mode}
        swipeMax={feed?.swipeMax}
        maxMinus={mode === 'minus' ? room : undefined}
        maxPlus={mode === 'plus' ? room : undefined}
        onClear={a > 0 ? () => onChange(r.id, -1e9) : undefined}
        detail={
          a > 0 && feed
            ? { text: `${mode === 'minus' ? '−' : '+'}${formatAmount(a)} ${unitLabel(feed.unit, a)}`, color: mode === 'minus' ? 'error.main' : 'success.main' }
            : undefined
        }
        onSwipe={(signed) => onChange(r.id, Math.abs(signed))}
        onMinus={() => onChange(r.id, 1)}
        onPlus={() => onChange(r.id, 1)}
      />
    )
  }

  const allocRows = (label: string, rows: Row[], list: Alloc[], capOf: (id: string | null) => number, onChange: (id: string | null, delta: number) => void, mode: 'minus' | 'plus') => (
    <List aria-label={label} disablePadding>
      {rows.map((r) => allocRow(r, list, capOf, onChange, mode))}
    </List>
  )

  /** One card: allocated rows first (always visible), then the suggestions, then the other storages. */
  const targetBox = (title: string, baseRows: Row[]) => {
    if (!line) return null
    const badgeOf = (id: string | null): Row => {
      const st = id ? storages.get(id) : undefined
      return { id, name: id === null ? 'Verbruik' : storageName(id), badge: st ? storageTypes.get(st.typeId)?.name : undefined, secondary: holdsText(id) }
    }
    const allocated = line.targets.map((t) => badgeOf(t.storageId))
    const used = new Set<string | null>(allocated.map((r) => r.id))
    const base = baseRows.filter((r) => !used.has(r.id))
    base.forEach((r) => used.add(r.id))
    const rest = activeStorages()
      .filter(([id]) => !used.has(id) && !line.sources.some((src) => src.storageId === id))
      .map(([id]) => badgeOf(id))
    const items = [...allocated, ...base, ...rest]
    const change = (id: string | null, delta: number) => {
      changeTarget(id, delta)
      if (delta > 0) setStorageQuery('')
    }
    return (
      <Box>
        {sectionTitle(title)}
        <SearchList
          items={items}
          getKey={(o) => o.id ?? 'verbruik'}
          getLabel={(o) => o.name}
          isPinned={(o) => line.targets.some((t) => t.storageId === o.id)}
          searchLabel="Zoek opslag"
          listAriaLabel="Opslagen"
          emptyText="Geen opslagen"
          query={storageQuery}
          onQueryChange={setStorageQuery}
          renderRow={(o) => allocRow(o, line.targets, () => Infinity, change, 'plus', true)}
        />
      </Box>
    )
  }

  /** Answered questions collapse into summaries inside the cart; the open question goes below it. */
  const chooser = ((): { summaries: React.ReactNode; question: React.ReactNode } => {
    if (!line || !feed) return { summaries: null, question: null }
    if (line.direction === 'in') {
      const linked = linkedShute(line.feedId)
      const base = [...(linked ? [linked] : []), ...holdersOf(line.feedId).filter((id) => id !== linked)].map((id) => ({ id, name: storageName(id) }))
      return { summaries: null, question: targetBox('In welke opslag?', base) }
    }
    const fromDone = sumOf(line.sources) === line.amount
    const showFrom = reopen === 'from' || !fromDone
    const showTo = !showFrom
    const summary = (text: string, which: 'from') => (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider' }}>
        <Typography>{text}</Typography>
        <Button onClick={() => setReopen(which)} sx={{ minHeight: 48 }}>
          Wijzig
        </Button>
      </Box>
    )
    const linked = linkedShute(line.feedId)
    return {
      summaries: (
        <>
          {!showFrom && summary(`Van: ${allocText(line.sources)}`, 'from')}
        </>
      ),
      question: showFrom ? (
        <Box sx={sectionBox}>
          {sectionTitle(Math.max(0, ...holdersOf(line.feedId).map((id) => stockOf(id, line.feedId))) < line.amount ? 'Uit welke opslagen?' : 'Uit welke opslag?')}
          {allocRows('Uit welke opslag?', holdersOf(line.feedId).map((id) => ({ id, name: storageName(id), secondary: holdsText(id) })), line.sources, (id) => (id ? stockOf(id, line.feedId) : 0), changeSource, 'minus')}
          {fromDone && (
            <Button onClick={() => setReopen(null)} sx={{ minHeight: 48, mt: 0.5 }}>
              Klaar
            </Button>
          )}
        </Box>
      ) : showTo ? (
        targetBox(
          `Waar is de ${feed.unit} naartoe?`,
          [{ id: null, name: 'Verbruik' }, ...(linked ? [{ id: linked, name: storageName(linked) }] : [])],
        )
      ) : null,
    }
  })()

  return (
    <Dialog open={open} onClose={close} fullScreen slotProps={{ paper: { sx: { bgcolor: 'background.default', backgroundImage: 'none', display: 'flex', flexDirection: 'column', height: '100dvh' } } }}>
      <AppBar position="static" color="default" enableColorOnDark>
        <Toolbar>
          <IconButton edge="start" aria-label="Sluiten" onClick={close}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, ml: 1 }}>
            Wijzigingen
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2, pt: 2, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {sectionTitle(cartCount === 0 ? 'Nog geen wijzigingen' : `${cartCount} ${cartCount === 1 ? 'wijziging' : 'wijzigingen'}`)}
        <Box ref={cartRef} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
          {cart.length === 0 && !line ? null : (
            <List dense disablePadding aria-label="Wijzigingen">
              {cart.map((r) => {
                const f = feeds.get(r.feedId)
                const from = r.fromStorageId !== null
                const room = from ? Math.max(0, round2(rowCap(r) - r.amount)) : Infinity
                return (
                  <ListItem key={r.id} divider disablePadding sx={{ display: 'block' }}>
                    <Collapse in={!r.closing} appear unmountOnExit timeout={motion} onExited={() => removeRow(r.id)}>
                      <FeedRow
                        bare
                        surface="background.default"
                        name={f?.name ?? r.feedId}
                        secondary={from ? `${storageName(r.fromStorageId)} → ${r.toStorageId === null ? 'Verbruik' : storageName(r.toStorageId)}` : storageName(r.toStorageId)}
                        active
                        swipeMax={f?.swipeMax}
                        minusDisabled={from && room <= 0}
                        maxMinus={from ? room : r.amount}
                        maxPlus={from ? r.amount : undefined}
                        detail={{ text: amountText(r.feedId, from ? 'out' : 'in', r.amount), color: from ? 'error.main' : 'success.main' }}
                        onSwipe={(signed) => changeRow(r.id, signed)}
                        onMinus={() => changeRow(r.id, -1)}
                        onPlus={() => changeRow(r.id, 1)}
                      />
                    </Collapse>
                  </ListItem>
                )
              })}
              {line && feed ? (
                <ListItem key={line.id} divider disablePadding sx={{ display: 'block' }}>
                  <Collapse in={!lineComplete} unmountOnExit timeout={motion} onExited={finishLine}>
                    <Box sx={{ p: 1 }}>
                      <Stack direction="row" sx={{ alignItems: 'center' }}>
                        <List aria-label="Gekozen voer" disablePadding sx={{ flex: '1 1 auto', minWidth: 0 }}>
                          <FeedRow
                            name={feed.name}
                            active
                            swipeMax={feed.swipeMax}
                            maxMinus={line.direction === 'out' ? Math.max(0, round2(totalOf(line.feedId) - line.amount)) : totalOf(line.feedId)}
                            emptyLabel="Geen voorraad"
                            detail={{ text: amountText(line.feedId, line.direction, line.amount), color: line.direction === 'out' ? 'error.main' : 'success.main' }}
                            onSwipe={(signed) => tap(line.feedId, signed < 0 ? 'out' : 'in', Math.abs(signed))}
                            onMinus={() => tap(line.feedId, 'out')}
                            onPlus={() => tap(line.feedId, 'in')}
                          />
                        </List>
                        <IconButton aria-label="Regel annuleren" onClick={cancelLine} sx={{ width: 48, height: 48, ml: 0.5 }}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                      {line.direction === 'out' && line.amount >= totalOf(line.feedId) && (
                        <Typography variant="caption" color="text.secondary">
                          Er ligt maar {formatAmount(totalOf(line.feedId))} {unitLabel(feed.unit, totalOf(line.feedId))}
                        </Typography>
                      )}
                      {chooser.summaries}
                    </Box>
                  </Collapse>
                </ListItem>
              ) : null}
            </List>
          )}
        </Box>
      </Box>

      <Box sx={{ px: 2, flex: '0 0 auto' }}>
        <Collapse in={!line || lineComplete} unmountOnExit timeout={motion}>
          <Box sx={{ py: 1 }}>
            {sectionTitle(cartCount === 0 ? 'Welke voorraad wil je wijzigen?' : 'Nog een voorraad wijzigen?')}
            <SearchList
              items={rows}
              getKey={(f) => f.id}
              getLabel={(f) => f.name}
              searchLabel="Zoeken…"
              listAriaLabel="Voerlijst"
              emptyText="Geen voer gevonden"
              query={search}
              onQueryChange={setSearch}
              renderRow={(f) => (
                <FeedRow
                  bare
                  surface="var(--row-surface)"
                  name={f.name}
                  active={false}
                  swipeMax={f.swipeMax}
                  secondary={stockText(f.id, f.unit)}
                  minusDisabled={totalOf(f.id) <= 0}
                  maxMinus={totalOf(f.id)}
                  emptyLabel="Geen voorraad"
                  onSwipe={(signed) => tap(f.id, signed < 0 ? 'out' : 'in', Math.abs(signed))}
                  onMinus={() => tap(f.id, 'out')}
                  onPlus={() => tap(f.id, 'in')}
                />
              )}
            />
          </Box>
        </Collapse>
        <Collapse in={line !== null && !lineComplete} unmountOnExit timeout={motion}>
          <Box sx={{ py: 1 }}>{chooser.question}</Box>
        </Collapse>
        {error && (
          <Typography color="error" sx={{ py: 1 }}>
            {error}
          </Typography>
        )}
      </Box>

      <Snackbar
        key={notice?.id}
        open={notice?.open ?? false}
        autoHideDuration={2000}
        onClose={(_, reason) => reason !== 'clickaway' && setNotice((n) => n && { ...n, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 'calc(88px + env(safe-area-inset-bottom))', sm: 'calc(88px + env(safe-area-inset-bottom))' } }}
      >
        <Alert severity={notice?.severity ?? 'success'} variant="filled" sx={{ width: '100%' }}>
          {notice?.text}
        </Alert>
      </Snackbar>

      <Paper square elevation={8} sx={{ flex: '0 0 auto', p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button variant="text" size="medium" color="secondary" sx={{ height: 40 }} onClick={close}>
            Annuleren
          </Button>
          {wide ? (
            <Button variant="contained" size="medium" startIcon={<SaveIcon />} sx={{ height: 40 }} disabled={saveDisabled} onClick={save}>
              Opslaan
            </Button>
          ) : (
            <Button variant="contained" aria-label="Opslaan" sx={{ width: 40, height: 40, minWidth: 40, p: 0 }} disabled={saveDisabled} onClick={save}>
              <SaveIcon />
            </Button>
          )}
        </Stack>
      </Paper>
    </Dialog>
  )
}
