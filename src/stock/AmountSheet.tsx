import { useState } from 'react'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import Typography from '@mui/material/Typography'
import type { Unit } from '../model/types.ts'
import { formatAmount, unitLabel } from './stock.ts'

export type AmountMode = 'dispense' | 'count' | 'fill'

export interface AmountSheetProps {
  open: boolean
  mode: AmountMode
  /** Shown in the header, e.g. "Hooi" */
  feedName: string
  /** Second header line, e.g. "Geitenstal" */
  storageName: string
  unit: Unit
  /** Starting value; count mode starts at the current stock, the others at 1 */
  initial: number
  /** Current stock, shown in count mode as "nu 10 balen" and used by dispense to hint */
  current?: number
  onConfirm: (amount: number) => void
  onClose: () => void
}

const MODE_WORD: Record<AmountMode, string> = {
  dispense: 'Eruit halen',
  count: 'Tellen',
  fill: 'In de koker',
}

const CONFIRM_LABEL: Record<AmountMode, string> = {
  dispense: 'Eruit halen',
  count: 'Opslaan',
  fill: 'Vullen',
}

const PRESETS: { label: string; value: number }[] = [
  { label: '½', value: 0.5 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
]

const STEP = 0.5

export default function AmountSheet({
  open,
  mode,
  feedName,
  storageName,
  unit,
  initial,
  current,
  onConfirm,
  onClose,
}: AmountSheetProps) {
  const [amount, setAmount] = useState(initial)
  const [seen, setSeen] = useState({ open, initial, mode })
  if (seen.open !== open || seen.initial !== initial || seen.mode !== mode) {
    setSeen({ open, initial, mode })
    if (open) setAmount(initial)
  }

  const min = mode === 'count' ? 0 : STEP
  const label = unitLabel(unit, amount)
  const tooMany = mode === 'dispense' && current !== undefined && amount > current

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            pb: 'env(safe-area-inset-bottom)',
            maxHeight: '85dvh',
          },
        },
      }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack>
          <Typography variant="h6">{feedName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {storageName} · {MODE_WORD[mode]}
          </Typography>
        </Stack>

        <Stack spacing={0.5} sx={{ py: 2, alignItems: 'center' }}>
          <Typography variant="h3" component="p" sx={{ m: 0 }}>
            {`${formatAmount(amount)} ${label}`}
          </Typography>
          {mode === 'count' && current !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {`nu ${formatAmount(current)} ${unitLabel(unit, current)}`}
            </Typography>
          )}
          {tooMany && (
            <Typography variant="caption" color="warning.main">
              {`meer dan de ${formatAmount(current)} die er staan`}
            </Typography>
          )}
        </Stack>

        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1}>
            {PRESETS.map((p) => (
              <ToggleButton
                key={p.value}
                value={p.value}
                selected={amount === p.value}
                onChange={() => setAmount(p.value)}
                sx={{ flex: 1, minHeight: 56, fontSize: 18 }}
              >
                {p.label}
              </ToggleButton>
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              aria-label="Minder"
              sx={{ minHeight: 64, fontSize: 28, flex: 1 }}
              disabled={amount <= min}
              onClick={() => setAmount((a) => Math.max(min, a - STEP))}
            >
              −
            </Button>
            <Button
              variant="outlined"
              aria-label="Meer"
              sx={{ minHeight: 64, fontSize: 28, flex: 1 }}
              onClick={() => setAmount((a) => a + STEP)}
            >
              +
            </Button>
          </Stack>
          <Button
            variant="contained"
            size="large"
            fullWidth
            sx={{ minHeight: 56 }}
            disabled={mode !== 'count' && amount === 0}
            onClick={() => onConfirm(amount)}
          >
            {CONFIRM_LABEL[mode]}
          </Button>
          <Button fullWidth sx={{ minHeight: 56 }} onClick={onClose}>
            Annuleren
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}
