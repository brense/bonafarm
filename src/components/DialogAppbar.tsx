import { AppBar, Box, Icon, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material'

export default function DialogAppbar({ children, onClose }: React.PropsWithChildren<{ onClose?: (e: {}, reason?: 'backdropClick' | 'escapeKeyDown') => void }>) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  return <AppBar position="relative" sx={{ bgcolor: 'secondary.main' }}>
    <Toolbar sx={isMobile ? { pr: 3, pl: 1.5 } : {}} disableGutters={isMobile}>
      {isMobile && <IconButton onClick={e => onClose && onClose(e)} sx={{ mr: 0.5 }}><Icon>chevron_left</Icon></IconButton>}
      <Typography variant="h5">{children}</Typography>
      <Box component="span" sx={{ flex: 1 }} />
      {!isMobile && <IconButton onClick={e => onClose && onClose(e, 'backdropClick')} sx={{ mr: -1 }}><Icon>close</Icon></IconButton>}
    </Toolbar>
  </AppBar>
}
