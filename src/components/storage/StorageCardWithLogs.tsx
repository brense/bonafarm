import { Card, CardActionArea, CardHeader, Divider, List, ListItem, ListItemSecondaryAction, ListItemText, Typography, Avatar, Box, Icon, useTheme, useMediaQuery, ListItemIcon } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLastEmptiedOrEmptying, useLatestMutations } from '../../hooks/firestore'
import moment from 'moment'
import 'moment/dist/locale/nl'
import { isMutationLog } from '../../types'
moment.locale('nl')

export default function StorageCardWithLogs({ storage }: { storage: { id: string, name: string, image?: string, status?: 'emptying' } }) {
  const location = useLocation()
  const navigate = useNavigate()
  const logs = useLatestMutations(storage.id)
  const lastEmptied = useLastEmptiedOrEmptying(storage)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Card>
    <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden' }}>
      <CardHeader avatar={<Avatar variant="rounded" sx={{ background: 'none' }}>{storage.image ? <img src={storage.image || ''} height={40} alt={storage.name} /> : ''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} />
      <Divider />
      <List disablePadding dense>
        <ListItem>
          <ListItemIcon><Icon color={!lastEmptied ? 'disabled' : storage.status === 'emptying' ? 'error' : 'success'}>{storage.status === 'emptying' || !lastEmptied ? 'cancel' : 'check_circle'}</Icon></ListItemIcon>
          <ListItemText primary={storage.status === 'emptying' ? 'Wordt geleegd' : 'Laatst geleegd'} primaryTypographyProps={{ variant: 'subtitle2' }} secondary={lastEmptied ? moment(lastEmptied).fromNow() : 'Nooit'} />
        </ListItem>
      </List>
      <Divider />
      {logs.length > 0 && <List disablePadding dense>
        <ListItem>
          <ListItemText inset primary="Laatste wijziging" primaryTypographyProps={{ variant: 'subtitle2' }} secondary={moment(Number(logs[0].timestamp)).fromNow()} />
          <ListItemSecondaryAction><Typography variant="subtitle2" color={isMutationLog(logs[0]) && logs[0].amount > 0 ? 'primary' : 'error'}>{isMutationLog(logs[0]) && logs[0].amount > 0 && '+'}{isMutationLog(logs[0]) && logs[0].amount.toLocaleString()}</Typography></ListItemSecondaryAction>
        </ListItem>
      </List>}
      <Box sx={{ height: '100%', visibility: 'hidden' }} />
    </CardActionArea>
  </Card>
}
