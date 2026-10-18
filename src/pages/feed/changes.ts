import type { LogType, Unit } from '../../model/types.ts'
import { LOG_LABEL } from '../../stock/logLabels.ts'
import { formatAmount, unitLabel } from '../../stock/stock.ts'
import type { FeedLog } from '../../stock/useFeedLogs.ts'
import { changeDateTime } from './format.ts'

export type ChangeKind = 'added' | 'consumed' | 'empty' | 'move' | 'count'

export interface ChangeEntry {
  key: string
  kind: ChangeKind
  headline: string
  detail: string
  date: string
}

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

function amountText(unit: Unit, amount: number): string {
  return `${formatAmount(amount)} ${unitLabel(unit, amount)}`
}

function single(log: FeedLog, unit: Unit, name: (id: string) => string): { headline: string; detail: string } {
  let headline: string
  if (log.type === 'empty') headline = LOG_LABEL.empty.replace(/^k/, 'K')
  else if (log.type === 'count' && log.previousAmount !== undefined) headline = `${amountText(unit, log.amount)} geteld (was ${formatAmount(log.previousAmount)})`
  else headline = `${amountText(unit, log.amount)} ${FEED_LABEL[log.type]}`
  return { headline, detail: name(log.storageId) }
}

/**
 * Source and destination of a move batch (`asc` is oldest first), decided in order:
 * (a) one half is a `fill` (into a koker): the other half is the source;
 * (b) the half with `previousAmount` is the source (the out half carries the source stock);
 * (c) migrated moves: the batch id is `mv-<id of the old out log>`, so the half whose id matches is the source;
 * (d) otherwise the earlier timestamp (ties keep the given order).
 */
export function moveHalves(asc: FeedLog[], batchId?: string): [FeedLog, FeedLog] {
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
  if (src < 0) src = x.timestampMs <= y.timestampMs ? 0 : 1
  return src === 0 ? [x, y] : [y, x]
}

function batch(group: FeedLog[], unit: Unit, name: (id: string) => string): { headline: string; detail: string } {
  // `group` is newest first; the two halves of a move are written in order, out first.
  const asc = [...group].reverse()
  const first = asc[0]
  if (asc.every((l) => l.type === 'delivery')) {
    const per = new Map<string, number>()
    for (const l of asc) per.set(l.storageId, (per.get(l.storageId) ?? 0) + l.amount)
    const sum = asc.reduce((n, l) => n + l.amount, 0)
    const detail =
      per.size === 1 ? name([...per.keys()][0]) : [...per].map(([id, a]) => `${formatAmount(a)} ${name(id)}`).join(' · ')
    return { headline: `${amountText(unit, sum)} toegevoegd`, detail }
  }
  if (asc.some((l) => l.type === 'move')) {
    const [from, to] = moveHalves(asc, group[0].batchId)
    return { headline: `${amountText(unit, from.amount)} verplaatst`, detail: `${name(from.storageId)} → ${name(to.storageId)}` }
  }
  const names = [...new Set(asc.map((l) => name(l.storageId)))].join(' · ')
  return { headline: single(first, unit, name).headline, detail: names }
}

/** Groups logs (newest first) that share a batch into one entry each, newest first. */
export function buildChanges(logsNewestFirst: FeedLog[], unit: Unit, name: (id: string) => string, nowMs: number): ChangeEntry[] {
  const groups: FeedLog[][] = []
  const byBatch = new Map<string, FeedLog[]>()
  for (const l of logsNewestFirst) {
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
    const view = g.length === 1 ? single(g[0], unit, name) : batch(g, unit, name)
    return { key: `${g[0].batchId ?? g[0].timestampMs}-${i}`, kind, ...view, date: changeDateTime(g[0].timestampMs, nowMs) }
  })
}
