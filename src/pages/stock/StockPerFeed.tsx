import { Stack, Card, CardActionArea, Grid, List, ListItem, ListItemSecondaryAction, ListItemText, Typography, Icon, ButtonBase, Chip, useTheme, useMediaQuery } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { makeCollectionGroupQuery, useSubscribeCollection, useQuery, useDoc } from '../../hooks/firestore'

function FeedCard({ feed }: { feed: { name: string, id: string } }) {
  const location = useLocation()
  const navigate = useNavigate()
  const q = useMemo(() => makeCollectionGroupQuery<{ amount: number }>('items'), [])
  const { subscribeSnapshot } = useQuery<{ amount: number }>(q)
  const { get: getDoc } = useDoc()
  const [storages, setStorages] = useState<Array<{ amount: number, name: string, id: string, color?: string, type: 'shute' }>>([])
  const total = useMemo(() => storages.reduce((total, s) => total += s.amount, 0), [storages])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    const unsubscribe = subscribeSnapshot(async snapshot => {
      const promisses: Promise<{ amount: number, id: string, name: string, type: 'shute' }>[] = []
      snapshot.forEach(doc => {
        if (doc.id === feed.id) {
          promisses.push(new Promise(async resolve => {
            const storage = await getDoc(doc.ref.parent.parent?.path || '') as any
            resolve({ amount: doc.data().amount, ...storage })
          }))
        }
      })
      setStorages(await Promise.all(promisses))
    })
    return () => unsubscribe()
  }, [subscribeSnapshot, getDoc, feed.id])

  return <Card>
    <CardActionArea onClick={() => navigate(`/feed/${feed.id}`, { state: { referrer: location.pathname } })}>
      <List disablePadding sx={{ ...!isMobile && { height: 106 } }}>
        <ListItem>
          <ListItemText primary={<Typography gutterBottom>{feed.name}</Typography>} secondary={<Stack direction="row" spacing={1}>
            {storages.map(storage => <Chip key={storage.id} onClick={(e) => { e.stopPropagation(); navigate(`/stock/${storage.id}`) }} size="small" label={`${storage.name}${storage.type === 'shute' ? '' : ` (${storage.amount.toLocaleString()})`}`} sx={{ bgcolor: storage.color }} />)}
          </Stack>} disableTypography />
          <ListItemSecondaryAction><Typography variant="subtitle2">{`${total.toLocaleString()} stuks`}</Typography></ListItemSecondaryAction>
        </ListItem>
      </List>
    </CardActionArea>
  </Card>
}

export default function StockPerFeed() {
  const feeds = useSubscribeCollection<{ name: string }>('feeds')
  const location = useLocation()
  const navigate = useNavigate()

  // TODO: show search field on mobile?

  return <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
    {feeds.map(feed => <Grid key={feed.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
      <FeedCard feed={feed} />
    </Grid>)}
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card>
        <ButtonBase onClick={() => navigate('/feed/add', { state: { referrer: location.pathname } })} sx={{ p: 2, overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.secondary' }}>
          <Icon fontSize="large" color="inherit">add_circle</Icon>
          <Typography sx={{ mt: 2 }} color="inherit" variant="subtitle2">Voertype toevoegen</Typography>
        </ButtonBase>
      </Card>
    </Grid>
  </Grid>
}
