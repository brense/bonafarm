import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Box, Button, Collapse, DialogActions, DialogContent, Icon, LinearProgress, Slide, Typography } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'

import { getDatabase, ref, update } from 'firebase/database'
import StorageForm from '../components/forms/StorageForm'
import { Storage, useStorages } from '../hooks/firebase'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

const initialState: Storage = {
  name: '',
  id: '',
  color: '#fff000',
  canEmpty: false
}

export default function EditStorage() {
  const [adding, setAdding] = useState(false)
  const match = useMatch('/stock/:storageId/*')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useState(initialState)
  const isValid = useMemo(() => !(changes.name === '' || changes.color === '' || changes.id === '' || adding), [changes, adding])
  const { data: storages } = useStorages()
  const storage = useMemo(() => storages.find(s => s.id === match?.params.storageId), [match, storages])
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])

  useEffect(() => {
    storage && setChanges(storage)
  }, [storage])

  const handleClose = useCallback((reason?: 'backdropClick' | 'escapeKeyDown') => {
    setAdding(false)
    setChanges(storage ? storage : initialState)
    navigate(isEditing && storage && !reason ? `/stock/${storage.id}` : '/stock')
  }, [navigate, isEditing, storage])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    setAdding(true)
    e.preventDefault()
    const { id, color, canEmpty, ...data } = changes
    const db = getDatabase()
    update(ref(db, 'storage/' + changes.id), {
      ...data,
      canEmpty,
      ...canEmpty ? {} : { color }
    })
    handleClose()
  }, [handleClose, changes])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return !storage ? null : <CustomDialog title={isEditing ? `${storage.name} bewerken` : `${storage.name}`} open={Boolean(match) && match?.params['*'] !== 'add'} TransitionComponent={Transition} keepMounted onClose={(e, reason) => handleClose(reason)}>
    <Collapse in={!isEditing}>
      <DialogContent>
        <Button onClick={() => navigate(`/stock/${storage.id}/add`, { state: { referrer: match?.pathname } })}>Zak toevoegen</Button>
      </DialogContent>
      <Typography>stuff...</Typography>
      <DialogActions>
        <Button onClick={() => navigate(`/stock/${storage.id}/edit`)} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Bewerken</Button>
        <Button color="error"><Icon>delete</Icon>&nbsp;&nbsp;Verwijderen</Button>
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
        {adding && <LinearProgress variant="indeterminate" />}
      </Box>
    </Collapse>
  </CustomDialog>
}
