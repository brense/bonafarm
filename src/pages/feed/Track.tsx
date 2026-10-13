import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'

interface Props {
  /** 0..1 */
  fraction: number
  fillAlpha?: number
}

/** A thin horizontal bar: the share of the maximum. */
export default function Track({ fraction, fillAlpha = 0.9 }: Props) {
  return (
    <Box sx={(t) => ({ height: 10, borderRadius: 5, bgcolor: alpha(t.palette.primary.main, 0.15), overflow: 'hidden' })}>
      <Box sx={(t) => ({ height: '100%', width: `${Math.max(0, Math.min(1, fraction)) * 100}%`, borderRadius: 5, bgcolor: alpha(t.palette.primary.main, fillAlpha) })} />
    </Box>
  )
}
