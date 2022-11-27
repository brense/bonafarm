import { Card, Stack, CardHeader, Divider, Grid, ButtonBase, Typography, List, BottomNavigation, ListItem, ListItemText, ListItemSecondaryAction, BottomNavigationAction, Icon, Paper } from '@mui/material'
import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStoragesQuery } from '../graphql'
import moment from 'moment'
import 'moment/dist/locale/nl'
moment.locale('nl')

export default function Storage() {
  const [value, setValue] = useState(null)
  const { pathname } = useLocation()
  const { storageId } = useParams<{ storageId?: string }>()
  const navigate = useNavigate()
  const { data } = useStoragesQuery({ variables: { storageId } })
  const storage = useMemo(() => data?.storages ? data.storages[0] : { items: [], logs: [], canEmpty: false }, [data])

  useEffect(() => {
    if (value === 'adding' && pathname !== '/stock/add') {
      navigate('/stock/add', { state: { referrer: pathname } })
      setValue(null)
    }
  }, [value, pathname, navigate])

  return <>
    {storage.items.length > 0 && <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 2, pl: 2, flex: 1, width: '100%' }}>
      {storage.items.map(item => <Grid key={item.slug} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardHeader title={item.title} />
          <Divider />
          <Stack direction="row" justifyContent="space-evenly" alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
            <ButtonBase sx={{ flex: 1, py: 2 }}>
              <Typography variant="h6" color="error">-1</Typography>
            </ButtonBase>
            <Typography sx={{ flex: 1, textAlign: 'center' }}>{item.amount} stuks</Typography>
            <ButtonBase sx={{ flex: 1, py: 2 }}>
              <Typography variant="h6" color="primary">+1</Typography>
            </ButtonBase>
          </Stack>
        </Card>
      </Grid>)}
    </Grid>}
    {storage.logs.length > 0 && <Divider>Laatste wijzigingen</Divider>}
    <List disablePadding dense sx={{ maxWidth: 600, mb: 7 }}>
      {storage.logs.map(item => <ListItem key={item.id}>
        <ListItemText primary={item.type === 'emptied' ? 'Leeg gemaakt' : item.title} secondary={moment(Number(item.date)).fromNow()} />
        {item.type === 'mutation' && item.amount && <ListItemSecondaryAction><Typography variant="subtitle2" color={item.amount > 0 ? 'primary' : 'error'}>{item.amount > 0 && '+'}{item.amount}</Typography></ListItemSecondaryAction>}
      </ListItem>)}
    </List>
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation showLabels={true} value={value} onChange={(e, v) => setValue(v === value ? null : v)}>
        <BottomNavigationAction value="adding" label="Item toevoegen" icon={<Icon>add_circle</Icon>} />
        {storage.canEmpty && <BottomNavigationAction value="editing" label="Leegmaken" icon={<Icon>cancel</Icon>} />}
      </BottomNavigation>
    </Paper>
  </>
}
