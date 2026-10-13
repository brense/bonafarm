import { Box, Typography } from '@mui/material'
import type { Unit } from '../../model/types.ts'
import HeatGrid from '../../stock/HeatGrid.tsx'
import { CardSurface } from '../../stock/SearchList.tsx'
import { formatAmount } from '../../stock/stock.ts'

const MONTH_NAMES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

interface Props {
  seasonality: (number | null)[]
  years: number[]
  unit: Unit
}

export default function SeasonCard({ seasonality, years, unit }: Props) {
  const known = seasonality.map((v, i) => ({ v, i })).filter((m): m is { v: number; i: number } => m.v !== null)
  const peak = known.length ? known.reduce((a, b) => (b.v > a.v ? b : a)) : null
  const low = known.length ? known.reduce((a, b) => (b.v < a.v ? b : a)) : null
  const range = years.length === 0 ? '' : years.length === 1 ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" component="h2">
          Seizoen
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
          Gemiddeld aantal {unit === 'baal' ? 'balen' : 'zakken'} per kalendermaand{range ? `, ${range}` : ''} · donker = meer
        </Typography>
        {peak && low ? (
          <>
            <HeatGrid rows={[{ year: 0, months: seasonality }]} unit={unit} rowLabel={() => 'gem.'} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Piek in {MONTH_NAMES[peak.i]} ({formatAmount(peak.v)}), dal in {MONTH_NAMES[low.i]} ({formatAmount(low.v)}).
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Nog geen volledig jaar aan gegevens.
          </Typography>
        )}
      </Box>
    </CardSurface>
  )
}
