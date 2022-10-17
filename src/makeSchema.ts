import path from 'path'
import { SchemaConfig } from 'nexus/dist/builder'
import { makeSchema as makeNexusSchema } from 'nexus'
import * as types from './types'

export function makeSchema(config?: Partial<SchemaConfig>) {
  const schema = makeNexusSchema({
    types,
    outputs: {
      typegen: path.resolve(__dirname, './graphql/nexus-typegen.ts'),
      schema: path.resolve(__dirname, './graphql/schema.graphql')
    },
    ...config
  })
  return schema
}
