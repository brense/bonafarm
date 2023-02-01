import { useCallback, useMemo, useRef } from 'react'
import { Button, Card, CardActionArea, CardContent, DialogActions, DialogContent, Divider, Grid, Icon, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useMatch, useNavigate, useOutletContext } from 'react-router-dom'
import { isMutationLog, useSubscribeDoc, useSubscribeQuery, where, orderBy, limit, useSubscribeCollection, makeQuery, useDoc, emptyCollection, useCollection, Timestamp } from '../../hooks/firestore'
import { useConfirmDialog } from '../../components/ConfirmDialog'
import DialogAppbar from '../../components/DialogAppbar'
import { Timeline } from '@mui/lab'
import LogItem from '../../components/LogItem'
import StorageItem from '../../components/storage/StorageItem'
import { getAuth } from 'firebase/auth'

type Storage = {
  name: string
  type: 'storage' | 'shute' | 'stable'
}

const auth = getAuth()

export default function StorageDetails() {
  const match = useMatch('/stock/:storageId/*')
  const storage = useSubscribeDoc<Storage>(`storages/${match?.params.storageId}`)
  const doc = useDoc(`storages/${match?.params.storageId}`)
  const { set: setDoc, update: updateDoc, delete: deleteDoc } = useDoc()
  const navigate = useNavigate()
  const confirmDeleteDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Verwijderen' })
  const confirmEmptyDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Leegmaken' })
  const { onClose } = useOutletContext<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>()
  const feed = useSubscribeCollection<{ name: string, id: string }>('feeds')
  const q = useMemo(() => makeQuery<{ type: 'mutation' | 'emptied', timestamp: Date, storageId: string }>('logs', where('storageId', '==', storage?.id || ''), orderBy('timestamp', 'desc'), limit(100)), [storage?.id])
  const logs = useSubscribeQuery<{ type: 'mutation' | 'emptied', timestamp: Date, storageId: string }>(q, { parseTimestamp: true })
  const { add: addLog } = useCollection<{ type: 'mutation' | 'emptied', amount?: number, feedId?: string, timestamp: Timestamp, storageId: string, uid: string }>('logs')
  const logItems = useMemo(() => logs.map(l => ({ ...l, ...isMutationLog(l) && { feed: feed.find(f => f.id === l.feedId) } })), [feed, logs])
  const items = useSubscribeCollection<{ amount: number }>(`storages/${match?.params.storageId}/items`)
  const storageItems = useMemo(() => items.map(item => {
    return {
      feed: feed.find(f => f.id === item.id),
      amount: item.amount || 0
    }
  }, []), [items, feed])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const timeoutRef = useRef<NodeJS.Timeout>()
  const movedAmountRef = useRef<number>(0)
  const movedFeedIdRef = useRef<string>()
  const logRef = useRef<{ id: string }>()

  const handleDelete = useCallback(() => {
    confirmDeleteDialog.open({
      confirmMessage: 'Weet je zeker dat je deze opslag wilt verwijderen?',
      onConfirm: async () => {
        await doc.delete()
        navigate('/stock')
      }
    })
  }, [confirmDeleteDialog, navigate, doc])

  const handleEmpty = useCallback(() => {
    confirmEmptyDialog.open({
      confirmMessage: 'Weet je zeker dat je deze opslag wilt leegmaken?',
      onConfirm: async () => {
        addLog({ type: 'emptied', timestamp: Timestamp.now(), storageId: match?.params.storageId || '', uid: auth.currentUser?.uid || '' })
        emptyCollection(`storages/${match?.params.storageId}/items`)
      }
    })
  }, [confirmEmptyDialog, match, addLog])

  const handleMutateItem = useCallback(async ({ amount, feed }: { amount: number, feed?: { id: string } }, movedAmount: number) => {
    if (feed) {
      const itemPath = `storages/${storage?.id}/items/${feed.id}`
      amount <= 0 && storage?.type === 'storage' ? deleteDoc(itemPath) : setDoc(itemPath, { amount })
      movedAmountRef.current += movedAmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (logRef.current && movedFeedIdRef.current && movedFeedIdRef.current === feed.id) {
        updateDoc(`/logs/${logRef.current.id}`, { amount: movedAmountRef.current })
      } else {
        movedFeedIdRef.current = feed.id
        movedAmountRef.current = movedAmount
        logRef.current = await addLog({ type: 'mutation', amount: movedAmount, feedId: feed.id, timestamp: Timestamp.now(), storageId: storage?.id || '', uid: auth.currentUser?.uid || '' })
      }
      timeoutRef.current = setTimeout(() => {
        movedAmountRef.current = 0
        logRef.current = undefined
      }, 10000)
      movedAmount < 0 && storage?.type !== 'stable' && navigate(`/stock/${storage?.id}/add`, { state: { referrer: `/stock/${storage?.id}`, movedItem: { amount: Math.abs(movedAmount), feedId: feed.id } } })
    }
  }, [storage, setDoc, addLog, navigate, updateDoc, deleteDoc])

  return <>
    <DialogAppbar onClose={onClose}>{storage?.name}</DialogAppbar>
    <DialogContent sx={{ p: 0 }}>
      <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 3, pl: 2, flex: 1, width: '100%' }}>
        {storage?.type !== 'shute' && storageItems.map((item) => <Grid key={item.feed?.id} item xs={12} sm={6}>
          <StorageItem item={item} onMutate={async (amount, movedAmount) => handleMutateItem({ ...item, amount }, movedAmount)} />
        </Grid>)}
        {storage?.type !== 'stable' && <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate(`/stock/${storage?.id}/add`, { state: { referrer: match?.pathname } })}>
              <CardContent sx={{ color: 'text.secondary', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', height: !isMobile ? 129 : undefined }}>
                <Icon fontSize="large" color="inherit">add_circle</Icon>
                <Typography sx={{ mt: 2 }} color="inherit" variant="subtitle2">Zak toevoegen</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>}
      </Grid>
      <Divider>Laatste wijzigingen</Divider>
      <Timeline>
        {logItems.map((item, k) => <LogItem item={item as any} key={k} />)}
      </Timeline>
    </DialogContent>
    <DialogActions>
      {storage?.type === 'shute' && <Button onClick={handleEmpty} color="inherit"><Icon>cancel</Icon>&nbsp;&nbsp;Leegmaken</Button>}
      <Button onClick={() => navigate(`/stock/${storage?.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Bewerken</Button>
      <Button onClick={handleDelete} color="error"><Icon>delete</Icon>&nbsp;&nbsp;Verwijderen</Button>
    </DialogActions>
  </>
}
