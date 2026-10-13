import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Unit } from '../model/types.ts'
import type { YearRow } from './consumption.ts'
import { MONTHS } from './months.ts'
import { formatAmount, unitLabel } from './stock.ts'


interface Props {
  rows: YearRow[]
  unit: Unit
}

/** Months as a small heat grid: one row per year, darker is more consumption. */
export default function HeatGrid({ rows, unit }: Props) {
  const max = Math.max(1, ...rows.flatMap((r) => r.months.filter((m): m is number => m !== null)))
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto repeat(12, 1fr)', gap: 0.5, alignItems: 'center' }}>
      <Box />
      {MONTHS.map((m) => (
        <Typography key={m} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem' }}>
          {m}
        </Typography>
      ))}
      {rows.map((row) => [
        <Typography key={`y${row.year}`} variant="caption" sx={{ pr: 0.5 }}>
          {row.year}
        </Typography>,
        ...row.months.map((value, i) => {
          const label = value === null ? `${MONTHS[i]} ${row.year}` : `${MONTHS[i]} ${row.year}: ${formatAmount(value)} ${unitLabel(unit, value)}`
          return (
            <Box
              key={`${row.year}-${i}`}
              role="img"
              aria-label={label}
              title={label}
              sx={[
                {
                  aspectRatio: '1 / 1',
                  minHeight: 24,
                  borderRadius: 1,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.7rem',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'text.primary',
                },
                value === null
                  ? { border: '1px dashed', borderColor: 'divider' }
                  : (t) => ({ bgcolor: alpha(t.palette.primary.main, 0.12 + (0.78 * value) / max) }),
              ]}
            >
              {value !== null && value !== 0 ? formatAmount(value) : null}
            </Box>
          )
        }),
      ])}
    </Box>
  )
}
