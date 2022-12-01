import { Dialog, Toolbar, DialogProps, useTheme, useMediaQuery } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AppBar from './AppBar'

export default function CustomDialog({ onClose, children, title, hideAppBar = false, ...props }: DialogProps & { hideAppBar?: boolean }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Dialog fullScreen={isMobile} {...props} onClose={onClose}>
    {!hideAppBar && <AppBar onBack={e => onClose ? onClose(e, 'backdropClick') : navigate('/')} hideIcon={!isMobile} showLogo={false} children={title} />}
    {!hideAppBar && <Toolbar />}
    {children}
  </Dialog>
}
