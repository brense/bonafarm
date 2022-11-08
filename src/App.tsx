import { gql, useQuery } from '@apollo/client'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'

const okQuery = gql`query {
  ok
}`

export default function App() {
  const { data } = useQuery(okQuery, { onError: error => console.log('ERROR', error) })

  console.log(data)

  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/:id" element={<span>Voorraad</span>} />
  </Routes>
}
