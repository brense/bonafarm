import { Dialog, Toolbar, DialogProps, useTheme, useMediaQuery, AppBar, IconButton, Icon, Typography } from '@mui/material'

export default function CustomDialog({ onClose, children, title, hideAppBar = false, ...props }: DialogProps & { hideAppBar?: boolean }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Dialog fullScreen={isMobile} {...props} onClose={onClose}>
    {!hideAppBar && <AppBar position="relative" sx={{ bgcolor: 'secondary.main' }}>
      <Toolbar sx={isMobile ? { pr: 3, pl: 1.5 } : {}} disableGutters={isMobile}>
        {isMobile && <IconButton onClick={e => onClose && onClose(e, 'backdropClick')} sx={{ mr: 0.5 }}><Icon>chevron_left</Icon></IconButton>}
        <Typography variant="h5">{title || 'De voer app'}</Typography>
      </Toolbar>
    </AppBar>}
    {children}
  </Dialog>
}
