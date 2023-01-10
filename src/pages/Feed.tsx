import { Avatar, Box, Card, CardActionArea, CardHeader, CircularProgress, Grid, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CenteredContent from '../components/CenteredContent'
import { Storage, useStoragesQuery } from '../graphql'

export default function Feed() {
  const navigate = useNavigate()
  const location = useLocation()
  const { feedSlug } = useParams<{ feedSlug: string }>()
  const { data, loading } = useStoragesQuery({ fetchPolicy: 'no-cache' })

  const storages = useMemo(() => data?.storages.reduce((arr, { items, ...storage }) => {
    items.filter(i => i.slug === feedSlug).forEach(item => {
      arr.push({ ...storage, items: [item] })
    })
    return arr
  }, [] as Storage[]) || [], [data?.storages, feedSlug])

  const feed = useMemo(() => {
    const { slug, title } = storages[0]?.items[0] ? storages[0].items[0] : {} as { slug: string, title: string }
    return { slug, title }
  }, [storages])

  return loading ? <CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent> : <>
    <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 2, pl: 2, flex: 1, width: '100%' }}>
      {storages.map(storage => <Grid key={storage.id} item xs={12} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })}>
            <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{storage.image ? <img src={storage.image || ''} height={96} alt={storage.title} /> : ''}</Avatar>} title={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="h5" noWrap>{storage.title}</Typography><Typography variant="subtitle2" noWrap>{storage.items[0].amount.toLocaleString()} stuks</Typography></Box>} disableTypography />
          </CardActionArea>
        </Card>
      </Grid>)}
    </Grid>
  </>
}
