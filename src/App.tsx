import React, { useState, useEffect, useCallback } from 'react'
import { AppBar, Avatar, Box, CircularProgress, Icon, IconButton, ListItemIcon, Menu, MenuItem, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { getAuth, isSignInWithEmailLink, signInWithEmailLink, User } from 'firebase/auth'
import CenteredContent from './components/CenteredContent'
import AddStorage from './pages/storage/AddStorage'
import AddFeed from './pages/feed/AddFeed'
import EditStorage from './pages/storage/EditStorage'
import AddItem from './pages/storage/AddItem'
import EditFeed from './pages/feed/EditFeed'
import Signin from './pages/Signin'
import { Subject } from 'rxjs'
import Home from './pages/Home'
import QrReaderDialog from './components/QrReaderDialog'

const Stock = React.lazy(() => import('./pages/stock/Stock'))

const auth = getAuth()
const authLoaded = new Subject<void>()
function useAuth() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user)
      authLoaded.next()
    })
    return () => unsubscribe()
  }, [])

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn')
    if (!email) {
      email = window.prompt('Geef je e-mailadres op ter bevestiging')
    }
    signInWithEmailLink(auth, email || '', window.location.href).then(() => {
      window.localStorage.removeItem('emailForSignIn')
    })
  }

  return user
}

const WaitForAuth = React.lazy(() => {
  return new Promise<{ default: React.ComponentType<any> }>(resolve => authLoaded.subscribe(() => resolve({ default: () => null })))
})

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

export function useQRScanner() {
  const { qrScanner } = useOutletContext<{ qrScanner: { show: () => void } }>()
  return qrScanner
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const user = useAuth()
  const [showScanner, setShowScanner] = useState(false)

  const handleScannerClose = useCallback(() => {
    setShowScanner(false)
    window.location.href = `${window.location.protocol}//${window.location.host}${location.pathname}`
  }, [location])

  const handleMenuItemClick = useCallback((path: string) => {
    path && navigate(path)
    setAnchorEl(null)
  }, [navigate])

  const handleShowScanner = useCallback(() => {
    setAnchorEl(null)
    setShowScanner(true)
  }, [])

  const handleLogout = useCallback(() => {
    setAnchorEl(null)
    auth.signOut()
  }, [])

  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <AppBar position="relative" sx={{ bgcolor: 'secondary.main' }}>
      <Toolbar sx={{ pr: 3, pl: 1.5 }} disableGutters>
        {icon ? <IconButton onClick={() => navigate('/')} sx={{ mr: 0.5 }}><Icon>{icon}</Icon></IconButton> : <Icon fontSize="large" sx={{ mr: 1 }}><img src="/favicon.svg" alt="De voer app" /></Icon>}
        <Typography variant="h5">{title || 'De voer app'}</Typography>
        <Box component="span" sx={{ flex: 1 }} />
        {user && <Avatar><img src={user.photoURL || ''} alt={user.displayName || ''} width={40} height={40} /></Avatar>}
        {user && <IconButton onClick={e => setAnchorEl(e.currentTarget)}><Icon>more_vert</Icon></IconButton>}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {isMobile && <MenuItem onClick={() => handleMenuItemClick('/stock')}><ListItemIcon><Icon fontSize="small">inventory_2</Icon></ListItemIcon> Voorraad</MenuItem>}
          <MenuItem onClick={handleShowScanner}><ListItemIcon><Icon fontSize="small">qr_code_scanner</Icon></ListItemIcon> QR code scannen</MenuItem>
          <MenuItem onClick={handleLogout}><ListItemIcon><Icon fontSize="small">logout</Icon></ListItemIcon> Uitloggen</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
    <React.Suspense fallback={<CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent>}>
      <WaitForAuth />
      <Routes location={location.state?.referrer || location.pathname}>
        {user ? <Route path="/" element={<Box component="main" sx={{ flex: 1, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <Outlet context={{ setTitle, setIcon, qrScanner: { show: () => setShowScanner(true) } }} />
        </Box>}>
          <Route path="/signin/*" element={<Navigate to={location.state?.redirect || '/'} replace />} />
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
            <Route path=":feedId" element={<Stock />} />
            <Route path=":feedId/edit" element={<Stock />} />
          </Route>
        </Route> : <>
          <Route path="/signin/*" element={<Signin />} />
          <Route path="*" element={<Navigate to="/signin" state={{ redirect: location.state?.redirect || location.pathname }} replace />} />
        </>}
      </Routes>
      <AddItem />
      <AddStorage />
      <EditStorage />
      <AddFeed />
      <EditFeed />
      <QrReaderDialog open={showScanner} onClose={handleScannerClose} />
    </React.Suspense>
  </Box>
}
