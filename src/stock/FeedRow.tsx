import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import RemoveIcon from '@mui/icons-material/Remove'
import { Box, Chip, IconButton, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatAmount } from './stock.ts'

const denseButtonSx = { width: 40, height: 40, '& svg': { fontSize: 24 } }
const iconButtonSx = { width: 48, height: 48, '& svg': { fontSize: 28, stroke: 'currentColor', strokeWidth: 1.5 } }

const SWIPE_MIN = 40
const DEFAULT_SWIPE_MAX = 3

/** Drag distance at which the maximum amount is reached. */
function swipeFar(): number {
  return Math.max(SWIPE_MIN + 40, Math.min(260, (typeof window === 'undefined' ? 400 : window.innerWidth) - 120))
}

/**
 * Amount a horizontal drag of `distance` px stands for: 0 below the 40px threshold, then
 * linear up to `max` at the far point; below 1 the only step is 0,5, from 1 upward whole numbers.
 */
function swipeAmount(distance: number, max: number): number {
  const d = Math.abs(distance)
  if (d < SWIPE_MIN) return 0
  const t = Math.min(1, (d - SWIPE_MIN) / (swipeFar() - SWIPE_MIN))
  const raw = 0.5 + t * (max - 0.5)
  if (raw < 0.75) return 0.5
  return Math.min(max, Math.max(1, Math.round(raw)))
}

/**
 * Horizontal swipe on a row: right = minus (negative), left = plus (positive). Vertical
 * movement before the threshold abandons the gesture so scrolling keeps working.
 */
function useSwipeAmount(onSwipe: (signedAmount: number) => void, allowMinus = true, allowPlus = true, max = DEFAULT_SWIPE_MAX) {
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
      setOffset(Math.max(allowPlus ? -swipeFar() : 0, Math.min(allowMinus ? swipeFar() : 0, dx)))
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture?.(e.pointerId)
      const amount = s.locked && (dx > 0 ? allowMinus : allowPlus) ? swipeAmount(dx, max) : 0
      finish()
      if (amount > 0) onSwipe(dx < 0 ? amount : -amount)
    },
    onPointerCancel: finish,
  }
  return { offset, dragging, handlers }
}

export function FeedRow({ name, active, detail, badge, minusDisabled, maxMinus = Infinity, maxPlus = Infinity, emptyLabel, gesture = 'both', secondary, dense, swipeMax = DEFAULT_SWIPE_MAX, bare, surface = 'background.default', onClear, onSwipe, onMinus, onPlus }: { name: string; active: boolean; minusDisabled?: boolean; badge?: string; maxMinus?: number; maxPlus?: number; emptyLabel?: string; /** Small second line under the name, e.g. current stock. */ secondary?: string; /** Largest amount a full swipe stands for. */ swipeMax?: number; /** Render as a plain div (the caller supplies the list item). */ bare?: boolean; /** Background colour that covers the swipe backdrop. */ surface?: string; /** Which buttons and swipe direction the row reacts to. */ gesture?: 'minus' | 'plus' | 'both' | 'none'; /** Compact variant for sub items: small grey name, 40px buttons. */ dense?: boolean; onClear?: () => void; detail?: { text: string; color: string }; onSwipe: (signed: number) => void; onMinus?: () => void; onPlus?: () => void }) {
  const { offset, dragging, handlers } = useSwipeAmount(onSwipe, gesture === 'minus' || gesture === 'both', gesture === 'plus' || gesture === 'both', swipeMax)
  const raw = swipeAmount(offset, swipeMax)
  const cap = offset > 0 ? maxMinus : maxPlus
  const label = raw === 0 ? '' : cap <= 0 ? (emptyLabel ?? '') : `${offset > 0 ? '−' : '+'}${formatAmount(Math.min(raw, cap))}`
  return (
    <ListItem component={bare ? 'div' : 'li'} disableGutters disablePadding divider={!bare} sx={{ position: 'relative', overflow: 'hidden', display: 'block', ...(bare && { width: '100%', flex: '1 1 auto', px: 0 }) }}>
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
          py: dense ? 0 : 0.5,
          px: bare ? 2 : 0,
          bgcolor: surface,
          touchAction: 'pan-y',
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <ListItemText
          primary={name}
          secondary={secondary}
          sx={{ minWidth: 96 }}
          slotProps={{ primary: { variant: dense ? 'body2' : undefined, sx: { fontWeight: active ? 700 : 400, color: dense ? 'text.secondary' : undefined } }, secondary: { sx: { fontSize: '0.75rem', color: 'text.secondary' } } }}
        />
        {badge && <Chip size="small" variant="outlined" label={badge} sx={{ mr: 1, flexShrink: 1, maxWidth: 96 }} />}
        {detail && (
          <Typography variant={dense ? 'body2' : undefined} sx={{ fontWeight: 700, color: detail.color, mr: 1, whiteSpace: 'nowrap' }}>{detail.text}</Typography>
        )}
        {onClear && (
          <IconButton aria-label={`${name} wissen`} onClick={onClear} sx={{ width: 40, height: 40, mr: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {(gesture === 'minus' || gesture === 'both') && (
            <IconButton aria-label={`${name} min`} color="secondary" disabled={minusDisabled} onClick={onMinus} sx={dense ? denseButtonSx : iconButtonSx}>
              <RemoveIcon />
            </IconButton>
          )}
{(gesture === 'plus' || gesture === 'both') && (
                      <IconButton aria-label={`${name} plus`} color="primary" onClick={onPlus} sx={dense ? denseButtonSx : iconButtonSx}>
            <AddIcon />
          </IconButton>
          )}
        </Stack>
      </Box>
    </ListItem>
  )
}
