import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import React from 'react'

const uri = `/api`
const cache = new InMemoryCache()

const client = new ApolloClient({ uri, cache })

export default function ApolloClientProvider({ children }: React.PropsWithChildren<unknown>) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
