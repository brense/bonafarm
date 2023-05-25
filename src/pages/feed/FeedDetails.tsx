import { Alert, Avatar, Box, Button, Card, CardActionArea, CardHeader, DialogActions, DialogContent, Divider, Grid, Icon, List, ListItem, ListItemSecondaryAction, ListItemText, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Typography } from '@mui/material'
import { useLocation, useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { useSubscribeCollection, useSubscribeDoc } from '../../hooks/firestore'
import DialogAppbar from '../../components/DialogAppbar'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, makeCollectionGroupQuery, useFirestore, makeQuery } from 'firestore-react-hooks'
import { Timestamp, where, orderBy } from 'firebase/firestore'
import moment from 'moment'

type Feed = {
  name: string
  linkedStorageId: string
}

export default function FeedDetails() {
  const match = useMatch('/feed/:feedId/*')
  const feed = useSubscribeDoc<Feed>(`feeds/${match?.params.feedId}`)
  const storages = useSubscribeCollection<{ name: string, color?: string, image?: string, type: 'shute' }>('storages')
  const firestore = useFirestore()
  const q = useMemo(() => makeCollectionGroupQuery<{ amount: number }>(firestore, 'items'), [firestore])
  const { subscribe } = useQuery<{ amount: number }>(q)
  const qStats = useMemo(() => makeQuery<{ amount: number, timestamp: Timestamp, storageId: string }>(firestore, 'logs', where('feedId', '==', match?.params.feedId), orderBy('timestamp', 'desc')), [firestore, match])
  const { subscribe: subcribeStats } = useQuery<{ amount: number, timestamp: Timestamp, storageId: string }>(qStats)
  const navigate = useNavigate()
  const [feedStorages, setFeedStorages] = useState<Array<{ amount: number, name: string, id: string, color?: string }>>([])
  const { onClose } = useOutletContext<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>()
  const location = useLocation()
  const [logsPerDay, setLogsPerDay] = useState<Array<{ day: Date, amount: number }>>([])
  const [avaragePerWeek, setAvaragePerWeek] = useState<Array<{ week: Date, amount: number, avarage: number }>>([])
  const [selectedTab, setSelectedTab] = useState<'avarage' | 'mutations'>('avarage')

  useEffect(() => {
    const unsubscribe = subscribe(async snapshot => {
      const items: typeof feedStorages = []
      snapshot.forEach(doc => {
        doc.id === feed?.id && items.push({ amount: doc.data().amount, ...storages.find(s => s.id === doc.ref.parent.parent?.id)! })
      })
      setFeedStorages(items)
    })
    return () => unsubscribe()
  }, [subscribe, feed, storages])

  useEffect(() => {
    const unsubscribe = subcribeStats(async snapshot => {
      const logs: Array<{ amount: number, timestamp: Timestamp, storageId: string }> = []
      snapshot.forEach(doc => {
        logs.push(doc.data())
      })
      const linkedStorageType = storages.find(s => s.id === feed?.linkedStorageId)?.type || '' as 'shute'
      const usagePerWeek = logs.filter(l => (linkedStorageType === 'shute' && l.amount > 0 && l.storageId === feed?.linkedStorageId) || (linkedStorageType !== 'shute' && l.amount < 0 && storages.find(s => s.id === l.storageId)?.type !== 'shute')).reduce((perWeek, log) => {
        const logWeek = moment(log.timestamp.toDate()).startOf('week').unix() + '000'
        const index = perWeek.findIndex(w => w.week === logWeek)
        if (index >= 0) {
          perWeek[index].amount += -Math.abs(log.amount)
        } else {
          perWeek.push({ week: logWeek, amount: -Math.abs(log.amount) })
        }
        return perWeek
      }, [] as Array<{ week: string, amount: number }>).reverse()
      const weeks = moment(new Date()).diff(new Date(Number(usagePerWeek[0].week)), 'week')
      const perWeek: Array<{ week: Date, amount: number }> = []
      for (let i = 0; i <= weeks; i++) {
        const lastWeek = moment(new Date(Number(usagePerWeek[0].week))).add(i, 'week')
        const amount = usagePerWeek.find(w => w.week === lastWeek.toDate().getTime() + '')?.amount || 0
        perWeek.push({ week: moment(lastWeek).toDate(), amount })
      }
      const withAvarages = perWeek.map(({ week, amount }, k) => {
        let previous = 0
        for (let i = 0; i < k; i++) {
          previous += perWeek[i].amount
        }
        return { week, amount, avarage: Math.ceil((previous === 0 ? amount : (amount + previous) / (k + 1)) * 10) / 10 }
      }).reverse()
      setAvaragePerWeek(withAvarages)
      const logsPerDay = logs.reduce((logsPerDay, log) => {
        const dayTimestamp = moment(log.timestamp.toDate()).startOf('day').unix() + '000'
        const isShute = !!storages.find(s => s.id === log.storageId && s.type === 'shute')
        if (logsPerDay[dayTimestamp] && !isShute) {
          logsPerDay[dayTimestamp].amount += log.amount
        } else if (!isShute) {
          logsPerDay[dayTimestamp] = { amount: log.amount }
        }
        return logsPerDay
      }, {} as Record<string, { amount: number }>)
      setLogsPerDay(Object.keys(logsPerDay).map(k => ({ day: moment(Number(k)).toDate(), amount: logsPerDay[k].amount })).filter(l => l.amount !== 0))
    })
    return () => unsubscribe()
  }, [subcribeStats, match, storages, feed])

  const linkedStorage = useMemo(() => storages.find(s => s.id === feed?.linkedStorageId), [feed, storages])

  return <>
    <DialogAppbar onClose={onClose}>{feed?.name}</DialogAppbar>
    <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Alert severity="info" square sx={{ mb: 2 }}>Klik op een van de opslagen om de voorraad {feed?.name} aan te passen.</Alert>
      <Grid container alignContent="flex-start" spacing={2} sx={{ mb: 2, pl: 2, width: '100%' }}>
        {linkedStorage && linkedStorage.type === 'shute' && <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate(`/stock/${linkedStorage.id}`, { state: { goBack: location.pathname } })}>
              <CardHeader avatar={<Avatar variant="rounded" sx={{ background: 'none' }}>{linkedStorage.image ? <img src={linkedStorage.image || ''} height={40} alt={linkedStorage.name} /> : ''}</Avatar>} title="Gekoppelde opslag" titleTypographyProps={{ color: 'text.secondary' }} subheader={linkedStorage.name} subheaderTypographyProps={{ variant: 'h6', color: 'text.primary' }} />
            </CardActionArea>
          </Card>
        </Grid>}
        {feedStorages.map(storage => <Grid key={storage.id} item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })}>
              <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} subheader={`Voorraad: ${storage.amount.toLocaleString()} stuks`} />
            </CardActionArea>
          </Card>
        </Grid>)}
      </Grid>
      <Divider />
      <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
        <Tab label="Gemiddeld per week" value="avarage" />
        <Tab label="Wijzigingen per dag" value="mutations" />
      </Tabs>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 300 }}>
        {selectedTab === 'avarage' && <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Week</TableCell>
              <TableCell align="right">Verbruik</TableCell>
              <TableCell align="right">Gemiddeld</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {avaragePerWeek.map(({ week, amount, avarage }) => <TableRow key={week.getTime()}>
              <TableCell>{`${moment(week).format('W YYYY')}`}</TableCell>
              <TableCell align="right">{amount.toLocaleString()}</TableCell>
              <TableCell align="right">{avarage.toLocaleString()}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>}
        {selectedTab === 'mutations' && <List dense>
          {logsPerDay.map(({ day, amount }) => <ListItem key={day.getTime()}>
            <ListItemText primary={moment(day).format('ddd D MMM YYYY')} />
            <ListItemSecondaryAction><Typography variant="subtitle2" color={amount < 0 ? 'error' : 'primary'}>{`${amount > 0 ? '+' : ''}${amount.toLocaleString()}`}</Typography></ListItemSecondaryAction>
          </ListItem>)}
        </List>}
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => navigate(`/feed/${feed?.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Voertype bewerken</Button>
    </DialogActions>
  </>
}
