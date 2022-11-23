import React from 'react'
import { Box, DialogProps, useMediaQuery, Zoom, useTheme } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import QrReaderWrapper from './QrReaderWrapper'
import CustomDialog from './CustomDialog'

const Transition = React.forwardRef(function Transition(props: TransitionProps & { children: React.ReactElement<any, any> }, ref: React.Ref<unknown>,) {
  return <Zoom ref={ref} {...props} />
})

export default function QrReaderDialog({ open, onClose }: Pick<DialogProps, 'open' | 'onClose'>) {
  const theme = useTheme()
  const isPortrait = useMediaQuery('(orientation: portrait)')
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <CustomDialog open={open} TransitionComponent={Transition} keepMounted hideAppBar={!isMobile} onClose={onClose} PaperProps={{ sx: { bgcolor: 'black', backgroundImage: 'none' } }}>
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', marginTop: isMobile ? -8 : 0 }}>
      <Box sx={isPortrait ? { width: '100%' } : { width: isMobile ? window.innerHeight : 600 }}>
        {open && <QrReaderWrapper
          onResult={(result, error) => {
            if (result) {
              window.location.href = result.getText()
            }
          }}
          constraints={{ facingMode: 'environment' }}
        />}
      </Box>
    </Box>
  </CustomDialog>
}
