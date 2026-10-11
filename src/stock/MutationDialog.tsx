import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import RemoveIcon from '@mui/icons-material/Remove'
import SaveIcon from '@mui/icons-material/Save'
import {
  AppBar,
  Divider,
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
  Toolbar,
  Typography,
} from '@mui/material'
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { useOrg } from '../org/useOrg.ts'
import { useOrgData } from '../org/useOrgData.ts'
import { applyMutations, planChangeLine, type Change } from './mutations.ts'
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

const MAX_ROWS = 5
const iconButtonSx = { width: 52, height: 52, border: 1, borderColor: 'divider' }

const SWIPE_STEPS: [number, number][] = [
  [180, 3],
  [130, 2],
  [80, 1],
  [40, 0.5],
]
const SWIPE_MAX = 200

/** Amount a horizontal drag of `distance` px stands for (0 below the threshold). */
function swipeAmount(distance: number): number {
  const d = Math.abs(distance)
  return SWIPE_STEPS.find(([min]) => d >= min)?.[1] ?? 0
}

/**
 * Horizontal swipe on a row: right = minus (negative), left = plus (positive). Vertical
 * movement before the threshold abandons the gesture so scrolling keeps working.
 */
function useSwipeAmount(onSwipe: (signedAmount: number) => void, allowMinus = true) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ id: number; x: number; y: number; locked: boolean } | null>(null)

  const finish = () => {
    start.current = null
    setDragging(false)
    setOffset(0)
  }

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('button')) return
      start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, locked: false }
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (!s.locked) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 40) {
          start.current = null
          return
        }
        if (Math.abs(dx) < 10) return
        s.locked = true
        setDragging(true)
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      setOffset(Math.max(-SWIPE_MAX, Math.min(allowMinus ? SWIPE_MAX : 0, dx)))
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture?.(e.pointerId)
      const amount = s.locked && (allowMinus || dx < 0) ? swipeAmount(dx) : 0
      finish()
      if (amount > 0) onSwipe(dx < 0 ? amount : -amount)
    },
    onPointerCancel: finish,
  }
  return { offset, dragging, handlers }
}

/** Searchable list of up to 5 storages as allocation rows; the first + or swipe right picks one. */
function StoragePicker({ options, onPick, onCancel }: { options: { id: string; name: string; type: string }[]; onPick: (id: string, delta: number) => void; onCancel: () => void }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLocaleLowerCase('nl')
  const shown = options.filter((o) => !needle || o.name.toLocaleLowerCase('nl').includes(needle)).slice(0, MAX_ROWS)
  return (
    <Box>
      <TextField label="Zoek opslag" type="search" variant="filled" fullWidth value={q} onChange={(e) => setQ(e.target.value)} />
      <List aria-label="Opslagen" disablePadding>
        {shown.map((o) => (
          <FeedRow
            key={o.id}
            name={o.name}
            badge={o.type}
            active={false}
            plusOnly
            onSwipe={(signed) => signed > 0 && onPick(o.id, signed)}
            onPlus={() => onPick(o.id, 1)}
          />
        ))}
      </List>
      <Button onClick={onCancel} sx={{ minHeight: 48 }}>
        Annuleren
      </Button>
    </Box>
  )
}

function FeedRow({ name, active, detail, badge, minusDisabled, maxMinus = Infinity, maxPlus = Infinity, emptyLabel, plusOnly, onClear, onSwipe, onMinus, onPlus }: { name: string; active: boolean; minusDisabled?: boolean; badge?: string; maxMinus?: number; maxPlus?: number; emptyLabel?: string; plusOnly?: boolean; onClear?: () => void; detail?: { text: string; color: string }; onSwipe: (signed: number) => void; onMinus?: () => void; onPlus: () => void }) {
  const { offset, dragging, handlers } = useSwipeAmount(onSwipe, !plusOnly)
  const raw = swipeAmount(offset)
  const cap = offset > 0 ? maxMinus : maxPlus
  const label = raw === 0 ? '' : cap <= 0 ? (emptyLabel ?? '') : `${offset > 0 ? '−' : '+'}${formatAmount(Math.min(raw, cap))}`
  return (
    <ListItem disableGutters disablePadding divider sx={{ position: 'relative', overflow: 'hidden', display: 'block' }}>
      {offset !== 0 && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: offset > 0 ? 'flex-start' : 'flex-end',
            px: 2,
            bgcolor: offset > 0 ? 'error.main' : 'success.main',
            color: 'common.white',
            fontWeight: 700,
            fontSize: '1.4rem',
          }}
        >
          {label}
        </Box>
      )}
      <Box
        {...handlers}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          py: 0.5,
          bgcolor: 'background.default',
          touchAction: 'pan-y',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <ListItemText primary={name} sx={{ minWidth: 96 }} slotProps={{ primary: { sx: { fontWeight: active ? 700 : 400 } } }} />
        {badge && <Chip size="small" variant="outlined" label={badge} sx={{ mr: 1, flexShrink: 1, maxWidth: 96 }} />}
        {detail && (
          <Typography sx={{ fontWeight: 700, color: detail.color, mr: 1, whiteSpace: 'nowrap' }}>{detail.text}</Typography>
        )}
        {onClear && (
          <IconButton aria-label={`${name} wissen`} onClick={onClear} sx={{ width: 40, height: 40, mr: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {!plusOnly && (
            <IconButton aria-label={`${name} min`} disabled={minusDisabled} onClick={onMinus} sx={iconButtonSx}>
              <RemoveIcon />
            </IconButton>
          )}
          <IconButton aria-label={`${name} plus`} onClick={onPlus} sx={iconButtonSx}>
            <AddIcon />
          </IconButton>
        </Stack>
      </Box>
    </ListItem>
  )
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
  const [picker, setPicker] = useState<'from' | 'to' | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
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
      setPicker(null)
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

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('nl')
    if (q) return visibleFeeds.filter((f) => f.name.toLocaleLowerCase('nl').includes(q)).slice(0, MAX_ROWS)
    return [...visibleFeeds].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order).slice(0, MAX_ROWS)
  }, [visibleFeeds, search, usage])

  const lineComplete =
    line !== null && sumOf(line.targets) === line.amount && (line.direction === 'in' || sumOf(line.sources) === line.amount)

  const toChanges = (l: Line): Change[] =>
    pairAllocs(l.feedId, l.direction === 'in' ? [{ storageId: null, amount: l.amount }] : l.sources, l.targets)

  const count = lines.length + (line && lineComplete ? 1 : 0)

  const saveDisabled = count === 0 || (line !== null && !lineComplete)

  const storageName = (id: string | null) => (id ? (storages.get(id)?.name ?? id) : '')
  const amountText = (feedId: string, direction: 'out' | 'in', amount: number) => {
    const unit = feeds.get(feedId)?.unit ?? 'zak'
    return `${direction === 'out' ? '−' : '+'}${formatAmount(amount)} ${unitLabel(unit, amount)}`
  }
  const describe = (l: Line) => {
    const head = `${feeds.get(l.feedId)?.name ?? l.feedId} ${amountText(l.feedId, l.direction, l.amount)}`
    const part = (a: Alloc) => `${a.storageId === null ? 'verbruik' : storageName(a.storageId)} ${formatAmount(a.amount)}`
    const from = l.sources.map(part).join(', ')
    return `${head} · ${from ? `${from} ` : ''}→ ${l.targets.map(part).join(', ')}`
  }

  const reset = () => {
    setSearch('')
    setLine(null)
    setPicker(null)
    setLines([])
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const another = () => {
    if (!line || !lineComplete) return
    setLines((prev) => [...prev, line])
    setLine(null)
    setPicker(null)
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

  const allocRows = (label: string, rows: { id: string | null; name: string }[], list: Alloc[], capOf: (id: string | null) => number, onChange: (id: string | null, delta: number) => void) => (
    <List aria-label={label} disablePadding>
      {rows.map((r) => {
        const a = list.find((x) => x.storageId === r.id)?.amount ?? 0
        const room = Math.max(0, round2(Math.min(capOf(r.id), (line?.amount ?? 0) - sumOf(list) + a) - a))
        return (
          <FeedRow
            key={r.id ?? 'verbruik'}
            name={r.name}
            active={a > 0}
            plusOnly
            maxPlus={room}
            onClear={a > 0 ? () => onChange(r.id, -1e9) : undefined}
            detail={a > 0 && feed ? { text: `${formatAmount(a)} ${unitLabel(feed.unit, a)}`, color: 'text.primary' } : undefined}
            onSwipe={(signed) => onChange(r.id, signed)}
            onPlus={() => onChange(r.id, 1)}
          />
        )
      })}
    </List>
  )

  /** Destination rows plus the "other storage" search. */
  const targetBox = (title: string, label: string, baseRows: { id: string | null; name: string }[]) => {
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
        {allocRows(label, rows, line.targets, () => Infinity, changeTarget)}
        {picker === 'to' ? (
          <StoragePicker
            options={options}
            onPick={(id, delta) => {
              changeTarget(id, delta)
              setPicker(null)
            }}
            onCancel={() => setPicker(null)}
          />
        ) : (
          <Button onClick={() => setPicker('to')} sx={{ minHeight: 48, mt: 0.5 }}>
            Selecteer andere opslag
          </Button>
        )}
      </Box>
    )
  }

  const chooser = line && feed && (
    <Box sx={{ mt: 1 }}>
      {line.direction === 'out' ? (
        <>
          <Box sx={sectionBox}>
            {sectionTitle(Math.max(0, ...holdersOf(line.feedId).map((id) => stockOf(id, line.feedId))) < line.amount ? 'Uit welke opslagen?' : 'Uit welke opslag?')}
            {allocRows('Uit welke opslag?', holdersOf(line.feedId).map((id) => ({ id, name: storageName(id) })), line.sources, (id) => (id ? stockOf(id, line.feedId) : 0), changeSource)}
          </Box>
          <Divider sx={{ my: 2 }} />
          {targetBox(`Waar is de ${feed.unit} naartoe?`, 'Waar naartoe?', [
            { id: null, name: 'Verbruik' },
            ...(linkedShute(line.feedId) ? [{ id: linkedShute(line.feedId), name: storageName(linkedShute(line.feedId)) }] : []),
          ])}
        </>
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
    <Dialog open={open} onClose={close} fullScreen slotProps={{ paper: { sx: { bgcolor: 'background.default', backgroundImage: 'none' } } }}>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar>
          <IconButton edge="start" aria-label="Sluiten" onClick={close}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, ml: 1 }}>
            Wijzigingen
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2, pt: 2, pb: 14 }}>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, minHeight: '35vh', maxHeight: '35vh', overflowY: 'auto', mb: 2 }}>
          {lines.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Nog geen wijzigingen
            </Typography>
          ) : (
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
            </List>
          )}
        </Box>

        {line && feed ? (
          <>
            <List aria-label="Gekozen voer" disablePadding>
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
            {line.direction === 'out' && line.amount >= totalOf(line.feedId) && (
              <Typography variant="caption" color="text.secondary">
                Er ligt maar {formatAmount(totalOf(line.feedId))} {unitLabel(feed.unit, totalOf(line.feedId))}
              </Typography>
            )}
            {chooser}
          </>
        ) : (
          <>
            {sectionTitle('Welk voorraad wil je wijzigen?')}
            <List aria-label="Voerlijst" disablePadding>
              {rows.map((f) => (
                <FeedRow
                  key={f.id}
                  name={f.name}
                  active={false}
                  minusDisabled={totalOf(f.id) <= 0}
                  maxMinus={totalOf(f.id)}
                  emptyLabel="Geen voorraad"
                  onSwipe={(signed) => tap(f.id, signed < 0 ? 'out' : 'in', Math.abs(signed))}
                  onMinus={() => tap(f.id, 'out')}
                  onPlus={() => tap(f.id, 'in')}
                />
              ))}
            </List>
            <TextField
              label="Zoeken…"
              type="search"
              variant="filled"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              inputRef={searchRef}
              sx={{ mt: 1 }}
            />
          </>
        )}
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Box>

      <Paper square elevation={8} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button variant="text" size="small" sx={{ minHeight: 48 }} onClick={close}>
            Annuleren
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{ minHeight: 48 }}
            disabled={line !== null && !lineComplete}
            onClick={line ? another : () => searchRef.current?.focus()}
          >
            Nog eentje
          </Button>
          {wide ? (
            <Button variant="contained" size="medium" startIcon={<SaveIcon />} sx={{ minHeight: 48 }} disabled={saveDisabled} onClick={save}>
              Opslaan
            </Button>
          ) : (
            <Button variant="contained" aria-label="Opslaan" sx={{ width: 48, height: 48, minWidth: 48, p: 0 }} disabled={saveDisabled} onClick={save}>
              <SaveIcon />
            </Button>
          )}
        </Stack>
      </Paper>
    </Dialog>
  )
}
