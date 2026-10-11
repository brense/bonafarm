import { writeFileSync } from 'node:fs';
import { page, summary, nl, chip, fixLabels } from './lib.mjs';
const S = summary.perStable;
const sum = (k, f) => S.reduce((a, s) => a + s[k][f], 0);
const tot = (k) => ({ stock: sum(k, 'currentStock'), rate: sum(k, 'rate12w') });
const H = tot('hooi'), T = tot('stro');
const dH = Math.round((H.stock / H.rate) * 7), dT = Math.round((T.stock / T.rate) * 7);
const status = (d) => d <= 10 ? chip('critical', 'Bestellen') : d <= 24 ? chip('warning', 'Bijna op') : chip('good', 'Op voorraad');
const dagen = (d) => Math.round(d);
const row = (label, x) => {
  const d = x.daysUntilEmpty, w = Math.min(d, 60) / 60 * 100;
  return `<div class="srow"><div class="top"><span class="n">${label} <span class="s">· ${nl(x.currentStock)} balen</span></span>${status(d)}</div>
  <div class="gbar" role="img" aria-label="${dagen(d)} dagen"><b style="width:${w}%"></b><i style="left:${10/60*100}%"></i><i style="left:${24/60*100}%"></i></div>
  <div class="line2"><span>${d > 60 ? '60+' : dagen(d)} dagen voorraad</span><span>${nl(x.rate12w)} balen/week</span></div></div>`;
};
const stalCard = (s) => ({ cls: 'c4', html: `<h2>${s.name}</h2><p class="sub">Dagen tot leeg, schaal 0 tot 60 (streepjes: 10 d = leeg voor vr 16 okt, 24 d = leeg voor vr 30 okt)</p>${row('Hooi', s.hooi)}${row('Stro', s.stro)}` });
// last 12 full months
const months = S[0].hooi.consumedPerMonth.map((m) => m.month).filter((m) => m < '2026-10').slice(-12);
const MON = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const series = S.map((s, i) => ({ name: s.name, values: months.map((m) => s.hooi.consumedPerMonth.find((x) => x.month === m).amount) }));
const r = (s) => s.hooi.rate12w;
const med = 17, split = S.map((s) => Math.round(med * r(s) / H.rate)); split[2] = med - split[0] - split[1];
const need = Math.ceil(H.rate * 31 / 7 - H.stock), ns = S.map((s) => Math.round(need * r(s) / H.rate)); ns[2] = need - ns[0] - ns[1];
const cards = [
 { cls: 'c12', html: `<div class="two"><div class="stat"><span class="label">Hooi in alle stallen</span><span class="value">${nl(H.stock)}<small>balen</small></span><span class="delta"><b>Nog ±${dH} dagen</b> bij ${nl(H.rate)} balen/week</span></div>
  <div class="stat"><span class="label">Stro in alle stallen</span><span class="value">${nl(T.stock)}<small>balen</small></span><span class="delta"><b>Nog ±${dT} dagen</b> bij ${nl(T.rate)} balen/week</span></div></div>
  <p class="note">Hooi raakt het eerst op: ruim een week eerder dan stro. Een gangbare levering is 17 balen hooi en 3 balen stro.</p>` },
 ...S.map(stalCard),
 { cls: 'c8', id: 'c-line', html: `<h2>Hooiverbruik per stal per maand</h2><p class="sub">Balen hooi, okt 2025 t/m sep 2026 (okt loopt nog)</p><div id="line"></div>
  <div class="legend">${S.map((s, i) => `<span><i style="--c:var(--cat-${i + 1})"></i>${s.name}</span>`).join('')}</div>` },
 { cls: 'c4 take', html: `<h2>Wat dit betekent</h2><p class="sub">Verdeling van de volgende hooilevering</p>
  <p>Geitenstal verbruikt ±${nl(r(S[0]))} balen/week, Paardenstal ±${nl(r(S[1]))} en Kalverstal ±${nl(r(S[2]), 2)}. De eerste twee stallen zijn over ±2 weken leeg; Kalverstal heeft nog 8 weken.</p>
  <ul><li>Geitenstal: <b>${split[0]}</b> balen</li><li>Paardenstal: <b>${split[1]}</b> balen</li><li>Kalverstal: <b>${split[2]}</b> bal</li></ul>
  <p><b>Volgende levering vr 16 okt:</b> hooi ~${need} balen nodig tot vr 30 okt + 1 week (${S.map((s, i) => `${s.name.replace('stal','')} ${ns[i]}`).join(', ')}).</p>
  <p class="note">Voorbeeld voor een levering van ${med} balen, verdeeld naar weekverbruik. Leveringen komen elke 2 weken op vrijdag (laatst vr 2 okt).</p>` },
];
const colors = ['#2a78d6', '#eb6834', '#1baf7a'];
const script = `
function draw(){
lineChart(document.getElementById('line'),{labels:${JSON.stringify(months.map((m) => MON[+m.slice(5) - 1]))},series:${JSON.stringify(series.map((s, i) => ({ ...s, color: colors[i] })))},yLabel:'balen',height:210});
}
function d2(){draw();fixLine('line',{Geitenstal:-5,Paardenstal:5});}
d2(); addEventListener('resize',d2);`+fixLabels;
writeFileSync(new URL('stallen.html', import.meta.url), page({ title: 'Stallen: hooi en stro', question: 'Welke stal heeft het eerst hooi of stro nodig?', active: 1, cards, script }));
console.log({ H, T, dH, dT, split });
