import path from 'path'
import { makeSchema as makeNexusSchema } from 'nexus'
import * as types from './types'

export const schema = makeNexusSchema({
  types,
  outputs: {
    typegen: path.resolve(__dirname, './graphql/nexus-typegen.ts'),
    schema: path.resolve(__dirname, './graphql/schema.graphql')
  }
})
