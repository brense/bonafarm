import { writeFileSync } from 'node:fs';
import { summary } from './lib.mjs';
import { css as shellCss, bottomNav, sideNav } from './common.mjs';
const nl = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: d });
const MON = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const YS = [2024, 2025, 2026], SEL = 2026;
const ALLY=[2023,2024,2025,2026];
const COL = { 2026: 'var(--brand)', 2025: 'var(--cat-2)', 2024: 'var(--cat-3)' };
const mk = (y, n = 12) => MON.slice(0, n).map((_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
const feeds = summary.perFeed;
const mval = (f, m) => f.consumptionPerMonth.find((x) => x.month === m)?.amount ?? 0;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const hooi = feeds.find((f) => f.id === 'hooi'), stro = feeds.find((f) => f.id === 'stro');
const bags = feeds.filter((f) => f.id !== 'hooi' && f.id !== 'stro');
const ser = (f, y, n = 12) => mk(y, n).map((m) => mval(f, m));
const bagsM = (y, n = 12) => mk(y, n).map((m) => sum(bags.map((f) => mval(f, m))));
const logsM = (y, n = 12) => mk(y, n).map((m) => summary.overview.logsPerMonth.find((x) => x.month === m)?.count ?? 0);
const pct = (a, b) => (b ? (a - b) / b * 100 : 0);
const T = (fn) => Object.fromEntries(ALLY.map((y) => [y, fn(y)]));
const H0 = { hooi: T((y) => sum(ser(hooi, y, 9))), stro: T((y) => sum(ser(stro, y, 9))), bags: T((y) => sum(bagsM(y, 9))), logs: T((y) => sum(logsM(y, 9))) };
const yearHooi = T((y) => sum(ser(hooi, y)));

// line chart
function lineSvg(variant, data) { // data: {year: array(12) with null after sep for 2026}
  const mob = variant === 'mob';
  const W = mob ? 340 : 500, Hh = mob ? 230 : 250, L = 30, R = mob ? 64 : 70, Tp = 16, Bm = 26;
  const iw = W - L - R, ih = Hh - Tp - Bm;
  const all = YS.flatMap((y) => data[y].filter((v) => v != null));
  const step = Math.max(...all) > 100 ? 50 : 10;
  const top = Math.ceil(Math.max(...all) / step) * step;
  const x = (i) => L + iw * i / 11, y = (v) => Tp + ih * (1 - v / top);
  let s = `<svg class="lsvg" viewBox="0 0 ${W} ${Hh}" role="img">`;
  for (const t of [0, top / 2, top]) s += `<line x1="${L}" x2="${W - R + 6}" y1="${y(t)}" y2="${y(t)}" stroke="${t ? 'var(--grid)' : 'var(--axis)'}" ${t ? 'stroke-dasharray="3 3"' : ''}/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${nl(t)}</text>`;
  MON.forEach((m, i) => { if (!mob || i % 2 === 0) s += `<text x="${x(i)}" y="${Hh - 6}" text-anchor="middle">${m}</text>`; });
  const lbls = [];
  for (const yr of YS) {
    const a = data[yr], sel = yr === SEL;
    const pts = a.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean);
    s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${COL[yr]}" stroke-width="${sel ? 2 : 1.5}" ${sel ? '' : 'opacity=".7"'} stroke-linejoin="round" stroke-linecap="round"/>`;
    const e = pts[pts.length - 1];
    s += `<circle cx="${e[0]}" cy="${e[1]}" r="${sel ? 4 : 3}" fill="${COL[yr]}" stroke="#fff" stroke-width="2"/>`;
    const lastV = a.filter((v) => v != null).slice(-1)[0];
    lbls.push({ yr, ex: e[0], ey: e[1], ly: e[1], v: lastV });
  }
  // de-collide labels at their end positions (sort by y, min gap 13)
  const grp = lbls.sort((p, q) => p.ey - q.ey);
  for (let i = 1; i < grp.length; i++) if (grp[i].ly - grp[i - 1].ly < 13 && Math.abs(grp[i].ex - grp[i - 1].ex) < 30) grp[i].ly = grp[i - 1].ly + 13;
  for (const l of grp) s += `<text class="lab${l.yr === SEL ? ' sel' : ''}" x="${l.ex + 8}" y="${l.yr === SEL ? l.ly - 7 : l.ly + 4}"><tspan class="lb">${l.yr}</tspan> ${nl(l.v, 0)}</text>`;
  return s + '</svg>';
}
const legend = `<div class="legend">${[2026,2025,2024].map((y) => `<span><i style="--c:${COL[y]}"></i>${y}</span>`).join('')}</div>`;
const lineCard = (title, sub, getter) => {
  const data = T((y) => y === SEL ? [...getter(y, 9), ...Array(3).fill(null)] : getter(y, 12));
  return `<section class="card c6"><h2>${title}</h2><p class="sub">${sub}</p><div class="dsk">${lineSvg('dsk', data)}</div><div class="mobx">${lineSvg('mob', data)}</div>${legend}</section>`;
};

// per voersoort
const nm = (f) => f.name.trim().replace('senioren priores', 'sen.').replace(/^./, (c) => c.toUpperCase());
const per = bags.map((f) => ({ name: nm(f), v: T((y) => sum(ser(f, y, 9))) }));
const tot4 = (p) => sum(ALLY.map((y) => p.v[y]));
per.sort((a, b) => tot4(b) - tot4(a));
const sumV = (arr) => T((y) => sum(arr.map((p) => p.v[y])));
const top = per.slice(0, 10), rest = per.slice(10);
const overig = { name: `Overig (${rest.length})`, v: sumV(rest) };
const sm = per.find((p) => p.name === 'Scharrelmix'), lm = per.find((p) => p.name.startsWith('Legmeel scharrel'));
const comb = { name: 'Scharrelmix + Legmeel scharrel', v: sumV([sm, lm]) };

const inP = (d, y) => d >= `${y}-01-01` && d <= `${y}-09-30`;
const byDate = {};
for (const f of feeds) for (const d of f.deliveries || []) byDate[d.date] = (byDate[d.date] || 0) + d.amount;
const fri = (y) => Object.entries(byDate).filter(([d, a]) => inP(d, y) && a >= 2 && new Date(d + 'T12:00:00Z').getUTCDay() === 5).length;
const med = (a) => { a = [...a].sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : 0; };
const hooiMed = (y) => med(hooi.deliveries.filter((d) => inP(d.date, y)).map((d) => d.amount));
const koker = (y) => sum(summary.perShute.map((s) => (s.emptyCycles || []).filter((c) => c.end && inP(c.end.slice(0, 10), y)).length));
const groups = [
 ['Totalen', [
  ['Hooi (balen)', H0.hooi, 1], ['Stro (balen)', H0.stro, 1], ['Zakken voer', H0.bags, 1], ['Registraties', H0.logs, 0],
  ['Vrijdag-leveringen', T(fri), 0], ['Balen hooi per levering (mediaan)', T(hooiMed), 1], ['Kokers leeggemaakt', T(koker), 0]]],
 ['Per voersoort (zakken)', [...top, overig].map((r) => [r.name + (r === lm ? '*' : ''), r.v, 1])],
];
const cell = (v, base, y, d, best) => {
  if (y === SEL) return `<td class="c base${best ? ' best' : ''}"><div class="v">${nl(v, d)}</div></td>`;
  const df = v - base, p = base ? Math.abs(df / base) * 100 : 0, cls = Math.abs(df) < 1e-9 || (base && p < 3) ? 'flat' : df > 0 ? 'up' : 'dn';
  const g = cls === 'flat' ? '●' : df > 0 ? '▲' : '▼';
  return `<td class="c${best ? ' best' : ''}"><div class="v">${nl(v, d)}</div><div class="dl ${cls}"><span>${g}</span> ${df > 0 ? '+' : df < 0 ? '−' : ''}${nl(Math.abs(df), d)}</div></td>`;
};
const colsOrd = [2026, 2025, 2024];
const body = groups.map(([g, rows]) => `<tr class="gh"><th colspan="${colsOrd.length + 1}"><div>${g}</div></th></tr>` + rows.map(([n, v, d]) => {
  const mx = Math.max(...colsOrd.map((y) => v[y]));
  return `<tr><th class="rn">${n}</th>${colsOrd.map((y) => cell(v[y], v[SEL], y, d, v[y] === mx && mx > 0)).join('')}</tr>`;
}).join('')).join('');
const matrix = `<section class="card c12 mx"><h2>Vergelijking</h2><p class="sub">Jan t/m sep, gelijke periode · 2026 is de basis</p><div class="tw"><div class="scrl"><table class="cmp"><thead><tr><th class="rn"></th>${colsOrd.map((y) => `<th class="yh${y === SEL ? ' base' : ''}"><b>${y}</b>${y === SEL ? '<small>basis</small>' : '<small>&nbsp;</small>'}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></div>
<p class="note">Verschil = dat jaar t.o.v. 2026. Dikgedrukt = hoogste waarde in de rij.</p><p class="note">* Legmeel scharrel sinds 2026 apart geregistreerd; samen met Scharrelmix ${nl(comb.v[2025], 1)} → ${nl(comb.v[2026], 1)}.</p></section>`;
const extra = `
.chips{display:flex;gap:8px;flex-wrap:wrap}
.yr{flex:1;min-width:60px;text-align:center;padding:9px 10px;border-radius:12px;border:1.5px solid var(--axis);background:#fff;color:var(--ink-2);font-weight:600;font-size:14px}
.yr.sel{background:var(--brand-tint);border-color:var(--brand);color:var(--brand)}
.yr.on{background:var(--brand);border-color:var(--brand);color:#fff}
.seg{display:flex;background:var(--bg);border-radius:12px;padding:3px;margin-top:12px;gap:2px}
.seg span{flex:1;text-align:center;padding:8px 6px;border-radius:10px;font-size:13px;font-weight:600;color:var(--ink-2)}
.seg span.on{background:#fff;color:var(--brand);box-shadow:var(--shadow)}
.ctl .note{margin:8px 0 0}.lbl{font-size:13px;font-weight:600;margin:0 0 8px}
.tw{position:relative}
.scrl{overflow-x:auto}
.cmp{border-collapse:separate;border-spacing:0;width:100%;font-variant-numeric:tabular-nums}
.cmp th.rn{text-align:left;font-weight:500;font-size:13px;padding:9px 8px 9px 0;background:#fff;position:sticky;left:0;z-index:2;min-width:132px;border-bottom:1px solid var(--grid)}
.cmp td.c{text-align:right;padding:7px 10px;min-width:96px;border-bottom:1px solid var(--grid);vertical-align:top}
.cmp .v{font-size:15px}.cmp td.best .v{font-weight:800}
.cmp td.base{background:var(--brand-tint)}
.cmp .dl{font-size:11.5px;color:var(--ink-2)}.cmp .dl span{font-size:9px}
.cmp th.yh{text-align:right;padding:6px 10px;font-weight:600;min-width:96px;border-bottom:1px solid var(--axis)}
.cmp th.yh b{display:block;font-size:16px}.cmp th.yh small{font-size:11px;font-weight:500;color:var(--ink-2)}
.cmp th.yh.base{background:var(--brand-tint);color:var(--brand);border-radius:10px 10px 0 0}
.cmp tr.gh th{background:#fff;position:sticky;left:0;padding:14px 0 4px;text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-2);font-weight:600;border-bottom:1px solid var(--axis)}
.cmp tr.gh th div{position:sticky;left:0;width:max-content}
.fade{position:absolute;right:0;top:0;bottom:0;width:36px;pointer-events:none;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.95) 85%);display:none}
.lsvg{width:100%;height:auto;display:block;overflow:visible}
.lsvg text{fill:var(--ink-2);font-size:11px;font-family:inherit}
.lsvg .lab{fill:var(--ink);font-size:11.5px;font-weight:500}.lsvg .lab.sel{font-weight:700}.lsvg .lb{fill:var(--ink-2);font-weight:400}
.mobx{display:none}
.foot{font-size:12px;color:var(--ink-2);text-align:center;margin:4px 0 0}
@media (max-width:600px){.dsk{display:none}.mobx{display:block}.mx{padding:12px}.cmp{table-layout:fixed;width:333px}.cmp td.c{padding:8px 6px;width:75px;min-width:0}.cmp th.yh{min-width:0;width:75px;padding:6px}.cmp .v{font-size:15px}.cmp .dl{font-size:11px}.cmp th.rn{width:108px;min-width:0;font-size:13px;padding-right:4px}}
`;
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jaarvergelijking</title><link rel="stylesheet" href="base.css"><style>${shellCss}${extra}
.grid{display:flex;flex-direction:column;gap:12px}
@media (min-width:601px){.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.c6{grid-column:span 6}.c12{grid-column:span 12}.foot{grid-column:span 12}}
.scroll{padding:4px 16px 92px}
@media (min-width:601px){.scroll{padding:12px 32px 32px}.appbar h1{font-size:26px}}
.appbar .ttl{flex:1}.appbar .q{margin:0;font-size:13px;color:var(--ink-2)}
</style></head><body>
<div class="frame">${sideNav('Statistiek')}
<div class="main">
<header class="appbar"><div class="ttl"><h1>Jaarvergelijking</h1><p class="q">Vergelijk een jaar met alle voorgaande jaren</p></div><span class="icon-btn">&#9881;</span></header>
<div class="scroll grid">
<section class="card c12 ctl"><p class="lbl">Vergelijk</p><div class="chips"><span class="yr">2023</span><span class="yr sel">2024</span><span class="yr sel">2025</span><span class="yr on">2026</span></div>
<p class="note">Tik op een jaar om het toe te voegen of te verbergen. Standaard: lopend jaar met de twee jaren ervoor.</p>
<div class="seg"><span class="on">T/m sep</span><span>Heel jaar</span></div>
<p class="note">2026 loopt t/m 6 okt; 2025, 2024 en 2023 zijn compleet</p></section>
${matrix}
${lineCard('Hooi per maand', 'Balen per maand · 2026 t/m sep', (y, n) => ser(hooi, y, n))}
${lineCard('Zakken voer per maand', 'Zakken per maand, zonder hooi en stro · 2026 t/m sep', (y, n) => bagsM(y, n))}
<p class="foot">Data sinds nov 2022; 2026 t/m 6 okt.</p>
</div></div>
${bottomNav('Statistiek')}
</div></body></html>`;
writeFileSync(new URL('jaarvergelijking.html', import.meta.url), html);
console.log(JSON.stringify(groups[0][1].map(r=>[r[0],r[1]])));
