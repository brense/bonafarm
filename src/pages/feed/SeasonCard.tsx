import { Box, Typography } from '@mui/material'
import type { Unit } from '../../model/types.ts'
import HeatGrid from '../../stock/HeatGrid.tsx'
import { CardSurface } from '../../stock/SearchList.tsx'

interface Props {
  seasonality: (number | null)[]
  years: number[]
  unit: Unit
}

export default function SeasonCard({ seasonality, years, unit }: Props) {
  const known = seasonality.filter((v) => v !== null)
  const range = years.length === 0 ? '' : years.length === 1 ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" component="h2">
          Seizoen
        </Typography>
        <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 1 }}>
          Gemiddeld aantal {unit === 'baal' ? 'balen' : 'zakken'} per kalendermaand{range ? `, ${range}` : ''} · donker = meer
        </Typography>
        {known.length > 0 ? (
          <HeatGrid rows={[{ year: 0, months: seasonality }]} unit={unit} showRowLabels={false} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Nog geen volledig jaar aan gegevens.
          </Typography>
        )}
      </Box>
    </CardSurface>
  )
}
