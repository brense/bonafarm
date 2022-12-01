import path from 'path'
import { makeSchema as makeNexusSchema } from 'nexus'
import * as types from './types'
import dotenv from 'dotenv'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
dotenv.config()

if (getApps().length === 0) {
  const { FIREBASE_SERVICE_ACCOUNT = '{}' } = process.env
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
  serviceAccount.project_id && initializeApp({ credential: cert(serviceAccount) })
}

export const schema = makeNexusSchema({
  types,
  outputs: {
    typegen: path.resolve(__dirname, './graphql/nexus-typegen.ts'),
    schema: path.resolve(__dirname, './graphql/schema.graphql')
  }
})
