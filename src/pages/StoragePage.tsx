import AddIcon from '@mui/icons-material/Add'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { ID_PATTERN, type LogType } from '../model/types.ts'
import { can } from '../org/roles.ts'
import { useOrg } from '../org/useOrg.ts'
import { useOrgData } from '../org/useOrgData.ts'
import AmountSheet, { type AmountMode } from '../stock/AmountSheet.tsx'
import { applyMutation, planMutation } from '../stock/mutations.ts'
import { formatAmount, unitLabel } from '../stock/stock.ts'
import StorageAvatar from '../storage/StorageAvatar.tsx'
import { useStorageLogs } from '../stock/useStorageLogs.ts'

const LOG_LABEL: Record<LogType, string> = {
  delivery: 'geleverd',
  count: 'geteld',
  dispense: 'eruit',
  fill: 'in de koker',
  empty: 'koker leeg',
  move: 'verplaatst',
  correction: 'correctie',
}

const timeNl = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

interface Target {
  feedId: string
  mode: AmountMode
}

/** One storage: its feeds with stock, and the one-hand actions on them. */
export default function StoragePage() {
  const { storageId = '' } = useParams()
  const { user } = useAuth()
  const { orgId, roles } = useOrg()
  const { storages, storageTypes, feeds, items, loading } = useOrgData()
  const logs = useStorageLogs(orgId, ID_PATTERN.test(storageId) ? storageId : null)
  const [target, setTarget] = useState<Target | null>(null)
  /** Feed picker: which feeds to offer and which mode the sheet opens in afterwards. */
  const [picking, setPicking] = useState<{ feeds: Array<{ id: string; name: string }>; mode: AmountMode } | null>(null)
  const [snack, setSnack] = useState<string | null>(null)
  const mayFeed = can(roles, 'feed')

  const storage = storages.get(storageId)
  const type = storage ? storageTypes.get(storage.typeId) : undefined
  const consumed = type?.behaviour === 'consumed'

  // Feeds shown: counted storages list their items; kokers list the feeds that live there.
  const rows = useMemo(() => {
    if (!storage) return []
    if (consumed) {
      return [...feeds.entries()]
        .filter(([, f]) => f.defaultStorageId === storageId && !f.hidden)
        .map(([feedId, f]) => ({ feedId, name: f.name, unit: f.unit, amount: null as number | null }))
    }
    return [...items.values()]
      .filter((it) => it.storageId === storageId)
      .map((it) => ({ feedId: it.feedId, name: feeds.get(it.feedId)?.name ?? it.feedId, unit: feeds.get(it.feedId)?.unit ?? 'zak', amount: it.amount as number | null }))
      .sort((a, b) => (feeds.get(a.feedId)?.order ?? 0) - (feeds.get(b.feedId)?.order ?? 0))
  }, [storage, consumed, feeds, items, storageId])

  const otherFeeds = useMemo(
    () =>
      [...feeds.entries()]
        .filter(([id, f]) => !f.hidden && !rows.some((r) => r.feedId === id))
        .sort((a, b) => a[1].order - b[1].order)
        .map(([id, f]) => ({ id, name: f.name })),
    [feeds, rows],
  )

  if (loading) {
    return (
      <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!ID_PATTERN.test(storageId) || !storage) return <Navigate to="/storages" replace />

  const defaultMode: AmountMode = consumed ? 'fill' : storage.typeId === 'stable' ? 'count' : 'dispense'
  const current = (feedId: string) => items.get(`${storageId}_${feedId}`)?.amount ?? 0

  const confirm = (amount: number) => {
    if (!target || !orgId || !user) return
    const kind = target.mode
    const plan = planMutation(kind, { orgId, uid: user.uid, storageId, feedId: target.feedId, amount, current: current(target.feedId) })
    setTarget(null)
    const name = feeds.get(target.feedId)?.name ?? target.feedId
    // Not awaited for feedback: offline this only resolves after sync. The
    // listeners show the local write at once; a server rejection surfaces here.
    applyMutation(plan).catch((err: { code?: string }) => {
      console.warn('Mutation rejected', err)
      setSnack(`Niet opgeslagen: ${name} (${err.code ?? 'fout'})`)
    })
    setSnack(
      kind === 'count'
        ? `${name}: ${formatAmount(amount)} geteld`
        : kind === 'dispense'
          ? `${name}: ${formatAmount(amount)} eruit`
          : kind === 'fill'
            ? `${name}: ${formatAmount(amount)} in de koker`
            : `${name}: koker leeg gemeld`,
    )
  }

  const emptyShute = (feedId: string) => {
    if (!orgId || !user) return
    applyMutation(planMutation('empty', { orgId, uid: user.uid, storageId, feedId, amount: 0, current: 0 })).catch(() =>
      setSnack('Niet opgeslagen'),
    )
    setSnack(`${feeds.get(feedId)?.name ?? feedId}: koker leeg gemeld`)
  }

  const targetFeed = target ? feeds.get(target.feedId) : undefined

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <StorageAvatar storage={storage} size={40} />
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }} noWrap>
          {storage.name}
        </Typography>
        <Chip size="small" label={type?.name ?? storage.typeId} />
      </Stack>

      {!mayFeed && <Alert severity="info" sx={{ mb: 2 }}>Je kunt hier alleen kijken. Vraag een beheerder om de rol "feed".</Alert>}

      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {consumed ? 'Geen voer aan deze koker gekoppeld.' : 'Nog niets in deze opslag.'}
        </Typography>
      ) : (
        <List disablePadding aria-label="Voer in deze opslag">
          {rows.map((r) => (
            <ListItem key={r.feedId} divider disableGutters sx={{ px: 0 }}>
              <ListItemButton
                disabled={!mayFeed}
                onClick={() => setTarget({ feedId: r.feedId, mode: defaultMode })}
                sx={{ minHeight: 72, px: 1, borderRadius: 1 }}
              >
                <ListItemText
                  primary={r.name}
                  secondary={consumed ? 'Tik om te vullen' : defaultMode === 'count' ? 'Tik om te tellen' : 'Tik om eruit te halen'}
                  slotProps={{ primary: { sx: { fontWeight: 500, fontSize: '1.1rem' } } }}
                />
                {r.amount !== null && (
                  <Box sx={{ textAlign: 'right', flexShrink: 0, pl: 2 }}>
                    <Typography variant="h5" component="div" sx={{ lineHeight: 1.1, color: r.amount === 0 ? 'text.disabled' : undefined }}>
                      {formatAmount(r.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {unitLabel(r.unit, r.amount)}
                    </Typography>
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {mayFeed && (
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }} useFlexGap>
          {!consumed && (
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                const mode: AmountMode = defaultMode === 'count' ? 'dispense' : 'count'
                if (rows.length === 1) setTarget({ feedId: rows[0].feedId, mode })
                else setPicking({ feeds: rows.map((r) => ({ id: r.feedId, name: r.name })), mode })
              }}
              disabled={rows.length === 0}
            >
              {defaultMode === 'count' ? 'Eruit halen' : 'Tellen'}
            </Button>
          )}
          {consumed && rows.length > 0 && (
            <Button variant="outlined" size="large" color="warning" onClick={() => emptyShute(rows[0].feedId)}>
              Koker is leeg
            </Button>
          )}
          <Button
            variant="text"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setPicking({ feeds: otherFeeds, mode: consumed ? 'fill' : 'count' })}
            disabled={otherFeeds.length === 0}
          >
            Ander voer
          </Button>
        </Stack>
      )}

      {logs && logs.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="overline" color="text.secondary" component="h2">
            Laatste mutaties
          </Typography>
          <List dense disablePadding>
            {logs.map((l) => (
              <ListItem key={l.id} disableGutters>
                <ListItemText
                  primary={`${feeds.get(l.feedId)?.name ?? l.feedId} · ${l.type === 'empty' ? LOG_LABEL.empty : `${formatAmount(l.amount)} ${LOG_LABEL[l.type]}`}${
                    l.type === 'count' && l.previousAmount !== undefined ? ` (was ${formatAmount(l.previousAmount)})` : ''
                  }`}
                  secondary={l.timestampMs === null ? 'wordt opgeslagen…' : timeNl.format(l.timestampMs)}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Dialog open={picking !== null} onClose={() => setPicking(null)} fullWidth>
        <DialogTitle>Welk voer?</DialogTitle>
        <List sx={{ pb: 2 }}>
          {(picking?.feeds ?? []).map((f) => (
            <ListItemButton
              key={f.id}
              sx={{ minHeight: 56 }}
              onClick={() => {
                const mode = picking!.mode
                setPicking(null)
                setTarget({ feedId: f.id, mode })
              }}
            >
              <ListItemText primary={f.name} />
            </ListItemButton>
          ))}
        </List>
      </Dialog>

      <AmountSheet
        open={target !== null}
        mode={target?.mode ?? defaultMode}
        feedName={targetFeed?.name ?? ''}
        storageName={storage.name}
        unit={targetFeed?.unit ?? 'zak'}
        initial={target?.mode === 'count' ? current(target.feedId) : 1}
        current={target && !consumed ? current(target.feedId) : undefined}
        onConfirm={confirm}
        onClose={() => setTarget(null)}
      />

      <Snackbar open={snack !== null} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack} />
    </Container>
  )
}
