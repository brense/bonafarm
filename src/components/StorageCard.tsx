import { useMemo } from 'react'
import { Card, CardActionArea, CardHeader, Divider, List, ListItem, ListSubheader, ListItemSecondaryAction, ListItemText, Typography, Avatar, Box, useTheme, useMediaQuery } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { Storage, useFeed } from '../hooks/firebase'

export default function StorageCard({ storage }: { storage: Storage }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: feed } = useFeed()
  const items = useMemo(() => Object.keys(storage?.items || {}).map(feedId => {
    return {
      feed: feed.find(f => f.id === feedId),
      amount: storage?.items ? storage?.items[feedId].amount : 0
    }
  }, []), [storage, feed])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Card>
    <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden' }}>
      <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} />
      <Divider />
      {!storage.canEmpty && items.length > 0 && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Inhoud</ListSubheader>} dense>
        {items.map((item, k) => <ListItem key={item.feed?.id || k}>
          <ListItemText primary={item.feed?.name} />
          <ListItemSecondaryAction><Typography variant="subtitle2">{item.amount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
        </ListItem>)}
      </List>}
      <Box sx={{ height: '100%', visibility: 'hidden' }} />
    </CardActionArea>
  </Card>
}
