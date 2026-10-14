import { Box, Divider, Stack, Typography } from '@mui/material'
import type { Unit } from '../../model/types.ts'
import { CardSurface } from '../../stock/SearchList.tsx'
import { FeedRow } from '../../stock/FeedRow.tsx'
import { formatAmount, unitLabel } from '../../stock/stock.ts'
import Track from './Track.tsx'

export interface StorageRow {
  storageId: string
  name: string
  amount: number
}

interface Props {
  rows: StorageRow[]
  unit: Unit
  swipeMax?: number
  mayChange: boolean
  /** Signed: negative takes feed out, positive puts it in. */
  onChange: (storageId: string, signedDelta: number) => void
}

export default function StorageStockCard({ rows, unit, swipeMax, mayChange, onChange }: Props) {
  const shownRows = [...rows]
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'nl'))
  const max = Math.max(...shownRows.map((r) => r.amount), 0)
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          Voorraad
        </Typography>
        <Stack divider={<Divider />} spacing={1.25}>
          {shownRows.map((r) => (
            <Box key={r.storageId}>
              <Box sx={{ mx: -2 }}>
                <FeedRow
                  bare
                  surface="var(--row-surface)"
                  name={r.name}
                  active
                  detail={{ text: `${formatAmount(r.amount)} ${unitLabel(unit, r.amount)}`, color: r.amount === 0 ? 'text.disabled' : 'text.primary' }}
                  swipeMax={swipeMax}
                  maxMinus={r.amount}
                  minusDisabled={r.amount <= 0}
                  emptyLabel="Geen voorraad"
                  gesture={mayChange ? 'both' : 'none'}
                  onSwipe={(signed) => onChange(r.storageId, signed)}
                  onMinus={() => onChange(r.storageId, -1)}
                  onPlus={() => onChange(r.storageId, 1)}
                  below={
                    <Box sx={{ pt: 0.5, pb: 0.5 }}>
                      <Track fraction={max > 0 ? r.amount / max : 0} />
                    </Box>
                  }
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </CardSurface>
  )
}
