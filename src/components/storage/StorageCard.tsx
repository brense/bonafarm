import { useMemo } from 'react'
import { Card, CardActionArea, CardHeader, Divider, List, ListItem, ListSubheader, ListItemSecondaryAction, ListItemText, Typography, Avatar, Box, useTheme, useMediaQuery } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSubscribeCollection } from '../../hooks/firestore'

export default function StorageCard({ storage }: { storage: {id:string, color?:string, type: 'storage' | 'shute' | 'stable', name:string } }) {
  const location = useLocation()
  const navigate = useNavigate()
  const feed = useSubscribeCollection<{ name: string, id: string }>('feeds')
  const items = useSubscribeCollection<{ amount: number }>(`storages/${storage.id}/items`)
  const storageItems = useMemo(() => items.map(item => {
    return {
      feed: feed.find(f => f.id === item.id),
      amount: item.amount || 0
    }
  }, []), [items, feed])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Card>
    <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })} sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden' }}>
      <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} />
      <Divider />
      {storage.type !== 'shute' && items.length > 0 && <List subheader={<ListSubheader sx={{ lineHeight: 3, bgcolor: 'transparent', zIndex: 0 }}>Inhoud</ListSubheader>} dense>
        {storageItems.map((item, k) => <ListItem key={item.feed?.id || k}>
          <ListItemText primary={item.feed?.name} />
          <ListItemSecondaryAction><Typography variant="subtitle2">{item.amount.toLocaleString()} stuks</Typography></ListItemSecondaryAction>
        </ListItem>)}
      </List>}
      <Box sx={{ height: '100%', visibility: 'hidden' }} />
    </CardActionArea>
  </Card>
}
