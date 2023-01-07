import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Box, Button, DialogActions, DialogContent, Icon, LinearProgress, Slide } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import StorageForm from '../components/forms/StorageForm'
import { setStorage, Storage } from '../hooks/firebase'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

const initialState: Storage = {
  name: '',
  id: '',
  color: '#fff000',
  canEmpty: false,
  order: 0
}

export default function AddStorage() {
  const [adding, setAdding] = useState(false)
  const match = useMatch('/stock/add')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useState(initialState)
  const isValid = useMemo(() => !(changes.name === '' || changes.color === '' || changes.id === '' || adding), [changes, adding])

  const handleClose = useCallback(() => {
    setAdding(false)
    setChanges(initialState)
    navigate('/stock')
  }, [navigate])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    setAdding(true)
    e.preventDefault()
    const { id, color, canEmpty, ...data } = changes
    setStorage(changes.id, {
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


  return <CustomDialog title={'Opslag toevoegen'} open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={() => handleClose()}>
    <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }} onSubmit={handleSubmit}>
      <DialogContent sx={{ flex: 1 }}>
        {Boolean(match) && <StorageForm storage={changes} onChange={setChanges} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose()}>Annuleren</Button>
        <Button color="success" type="submit" disabled={!isValid}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
      {adding && <LinearProgress variant="indeterminate" />}
    </Box>
  </CustomDialog>
}
