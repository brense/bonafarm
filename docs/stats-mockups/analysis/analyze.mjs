import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const D = path.join(DIR, '../data');
const rd = f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const feeds = rd('feeds.json'), storagesRaw = rd('storages.json'), items = rd('items.json'), logsRaw = rd('logs.json');
const r2 = x => Math.round(x * 100) / 100;
const r1 = x => Math.round(x * 10) / 10;

// ---- time helpers (Europe/Amsterdam)
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' });
const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
function local(ts) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ts)).map(x => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, month: `${p.year}-${p.month}`, year: +p.year, m: +p.month, hour: +p.hour, wd: WD[p.weekday], week: isoWeek(date) };
}
function isoWeek(date) {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dow + 3); // Thursday
  const wy = dt.getUTCFullYear();
  const jan4 = new Date(Date.UTC(wy, 0, 4));
  const wk = 1 + Math.round(((dt - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${wy}-W${String(wk).padStart(2, '0')}`;
}
function mondayOf(date) { const [y, m, d] = date.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); return dt; }
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

// ---- prepare
const logs = logsRaw.map(l => ({ ...l, t: Date.parse(l.timestamp), L: local(l.timestamp) })).sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
const REF = Date.parse('2026-10-06T22:00:00Z'); // end of 2026-10-06 Amsterdam (CEST)
const REF_DATE = '2026-10-06';
const storages = new Map(storagesRaw.map(s => [s.id, s]));
const feedMap = new Map(feeds.map(f => [f.id, f]));

// dangling storage decision
const danglingIds = [...new Set(logs.map(l => l.storageId).filter(id => !storages.has(id)))];
const feedIds = new Set(feeds.map(f => f.id));
const danglingDecision = {};
for (const id of danglingIds) {
  const ls = logs.filter(l => l.storageId === id && l.type === 'mutation' && l.amount);
  const pos = ls.filter(l => l.amount > 0).length, neg = ls.filter(l => l.amount < 0).length;
  const hasCycle = logs.some(l => l.storageId === id && (l.type === 'emptying' || l.type === 'emptied'));
  const matchesFeed = feedIds.has(id) || logs.some(l => l.feedId === id);
  const linked = feeds.some(f => f.linkedStorageId === id);
  const mostlyPos = ls.length > 0 && pos / ls.length >= 0.75;
  let type, why;
  if (mostlyPos && (matchesFeed || hasCycle || linked)) { type = 'shute'; why = `pos=${pos} neg=${neg}; ${[matchesFeed && 'id matches feed', hasCycle && 'has emptying/emptied logs', linked && 'feed linkedStorageId points here'].filter(Boolean).join(', ')}`; }
  else { type = 'storage'; why = `pos=${pos} neg=${neg}; not shute-like`; }
  danglingDecision[id] = { type, why };
  storages.set(id, { id, name: id + ' (deleted)', type, deleted: true });
}

// feeds incl discontinued
const logFeedIds = [...new Set(logs.map(l => l.feedId).filter(Boolean))];
const danglingFeedIds = logFeedIds.filter(id => !feedMap.has(id));
const allFeeds = [...feeds.map(f => ({ ...f })), ...danglingFeedIds.map(id => ({ id, name: id, discontinued: true, order: 999 }))];

const muts = logs.filter(l => l.type === 'mutation' && l.amount !== 0 && l.amount != null);
const zeroAmount = logs.filter(l => l.type === 'mutation' && !l.amount).length;
const stype = id => storages.get(id)?.type;

// ---- move pairing
const WINDOW = 10 * 60000, EPS = 1e-9;
const usedPos = new Set(), pairedNeg = new Set(), moves = [];
const negs = muts.filter(l => l.amount < 0 && stype(l.storageId) === 'storage');
for (const n of negs) {
  const cand = muts.filter(p => p.amount > 0 && p.feedId === n.feedId && p.storageId !== n.storageId && !usedPos.has(p.id) && Math.abs(p.t - n.t) <= WINDOW)
    .sort((a, b) => Math.abs(a.t - n.t) - Math.abs(b.t - n.t));
  const need = -n.amount;
  let chosen = cand.find(p => Math.abs(p.amount - need) < EPS);
  let group = chosen ? [chosen] : null;
  if (!group) { // split: greedy accumulate by proximity, subset search small
    const c = cand.filter(p => p.amount < need);
    const n2 = Math.min(c.length, 12);
    let found = null;
    for (let mask = 1; mask < (1 << n2) && !found; mask++) {
      let s = 0; const g = [];
      for (let i = 0; i < n2; i++) if (mask & (1 << i)) { s += c[i].amount; g.push(c[i]); }
      if (Math.abs(s - need) < EPS) found = g;
    }
    group = found;
  }
  if (group) { pairedNeg.add(n.id); group.forEach(p => usedPos.add(p.id)); moves.push({ from: n.storageId, feedId: n.feedId, amount: need, to: group.map(p => p.storageId) }); }
}
const negsInStorage = negs.length;
const unmatchedNegs = negs.filter(n => !pairedNeg.has(n.id));

// ---- classify
const cons = [], deliv = [];
for (const m of muts) {
  const ty = stype(m.storageId);
  if (m.amount > 0) {
    if (ty === 'shute') cons.push({ ...m, amt: m.amount, why: 'shute' });
    else if ((ty === 'storage' || ty === 'stable') && !usedPos.has(m.id)) deliv.push(m);
  } else {
    if (ty === 'stable') cons.push({ ...m, amt: -m.amount, why: 'stable' });
    else if (ty === 'storage' && !pairedNeg.has(m.id)) cons.push({ ...m, amt: -m.amount, why: 'direct' });
  }
}

// ---- ranges
const firstDate = logs[0].L.date, lastDate = logs.at(-1).L.date;
const monthsAll = []; { let [y, m] = [+logs[0].L.month.slice(0, 4), +logs[0].L.month.slice(5)]; const end = logs.at(-1).L.month; for (;;) { const k = `${y}-${String(m).padStart(2, '0')}`; monthsAll.push(k); if (k >= end) break; if (++m > 12) { m = 1; y++; } } }
const weeksAll = []; { const s = mondayOf(firstDate), e = mondayOf(lastDate); for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 7)) weeksAll.push(isoWeek(d.toISOString().slice(0, 10))); }

const sumWin = (arr, weeks) => arr.filter(c => c.t > REF - weeks * 7 * 86400000 && c.t <= REF).reduce((a, c) => a + c.amt, 0) / weeks;

// stock
const stockBy = new Map(); for (const it of items) { (stockBy.get(it.id) ?? stockBy.set(it.id, []).get(it.id)).push({ storageId: it._parentId, storageName: storages.get(it._parentId)?.name ?? it._parentId, amount: it.amount }); }

function feedStats(f, consF, delivF, allLogsF) {
  const sbs = stockBy.get(f.id) ?? [];
  const currentStock = sbs.reduce((a, s) => a + s.amount, 0);
  const perYear = Object.fromEntries([2022, 2023, 2024, 2025, 2026].map(y => [y, 0]));
  const perMonth = new Map(monthsAll.map(m => [m, 0])), perWeek = new Map(weeksAll.map(w => [w, 0]));
  const wdc = Array(7).fill(0);
  for (const c of consF) { perYear[c.L.year] = (perYear[c.L.year] ?? 0) + c.amt; perMonth.set(c.L.month, (perMonth.get(c.L.month) ?? 0) + c.amt); perWeek.set(c.L.week, (perWeek.get(c.L.week) ?? 0) + c.amt); wdc[c.L.wd]++; }
  const seas = Array(12).fill(0);
  for (const c of consF) if (c.L.year >= 2023 && c.L.year <= 2025) seas[c.L.m - 1] += c.amt;
  const rate4w = sumWin(consF, 4), rate8w = sumWin(consF, 8), rate12w = sumWin(consF, 12);
  // deliveries grouped by day
  const byDay = new Map();
  for (const d of delivF) { const e = byDay.get(d.L.date) ?? { date: d.L.date, amount: 0, storages: {} }; e.amount += d.amount; e.storages[d.storageId] = (e.storages[d.storageId] ?? 0) + d.amount; byDay.set(d.L.date, e); }
  const deliveries = [...byDay.values()].sort((a, b) => a.date < b.date ? -1 : 1).map(e => ({ date: e.date, amount: e.amount, storageId: Object.entries(e.storages).sort((a, b) => b[1] - a[1])[0][0], ...(Object.keys(e.storages).length > 1 ? { storages: e.storages } : {}) }));
  const iv = deliveries.slice(1).map((d, i) => (Date.parse(d.date) - Date.parse(deliveries[i].date)) / 86400000);
  const tot = wdc.reduce((a, b) => a + b, 0);
  const act = allLogsF;
  return {
    id: f.id, name: f.name, discontinued: !!f.discontinued, hidden: !!f.hidden, linkedStorageId: f.linkedStorageId ?? null,
    currentStock, stockByStorage: sbs,
    totalConsumed: r2(consF.reduce((a, c) => a + c.amt, 0)),
    consumptionPerYear: Object.fromEntries(Object.entries(perYear).map(([k, v]) => [k, r2(v)])),
    consumptionPerMonth: [...perMonth].map(([month, amount]) => ({ month, amount: r2(amount) })),
    consumptionPerISOWeek: [...perWeek].map(([week, amount]) => ({ week, amount: r2(amount) })),
    seasonality: seas.map(v => r2(v / 3)),
    rate4w: r2(rate4w), rate8w: r2(rate8w), rate12w: r2(rate12w),
    daysUntilEmpty: rate12w > 0 ? r1(currentStock / (rate12w / 7)) : null,
    deliveries, deliveryCount: deliveries.length,
    medianDeliveryIntervalDays: median(iv), medianDeliverySize: median(deliveries.map(d => d.amount)),
    lastDelivery: deliveries.at(-1)?.date ?? null,
    lastActivity: act.length ? act.at(-1).L.date : null, firstActivity: act.length ? act[0].L.date : null,
    weekdayProfile: wdc.map(v => tot ? r2(v / tot) : 0),
    _consLast12m: consF.filter(c => c.t > REF - 365 * 86400000 && c.t <= REF).reduce((a, c) => a + c.amt, 0),
  };
}

const perFeed = allFeeds.map(f => feedStats(f, cons.filter(c => c.feedId === f.id), deliv.filter(d => d.feedId === f.id), logs.filter(l => l.feedId === f.id && l.amount !== 0)));

// ---- shutes
const shuteIds = [...storages.values()].filter(s => s.type === 'shute').map(s => s.id);
const perShute = shuteIds.map(id => {
  const s = storages.get(id);
  const ml = muts.filter(m => m.storageId === id && m.amount > 0);
  const fm = new Map(); for (const m of ml) { const e = fm.get(m.L.month) ?? { month: m.L.month, count: 0, amount: 0 }; e.count++; e.amount += m.amount; fm.set(m.L.month, e); }
  const ev = logs.filter(l => l.storageId === id && (l.type === 'emptying' || l.type === 'emptied'));
  const cycles = []; let open = null;
  for (const e of ev) {
    if (e.type === 'emptying') { if (open) cycles.push({ start: open.timestamp, end: null, hours: null }); open = e; }
    else { cycles.push({ start: open?.timestamp ?? null, end: e.timestamp, hours: open ? r2((e.t - open.t) / 3600000) : null }); open = null; }
  }
  if (open) cycles.push({ start: open.timestamp, end: null, hours: null });
  const emptiedT = ev.filter(e => e.type === 'emptied').map(e => e.t);
  const gaps = emptiedT.slice(1).map((t, i) => (t - emptiedT[i]) / 86400000);
  const lastEv = ev.at(-1);
  return {
    storageId: id, name: s.name, deleted: !!s.deleted, feedIds: [...new Set(ml.map(m => m.feedId))],
    fillsPerMonth: [...fm.values()].sort((a, b) => a.month < b.month ? -1 : 1).map(e => ({ ...e, amount: r2(e.amount) })),
    totalFills: ml.length, totalAmount: r2(ml.reduce((a, m) => a + m.amount, 0)), lastFill: ml.at(-1)?.L.date ?? null,
    emptyCycles: cycles, avgDaysBetweenEmptied: gaps.length ? r1(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    lastEmptied: emptiedT.length ? new Date(emptiedT.at(-1)).toISOString() : null,
    currentStatus: s.status ?? (lastEv ? lastEv.type : null), derivedStatusFromLogs: lastEv?.type ?? null,
  };
});

// ---- stables
const stableIds = [...storages.values()].filter(s => s.type === 'stable').map(s => s.id);
const perStable = stableIds.map(id => {
  const out = { storageId: id, name: storages.get(id).name };
  const feedsSeen = new Set(muts.filter(m => m.storageId === id).map(m => m.feedId));
  for (const fid of new Set(['hooi', 'stro', ...feedsSeen])) {
    const key = fid === 'hooi' || fid === 'stro' ? fid : `other:${fid}`;
    const c = cons.filter(x => x.storageId === id && x.feedId === fid);
    const dl = deliv.filter(x => x.storageId === id && x.feedId === fid);
    const stock = items.filter(i => i._parentId === id && i.id === fid).reduce((a, i) => a + i.amount, 0);
    const pm = new Map(monthsAll.map(m => [m, 0])); for (const x of c) pm.set(x.L.month, pm.get(x.L.month) + x.amt);
    const rate = sumWin(c, 12);
    out[key] = { currentStock: stock, consumedPerMonth: [...pm].map(([month, amount]) => ({ month, amount: r2(amount) })), totalConsumed: r2(c.reduce((a, x) => a + x.amt, 0)), rate12w: r2(rate), daysUntilEmpty: rate > 0 ? r1(stock / (rate / 7)) : null, deliveries: dl.map(d => ({ date: d.L.date, amount: d.amount })) };
  }
  return out;
});

// ---- overview
const totalPerYear = {}, totalPerYearExBales = {};
for (const c of cons) { totalPerYear[c.L.year] = (totalPerYear[c.L.year] ?? 0) + c.amt; if (c.feedId !== 'hooi' && c.feedId !== 'stro') totalPerYearExBales[c.L.year] = (totalPerYearExBales[c.L.year] ?? 0) + c.amt; }
const tot12 = perFeed.reduce((a, f) => a + f._consLast12m, 0);
const top10 = [...perFeed].sort((a, b) => b._consLast12m - a._consLast12m).slice(0, 10).map(f => ({ id: f.id, name: f.name, amount: r2(f._consLast12m), share: r2(f._consLast12m / tot12) }));
const needOrder = perFeed.filter(f => f.daysUntilEmpty !== null && f.daysUntilEmpty < 21).sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty).map(f => ({ id: f.id, name: f.name, currentStock: f.currentStock, rate12w: f.rate12w, daysUntilEmpty: f.daysUntilEmpty, hidden: f.hidden, discontinued: f.discontinued }));
const overstocked = perFeed.filter(f => f.rate12w > 0 && f.currentStock > 8 * f.rate12w).map(f => ({ id: f.id, name: f.name, currentStock: f.currentStock, rate12w: f.rate12w, weeksOfStock: r1(f.currentStock / f.rate12w) })).sort((a, b) => b.weeksOfStock - a.weeksOfStock);
const stale = perFeed.filter(f => f.currentStock > 0 && f.lastActivity && (REF - Date.parse(f.lastActivity)) / 86400000 > 180).map(f => ({ id: f.id, name: f.name, currentStock: f.currentStock, lastActivity: f.lastActivity, discontinued: f.discontinued }));
const wdAct = Array(7).fill(0), hrAct = Array(24).fill(0), lpm = new Map(monthsAll.map(m => [m, 0]));
for (const l of logs) { lpm.set(l.L.month, lpm.get(l.L.month) + 1); }
for (const m of muts) { wdAct[m.L.wd]++; hrAct[m.L.hour]++; }

// ---- data quality
const key = (s, f) => `${s}|${f}`;
const implied = new Map(); const runMin = new Map();
for (const m of muts) { const ty = stype(m.storageId); if (ty === 'shute') continue; const k = key(m.storageId, m.feedId); const v = (implied.get(k) ?? 0) + m.amount; implied.set(k, v); runMin.set(k, Math.min(runMin.get(k) ?? 0, v)); }
const itemMap = new Map(items.map(i => [key(i._parentId, i.id), i.amount]));
const allKeys = new Set([...implied.keys(), ...itemMap.keys()]);
const disc = [...allKeys].map(k => { const [s, f] = k.split('|'); const imp = implied.get(k) ?? 0, cur = itemMap.get(k) ?? 0; return { storageId: s, feedId: f, implied: r2(imp), items: cur, diff: r2(cur - imp) }; }).filter(d => Math.abs(d.diff) > 1e-9).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
const negImplied = [...implied].filter(([, v]) => v < -1e-9).map(([k, v]) => ({ key: k, implied: r2(v) }));
const everNeg = [...runMin].filter(([, v]) => v < -1e-9).map(([k, v]) => ({ key: k, minRunning: r2(v) })).sort((a, b) => a.minRunning - b.minRunning);
const seenDup = new Map(); let dups = 0; const dupEx = [];
for (const m of logs.filter(l => l.type === 'mutation')) { const k = `${m.storageId}|${m.feedId}|${m.amount}`; const prev = seenDup.get(k); if (prev !== undefined && m.t - prev <= 2000) { dups++; if (dupEx.length < 5) dupEx.push(m.id); } seenDup.set(k, m.t); }
const linkIssues = feeds.filter(f => f.linkedStorageId).map(f => { const s = storages.get(f.linkedStorageId); return s?.deleted ? { feed: f.id, linked: f.linkedStorageId, issue: 'storage doc missing from storages.json (treated as deleted ' + s.type + ')' } : !s ? { feed: f.id, linked: f.linkedStorageId, issue: 'missing' } : s.type !== 'shute' ? { feed: f.id, linked: f.linkedStorageId, issue: 'not a shute: ' + s.type } : null; }).filter(Boolean);
const shuteFeedsNoLink = shuteIds.filter(id => !feeds.some(f => f.linkedStorageId === id));
const orphan = storagesRaw.filter(s => !logs.some(l => l.storageId === s.id)).map(s => s.id);
const orphanItems = items.filter(i => !storages.has(i._parentId) || !allFeeds.some(f => f.id === i.id));
const shuteItems = items.filter(i => stype(i._parentId) === 'shute');
const dataQuality = [
  { issue: 'implied stock (sum of mutations) negative at the end', count: negImplied.length, examples: negImplied.slice(0, 10) },
  { issue: 'implied stock dipped below zero at some point (running balance)', count: everNeg.length, examples: everNeg.slice(0, 10) },
  { issue: 'storage-type negatives not paired to a move (treated as direct consumption)', count: unmatchedNegs.length },
  { issue: 'items stock disagrees with sum of mutations (storage/stable only)', count: disc.length, top10: disc.slice(0, 10) },
  { issue: 'duplicate-looking mutation rows (same storage/feed/amount within 2s)', count: dups, exampleIds: dupEx },
  { issue: 'feeds with linkedStorageId pointing to missing / non-shute storage', count: linkIssues.length, details: linkIssues },
  { issue: 'shute storages that no feed links to', count: shuteFeedsNoLink.length, ids: shuteFeedsNoLink },
  { issue: 'storages (in storages.json) with zero logs', count: orphan.length, ids: orphan },
  { issue: 'log rows with storageId not in storages.json', count: logs.filter(l => !storagesRaw.some(s => s.id === l.storageId)).length, ids: danglingIds },
  { issue: 'items rows on shutes (should hold no stock)', count: shuteItems.length },
  { issue: 'items rows with unknown storage/feed', count: orphanItems.length },
  { issue: 'zero-amount mutation rows', count: zeroAmount },
];

const meta = {
  dateRange: { first: logs[0].timestamp, last: logs.at(-1).timestamp, refDate: REF_DATE }, totalLogs: logs.length,
  mutations: logs.filter(l => l.type === 'mutation').length, nonZeroMutations: muts.length,
  movesPaired: moves.length, negativesInStorageType: negsInStorage, shareNegativesPaired: r2(moves.length / negsInStorage),
  unmatchedNegativesInStorageType: unmatchedNegs.length, zeroAmount, danglingStorageIds: danglingDecision, danglingFeedIds,
  consumptionEventsByRule: Object.fromEntries(['shute', 'stable', 'direct'].map(w => [w, cons.filter(c => c.why === w).length])),
  deliveryRows: deliv.length,
};
const summary = {
  meta, perFeed: perFeed.map(({ _consLast12m, ...r }) => r), perShute, perStable,
  overview: { totalBagsConsumedPerYear: Object.fromEntries(Object.entries(totalPerYear).map(([k, v]) => [k, r2(v)])), totalBagsConsumedPerYearExcludingHooiStro: Object.fromEntries(Object.entries(totalPerYearExBales).map(([k, v]) => [k, r2(v)])), top10FeedsByConsumptionLast12Months: top10, feedsNeedingOrder: needOrder, feedsOverstocked: overstocked, staleFeeds: stale, activityPerWeekday: wdAct, activityPerHour: hrAct, logsPerMonth: [...lpm].map(([month, count]) => ({ month, count })) },
  dataQuality,
};
fs.writeFileSync(path.join(DIR, 'summary.json'), JSON.stringify(summary, null, 1));

// ---- sanity prints
console.log('meta', JSON.stringify(meta, null, 1));
console.log('moves paired', moves.length, '/', negsInStorage, 'share', meta.shareNegativesPaired);
for (const k of ['hooi', 'stro']) console.log(k, 'per year', perFeed.find(f => f.id === k).consumptionPerYear, 'stock', perFeed.find(f => f.id === k).currentStock);
console.log('total/yr', summary.overview.totalBagsConsumedPerYear, 'exBales', summary.overview.totalBagsConsumedPerYearExcludingHooiStro);
console.log('top10', top10.map(t => `${t.name}:${t.amount}(${t.share})`).join('; '));
console.log('needOrder', needOrder.map(f => `${f.name}:${f.currentStock}/${f.rate12w}=${f.daysUntilEmpty}d`).join('; '));
console.log('overstocked', overstocked.slice(0, 8).map(f => `${f.name}:${f.weeksOfStock}w`).join('; '));
console.log('stale', stale.map(f => `${f.name}:${f.currentStock}@${f.lastActivity}`).join('; '));
console.log('DQ', dataQuality.map(d => `${d.issue}: ${d.count}`).join('\n   '));
console.log('disc top10', JSON.stringify(disc.slice(0, 10)));
console.log('neg implied', JSON.stringify(negImplied.slice(0, 10)), 'everNeg top', JSON.stringify(everNeg.slice(0, 5)));
console.log('unmatched negs by storage/feed', JSON.stringify(Object.entries(unmatchedNegs.reduce((o, n) => (o[n.storageId + '|' + n.feedId] = (o[n.storageId + '|' + n.feedId] ?? 0) + 1, o), {})).sort((a, b) => b[1] - a[1]).slice(0, 8)));
console.log('shutes', perShute.map(s => `${s.name}[${s.storageId}] fills=${s.totalFills} cycles=${s.emptyCycles.length} avgGap=${s.avgDaysBetweenEmptied} status=${s.currentStatus}`).join('\n  '));
console.log('stables', perStable.map(s => `${s.name}: hooi stock ${s.hooi?.currentStock} cons ${s.hooi?.totalConsumed} rate ${s.hooi?.rate12w}; stro ${s.stro?.currentStock} cons ${s.stro?.totalConsumed}; others ${Object.keys(s).filter(k => k.startsWith('other')).join(',')}`).join('\n  '));
console.log('weeks', weeksAll[0], weeksAll.at(-1), weeksAll.length, 'months', monthsAll.length, 'isoWeek checks', isoWeek('2026-01-01'), isoWeek('2024-12-30'), isoWeek('2021-01-03'));
console.log('discontinued', perFeed.filter(f => f.discontinued).map(f => `${f.id}:${f.totalConsumed}`).join(', '));
