import { Dialog, Toolbar, DialogProps, useTheme, useMediaQuery } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import CustomAppBar from './CustomAppBar'

export default function CustomDialog({ onClose, children, title, hideAppBar = false, ...props }: DialogProps & { hideAppBar?: boolean }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Dialog fullScreen={isMobile} {...props} onClose={onClose}>
    {!hideAppBar && <CustomAppBar onBack={e => onClose ? onClose(e, 'backdropClick') : navigate('/')} hideBackButton={!isMobile} children={title} />}
    {!hideAppBar && <Toolbar />}
    {children}
  </Dialog>
}
