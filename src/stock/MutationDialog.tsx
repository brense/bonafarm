import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import RemoveIcon from '@mui/icons-material/Remove'
import SearchIcon from '@mui/icons-material/Search'
import {
  AppBar,
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { useOrg } from '../org/useOrg.ts'
import { useOrgData } from '../org/useOrgData.ts'
import { applyMutations, planChange } from './mutations.ts'
import { formatAmount, unitLabel } from './stock.ts'

interface Props {
  open: boolean
  onClose: () => void
  onDone: (message: string) => void
}

const STEP = 1

/**
 * "Wijziging maken": pick one or more feeds with +/- (minus = taken out, plus =
 * put in), then say for each where it came from or went to. Everything is
 * written as one batch. Both steps keep the actions at the bottom of the screen.
 */
export default function MutationDialog({ open, onClose, onDone }: Props) {
  const { user } = useAuth()
  const { orgId } = useOrg()
  const { feeds, storages, storageTypes, items } = useOrgData()
  const [step, setStep] = useState<1 | 2>(1)
  const [search, setSearch] = useState('')
  const [deltas, setDeltas] = useState<Map<string, number>>(() => new Map())
  const [where, setWhere] = useState<Map<string, string>>(() => new Map())
  const [error, setError] = useState<string | null>(null)

  const feedRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('nl')
    return [...feeds.entries()]
      .filter(([, f]) => !f.hidden && (!q || f.name.toLocaleLowerCase('nl').includes(q)))
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id, f]) => ({ id, ...f }))
  }, [feeds, search])

  const changed = useMemo(() => [...deltas.entries()].filter(([, d]) => d !== 0), [deltas])

  const counted = (storageId: string) => {
    const s = storages.get(storageId)
    return s !== undefined && storageTypes.get(s.typeId)?.behaviour === 'counted'
  }

  /** Storages offered for one line: default first, then where it already lies, then the rest. Minus never offers kokers. */
  const optionsFor = (feedId: string, delta: number) => {
    const feed = feeds.get(feedId)
    const score = (id: string) =>
      (feed?.defaultStorageId === id ? 0 : 2) + ([...items.values()].some((it) => it.storageId === id && it.feedId === feedId && it.amount > 0) ? 0 : 1)
    return [...storages.entries()]
      .filter(([id, s]) => s.status === 'active' && (delta > 0 || counted(id)))
      .sort((a, b) => score(a[0]) - score(b[0]) || a[1].order - b[1].order)
      .map(([id, s]) => ({ id, name: s.name, counted: counted(id) }))
  }

  const bump = (feedId: string, by: number) =>
    setDeltas((prev) => {
      const next = new Map(prev)
      const v = Math.round(((prev.get(feedId) ?? 0) + by) * 100) / 100
      if (v === 0) next.delete(feedId)
      else next.set(feedId, v)
      return next
    })

  const reset = () => {
    setStep(1)
    setSearch('')
    setDeltas(new Map())
    setWhere(new Map())
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const goToStep2 = () => {
    // Preselect the most likely storage per line.
    setWhere((prev) => {
      const next = new Map(prev)
      for (const [feedId, delta] of changed) if (!next.has(feedId)) next.set(feedId, optionsFor(feedId, delta)[0]?.id ?? '')
      return next
    })
    setStep(2)
  }

  const complete = changed.every(([feedId]) => where.get(feedId))

  const save = () => {
    if (!orgId || !user) return
    try {
      const plans = changed.map(([feedId, delta]) => {
        const storageId = where.get(feedId)!
        return planChange(orgId, user.uid, {
          feedId,
          storageId,
          delta,
          counted: counted(storageId),
          current: items.get(`${storageId}_${feedId}`)?.amount ?? 0,
        })
      })
      applyMutations(plans).catch((err: { code?: string }) => onDone(`Niet opgeslagen (${err.code ?? 'fout'})`))
      onDone(`${plans.length} ${plans.length === 1 ? 'wijziging' : 'wijzigingen'} opgeslagen`)
      close()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullScreen>
      <AppBar position="sticky" color="default" enableColorOnDark>
        <Toolbar>
          {step === 2 ? (
            <IconButton edge="start" aria-label="Terug" onClick={() => setStep(1)}>
              <ArrowBackIcon />
            </IconButton>
          ) : (
            <IconButton edge="start" aria-label="Sluiten" onClick={close}>
              <CloseIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, ml: 1 }}>
            {step === 1 ? 'Wijziging maken' : 'Waar?'}
          </Typography>
        </Toolbar>
      </AppBar>

      {step === 1 ? (
        <Box sx={{ px: 2, pb: 12 }}>
          <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
            Min is eruit gehaald, plus is erin gedaan. Meerdere soorten voer tegelijk kan.
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Zoek voer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Zoek voer' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <List aria-label="Voer">
            {feedRows.map((f) => {
              const d = deltas.get(f.id) ?? 0
              return (
                <ListItem key={f.id} divider disableGutters sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={f.name}
                    secondary={d === 0 ? ' ' : `${d > 0 ? '+' : '−'}${formatAmount(Math.abs(d))} ${unitLabel(f.unit, Math.abs(d))}`}
                    slotProps={{
                      primary: { sx: { fontWeight: d !== 0 ? 700 : 400 } },
                      secondary: { sx: { color: d < 0 ? 'error.main' : d > 0 ? 'success.main' : undefined } },
                    }}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <IconButton aria-label={`${f.name} min`} onClick={() => bump(f.id, -STEP)} sx={{ width: 52, height: 52, border: 1, borderColor: 'divider' }}>
                      <RemoveIcon />
                    </IconButton>
                    <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 700, fontSize: '1.2rem', color: d < 0 ? 'error.main' : d > 0 ? 'success.main' : 'text.disabled' }}>
                      {d === 0 ? '0' : `${d > 0 ? '+' : '−'}${formatAmount(Math.abs(d))}`}
                    </Typography>
                    <IconButton aria-label={`${f.name} plus`} onClick={() => bump(f.id, STEP)} sx={{ width: 52, height: 52, border: 1, borderColor: 'divider' }}>
                      <AddIcon />
                    </IconButton>
                  </Stack>
                </ListItem>
              )
            })}
          </List>
        </Box>
      ) : (
        <Box sx={{ px: 2, pb: 12 }}>
          <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
            Waar kwam het vandaan of waar ging het in?
          </Typography>
          <Stack spacing={2}>
            {changed.map(([feedId, delta]) => {
              const feed = feeds.get(feedId)!
              return (
                <Paper key={feedId} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{feed.name}</Typography>
                    <Typography color={delta < 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 700 }}>
                      {delta > 0 ? '+' : '−'}
                      {formatAmount(Math.abs(delta))} {unitLabel(feed.unit, Math.abs(delta))}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {delta < 0 ? 'uit' : 'in'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} role="group" aria-label={`Opslag voor ${feed.name}`}>
                    {optionsFor(feedId, delta).map((o) => (
                      <Chip
                        key={o.id}
                        label={o.name}
                        clickable
                        color={where.get(feedId) === o.id ? 'primary' : 'default'}
                        variant={where.get(feedId) === o.id ? 'filled' : 'outlined'}
                        onClick={() => setWhere((prev) => new Map(prev).set(feedId, o.id))}
                        sx={{ height: 40, fontSize: '1rem' }}
                      />
                    ))}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      )}

      <Paper square elevation={8} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
        {step === 1 ? (
          <Button variant="contained" size="large" fullWidth sx={{ minHeight: 56 }} disabled={changed.length === 0} onClick={goToStep2}>
            {changed.length === 0 ? 'Kies voer' : `Verder (${changed.length})`}
          </Button>
        ) : (
          <Button variant="contained" size="large" fullWidth sx={{ minHeight: 56 }} disabled={!complete} onClick={save}>
            Opslaan ({changed.length})
          </Button>
        )}
      </Paper>
    </Dialog>
  )
}
