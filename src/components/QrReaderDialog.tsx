import React from 'react'
import { Box, Dialog, DialogProps, Zoom } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import QrReaderWrapper from './QrReaderWrapper'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Zoom ref={ref} {...props} />
})

export default function QrReaderDialog({ open, onClose }: Pick<DialogProps, 'open' | 'onClose'>) {
  return <Dialog open={open} TransitionComponent={Transition} keepMounted onClose={onClose}>
    <Box sx={{ width: 380 }}>
      {open && <QrReaderWrapper
        onResult={(result, error) => {
          if (result) {
            window.location.href = result.getText()
          }
        }}
        constraints={{ facingMode: 'environment' }}
      />}
    </Box>
  </Dialog>
}
