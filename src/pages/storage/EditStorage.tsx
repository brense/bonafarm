import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Box, Button, Card, CardActionArea, CardContent, Collapse, DialogActions, DialogContent, Divider, Grid, Icon, LinearProgress, Slide, Typography, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../../components/CustomDialog'
import StorageForm, { StorageChanges } from '../../components/forms/StorageForm'
import { Feed, removeStorage, updateStorage, useFeed, useStorages } from '../../hooks/firebase'
import { useConfirmDialog } from '../../components/ConfirmDialog'
import StorageItem from '../../components/storage/StorageItem'
import { getDatabase, ref, remove, runTransaction } from 'firebase/database'
import { addLog, isMutationLog, useLogs } from '../../hooks/firestore'
import { Timeline } from '@mui/lab'
import { getDownloadURL, getStorage, ref as storageRef, uploadString } from 'firebase/storage'
import LogItem from '../../components/LogItem'

const firebaseStorage = getStorage()

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

const initialState: StorageChanges = {
  name: '',
  id: '',
  order: 9999,
  color: '#fff000',
  canEmpty: false
}

export default function EditStorage() {
  const [saving, setSaving] = useState(false)
  const match = useMatch('/stock/:storageId/*')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useState(initialState)
  const isValid = useMemo(() => !(changes.name === '' || changes.color === '' || changes.id === '' || saving), [changes, saving])
  const { data: storages } = useStorages()
  const { data: feed } = useFeed()
  const storage = useMemo(() => storages.find(s => s.id === match?.params.storageId), [match, storages])
  const items = useMemo(() => Object.keys(storage?.items || {}).map(feedId => {
    return {
      feed: feed.find(f => f.id === feedId),
      amount: storage?.items ? storage?.items[feedId].amount : 0
    }
  }, []), [storage, feed])
  const logs = useLogs({ key: 'storageId', value: storage?.id || '' })
  const logItems = useMemo(() => logs.map(l => ({ ...l, ...isMutationLog(l) && { feed: feed.find(f => f.id === l.feedId) } })), [feed, logs])
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])
  const confirmDeleteDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Verwijderen' })
  const confirmEmptyDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Leegmaken' })
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    storage && setChanges(storage)
  }, [storage])

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

  const handleClose = useCallback((reason?: 'backdropClick' | 'escapeKeyDown') => {
    setSaving(false)
    setChanges(storage ? storage : initialState)
    navigate(isEditing && storage && !reason ? `/stock/${storage.id}` : '/stock')
  }, [navigate, isEditing, storage])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    const { id, color, canEmpty, newImage, image: currentImg, ...data } = changes
    let image = currentImg
    if (newImage) {
      const newImageRef = storageRef(firebaseStorage, id)
      const result = await uploadString(newImageRef, newImage, 'data_url')
      image = await getDownloadURL(result.ref)
    }
    await updateStorage(changes.id, {
      ...data,
      canEmpty,
      ...canEmpty ? { image } : { color }
    })
    handleClose()
  }, [handleClose, changes])

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

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return !storage ? null : <CustomDialog title={isEditing ? `${storage.name} bewerken` : `${storage.name}`} open={Boolean(match) && match?.params['*'] !== 'add'} TransitionComponent={Transition} keepMounted onClose={(e, reason) => handleClose(reason)} showCloseButton={!isMobile}>
    <DialogContent sx={{ p: 0 }}>
      <Collapse in={!isEditing}>
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
      </Collapse>
      <Collapse in={isEditing}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }}>
          <DialogContent sx={{ flex: 1 }}>
            {Boolean(match) && <StorageForm storage={changes} onChange={setChanges} isEditing />}
          </DialogContent>
        </Box>
      </Collapse>
    </DialogContent>
    {!isEditing ? <DialogActions>
      {storage.canEmpty && <Button onClick={handleEmpty} color="inherit"><Icon>cancel</Icon>&nbsp;&nbsp;Leegmaken</Button>}
      <Button onClick={() => navigate(`/stock/${storage.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Bewerken</Button>
      <Button onClick={handleDelete} color="error"><Icon>delete</Icon>&nbsp;&nbsp;Verwijderen</Button>
    </DialogActions> : <DialogActions>
      <Button onClick={() => handleClose()}>Annuleren</Button>
      <Button color="success" onClick={handleSubmit} disabled={!isValid}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
    </DialogActions>}
    {saving && <LinearProgress variant="indeterminate" />}
  </CustomDialog>
}
