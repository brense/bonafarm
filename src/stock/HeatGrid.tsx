import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Unit } from '../model/types.ts'
import type { YearRow } from './consumption.ts'
import { MONTHS } from './months.ts'
import { formatAmount, unitLabel } from './stock.ts'


function compact(v: number): string {
  return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)
}

interface Props {
  rows: YearRow[]
  unit: Unit
  rowLabel?: (year: number) => string
  showRowLabels?: boolean
}

/** Months as a small heat grid: one row per year, darker is more consumption. */
export default function HeatGrid({ rows, unit, rowLabel = String, showRowLabels = true }: Props) {
  const max = Math.max(1, ...rows.flatMap((r) => r.months.filter((m): m is number => m !== null)))
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: showRowLabels ? 'auto repeat(12, 1fr)' : 'repeat(12, minmax(0, 1fr))', gap: 0.5, alignItems: 'center' }}>
      {showRowLabels && <Box />}
      {MONTHS.map((m) => (
        <Typography key={m} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
          {m}
        </Typography>
      ))}
      {rows.map((row) => [
        showRowLabels ? (
          <Typography key={`y${row.year}`} variant="caption" sx={{ pr: 0.5 }}>
            {rowLabel(row.year)}
          </Typography>
        ) : null,
        ...row.months.map((value, i) => {
          const name = showRowLabels ? `${MONTHS[i]} ${rowLabel(row.year)}` : MONTHS[i]
          const label = value === null ? name : `${name}: ${formatAmount(value)} ${unitLabel(unit, value)}`
          return (
            <Box
              key={`${row.year}-${i}`}
              role="img"
              aria-label={label}
              title={label}
              sx={[
                {
                  height: 44,
                  minWidth: 0,
                  overflow: 'hidden',
                  borderRadius: 1,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.75rem',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'text.primary',
                },
                value === null
                  ? { border: '1px dashed', borderColor: 'divider' }
                  : (t) => ({ bgcolor: alpha(t.palette.primary.main, 0.12 + (0.78 * value) / max) }),
              ]}
            >
              {value !== null && value !== 0 ? compact(value) : null}
            </Box>
          )
        }),
      ])}
    </Box>
  )
}
