import { Card, CardActionArea, CardHeader, Divider, Grid, List, ListItem, ListSubheader, ListItemSecondaryAction, ListItemText, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useStoragesQuery } from '../graphql'
import moment from 'moment'
import 'moment/dist/locale/nl'
moment.locale('nl')

export default function Stock() {
  const navigate = useNavigate()
  const { data } = useStoragesQuery()

  return <Grid container alignContent="flex-start" spacing={2} sx={{ mt:0, mb: 2, pl: 2, flex: 1, width: '100%' }}>
    {data?.storages?.map(storage => <Grid key={storage.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card>
        <CardActionArea onClick={() => navigate(`/stock/${storage.id}`)}>
          <CardHeader title={storage.title} />
          {storage.items.length > 0 && <Divider />}
          {storage.items.length > 0 && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent' }}>Inhoud</ListSubheader>} disablePadding>
            {storage.items.map(item => <ListItem key={item.slug}>
              <ListItemText primary={item.title} />
              <ListItemSecondaryAction><Typography variant="subtitle2">{item.amount} stuks</Typography></ListItemSecondaryAction>
            </ListItem>)}
          </List>}
          {storage.logs.length > 0 && <Divider />}
          {storage.logs.length > 0 && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent' }}>Laatste wijzigingen</ListSubheader>} disablePadding dense>
            {storage.logs.map(item => <ListItem key={item.id}>
              <ListItemText primary={item.type === 'emptied' ? 'Leeg gemaakt' : item.title} secondary={moment(Number(item.date)).fromNow()} />
              {item.type === 'mutation' && item.amount && <ListItemSecondaryAction><Typography variant="subtitle2" color={item.amount > 0 ? 'secondary' : 'error'}>{item.amount > 0 && '+'}{item.amount}</Typography></ListItemSecondaryAction>}
            </ListItem>)}
          </List>}
        </CardActionArea>
      </Card>
    </Grid>)}
  </Grid>
}
