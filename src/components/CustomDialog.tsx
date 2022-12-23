import { Dialog, Toolbar, DialogProps, useTheme, useMediaQuery, AppBar, IconButton, Icon, Typography, Box } from '@mui/material'

export default function CustomDialog({ onClose, children, title, hideAppBar = false, showCloseButton = false, ...props }: DialogProps & { hideAppBar?: boolean, showCloseButton?: boolean }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return <Dialog fullScreen={isMobile} {...props} onClose={onClose}>
    {!hideAppBar && <AppBar position="relative" sx={{ bgcolor: 'secondary.main' }}>
      <Toolbar sx={isMobile ? { pr: 3, pl: 1.5 } : {}} disableGutters={isMobile}>
        {isMobile && <IconButton onClick={e => onClose && onClose(e, 'backdropClick')} sx={{ mr: 0.5 }}><Icon>chevron_left</Icon></IconButton>}
        <Typography variant="h5">{title || 'De voer app'}</Typography>
        <Box component="span" sx={{ flex: 1 }} />
        {showCloseButton && <IconButton onClick={e => onClose && onClose(e, 'backdropClick')} sx={{ mr: -1 }}><Icon>close</Icon></IconButton>}
      </Toolbar>
    </AppBar>}
    {children}
  </Dialog>
}
