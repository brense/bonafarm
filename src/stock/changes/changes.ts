import type { LogType } from '../../model/types.ts'
import { LOG_LABEL } from '../logLabels.ts'
import { formatAmount } from '../stock.ts'

export interface ChangeLog {
  id: string
  type: LogType
  feedId: string
  storageId: string
  amount: number
  previousAmount?: number
  batchId?: string
  /** null while the write is pending (no server timestamp yet). */
  timestampMs: number | null
}

export type Perspective =
  | { kind: 'feed'; storageName: (id: string) => string }
  | { kind: 'storage'; storageId: string; feedName: (id: string) => string }

export type ChangeKind = 'added' | 'consumed' | 'empty' | 'move' | 'count'

export interface ChangeEntry {
  key: string
  kind: ChangeKind
  sign: '+' | '−' | ''
  amount: number | null
  names: string
  label: string
  timestampMs: number | null
}

type View = Pick<ChangeEntry, 'sign' | 'amount' | 'names' | 'label'>

/** Feed-centric wording: the feed page shows the history of one feed, not of a storage. */
const FEED_LABEL: Record<LogType, string> = { ...LOG_LABEL, delivery: 'toegevoegd', dispense: 'verbruikt' }

const KIND: Record<LogType, ChangeKind> = {
  delivery: 'added',
  correction: 'added',
  fill: 'added',
  dispense: 'consumed',
  empty: 'empty',
  move: 'move',
  count: 'count',
}

const SIGN: Record<ChangeKind, ChangeEntry['sign']> = { added: '+', consumed: '−', move: '', count: '', empty: '' }

function single(log: ChangeLog, p: Perspective): View {
  const kind = KIND[log.type]
  const countLabel = log.previousAmount !== undefined ? `geteld (was ${formatAmount(log.previousAmount)})` : 'geteld'
  if (p.kind === 'storage') {
    const feed = p.feedName(log.feedId)
    if (log.type === 'empty') return { sign: '', amount: null, names: 'Koker leeg gemaakt', label: feed }
    if (log.type === 'move') {
      const out = log.previousAmount !== undefined || log.batchId === `mv-${log.id}`
      return { sign: out ? '−' : '+', amount: log.amount, names: feed, label: LOG_LABEL.move }
    }
    return { sign: SIGN[kind], amount: log.amount, names: feed, label: log.type === 'count' ? countLabel : FEED_LABEL[log.type] }
  }
  const name = p.storageName
  if (log.type === 'empty') return { sign: '', amount: null, names: 'Koker leeg gemaakt', label: name(log.storageId) }
  const label = log.type === 'count' ? countLabel : FEED_LABEL[log.type]
  return { sign: SIGN[kind], amount: log.amount, names: name(log.storageId), label }
}

/**
 * Source and destination of a move batch (`asc` is oldest first), decided in order:
 * (a) one half is a `fill` (into a koker): the other half is the source;
 * (b) the half with `previousAmount` is the source (the out half carries the source stock);
 * (c) migrated moves: the batch id is `mv-<id of the old out log>`, so the half whose id matches is the source;
 * (d) otherwise the earlier timestamp (ties keep the given order).
 */
export function moveHalves(asc: ChangeLog[], batchId?: string): [ChangeLog, ChangeLog] {
  const halves = asc.length > 2 ? asc.filter((l) => l.type === 'move' || l.type === 'fill').slice(0, 2) : asc
  const [x, y] = halves
  if (!y) return [x, x]
  const fillIdx = halves.findIndex((l) => l.type === 'fill')
  let src = -1
  if (fillIdx >= 0) src = 1 - fillIdx
  else {
    const withPrev = halves.filter((l) => l.previousAmount !== undefined)
    if (withPrev.length === 1) src = halves.indexOf(withPrev[0])
    else if (batchId?.startsWith('mv-')) {
      const id = batchId.slice(3)
      const byId = halves.filter((l) => l.id === id)
      if (byId.length === 1) src = halves.indexOf(byId[0])
    }
  }
  if (src < 0) src = (x.timestampMs ?? Infinity) <= (y.timestampMs ?? Infinity) ? 0 : 1
  return src === 0 ? [x, y] : [y, x]
}

function batch(group: ChangeLog[], p: Perspective): View {
  // `group` is newest first; the two halves of a move are written in order, out first.
  const asc = [...group].reverse()
  const storage = p.kind === 'storage'
  const key = (l: ChangeLog) => (storage ? l.feedId : l.storageId)
  const name = storage ? p.feedName : p.storageName
  if (asc.every((l) => l.type === 'delivery')) {
    const per = new Map<string, number>()
    for (const l of asc) per.set(key(l), (per.get(key(l)) ?? 0) + l.amount)
    const sum = asc.reduce((n, l) => n + l.amount, 0)
    const names =
      per.size === 1 ? name([...per.keys()][0]) : [...per].map(([id, a]) => `${formatAmount(a)} ${name(id)}`).join(' · ')
    return { sign: '+', amount: sum, names, label: FEED_LABEL.delivery }
  }
  if (!storage && asc.some((l) => l.type === 'move')) {
    const [from, to] = moveHalves(asc, group[0].batchId)
    return { sign: '', amount: from.amount, names: `${name(from.storageId)} → ${name(to.storageId)}`, label: FEED_LABEL.move }
  }
  const names = [...new Set(asc.map((l) => name(key(l))))].join(' · ')
  return { ...single(asc[0], p), names }
}

/**
 * Groups logs (newest first) that share a batch into one entry each, newest first.
 * The feed perspective leaves out `empty` logs: they only mean something per storage.
 */
export function buildChanges(logsNewestFirst: ChangeLog[], perspective: Perspective): ChangeEntry[] {
  const groups: ChangeLog[][] = []
  const byBatch = new Map<string, ChangeLog[]>()
  for (const l of logsNewestFirst) {
    if (perspective.kind === 'feed' && l.type === 'empty') continue
    if (l.batchId === undefined) {
      groups.push([l])
      continue
    }
    const g = byBatch.get(l.batchId)
    if (g) g.push(l)
    else {
      const created = [l]
      byBatch.set(l.batchId, created)
      groups.push(created)
    }
  }
  return groups.map((g, i) => {
    const asc0 = g[g.length - 1]
    const kind: ChangeKind =
      g.length > 1 && g.every((l) => l.type === 'delivery') ? 'added'
      : g.length > 1 && g.some((l) => l.type === 'move') ? 'move'
      : KIND[(g.length > 1 ? asc0 : g[0]).type]
    const view = g.length === 1 ? single(g[0], perspective) : batch(g, perspective)
    return { key: `${g[0].batchId ?? g[0].timestampMs ?? g[0].id}-${i}`, kind, ...view, timestampMs: g[0].timestampMs }
  })
}
