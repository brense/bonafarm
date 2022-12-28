import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Box, Button, Card, CardActionArea, CardContent, Collapse, DialogActions, DialogContent, Grid, Icon, LinearProgress, Slide, Typography, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import StorageForm from '../components/forms/StorageForm'
import { Feed, removeStorage, Storage, updateStorage, useFeed, useStorages } from '../hooks/firebase'
import { useConfirmDialog } from '../components/ConfirmDialog'
import StorageItem from '../components/StorageItem'
import { getDatabase, ref, remove, update } from 'firebase/database'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

type Item = {
  itemId: string
  feed?: Feed
  amount: number
}

const initialState: Storage = {
  name: '',
  id: '',
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
  const items = useMemo(() => Object.keys(storage?.items || {}).reduce((arr: Item[], key) => {
    if (storage?.items && storage.items[key]) {
      const index = arr.findIndex(item => storage?.items && item.feed?.id === storage?.items[key].feedId)
      index >= 0 ? arr[index].amount += storage.items[key].amount : arr.push({ itemId: key, feed: feed.find(f => storage?.items && f.id === storage.items[key].feedId) as Feed, amount: storage.items[key].amount })
    }
    return arr
  }, []), [storage, feed])
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])
  const confirmDeleteDialog = useConfirmDialog({ cancelText: 'Annuleren', confirmText: 'Verwijderen' })
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    storage && setChanges(storage)
  }, [storage])

  const handleMutateItem = useCallback(async (item: Item, movedAmount: number) => {
    const db = getDatabase()
    if (item.amount === 0) {
      await remove(ref(db, `storage/${storage?.id}/items/${item.itemId}`))
    } else {
      await update(ref(db, `storage/${storage?.id}/items/${item.itemId}`), { amount: item.amount })
    }
    // TODO: create log item in firestore...
    if (movedAmount < 0) {
      navigate(`/stock/${storage?.id}/add`, { state: { referrer: `/stock/${storage?.id}`, movedItem: { feedId: item.feed?.id, amount: Math.abs(movedAmount) } } })
    }
  }, [storage, navigate])

  const handleClose = useCallback((reason?: 'backdropClick' | 'escapeKeyDown') => {
    setSaving(false)
    setChanges(storage ? storage : initialState)
    navigate(isEditing && storage && !reason ? `/stock/${storage.id}` : '/stock')
  }, [navigate, isEditing, storage])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    setSaving(true)
    e.preventDefault()
    const { id, color, canEmpty, ...data } = changes
    await updateStorage(changes.id, {
      ...data,
      canEmpty,
      ...canEmpty ? {} : { color }
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
    const db = getDatabase()
    remove(ref(db, `storage/${storage?.id}/items`))
    // TODO: add log item to firestore
  }, [storage])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return !storage ? null : <CustomDialog title={isEditing ? `${storage.name} bewerken` : `${storage.name}`} open={Boolean(match) && match?.params['*'] !== 'add'} TransitionComponent={Transition} keepMounted onClose={(e, reason) => handleClose(reason)} showCloseButton>
    <Collapse in={!isEditing}>
      <Grid container alignContent="flex-start" spacing={2} sx={{ mt: 0, mb: 8, pl: 2, flex: 1, width: '100%' }}>
        {items.map((item) => <Grid key={item.itemId} item xs={12} sm={6}>
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
      <DialogActions>
        {storage.canEmpty && <Button onClick={handleEmpty} color="inherit"><Icon>cancel</Icon>&nbsp;&nbsp;Opslag leegmaken</Button>}
        <Button onClick={() => navigate(`/stock/${storage.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Ton bewerken</Button>
        <Button onClick={handleDelete} color="error"><Icon>delete</Icon>&nbsp;&nbsp;Verwijderen</Button>
      </DialogActions>
    </Collapse>
    <Collapse in={isEditing}>
      <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }} onSubmit={handleSubmit}>
        <DialogContent sx={{ flex: 1 }}>
          <StorageForm storage={changes} onChange={setChanges} isEditing />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose()}>Annuleren</Button>
          <Button color="success" type="submit" disabled={!isValid}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
        </DialogActions>
        {saving && <LinearProgress variant="indeterminate" />}
      </Box>
    </Collapse>
  </CustomDialog>
}
