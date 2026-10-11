import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import RemoveIcon from '@mui/icons-material/Remove'
import { Box, Chip, IconButton, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatAmount } from './stock.ts'

const iconButtonSx = { width: 52, height: 52, border: 1, borderColor: 'divider' }

const SWIPE_STEPS: [number, number][] = [
  [180, 3],
  [130, 2],
  [80, 1],
  [40, 0.5],
]
const SWIPE_MAX = 200

/** Amount a horizontal drag of `distance` px stands for (0 below the threshold). */
function swipeAmount(distance: number): number {
  const d = Math.abs(distance)
  return SWIPE_STEPS.find(([min]) => d >= min)?.[1] ?? 0
}

/**
 * Horizontal swipe on a row: right = minus (negative), left = plus (positive). Vertical
 * movement before the threshold abandons the gesture so scrolling keeps working.
 */
function useSwipeAmount(onSwipe: (signedAmount: number) => void, allowMinus = true) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ id: number; x: number; y: number; locked: boolean } | null>(null)

  const finish = () => {
    start.current = null
    setDragging(false)
    setOffset(0)
  }

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('button')) return
      start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, locked: false }
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (!s.locked) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 40) {
          start.current = null
          return
        }
        if (Math.abs(dx) < 10) return
        s.locked = true
        setDragging(true)
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      setOffset(Math.max(-SWIPE_MAX, Math.min(allowMinus ? SWIPE_MAX : 0, dx)))
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture?.(e.pointerId)
      const amount = s.locked && (allowMinus || dx < 0) ? swipeAmount(dx) : 0
      finish()
      if (amount > 0) onSwipe(dx < 0 ? amount : -amount)
    },
    onPointerCancel: finish,
  }
  return { offset, dragging, handlers }
}

export function FeedRow({ name, active, detail, badge, minusDisabled, maxMinus = Infinity, maxPlus = Infinity, emptyLabel, plusOnly, onClear, onSwipe, onMinus, onPlus }: { name: string; active: boolean; minusDisabled?: boolean; badge?: string; maxMinus?: number; maxPlus?: number; emptyLabel?: string; plusOnly?: boolean; onClear?: () => void; detail?: { text: string; color: string }; onSwipe: (signed: number) => void; onMinus?: () => void; onPlus: () => void }) {
  const { offset, dragging, handlers } = useSwipeAmount(onSwipe, !plusOnly)
  const raw = swipeAmount(offset)
  const cap = offset > 0 ? maxMinus : maxPlus
  const label = raw === 0 ? '' : cap <= 0 ? (emptyLabel ?? '') : `${offset > 0 ? '−' : '+'}${formatAmount(Math.min(raw, cap))}`
  return (
    <ListItem disableGutters disablePadding divider sx={{ position: 'relative', overflow: 'hidden', display: 'block' }}>
      {offset !== 0 && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: offset > 0 ? 'flex-start' : 'flex-end',
            px: 2,
            bgcolor: offset > 0 ? 'error.main' : 'success.main',
            color: 'common.white',
            fontWeight: 700,
            fontSize: '1.4rem',
          }}
        >
          {label}
        </Box>
      )}
      <Box
        {...handlers}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          py: 0.5,
          bgcolor: 'background.default',
          touchAction: 'pan-y',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <ListItemText primary={name} sx={{ minWidth: 96 }} slotProps={{ primary: { sx: { fontWeight: active ? 700 : 400 } } }} />
        {badge && <Chip size="small" variant="outlined" label={badge} sx={{ mr: 1, flexShrink: 1, maxWidth: 96 }} />}
        {detail && (
          <Typography sx={{ fontWeight: 700, color: detail.color, mr: 1, whiteSpace: 'nowrap' }}>{detail.text}</Typography>
        )}
        {onClear && (
          <IconButton aria-label={`${name} wissen`} onClick={onClear} sx={{ width: 40, height: 40, mr: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {!plusOnly && (
            <IconButton aria-label={`${name} min`} disabled={minusDisabled} onClick={onMinus} sx={iconButtonSx}>
              <RemoveIcon />
            </IconButton>
          )}
          <IconButton aria-label={`${name} plus`} onClick={onPlus} sx={iconButtonSx}>
            <AddIcon />
          </IconButton>
        </Stack>
      </Box>
    </ListItem>
  )
}
