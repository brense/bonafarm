import http from 'http'
import express from 'express'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { json } from 'body-parser'
import { schema } from '../src/_makeSchema'

const app = express()
const httpServer = http.createServer(app)

const server = new ApolloServer({
  csrfPrevention: false,
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
})

export default new Promise(async resolve => {
  await server.start()
  app.use(
    '/api',
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
    }),
  )
  resolve(httpServer)
})
