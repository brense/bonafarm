import { readFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
export const J = (p) => JSON.parse(readFileSync(new URL(p, here), 'utf8'));
export const summary = J('../analysis/summary.json');
export const storages = J('../data/storages.json');
export const feeds = J('../data/feeds.json');
export const REF = new Date('2026-10-06T12:00:00Z');
export const nl = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',');
const DAYS = ['zo','ma','di','wo','do','vr','za'], MON = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
export const dateNl = (iso) => { const d = new Date(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
export const dateNlY = (iso) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const daysAgo = (iso) => Math.round((REF - new Date(iso)) / 864e5);
export const monLabel = (m) => MON[+m.slice(5) - 1];
const cap = (x) => x[0].toUpperCase() + x.slice(1);
export const feedName = (id) => cap((feeds.find((f) => f.id === id)?.name ?? id).trim());
export const storageName = (id) => storages.find((s) => s.id === id)?.name ?? `${cap(id)} (verwijderd)`;
export const chip = (cls, text) => `<span class="chip ${cls}">${text}</span>`;

const ICON = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  stock: '<path d="M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
  stat: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  order: '<path d="M3 4h2l2.5 11h11L21 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
};
const NAV = [['home', 'Home'], ['stock', 'Voorraad'], ['stat', 'Statistiek'], ['order', 'Bestellen']];
const svgI = (k) => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;

const CSS = `
body{margin:0}
.app{min-height:100vh}
.shell{padding:0}
.appbar{padding:18px 16px 4px}
.appbar .q{font-size:13px;color:var(--ink-2);margin:0}
.appbar .ttl{flex:1}
.appbar .ttl h1{margin:0}
.grid{padding:8px 16px 110px;display:flex;flex-direction:column;gap:12px}
.bottomnav{position:fixed;z-index:5}
.sidenav{display:none}
@media (min-width:601px){
  body{background:var(--bg)}
  .bottomnav{display:none}
  .sidenav{display:flex;flex-direction:column;gap:4px;position:fixed;left:0;top:0;bottom:0;width:216px;background:var(--card);border-right:1px solid var(--grid);padding:24px 12px}
  .sidenav .brand{font-weight:700;font-size:16px;color:var(--brand);padding:0 12px 20px}
  .sidenav a{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;color:var(--ink-2);text-decoration:none;font-size:14px}
  .sidenav a svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .sidenav a.active{background:var(--brand-tint);color:var(--brand);font-weight:600}
  .shell{margin-left:216px}
  .appbar{padding:28px 32px 8px}
  .appbar h1{font-size:26px}
  .appbar .q{font-size:15px}
  .grid{padding:12px 32px 32px;display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
  .c4{grid-column:span 4}.c5{grid-column:span 5}.c6{grid-column:span 6}.c7{grid-column:span 7}.c8{grid-column:span 8}.c12{grid-column:span 12}
}
.card{min-width:0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.two .stat .value{font-size:40px}
@media (max-width:600px){.two{grid-template-columns:1fr;gap:14px}}
.gbar{position:relative;height:10px;border-radius:5px;background:var(--seq-1);margin:8px 0 4px}
.gbar b{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:var(--seq-4)}
.gbar i{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--axis)}
.line2{display:flex;justify-content:space-between;font-size:12px;color:var(--ink-2)}
.srow{padding:12px 0;border-top:1px solid var(--grid)}
.srow:first-of-type{border-top:0}
.srow .top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.srow .top .n{font-weight:600}
.srow .top .s{color:var(--ink-2);font-weight:400;font-size:13px}
.chip.muted{background:var(--grid);color:var(--ink-2)}
.chip.muted::before{content:"?"}
.chip.hertel::before{content:"\\25B2"}
.note{font-size:12px;color:var(--ink-2);margin:10px 0 0}
.btn{border:1px solid var(--axis);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:600;white-space:nowrap}
.take p{margin:0 0 8px;font-size:14px}
.take ul{margin:0;padding-left:18px;font-size:14px}
.take li{margin-bottom:4px}
.rule{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--brand-tint);color:var(--ink);font-size:14px}
.rule b{color:var(--brand)}
.row .main .meta{white-space:normal}
.krow .avatar{width:36px;height:36px;border-radius:12px;background:var(--brand-tint);display:grid;place-items:center;font-weight:700;color:var(--brand)}
.krow{padding:12px 0;border-top:1px solid var(--grid)}.krow:first-child{border-top:0}.khead{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;margin-bottom:4px}.khead .title{flex:1;min-width:120px;font-weight:600}.krow .meta{font-size:12px;color:var(--ink-2);padding-left:46px}
.acts{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
`;

export function page({ title, question, active, cards, script }) {
  const side = NAV.map(([k, l], i) => `<a href="#"${i === active ? ' class="active"' : ''}>${svgI(k)}${l}</a>`).join('');
  const bottom = NAV.map(([k, l], i) => `<a href="#"${i === active ? ' class="active"' : ''}><span class="pill">${svgI(k)}</span>${l}</a>`).join('');
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="base.css"><style>${CSS}</style></head><body>
<div class="app">
<nav class="sidenav"><div class="brand">Bonafarm voer</div>${side}</nav>
<div class="shell">
<header class="appbar"><div class="ttl"><h1>${title}</h1><p class="q">${question}</p></div><span class="icon-btn">&#9881;</span></header>
<div class="grid">
${cards.map((c) => `<section class="card ${c.cls || 'c12'}"${c.id ? ` id="${c.id}"` : ''}>${c.html}</section>`).join('\n')}
</div></div>
<nav class="bottomnav">${bottom}</nav>
</div>
<script src="charts.js"></script>
<script>${script || ''}</script></body></html>`;
}
// post-process helper source (inlined into pages): de-collide direct labels, drop x label crowding the last one
export const fixLabels = `
function fixLine(id,nudge){var s=document.querySelector('#'+id+' svg');if(!s)return;var t=[].slice.call(s.querySelectorAll('text'));
 Object.keys(nudge).forEach(function(k){t.forEach(function(e){if(e.textContent===k)e.setAttribute('y',+e.getAttribute('y')+nudge[k]);});});
 var xs=t.filter(function(e){return +e.getAttribute('y')>s.viewBox.baseVal.height-10&&e.getAttribute('text-anchor')==='middle';});
 if(xs.length>1){var l=+xs[xs.length-1].getAttribute('x');xs.slice(0,-1).forEach(function(e){if(l-(+e.getAttribute('x'))<34)e.remove();});}}
`;
