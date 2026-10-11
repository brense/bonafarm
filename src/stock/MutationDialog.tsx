import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import RemoveIcon from '@mui/icons-material/Remove'
import {
  AppBar,
  Autocomplete,
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

interface Line {
  feedId: string
  direction: 'out' | 'in'
  amount: number
  fromStorageId: string | null
  toStorageId: string | null
  consumed: boolean
}

const MAX_ROWS = 5
const chipSx = { height: 40, fontSize: '1rem' }
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
 * Horizontal swipe on a row: left = negative, right = positive. Vertical
 * movement before the threshold abandons the gesture so scrolling keeps working.
 */
function useSwipeAmount(onSwipe: (signedAmount: number) => void) {
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
      setOffset(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx)))
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture?.(e.pointerId)
      const amount = s.locked ? swipeAmount(dx) : 0
      finish()
      if (amount > 0) onSwipe(dx < 0 ? -amount : amount)
    },
    onPointerCancel: finish,
  }
  return { offset, dragging, handlers }
}

function FeedRow({ name, active, onSwipe, onMinus, onPlus }: { name: string; active: boolean; onSwipe: (signed: number) => void; onMinus: () => void; onPlus: () => void }) {
  const { offset, dragging, handlers } = useSwipeAmount(onSwipe)
  const amount = swipeAmount(offset)
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
            justifyContent: offset < 0 ? 'flex-end' : 'flex-start',
            px: 2,
            bgcolor: offset < 0 ? 'error.main' : 'success.main',
            color: 'common.white',
            fontWeight: 700,
            fontSize: '1.4rem',
          }}
        >
          {amount > 0 ? `${offset < 0 ? '−' : '+'}${formatAmount(amount)}` : ''}
        </Box>
      )}
      <Box
        {...handlers}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          py: 0.5,
          bgcolor: 'background.paper',
          touchAction: 'pan-y',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <ListItemText primary={name} slotProps={{ primary: { sx: { fontWeight: active ? 700 : 400 } } }} />
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <IconButton aria-label={`${name} min`} onClick={onMinus} sx={iconButtonSx}>
            <RemoveIcon />
          </IconButton>
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
  const [lines, setLines] = useState<Change[]>([])
  const [error, setError] = useState<string | null>(null)

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

  /** Counted storages to take a feed out of: where it lies (most first), else all with the default first. */
  const sourcesFor = (feedId: string): string[] => {
    const counted = activeStorages().filter(([id]) => isCounted(id))
    const holding = counted
      .filter(([id]) => stockOf(id, feedId) > 0)
      .sort((a, b) => stockOf(b[0], feedId) - stockOf(a[0], feedId) || a[1].order - b[1].order)
    if (holding.length > 0) return holding.map(([id]) => id)
    const def = feeds.get(feedId)?.defaultStorageId
    return counted.map(([id]) => id).sort((a, b) => Number(b === def) - Number(a === def))
  }

  /** Destinations besides "verbruikt": linked shute, other shutes, then other counted storages. */
  const destinationsFor = (feedId: string, fromId: string | null): string[] => {
    const def = feeds.get(feedId)?.defaultStorageId
    const active = activeStorages().filter(([id]) => id !== fromId)
    const shutes = active.filter(([id]) => isConsumed(id)).map(([id]) => id)
    const linked = def !== undefined && shutes.includes(def) ? [def] : []
    const rest = shutes.filter((id) => !linked.includes(id))
    const countedOthers = active.filter(([id]) => isCounted(id)).map(([id]) => id)
    return [...linked, ...rest, ...countedOthers]
  }

  /** Storages to put a feed into: linked first, then where it already lies, then the rest. */
  const targetsFor = (feedId: string): string[] => {
    const def = feeds.get(feedId)?.defaultStorageId
    const score = (id: string) => (id === def ? 0 : stockOf(id, feedId) > 0 ? 1 : 2)
    return activeStorages()
      .map(([id]) => id)
      .sort((a, b) => score(a) - score(b))
  }

  const newLine = (feedId: string, direction: 'out' | 'in'): Line => {
    if (direction === 'in') {
      return { feedId, direction, amount: 1, fromStorageId: null, toStorageId: targetsFor(feedId)[0] ?? null, consumed: false }
    }
    const from = sourcesFor(feedId)[0] ?? null
    const dests = destinationsFor(feedId, from)
    const def = feeds.get(feedId)?.defaultStorageId
    const linked = def !== undefined && dests[0] === def && isConsumed(def) ? def : null
    return { feedId, direction, amount: 1, fromStorageId: from, toStorageId: linked, consumed: linked === null }
  }

  const tap = (feedId: string, direction: 'out' | 'in', by = 1) =>
    setLine((prev) =>
      prev && prev.feedId === feedId && prev.direction === direction
        ? { ...prev, amount: prev.amount + by }
        : { ...newLine(feedId, direction), amount: by },
    )

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
    line !== null && (line.direction === 'in' ? line.toStorageId !== null : line.fromStorageId !== null && (line.consumed || line.toStorageId !== null))

  const toChange = (l: Line): Change => ({
    feedId: l.feedId,
    amount: l.amount,
    fromStorageId: l.direction === 'in' ? null : l.fromStorageId,
    toStorageId: l.consumed ? null : l.toStorageId,
  })

  const count = lines.length + (line && lineComplete ? 1 : 0)

  const storageName = (id: string | null) => (id ? (storages.get(id)?.name ?? id) : '')
  const amountText = (feedId: string, direction: 'out' | 'in', amount: number) => {
    const unit = feeds.get(feedId)?.unit ?? 'zak'
    return `${direction === 'out' ? '−' : '+'}${formatAmount(amount)} ${unitLabel(unit, amount)}`
  }
  const describe = (c: Change) => {
    const direction = c.fromStorageId === null ? 'in' : 'out'
    const head = `${feeds.get(c.feedId)?.name ?? c.feedId} ${amountText(c.feedId, direction, c.amount)}`
    const tail = c.toStorageId === null ? 'verbruikt' : storageName(c.toStorageId)
    return `${head} · ${c.fromStorageId === null ? '' : `${storageName(c.fromStorageId)} `}→ ${tail}`
  }

  const reset = () => {
    setSearch('')
    setLine(null)
    setLines([])
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const another = () => {
    if (!line || !lineComplete) return
    setLines((prev) => [...prev, toChange(line)])
    setLine(null)
    setSearch('')
  }

  const save = () => {
    if (!orgId || !user) return
    const changes = line && lineComplete ? [...lines, toChange(line)] : lines
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
  const sources = line?.direction === 'out' ? sourcesFor(line.feedId) : []
  const destinations = line?.direction === 'out' ? destinationsFor(line.feedId, line.fromStorageId) : []
  const targets = line?.direction === 'in' ? targetsFor(line.feedId) : []

  const pickSource = (id: string) =>
    setLine((prev) => {
      if (!prev) return prev
      const clash = prev.toStorageId === id
      return { ...prev, fromStorageId: id, toStorageId: clash ? null : prev.toStorageId, consumed: clash ? true : prev.consumed }
    })

  const sectionTitle = (text: string) => (
    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1.5, mb: 0.5 }}>
      {text}
    </Typography>
  )

  return (
    <Dialog open={open} onClose={close} fullScreen>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar>
          <IconButton edge="start" aria-label="Sluiten" onClick={close}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, ml: 1 }}>
            Wijziging maken
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 2, pt: 2, pb: 30 }}>
        <Autocomplete
          autoHighlight
          openOnFocus={false}
          options={visibleFeeds}
          getOptionLabel={(o) => o.name}
          getOptionKey={(o) => o.id}
          value={null}
          inputValue={search}
          onInputChange={(_, v, reason) => {
            if (reason === 'input' || reason === 'clear') setSearch(v)
          }}
          renderInput={(params) => <TextField {...params} label="Voer" variant="filled" />}
        />
        <List aria-label="Voerlijst">
          {rows.map((f) => (
            <FeedRow
              key={f.id}
              name={f.name}
              active={line?.feedId === f.id}
              onSwipe={(signed) => tap(f.id, signed < 0 ? 'out' : 'in', Math.abs(signed))}
              onMinus={() => tap(f.id, 'out')}
              onPlus={() => tap(f.id, 'in')}
            />
          ))}
        </List>

        {line && feed && (
          <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
              <Typography sx={{ fontWeight: 700 }}>{feed.name}</Typography>
              <Typography color={line.direction === 'out' ? 'error.main' : 'success.main'} sx={{ fontWeight: 700 }}>
                {amountText(line.feedId, line.direction, line.amount)}
              </Typography>
            </Stack>

            {line.direction === 'out' ? (
              <>
                {sectionTitle('Waar vandaan?')}
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} role="group" aria-label="Waar vandaan?">
                  {sources.map((id) => (
                    <Chip
                      key={id}
                      label={storageName(id)}
                      clickable
                      aria-pressed={line.fromStorageId === id}
                      color={line.fromStorageId === id ? 'primary' : 'default'}
                      variant={line.fromStorageId === id ? 'filled' : 'outlined'}
                      onClick={() => pickSource(id)}
                      sx={chipSx}
                    />
                  ))}
                </Stack>
                {sectionTitle('En dan?')}
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} role="group" aria-label="En dan?">
                  <Chip
                    label="Verbruikt"
                    clickable
                    aria-pressed={line.consumed}
                    color={line.consumed ? 'primary' : 'default'}
                    variant={line.consumed ? 'filled' : 'outlined'}
                    onClick={() => setLine({ ...line, consumed: true, toStorageId: null })}
                    sx={chipSx}
                  />
                  {destinations.map((id) => {
                    const on = !line.consumed && line.toStorageId === id
                    return (
                      <Chip
                        key={id}
                        label={storageName(id)}
                        clickable
                        aria-pressed={on}
                        color={on ? 'primary' : 'default'}
                        variant={on ? 'filled' : 'outlined'}
                        onClick={() => setLine({ ...line, consumed: false, toStorageId: id })}
                        sx={chipSx}
                      />
                    )
                  })}
                </Stack>
              </>
            ) : (
              <>
                {sectionTitle('Waar in?')}
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} role="group" aria-label="Waar in?">
                  {targets.map((id) => (
                    <Chip
                      key={id}
                      label={storageName(id)}
                      clickable
                      aria-pressed={line.toStorageId === id}
                      color={line.toStorageId === id ? 'primary' : 'default'}
                      variant={line.toStorageId === id ? 'filled' : 'outlined'}
                      onClick={() => setLine({ ...line, toStorageId: id })}
                      sx={chipSx}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        )}
      </Box>

      <Paper square elevation={8} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
        {lines.length > 0 && (
          <List dense disablePadding aria-label="Regels" sx={{ maxHeight: 160, overflowY: 'auto', mb: 1 }}>
            {lines.map((c, i) => (
              <ListItem
                key={i}
                disableGutters
                secondaryAction={
                  <IconButton edge="end" aria-label="Verwijder regel" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} sx={{ width: 48, height: 48 }}>
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ minHeight: 48, pr: 6 }}
              >
                <ListItemText primary={describe(c)} />
              </ListItem>
            ))}
          </List>
        )}
        {error && (
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        {line ? (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="large" fullWidth sx={{ minHeight: 56 }} disabled={!lineComplete} onClick={another}>
              Nog een
            </Button>
            <Button variant="contained" size="large" fullWidth sx={{ minHeight: 56 }} disabled={count === 0} onClick={save}>
              Wijzigingen opslaan ({count})
            </Button>
          </Stack>
        ) : (
          <Button variant="contained" size="large" fullWidth sx={{ minHeight: 56 }} disabled={count === 0} onClick={save}>
            Wijzigingen opslaan ({count})
          </Button>
        )}
      </Paper>
    </Dialog>
  )
}
