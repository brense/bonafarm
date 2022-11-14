import { BottomNavigation, BottomNavigationAction, Card, Icon, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, ListSubheader, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Stock() {
  const [value, setValue] = useState(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (value === 'adding' && pathname !== '/add') {
      navigate('/add', { state: { referrer: pathname } })
      setValue(null)
    }
  }, [value, pathname, navigate])

  return <Card sx={{ width: '100%', height: '100%', maxWidth: 380, maxHeight: 760, display: 'flex', flexDirection: 'column' }}>
    <List subheader={<ListSubheader>Ton 1 voorraad</ListSubheader>} sx={{ flex: 1, overflow: 'auto' }}>
      <ListItem>
        <ListItemText primary="Gemengd graan" secondary="Van Leeuwen" />
        {value === 'editing' ? <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton size="large" color="error"><Icon fontSize="large">do_not_disturb_on</Icon></IconButton>
          <Typography variant="h6">1</Typography>
          <IconButton size="large" color="success"><Icon fontSize="large">add_circle</Icon></IconButton>
        </ListItemSecondaryAction> : <ListItemSecondaryAction><Typography variant="subtitle2">1 stuks</Typography></ListItemSecondaryAction>}
      </ListItem>
    </List>
    <BottomNavigation showLabels={true} value={value} onChange={(e, v) => setValue(v === value ? null : v)}>
      <BottomNavigationAction value="adding" label="Item toevoegen" icon={<Icon>add_circle</Icon>} />
      <BottomNavigationAction value="editing" label="Voorraad wijzigen" icon={<Icon>create</Icon>} />
    </BottomNavigation>
  </Card>
}
