import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const DIR = path.dirname(fileURLToPath(import.meta.url));
const rd = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
export const summary = rd('../analysis/summary.json');
export const advice = rd('../analysis/advice.json');
export const nl = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',');
export const trim = s => s.trim();
const WD = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'], MO = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const dateNl = iso => { const d = new Date(iso + 'T12:00:00Z'); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`; };
export const unitName = (u, n) => (u === 'balen' ? (n === 1 ? 'baal' : 'balen') : (n === 1 ? 'zak' : 'zakken'));
export const isBale = id => id === 'hooi' || id === 'stro';
export const rows = advice.rows.map(r => ({ ...r, name: trim(r.name) }));
export const rate = r => r < 1 ? nl(r, 2) : nl(r, 1);

export const icons = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  stock: '<path d="M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
  stat: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  order: '<path d="M3 4h2l2.5 11h11L21 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
};
const items = [['Home', 'home'], ['Voorraad', 'stock'], ['Statistiek', 'stat'], ['Bestellen', 'order']];
export const bottomNav = active => `<nav class="bottomnav">${items.map(([t, i]) =>
  `<a href="#"${t === active ? ' class="active"' : ''}><span class="pill"><svg viewBox="0 0 24 24">${icons[i]}</svg></span>${t}</a>`).join('')}</nav>`;
export const sideNav = active => `<aside class="side"><div class="brand">Bonafarm voer</div>${items.map(([t, i]) =>
  `<a href="#"${t === active ? ' class="active"' : ''}><svg viewBox="0 0 24 24">${icons[i]}</svg>${t}</a>`).join('')}</aside>`;

export const css = `
body{background:var(--bg)}
.frame{background:var(--bg);position:relative}
.side{display:none}
.main{min-width:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;padding:12px 18px;font:600 15px inherit;font-family:inherit;cursor:pointer}
.btn.primary{background:var(--brand);color:#fff}
.btn.secondary{background:#fff;color:var(--brand);border:1.5px solid var(--brand);padding:8px 14px;font-size:13px}
.btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.chip.muted{background:#ECEEE8;color:var(--ink-2)}.chip.muted::before{content:"?";font-weight:800}
.chip.serious::before{content:"\\2261";font-weight:800}
.note{font-size:12px;color:var(--ink-2)}
@media (max-width:600px){
  .frame{width:100%;min-height:100vh}
  .scroll{padding:4px 16px 92px;display:flex;flex-direction:column;gap:12px}
  .appbar{padding-top:20px}
}
@media (min-width:601px){
  .frame{width:1280px;display:grid;grid-template-columns:220px 1fr;min-height:100vh}
  .bottomnav{display:none}
  .side{display:flex;flex-direction:column;gap:4px;padding:28px 16px;border-right:1px solid var(--grid);background:var(--card)}
  .side .brand{font-weight:700;font-size:17px;color:var(--brand);padding:4px 12px 20px}
  .side a{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;color:var(--ink-2);text-decoration:none;font-size:14px}
  .side a svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .side a.active{background:var(--brand-tint);color:var(--brand);font-weight:600}
  .appbar{padding:24px 32px 0}
  .appbar .icon-btn{display:none}
}`;
export const bottomScript = '<script src="charts.js"></script>';
