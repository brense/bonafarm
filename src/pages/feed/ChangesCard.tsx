import { Box, Button, Skeleton, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import type { Unit } from '../../model/types.ts'
import { CardSurface } from '../../stock/SearchList.tsx'
import type { FeedLog } from '../../stock/useFeedLogs.ts'
import { buildChanges, type ChangeKind } from './changes.ts'

interface Props {
  /** Ascending, as the hook returns them; null while loading. */
  logs: FeedLog[] | null
  unit: Unit
  nowMs: number
  storageName: (id: string) => string
}

const PAGE = 10

const DOT_COLOR: Record<ChangeKind, string> = {
  added: 'success.main',
  consumed: 'text.secondary',
  empty: 'warning.main',
  move: 'info.main',
  count: 'text.secondary',
}

export default function ChangesCard({ logs, unit, nowMs, storageName }: Props) {
  const [shown, setShown] = useState(PAGE)
  const entries = useMemo(
    () => (logs ? buildChanges([...logs].reverse(), unit, storageName, nowMs) : null),
    [logs, unit, storageName, nowMs],
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
                const color = DOT_COLOR[e.kind]
                return (
                  <Box component="li" key={e.key} sx={{ display: 'flex', gap: 1.5 }}>
                    <Box sx={{ width: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          mt: first ? 1.25 : 0.75,
                          boxSizing: 'border-box',
                          borderRadius: '50%',
                          border: 2,
                          borderColor: color,
                          bgcolor: first ? color : 'transparent',
                        }}
                      />
                      {!last && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider' }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, pb: 2 }}>
                      {first ? (
                        <>
                          <Typography variant="h5" component="p">
                            {e.headline}
                          </Typography>
                          <Typography variant="body1">{e.detail}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {e.date}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="body1" component="p" sx={{ fontWeight: 500 }}>
                            {e.headline}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {e.detail ? `${e.detail} · ${e.date}` : e.date}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
            {entries.length > shown && (
              <Button variant="text" onClick={() => setShown((n) => n + PAGE)}>
                Meer…
              </Button>
            )}
          </>
        )}
      </Box>
    </CardSurface>
  )
}
