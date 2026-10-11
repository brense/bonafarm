// Shared order advice derived from summary.json. Formula documented in advice.json.meta.
import fs from 'node:fs'
const s = JSON.parse(fs.readFileSync('summary.json', 'utf8'))
const REF = new Date('2026-10-06T12:00:00+02:00')
const NEXT_DELIVERY = new Date('2026-10-16T12:00:00+02:00')   // deliveries: Friday, every 2 weeks (4 sep, 18 sep, 2 okt, ...)
const DELIVERY_AFTER = new Date('2026-10-30T12:00:00+02:00')
const SAFETY_DAYS = 7
const daysToNext = Math.round((NEXT_DELIVERY - REF) / 86400000)       // 10
const daysToAfter = Math.round((DELIVERY_AFTER - REF) / 86400000)     // 24
const TARGET_DAYS = daysToAfter + SAFETY_DAYS                           // 31: order on 16 okt must last until 30 okt + 1 week
const TARGET_WEEKS = TARGET_DAYS / 7
const days = (a, b) => Math.round((b - a) / 86400000)
const rows = []
for (const f of s.perFeed) {
  if (f.discontinued) continue
  const rate = f.rate12w || 0
  const stock = f.currentStock || 0
  const isKoker = Boolean(f.linkedStorageId && s.perShute.find(x => x.storageId === f.linkedStorageId))
  const lastDel = f.deliveries.length ? f.deliveries[f.deliveries.length - 1] : null
  const lastDelDate = lastDel ? new Date(lastDel.date) : null
  const daysSinceDel = lastDelDate ? days(lastDelDate, REF) : null
  const medInt = f.medianDeliveryIntervalDays
  const cover = rate > 0 ? stock / rate * 7 : null // days
  // expected next need: for koker feeds with 0 stock, use delivery cadence
  const dueIn = cover !== null ? (stock > 0 ? Math.round(cover) : (medInt && daysSinceDel !== null ? medInt - daysSinceDel : 0)) : null
  let status
  if (rate === 0 && stock === 0) status = 'inactive'
  else if (stock === 0 && rate > 0) status = 'unknown' // in use but no counted stock: bags poured straight into koker or count stale
  else if (rate === 0) status = 'ok'
  else if (dueIn <= daysToNext) status = 'critical'   // runs out before next delivery (vr 16 okt)
  else if (dueIn <= daysToAfter) status = 'warning'   // runs out before the delivery after (vr 30 okt): order now for 16 okt
  else if (cover > 8 * 7) status = 'overstock'
  else status = 'ok'
  const qty = rate > 0 ? Math.max(0, Math.ceil(rate * TARGET_WEEKS - stock)) : 0
  rows.push({ id: f.id, name: f.name.trim(), isKoker, unit: ['hooi', 'stro'].includes(f.id) ? 'balen' : 'zakken',
    stock, ratePerWeek: Math.round(rate * 100) / 100, coverDays: cover === null ? null : Math.round(cover), dueInDays: dueIn,
    status, orderQty: ['critical','warning','unknown'].includes(status) ? Math.max(qty, f.medianDeliverySize || 1) : 0,
    lastDelivery: lastDel ? lastDel.date.slice(0, 10) : null, daysSinceDelivery: daysSinceDel, medianDeliveryIntervalDays: medInt, medianDeliverySize: f.medianDeliverySize,
    lastActivity: f.lastActivity ? f.lastActivity.slice(0, 10) : null, consumedLast12m: f.consumptionPerMonth.slice(-12).reduce((a, m) => a + m.amount, 0) })
}
const order = { critical: 0, warning: 1, unknown: 2, ok: 3, overstock: 4, inactive: 5 }
rows.sort((a, b) => order[a.status] - order[b.status] || (a.dueInDays ?? 999) - (b.dueInDays ?? 999) || b.ratePerWeek - a.ratePerWeek)
const out = { meta: { referenceDate: '2026-10-06', nextDelivery: '2026-10-16', deliveryAfter: '2026-10-30', deliveryRhythm: 'vrijdag, om de 2 weken', countDay: 'dinsdag', targetCoverDays: TARGET_DAYS, targetCoverWeeks: Math.round(TARGET_WEEKS*10)/10, rule: 'rate = 12-week average per week; coverDays = stock/rate*7; koker feeds with stock 0 use delivery cadence (median interval - days since last delivery) as dueIn; status unknown = in use but stock 0 (count stale / bags go straight into koker); critical = runs out before next delivery vr 16 okt; warning = runs out before delivery after that (vr 30 okt) so order now for 16 okt; overstock>8w cover; orderQty = max(ceil(rate*31d - stock), median delivery size) i.e. enough to last until 30 okt + 1 week safety' }, rows }
fs.writeFileSync('advice.json', JSON.stringify(out, null, 1))
for (const r of rows) console.log(r.status.padEnd(9), r.name.padEnd(24), 'stock', String(r.stock).padStart(5), 'rate/wk', String(r.ratePerWeek).padStart(5), 'due', String(r.dueInDays).padStart(4), 'order', r.orderQty, r.unit, 'lastDel', r.lastDelivery, 'medInt', r.medianDeliveryIntervalDays, r.isKoker ? 'KOKER' : '')
