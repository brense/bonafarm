import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Box, Button, DialogActions, DialogContent, Icon, LinearProgress, Slide } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import { Feed, setFeed } from '../hooks/firebase'
import FeedForm from '../components/forms/FeedForm'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

const initialState: Feed = {
  name: '',
  id: '',
  linkedStorageId: undefined as string | undefined
}

export default function AddFeed() {
  const [adding, setAdding] = useState(false)
  const match = useMatch('/feed/add')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useState(initialState)
  const isValid = useMemo(() => !(changes.name === '' || changes.id === '' || adding), [changes, adding])

  const handleClose = useCallback(() => {
    setAdding(false)
    setChanges(initialState)
    navigate('/stock') // or feed/:feedId when editing
  }, [navigate])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    setAdding(true)
    e.preventDefault()
    const { id, linkedStorageId, ...data } = changes
    await setFeed(id, linkedStorageId ? { ...data, linkedStorageId } : data)
    handleClose()
  }, [handleClose, changes])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])


  return <CustomDialog title={'Voertype toevoegen'} open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={() => handleClose()}>
    <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }} onSubmit={handleSubmit}>
      <DialogContent sx={{ flex: 1 }}>
        <FeedForm feed={changes} onChange={setChanges} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose()}>Annuleren</Button>
        <Button color="success" type="submit" disabled={!isValid}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
      {adding && <LinearProgress variant="indeterminate" />}
    </Box>
  </CustomDialog>
}
