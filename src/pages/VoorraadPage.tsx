import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import { useOrg } from '../org/useOrg.ts'
import { useOrgData } from '../org/useOrgData.ts'
import { can } from '../org/roles.ts'
import {
  STATUS_LABEL,
  STATUS_ORDER,
  adviseFeed,
  consumptionPerWeek,
  deliverySchedule,
  estimateKokerStock,
  type Advice,
  type KokerEstimate,
  type AdviceStatus,
} from '../stock/advice.ts'
import { formatAmount, stockPerFeed, unitLabel, type FeedStock } from '../stock/stock.ts'
import { useRecentLogs } from '../stock/useRecentLogs.ts'
import Page from './Page.tsx'

const ADVICE_WEEKS = 12

const CHIP_COLOR: Record<AdviceStatus, 'error' | 'warning' | 'default' | 'success' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  ok: 'success',
  overstock: 'info',
  inactive: 'default',
}

interface Row extends FeedStock {
  advice: Advice | null
  ratePerWeek: number | null
  /** Usage-based estimate for koker feeds; the shown amount when advice is on. */
  koker: KokerEstimate | null
}

/**
 * Amount to show. Koker feeds are usage driven: the estimate from the last
 * delivery minus fills, unless someone did count bags in a bin and that is higher.
 */
function shownAmount(row: Row): number {
  return row.koker ? Math.max(row.total, row.koker.onHand) : row.total
}

function StatusChip({ advice }: { advice: Advice }) {
  return <Chip size="small" label={STATUS_LABEL[advice.status]} color={CHIP_COLOR[advice.status]} variant={advice.status === 'ok' ? 'outlined' : 'filled'} />
}

/** Rows that may run out stand out; rows without stock step back. */
function emphasis(row: Row): 'critical' | 'warning' | 'empty' | 'none' {
  if (row.advice?.status === 'critical') return 'critical'
  if (row.advice?.status === 'warning') return 'warning'
  if (shownAmount(row) === 0) return 'empty'
  return 'none'
}

const ACCENT = { critical: 'error', warning: 'warning' } as const

function rowSx(row: Row, kind: 'list' | 'table'): SxProps<Theme> {
  const e = emphasis(row)
  const edge = kind === 'list' ? { borderLeft: '4px solid transparent', px: 1.5, mx: -1.5, width: 'calc(100% + 24px)' } : { '& td:first-of-type': { borderLeft: '4px solid transparent' } }
  if (e === 'critical' || e === 'warning') {
    return (t) => {
      const c = t.palette[ACCENT[e]].main
      return {
        ...edge,
        bgcolor: alpha(c, 0.1),
        ...(kind === 'list' ? { borderLeftColor: c } : { '& td:first-of-type': { borderLeft: `4px solid ${c}` } }),
      }
    }
  }
  if (e === 'empty') return { ...edge, opacity: 0.6 }
  return edge
}

function amountColor(row: Row): string | undefined {
  const e = emphasis(row)
  if (e === 'critical') return 'error.main'
  if (e === 'warning') return 'warning.main'
  if (e === 'empty') return 'text.disabled'
  return undefined
}

function kokerMeta(k: KokerEstimate, unit: Row['unit'], a: Advice): string {
  if (k.lastDeliveryMs === null) return 'geen levering in 12 weken'
  const ago = a.daysSinceDelivery !== null ? ` ${a.daysSinceDelivery} d geleden` : ''
  return `levering ${formatAmount(k.delivered)} ${unitLabel(unit, k.delivered)}${ago}`
}


/**
 * When it runs out. Bins are counted, so "op" is a fact; kokers and stables
 * are estimates, so the wording stays tentative.
 */
function runsOut(row: Row, a: Advice): string {
  if (a.dueInDays === null) return ''
  const rough = row.isKoker || row.inStable
  if (a.dueInDays <= 0) return rough ? 'mogelijk niet genoeg' : 'op'
  return rough ? `± ${a.dueInDays} dagen` : `nog ${a.dueInDays} dagen`
}

function adviceMeta(row: Row): string {
  const a = row.advice
  if (!a) return ''
  const parts: string[] = []
  if (row.ratePerWeek !== null) parts.push(`${formatAmount(row.ratePerWeek)} ${row.unit}/wk`)
  if (row.koker) parts.push(kokerMeta(row.koker, row.unit, a))
  else if (a.daysSinceDelivery !== null) parts.push(`levering ${a.daysSinceDelivery} d geleden`)
  const out = runsOut(row, a)
  if (out) parts.push(out)
  return parts.join(' · ')
}

export default function VoorraadPage() {
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const { orgId, roles } = useOrg()
  const { feeds, storages, storageTypes, items, loading, error } = useOrgData()
  const mayOrder = can(roles, 'order')
  /** Status and usage always show; ordering shows what to order. */
  const ordering = mayOrder
  const logs = useRecentLogs(orgId, ADVICE_WEEKS, true)

  // Reference moment for the advice, fixed for the life of the page.
  const [nowMs] = useState(() => Date.now())
  const schedule = useMemo(() => deliverySchedule(new Date(nowMs)), [nowMs])

  const rows = useMemo<Row[]>(() => {
    const base = stockPerFeed(feeds, storages, storageTypes, items)
    if (logs === null) return base.map((r) => ({ ...r, advice: null, ratePerWeek: null, koker: null }))
    const withAdvice = base.map((r) => {
      const ratePerWeek = consumptionPerWeek(logs, r.feedId, nowMs, ADVICE_WEEKS)
      const lastDelivery = logs.filter((l) => l.feedId === r.feedId && l.type === 'delivery').at(-1)
      const koker = r.isKoker ? estimateKokerStock(logs, r.feedId, nowMs, ratePerWeek) : null
      const advice = adviseFeed({
        stock: koker ? Math.max(r.total, koker.onHand) : r.total,
        ratePerWeek,
        isKoker: r.isKoker,
        lastDeliveryMs: koker ? koker.lastDeliveryMs : (lastDelivery?.timestampMs ?? null),
        nowMs,
        schedule,
      })
      return { ...r, advice, ratePerWeek, koker }
    })
    return withAdvice.sort(
      (a, b) =>
        STATUS_ORDER[a.advice!.status] - STATUS_ORDER[b.advice!.status] ||
        (a.advice!.dueInDays ?? 999) - (b.advice!.dueInDays ?? 999) ||
        a.order - b.order,
    )
  }, [feeds, storages, storageTypes, items, logs, schedule, nowMs])

  const visible = rows

  return (
    <Page title="Voorraad">
      <Stack spacing={2}>
        {error && <Alert severity="error">Kon de voorraad niet laden ({error}).</Alert>}
        {loading ? (
          <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : visible.length === 0 ? (
          <Typography color="text.secondary">{rows.length === 0 ? 'Nog geen voer in deze organisatie.' : 'Geen voer gevonden.'}</Typography>
        ) : wide ? (
          <Table size="small" aria-label="Voorraad per voer">
            <TableHead>
              <TableRow>
                <TableCell>Voer</TableCell>
                <TableCell align="right">Voorraad</TableCell>
                <TableCell align="right">Per week</TableCell>
                <TableCell>Status</TableCell>
                {ordering && <TableCell align="right">Bestellen</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.feedId} hover sx={rowSx(r, 'table')}>
                  <TableCell sx={{ fontWeight: 500 }}>{r.name}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: emphasis(r) === 'none' || emphasis(r) === 'empty' ? 400 : 700, color: amountColor(r) }}>
                    {r.koker ? '≈ ' : ''}{formatAmount(shownAmount(r))} {unitLabel(r.unit, shownAmount(r))}
                  </TableCell>
                  <TableCell align="right">{r.ratePerWeek !== null ? formatAmount(r.ratePerWeek) : ''}</TableCell>
                  <TableCell>
                    {r.advice && (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <StatusChip advice={r.advice} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {[r.koker ? kokerMeta(r.koker, r.unit, r.advice) : '', runsOut(r, r.advice)].filter(Boolean).join(' · ')}
                        </Typography>
                      </Stack>
                    )}
                  </TableCell>
                  {ordering && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: r.advice?.orderQty ? 700 : 400 }}>
                      {r.advice?.orderQty ? `${formatAmount(r.advice.orderQty)} ${unitLabel(r.unit, r.advice.orderQty)}` : ''}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <List disablePadding aria-label="Voorraad per voer">
            {visible.map((r) => (
              <ListItem key={r.feedId} divider disableGutters alignItems="flex-start" sx={[{ py: 1.25 }, rowSx(r, 'list') as never]}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography component="span" sx={{ fontWeight: 500 }}>
                        {r.name}
                      </Typography>
                      {r.advice && <StatusChip advice={r.advice} />}
                    </Stack>
                  }
                  secondary={r.advice ? adviceMeta(r) : ' '}
                  slotProps={{ secondary: { component: 'span' } }}
                  sx={{ my: 0, pr: 2 }}
                />
                <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 72 }}>
                  <Typography variant="h6" component="div" sx={{ lineHeight: 1.2, color: amountColor(r) }}>
                    {r.koker ? '≈ ' : ''}{formatAmount(shownAmount(r))}
                  </Typography>
                  {ordering && r.advice && r.advice.orderQty > 0 && (
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.main', fontWeight: 700 }}>
                      bestel {formatAmount(r.advice.orderQty)}
                    </Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Page>
  )
}
