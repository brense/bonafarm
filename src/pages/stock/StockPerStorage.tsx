import { useMemo } from 'react'
import { Card, CardActionArea, Typography, Icon, CardContent, useTheme, useMediaQuery, Grid } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import StorageCardWithLogs from '../../components/storage/StorageCardWithLogs'
import StorageCard from '../../components/storage/StorageCard'
import { makeQuery, orderBy, useSubscribeQuery } from '../../hooks/firestore'

export default function StockPerStorage() {
  const location = useLocation()
  const navigate = useNavigate()
  const q = useMemo(() => makeQuery<{ name: string, type: 'storage' | 'shute' | 'stable', id: string, color?: string }>('storages', orderBy('order')), [])
  const storages = useSubscribeQuery<{ name: string, type: 'storage' | 'shute' | 'stable', id: string, color?: string }>(q)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
    {storages.map(storage => <Grid key={storage.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
      {storage.type === 'shute' ? <StorageCardWithLogs storage={storage} /> : <StorageCard storage={storage} />}
    </Grid>)}
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card>
        <CardActionArea onClick={() => navigate('/stock/add', { state: { referrer: location.pathname } })}>
          <CardContent sx={{ height: !isMobile ? 240 : undefined, overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.secondary' }}>
            <Icon fontSize="large" color="inherit">add_circle</Icon>
            <Typography sx={{ mt: 2 }} color="inherit" variant="subtitle2">Opslag toevoegen</Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  </Grid>
}
