import { Card, CardActionArea, CardHeader, Divider, List, ListItem, ListItemSecondaryAction, ListItemText, Typography, Avatar, Box, Icon, useTheme, useMediaQuery, ListItemIcon } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { Storage } from '../../hooks/firebase'
import { isMutationLog, useLastEmptied, useLatestMutations } from '../../hooks/firestore'
import moment from 'moment'
import 'moment/dist/locale/nl'
moment.locale('nl')

export default function StorageCardWithLogs({ storage }: { storage: Storage }) {
  const location = useLocation()
  const navigate = useNavigate()
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
      {logs.length > 0 && <List disablePadding dense>
        <ListItem>
          <ListItemText inset primary="Laatste wijziging" primaryTypographyProps={{ variant: 'subtitle2' }} secondary={moment(Number(logs[0].date)).fromNow()} />
          <ListItemSecondaryAction><Typography variant="subtitle2" color={isMutationLog(logs[0]) && logs[0].amount > 0 ? 'primary' : 'error'}>{isMutationLog(logs[0]) && logs[0].amount > 0 && '+'}{isMutationLog(logs[0]) && logs[0].amount.toLocaleString()}</Typography></ListItemSecondaryAction>
        </ListItem>
      </List>}
      <Box sx={{ height: '100%', visibility: 'hidden' }} />
    </CardActionArea>
  </Card>
}
