import React from 'react'
import { Box, CircularProgress, styled } from '@mui/material'
import { Route, Routes, useLocation } from 'react-router-dom'
import CenteredContent from './components/CenteredContent'
import CustomAppBar from './components/CustomAppBar'

const Home = React.lazy(() => import('./pages/Home'))
const Stock = React.lazy(() => import('./pages/Stock'))
const Storage = React.lazy(() => import('./pages/Storage'))
const AddItem = React.lazy(() => import('./pages/AddItem'))

const Offset = styled('div')(({ theme }) => theme.mixins.toolbar)

export default function App() {
  const location = useLocation()

  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <CustomAppBar hideBackButton={location.pathname === '/'}>{''}</CustomAppBar>
    <Offset />
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <React.Suspense fallback={<CenteredContent><CircularProgress variant="indeterminate" size={120} /></CenteredContent>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/stock/:storageId" element={<Storage />} />
        </Routes>
        <AddItem />
      </React.Suspense>
    </Box>
  </Box>
}
