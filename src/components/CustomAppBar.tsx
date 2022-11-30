import { AppBar, Toolbar, Typography, IconButton, Icon, styled } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const Offset = styled('div')(({ theme }) => theme.mixins.toolbar)

export default function CustomAppBar({ children, onBack, hideBackButton = false }: React.PropsWithChildren<{ onBack?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => any, hideBackButton?: boolean }>) {
  const navigate = useNavigate()

  return <>
    <AppBar position="absolute" sx={{bgcolor: 'primary.main'}}>
      <Toolbar sx={{ pr: 3, pl: hideBackButton ? 1.5 : 1 }} disableGutters>
        {!hideBackButton ? <IconButton onClick={e => onBack ? onBack(e) : navigate('/')} sx={{ mr: 1 }}><Icon>chevron_left</Icon></IconButton> : <Icon fontSize="large" sx={{mr:1}}><img src="/favicon.svg" alt="De voer app" /></Icon>}
        <Typography variant="h5">{children || `De voer app`}</Typography>
      </Toolbar>
    </AppBar>
    <Offset />
  </>
}
