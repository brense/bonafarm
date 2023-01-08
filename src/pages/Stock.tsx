import { useState, useEffect, useMemo } from 'react'
import { Stack, Chip, Card, CardActionArea, CardHeader, Divider, Grid, List, ListItem, ListSubheader, ListItemSecondaryAction, ListItemText, Typography, CircularProgress, Avatar, Box, BottomNavigation, Paper, BottomNavigationAction, Icon, ButtonBase, CardContent, useTheme, useMediaQuery, ListItemIcon } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import CenteredContent from '../components/CenteredContent'
import moment from 'moment'
import 'moment/dist/locale/nl'
import { Feed, Storage, useFeed, useStorages } from '../hooks/firebase'
import { isMutationLog, useLastEmptied, useLatestMutations } from '../hooks/firestore'
import { useIcon, useTitle } from '../App'
moment.locale('nl')

function StorageItemWithLogs({ storage }: { storage: Storage }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: feed } = useFeed()
  const logs = useLatestMutations(storage.id)
  const lastEmptied = useLastEmptied(storage.id)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Card>
    <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden' }}>
      <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{storage.image ? <img src={storage.image || ''} height={40} alt={storage.name} /> : ''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} />
      <Divider />
      <List disablePadding dense>
        <ListItem>
          <ListItemIcon><Icon color={lastEmptied ? 'inherit' : 'disabled'}>cancel</Icon></ListItemIcon>
          <ListItemText primary="Laatst geleegd" primaryTypographyProps={{ variant: 'subtitle2' }} secondary={lastEmptied ? moment(lastEmptied).fromNow() : 'Nooit'} />
        </ListItem>
      </List>
      <Divider />
      {logs.length > 0 && <List sx={{ flex: 1 }} subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Laatste wijziging</ListSubheader>} disablePadding dense>
        {logs.map(item => <ListItem key={item.id}>
          <ListItemText primary={!isMutationLog(item) ? 'Leeg gemaakt' : feed.find(f => f.id === item.feedId)?.name} secondary={moment(Number(item.date)).fromNow()} />
          {isMutationLog(item) && <ListItemSecondaryAction><Typography variant="subtitle2" color={item.amount > 0 ? 'primary' : 'error'}>{item.amount > 0 && '+'}{item.amount.toLocaleString()}</Typography></ListItemSecondaryAction>}
        </ListItem>)}
      </List>}
      <Box sx={{ height: '100%', visibility: 'hidden' }} />
    </CardActionArea>
  </Card>
}

function StorageItem({ storage }: { storage: Storage }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: feed } = useFeed()
  const items = useMemo(() => Object.keys(storage?.items || {}).map(feedId => {
    return {
      feed: feed.find(f => f.id === feedId),
      amount: storage?.items ? storage?.items[feedId].amount : 0
    }
  }, []), [storage, feed])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Card>
    <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden' }}>
      <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{/*storage.image ? <img src={storage.image || ''} height={96} alt={storage.title} /> : */''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} />
      <Divider />
      {!storage.canEmpty && items.length > 0 && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Inhoud</ListSubheader>} dense>
        {items.map((item, k) => <ListItem key={item.feed?.id || k}>
          <ListItemText primary={item.feed?.name} />
          <ListItemSecondaryAction><Typography variant="subtitle2">{item.amount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
        </ListItem>)}
      </List>}
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
        {storage.canEmpty ? <StorageItemWithLogs storage={storage} /> : <StorageItem storage={storage} />}
      </Grid>)}
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardActionArea onClick={() => navigate('/stock/add', { state: { referrer: location.pathname } })}>
            <CardContent sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.secondary' }}>
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
  const { data, loading: fLoading } = useFeed()
  const feeds = useMemo(() => {
    return data.map(f => ({ ...f, storages: storages.filter(s => !s.canEmpty && s.items && s.items[f.id]) }))
      .reduce((arr, f) => [...arr, { ...f, total: f.storages.reduce((total, s) => total += s.items ? s.items[f.id].amount : 0, 0) }], [] as Array<Feed & { storages: Storage[], total: number }>)
      .sort((a, b) => a.name > b.name ? 1 : b.name > a.name ? -1 : 0)
  }, [data, storages])
  const loading = useMemo(() => sLoading && fLoading, [sLoading, fLoading])
  const location = useLocation()
  const navigate = useNavigate()

  // TODO: show search field on mobile?

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> :
    <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
      {feeds.map(feed => <Grid key={feed.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardActionArea onClick={() => navigate(`/feed/${feed.id}`, { state: { referrer: location.pathname } })}>
            <List disablePadding sx={{ height: 106 }}>
              <ListItem>
                <ListItemText primary={<Typography gutterBottom>{feed.name}</Typography>} secondary={<Stack direction="row" spacing={1}>
                  {feed.storages.map(storage => <Chip key={storage.id} onClick={(e) => { e.stopPropagation(); navigate(`/stock/${storage.id}`) }} size="small" label={`${storage.name} (${storage.items && storage.items[feed.id].amount.toLocaleString()})`} sx={{ bgcolor: storage.color }} />)}
                </Stack>} disableTypography />
                <ListItemSecondaryAction><Typography variant="subtitle2">{feed.total.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  useTitle(isMobile ? 'Voorraad' : null)
  useIcon(isMobile ? 'chevron_left' : null)

  useEffect(() => {
    localStorage.setItem('stock-type', value)
  }, [value])

  return <>{value === 'storage' ? <StockPerStorage /> : <StockPerFeed />}
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation value={value} onChange={(e, v) => setValue(v)} showLabels={true} sx={{ bgcolor: 'rgba(0,0,0,0.6)' }}>
        <BottomNavigationAction value="storage" label="Per opslag" icon={<Icon>inventory_2</Icon>} />
        <BottomNavigationAction value="item" label="Per voer type" icon={<Icon>pets</Icon>} />
      </BottomNavigation>
    </Paper>
  </>
}
