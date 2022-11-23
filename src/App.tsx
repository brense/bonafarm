import React from 'react'
import { gql, useQuery } from '@apollo/client'
import { Box, CircularProgress } from '@mui/material'
import { Route, Routes, useLocation } from 'react-router-dom'
import CustomAppBar from './components/CustomAppBar'

const Home = React.lazy(() => import('./pages/Home'))
const Stock = React.lazy(() => import('./pages/Stock'))
const AddItem = React.lazy(() => import('./pages/AddItem'))

const okQuery = gql`query {
  ok
}`

export default function App() {
  const { data } = useQuery(okQuery, { onError: error => console.log('ERROR', error) })
  const location = useLocation()

  console.log(data)

  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <CustomAppBar hideBackButton={location.pathname === '/'} />
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
      <React.Suspense fallback={<CircularProgress variant="indeterminate" size={120} />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/voorraad" element={<Stock />} />
          <Route path="/voorraad/:id" element={<Stock />} />
        </Routes>
        <AddItem />
      </React.Suspense>
    </Box>
  </Box>
}
