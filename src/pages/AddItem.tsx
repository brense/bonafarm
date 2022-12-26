import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Box, Button, DialogActions, DialogContent, Icon, LinearProgress, Slide, Typography } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import { useFeed, useStorages } from '../hooks/firebase'
import CustomAutocomplete from '../components/CustomAutocomplete'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddItem() {
  const match = useMatch('/stock/:storageId/add')
  const location = useLocation()
  const navigate = useNavigate()
  const { data: storages } = useStorages() // TODO: make proper loading states in the autocomplete
  const { data: feeds } = useFeed() // TODO: make proper loading states in the autocomplete
  const inputRef = useRef<HTMLInputElement>()
  const [item, setItem] = useState<{ name: string, id: string, inputValue?: string } | null>()
  const [storage, setStorage] = useState<{ name: string, id: string, inputValue?: string } | null>()
  const [saving, setSaving] = useState(false)

  const handleClose = useCallback((reason?: 'backdropClick' | 'escapeKeyDown') => {
    setStorage(null)
    setItem(null)
    setSaving(false)
    navigate(!reason ? `/stock/${match?.params.storageId}` : '/stock')
  }, [navigate, match])

  const handleSubmit = useCallback(async (e:React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    // TODO: submit data!
    handleClose()
  }, [handleClose])

  useEffect(() => {
    location.state?.movedItem && setItem(feeds.find(f => f.id === location.state.movedItem.id))
  }, [location.state, feeds])

  useEffect(() => {
    match?.params.storageId && setStorage(storages.find(s => s.id === match?.params.storageId) || null)
  }, [match, storages])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return <CustomDialog title={location.state?.movedItem ? 'Zak verplaatsen' : 'Zak toevoegen'} open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={(e, reason) => handleClose(reason)}>
    <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }}>
      <DialogContent sx={{ flex: 1 }}>
        {location.state?.movedItem && <Typography gutterBottom>Waar wil je de zak naartoe verplaatsen?</Typography>}
        <CustomAutocomplete
          label="Naam"
          value={item || { name: '', id: '' }}
          onChange={setItem}
          options={feeds}
          idKey="id"
          labelKey="name"
          newOption={params => ({
            name: `"${params.inputValue}" toevoegen`,
            id: ''
          })}
          margin="normal"
          inputRef={inputRef}
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
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose()}>Annuleren</Button>
        <Button color="success" type="submit"><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
      {saving && <LinearProgress variant="indeterminate" />}
    </Box>
  </CustomDialog>
}
