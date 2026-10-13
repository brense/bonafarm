import { Box, Stack, Typography } from '@mui/material'
import type { Unit } from '../../model/types.ts'
import { CardSurface } from '../../stock/SearchList.tsx'
import { formatAmount, unitLabel } from '../../stock/stock.ts'
import { dayMonth } from './format.ts'
import Track from './Track.tsx'

interface Props {
  years: { year: number; amount: number; partial: boolean }[]
  feedName: string
  unit: Unit
  nowMs: number
}

export default function YearsCard({ years, feedName, unit, nowMs }: Props) {
  const max = Math.max(...years.map((y) => y.amount), 0)
  const partial = years.find((y) => y.partial)
  const plural = unitLabel(unit, 2)
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" component="h2">
          Per jaar
        </Typography>
        <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 1 }}>
          {plural.charAt(0).toUpperCase() + plural.slice(1)} {feedName.toLowerCase()} per kalenderjaar
        </Typography>
        <Stack spacing={1}>
          {years.map((y) => (
            <Stack key={y.year} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ width: 44, fontVariantNumeric: 'tabular-nums' }}>
                {y.year}
                {y.partial ? '*' : ''}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Track fraction={max > 0 ? y.amount / max : 0} fillAlpha={y.partial ? 0.45 : 0.9} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(y.amount)}
              </Typography>
            </Stack>
          ))}
        </Stack>
        {partial && (
          <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 1 }}>
            * {partial.year} is t/m {dayMonth.format(nowMs)}; het jaar is nog niet af.
          </Typography>
        )}
      </Box>
    </CardSurface>
  )
}
