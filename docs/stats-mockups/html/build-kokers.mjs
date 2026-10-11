import { writeFileSync } from 'node:fs';
import { page, summary, J, storages, nl, chip, feedName, dateNl, daysAgo, monLabel, REF } from './lib.mjs';
const logs = J('../data/logs.json');
const all = summary.perShute, live = all.filter((k) => !k.deleted && !k.name.includes('(deleted)'));
const nDel = all.length - live.length;
const fills = (id, d) => logs.filter((l) => l.type === 'mutation' && l.storageId === id && l.amount > 0 && (REF - new Date(l.timestamp)) / 864e5 <= d).length;
const rows = live.map((k) => {
  const st = storages.find((s) => s.id === k.storageId)?.status ?? 'none';
  const ago = k.lastEmptied ? daysAgo(k.lastEmptied) : null;
  const limit = k.avgDaysBetweenEmptied ?? 180;
  let c;
  if (st === 'emptying') c = chip('critical', 'Wordt leeggemaakt');
  else if (ago === null) c = chip('muted', k.totalFills ? 'Nooit leeggemaakt' : 'Geen logs');
  else if (ago > limit) c = chip('warning', 'Leegmaken');
  else c = chip('good', 'OK');
  const prio = st === 'emptying' ? 1 : ago !== null && ago > limit ? 0 : ago === null ? 2 : 3;
  return { k, st, ago, c, prio, f30: fills(k.storageId, 30), f90: fills(k.storageId, 90), feeds: k.feedIds.map(feedName).join(', ') };
}).sort((a, b) => a.prio - b.prio || (b.ago ?? 0) - (a.ago ?? 0));
const stTxt = { emptying: 'bezig met leegmaken', emptied: 'leeg gemeld', none: 'geen status' };
const kRow = (r) => `<div class="krow"><div class="khead"><div class="avatar">${r.k.name[0]}</div><div class="title">${r.k.name}</div>${r.c}</div>
 <div class="meta">${r.feeds || 'geen voer gekoppeld'}</div>
 <div class="meta">Vullingen <b>${r.f30}</b> (30 d) · <b>${r.f90}</b> (90 d)</div>
 <div class="meta">${r.ago === null ? 'Nooit leeggemaakt' : `Laatst leeg: ${dateNl(r.k.lastEmptied)} (${r.ago} d geleden)`}${r.k.avgDaysBetweenEmptied ? ` · gem. ${Math.round(r.k.avgDaysBetweenEmptied)} d` : ''}</div>
 <div class="meta">Status: ${stTxt[r.st]}</div></div>`;
const todo = rows.filter((r) => r.prio < 2).length;
// monthly fills last 12 months
const months = []; for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(2026, 9 - i, 1)); months.push(d.toISOString().slice(0, 7)); }
const vals = months.map((m) => all.reduce((a, k) => a + (k.fillsPerMonth.find((x) => x.month === m)?.amount ?? 0), 0));
const cyc = rows.filter((r) => r.k.avgDaysBetweenEmptied).sort((a, b) => a.k.avgDaysBetweenEmptied - b.k.avgDaysBetweenEmptied);
const cards = [
 { cls: 'c12', html: `<div class="stat"><span class="label">Kokers die aandacht vragen</span><span class="value">${todo}<small>van ${live.length}</small></span><span class="delta">${rows.filter(r=>r.prio===0).length} te lang niet leeggemaakt, ${rows.filter(r=>r.prio===1).length} wordt leeggemaakt. Vergelijking met de gemiddelde tijd tussen twee keer leegmaken.</span></div>` },
 { cls: 'c7', html: `<h2>Per koker</h2><p class="sub">Eerst de kokers die leeggemaakt moeten worden</p><div class="krows">${rows.map(kRow).join('')}</div>
  <p class="note">${nDel} verwijderde kokers (eendenkorrel, gemengdgraan, schapenkorrel, kalveren) staan niet in de lijst.</p>` },
 { cls: 'c5', html: `<h2>Vullingen per maand, alle kokers</h2><p class="sub">Zakken gevuld, nov 2025 t/m okt 2026 (okt loopt nog)</p><div id="bar"></div>
  <h2 style="margin-top:20px">Gemiddelde cyclus</h2><p class="sub">Dagen tussen twee keer leegmaken</p>
  <table class="tbl"><thead><tr><th>Koker</th><th class="num">Cyclus (d)</th><th class="num">Nu (d)</th></tr></thead><tbody>
  ${cyc.map((r) => `<tr><td>${r.k.name}</td><td class="num">${Math.round(r.k.avgDaysBetweenEmptied)}</td><td class="num">${r.ago}</td></tr>`).join('')}</tbody></table>
  <p class="note">Nu = dagen sinds laatst leeggemaakt. Geitenkorrel heeft maar 2 cycli, dus weinig betrouwbaar.</p>` },
];
const script = `barChart(document.getElementById('bar'),{labels:${JSON.stringify(months.map((m) => monLabel(m)))},values:${JSON.stringify(vals)},highlightLast:false,yLabel:'zakken',height:190});`;
writeFileSync(new URL('kokers.html', import.meta.url), page({ title: 'Kokers', question: 'Welke koker moet leeggemaakt of bijgevuld worden?', active: 1, cards, script }));
console.log(rows.map((r) => [r.k.name, r.f30, r.f90, r.ago, r.st, r.c.replace(/<[^>]+>/g, '')].join('|')).join('\n'), vals);
