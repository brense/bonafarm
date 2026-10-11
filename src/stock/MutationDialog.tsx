import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
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

interface Line {
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
  const [lines, setLines] = useState<Line[]>([])
  const [error, setError] = useState<string | null>(null)
  const [storageQuery, setStorageQuery] = useState('')
  const [reopen, setReopen] = useState<'from' | 'to' | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const cartRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = cartRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, line, reopen])
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'))

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
    feedId,
    direction,
    amount: 1,
    sources: [],
    targets: [],
  })

  /** Stock of a feed across active counted storages. */
  const totalOf = (feedId: string) =>
    round2(activeStorages().reduce((sum, [id]) => sum + (isCounted(id) ? stockOf(id, feedId) : 0), 0))

  const tap = (feedId: string, direction: 'out' | 'in', by = 1) => {
    const cap = direction === 'out' ? totalOf(feedId) : Infinity
    if (cap <= 0) return
    if (line && line.feedId === feedId && line.direction === direction) {
      const amount = round2(Math.min(cap, line.amount + by))
      setLine({ ...line, amount, sources: fitAllocs(line.sources, amount), targets: fitAllocs(line.targets, amount) })
    } else {
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

  const count = lines.length + (line && lineComplete ? 1 : 0)

  const cartCount = lines.length + (line ? 1 : 0)
  const saveDisabled = count === 0 || (line !== null && !lineComplete)

  const storageName = (id: string | null) => (id ? (storages.get(id)?.name ?? id) : '')
  const amountText = (feedId: string, direction: 'out' | 'in', amount: number) => {
    const unit = feeds.get(feedId)?.unit ?? 'zak'
    return `${direction === 'out' ? '−' : '+'}${formatAmount(amount)} ${unitLabel(unit, amount)}`
  }
  const allocText = (list: Alloc[]) =>
    list.map((a) => `${a.storageId === null ? 'verbruik' : storageName(a.storageId)} ${formatAmount(a.amount)}`).join(', ')
  const describe = (l: Line) => {
    const head = `${feeds.get(l.feedId)?.name ?? l.feedId} ${amountText(l.feedId, l.direction, l.amount)}`
    const from = allocText(l.sources)
    return `${head} · ${from ? `${from} ` : ''}→ ${allocText(l.targets)}`
  }

  const reset = () => {
    setSearch('')
    setLine(null)
    setStorageQuery('')
    setReopen(null)
    setLines([])
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

  const another = () => {
    if (!line || !lineComplete) return
    setLines((prev) => [...prev, line])
    setLine(null)
    setStorageQuery('')
    setReopen(null)
    setSearch('')
  }

  const save = () => {
    if (!orgId || !user) return
    const all = line && lineComplete ? [...lines, line] : lines
    if (all.length === 0) return
    const changes = all.flatMap(toChanges)
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
      onDone(`${all.length} ${all.length === 1 ? 'wijziging' : 'wijzigingen'} opgeslagen`)
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

  const allocRows = (label: string, rows: { id: string | null; name: string }[], list: Alloc[], capOf: (id: string | null) => number, onChange: (id: string | null, delta: number) => void, mode: 'minus' | 'plus') => (
    <List aria-label={label} disablePadding>
      {rows.map((r) => {
        const a = list.find((x) => x.storageId === r.id)?.amount ?? 0
        const room = Math.max(0, round2(Math.min(capOf(r.id), (line?.amount ?? 0) - sumOf(list) + a) - a))
        return (
          <FeedRow
            key={r.id ?? 'verbruik'}
            name={r.name}
            active={a > 0}
            gesture={mode}
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
      })}
    </List>
  )

  /** Destination rows plus the "other storage" search. */
  const targetBox = (title: string, label: string, baseRows: { id: string | null; name: string }[], showDone = false) => {
    if (!line) return null
    const ids = new Set<string | null>(baseRows.map((r) => r.id))
    const extra = line.targets.filter((t) => !ids.has(t.storageId)).map((t) => ({ id: t.storageId, name: storageName(t.storageId) }))
    const rows = [...baseRows, ...extra]
    const shown = new Set(rows.map((r) => r.id))
    const options = activeStorages()
      .filter(([id]) => !shown.has(id) && !line.sources.some((src) => src.storageId === id))
      .map(([id, st]) => ({ id, name: st.name, type: storageTypes.get(st.typeId)?.name ?? '' }))
    return (
      <Box sx={sectionBox}>
        {sectionTitle(title)}
        {allocRows(label, rows, line.targets, () => Infinity, changeTarget, 'plus')}
        <SearchList
          items={options}
          getKey={(o) => o.id}
          getLabel={(o) => o.name}
          searchLabel="Zoek opslag"
          listAriaLabel="Opslagen"
          emptyText="Geen opslagen"
          query={storageQuery}
          onQueryChange={setStorageQuery}
          renderRow={(o) => (
            <FeedRow
              name={o.name}
              badge={o.type}
              active={false}
              gesture="plus"
              onSwipe={(signed) => {
                if (signed > 0) {
                  changeTarget(o.id, signed)
                  setStorageQuery('')
                }
              }}
              onPlus={() => {
                changeTarget(o.id, 1)
                setStorageQuery('')
              }}
            />
          )}
        />
        {showDone && (
          <Button onClick={() => setReopen(null)} sx={{ minHeight: 48, mt: 0.5, ml: 1 }}>
            Klaar
          </Button>
        )}
      </Box>
    )
  }

  const chooser = line && feed && (
    <Box sx={{ mt: 1 }}>
      {line.direction === 'out' ? (
        (() => {
          const fromDone = sumOf(line.sources) === line.amount
          const toDone = sumOf(line.targets) === line.amount
          const showFrom = reopen === 'from' || !fromDone
          const summary = (text: string, which: 'from' | 'to') => (
            <Box sx={{ ...sectionBox, display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
              <Typography>{text}</Typography>
              <Button onClick={() => setReopen(which)} sx={{ minHeight: 48 }}>
                Wijzig
              </Button>
            </Box>
          )
          return (
            <>
              {showFrom ? (
                <Box sx={sectionBox}>
                  {sectionTitle(Math.max(0, ...holdersOf(line.feedId).map((id) => stockOf(id, line.feedId))) < line.amount ? 'Uit welke opslagen?' : 'Uit welke opslag?')}
                  {allocRows('Uit welke opslag?', holdersOf(line.feedId).map((id) => ({ id, name: storageName(id) })), line.sources, (id) => (id ? stockOf(id, line.feedId) : 0), changeSource, 'minus')}
                  {fromDone && (
                    <Button onClick={() => setReopen(null)} sx={{ minHeight: 48, mt: 0.5 }}>
                      Klaar
                    </Button>
                  )}
                </Box>
              ) : (
                summary(`Van: ${allocText(line.sources)}`, 'from')
              )}
              {!showFrom && (
                <Box sx={{ mt: 1 }}>
                  {reopen === 'to' || !toDone
                    ? targetBox(
                        `Waar is de ${feed.unit} naartoe?`,
                        'Waar naartoe?',
                        [
                          { id: null, name: 'Verbruik' },
                          ...(linkedShute(line.feedId) ? [{ id: linkedShute(line.feedId), name: storageName(linkedShute(line.feedId)) }] : []),
                        ],
                        toDone,
                      )
                    : summary(`Naar: ${allocText(line.targets)}`, 'to')}
                </Box>
              )}
            </>
          )
        })()
      ) : (
        targetBox(
          'In welke opslag?',
          'In welke opslag?',
          (() => {
            const linked = linkedShute(line.feedId)
            return [...(linked ? [linked] : []), ...holdersOf(line.feedId).filter((id) => id !== linked)].map((id) => ({ id, name: storageName(id) }))
          })(),
        )
      )}
    </Box>
  )

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
          {lines.length === 0 && !line ? null : (
            <List dense disablePadding aria-label="Wijzigingen">
              {lines.map((c, i) => (
                <ListItem
                  key={i}
                  divider
                  secondaryAction={
                    <IconButton edge="end" aria-label="Verwijder regel" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} sx={{ width: 48, height: 48 }}>
                      <DeleteIcon />
                    </IconButton>
                  }
                  sx={{ minHeight: 48 }}
                >
                  <ListItemText primary={describe(c)} />
                </ListItem>
              ))}
              {line && feed && (
                <ListItem sx={{ display: 'block', p: 1, border: 1, borderColor: 'primary.main', borderRadius: 1, m: 1, width: 'auto' }}>
                  <Stack direction="row" sx={{ alignItems: 'center' }}>
                    <List aria-label="Gekozen voer" disablePadding sx={{ flex: '1 1 auto', minWidth: 0 }}>
                      <FeedRow
                        name={feed.name}
                        active
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
                  {chooser}
                </ListItem>
              )}
            </List>
          )}
        </Box>
      </Box>

      {(!line || error) && (
        <Box sx={{ px: 2, pt: 1, pb: 1, flex: '0 0 auto', maxHeight: '60dvh', overflowY: 'auto' }}>
          {!line && (
            <>
              {sectionTitle('Welk voorraad wil je wijzigen?')}
              <SearchList
                items={rows}
                getKey={(f) => f.id}
                getLabel={(f) => f.name}
                searchLabel="Zoeken…"
                listAriaLabel="Voerlijst"
                emptyText="Geen voer gevonden"
                query={search}
                onQueryChange={setSearch}
                inputRef={searchRef}
                renderRow={(f) => (
                  <FeedRow
                    name={f.name}
                    active={false}
                    minusDisabled={totalOf(f.id) <= 0}
                    maxMinus={totalOf(f.id)}
                    emptyLabel="Geen voorraad"
                    onSwipe={(signed) => tap(f.id, signed < 0 ? 'out' : 'in', Math.abs(signed))}
                    onMinus={() => tap(f.id, 'out')}
                    onPlus={() => tap(f.id, 'in')}
                  />
                )}
              />
            </>
          )}
          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Box>
      )}

      <Paper square elevation={8} sx={{ flex: '0 0 auto', p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button variant="text" size="medium" color="secondary" sx={{ height: 40 }} onClick={close}>
            Annuleren
          </Button>
          <Button
            variant="text"
            size="medium"
            sx={{ height: 40 }}
            disabled={line !== null && !lineComplete}
            onClick={line ? another : () => searchRef.current?.focus()}
          >
            Nog eentje
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
