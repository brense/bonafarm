import { Box, Divider, Stack, Typography } from '@mui/material'
import type { Unit } from '../../model/types.ts'
import { CardSurface } from '../../stock/SearchList.tsx'
import { formatAmount, unitLabel } from '../../stock/stock.ts'
import Track from './Track.tsx'

export interface StorageRow {
  storageId: string
  name: string
  amount: number
  /** Weekly consumption out of this storage; null while the logs load. */
  ratePerWeek: number | null
}

interface Props {
  rows: StorageRow[]
  unit: Unit
}

export default function StorageStockCard({ rows, unit }: Props) {
  const max = Math.max(...rows.map((r) => r.amount), 0)
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h2">
          Voorraad
        </Typography>
        <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 1 }}>
          Per opslag, en hoe lang het bij het huidige verbruik duurt
        </Typography>
        <Stack divider={<Divider />} spacing={1.25}>
          {rows.map((r) => (
            <Box key={r.storageId}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {r.name}
                </Typography>
                <Typography variant="body2" component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(r.amount)} {unitLabel(unit, r.amount)}
                </Typography>
              </Stack>
              <Track fraction={max > 0 ? r.amount / max : 0} />
              {r.ratePerWeek !== null && (
                <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                  {r.ratePerWeek > 0
                    ? `nog ±${Math.round((r.amount / r.ratePerWeek) * 7)} dagen bij ${formatAmount(r.ratePerWeek)} ${unit}/week`
                    : 'geen verbruik uit deze opslag in 12 weken'}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Box>
    </CardSurface>
  )
}
