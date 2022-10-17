import { Typography } from '@mui/material'
import { gql, useQuery } from '@apollo/client'

const okQuery = gql`query {
  ok
}`

export default function App() {
  const { data } = useQuery(okQuery, { onError: error => console.log('ERROR', error) })

  console.log(data)

  return <Typography>Hello world</Typography>
}
