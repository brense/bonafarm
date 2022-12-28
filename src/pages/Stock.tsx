import { useState, useEffect, useMemo } from 'react'
import { Stack, Chip, Card, CardActionArea, CardHeader, Divider, Grid, List, ListItem, ListSubheader, ListItemSecondaryAction, ListItemText, Typography, CircularProgress, Avatar, Box, BottomNavigation, Paper, BottomNavigationAction, Icon, ButtonBase, CardContent, useTheme, useMediaQuery } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import CenteredContent from '../components/CenteredContent'
import moment from 'moment'
import 'moment/dist/locale/nl'
import { Feed, Storage, useFeed, useStorages } from '../hooks/firebase'
moment.locale('nl')

type Item = {
  itemId: string
  feed?: Feed
  amount: number
}

function StorageItem({ storage }: { storage: Storage }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: feed } = useFeed()
  const items = useMemo(() => Object.keys(storage?.items || {}).reduce((arr: Item[], key) => {
    if (storage?.items && storage.items[key]) {
      const index = arr.findIndex(item => storage?.items && item.feed?.id === storage?.items[key].feedId)
      index >= 0 ? arr[index].amount += storage.items[key].amount : arr.push({ itemId: key, feed: feed.find(f => storage?.items && f.id === storage.items[key].feedId) as Feed, amount: storage.items[key].amount })
    }
    return arr
  }, []), [storage, feed])
  return <Card>
    <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} sx={{ height: 240, overflow: 'hidden' }}>
      <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{/*storage.image ? <img src={storage.image || ''} height={96} alt={storage.title} /> : */''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} />
      <Divider />
      {!storage.canEmpty && items.length > 0 && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Inhoud</ListSubheader>} disablePadding dense>
        {items.map(item => <ListItem key={item.itemId}>
          <ListItemText primary={item.feed?.name} />
          <ListItemSecondaryAction><Typography variant="subtitle2">{item.amount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
        </ListItem>)}
      </List>}
      {/*storage.logs.length > 0 && storage.canEmpty && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Laatste wijzigingen</ListSubheader>} disablePadding dense>
    {storage.logs.map(item => <ListItem key={item.id}>
      <ListItemText primary={item.type === 'emptied' ? 'Leeg gemaakt' : item.title} secondary={moment(Number(item.date)).fromNow()} />
      {item.type === 'mutation' && item.amount && <ListItemSecondaryAction><Typography variant="subtitle2" color={item.amount > 0 ? 'primary' : 'error'}>{item.amount > 0 && '+'}{item.amount.toLocaleString()}</Typography></ListItemSecondaryAction>}
    </ListItem>)}
    </List>*/}
      <Box sx={{ height: '100%', visibility: 'hidden' }} />
    </CardActionArea>
  </Card>
}

function StockPerStorage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: storages, loading } = useStorages()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> :
    <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
      {storages.map(storage => <Grid key={storage.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <StorageItem storage={storage} />
      </Grid>)}
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardActionArea onClick={() => navigate('/stock/add', { state: { referrer: location.pathname } })}>
            <CardContent sx={{ height: !isMobile ? 240: undefined, overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.secondary' }}>
              <Icon fontSize="large" color="inherit">add_circle</Icon>
              <Typography sx={{ mt: 2 }} color="inherit" variant="subtitle2">Opslag toevoegen</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>
    </Grid>
}

function StockPerFeed() {
  const { data: storages, loading: sLoading } = useStorages()
  const { data: feeds, loading: fLoading } = useFeed()
  const loading = useMemo(() => sLoading && fLoading, [sLoading, fLoading])
  const location = useLocation()
  const navigate = useNavigate()

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> :
    <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
      {feeds.map(feed => <Grid key={feed.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardActionArea onClick={() => navigate(`/feed/${feed.id}`, { state: { referrer: location.pathname } })}>
            <List disablePadding>
              <ListItem>
                <ListItemText primary={<Typography>{feed.name}</Typography>} secondary={<Stack direction="row" spacing={1}><Chip onClick={(e) => { e.stopPropagation(); navigate(`/stock`) }} size="small" label="Ton Geel (2)" sx={{ bgcolor: '#999000' }} /></Stack>} disableTypography />
                <ListItemSecondaryAction><Typography variant="subtitle2">2 stuks</Typography></ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardActionArea>
        </Card>
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

export default function Stock() {
  const [value, setValue] = useState<'storage' | 'item'>(localStorage.getItem('stock-type') as 'storage' || 'storage')

  useEffect(() => {
    localStorage.setItem('stock-type', value)
  }, [value])

  return <>{value === 'storage' ? <StockPerStorage /> : <StockPerFeed />}
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation value={value} onChange={(e, v) => setValue(v)} showLabels={true} sx={{ bgcolor: 'rgba(0,0,0,0.6)' }}>
        <BottomNavigationAction value="storage" label="Per opslag" icon={<Icon>grid_view</Icon>} />
        <BottomNavigationAction value="item" label="Per voer type" icon={<Icon>view_list</Icon>} />
      </BottomNavigation>
    </Paper>
  </>
}
