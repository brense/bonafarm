import { useTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import type { Unit } from '../../model/types.ts'
import { formatAmount, unitLabel } from '../../stock/stock.ts'

interface Props {
  labels: string[]
  values: number[]
  average: number | null
  unit: Unit
  highlightLast?: boolean
  /** Used in the accessible name, e.g. `Verbruik per maand, nov 2025 t/m okt 2026`. */
  title?: string
}

const W = 340
const H = 200
const LEFT = 26
const RIGHT = 6
const TOP = 18
const BOTTOM = 22
const GAP = 2

/** Plain inline-SVG bar chart with an optional dashed average line. */
export default function BarChart({ labels, values, average, unit, highlightLast = false, title = 'Verbruik' }: Props) {
  const theme = useTheme()
  const max = Math.max(1, ...values, average ?? 0)
  const plotW = W - LEFT - RIGHT
  const plotH = H - TOP - BOTTOM
  const slot = plotW / Math.max(1, values.length)
  const y = (v: number) => TOP + plotH - (v / max) * plotH
  const primary = theme.palette.primary.main
  const label = `${title}${average !== null ? `, gemiddeld ${formatAmount(average)} ${unitLabel(unit, average)}` : ''}`
  const last = values.length - 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: '100%', height: 'auto', maxHeight: 200, display: 'block' }}>
      {[0, max].map((v) => (
        <g key={v}>
          <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} stroke={theme.palette.divider} strokeWidth={1} />
          <text x={LEFT - 4} y={y(v) + 3} textAnchor="end" fontSize={11} fill={theme.palette.text.secondary}>
            {formatAmount(v)}
          </text>
        </g>
      ))}
      {values.map((v, i) => {
        const h = (v / max) * plotH
        const x = LEFT + i * slot + GAP / 2
        const hl = highlightLast && i === last
        return (
          <g key={labels[i]}>
            <rect x={x} y={y(v)} width={Math.max(1, slot - GAP)} height={h} rx={3} fill={hl ? primary : alpha(primary, 0.35)}>
              <title>{`${labels[i]}: ${formatAmount(v)} ${unitLabel(unit, v)}`}</title>
            </rect>
            {hl && (
              <text x={x + (slot - GAP) / 2} y={y(v) - 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={theme.palette.text.primary}>
                {formatAmount(v)}
              </text>
            )}
            <text x={x + (slot - GAP) / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={theme.palette.text.secondary}>
              {labels[i].split(' ')[0]}
            </text>
          </g>
        )
      })}
      {average !== null && (
        <g>
          <line x1={LEFT} x2={W - RIGHT} y1={y(average)} y2={y(average)} stroke={theme.palette.text.secondary} strokeWidth={1} strokeDasharray="4 3" />
          <text x={W - RIGHT} y={y(average) - 3} textAnchor="end" fontSize={11} fill={theme.palette.text.secondary}>
            {`gem. ${formatAmount(average)}`}
          </text>
        </g>
      )}
    </svg>
  )
}
