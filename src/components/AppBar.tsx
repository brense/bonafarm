import { AppBar as MuiAppBar, Toolbar, Typography, IconButton, Icon } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'

export default function AppBar({ children, onBack, hideIcon = false, showLogo = true }: React.PropsWithChildren<{ onBack?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => any, hideIcon?: boolean, showLogo?: boolean }>) {
  const navigate = useNavigate()
  const { state } = useLocation()

  return <>
    <MuiAppBar position="absolute" sx={{ bgcolor: 'primary.main' }}>
      <Toolbar sx={hideIcon ? { px: 3 } : { pr: 3, pl: showLogo ? 1.5 : 1 }} disableGutters>
        {hideIcon ? null : !showLogo ? <IconButton onClick={e => onBack ? onBack(e) : navigate(state?.goBack || state?.referrer || '/')} sx={{ mr: 1 }}><Icon>chevron_left</Icon></IconButton> : <Icon fontSize="large" sx={{ mr: 1 }}><img src="/favicon.svg" alt="De voer app" /></Icon>}
        <Typography variant="h5">{children || `De voer app`}</Typography>
      </Toolbar>
    </MuiAppBar>
  </>
}
