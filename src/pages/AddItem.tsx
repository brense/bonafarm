import React, { useRef, useEffect, useCallback } from 'react'
import { Box, Button, DialogActions, DialogContent, Icon, LinearProgress, Slide, Typography } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { useMatch, useNavigate } from 'react-router-dom'
import CustomDialog from '../components/CustomDialog'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function AddItem() {
  const match = useMatch('/stock/:storageId/add')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>()

  const handleClose = useCallback(() => {
    navigate(`/stock/${match?.params.storageId}`)
  }, [navigate, match])

  useEffect(() => {
    if (Boolean(match)) {
      inputRef.current?.focus()
    }
  }, [match])

  return <CustomDialog title="Zak toevoegen" open={Boolean(match)} TransitionComponent={Transition} keepMounted onClose={() => handleClose()}>
    <Box component="form" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 320 }}>
      <DialogContent sx={{ flex: 1 }}>
        <Typography gutterBottom>Waar wil je de zak naartoe verplaatsen?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        <Button color="success" type="submit"><Icon>save</Icon>&nbsp;&nbsp;Opslaan</Button>
      </DialogActions>
      <LinearProgress variant="indeterminate" />
    </Box>
  </CustomDialog>
}
