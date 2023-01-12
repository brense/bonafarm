import { useState, useEffect } from 'react'
import { BottomNavigation, Paper, BottomNavigationAction, Icon, useTheme, useMediaQuery } from '@mui/material'
import { useIcon, useTitle } from '../App'
import StockPerFeed from './StockPerFeed'
import StockPerStorage from './StockPerStorage'
import moment from 'moment'
import 'moment/dist/locale/nl'
moment.locale('nl')

export default function Stock() {
  const [value, setValue] = useState<'storage' | 'item'>(localStorage.getItem('stock-type') as 'storage' || 'storage')
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  useTitle(isMobile ? 'Voorraad' : null)
  useIcon(isMobile ? 'chevron_left' : null)

  useEffect(() => {
    localStorage.setItem('stock-type', value)
  }, [value])

  return <>{value === 'storage' ? <StockPerStorage /> : <StockPerFeed />}
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation value={value} onChange={(e, v) => setValue(v)} showLabels={true} sx={{ bgcolor: 'rgba(0,0,0,0.6)' }}>
        <BottomNavigationAction value="storage" label="Per opslag" icon={<Icon>inventory_2</Icon>} />
        <BottomNavigationAction value="item" label="Per voer type" icon={<Icon>pets</Icon>} />
      </BottomNavigation>
    </Paper>
  </>
}
