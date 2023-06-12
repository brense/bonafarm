import { TimelineItem, TimelineOppositeContent, TimelineContent, TimelineSeparator, TimelineDot, TimelineConnector } from '@mui/lab'
import { Icon, List, ListItem, ListItemText, Typography } from '@mui/material'
import moment from 'moment'
import 'moment/dist/locale/nl'
import { Log, MutationLog, isMutationLog } from '../types'
moment.locale('nl')

export default function LogItem({ item }: { item: (Log | MutationLog) & { feed?: { name: string } } }) {
  return <TimelineItem>
    <TimelineOppositeContent sx={{ width: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }}>
      <List disablePadding>
        <ListItem sx={{ textAlign: 'inherit' }}>
          <ListItemText primary={moment(item.timestamp).format('ddd D MMM YYYY, H:mm:ss')} secondary={moment(item.timestamp).fromNow()} secondaryTypographyProps={{ noWrap: true }} primaryTypographyProps={{ component: 'code', fontFamily: 'Roboto Mono', fontSize: 14 }} />
        </ListItem>
      </List>
    </TimelineOppositeContent>
    <TimelineSeparator>
      <TimelineConnector />
      <TimelineDot variant={item.type === 'emptied' || item.type === 'emptying' ? 'outlined' : 'filled'}>{(item.type === 'emptied' || item.type === 'emptying') && <Icon color={item.type === 'emptying' ? 'error' : 'success'}>{item.type === 'emptying' ? 'cancel' : 'check'}</Icon>}</TimelineDot>
      <TimelineConnector />
    </TimelineSeparator>
    <TimelineContent sx={{ width: 50, display: 'flex', alignItems: 'center' }}>
      <List disablePadding>
        <ListItem>
          {isMutationLog(item) && item.amount && <Typography variant="subtitle2" textAlign="right" sx={{ mr: 2 }} color={item.amount > 0 ? 'primary' : 'error'}>{item.amount > 0 && '+'}{item.amount.toLocaleString()}</Typography>}
          <ListItemText primary={item.type === 'emptied' ? 'Koker leeg gemaakt' : item.type === 'emptying' ? 'Wordt leeggemaakt' : item.feed?.name} primaryTypographyProps={{ textAlign: 'left' }} />
        </ListItem>
      </List>
    </TimelineContent>
  </TimelineItem>
}
