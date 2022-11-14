import { gql, useQuery } from '@apollo/client'
import { Box } from '@mui/material'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'

const okQuery = gql`query {
  ok
}`

export default function App() {
  const { data } = useQuery(okQuery, { onError: error => console.log('ERROR', error) })

  console.log(data)

  return <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:id" element={<span>Voorraad</span>} />
    </Routes>
  </Box>
}
