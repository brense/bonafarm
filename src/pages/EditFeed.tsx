import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Box, Button, Collapse, DialogActions, DialogContent, Icon, LinearProgress, Slide, Typography, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>()
  const [changes, setChanges] = useState(initialState)
  const isValid = useMemo(() => !(changes.name === '' || changes.id === '' || saving), [changes, saving])
  const { data: feeds } = useFeed()
  const feed = useMemo(() => feeds.find(f => f.id === match?.params.feedId), [match, feeds])
  const isEditing = useMemo(() => match?.params['*'] === 'edit', [match])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  useEffect(() => {
    feed && setChanges(feed)
  }, [feed])

  const handleClose = useCallback((reason?: 'backdropClick' | 'escapeKeyDown') => {
    setSaving(false)
    setChanges(feed ? feed : initialState)
    navigate(isEditing && feed && !reason ? `/feed/${feed.id}` : '/stock')
  }, [navigate, isEditing, feed])

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

  return !feed ? null : <CustomDialog title={isEditing ? `${feed.name} bewerken` : `${feed.name}`} open={Boolean(match) && match?.params['*'] !== 'add'} TransitionComponent={Transition} keepMounted onClose={(e, reason) => handleClose(reason)} showCloseButton={!isMobile}>
    <Collapse in={!isEditing}>
      <Typography>Voer...</Typography>
      <DialogActions>
        <Button onClick={() => navigate(`/feed/${feed.id}/edit`, { state: { referrer: location.pathname } })} color="primary"><Icon>create</Icon>&nbsp;&nbsp;Bewerken</Button>
      </DialogActions>
    </Collapse>
    <Collapse in={isEditing}>
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
    </Collapse>
  </CustomDialog>
}
