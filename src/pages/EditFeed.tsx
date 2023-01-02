import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Box, Button, DialogActions, DialogContent, Icon, LinearProgress, Slide, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import { Feed, updateFeed, useFeed } from '../hooks/firebase'
import FeedForm from '../components/forms/FeedForm'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

const initialState: Feed = {
  name: '',
  id: '',
  linkedStorageId: undefined as string | undefined
}

export default function EditFeed() {
  const [saving, setSaving] = useState(false)
  const match = useMatch('/feed/:feedId/*')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useState(initialState)
  const isValid = useMemo(() => !(changes.name === '' || changes.id === '' || saving), [changes, saving])
  const { data: feeds } = useFeed()
  const feed = useMemo(() => feeds.find(f => f.id === match?.params.feedId), [match, feeds])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    feed && setChanges(feed)
  }, [feed])

  const handleClose = useCallback(() => {
    setSaving(false)
    setChanges(feed ? feed : initialState)
    navigate('/stock')
  }, [navigate, feed])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    setSaving(true)
    e.preventDefault()
    const { id, ...data } = changes
    await updateFeed(id, data)
    handleClose()
  }, [handleClose, changes])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return !feed ? null : <CustomDialog title={`${feed.name} bewerken`} open={Boolean(match) && match?.params['*'] !== 'add'} TransitionComponent={Transition} keepMounted onClose={handleClose} showCloseButton={!isMobile}>
    <DialogContent sx={{ p: 0 }}>
      <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }} onSubmit={handleSubmit}>
        <DialogContent sx={{ flex: 1 }}>
          <FeedForm feed={changes} onChange={setChanges} isEditing />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose()}>Annuleren</Button>
          <Button color="success" type="submit" disabled={!isValid}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
        </DialogActions>
        {saving && <LinearProgress variant="indeterminate" />}
      </Box>
    </DialogContent>
  </CustomDialog>
}
