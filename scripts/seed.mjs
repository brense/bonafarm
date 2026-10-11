#!/usr/bin/env node
/**
 * Seeds one organisation with its default storage types, the default storage
 * group and an owner member. Idempotent: existing documents are left alone.
 *
 * Talks to Firestore over REST so it needs no service account:
 *   - against the emulator (default):  node scripts/seed.mjs --org tanthof --owner <uid>
 *   - against the real project:        node scripts/seed.mjs --org tanthof --owner <uid> --live
 *
 * For --live the Firebase CLI's OAuth access token is used. Run any firebase
 * command first (e.g. `firebase projects:list`) so the cached token is fresh,
 * or pass FIREBASE_ACCESS_TOKEN in the environment.
 *
 * Writes: 1 organisation + 1 member + 3 storage types + 1 storage group = 6 docs.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = parseArgs(process.argv.slice(2))
const PROJECT = args.project ?? 'bonafarm-next'
const ORG = args.org
const OWNER = args.owner
const LIVE = Boolean(args.live)
const ORG_NAME = args.name ?? 'Kinderboerderij Tanthof'
const OWNER_NAME = args['owner-name'] ?? 'Eigenaar'

if (!ORG || !OWNER) {
  console.error('usage: node scripts/seed.mjs --org <orgId> --owner <uid> [--name "Org name"] [--owner-name "Name"] [--live] [--project id]')
  process.exit(1)
}

const base = LIVE
  ? `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
  : `http://127.0.0.1:${process.env.FIRESTORE_EMULATOR_PORT ?? 8080}/v1/projects/${PROJECT}/databases/(default)/documents`

const token = LIVE ? await accessToken() : 'owner'
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const now = new Date().toISOString()

const docs = [
  [`organisations/${ORG}`, { name: str(ORG_NAME), createdAt: ts(now) }],
  [`organisations/${ORG}/members/${OWNER}`, { uid: str(OWNER), role: str('owner'), displayName: str(OWNER_NAME), createdAt: ts(now) }],
  [`organisations/${ORG}/storageTypes/bin`, { name: str('Bak'), behaviour: str('counted'), order: int(0) }],
  [`organisations/${ORG}/storageTypes/shute`, { name: str('Koker'), behaviour: str('consumed'), order: int(1) }],
  [`organisations/${ORG}/storageTypes/stable`, { name: str('Stal'), behaviour: str('counted'), order: int(2) }],
  [`organisations/${ORG}/storageGroups/ungrouped`, { name: str('Ongegroepeerd'), order: int(0) }],
]

console.log(`${LIVE ? 'LIVE' : 'emulator'} project ${PROJECT}, organisation ${ORG}`)
let created = 0
for (const [path, fields] of docs) {
  const exists = await fetch(`${base}/${path}`, { headers }).then((r) => r.status === 200)
  if (exists) {
    console.log(`  skip   ${path}`)
    continue
  }
  // currentDocument.exists=false makes the write fail instead of overwriting
  // if the document appeared in the meantime.
  const res = await fetch(`${base}/${path}?currentDocument.exists=false`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    console.error(`  FAILED ${path}: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  console.log(`  create ${path}`)
  created++
}
console.log(`done, ${created} created, ${docs.length - created} skipped`)

function str(v) { return { stringValue: v } }
function int(v) { return { integerValue: String(v) } }
function ts(v) { return { timestampValue: v } }

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[key] = true
    else { out[key] = next; i++ }
  }
  return out
}

async function accessToken() {
  if (process.env.FIREBASE_ACCESS_TOKEN) return process.env.FIREBASE_ACCESS_TOKEN
  const file = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  try {
    const cfg = JSON.parse(readFileSync(file, 'utf8'))
    const t = cfg?.tokens?.access_token
    if (t) return t
  } catch {}
  console.error('No Firebase CLI token found. Run `firebase login`, or set FIREBASE_ACCESS_TOKEN.')
  process.exit(1)
}
