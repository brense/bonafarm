import { Card, CardActionArea, Typography, CircularProgress, Icon, CardContent, useTheme, useMediaQuery, Grid } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import CenteredContent from '../../components/CenteredContent'
import { useStorages } from '../../hooks/firebase'
import StorageCardWithLogs from '../../components/storage/StorageCardWithLogs'
import StorageCard from '../../components/storage/StorageCard'

export default function StockPerStorage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: storages, loading } = useStorages()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> :
    <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
      {storages.map(storage => <Grid key={storage.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
        {storage.canEmpty ? <StorageCardWithLogs storage={storage} /> : <StorageCard storage={storage} />}
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
