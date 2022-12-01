import React, { useState, useContext, useEffect } from 'react'
import { Box, CircularProgress, styled } from '@mui/material'
import { Route, Routes, useLocation } from 'react-router-dom'
import CenteredContent from './components/CenteredContent'
import AppBar from './components/AppBar'

const Home = React.lazy(() => import('./pages/Home'))
const Stock = React.lazy(() => import('./pages/Stock'))
const Storage = React.lazy(() => import('./pages/Storage'))
const AddItem = React.lazy(() => import('./pages/AddItem'))

const Offset = styled('div')(({ theme }) => theme.mixins.toolbar)

type AppBarProps = React.ComponentProps<typeof AppBar>

const AppContext = React.createContext<{ setAppBarProps: React.Dispatch<React.SetStateAction<AppBarProps>> }>({ setAppBarProps: () => { } })

export function useAppBarContext(setter: () => AppBarProps, deps?: Array<any>) {
  const { setAppBarProps } = useContext(AppContext)
  useEffect(() => {
    setAppBarProps(setter())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAppBarProps, ...deps || []])
}

export default function App() {
  const location = useLocation()
  const [appBarProps, setAppBarProps] = useState<AppBarProps>({})

  return <AppContext.Provider value={{ setAppBarProps }}>
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar {...appBarProps} />
      <Offset />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <React.Suspense fallback={<CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent>}>
          <Routes location={location.state?.referrer || location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/stock/:storageId" element={<Storage />} />
          </Routes>
          <AddItem />
        </React.Suspense>
      </Box>
    </Box>
  </AppContext.Provider >
}
