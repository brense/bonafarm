import { Button, DialogActions, DialogContent, Divider, Icon } from '@mui/material'
import { useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { useSubscribeDoc } from '../../hooks/firestore'
import DialogAppbar from '../../components/DialogAppbar'

type Feed = {
  name: string
  linkedStorageId:string
}

export default function FeedDetails() {
  const match = useMatch('/feed/:feedId/*')
  const feed = useSubscribeDoc<Feed>(`feeds/${match?.params.feedId}`)
  const navigate = useNavigate()
  const { onClose } = useOutletContext<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>()

  return <>
    <DialogAppbar onClose={onClose}>{feed?.name}</DialogAppbar>
    <DialogContent sx={{ p: 0 }}>
      <Divider>Laatste wijzigingen</Divider>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => navigate(`/feed/${feed?.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Bewerken</Button>
    </DialogActions>
  </>
}
