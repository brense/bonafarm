import React from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Route, Routes, useLocation } from 'react-router-dom'
import CustomAppBar from './components/CustomAppBar'
import CenteredContent from './components/CenteredContent'

const Home = React.lazy(() => import('./pages/Home'))
const Stock = React.lazy(() => import('./pages/Stock'))
const Storage = React.lazy(() => import('./pages/Storage'))
const AddItem = React.lazy(() => import('./pages/AddItem'))

export default function App() {
  const location = useLocation()

  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <CustomAppBar hideBackButton={location.pathname === '/'} />
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
