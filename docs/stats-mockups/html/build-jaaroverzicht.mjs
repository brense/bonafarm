import { writeFileSync } from 'node:fs';
import { summary } from './lib.mjs';
const C = { 2026: '#039BE5', 2025: '#EC407A', 2024: '#9E9E9E' };
const YS = [2026, 2025, 2024];
const nl = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: d });
const MON = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const mk12 = (y) => MON.map((_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
const mk = (y) => MON.slice(0, 9).map((_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
const feeds = summary.perFeed;
const mval = (f, m) => f.consumptionPerMonth.find((x) => x.month === m)?.amount ?? 0;
const ser = (f, y) => mk(y).map((m) => mval(f, m));
const ser12 = (f, y) => mk12(y).map((m) => mval(f, m));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const hooi = feeds.find((f) => f.id === 'hooi'), stro = feeds.find((f) => f.id === 'stro');
const bags = feeds.filter((f) => f.id !== 'hooi' && f.id !== 'stro');
const bagsM = (y, full) => (full ? mk12(y) : mk(y)).map((m) => sum(bags.map((f) => mval(f, m))));
const logs = (y) => sum(mk(y).map((m) => summary.overview.logsPerMonth.find((x) => x.month === m)?.count ?? 0));
const pct = (a, b) => (b ? (a - b) / b * 100 : 0);
const inP = (d, y) => d >= `${y}-01-01` && d <= `${y}-09-30`;
const byDate = {};
for (const f of feeds) for (const d of f.deliveries || []) byDate[d.date] = (byDate[d.date] || 0) + d.amount;
const fri = (y) => Object.entries(byDate).filter(([d, a]) => inP(d, y) && a >= 2 && new Date(d + 'T12:00:00Z').getUTCDay() === 5).length;
const med = (a) => { a = [...a].sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : 0; };
const hooiDel = (y) => hooi.deliveries.filter((d) => inP(d.date, y)).map((d) => d.amount);
const koker = (y) => sum(summary.perShute.map((s) => (s.emptyCycles || []).filter((c) => c.end && inP(c.end.slice(0, 10), y)).length));
const FY = (y) => ({ hooi: sum(ser12(hooi, y)), stro: sum(ser12(stro, y)), bags: sum(mk12(y).map((m) => sum(bags.map((f) => mval(f, m))))), logs: sum(mk12(y).map((m) => summary.overview.logsPerMonth.find((x) => x.month === m)?.count ?? 0)) });
const FYS = { 2025: FY(2025), 2024: FY(2024) };
const V = (fn) => YS.map(fn);  // [2026,2025,2024]
const T = { hooi: V((y) => sum(ser(hooi, y))), stro: V((y) => sum(ser(stro, y))), bags: V((y) => sum(bagsM(y))), logs: V(logs) };

const per = bags.map((f) => ({ name: f.name.trim().replace('senioren priores', 'sen.').replace(/^./, (c) => c.toUpperCase()), a: sum(ser(f, 2026)), b: sum(ser(f, 2025)), c: sum(ser(f, 2024)) }));
per.sort((x, y) => y.a + y.b - (x.a + x.b));
const top = per.slice(0, 10), rest = per.slice(10);
const overig = { name: `Overig (${rest.length})`, a: sum(rest.map((r) => r.a)), b: sum(rest.map((r) => r.b)), c: sum(rest.map((r) => r.c)) };
const sm = per.find((p) => p.name === 'Scharrelmix'), lm = per.find((p) => p.name.startsWith('Legmeel scharrel'));
const comb = { name: 'Scharrelmix + Legmeel scharrel', a: sm.a + lm.a, b: sm.b + lm.b, c: sm.c + lm.c };
comb.d = comb.a - comb.b;
const elig = per.filter((p) => p !== sm && p !== lm && p.a + p.b >= 6).map((p) => ({ ...p, d: p.a - p.b }));
const risers = [...elig].sort((x, y) => y.d - x.d).filter((x) => x.d > 0).slice(0, 5);
const fallers = [...elig].sort((x, y) => x.d - y.d).filter((x) => x.d < 0).slice(0, 5);

const chipHtml = (a, b, short) => {
  const p = pct(a, b), d = a - b;
  const cls = b && Math.abs(p) < 3 ? 'flat' : d > 0 ? 'up' : d < 0 ? 'dn' : 'flat';
  const g = cls === 'flat' ? '●' : d > 0 ? '▲' : '▼';
  const t = !b ? 'nieuw' : cls === 'flat' ? `gelijk` : `${nl(Math.abs(p), 1)}%`;
  return `<span class="dchip ${cls}"><b>${g}</b> ${t}</span>`;
};
const tile = (label, v, unit, note, cls, fy) => `<div class="card tile ${cls}"><div class="tl">${label}</div><div class="hd"><div class="big">${nl(v[0], 1)}<small>${unit}</small></div>${chipHtml(v[0], v[1])}</div><div class="prev"><div class="pl"><b>jan–sep</b><i> · </i><span>2025: ${nl(v[1], 1)}</span> · <span>2024: ${nl(v[2], 1)}</span></div>${fy ? `<div class="pl"><b>heel jaar</b><i> · </i><span>2025: ${nl(fy[2025], 1)}</span> · <span>2024: ${nl(fy[2024], 1)}</span></div>` : ''}</div>${note ? `<div class="note">${note}</div>` : ''}</div>`;

function lineSvg(variant, a26, a25, a24) {
  const mob = variant === 'mob';
  const W = mob ? 340 : 470, H = mob ? 246 : 240, L = mob ? 28 : 30, R = mob ? 80 : 84, Tp = 14, Bm = 28;
  const iw = W - L - R, ih = H - Tp - Bm;
  const mx = Math.max(...a26, ...a25, ...a24), top = Math.ceil(mx / 10) * 10 || 10;
  const x = (i) => L + iw * i / 11, y = (v) => Tp + ih * (1 - v / top);
  let s = `<svg class="chart ${variant}" viewBox="0 0 ${W} ${H}" role="img">`;
  for (const t of [0, top / 2, top]) s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${nl(t)}</text>`;
  MON.forEach((m, i) => { if (!mob || i % 2 === 0) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${m}</text>`; });
  const pth = (a) => a.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const data = [[2024, a24, 2], [2025, a25, 2.5], [2026, a26, 2.5]];
  for (const [yr, a, w] of data) s += `<path d="${pth(a)}" fill="none" stroke="${C[yr]}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const e26 = { yr: 2026, v: a26[8], ex: x(8), ey: y(a26[8]) };
  const ends = [2025, 2024].map((yr) => { const a = yr === 2025 ? a25 : a24; return { yr, v: a[11], ex: x(11), ey: y(a[11]), ly: y(a[11]) }; }).sort((p, q) => p.ey - q.ey);
  if (ends[1].ly - ends[0].ly < 16) ends[1].ly = ends[0].ly + 16;
  for (const e of ends) s += `<circle cx="${e.ex}" cy="${e.ey}" r="3.5" fill="${C[e.yr]}" stroke="#1E1E1E" stroke-width="2"/><text class="lab" x="${e.ex + 9}" y="${e.ly + 4}"><tspan class="lb">${e.yr}</tspan> ${nl(e.v, 1)}</text>`;
  s += `<circle cx="${e26.ex}" cy="${e26.ey}" r="4" fill="${C[2026]}" stroke="#1E1E1E" stroke-width="2"/><text class="lab h" text-anchor="middle" x="${e26.ex}" y="${e26.ey - 11}"><tspan class="lb">2026</tspan> ${nl(e26.v, 1)}</text>`;
  return s + '</svg>';
}
const line = (title, sub, a26, a25, a24) => `<div class="card"><h3>${title}</h3><p class="sub">${sub}</p>${lineSvg('dsk', a26, a25, a24)}${lineSvg('mob', a26, a25, a24)}</div>`;

function barsSvg() {
  const rows = [...top, overig];
  const mx = Math.max(...rows.map((r) => Math.max(r.a, r.b, r.c)));
  const rowH = 50, lab = 128, W = 440, bw = W - lab - 44, H = rows.length * rowH + 2;
  let s = `<svg class="chart dsk" style="max-width:500px" viewBox="0 0 ${W} ${H}" role="img">`;
  rows.forEach((r, i) => {
    const y0 = i * rowH + 2;
    s += `<text x="0" y="${y0 + 26}" class="rl${r === overig ? ' mut' : ''}">${r.name.length > 17 ? r.name.slice(0, 16).trim() + '…' : r.name}${r === lm ? '*' : ''}</text>`;
    [[r.a, C[2026], 6], [r.b, C[2025], 18], [r.c, C[2024], 30]].forEach(([v, c, dy]) => {
      const w = Math.max(v / mx * bw, 3);
      s += `<rect x="${lab}" y="${y0 + dy - 3.5}" width="${w}" height="7" rx="3.5" fill="${c}"/><text x="${lab + w + 7}" y="${y0 + dy + 3.5}" class="vl">${nl(v, 1)}</text>`;
    });
  });
  return s + '</svg>';
}
const dcell = (a, b) => { const d = a - b; if (!b && !a) return '<td>–</td>'; const cls = b && Math.abs(pct(a, b)) < 3 ? 'flat' : d > 0 ? 'up' : d < 0 ? 'dn' : 'flat'; return `<td class="dl"><span class="g ${cls}">${cls === 'flat' ? '●' : d > 0 ? '▲' : '▼'}</span> ${d > 0 ? '+' : d < 0 ? '−' : ''}${nl(Math.abs(d), 1)}</td>`; };
const tbl = `<table class="tbl mob"><thead><tr><th>Soort</th><th>2024</th><th>2025</th><th>2026</th><th>Δ vs 2025</th></tr></thead><tbody>${[...top, overig].map((r) => `<tr><td class="nm">${r.name}${r === lm ? '*' : ''}</td><td>${nl(r.c, 1)}</td><td>${nl(r.b, 1)}</td><td class="cur">${nl(r.a, 1)}</td>${dcell(r.a, r.b)}</tr>`).join('')}</tbody></table>`;
const bars = `<div class="card"><h3>Per voersoort</h3><p class="sub">Zakken jan t/m sep, gelijke periode · top 10 van ${per.length} soorten (zonder hooi en stro)</p>${barsSvg()}${tbl}<p class="note">* Legmeel scharrel wordt sinds 2026 apart geregistreerd; samen met Scharrelmix ${nl(comb.b, 1)} → ${nl(comb.a, 1)}.</p></div>`;

const item = (r, flat) => {
  const up = r.d > 0, cls = flat || (r.b && Math.abs(pct(r.a, r.b)) < 3) ? 'flat' : up ? 'up' : 'dn';
  const pc = r.b ? nl(Math.abs(pct(r.a, r.b)), 0) + '%' : 'nieuw';
  return `<li><div class="l1"><span class="nm">${r.name}</span><span class="dchip ${cls}"><b>${cls === 'flat' ? '●' : up ? '▲' : '▼'}</b> ${up ? '+' : '−'}${nl(Math.abs(r.d), 1)}<span class="pc"> (${pc})</span></span></div><div class="l2">${nl(r.b, 1)} → ${nl(r.a, 1)} · 2024: ${nl(r.c, 1)}</div></li>`;
};
const changes = `<div class="col"><div class="card cm"><h3>Meer dan vorig jaar</h3><p class="sub">Zakken jan t/m sep, gelijke periode · 2025 → 2026</p><ul class="list">${risers.map((r) => item(r)).join('')}</ul></div>
<div class="card cm"><h3>Minder dan vorig jaar</h3><p class="sub">Zakken jan t/m sep, gelijke periode · 2025 → 2026</p><ul class="list">${fallers.map((r) => item(r)).join('')}</ul>
<div class="ch" style="margin-top:12px">Samengevoegd, geen echte verandering</div><ul class="list">${item(comb, true)}</ul><p class="note">Legmeel scharrel is sinds 2026 een aparte registratie van dezelfde soort.</p></div></div>`;

const lt = (label, v, unit, sub) => tile(label, v, unit, sub, 'lt');
const hp = pct(T.hooi[0], T.hooi[1]);
const bl = [
  Math.abs(hp) < 3 ? `Hooi blijft gelijk (${nl(T.hooi[0])} tegen ${nl(T.hooi[1])} balen): houd het vaste ritme aan.` : `Hooi is ${hp > 0 ? 'omhoog' : 'omlaag'} (${nl(T.hooi[0])} tegen ${nl(T.hooi[1])} balen, ${hp > 0 ? '+' : '−'}${nl(Math.abs(hp), 0)}%; 2024: ${nl(T.hooi[2])}): pas de vaste bestelling aan, nu ${nl(T.hooi[0] / 39 * 2, 1)} balen per 2 weken.`,
  `Zakken voer samen +${nl(pct(T.bags[0], T.bags[1]), 0)}%; ${risers.map((r) => `${r.name} +${nl(r.d, 1)}`).join(', ')}: zet deze vaste bestellingen omhoog.`,
  `Kokers worden zelden leeggemaakt (${koker(2026)} keer dit jaar, ${koker(2025)} vorig jaar, ${koker(2024)} in 2024): bestel koker-voer in kleine, vaste porties.`,
];

const css = `
:root{--bg:#121212;--s1:#1E1E1E;--s2:#262626;--tx:rgba(255,255,255,.87);--tx2:rgba(255,255,255,.6);--dv:rgba(255,255,255,.12);--good:#66BB6A;--bad:#EF5350}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font-family:Roboto,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1.43}
.sheet{max-width:1280px;margin:0 auto;padding:24px 32px 28px}
header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px;flex-wrap:wrap}
h1{margin:0;font-size:26px;font-weight:500;letter-spacing:-.2px}
header p{margin:2px 0 0;color:var(--tx2);font-size:14px}
.legend{display:flex;gap:16px;font-size:14px}
.legend i{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}
.grid12{display:grid;grid-template-columns:repeat(12,1fr);gap:24px;margin-bottom:24px}
.card{background:var(--s1);border-radius:8px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.5),0 1px 1px rgba(0,0,0,.35);min-width:0}
.s3{grid-column:span 3}.s4{grid-column:span 4}.s5{grid-column:span 5}.s6{grid-column:span 6}.s7{grid-column:span 7}.s6>.card,.s6>.col{height:100%}.col{display:flex;flex-direction:column;gap:24px}.col .card{flex:1}.s12{grid-column:span 12}
h3{margin:0;font-size:16px;font-weight:500}
.sub{margin:2px 0 10px;color:var(--tx2);font-size:12.5px}
.tile .tl{color:var(--tx2);font-size:13px}
.hd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 4px}
.big{font-size:40px;font-weight:300;line-height:1.15;letter-spacing:-.5px}
.big small{font-size:14px;font-weight:400;color:var(--tx2);margin-left:6px;letter-spacing:0}
.prev{color:var(--tx2);font-size:13px}
.note{margin-top:8px;color:var(--tx2);font-size:12px}
.dchip{display:inline-flex;align-items:center;gap:5px;padding:1px 9px;border-radius:12px;font-size:12.5px;font-weight:500;background:var(--s2);color:var(--tx);white-space:nowrap}
.dchip b{font-size:10px;font-weight:400}
.dchip.up b,.g.up{color:var(--good)}.dchip.dn b,.g.dn{color:var(--bad)}.dchip.flat b,.g.flat{color:var(--tx2)}
.chart{width:100%;height:auto;display:block}
.mob{display:none}
.chart text{fill:var(--tx2);font-size:12px;font-family:inherit}
.chart line.grid{stroke:var(--dv);stroke-width:1}
.chart .lab.h{paint-order:stroke;stroke:#1E1E1E;stroke-width:4px;stroke-linejoin:round}.chart .lab{fill:var(--tx);font-size:13px;font-weight:500}.chart .lb{fill:var(--tx2);font-weight:400}
.chart .rl{fill:var(--tx);font-size:13px}.chart .rl.mut{fill:var(--tx2)}
.chart .vl{fill:var(--tx);font-size:11.5px}
.ch{margin:8px 0 2px;color:var(--tx2);font-size:12px;text-transform:uppercase;letter-spacing:.6px}
.list{list-style:none;margin:0 0 6px;padding:0}
.list li{padding:8px 0;border-top:1px solid var(--dv)}
.l1{display:flex;align-items:center;justify-content:space-between;gap:10px}
.l2{color:var(--tx2);font-size:12.5px}
.foot h3{margin-bottom:8px}
.foot ul{margin:0;padding:0;list-style:none}
.foot li{padding:8px 0 8px 18px;border-top:1px solid var(--dv);position:relative}
.foot li:before{content:"";position:absolute;left:0;top:16px;width:6px;height:6px;border-radius:3px;background:var(--tx2)}
.tbl{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.tbl th{font-weight:500;color:var(--tx2);text-align:right;padding:6px 6px;font-size:12px}
.tbl th:first-child,.tbl td.nm{text-align:left}
.tbl td{padding:7px 6px;text-align:right}
.tbl tbody tr:nth-child(even){background:rgba(255,255,255,.04)}
.tbl td.cur{font-weight:700;color:var(--tx)}
.tbl td:not(.cur):not(.nm){color:var(--tx2)}.tbl td.dl{color:var(--tx);white-space:nowrap}
@media (max-width:600px){
 .sheet{padding:16px 16px 20px}
 h1{font-size:22px}
 .s3,.s4,.s5,.s6,.s7,.s12{grid-column:span 12}
 .grid12{gap:12px;margin-bottom:12px}
 .grid12.hero,.grid12.lev{grid-template-columns:1fr 1fr}.grid12.hero .s3{grid-column:span 1}
 .grid12.lev{grid-template-columns:repeat(3,1fr);gap:8px}.grid12.lev .s4{grid-column:span 1}
 .dsk{display:none}.mob{display:block}.tbl.mob{display:table}
 .hero .card{padding:10px 12px}
 .hero .tile .tl{font-size:12px}
 .big{font-size:30px}.big small{font-size:12px;margin-left:3px}
 .hero .big{line-height:1.1}
 .prev{font-size:12px}
 .hero .dchip{padding:1px 7px;font-size:12px}
 .lev .card{padding:10px}
 .lev .big{font-size:28px}.lev .big small,.lev .note{display:none}
 .lev .hd{display:block}.lev .tl{font-size:12px;min-height:34px}
 .lev .prev{}.pl span{white-space:nowrap}.pl b{font-weight:400}.pl+.pl{margin-top:2px}.lev .prev{font-size:12px}.lev .dchip{margin-top:4px}.prev i{font-style:normal}.lev .prev i,.hero .prev i{display:none}
 .pc{display:none}
 .hero .pl b{display:block;color:var(--tx);opacity:.75}.hero .pl i{display:none}.hero .pl+.pl{margin-top:4px}
 .card{padding:12px 14px}
 .cm .note{display:none}.col{gap:12px}
 .hero .prev{}.pl span{white-space:nowrap}.pl b{font-weight:400}.pl+.pl{margin-top:2px}
 .hero .prev{line-height:1.25}
 .hero .hd{margin:0}
 .tbl td{padding:4px 5px}.tbl th{padding:4px 5px}
 .sub{margin-bottom:6px}
 .foot li{padding:6px 0 6px 16px}.foot li:before{top:13px}
 .ch{margin-top:4px}
 h1{font-size:20px}
 .list li{padding:6px 0}
 .nm{min-width:0}
}`;

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voer in cijfers 2026 vs 2025 en 2024</title><style>${css}</style></head><body><div class="sheet">
<header><div><h1>Voer in cijfers · 2026 vs 2025 en 2024</h1><p>2026 t/m september; 2025 en 2024 volledig · bron: de voer app, 3.600 registraties sinds nov 2022</p></div>
<div class="legend">${YS.map((y) => `<span><i style="background:${C[y]}"></i>${y}</span>`).join('')}</div></header>
<div class="grid12 hero">
${[tile('Hooi', T.hooi, 'balen', '', 's3', { 2025: FYS[2025].hooi, 2024: FYS[2024].hooi }), tile('Stro', T.stro, 'balen', '', 's3', { 2025: FYS[2025].stro, 2024: FYS[2024].stro }), tile('Voer in zakken', T.bags, 'zakken', '', 's3', { 2025: FYS[2025].bags, 2024: FYS[2024].bags }), tile('Registraties', T.logs, '', '', 's3', { 2025: FYS[2025].logs, 2024: FYS[2024].logs })].join('')}
</div>
<div class="grid12">
<div class="s6">${line('Hooi per maand', 'Balen per maand · 2026 t/m sep', ser(hooi, 2026), ser12(hooi, 2025), ser12(hooi, 2024))}</div>
<div class="s6">${line('Zakken voer per maand', 'Zakken per maand zonder hooi en stro · 2026 t/m sep', bagsM(2026), bagsM(2025, true), bagsM(2024, true))}</div>
</div>
<div class="grid12">
<div class="s6">${bars}</div>
<div class="s6">${changes}</div>
</div>
</div></body></html>`;
writeFileSync(new URL('jaaroverzicht.html', import.meta.url), html);
console.log(JSON.stringify({ T, fri: V(fri), koker: V(koker) }));
