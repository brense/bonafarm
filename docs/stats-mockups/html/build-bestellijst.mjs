import fs from 'node:fs';
import { DIR, advice, rows, nl, dateNl, unitName, rate, css, bottomNav, sideNav } from './common.mjs';

const by = s => rows.filter(r => s.includes(r.status));
const now = by(['critical', 'warning']), unk = by(['unknown']), ok = by(['ok']), over = by(['overstock']), inact = by(['inactive']);
const sum = a => a.reduce((s, r) => s + r.orderQty, 0);
const zNow = sum(now.filter(r => r.unit === 'zakken')), bNow = sum(now.filter(r => r.unit === 'balen'));
const zUnk = sum(unk);
const chipOf = r => ({ critical: '<span class="chip critical">Bestellen</span>', warning: '<span class="chip warning">Bijna op</span>',
  unknown: '<span class="chip muted">Niet geteld</span>', ok: '<span class="chip good">Op voorraad</span>', overstock: '<span class="chip serious">Te veel</span>' }[r.status]);
const why = r => `laatste levering ${dateNl(r.lastDelivery)}${r.medianDeliveryIntervalDays ? ` &middot; meestal elke ${nl(r.medianDeliveryIntervalDays, 0)} d` : ''}`;
const stockLine = r => {
  const s = r.status === 'unknown' ? 'voorraad niet geteld' : `voorraad ${nl(r.stock)}`;
  const rt = r.ratePerWeek > 0 ? `${rate(r.ratePerWeek)}/wk` : 'geen verbruik';
  let t = r.status === 'overstock' ? `&asymp; ${nl(r.stock / r.ratePerWeek, 0)} weken voorraad`
    : r.status === 'ok' || r.status === 'warning' || r.status === 'critical' ? (r.coverDays != null ? `nog ${nl(r.coverDays, 0)} dagen` : null) : null;
  return [s, rt, t].filter(Boolean).join(' &middot; ');
};
const row = (r, showQty) => `<div class="row"><div class="main"><div class="title">${r.name} ${chipOf(r)}</div>
 <div class="meta">${stockLine(r)}</div><div class="why">${why(r)}</div></div>
 ${showQty ? `<div class="qty"><span>Bestel</span><b>${nl(r.orderQty)}</b> ${unitName(r.unit, r.orderQty)}</div>` : ''}</div>`;
const card = (t, sub, body, extra = '') => `<div class="card"><div class="ch"><div><h2>${t}</h2><p class="sub">${sub}</p></div>${extra}</div><div class="rows">${body}</div></div>`;

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Bestellijst</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css">
<style>${css}
.sum{display:flex;flex-direction:column;gap:10px}
.sum .big{font-size:26px;font-weight:650;letter-spacing:-.02em;line-height:1.15}
.nd{font-size:13px;color:var(--ink)}.nd b{font-weight:650}
.sum .line{font-size:15px}.sum .line b{font-weight:650}
.sum .btn{align-self:stretch}
.ch{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.row{align-items:flex-start}
.row .title{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.row .meta{margin-top:2px}.row .why{font-size:12px;color:var(--muted);margin-top:1px}
.row .qty{text-align:right;font-size:13px;color:var(--ink-2);white-space:nowrap;display:flex;flex-direction:column;align-items:flex-end;line-height:1.2}
.row .qty b{font-size:22px;color:var(--ink)}
.row .qty span{font-size:11px}
.grp-note{font-size:12px;color:var(--ink-2);background:#F2F3EE;border-radius:12px;padding:10px 12px;margin:0 0 4px}
details summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-weight:600}
details summary::-webkit-details-marker{display:none}
details summary .c{font-weight:400;font-size:13px;color:var(--ink-2)}
.fn{background:var(--brand-tint);box-shadow:none}.fn h2{margin-bottom:4px}.fn p{margin:0;font-size:13px;color:var(--ink-2)}
.col{display:flex;flex-direction:column;gap:12px;min-width:0}
@media (max-width:600px){.grid{display:flex;flex-direction:column;gap:12px}.sumcard{order:0}.wrap{display:contents}}
@media (min-width:601px){.grid{padding:20px 32px 32px;display:grid;grid-template-columns:1.25fr 1fr;gap:16px;align-items:start}
 .sumcard{grid-column:1/-1}.sum{flex-direction:row;align-items:center;justify-content:space-between;gap:32px}.sum .btn{align-self:center}.sum .txt{display:flex;flex-direction:column;gap:6px}}
</style></head><body>
<div class="frame">${sideNav('Bestellen')}
<div class="main">
 <header class="appbar"><h1>Bestellen</h1><span class="icon-btn">&#9881;</span></header>
 <div class="scroll grid">
  <div class="card sumcard"><div class="sum"><div class="txt">
   <div class="note nd">Volgende levering: <b>${dateNl(advice.meta.nextDelivery)}</b> &middot; bestel v&oacute;&oacute;r <b>wo 14 okt</b></div>
   <div class="big">${now.length} artikelen bestellen</div>
   <div class="line">&asymp; <b>${nl(zNow)} zakken</b> + <b>${nl(bNow)} balen hooi</b></div>
   <div class="note">Daarnaast ${unk.length} artikelen zonder telling (&asymp; ${nl(zUnk, 0)} zakken, alleen als ze echt op zijn). Controleer die eerst.</div></div>
   <button class="btn primary"><svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>Bestellijst delen</button></div></div>
  <div class="col">
   ${card('Nu bestellen', `Raakt op v&oacute;&oacute;r levering ${dateNl(advice.meta.deliveryAfter)}`, now.map(r => row(r, true)).join(''))}
   ${card('Niet geteld', 'In gebruik, maar voorraad staat op 0', `<div class="grp-note">Misschien echt op, misschien niet bijgewerkt (zakken gaan vaak direct in de koker). De hoeveelheid is een voorstel op basis van het 12-weeks gemiddelde.</div>` + unk.map(r => row(r, true)).join(''), '<button class="btn secondary">Telling bijwerken</button>')}
  </div>
  <div class="col">
   ${card('Op voorraad', 'Geen bestelling nodig', ok.map(r => row(r, false)).join(''))}
   ${card('Te veel', 'Meer dan 8 weken voorraad, even niet bestellen', over.map(r => row(r, false)).join(''))}
   <div class="card"><details><summary>Niet in gebruik <span class="c">${inact.length} artikelen &#9662;</span></summary></details></div>
   <div class="card fn"><h2>Hoe berekenen we dit?</h2><p>Leveringen komen elke 2 weken op vrijdag. Verbruik is het 12-weeks gemiddelde; we bestellen genoeg tot de levering daarna (${dateNl(advice.meta.deliveryAfter)}) plus 1 week extra, minstens een gebruikelijke leveringsgrootte. Dinsdag wordt de voorraad geteld.</p></div>
  </div>
 </div>
</div>
${bottomNav('Bestellen')}
</div></body></html>`;
fs.writeFileSync(DIR + '/bestellijst.html', html);
