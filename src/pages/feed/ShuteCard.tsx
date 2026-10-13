import { Box, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { CardSurface } from '../../stock/SearchList.tsx'
import { dayMonth, dayMonthYear } from './format.ts'

const DAY_MS = 86_400_000

interface Props {
  lastEmptiedMs: number | null
  avgDaysBetweenEmpties: number | null
  cycles: number
  fills: number
  lastFillMs: number | null
  nowMs: number
}

function Metric({ value, caption }: { value: string; caption: string }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={(t) => ({ alignItems: 'baseline', bgcolor: alpha(t.palette.primary.main, 0.06), borderRadius: '12px', p: 1.25 })}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, width: 112, flexShrink: 0 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {caption}
      </Typography>
    </Stack>
  )
}

export default function ShuteCard({ lastEmptiedMs, avgDaysBetweenEmpties, cycles, fills, lastFillMs, nowMs }: Props) {
  const daysAgo = lastEmptiedMs === null ? null : Math.floor((nowMs - lastEmptiedMs) / DAY_MS)
  const stale = daysAgo !== null && daysAgo > 365
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            Koker
          </Typography>
          {stale && <Chip size="small" color="warning" label="Lang niet leeggemaakt" />}
        </Stack>
        <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 1 }}>
          Bijvullen en leegmaken volgens de logboeken
        </Typography>
        <Stack spacing={1}>
          <Metric
            value={lastEmptiedMs === null ? '—' : dayMonthYear.format(lastEmptiedMs)}
            caption={lastEmptiedMs === null ? 'nog nooit leeggemaakt' : `laatst leeggemaakt (${daysAgo} dagen geleden)`}
          />
          <Metric
            value={avgDaysBetweenEmpties === null ? '—' : `±${Math.round(avgDaysBetweenEmpties)} dgn`}
            caption={avgDaysBetweenEmpties === null ? 'nog geen twee keer leeggemaakt' : 'gemiddeld tussen leegmaken'}
          />
          <Metric value={String(cycles)} caption="keer leeggemaakt" />
        </Stack>
        <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 1 }}>
          {lastFillMs === null ? 'Nog nooit bijgevuld.' : `${fills} keer bijgevuld, laatst ${dayMonth.format(lastFillMs)}.`}
        </Typography>
      </Box>
    </CardSurface>
  )
}
