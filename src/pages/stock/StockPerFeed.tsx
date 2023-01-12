import { useMemo } from 'react'
import { Stack, Chip, Card, CardActionArea, Grid, List, ListItem, ListItemSecondaryAction, ListItemText, Typography, CircularProgress, Icon, ButtonBase } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import CenteredContent from '../../components/CenteredContent'
import { Feed, Storage, useFeed, useStorages } from '../../hooks/firebase'

export default function StockPerFeed() {
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
