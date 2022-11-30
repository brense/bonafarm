import { AppBar, Toolbar, Typography, IconButton, Icon, styled } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const Offset = styled('div')(({ theme }) => theme.mixins.toolbar)

export default function CustomAppBar({ children, onBack, hideBackButton = false }: React.PropsWithChildren<{ onBack?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => any, hideBackButton?: boolean }>) {
  const navigate = useNavigate()

  return <>
    <AppBar position="absolute">
      <Toolbar sx={{ pr: 3, pl: hideBackButton ? 3 : 1 }} disableGutters>
        {!hideBackButton && <IconButton onClick={e => onBack ? onBack(e) : navigate('/')} sx={{ mr: 1 }}><Icon>chevron_left</Icon></IconButton>}
        <Typography variant="h5">{children || `De voer app`}</Typography>
      </Toolbar>
    </AppBar>
    <Offset />
  </>
}
