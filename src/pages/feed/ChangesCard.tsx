import { Box, Button, Divider, List, ListItem, ListItemText, Skeleton, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import type { Unit } from '../../model/types.ts'
import { CardSurface } from '../../stock/SearchList.tsx'
import type { FeedLog } from '../../stock/useFeedLogs.ts'
import { buildChanges } from './changes.ts'

interface Props {
  /** Ascending, as the hook returns them; null while loading. */
  logs: FeedLog[] | null
  unit: Unit
  nowMs: number
  storageName: (id: string) => string
}

const PAGE = 10

export default function ChangesCard({ logs, unit, nowMs, storageName }: Props) {
  const [shown, setShown] = useState(PAGE)
  const entries = useMemo(
    () => (logs ? buildChanges([...logs].reverse(), unit, storageName, nowMs) : null),
    [logs, unit, storageName, nowMs],
  )
  const [latest, ...rest] = entries ?? []
  const visible = rest.slice(0, shown - 1)
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h2">
          Wijzigingen
        </Typography>
        {entries === null ? (
          <Skeleton variant="rounded" height={90} sx={{ mt: 1 }} />
        ) : !latest ? (
          <Typography variant="body2" color="text.secondary">
            Nog geen wijzigingen.
          </Typography>
        ) : (
          <>
            <Box sx={{ mt: 1 }}>
              <Typography variant="h5" component="p">
                {latest.headline}
              </Typography>
              <Typography variant="body1">{latest.detail}</Typography>
              <Typography variant="body2" color="text.secondary">
                {latest.date}
              </Typography>
            </Box>
            {visible.length > 0 && <Divider sx={{ my: 1 }} />}
            <List dense disablePadding>
              {visible.map((e) => (
                <ListItem key={e.key} dense disableGutters>
                  <ListItemText
                    primary={`${e.headline} · ${e.detail}`}
                    secondary={e.date}
                    slotProps={{ primary: { noWrap: true, sx: { textOverflow: 'ellipsis' } } }}
                  />
                </ListItem>
              ))}
            </List>
            {rest.length > visible.length && (
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
