import CheckIcon from '@mui/icons-material/Check'
import { Box, Button, Skeleton, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { formatAmount } from '../stock.ts'
import { CardSurface } from '../SearchList.tsx'
import { buildChanges, type ChangeLog, type Perspective } from './changes.ts'
import { changeDateTime, relativeTime } from './format.ts'

interface Props {
  /** Newest first; null while loading. */
  logs: ChangeLog[] | null
  /** Only used to format the dates. */
  nowMs: number
  perspective: Perspective
  /** For lists that fetch more themselves once everything loaded is shown. */
  loadMore?: { available: boolean; load: () => void }
}

const PAGE = 10
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SIGN_COLOR = { '+': 'primary.main', '−': 'error.main', '': 'text.primary' } as const

export default function ChangesTimeline({ logs, nowMs, perspective, loadMore }: Props) {
  const [shown, setShown] = useState(PAGE)
  const entries = useMemo(
    () => (logs ? buildChanges(logs, perspective) : null),
    [logs, perspective],
  )
  const visible = (entries ?? []).slice(0, shown)
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h2">
          Wijzigingen
        </Typography>
        {entries === null ? (
          <Skeleton variant="rounded" height={90} sx={{ mt: 1 }} />
        ) : entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nog geen wijzigingen.
          </Typography>
        ) : (
          <>
            <Box component="ol" aria-label="Wijzigingen" sx={{ listStyle: 'none', m: 0, mt: 1, p: 0 }}>
              {visible.map((e, i) => {
                const first = i === 0
                const last = i === visible.length - 1
                const done = e.kind === 'empty'
                return (
                  <Box component="li" key={e.key} sx={{ display: 'flex', alignItems: 'center', minHeight: 56 }}>
                    <Box sx={{ width: 112, flexShrink: 0, textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontFamily: MONO }}>
                        {e.timestampMs === null ? 'wordt opgeslagen…' : changeDateTime(e.timestampMs, nowMs)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {e.timestampMs === null ? '' : relativeTime(e.timestampMs, nowMs)}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 40, flexShrink: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box sx={{ width: 2, flex: 1, bgcolor: first ? 'transparent' : 'divider' }} />
                      {done ? (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            boxSizing: 'border-box',
                            borderRadius: '50%',
                            border: 2,
                            borderColor: 'success.main',
                            color: 'success.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckIcon fontSize="small" />
                        </Box>
                      ) : (
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'action.active' }} />
                      )}
                      <Box sx={{ width: 2, flex: 1, bgcolor: last ? 'transparent' : 'divider' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, py: 1 }}>
                      <Typography variant="body1" component="p">
                        {e.amount !== null && (
                          <Box component="span" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: SIGN_COLOR[e.sign], mr: 0.75 }}>
                            {`${e.sign}${formatAmount(e.amount)}`}
                          </Box>
                        )}
                        <span>{e.names}</span>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {e.label}
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
            {(entries.length > shown || loadMore?.available) && (
              <Button variant="text" onClick={() => (entries.length > shown ? setShown((n) => n + PAGE) : loadMore?.load())}>
                Meer…
              </Button>
            )}
          </>
        )}
      </Box>
    </CardSurface>
  )
}
