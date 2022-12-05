import { TimelineItem, TimelineOppositeContent, TimelineContent, TimelineSeparator, TimelineDot, TimelineConnector } from '@mui/lab'
import { Icon, List, ListItem, ListItemText, Typography } from '@mui/material'
import moment from 'moment'
import 'moment/dist/locale/nl'
moment.locale('nl')

export default function LogItem({ item }: { item: { type: 'emptied' | 'mutation', date: string, amount?: number | null, title?: string | null } }) {
  return <TimelineItem>
    <TimelineOppositeContent sx={{ width: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }}>
      <List disablePadding>
        <ListItem sx={{ textAlign: 'inherit' }}>
          <ListItemText primary={moment(Number(item.date)).format('ddd D MMM YYYY, H:mm:ss')} secondary={moment(Number(item.date)).fromNow()} secondaryTypographyProps={{ noWrap: true }} primaryTypographyProps={{ component: 'code', fontFamily: 'Roboto Mono', fontSize: 14 }} />
        </ListItem>
      </List>
    </TimelineOppositeContent>
    <TimelineSeparator>
      <TimelineConnector />
      <TimelineDot variant={item.type === 'emptied' ? 'outlined' : 'filled'}>{item.type === 'emptied' && <Icon color="error">cancel</Icon>}</TimelineDot>
      <TimelineConnector />
    </TimelineSeparator>
    <TimelineContent sx={{ width: 50, display: 'flex', alignItems: 'center' }}>
      <List disablePadding>
        <ListItem>
          {item.type === 'mutation' && item.amount && <Typography variant="subtitle2" textAlign="right" sx={{ mr: 2 }} color={item.amount > 0 ? 'secondary' : 'error'}>{item.amount > 0 && '+'}{item.amount.toLocaleString()}</Typography>}
          <ListItemText primary={item.type === 'emptied' ? 'Koker leeg gemaakt' : item.title} primaryTypographyProps={{ textAlign: 'left' }} />
        </ListItem>
      </List>
    </TimelineContent>
  </TimelineItem>
}
