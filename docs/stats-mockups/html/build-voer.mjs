import fs from 'node:fs';
const R = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const S = R('../analysis/summary.json'), A = R('../analysis/advice.json'), ST = R('../data/storages.json');
const stName = id => (ST.find(x => x.id === id) || {}).name || id;
const feed = id => S.perFeed.find(f => f.id === id);
const adv = id => A.rows.find(r => r.id === id);
const REF = new Date('2026-10-06T12:00:00');
const nf = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('nl-NL', { maximumFractionDigits: d });
const WD = ['zo','ma','di','wo','do','vr','za'], MO = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const dt = s => { const d = new Date(s.slice(0,10) + 'T12:00:00'); return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}` + (d.getFullYear() !== 2026 ? ' ' + d.getFullYear() : ''); };
const daysAgo = s => Math.round((REF - new Date(s.slice(0,10) + 'T12:00:00')) / 864e5);
const mlabel = m => { const [y, mm] = m.split('-'); return MO[+mm - 1] + (mm === '01' || false ? ' ' + y.slice(2) : ''); };
const mlabelY = m => { const [y, mm] = m.split('-'); return MO[+mm - 1] + ' ' + y.slice(2); };
const isDel = d => new Date(d.date.slice(0,10)+'T12:00:00').getDay()===5 || d.amount>=2;
const J = x => JSON.stringify(x);

const NAV = (active) => {
  const items = [['Home','<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
   ['Voorraad','<path d="M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>'],
   ['Statistiek','<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
   ['Bestellen','<path d="M3 4h2l2.5 11h11L21 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>']];
  return `<nav class="bottomnav">${items.map(([n,p]) => `<a href="#"${n===active?' class="active"':''}><span class="pill"><svg viewBox="0 0 24 24">${p}</svg></span>${n}</a>`).join('')}</nav>`;
};
const CSS = `
.page{padding:0;display:block}
.frame{background:var(--bg);position:relative;display:flex;flex-direction:column;width:390px;border:1px solid var(--axis);border-radius:36px;overflow:hidden;margin:0 auto}
.scroll{padding:4px 16px 88px;display:flex;flex-direction:column;gap:12px}
.icon-btn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.chip.muted{background:#ECEEE9;color:var(--ink-2)}.chip.muted::before{content:"?"}
.stat .top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.stat .note{font-size:13px;color:var(--ink-2);margin-top:6px}
.bar-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:10px 0;border-top:1px solid var(--grid)}
.bar-row:first-of-type{border-top:0}
.bar-row .n{font-weight:600}.bar-row .v{font-variant-numeric:tabular-nums;font-weight:600}
.bar-row .track{grid-column:1/3;height:10px;border-radius:5px;background:var(--seq-1);overflow:hidden}
.bar-row .track i{display:block;height:100%;border-radius:5px;background:var(--brand)}
.bar-row .m{grid-column:1/3;font-size:12px;color:var(--ink-2)}
.takeaway{font-size:13px;color:var(--ink);margin:10px 0 0}
.dl{display:flex;flex-direction:column}
.dl .it{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid var(--grid)}
.dl .it:first-child{border-top:0}
.dl .d{width:84px;font-weight:600;font-size:14px}.dl .a{width:70px;font-variant-numeric:tabular-nums}
.dl .w{flex:1;font-size:12px;color:var(--ink-2);min-width:0}
.foot{font-size:13px;color:var(--ink-2);margin:10px 0 0;padding-top:10px;border-top:1px solid var(--grid)}
.adv .big{font-size:28px;font-weight:650;letter-spacing:-.01em}.adv .big small{font-size:15px;font-weight:500;color:var(--ink-2)}
.adv p{margin:8px 0 0;font-size:13px;color:var(--ink-2)}
.adv .hd{display:flex;justify-content:space-between;align-items:center}
.btn{margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px 16px;border-radius:12px;border:1.5px solid var(--brand);background:var(--card);color:var(--brand);font:600 14px inherit;font-family:inherit}
.btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
.hint{font-size:12px;color:var(--ink-2);margin:6px 0 0;text-align:center}
.metrics{display:grid;grid-template-columns:1fr;gap:8px;margin-top:4px}
.metrics div{background:var(--bg);border-radius:12px;padding:10px 12px;display:flex;align-items:baseline;gap:10px}.metrics b{flex:0 0 112px}
.metrics b{font-size:18px;font-weight:650;letter-spacing:-.01em}
.metrics span{font-size:12px;color:var(--ink-2)}
.yr{display:grid;grid-template-columns:44px 1fr 36px;align-items:center;gap:8px;padding:6px 0;font-size:13px}
.yr .t{height:10px;background:var(--seq-1);border-radius:5px;overflow:hidden}.yr .t i{display:block;height:100%;background:var(--brand);border-radius:5px}
.yr .t i.part{background:var(--seq-3)}
.yr b{text-align:right;font-variant-numeric:tabular-nums}
@media (min-width:601px){
 body{background:var(--bg)}
 .frame{width:1280px;border:0;border-radius:0;flex-direction:row;overflow:visible;margin:0}
 .bottomnav{position:static;width:220px;height:auto;min-height:100vh;border-top:0;border-right:1px solid var(--grid);display:flex;flex-direction:column;justify-content:flex-start;padding:24px 12px;gap:4px;flex-shrink:0}
 .bottomnav a{flex-direction:row;justify-content:flex-start;gap:10px;font-size:14px;padding:4px 6px;border-radius:12px}
 .bottomnav .pill{padding:6px}
 .bottomnav a.active{background:var(--brand-tint)}
 .main{flex:1;min-width:0}
 .appbar{padding:24px 32px 4px}
 .scroll{padding:12px 32px 32px;display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
 .c4{grid-column:span 4}.c6{grid-column:span 6}.c8{grid-column:span 8}.c12{grid-column:span 12}
 .o1{order:1}.o2{order:2}.o3{order:3}.o4{order:4}.o5{order:5}.o6{order:6}
 .dl.two{display:grid;grid-template-columns:1fr 1fr;column-gap:40px}
 .dl.two .it:nth-child(2){border-top:0}
}
@media (max-width:600px){ .main{display:contents} .frame{min-height:100vh} }
`;
const page = ({ title, active = 'Voorraad', body, script }) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="base.css"><style>${CSS}</style></head><body>
<div class="page"><div class="frame">${NAV(active)}<div class="main">
<header class="appbar"><span class="icon-btn" aria-label="Terug"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></span><h1>${title}</h1></header>
<div class="scroll">${body}</div></div></div></div>
<script src="charts.js"></script><script>${script}</script></body></html>`;

/* ---------- HOOI ---------- */
{
  const f = feed('hooi'), a = adv('hooi');
  const m24 = f.consumptionPerMonth.filter(m => m.month < '2026-10').slice(-24);
  const avg12 = m24.slice(-12).reduce((s, m) => s + m.amount, 0) / 12;
  const per = S.perStable.map(s => ({ n: s.name, st: s.hooi.currentStock, d: s.hooi.daysUntilEmpty, r: s.hooi.rate12w }));
  const maxSt = Math.max(...per.map(p => p.st));
  const seas = f.seasonality;
  const dels = f.deliveries.filter(isDel).slice(-6).reverse();
  const dueDate = new Date(REF.getTime() + a.coverDays * 864e5);
  const dueS = `${WD[dueDate.getDay()]} ${dueDate.getDate()} ${MO[dueDate.getMonth()]}`;
  const body = `
<div class="card stat c4 o1"><div class="top"><span class="label">Voorraad hooi</span><span class="chip warning">Bijna op</span></div>
 <span class="value">${nf(f.currentStock)}<small>balen</small></span>
 <span class="delta">nog ±${Math.round(a.coverDays)} dagen bij ${nf(f.rate12w)} balen/week</span>
 <div class="note">Laatste levering ${dt(f.lastDelivery)} (${daysAgo(f.lastDelivery)} dagen geleden)</div></div>
<div class="card c4 o2"><h2>Voorraad per stal</h2><p class="sub">Balen nu, en hoe lang het bij het huidige verbruik duurt</p>
 ${per.map(p => `<div class="bar-row"><span class="n">${p.n}</span><span class="v">${nf(p.st)} balen</span>
 <div class="track"><i style="width:${p.st / maxSt * 100}%"></i></div><span class="m">nog ±${Math.round(p.d)} dagen bij ${nf(p.r)} balen/week</span></div>`).join('')}</div>
<div class="card c8 o4"><h2>Verbruik per maand</h2><p class="sub">Balen hooi, okt 2024 t/m sep 2026 · gemiddeld ${nf(avg12)} per maand (laatste 12)</p>
 <div id="line"></div><div class="legend"><span><i style="--c:var(--cat-1)"></i>Verbruik per maand</span><span><i style="--c:var(--axis)"></i>Gemiddelde laatste 12 maanden</span></div></div>
<div class="card c4 o5"><h2>Seizoen</h2><p class="sub">Gemiddeld aantal balen per kalendermaand, 2023–2025 · donker = meer</p><div id="heat"></div>
 <p class="takeaway">Pieken in <b>april</b> (${nf(seas[3])}) en <b>oktober/november</b> (${nf(seas[9])} / ${nf(seas[10])}), dal in <b>juni</b> (${nf(seas[5])}). Verschil is beperkt: reken het hele jaar op ±${nf(seas.reduce((x,y)=>x+y)/12,0)} balen per maand.</p></div>
<div class="card c12 o6"><h2>Leveringen</h2><p class="sub">Laatste 6 vrijdagleveringen (elke 2 weken); kleine dinsdagcorrecties van de telling tellen niet mee</p>
 <div class="dl two">${dels.map(d => `<div class="it"><span class="d">${dt(d.date)}</span><span class="a"><b>${nf(d.amount)}</b> ${d.amount===1?'baal':'balen'}</span><span class="w">${stName(d.storageId)}${d.storages && Object.keys(d.storages).length>1 ? '<br>' + Object.entries(d.storages).sort((x,y)=>y[1]-x[1]).map(([k,v]) => nf(v)+' '+stName(k)).join(' · ') : ''}</span></div>`).join('')}</div>
 <p class="foot">Levering elke 2 weken op vrijdag, meestal ±${f.medianDeliverySize} balen. Volgende: vr 16 okt, daarna vr 30 okt.</p></div>
<div class="card adv c4 o3"><div class="hd"><h2>Advies</h2><span class="chip warning">Bijna op</span></div>
 <div class="big">${a.orderQty} <small>balen voor levering vr 16 okt</small></div>
 <p>Voorraad ${nf(a.stock)} balen en verbruik ${nf(a.ratePerWeek)} balen/week: dat is op rond ${dueS}, vóór vr 30 okt. De bestelling moet tot vr 30 okt plus 1 week reserve toereiken.</p></div>`;
  const script = `
var lab=${J(m24.map(m => mlabelY(m.month)))}; lab[20]=''; if(window.innerWidth<=600){lab=lab.map(function(l,i){return [0,8,16,23].indexOf(i)>-1?l:''})}
var v=${J(m24.map(m => m.amount))}, avg=${J(+avg12.toFixed(2))};
lineChart(document.getElementById('line'),{labels:lab,yLabel:'balen',height:210,series:[
 {name:'Maand',values:v,color:'#2a78d6'},{name:'Gem. ${nf(avg12)}',values:v.map(function(){return avg}),color:'#9AA095'}]});
(function(){var p=document.querySelectorAll('#line svg path[stroke="#9AA095"]');p.forEach(function(x){x.setAttribute('stroke-dasharray','5 4');x.setAttribute('stroke-width','1.5')});
 var c=document.querySelectorAll('#line svg circle[fill="#9AA095"]');c.forEach(function(x){x.remove()})})();
heatStrip(document.getElementById('heat'),{labels:${J(MO)},values:${J(seas)}});`;
  fs.writeFileSync(new URL('voer-hooi.html', import.meta.url), page({ title: 'Hooi', body, script }));
}

/* ---------- GEITENKORREL ---------- */
{
  const f = feed('geitenkorrel'), a = adv('geitenkorrel');
  const sh = S.perShute.find(s => s.storageId === 'geitenkorrel');
  const m12 = f.consumptionPerMonth.filter(m => m.month < '2026-10').slice(-12);
  const sum12 = f.consumptionPerMonth.filter(m => m.month >= '2025-10' && m.month < '2026-10').reduce((s, m) => s + m.amount, 0);
  const yrs = ['2023','2024','2025','2026'], ymax = Math.max(...yrs.map(y => f.consumptionPerYear[y]));
  const lastEmpty = sh.lastEmptied, ago = daysAgo(lastEmpty);
  const cycles = sh.emptyCycles.length;
  const dels = f.deliveries.filter(isDel).slice(-5).reverse();
  const body = `
<div class="card stat c4 o1"><div class="top"><span class="label">Verbruik 12 weken</span><span class="chip muted">Telling onbekend</span></div>
 <span class="value">${nf(f.rate12w)}<small>zak/week</small></span>
 <span class="delta">≈ ${nf(f.rate12w * 52 / 12, 0)} zakken per maand · ${nf(sum12, 0)} zakken in 12 maanden</span>
 <div class="note">Voorraad staat op 0: zakken gaan direct in de koker</div></div>
<div class="card c8 o4"><h2>Zakken in de koker per maand</h2><p class="sub">Zakken geitenkorrel, okt 2025 t/m sep 2026 · okt 2026 loopt nog (0 t/m 6 okt)</p><div id="bar"></div></div>
<div class="card c4 o3"><h2>Per jaar</h2><p class="sub">Zakken geitenkorrel per kalenderjaar</p>
 ${yrs.map(y => `<div class="yr"><span>${y}${y==='2026'?'*':''}</span><span class="t"><i class="${y==='2026'?'part':''}" style="width:${f.consumptionPerYear[y]/ymax*100}%"></i></span><b>${nf(f.consumptionPerYear[y],0)}</b></div>`).join('')}
 <p class="foot">* 2026 is t/m ${dt('2026-10-06').replace(/^\S+ /,'')}; het jaar is nog niet af. Hoe lichter de balk, hoe onvollediger.</p></div>
<div class="card c4 o5"><div class="top" style="display:flex;justify-content:space-between;align-items:center"><h2>Koker</h2>${ago > 365 ? '<span class="chip warning">Lang niet leeggemaakt</span>' : ''}</div>
 <p class="sub">Koker geitenkorrel: bijvullen en leegmaken volgens de logboeken</p>
 <div class="metrics"><div><b>${dt(lastEmpty).replace(/^\S+ /,'')}</b><span>laatst leeggemaakt (${ago} dagen geleden)</span></div>
 <div><b>±${nf(sh.avgDaysBetweenEmptied,0)} dgn</b><span>gemiddeld tussen leegmaken</span></div>
 <div><b>${cycles}</b><span>geregistreerde cycli sinds nov 2022</span></div></div>
 <p class="foot">${sh.totalFills} keer bijgevuld, laatst ${dt(sh.lastFill)}. Weinig cycli: de koker wordt in de praktijk bijna nooit als leeg geregistreerd.</p></div>
<div class="card c12 o6"><h2>Leveringen</h2><p class="sub">Laatste 5 leveringen; kleine dinsdagcorrecties van de telling tellen niet mee</p>
 <div class="dl two">${dels.map(d => `<div class="it"><span class="d">${dt(d.date)}</span><span class="a"><b>${nf(d.amount)}</b> ${d.amount===1?'zak':'zakken'}</span><span class="w">${stName(d.storageId)}${d.storages && Object.keys(d.storages).length>1 ? '<br>' + Object.entries(d.storages).map(([k,v]) => nf(v)+' '+stName(k)).join(' · ') : ''}</span></div>`).join('')}</div>
 <p class="foot">Meestal ${f.medianDeliverySize} zak per levering, onregelmatig. Laatste levering is ${a.daysSinceDelivery} dagen geleden.</p></div>
<div class="card adv c4 o2"><div class="hd"><h2>Advies</h2><span class="chip muted">Telling onbekend</span></div>
 <div class="big">±${a.orderQty} <small>zakken voor levering vr 16 okt</small></div>
 <p>Voorraad niet geteld (staat op 0, zakken gaan direct in de koker). Verbruik ±${nf(a.ratePerWeek)} zak/week; de bestelling moet tot vr 30 okt plus 1 week reserve toereiken. Controleer eerst de koker.</p>
 <button class="btn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Levering registreren</button>
 <p class="hint">Nieuw: met geregistreerde leveringen wordt de voorraad wél bekend.</p></div>`;
  const script = `barChart(document.getElementById('bar'),{labels:${J(m12.map(m => MO[+m.month.slice(5)-1]))},values:${J(m12.map(m => m.amount))},highlightLast:true,yLabel:'zakken',height:200});`;
  fs.writeFileSync(new URL('voer-geitenkorrel.html', import.meta.url), page({ title: 'Geitenkorrel', body, script }));
}
