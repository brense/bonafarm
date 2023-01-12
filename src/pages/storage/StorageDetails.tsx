import React, { useCallback, useMemo } from 'react'
import { AppBar, Box, Button, Card, CardActionArea, CardContent, Dialog, DialogActions, DialogContent, Divider, Grid, Icon, IconButton, Slide, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import { Feed, removeStorage } from '../../hooks/firebase'
import { useConfirmDialog } from '../../components/ConfirmDialog'
import StorageItem from '../../components/storage/StorageItem'
import { getDatabase, ref, remove, runTransaction } from 'firebase/database'
import { addLog, useSubscribeDoc } from '../../hooks/firestore'
import { Timeline } from '@mui/lab'
import LogItem from '../../components/LogItem'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

function DialogAppbar({ children, onClose }: React.PropsWithChildren<{ onClose?: (e: React.MouseEvent, reason?: 'backdropClick') => void }>) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  return <AppBar position="relative" sx={{ bgcolor: 'secondary.main' }}>
    <Toolbar sx={isMobile ? { pr: 3, pl: 1.5 } : {}} disableGutters={isMobile}>
      {isMobile && <IconButton onClick={e => onClose && onClose(e)} sx={{ mr: 0.5 }}><Icon>chevron_left</Icon></IconButton>}
      <Typography variant="h5">{children}</Typography>
      <Box component="span" sx={{ flex: 1 }} />
      {!isMobile && <IconButton onClick={e => onClose && onClose(e, 'backdropClick')} sx={{ mr: -1 }}><Icon>close</Icon></IconButton>}
    </Toolbar>
  </AppBar>
}

function StorageDialog({ children }: React.PropsWithChildren<unknown>) {
  const match = useMatch('/stock/:storageId/*')
  const storage = useSubscribeDoc<{ name: string, canEmpty: boolean }>(`storage/${match?.params.storageId}`)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])

  const handleClose = useCallback((event: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
    navigate(isEditing && !reason ? `/stock/${match?.params.storageId}` : '/stock')
  }, [navigate, isEditing, match])

  return <Dialog open={Boolean(match)} fullScreen={isMobile} TransitionComponent={Transition} keepMounted onClose={handleClose}>
    {storage && <StorageDetails storage={storage} />}
  </Dialog>
}

export default function StorageDetails({ storage }: { storage: { id: string, name: string, canEmpty: boolean } }) {
  const match = useMatch('/stock/:storageId/*')
  const navigate = useNavigate()
  const confirmDeleteDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Verwijderen' })
  const confirmEmptyDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Leegmaken' })
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const items = [] as any[] // TODO: useCollection(`storage/${storage.id}/items`)
  const logItems = [] as any[] // TODO useQuery(collection('logs'), where('storageId', '==', storage.id))

  const handleMutateItem = useCallback(async (item: { feed?: Feed, amount: number }, movedAmount: number) => {
    const db = getDatabase()
    if (storage?.id && item.feed) {
      if (item.amount === 0) {
        await remove(ref(db, `storage/${storage?.id}/items/${item.feed?.id}`))
      } else {
        await runTransaction(ref(db, `/storage/${storage?.id}/items/${item.feed?.id}`), () => {
          return {
            amount: item.amount
          }
        })
      }
      await addLog({
        type: 'mutation',
        storageId: storage?.id,
        feedId: item.feed?.id,
        amount: movedAmount
      })
    }
    if (movedAmount < 0) {
      navigate(`/stock/${storage?.id}/add`, { state: { referrer: `/stock/${storage?.id}`, movedItem: { feedId: item.feed?.id, amount: Math.abs(movedAmount) } } })
    }
  }, [storage?.id, navigate])

  const handleDelete = useCallback(() => {
    confirmDeleteDialog.open({
      confirmMessage: 'Weet je zeker dat je deze opslag wilt verwijderen?',
      onConfirm: async () => {
        storage && await removeStorage(storage?.id)
        navigate('/stock')
      }
    })
  }, [confirmDeleteDialog, navigate, storage])

  const handleEmpty = useCallback(() => {
    confirmEmptyDialog.open({
      confirmMessage: 'Weet je zeker dat je deze opslag wilt leegmaken?',
      onConfirm: async () => {
        const db = getDatabase()
        remove(ref(db, `storage/${storage?.id}/items`))
        addLog({
          type: 'emptied',
          storageId: storage?.id || ''
        })
      }
    })
  }, [storage, confirmEmptyDialog])

  return <>
    <DialogAppbar>{storage.name}</DialogAppbar>
    <DialogContent sx={{ p: 0 }}>
      <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 3, pl: 2, flex: 1, width: '100%' }}>
        {!storage.canEmpty && items.map((item, k) => <Grid key={k} item xs={12} sm={6}>
          <StorageItem item={item} onMutate={async (amount, movedAmount) => handleMutateItem({ ...item, amount }, movedAmount)} />
        </Grid>)}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate(`/stock/${storage.id}/add`, { state: { referrer: match?.pathname } })}>
              <CardContent sx={{ color: 'text.secondary', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', height: !isMobile ? 129 : undefined }}>
                <Icon fontSize="large" color="inherit">add_circle</Icon>
                <Typography sx={{ mt: 2 }} color="inherit" variant="subtitle2">Zak toevoegen</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
      <Divider>Laatste wijzigingen</Divider>
      <Timeline>
        {logItems.map((item, k) => <LogItem item={item} key={k} />)}
      </Timeline>
    </DialogContent>
    <DialogActions>
      {storage.canEmpty && <Button onClick={handleEmpty} color="inherit"><Icon>cancel</Icon>&nbsp;&nbsp;Leegmaken</Button>}
      <Button onClick={() => navigate(`/stock/${storage.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Bewerken</Button>
      <Button onClick={handleDelete} color="error"><Icon>delete</Icon>&nbsp;&nbsp;Verwijderen</Button>
    </DialogActions>
  </>
}
