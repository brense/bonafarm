// Read-only Firestore dump via REST :runQuery. Uses the firebase CLI's stored OAuth access token.
// Never prints the token. Writes JSON to the data dir only.
import fs from 'node:fs'
import path from 'node:path'

const PROJECT = 'kibo-voer-app'
const OUT = process.argv[2]
if (!OUT) { console.error('usage: node fetch.mjs <outdir>'); process.exit(2) }
const cfgPath = path.join(process.env.HOME, '.config/configstore/firebase-tools.json')
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const tok = cfg.tokens
if (!tok?.access_token) { console.error('no access token in configstore'); process.exit(1) }
if (tok.expires_at && tok.expires_at < Date.now() + 60_000) { console.error('access token expired; run any read-only firebase CLI command to refresh'); process.exit(1) }
const headers = { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' }
const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

function val(v) {
  if (v === undefined || v === null) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('nullValue' in v) return null
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)]))
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val)
  if ('referenceValue' in v) return v.referenceValue
  if ('geoPointValue' in v) return v.geoPointValue
  return v
}

async function runQuery(collectionId, allDescendants = false) {
  const body = { structuredQuery: { from: [{ collectionId, allDescendants }] } }
  const res = await fetch(`${base}:runQuery`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${collectionId}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
  const rows = await res.json()
  return rows.filter(r => r.document).map(r => {
    const name = r.document.name // projects/.../documents/<path>
    const rel = name.split('/documents/')[1]
    const parts = rel.split('/')
    const fields = Object.fromEntries(Object.entries(r.document.fields || {}).map(([k, x]) => [k, val(x)]))
    const out = { id: parts[parts.length - 1], _path: rel, ...fields }
    if (parts.length >= 4) out._parentId = parts[parts.length - 3]
    return out
  })
}

const [feeds, storages, items, logs] = await Promise.all([
  runQuery('feeds'), runQuery('storages'), runQuery('items', true), runQuery('logs'),
])
// strip uid (personal data) from logs before writing
const logsClean = logs.map(({ uid, ...rest }) => ({ ...rest, hasUid: Boolean(uid) }))
fs.writeFileSync(path.join(OUT, 'feeds.json'), JSON.stringify(feeds, null, 1))
fs.writeFileSync(path.join(OUT, 'storages.json'), JSON.stringify(storages, null, 1))
fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify(items, null, 1))
fs.writeFileSync(path.join(OUT, 'logs.json'), JSON.stringify(logsClean, null, 1))
console.log(JSON.stringify({ feeds: feeds.length, storages: storages.length, items: items.length, logs: logs.length }))
