import { Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import type { Storage } from '../model/types.ts'
import { useOrgData } from '../org/useOrgData.ts'
import { formatAmount } from '../stock/stock.ts'
import Page from './Page.tsx'

interface Group {
  id: string
  name: string
  order: number
  storages: Array<Storage & { id: string }>
}

/** Storage-first entry for case 3: tap the bin, stable or koker you are standing at. */
export default function MuterenPage() {
  const { storages, storageTypes, storageGroups, feeds, items, loading } = useOrgData()
  const navigate = useNavigate()

  const groups = useMemo<Group[]>(() => {
    const byGroup = new Map<string, Group>()
    for (const [id, s] of storages) {
      if (s.status !== 'active') continue
      const g = storageGroups.get(s.groupId)
      const group = byGroup.get(s.groupId) ?? { id: s.groupId, name: g?.name ?? s.groupId, order: g?.order ?? 999, storages: [] }
      group.storages.push({ ...s, id })
      byGroup.set(s.groupId, group)
    }
    for (const g of byGroup.values()) g.storages.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'nl'))
    return [...byGroup.values()].sort((a, b) => a.order - b.order)
  }, [storages, storageGroups])

  const summary = (storageId: string, typeId: string): string => {
    if (storageTypes.get(typeId)?.behaviour === 'consumed') {
      const linked = [...feeds.entries()].filter(([, f]) => f.defaultStorageId === storageId && !f.hidden).map(([, f]) => f.name)
      return linked.length ? linked.join(' · ') : 'Geen voer gekoppeld'
    }
    const parts = [...items.values()]
      .filter((it) => it.storageId === storageId && it.amount > 0)
      .map((it) => `${feeds.get(it.feedId)?.name ?? it.feedId} ${formatAmount(it.amount)}`)
    return parts.length ? parts.join(' · ') : 'Leeg'
  }

  return (
    <Page title="Muteren">
      {loading ? (
        <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        <Typography color="text.secondary">Nog geen opslag in deze organisatie.</Typography>
      ) : (
        <Stack spacing={3}>
          {groups.map((g) => (
            <Box key={g.id}>
              {groups.length > 1 && (
                <Typography variant="overline" color="text.secondary" component="h2">
                  {g.name}
                </Typography>
              )}
              <Stack spacing={1}>
                {g.storages.map((s) => (
                  <Card key={s.id} variant="outlined" sx={{ borderLeft: s.color ? `6px solid ${s.color}` : undefined }}>
                    <CardActionArea onClick={() => navigate(`/muteren/${s.id}`)} sx={{ minHeight: 64 }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {s.name}
                          </Typography>
                          <Chip size="small" label={storageTypes.get(s.typeId)?.name ?? s.typeId} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {summary(s.id, s.typeId)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Page>
  )
}
