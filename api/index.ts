import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { schema } from '../src/_makeSchema'

const server = new ApolloServer({
  csrfPrevention: false,
  schema
})

export default startServerAndCreateNextHandler(server)
