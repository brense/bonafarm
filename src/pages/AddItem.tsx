import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Box, Button, DialogActions, DialogContent, Icon, LinearProgress, Slide, Typography } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'
import { useFeed, useStorages } from '../hooks/firebase'
import CustomAutocomplete from '../components/CustomAutocomplete'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddItem() {
  const match = useMatch('/stock/:storageId/add')
  const navigate = useNavigate()
  const { data: storages } = useStorages() // TODO: make proper loading states in the autocomplete
  const { data: feeds } = useFeed() // TODO: make proper loading states in the autocomplete
  const inputRef = useRef<HTMLInputElement>()
  const [item, setItem] = useState<{ name: string, id: string, inputValue?: string } | null>()
  const [storage, setStorage] = useState<{ name: string, id: string, inputValue?: string } | null>()

  const handleClose = useCallback((reason?: 'backdropClick' | 'escapeKeyDown') => {
    navigate(!reason ? `/stock/${match?.params.storageId}` : '/stock')
  }, [navigate, match])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return <CustomDialog title="Zak toevoegen" open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={(e, reason) => handleClose(reason)}>
    <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }}>
      <DialogContent sx={{ flex: 1 }}>
        <Typography gutterBottom>Waar wil je de zak naartoe verplaatsen?</Typography>
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
      <LinearProgress variant="indeterminate" />
    </Box>
  </CustomDialog>
}
