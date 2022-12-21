import React, { useState, useEffect, useCallback } from 'react'
import { AppBar, Box, CircularProgress, Icon, IconButton, ListItemIcon, Menu, MenuItem, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import CenteredContent from './components/CenteredContent'
import AddStorage from './pages/AddStorage'
import AddFeed from './pages/AddFeed'
import EditStorage from './pages/EditStorage'

const Stock = React.lazy(() => import('./pages/Stock'))

export function useTitle(title: string | null) {
  const { setTitle } = useOutletContext<{ setTitle: (title: string | null) => void }>()
  useEffect(() => {
    setTitle(title)
  }, [setTitle, title])
}

export function useIcon(icon: string | null) {
  const { setIcon } = useOutletContext<{ setIcon: (icon: string | null) => void }>()
  useEffect(() => {
    setIcon(icon)
  }, [setIcon, icon])
}

// TODO: ...
function Home() {
  useTitle(null)
  useIcon(null)
  return <Typography>Home...</Typography>
}

function OutletWithContext() {
  const context = useOutletContext()
  return <Outlet context={context} />
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [title, setTitle] = useState<string | null>(null)
  const [icon, setIcon] = useState<string | null>(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const user = true

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenuItemClick = useCallback((path: string) => {
    path && navigate(path)
    setAnchorEl(null)
  }, [navigate])

  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <AppBar position="relative" sx={{ bgcolor: 'secondary.main' }}>
      <Toolbar sx={{ pr: 3, pl: 1.5 }} disableGutters>
        {icon ? <IconButton onClick={() => navigate('/')} sx={{ mr: 0.5 }}><Icon>{icon}</Icon></IconButton> : <Icon fontSize="large" sx={{ mr: 1 }}><img src="/favicon.svg" alt="De voer app" /></Icon>}
        <Typography variant="h5">{title || 'De voer app'}</Typography>
        <Box component="span" sx={{ flex: 1 }} />
        {user && !isMobile && <IconButton onClick={e => setAnchorEl(e.currentTarget)}><Icon>more_vert</Icon></IconButton>}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => handleMenuItemClick('/stock')}><ListItemIcon><Icon fontSize="small">inventory_2</Icon></ListItemIcon> Voorraad</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick('/stock')}><ListItemIcon><Icon fontSize="small">qr_code_scanner</Icon></ListItemIcon> QR code scannen</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
    <React.Suspense fallback={<CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent>}>
      <Routes location={location.state?.referrer || location.pathname}>
        {!user ? <Route path="/login" element={<>login...</>} /> : <Route path="/login" element={<Navigate to={location.state?.referrer || '/'} replace />} />}
        {user ? <Route path="/" element={<Box component="main" sx={{ flex: 1, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <Outlet context={{ setTitle, setIcon }} />
        </Box>}>
          <Route index element={isMobile ? <Home /> : <Navigate to="/stock" replace />} />
          <Route path="stock" element={<OutletWithContext />}>
            <Route index element={<Stock />} />
            <Route path="add" element={<Stock />} />
            <Route path=":storageId" element={<Stock />} />
            <Route path=":storageId/edit" element={<Stock />} />
          </Route>
          <Route path="feed" element={<OutletWithContext />}>
            <Route index element={<Stock />} />
            <Route path="add" element={<Stock />} />
            <Route path=":feedId" element={<Stock />} />{/** move to dialog */}
          </Route>
        </Route> : <Route path="*" element={<Navigate to="/login" state={{ referrer: location.pathname }} replace />} />}
      </Routes>
      {/** log item... [add/edit] */}
      <AddStorage />
      <EditStorage />
      <AddFeed />
    </React.Suspense>
  </Box>
}
