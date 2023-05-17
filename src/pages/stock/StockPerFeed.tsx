import { Stack, Typography, Icon, Chip, useTheme, useMediaQuery, Table, TableRow, TableCell, TableHead, TableBody, Box, IconButton, Button } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSubscribeCollection } from '../../hooks/firestore'
import { useQuery, makeCollectionGroupQuery, useFirestore } from 'firestore-react-hooks'

function useFeeds() {
  const firestore = useFirestore()
  const q = useMemo(() => makeCollectionGroupQuery<{ amount: number }>(firestore, 'items'), [firestore])
  const { subscribe } = useQuery<{ amount: number }>(q)
  const [items, setItems] = useState<Array<{ feedId: string, amount: number, storageId: string }>>([])
  const feeds = useSubscribeCollection<{ id: string, name: string, linkedStorageId: string }>('feeds')
  const storages = useSubscribeCollection<{ id: string, name: string, type: 'shute', color?: string, image?: string }>('storages')

  useEffect(() => {
    const unsubscribe = subscribe(async snapshot => {
      const items: Array<{ feedId: string, amount: number, storageId: string }> = []
      snapshot.forEach(doc => {
        items.push({ feedId: doc.id, amount: doc.data().amount, storageId: doc.ref.parent.parent?.id! })
      })
      setItems(items)
    })
    return () => unsubscribe()
  }, [subscribe])

  return useMemo(() => feeds.map(({ linkedStorageId, ...feed }) => {
    const inStorages = items.filter(i => i.feedId === feed.id).map(({ storageId, amount }) => ({ amount, ...storages.find(s => s.id === storageId)! }))
    return { ...feed, linkedStorage: storages.find(s => s.id === linkedStorageId), storages: inStorages, total: inStorages.reduce((t, i) => t += i.amount, 0) }
  }), [feeds, items, storages])
}

export default function StockPerFeed() {
  const feeds = useFeeds()
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // TODO: show search field on mobile?

  return <Table padding="normal" stickyHeader={true} size={isMobile ? 'small' : 'medium'} sx={{ mb: 8 }}>
    <TableHead>
      <TableRow>
        <TableCell>Voertype</TableCell>
        <TableCell align="right">Vooraad</TableCell>
        <TableCell colSpan={2}>&nbsp;</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {feeds.map(feed => <TableRow key={feed.id} hover onClick={() => navigate(`/feed/${feed.id}`)}>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{feed.name}</TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{feed.total.toLocaleString()} stuks</TableCell>
        <TableCell>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={1} flexWrap="wrap">
            {feed.storages.map((storage, k) => <Chip key={k} onClick={(e) => { e.stopPropagation(); navigate(`/stock/${storage.id}`) }} size="small" label={`${storage.name}${storage.type === 'shute' ? '' : ` (${storage.amount.toLocaleString()})`}`} sx={{ bgcolor: storage.color }} />)}
            {feed.linkedStorage && feed.linkedStorage.type === 'shute' && <Chip key={feed.linkedStorage.id} onClick={(e) => { e.stopPropagation(); navigate(`/stock/${feed.linkedStorage?.id}`) }} size="small" label={`${feed.linkedStorage.name}`} sx={{ bgcolor: feed.linkedStorage.color }} />}
          </Stack>
        </TableCell>
        <TableCell sx={{ width: '1px' }}>
          {isMobile ? <IconButton size="small" color="primary"><Icon fontSize="small">visibility</Icon></IconButton> : <Button size="small" sx={{ whiteSpace: 'nowrap' }}><Icon fontSize="small">visibility</Icon>&nbsp;&nbsp; Details</Button>}
        </TableCell>
      </TableRow>)}
      <TableRow hover>
        <TableCell colSpan={4} onClick={() => navigate('/feed/add', { state: { referrer: location.pathname } })} sx={{ cursor: 'pointer' }}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
            <Icon fontSize="small" color="inherit">add_circle</Icon>&nbsp;
            <Typography color="inherit" variant="subtitle2" component="span">Voertype toevoegen</Typography>
          </Box>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
}
