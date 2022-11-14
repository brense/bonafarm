import React, { useCallback } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Icon, Slide, TextField, useMediaQuery, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddItem() {
  const match = useMatch('/add')
  const { state } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleClose = useCallback(() => {
    navigate(state?.referrer ? state.referrer : '/')
  }, [state, navigate])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    console.log(e)
    handleClose()
  }, [handleClose])

  return <Dialog open={Boolean(match)} TransitionComponent={Transition} fullScreen={isMobile} keepMounted onClose={() => handleClose}>
    <Box component="form" sx={{ ...!isMobile && { width: 380, height: 760 }, display: 'flex', flexDirection: 'column' }} onSubmit={handleSubmit}>
      <DialogTitle>Item toevoegen</DialogTitle>
      <DialogContent sx={{ flex: 1 }}>
        <TextField label="Naam" variant="filled" margin="normal" fullWidth />
        <TextField label="Locatie" variant="filled" margin="normal" fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button color="success" type="submit"><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
    </Box>
  </Dialog>
}
