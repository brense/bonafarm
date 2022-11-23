import React, { useCallback } from 'react'
import { Box, Button, DialogActions, DialogContent, Icon, Slide, TextField } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddItem() {
  const match = useMatch('/voorraad/add')
  const { state } = useLocation()
  const navigate = useNavigate()

  const handleClose = useCallback(() => {
    console.log('close dialog')
    navigate(state?.referrer ? state.referrer : '/')
  }, [state, navigate])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    console.log(e)
    handleClose()
  }, [handleClose])

  return <CustomDialog title="Item toevoegen" open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={() => handleClose()}>
    <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} onSubmit={handleSubmit}>
      <DialogContent sx={{ flex: 1 }}>
        <TextField label="Naam" variant="filled" margin="normal" fullWidth />
        <TextField label="Locatie" variant="filled" margin="normal" fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button color="success" type="submit"><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
    </Box>
  </CustomDialog>
}
