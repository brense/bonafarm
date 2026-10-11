#!/usr/bin/env node
/**
 * Migrates the old single-tenant kibo-voer-app data into one organisation of
 * the new model. Three steps, each safe to rerun:
 *
 *   node scripts/migrate-kibo.mjs fetch                      read-only dump of kibo prod -> migration-data/kibo/
 *   node scripts/migrate-kibo.mjs plan  --org tanthof        transform the dump -> migration-data/plan.json + report
 *   node scripts/migrate-kibo.mjs apply --org tanthof        write the plan to the emulator
 *   node scripts/migrate-kibo.mjs apply --org tanthof --live write the plan to bonafarm-next
 *
 * fetch reads about 3.7k documents from production and never writes there.
 * apply writes with deterministic ids (old log ids are kept), so a rerun
 * overwrites instead of duplicating. Costs are printed before anything is written.
 */
import fs from 'node:fs'
import path from 'node:path'

const SOURCE_PROJECT = 'kibo-voer-app'
const TARGET_PROJECT = 'bonafarm-next'
const DATA = 'migration-data'
const DUMP = path.join(DATA, 'kibo')
const PLAN = path.join(DATA, 'plan.json')
const WRITE_CAP = 10_000
const ID = /^[a-z0-9][a-z0-9-]*$/

const [cmd, ...rest] = process.argv.slice(2)
const args = {}
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) args[rest[i].slice(2)] = rest[i + 1] === undefined || rest[i + 1].startsWith('--') ? true : rest[++i]
}

// ---------------------------------------------------------------- helpers
function cliToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config/configstore/firebase-tools.json'), 'utf8'))
  const tok = cfg.tokens
  if (!tok?.access_token) throw new Error('no access token in configstore; run `firebase projects:list` first')
  if (tok.expires_at && tok.expires_at < Date.now() + 60_000) throw new Error('access token expired; run `firebase projects:list` to refresh')
  return tok.access_token
}

function fromValue(v) {
  if (v === undefined || v === null) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('nullValue' in v) return null
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]))
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue)
  return v
}

/** JS value -> Firestore REST value. Timestamps are passed as { $ts: iso }. */
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  if (typeof v === 'object' && '$ts' in v) return { timestampValue: v.$ts }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } }
}
const ts = (iso) => ({ $ts: iso })

// ---------------------------------------------------------------- fetch
async function fetchDump() {
  const headers = { Authorization: `Bearer ${cliToken()}`, 'Content-Type': 'application/json' }
  const base = `https://firestore.googleapis.com/v1/projects/${SOURCE_PROJECT}/databases/(default)/documents`
  async function runQuery(collectionId, allDescendants = false) {
    const res = await fetch(`${base}:runQuery`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId, allDescendants }] } }),
    })
    if (!res.ok) throw new Error(`${collectionId}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
    const rows = await res.json()
    return rows
      .filter((r) => r.document)
      .map((r) => {
        const rel = r.document.name.split('/documents/')[1]
        const parts = rel.split('/')
        const fields = Object.fromEntries(Object.entries(r.document.fields || {}).map(([k, x]) => [k, fromValue(x)]))
        const out = { id: parts.at(-1), ...fields }
        if (parts.length >= 4) out._parentId = parts.at(-3)
        return out
      })
  }
  fs.mkdirSync(DUMP, { recursive: true })
  const names = ['feeds', 'storages', 'items', 'logs']
  const [feeds, storages, items, logs] = await Promise.all([
    runQuery('feeds'), runQuery('storages'), runQuery('items', true), runQuery('logs'),
  ])
  const sets = { feeds, storages, items, logs }
  for (const n of names) fs.writeFileSync(path.join(DUMP, `${n}.json`), JSON.stringify(sets[n], null, 1))
  const meta = { fetchedAt: new Date().toISOString(), source: SOURCE_PROJECT, counts: Object.fromEntries(names.map((n) => [n, sets[n].length])) }
  fs.writeFileSync(path.join(DUMP, 'meta.json'), JSON.stringify(meta, null, 1))
  console.log('read-only dump written to', DUMP, meta.counts, `(${Object.values(meta.counts).reduce((a, b) => a + b, 0)} document reads on ${SOURCE_PROJECT})`)
}

// ---------------------------------------------------------------- plan
const STORAGE_TYPE = { storage: 'bin', shute: 'shute', stable: 'stable' }
/** Storages that only exist in logs; types decided in docs/stats-mockups/analysis. */
const DANGLING_STORAGES = { eendenkorrel: 'shute', gemengdgraan: 'shute', schapenkorrel: 'shute', kalveren: 'shute', overig: 'storage' }
const BALE_FEEDS = new Set(['hooi', 'stro'])

function titleCase(id) {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function buildPlan(orgId) {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(DUMP, `${f}.json`), 'utf8'))
  const feedsRaw = rd('feeds'), storagesRaw = rd('storages'), itemsRaw = rd('items'), logsRaw = rd('logs')
  const now = new Date().toISOString()
  const report = { dropped: {}, resolved: {}, unresolved: [], warnings: [] }

  // --- storages
  const storages = new Map()
  for (const s of storagesRaw) {
    storages.set(s.id, {
      id: s.id,
      oldType: s.type,
      doc: {
        groupId: 'ungrouped',
        typeId: STORAGE_TYPE[s.type],
        name: s.name.trim(),
        status: 'active',
        order: s.order ?? 0,
        ...(s.color ? { color: s.color } : {}),
        ...(s.image ? { image: s.image } : {}),
      },
    })
    if (s.status) report.warnings.push(`storage ${s.id} had status "${s.status}" (koker empty/filling state); not migrated, derive from the last empty log`)
  }
  const logStorageIds = new Set(logsRaw.map((l) => l.storageId))
  for (const id of logStorageIds) {
    if (storages.has(id)) continue
    const oldType = DANGLING_STORAGES[id]
    if (!oldType) throw new Error(`storage ${id} appears in logs but has no type decision; add it to DANGLING_STORAGES`)
    storages.set(id, { id, oldType, doc: { groupId: 'ungrouped', typeId: STORAGE_TYPE[oldType], name: `${titleCase(id)} (verwijderd)`, status: 'archived', order: 900 } })
    report.resolved[`storage ${id}`] = `archived ${STORAGE_TYPE[oldType]}`
  }
  const oldType = (id) => storages.get(id)?.oldType

  // --- feeds
  const feeds = new Map()
  for (const f of feedsRaw) {
    feeds.set(f.id, {
      name: f.name.trim(),
      unit: BALE_FEEDS.has(f.id) ? 'baal' : 'zak',
      ...(f.linkedStorageId ? { defaultStorageId: f.linkedStorageId } : {}),
      hidden: false,
      order: f.order ?? 0,
    })
    if (f.linkedStorageId && !storages.has(f.linkedStorageId)) report.warnings.push(`feed ${f.id} links to unknown storage ${f.linkedStorageId}`)
  }
  for (const id of new Set(logsRaw.map((l) => l.feedId).filter(Boolean))) {
    if (feeds.has(id)) continue
    feeds.set(id, { name: titleCase(id), unit: 'zak', hidden: true, order: 999 })
    report.resolved[`feed ${id}`] = 'hidden (only in logs)'
  }
  const shuteFeed = new Map() // shute storage id -> feed id that lives there
  for (const [fid, f] of feeds) if (f.defaultStorageId && oldType(f.defaultStorageId) === 'shute') shuteFeed.set(f.defaultStorageId, fid)

  // --- logs: pairing of moves, ported from docs/stats-mockups/analysis/analyze.mjs
  const logs = logsRaw.map((l) => ({ ...l, t: Date.parse(l.timestamp) })).sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))
  const muts = logs.filter((l) => l.type === 'mutation' && l.amount !== 0 && l.amount != null)
  report.dropped.zeroAmountMutations = logs.filter((l) => l.type === 'mutation' && !l.amount).length
  const WINDOW = 10 * 60000, EPS = 1e-9
  const usedPos = new Map(), pairedNeg = new Set() // usedPos: posLogId -> negLogId
  const negs = muts.filter((l) => l.amount < 0 && oldType(l.storageId) === 'storage')
  for (const n of negs) {
    const cand = muts
      .filter((p) => p.amount > 0 && p.feedId === n.feedId && p.storageId !== n.storageId && !usedPos.has(p.id) && Math.abs(p.t - n.t) <= WINDOW)
      .sort((a, b) => Math.abs(a.t - n.t) - Math.abs(b.t - n.t))
    const need = -n.amount
    const chosen = cand.find((p) => Math.abs(p.amount - need) < EPS)
    let group = chosen ? [chosen] : null
    if (!group) {
      const c = cand.filter((p) => p.amount < need)
      const n2 = Math.min(c.length, 12)
      let found = null
      for (let mask = 1; mask < 1 << n2 && !found; mask++) {
        let s = 0
        const g = []
        for (let i = 0; i < n2; i++) if (mask & (1 << i)) { s += c[i].amount; g.push(c[i]) }
        if (Math.abs(s - need) < EPS) found = g
      }
      group = found
    }
    if (group) { pairedNeg.add(n.id); group.forEach((p) => usedPos.set(p.id, n.id)) }
  }
  report.pairing = { movesPaired: pairedNeg.size, negativesInBins: negs.length, zeroAmount: report.dropped.zeroAmountMutations }

  // --- logs: classify
  const newLogs = new Map()
  const batches = new Map()
  const typeCount = {}
  const lastMutation = new Map() // `${storageId}_${feedId}` -> iso
  const lastFill = new Map() // shute id -> feedId of latest fill so far (logs are time-ordered)
  for (const l of logs) {
    const base = { storageId: l.storageId, uid: l.uid || 'migration', timestamp: ts(l.timestamp) }
    if (!l.uid) report.warnings.push(`log ${l.id} had no uid; set to "migration"`)
    let type, amount, feedId = l.feedId, batchId, note
    if (l.type === 'mutation') {
      if (!l.amount) continue
      const ty = oldType(l.storageId)
      amount = Math.abs(l.amount)
      if (l.amount > 0) {
        if (ty === 'shute') { type = 'fill'; lastFill.set(l.storageId, l.feedId) }
        else type = usedPos.has(l.id) ? 'move' : 'delivery'
        if (usedPos.has(l.id)) batchId = `mv-${usedPos.get(l.id)}`
      } else if (ty === 'shute') {
        // A koker has no stock to dispense from; a negative there undid a fill.
        type = 'correction'
        note = `oude app: ${l.amount} in koker`
      } else {
        type = ty === 'storage' && pairedNeg.has(l.id) ? 'move' : 'dispense'
        if (pairedNeg.has(l.id)) batchId = `mv-${l.id}`
      }
      lastMutation.set(`${l.storageId}_${l.feedId}`, l.timestamp)
    } else if (l.type === 'emptied') {
      type = 'empty'
      amount = 0
      feedId = shuteFeed.get(l.storageId) ?? lastFill.get(l.storageId) ?? (feeds.has(l.storageId) ? l.storageId : null)
      if (!feedId) { report.unresolved.push(`empty log ${l.id} on ${l.storageId}: no feed`); continue }
    } else if (l.type === 'emptying') {
      report.dropped.emptying = (report.dropped.emptying ?? 0) + 1
      continue
    } else {
      throw new Error(`unknown log type ${l.type} (${l.id})`)
    }
    if (batchId && !batches.has(batchId)) {
      batches.set(batchId, { type: 'move', uid: l.uid || 'migration', startedAt: ts(l.timestamp), closedAt: ts(l.timestamp) })
    }
    newLogs.set(l.id, { type, feedId, ...base, amount, ...(batchId ? { batchId } : {}), ...(note ? { note } : {}) })
    typeCount[type] = (typeCount[type] ?? 0) + 1
  }
  report.logTypes = typeCount

  // --- items
  const items = new Map()
  for (const it of itemsRaw) {
    const id = `${it._parentId}_${it.id}`
    if (!storages.has(it._parentId) || !feeds.has(it.id)) { report.unresolved.push(`item ${id}: unknown storage or feed`); continue }
    items.set(id, { storageId: it._parentId, feedId: it.id, amount: it.amount, updatedAt: ts(lastMutation.get(id) ?? now) })
  }

  // --- validate against the rules' constraints (REST writes bypass the rules)
  const check = (cond, msg) => { if (!cond) throw new Error(`validation: ${msg}`) }
  const hasOnly = (doc, keys) => Object.keys(doc).every((k) => keys.includes(k))
  for (const [id, s] of storages) { check(ID.test(id), `storage id ${id}`); check(['bin', 'shute', 'stable'].includes(s.doc.typeId), `storage ${id} type`) }
  for (const [id, f] of feeds) { check(ID.test(id), `feed id ${id}`); check(['zak', 'baal'].includes(f.unit), `feed ${id} unit`); if (f.defaultStorageId) check(storages.has(f.defaultStorageId), `feed ${id} defaultStorageId`) }
  for (const [id, it] of items) { check(id === `${it.storageId}_${it.feedId}`, `item id ${id}`); check(it.amount >= 0, `item ${id} amount`); check(hasOnly(it, ['storageId', 'feedId', 'amount', 'updatedAt']), `item ${id} keys`) }
  for (const [id, l] of newLogs) {
    check(['delivery', 'count', 'dispense', 'fill', 'empty', 'move', 'correction'].includes(l.type), `log ${id} type`)
    check(typeof l.amount === 'number' && l.amount >= 0, `log ${id} amount`)
    check(feeds.has(l.feedId) && storages.has(l.storageId), `log ${id} refs`)
    check(typeof l.uid === 'string' && l.uid, `log ${id} uid`)
    check(hasOnly(l, ['type', 'feedId', 'storageId', 'amount', 'previousAmount', 'batchId', 'note', 'uid', 'timestamp']), `log ${id} keys`)
    if (l.batchId) check(batches.has(l.batchId), `log ${id} batch`)
  }

  const o = `organisations/${orgId}`
  const writes = []
  for (const [id, f] of feeds) writes.push([`${o}/feeds/${id}`, f])
  for (const [id, s] of storages) writes.push([`${o}/storages/${id}`, s.doc])
  for (const [id, it] of items) writes.push([`${o}/items/${id}`, it])
  for (const [id, b] of batches) writes.push([`${o}/batches/${id}`, b])
  for (const [id, l] of newLogs) writes.push([`${o}/logs/${id}`, l])
  report.counts = { feeds: feeds.size, storages: storages.size, items: items.size, batches: batches.size, logs: newLogs.size, totalWrites: writes.length }
  return { orgId, createdAt: now, report, writes }
}

function printReport(plan) {
  const r = plan.report
  console.log(`plan for organisation ${plan.orgId}`)
  console.log('  counts   ', r.counts)
  console.log('  log types', r.logTypes)
  console.log('  pairing  ', r.pairing)
  console.log('  dropped  ', r.dropped)
  console.log('  resolved ', r.resolved)
  if (r.unresolved.length) console.log('  UNRESOLVED', r.unresolved)
  if (r.warnings.length) console.log('  warnings ', r.warnings.length, r.warnings.slice(0, 8))
}

// ---------------------------------------------------------------- apply
async function apply(plan, live) {
  const headers = live
    ? { Authorization: `Bearer ${cliToken()}`, 'Content-Type': 'application/json' }
    : { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }
  const host = live ? 'https://firestore.googleapis.com' : `http://127.0.0.1:${process.env.FIRESTORE_EMULATOR_PORT ?? 8080}`
  const root = `projects/${TARGET_PROJECT}/databases/(default)/documents`
  const base = `${host}/v1/${root}`
  const o = `organisations/${plan.orgId}`

  // The organisation must be seeded first; migrated docs reference these.
  for (const p of [o, `${o}/storageGroups/ungrouped`, `${o}/storageTypes/bin`, `${o}/storageTypes/shute`, `${o}/storageTypes/stable`]) {
    const res = await fetch(`${base}/${p}`, { headers })
    if (res.status !== 200) throw new Error(`target is missing ${p} (HTTP ${res.status}); run the seed first`)
  }
  if (plan.writes.length > WRITE_CAP && !args.force) throw new Error(`${plan.writes.length} writes exceeds the cap of ${WRITE_CAP}; pass --force`)
  console.log(`${live ? 'LIVE ' + TARGET_PROJECT : 'emulator'}: writing ${plan.writes.length} documents in batches of 500`)

  let done = 0
  for (let i = 0; i < plan.writes.length; i += 500) {
    const chunk = plan.writes.slice(i, i + 500)
    const body = { writes: chunk.map(([p, doc]) => ({ update: { name: `${root}/${p}`, fields: toValue(doc).mapValue.fields } })) }
    const res = await fetch(`${base}:batchWrite`.replace('/documents:batchWrite', '/documents:batchWrite'), { method: 'POST', headers, body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`batchWrite HTTP ${res.status} ${(await res.text()).slice(0, 500)}`)
    const out = await res.json()
    const failed = (out.status ?? []).filter((s) => s.code && s.code !== 0)
    if (failed.length) throw new Error(`batch ${i / 500}: ${failed.length} writes failed, first: ${JSON.stringify(failed[0])}`)
    done += chunk.length
    console.log(`  ${done}/${plan.writes.length}`)
  }

  // Verify with count aggregations: one read per 1000 documents, not one per document.
  for (const c of ['feeds', 'storages', 'items', 'batches', 'logs']) {
    const res = await fetch(`${base}/${o}:runAggregationQuery`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: c }] }, aggregations: [{ alias: 'n', count: {} }] } }),
    })
    const rows = await res.json()
    const n = Number(rows[0]?.result?.aggregateFields?.n?.integerValue ?? NaN)
    const expected = plan.report.counts[c]
    console.log(`  ${c}: ${n} documents (plan ${expected})${n === expected ? '' : '  MISMATCH'}`)
  }
}

// ---------------------------------------------------------------- main
try {
  if (cmd === 'fetch') {
    await fetchDump()
  } else if (cmd === 'plan') {
    if (typeof args.org !== 'string') throw new Error('--org is required')
    const plan = buildPlan(args.org)
    fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1))
    printReport(plan)
    console.log('written to', PLAN)
  } else if (cmd === 'apply') {
    if (typeof args.org !== 'string') throw new Error('--org is required')
    const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'))
    if (plan.orgId !== args.org) throw new Error(`plan is for ${plan.orgId}, not ${args.org}; rerun plan`)
    printReport(plan)
    await apply(plan, Boolean(args.live))
  } else {
    console.error('usage: migrate-kibo.mjs fetch | plan --org <id> | apply --org <id> [--live] [--force]')
    process.exit(2)
  }
} catch (err) {
  console.error('error:', err.message)
  process.exit(1)
}
