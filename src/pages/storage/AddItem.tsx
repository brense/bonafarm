import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Box, Button, DialogActions, DialogContent, FormControl, FormLabel, Icon, LinearProgress, Slide, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../../components/CustomDialog'
import CustomAutocomplete from '../../components/CustomAutocomplete'
import { Timestamp, useCollection, useDoc, useSubscribeCollection } from '../../hooks/firestore'
import { getAuth } from 'firebase/auth'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

const auth = getAuth()

export default function AddItem() {
  const match = useMatch('/stock/:storageId/add')
  const location = useLocation()
  const navigate = useNavigate()
  const feeds = useSubscribeCollection<{ name: string, id: string, linkedStorageId?: string }>('feeds')
  const storages = useSubscribeCollection<{ name: string, id: string, inputValue?: string }>('storages')
  const feedInputRef = useRef<HTMLInputElement>()
  const storageInputRef = useRef<HTMLInputElement>()
  const [feed, setFeed] = useState<{ name: string, id: string, inputValue?: string } | null>()
  const [storage, setStorage] = useState<{ name: string, id: string, inputValue?: string } | null>()
  const [preSelectedAmount, setPreSelectedAmount] = useState(null)
  const [saving, setSaving] = useState(false)
  const { add: addLog } = useCollection<{ type: 'mutation' | 'emptied', amount?: number, feedId?: string, timestamp: Timestamp, storageId: string, uid: string }>('logs')
  const { set: setDoc } = useDoc()

  const handleClose = useCallback((reason?: 'backdropClick' | 'escapeKeyDown') => {
    setStorage(null)
    setFeed(null)
    setPreSelectedAmount(null)
    setSaving(false)
    navigate(!reason ? `/stock/${match?.params.storageId}` : '/stock')
  }, [navigate, match])

  const handleSubmit = useCallback(async (evt: React.FormEvent, amount?: number) => {
    evt.preventDefault()
    setSaving(true)
    const feedId = feed?.id || feed?.inputValue?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
    if (feed?.inputValue) {
      await setDoc(`feeds/${feedId}`, { name: feed.inputValue })
    }
    if (feedId && storage?.id) {
      setDoc(`storages/${storage.id}/items/${feedId}`, { amount: amount ?? preSelectedAmount ?? 0 })
      addLog({ type: 'mutation', amount: amount ?? preSelectedAmount ?? 0, feedId, timestamp: Timestamp.now(), storageId: storage.id, uid: auth.currentUser?.uid || '' })
    }
    handleClose()
  }, [feed, storage, handleClose, setDoc, preSelectedAmount, addLog])

  useEffect(() => {
    if (location.state?.movedItem) {
      setFeed(feeds.find(f => f.id === location.state.movedItem.feedId))
      setPreSelectedAmount(location.state.movedItem.amount)
      const feed = feeds.find(f => f.id === location.state.movedItem.feedId)
      if (feed?.linkedStorageId) {
        setStorage(storages.find(s => s.id === feed.linkedStorageId) || null)
      }
      storageInputRef.current?.focus()
    } else if (match?.params.storageId) {
      setStorage(storages.find(s => s.id === match?.params.storageId) || null)
      const feedMatch = feeds.find(f => f.id === match?.params.storageId)
      feedMatch ? setFeed(feedMatch) : feedInputRef.current?.focus()
    }
  }, [location.state, feeds, match, storages])

  return <CustomDialog title={location.state?.movedItem ? 'Zak verplaatsen' : 'Zak toevoegen'} open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={(e, reason) => handleClose(reason)}>
    <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }}>
      <DialogContent sx={{ flex: 1 }}>
        {location.state?.movedItem && <Typography gutterBottom>Waar wil je de zak naartoe verplaatsen?</Typography>}
        <CustomAutocomplete
          label="Naam"
          value={feed || { name: '', id: '' }}
          onChange={setFeed}
          options={feeds}
          idKey="id"
          labelKey="name"
          newOption={params => ({
            name: `"${params.inputValue}" toevoegen`,
            id: ''
          })}
          margin="normal"
          inputRef={feedInputRef}
        />
        <CustomAutocomplete
          label="Opslag"
          value={storage || { name: '', id: '' }}
          onChange={setStorage}
          options={storages}
          idKey="id"
          labelKey="name"
          newOption={params => ({
            name: `"${params.inputValue}" toevoegen`,
            id: ''
          })}
          margin="normal"
          inputRef={storageInputRef}
        />
        {!preSelectedAmount && <FormControl fullWidth margin="normal">
          <FormLabel filled>Aantal</FormLabel>
          <ToggleButtonGroup
            exclusive
            onChange={(e, v) => handleSubmit(e, v)}
            fullWidth
            disabled={!storage || !feed}
            color="primary"
            size="large"
          >
            <ToggleButton value={0.5} size="small">+0,5</ToggleButton>
            <ToggleButton value={1}>+1</ToggleButton>
            <ToggleButton value={2}>+2</ToggleButton>
            <ToggleButton value={3}>+3</ToggleButton>
          </ToggleButtonGroup>
        </FormControl>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose()}>Annuleren</Button>
        <Button color="success" type="submit" disabled={!storage || !feed}><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
      {saving && <LinearProgress variant="indeterminate" />}
    </Box>
  </CustomDialog>
}
