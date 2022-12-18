import React, { useState, useMemo, useEffect } from 'react'
import { Stack, Chip, Card, CardActionArea, CardHeader, Divider, Grid, List, ListItem, ListSubheader, ListItemSecondaryAction, ListItemText, Typography, CircularProgress, Avatar, Box, BottomNavigation, Paper, BottomNavigationAction, Icon } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStoragesQuery } from '../graphql'
import CenteredContent from '../components/CenteredContent'
import { useAppBarContext } from '../App'
import moment from 'moment'
import 'moment/dist/locale/nl'
moment.locale('nl')

export default function Stock() {
  const [value, setValue] = useState<'storage' | 'item'>(localStorage.getItem('stock-type') as 'storage' || 'storage')
  const location = useLocation()
  const navigate = useNavigate()
  const { data, loading } = useStoragesQuery({ fetchPolicy: 'no-cache' })
  const perItem = useMemo(() => data?.storages.filter(s => s.items.length > 0).reduce((arr, storage) => {
    storage.items.forEach(item => {
      const index = arr.findIndex(a => a.slug === item.slug)
      if (index >= 0) {
        arr[index].storages.push(storage)
        arr[index].amount += item.amount
      } else {
        arr.push({ ...item, storages: [storage] })
      }
    })
    return arr
  }, [] as Array<{ slug: string, title: string, amount: number, storages: Array<{ id: string, title: string, color?: string | null, image?: string | null }> }>) || [], [data])

  useEffect(() => {
    localStorage.setItem('stock-type', value)
  }, [value])

  useAppBarContext(() => ({ showLogo: false, children: 'Voorraad' }))

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> : <>{value === 'storage' ?
    <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
      {data?.storages?.map(storage => <Grid key={storage.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} sx={{ height: 300, overflow: 'hidden' }}>
            <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{storage.image ? <img src={storage.image || ''} height={96} alt={storage.title} /> : ''}</Avatar>} title={storage.title} titleTypographyProps={{ variant: 'h6' }} />
            <Divider />
            {storage.items.length > 0 && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Inhoud</ListSubheader>} disablePadding>
              {storage.items.map(item => <ListItem key={item.slug}>
                <ListItemText primary={item.title} />
                <ListItemSecondaryAction><Typography variant="subtitle2">{item.amount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
              </ListItem>)}
            </List>}
            {storage.logs.length > 0 && storage.canEmpty && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Laatste wijzigingen</ListSubheader>} disablePadding dense>
              {storage.logs.map(item => <ListItem key={item.id}>
                <ListItemText primary={item.type === 'emptied' ? 'Leeg gemaakt' : item.title} secondary={moment(Number(item.date)).fromNow()} />
                {item.type === 'mutation' && item.amount && <ListItemSecondaryAction><Typography variant="subtitle2" color={item.amount > 0 ? 'secondary' : 'error'}>{item.amount > 0 && '+'}{item.amount.toLocaleString()}</Typography></ListItemSecondaryAction>}
              </ListItem>)}
            </List>}
            <Box sx={{ height: '100%', visibility: 'hidden' }} />
          </CardActionArea>
        </Card>
      </Grid>)}
    </Grid> :
    <List>
      {perItem.map(item => <React.Fragment key={item.slug}>
        <ListItem button onClick={() => navigate(`/feed/${item.slug}`, { state: { goBack: location.pathname } })}>
          <ListItemText primary={<Typography>{item.title}</Typography>} secondary={<Stack direction="row" spacing={1}>{item.storages.map(storage => <Chip onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} size="small" label={storage.title} key={storage.id} sx={{ bgcolor: storage.color }} />)}</Stack>} disableTypography />
          <ListItemSecondaryAction><Typography variant="subtitle2">{item.amount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
        </ListItem>
        <Divider component="li" />
      </React.Fragment>)}
    </List>}
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation value={value} onChange={(e, v) => setValue(v)} showLabels={true}>
        <BottomNavigationAction value="storage" label="Per opslag" icon={<Icon>grid_view</Icon>} />
        <BottomNavigationAction value="item" label="Per voer type" icon={<Icon>view_list</Icon>} />
      </BottomNavigation>
    </Paper>
  </>
}
