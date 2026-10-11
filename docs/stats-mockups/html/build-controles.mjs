import { writeFileSync } from 'node:fs';
import { page, summary, nl, chip, feedName, storageName } from './lib.mjs';
const dq = (s) => summary.dataQuality.find((d) => d.issue.startsWith(s));
const disc = dq('items stock disagrees'), neg = dq('implied stock dipped'), negEnd = dq('implied stock (sum'), link = dq('feeds with linked'), noFeed = dq('shute storages that no'), dangling = dq('log rows with');
const top = disc.top10.slice(0, 8);
const dRow = (d) => `<div class="row"><div class="main"><div class="title">${storageName(d.storageId)} · ${feedName(d.feedId)}</div>
 <div class="meta">Geteld <b>${nl(d.items)}</b> · verwacht <b>${nl(d.implied)}</b> (verschil ${d.diff > 0 ? '+' : ''}${nl(d.diff)})</div></div>
 <div class="acts">${chip('warning hertel', 'Hertellen')}<button class="btn">Nu tellen</button></div></div>`;
const nRow = (e) => { const [s, f] = e.key.split('|'); return `<div class="row"><div class="main"><div class="title">${storageName(s)} · ${feedName(f)}</div><div class="meta">Laagste stand in historie: <b>${nl(e.minRunning)}</b> ${negEnd.examples.some((x) => x.key === e.key) ? '· eindigt negatief' : ''}</div></div>${chip('warning', 'Controleren')}</div>`; };
const cards = [
 { cls: 'c12', html: `<div class="two"><div class="stat"><span class="label">Telling wijkt af van historie</span><span class="value">${disc.count}<small>voorraadregels</small></span><span class="delta">opslag/voer-paren waar geteld en verwacht verschillen</span></div>
  <div class="stat"><span class="label">Regels naar verwijderde opslag</span><span class="value">${dangling.count}<small>logregels</small></span><span class="delta">${dangling.ids.length} opslagen bestaan niet meer</span></div></div>` },
 { cls: 'c6', html: `<h2>Telling wijkt af</h2><p class="sub">${top.length} van ${disc.count}, grootste verschil eerst. Geteld = voorraad nu, verwacht = som van alle leveringen en verbruik.</p><div class="rows">${top.map(dRow).join('')}</div>
  <p class="note">Tellingen worden elke dinsdag bijgewerkt: de geteld-waarden gelden per di 29 sep en di 6 okt.</p>` },
 { cls: 'c6', html: `<h2>Negatieve voorraad in historie</h2><p class="sub">${neg.count} paren waarvan het lopende saldo onder nul kwam</p><div class="rows">${neg.examples.map(nRow).join('')}</div>
  <h2 style="margin-top:20px">Niet gekoppeld</h2><p class="sub">Voer en kokers zonder werkende koppeling</p>
  <div class="rows">${link.details.map((d) => `<div class="row"><div class="main"><div class="title">${feedName(d.feed)}</div><div class="meta">Koppeling naar opslag <b>${d.linked}</b>, bestaat niet meer</div></div>${chip('muted', 'Koppelen')}</div>`).join('')}
  ${noFeed.ids.map((id) => `<div class="row"><div class="main"><div class="title">${storageName(id).replace(' (verwijderd)', '')}</div><div class="meta">Koker zonder voer${id === 'gemengdgraan' ? ' (verwijderd)' : ''}</div></div>${chip('muted', 'Voer kiezen')}</div>`).join('')}</div>` },
 { cls: 'c12 take', html: `<h2>Waarom dit telt voor bestellen</h2><p class="sub">Een bestel-advies is zo goed als de telling</p>
  <p>Het advies rekent met voorraad en weekverbruik. Klopt de telling niet, dan zegt de app bijvoorbeeld dat het hooi over 16 dagen op is, terwijl Geitenstal in werkelijkheid 6 balen minder heeft dan de historie zegt.</p>
  <div class="rule"><b>Nieuwe regel:</b> elke levering en telling vastleggen. Dan klopt de voorraad in de app met wat er echt ligt, en wordt het advies betrouwbaar.</div>` },
];
writeFileSync(new URL('controles.html', import.meta.url), page({ title: 'Controles', question: 'Klopt de telling?', active: 2, cards, script: '' }));
