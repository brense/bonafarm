import { Alert, Avatar, Button, Card, CardActionArea, CardHeader, DialogActions, DialogContent, Grid, Icon } from '@mui/material'
import { useLocation, useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { useSubscribeCollection, useSubscribeDoc } from '../../hooks/firestore'
import DialogAppbar from '../../components/DialogAppbar'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, makeCollectionGroupQuery, useFirestore } from 'firestore-react-hooks'

type Feed = {
  name: string
  linkedStorageId: string
}

export default function FeedDetails() {
  const match = useMatch('/feed/:feedId/*')
  const feed = useSubscribeDoc<Feed>(`feeds/${match?.params.feedId}`)
  const storages = useSubscribeCollection<{ name: string, color?: string, image?: string, type: 'shute' }>('storages')
  const firestore = useFirestore()
  const q = useMemo(() => makeCollectionGroupQuery<{ amount: number }>(firestore, 'items'), [firestore])
  const { subscribe } = useQuery<{ amount: number }>(q)
  const navigate = useNavigate()
  const [feedStorages, setFeedStorages] = useState<Array<{ amount: number, name: string, id: string, color?: string }>>([])
  const { onClose } = useOutletContext<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>()
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = subscribe(async snapshot => {
      const items: typeof feedStorages = []
      snapshot.forEach(doc => {
        doc.id === feed?.id && items.push({ amount: doc.data().amount, ...storages.find(s => s.id === doc.ref.parent.parent?.id)! })
      })
      setFeedStorages(items)
    })
    return () => unsubscribe()
  }, [subscribe, feed, storages])

  const linkedStorage = useMemo(() => storages.find(s => s.id === feed?.linkedStorageId), [feed, storages])

  return <>
    <DialogAppbar onClose={onClose}>{feed?.name}</DialogAppbar>
    <DialogContent sx={{ p: 0 }}>
      <Alert severity="info" square sx={{ mb: 2 }}>Klik op een van de opslagen om de voorraad {feed?.name} aan te passen.</Alert>
      <Grid container alignContent="flex-start" spacing={2} sx={{ mb: 2, pl: 2, flex: 1, width: '100%' }}>
        {linkedStorage && linkedStorage.type === 'shute' && <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate(`/stock/${linkedStorage.id}`, { state: { goBack: location.pathname } })}>
              <CardHeader avatar={<Avatar variant="rounded" sx={{ background: 'none' }}>{linkedStorage.image ? <img src={linkedStorage.image || ''} height={40} alt={linkedStorage.name} /> : ''}</Avatar>} title="Gekoppelde opslag" titleTypographyProps={{ color: 'text.secondary' }} subheader={linkedStorage.name} subheaderTypographyProps={{ variant: 'h6', color: 'text.primary' }} />
            </CardActionArea>
          </Card>
        </Grid>}
        {feedStorages.map(storage => <Grid key={storage.id} item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate(`/stock/${storage.id}`, { state: { goBack: location.pathname } })}>
              <CardHeader avatar={<Avatar sx={{ bgcolor: storage.color }}>{''}</Avatar>} title={storage.name} titleTypographyProps={{ variant: 'h6' }} subheader={`Voorraad: ${storage.amount} stuks`} />
            </CardActionArea>
          </Card>
        </Grid>)}
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => navigate(`/feed/${feed?.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Voertype bewerken</Button>
    </DialogActions>
  </>
}
