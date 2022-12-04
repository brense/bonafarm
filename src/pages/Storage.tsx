import { IconButton, Box, Alert, Button, ButtonBaseProps, Card, Stack, CardHeader, Divider, Grid, ButtonBase, Typography, List, BottomNavigation, ListItem, ListItemText, ListItemSecondaryAction, BottomNavigationAction, Icon, Paper, Snackbar, CircularProgress } from '@mui/material'
import { Timeline, TimelineItem, TimelineOppositeContent, TimelineContent, TimelineSeparator, TimelineDot, TimelineConnector } from '@mui/lab'
import { useState, useMemo, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStoragesQuery, useAddLogMutation, LogType } from '../graphql'
import moment from 'moment'
import 'moment/dist/locale/nl'
import CenteredContent from '../components/CenteredContent'
import { useAppBarContext } from '../App'
moment.locale('nl')

function BigButton({ children, color, size = 'large', ...rest }: ButtonBaseProps & { size?: 'large' | 'small' }) {
  return <ButtonBase {...rest} sx={{ flex: 1, py: size === 'large' ? 2 : 2.6, px: size === 'large' ? 1 : 0 }}>
    <Typography variant={size === 'large' ? 'h6' : 'subtitle2'} color={color}>{children}</Typography>
  </ButtonBase>
}

export default function Storage() {
  const { pathname } = useLocation()
  const { storageId } = useParams<{ storageId: string }>()
  const navigate = useNavigate()
  const { data, loading } = useStoragesQuery({ variables: { storageId }, fetchPolicy: 'no-cache' })
  const [addLog, { loading: adding }] = useAddLogMutation()
  const storage = useMemo(() => data?.storages ? data.storages[0] : { title: null, items: [], logs: [], canEmpty: false }, [data])
  const [moveItem, setMoveItem] = useState<{ amount: number, slug: string, title: string } | null>(null)

  useAppBarContext(() => ({ showLogo: false, children: storage?.title }), [storage])

  const handleMutation = useCallback(async (item: { amount: number, title: string, slug: string }) => {
    storageId && await addLog({ variables: { item: { storageId, ...item } }, refetchQueries: ['Storages'] })
    if (item.amount < 0) {
      setMoveItem(item)
    }
  }, [addLog, storageId])

  const handleMoveItem = useCallback(() => {
    navigate(`/stock/${storageId}/add`, { state: { item: { ...moveItem }, referer: `/stock/${storageId}` } })
    setMoveItem(null)
  }, [moveItem, storageId, navigate])

  const handleEmpty = useCallback(async () => {
    storageId && await addLog({ variables: { item: { storageId, type: LogType.Emptied } }, refetchQueries: ['Storages'] })
  }, [addLog, storageId])

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> : <>
    {storage.items.length > 0 && <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 2, pl: 2, flex: 1, width: '100%' }}>
      {storage.items.map(item => <Grid key={item.slug} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardHeader title={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="h5" noWrap>{item.title}</Typography><Typography variant="subtitle2" noWrap>{item.amount} stuks</Typography></Box>} disableTypography />
          <Divider />
          <Stack direction="row" justifyContent="space-evenly" alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
            <BigButton color="error" disabled={adding} onClick={() => handleMutation({ ...item, amount: -1 })}>-1</BigButton>
            <BigButton size="small" color="error" disabled={adding} onClick={() => handleMutation({ ...item, amount: -0.5 })}>-0,5</BigButton>
            <BigButton size="small" color="secondary" disabled={adding} onClick={() => handleMutation({ ...item, amount: +0.5 })}>+0,5</BigButton>
            <BigButton color="secondary" disabled={adding} onClick={() => handleMutation({ ...item, amount: +1 })}>+1</BigButton>
          </Stack>
        </Card>
      </Grid>)}
    </Grid>}
    {storage.logs.length > 0 && storage.items.length > 0 && <Divider>Laatste wijzigingen</Divider>}
    <Timeline>
      {storage.logs.map(item => <TimelineItem key={item.id}>
        <TimelineOppositeContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }}>
          <List disablePadding>
            <ListItem sx={{ textAlign: 'inherit' }}>
              <ListItemText primary={moment(Number(item.date)).format('ddd D MMM YYYY, H:mm:ss')} secondary={moment(Number(item.date)).fromNow()} primaryTypographyProps={{ component: 'code', fontFamily: 'Roboto Mono', fontSize: 14 }} />
            </ListItem>
          </List>
        </TimelineOppositeContent>
        <TimelineSeparator>
          <TimelineConnector />
          <TimelineDot variant={item.type === 'emptied' ? 'outlined' : 'filled'}>{item.type === 'emptied' && <Icon color="error">cancel</Icon>}</TimelineDot>
          <TimelineConnector />
        </TimelineSeparator>
        <TimelineContent sx={{ display: 'flex', alignItems: 'center' }}>
          <List disablePadding>
            <ListItem>
              {item.type === 'mutation' && item.amount && <Typography variant="subtitle2" textAlign="right" sx={{ mr: 2 }} color={item.amount > 0 ? 'secondary' : 'error'}>{item.amount > 0 && '+'}{item.amount}</Typography>}
              <ListItemText primary={item.type === 'emptied' ? 'Koker leeg gemaakt' : item.title} />
            </ListItem>
          </List>
        </TimelineContent>
      </TimelineItem>
      )}
    </Timeline>
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation showLabels={true}>
        <BottomNavigationAction onClick={() => navigate(`/stock/${storageId}/add`, { state: { referrer: pathname } })} label="Zak toevoegen" icon={<Icon>add_circle</Icon>} />
        {storage.canEmpty && <BottomNavigationAction onClick={() => handleEmpty()} label="Koker leegmaken" icon={<Icon>cancel</Icon>} />}
      </BottomNavigation>
    </Paper>
    <Snackbar open={Boolean(moveItem)} autoHideDuration={15000} sx={{ bottom: { xs: 56, sm: 16 } }} onClose={() => setMoveItem(null)}>
      <Alert severity="info" sx={{ width: '100%' }} action={<Box display="flex" alignItems="center"><Button color="inherit" size="small" onClick={handleMoveItem}>Ja</Button><IconButton color="inherit" onClick={() => setMoveItem(null)}><Icon fontSize="small">close</Icon></IconButton></Box>}>
        Wil je deze voorraad verplaatsen?
      </Alert>
    </Snackbar>
  </>
}
