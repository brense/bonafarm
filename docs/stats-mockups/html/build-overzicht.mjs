import fs from 'node:fs';
import { DIR, advice, summary, rows, nl, dateNl, unitName, isBale, rate, css, bottomNav, sideNav } from './common.mjs';

// ---- weekly consumption (complete ISO weeks W29..W40 2026; W41 is still running)
const weekKeys = []; for (let w = 29; w <= 40; w++) weekKeys.push(`2026-W${w}`);
const wk = (feedFilter, keys) => keys.map(k => summary.perFeed.filter(f => feedFilter(f.id)).reduce((s, f) => s + (f.consumptionPerISOWeek.find(x => x.week === k)?.amount || 0), 0));
const balen12 = wk(isBale, weekKeys), zakken12 = wk(id => !isBale(id), weekKeys);
const last4 = weekKeys.slice(-4), ly4 = ['2025-W37', '2025-W38', '2025-W39', '2025-W40'];
const sum = a => a.reduce((s, x) => s + x, 0);
const cur = { b: sum(wk(isBale, last4)), z: sum(wk(id => !isBale(id), last4)) };
const ly = { b: sum(wk(isBale, ly4)), z: sum(wk(id => !isBale(id), ly4)) };
const delta = (c, l) => { const p = Math.round((c / l - 1) * 100); return `${p >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(p)}%`; };
console.log({ cur, ly, balen12, zakken12 });

// ---- order list
const todo = rows.filter(r => r.status === 'critical' || r.status === 'warning');
const unknown = rows.filter(r => r.status === 'unknown');
const chip = s => s === 'critical' ? '<span class="chip critical">Bestellen</span>' : '<span class="chip warning">Bijna op</span>';
const orderRows = todo.map(r => `<div class="row"><div class="main"><div class="title">${r.name} ${chip(r.status)}</div>
 <div class="meta">voorraad ${nl(r.stock)} &middot; ${rate(r.ratePerWeek)}/wk &middot; ${r.dueInDays != null ? `nog ${nl(r.dueInDays, 0)} dagen` : 'niet geteld'}</div></div>
 <div class="qty"><b>${nl(r.orderQty)}</b> ${unitName(r.unit, r.orderQty)}</div></div>`).join('');

// ---- top 5 bagged feeds, last 12 months from monthly data (2025-10 .. 2026-09)
const months = summary.perFeed[0].consumptionPerMonth.map(m => m.month).filter(m => m >= '2025-10' && m <= '2026-09');
const f12 = summary.perFeed.filter(f => !isBale(f.id)).map(f => ({ name: f.name.trim(), v: sum(f.consumptionPerMonth.filter(m => months.includes(m.month)).map(m => m.amount)) }))
  .sort((a, b) => b.v - a.v);
const tot = sum(f12.map(f => f.v)), top5 = f12.slice(0, 5), mx = top5[0].v;
const hooi12 = sum(summary.perFeed.find(f => f.id === 'hooi').consumptionPerMonth.filter(m => months.includes(m.month)).map(m => m.amount));
const stro12 = sum(summary.perFeed.find(f => f.id === 'stro').consumptionPerMonth.filter(m => months.includes(m.month)).map(m => m.amount));
console.log(top5, tot, hooi12, stro12);
const topRows = top5.map((f, i) => `<div class="hb"><span class="n">${f.name}</span><span class="track"><i style="width:${(f.v / mx * 100).toFixed(1)}%"></i></span><span class="v">${nl(f.v)}<small> &middot; ${Math.round(f.v / tot * 100)}%</small></span></div>`).join('');

// ---- weekdays
const wdv = summary.overview.activityPerWeekday, wdt = sum(wdv), share = Math.round((wdv[1] + wdv[4]) / wdt * 100);
const wdl = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'], wdm = Math.max(...wdv);
const days = wdv.map((v, i) => `<div class="d"><div class="bar"><i class="${i === 1 || i === 4 ? 'hi' : ''}" style="height:${Math.max(3, v / wdm * 100)}%"></i></div><span>${wdl[i]}</span></div>`).join('');

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Statistiek overzicht</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css">
<style>${css}
.tile{display:flex;flex-direction:column;gap:12px}
.split{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.split .value{font-size:40px}
.split .delta b{color:var(--ink);font-weight:600}
.row .qty{text-align:right;font-size:13px;color:var(--ink-2);white-space:nowrap}.row .qty b{font-size:20px;color:var(--ink)}
.row .title{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.unk{background:#F2F3EE;border-radius:12px;padding:12px;margin-top:6px;display:flex;flex-direction:column;gap:6px}
.unk .t{display:flex;align-items:center;gap:8px;font-weight:600}
.hb{display:grid;grid-template-columns:120px 1fr 84px;gap:10px;align-items:center;padding:5px 0;font-size:13px}
.hb .track{height:10px;background:var(--seq-1);border-radius:5px;overflow:hidden}
.hb .track i{display:block;height:100%;background:var(--seq-4);border-radius:5px}
.hb .v{font-weight:600;font-variant-numeric:tabular-nums;text-align:right}.hb .v small{font-weight:400;color:var(--ink-2)}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;height:92px;align-items:end}
.d{display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;font-size:12px;color:var(--ink-2)}
.d .bar{flex:1;width:100%;max-width:28px;display:flex;align-items:flex-end}
.d .bar i{display:block;width:100%;border-radius:5px 5px 0 0;background:var(--seq-2)}.d .bar i.hi{background:var(--seq-5)}
.take{font-size:14px;margin:12px 0 0}
.charts2{display:flex;flex-direction:column;gap:14px}
.charts2 h3{font-size:13px;margin:0 0 -2px;display:flex;align-items:center;gap:6px;font-weight:600}
.charts2 h3 i{width:10px;height:10px;border-radius:3px;display:inline-block}
.grid{display:grid;gap:12px}
@media (max-width:600px){.grid{grid-template-columns:1fr}.hb{grid-template-columns:100px 1fr 80px}}
@media (min-width:601px){
  .grid{padding:20px 32px 32px;grid-template-columns:repeat(12,1fr);gap:16px;grid-template-areas:"tile tile tile tile ord ord ord ord ord ord ord ord" "days days days days ord ord ord ord ord ord ord ord" "wk wk wk wk wk wk wk top top top top top"}
  .a-tile{grid-area:tile}.a-ord{grid-area:ord}.a-wk{grid-area:wk}.a-top{grid-area:top}.a-days{grid-area:days}
  .charts2{flex-direction:row;gap:24px}.charts2>div{flex:1}
}
@media (max-width:600px){.a-tile{order:1}.a-ord{order:2}.a-wk{order:3}.a-top{order:4}.a-days{order:5}}
</style></head><body>
<div class="frame">${sideNav('Statistiek')}
<div class="main">
 <header class="appbar"><h1>Statistiek</h1><span class="icon-btn">&#9881;</span></header>
 <div class="scroll grid">
  <div class="card tile a-tile">
   <div><h2>Verbruik, laatste 4 weken</h2><p class="sub" style="margin:0">w37&ndash;w40 &middot; hoeveel gaat er door de stallen</p></div>
   <div class="split">
    <div class="stat"><span class="label">Balen hooi + stro</span><span class="value">${nl(cur.b)}</span><span class="delta"><b>${delta(cur.b, ly.b)}</b> t.o.v. vorig jaar (${nl(ly.b)})</span></div>
    <div class="stat"><span class="label">Zakken voer</span><span class="value">${nl(cur.z)}</span><span class="delta"><b>${delta(cur.z, ly.z)}</b> t.o.v. vorig jaar (${nl(ly.z)})</span></div>
   </div>
  </div>
  <div class="card a-ord"><h2>Bestellen voor ${dateNl(advice.meta.nextDelivery)}</h2><p class="sub">${todo.length} artikelen om nu te bestellen &middot; dekt tot ${dateNl(advice.meta.deliveryAfter)} + 1 week</p>
   <div class="rows">${orderRows}</div>
   <div class="unk"><div class="t"><span class="chip muted">${unknown.length} niet geteld</span></div>
    <span class="note">In gebruik, maar de voorraad staat op 0. Dat kan echt op zijn, of er is niet bijgewerkt (zakken gaan vaak direct in de koker). Eerst tellen, dan bestellen.</span></div>
  </div>
  <div class="card a-wk"><h2>Verbruik per week, laatste 12 weken</h2><p class="sub">Aantal per week, weeknummer 29 t/m 40 &middot; twee aparte schalen</p>
   <div class="charts2"><div><h3><i style="background:var(--cat-1)"></i>Balen hooi + stro</h3><div id="c1"></div></div>
   <div><h3><i style="background:var(--cat-2)"></i>Zakken voer</h3><div id="c2"></div></div></div>
  </div>
  <div class="card a-top"><h2>Top 5 voer, laatste 12 maanden</h2><p class="sub">Zakken en aandeel van alle zakken (excl. hooi ${nl(hooi12, 0)} en stro ${nl(stro12, 0)} balen)</p>${topRows}</div>
  <div class="card a-days"><h2>Voerdagen</h2><p class="sub">Aandeel registraties per weekdag, ${nl(wdt, 0).replace(/\B(?=(\d{3})+$)/, '.')} registraties</p>
   <div class="days">${days}</div>
   <p class="take"><b>${share}% op dinsdag en vrijdag.</b> Dinsdag = uitdelen en tellen, vrijdag = levering (om de 2 weken).</p></div>
 </div>
</div>
${bottomNav('Statistiek')}
</div>
<script src="charts.js"></script>
<script>
const wl=${JSON.stringify(weekKeys.map(k => k.slice(6)))};
barChart(document.getElementById('c1'),{labels:wl,values:${JSON.stringify(balen12)},color:'#2a78d6',height:150});
barChart(document.getElementById('c2'),{labels:wl,values:${JSON.stringify(zakken12)},color:'#eb6834',height:150});
</script></body></html>`;
fs.writeFileSync(DIR + '/overzicht.html', html);
