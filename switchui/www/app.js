'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const API = 'cgi-bin/api';
let ST = null, CFG = null, H10 = [], H60 = [], N = 24, POE = false, macs = [], clients = [];

// ---------- utilitaires ----------
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'on' + (bad ? ' err' : '');
  clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 2600);
}
async function get(a, extra = '') {
  const r = await fetch(`${API}?a=${a}${extra}`, { cache: 'no-store' });
  if (a === 'hist') return r.text();
  return r.json();
}
async function post(a, data = {}) {
  const body = new URLSearchParams({ a, ...data });
  const r = await fetch(API, { method: 'POST', body });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'erreur');
  return j;
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function fmtBps(b) {
  const u = ['b/s', 'kb/s', 'Mb/s', 'Gb/s']; let i = 0;
  while (b >= 1000 && i < 3) { b /= 1000; i++; }
  return (b < 10 && i ? b.toFixed(2) : b < 100 && i ? b.toFixed(1) : Math.round(b)) + ' ' + u[i];
}
function fmtBytes(b) {
  const u = ['o', 'Ko', 'Mo', 'Go', 'To']; let i = 0;
  while (b >= 1024 && i < 4) { b /= 1024; i++; }
  return (i ? b.toFixed(1) : b) + ' ' + u[i];
}
function fmtDur(s) {
  s = Math.floor(s); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}
const speedTxt = p => !p.link ? '—' : p.mbps >= 1000 ? '1 Gb/s' : p.mbps + ' Mb/s';
const isCombo = p => /Prefer/.test(p.media || '');
const hasSfp = p => !!p.sfp;
// support réellement utilisé par un port combo : la puce privilégie le cuivre
const mediaTxt = p => !isCombo(p) ? 'RJ45' : hasSfp(p) ? 'module SFP inséré (cuivre prioritaire si un câble RJ45 est aussi branché)' : 'RJ45 (cage SFP vide)';

// ---------- historique ----------
function parseHist(txt) {
  return txt.trim().split('\n').filter(Boolean).map(l => l.trim().split(/\s+/).map(Number));
}
// débits (bits/s) entre deux échantillons, pour chaque port
function rates(h) {
  const out = [];
  for (let i = 1; i < h.length; i++) {
    const a = h[i - 1], b = h[i], dt = b[0] - a[0];
    if (dt <= 0) continue;
    const rx = [], tx = [];
    for (let p = 0; p < N; p++) {
      rx.push(Math.max(0, (b[1 + 2 * p] - a[1 + 2 * p]) * 8 / dt));
      tx.push(Math.max(0, (b[2 + 2 * p] - a[2 + 2 * p]) * 8 / dt));
    }
    out.push({ t: b[0], rx, tx });
  }
  return out;
}
const poeCol = (row, p) => row[1 + 2 * N + p];          // p = 0..N-1
const poeTot = row => row[1 + 3 * N];
const tempCol = row => POE ? row[2 + 3 * N] : row[1 + 2 * N];
const loadCol = row => POE ? row[3 + 3 * N] : row[2 + 2 * N];
const xb = () => 1 + 2 * N + (POE ? N + 1 : 0) + 2;     // colonnes ventilateur% carte puce (dixièmes de °C)
const fanCol = row => row[xb()], boardCol = row => row[xb() + 1] / 10, asicCol = row => row[xb() + 2] / 10;

// ---------- graphique minimal sur canvas ----------
function chart(cv, series, fmt, opts = {}) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.height / (cv._dpr || 1);
  if (!cv._h) cv._h = cv.height;
  cv.width = W * dpr; cv.height = cv._h * dpr; cv._dpr = dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const h = cv._h, css = getComputedStyle(document.documentElement);
  const mut = css.getPropertyValue('--mut').trim(), line = css.getPropertyValue('--line').trim();
  g.clearRect(0, 0, W, h);
  const L = 70, R = 12, T = 10, B = 24;
  const pts = series.flatMap(s => s.data);
  if (pts.length < 2) { g.fillStyle = mut; g.font = '13px system-ui'; g.fillText('Données en cours de collecte…', L, h / 2); return; }
  const t0 = Math.min(...pts.map(p => p[0])), t1 = Math.max(...pts.map(p => p[0]));
  let vmax = Math.max(opts.min || 0, ...pts.map(p => p[1])) * 1.1 || 1;
  const X = t => L + (t - t0) / Math.max(1, t1 - t0) * (W - L - R), Y = v => T + (1 - v / vmax) * (h - T - B);
  g.font = '11px system-ui'; g.strokeStyle = line; g.fillStyle = mut; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = vmax * i / 4, y = Y(v);
    g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke();
    g.fillText(fmt(v), 4, y + 4);
  }
  for (let i = 0; i <= 5; i++) {
    const t = t0 + (t1 - t0) * i / 5, d = new Date(t * 1000);
    const s = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    g.fillText(s, Math.min(X(t) - 14, W - R - 30), h - 6);
  }
  series.forEach(s => {
    g.beginPath(); g.strokeStyle = s.color; g.lineWidth = 1.8;
    s.data.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])));
    g.stroke();
    if (s.fill) { g.lineTo(X(s.data.at(-1)[0]), Y(0)); g.lineTo(X(s.data[0][0]), Y(0)); g.closePath(); g.fillStyle = s.color + '22'; g.fill(); }
  });
  let lx = L + 6;
  series.forEach(s => { g.fillStyle = s.color; g.fillRect(lx, T + 2, 10, 3); g.fillStyle = mut; g.fillText(s.label, lx + 14, T + 7); lx += g.measureText(s.label).width + 34; });
}

// ---------- rendu ----------
function renderHeader() {
  const s = ST.system;
  $('#h-name').textContent = s.hostname; $('#h-model').textContent = s.model;
  $('#h-ip').textContent = s.ip; $('#h-dot').className = 'dot ok';
  $('#h-ver').textContent = s.ui_version ? 'v' + s.ui_version : '';
  document.title = `${s.hostname} – Administration`;
}
function renderDash() {
  const s = ST.system, ps = ST.ports;
  const up = ps.filter(p => p.link).length;
  $('#k-links').textContent = `${up} / ${N}`;
  $('#k-links2').textContent = `${ps.filter(p => p.link && p.mbps >= 1000).length} en 1 Gb/s`;
  const r = rates(H10).at(-1);
  const sum = a => a.reduce((x, y) => x + y, 0);
  $('#k-rx').textContent = r ? fmtBps(sum(r.rx)) : '…';
  $('#k-tx').textContent = r ? fmtBps(sum(r.tx)) : '…';
  const rs1 = rates(H10);
  if (rs1.length) {
    $('#k-rx2').textContent = 'max. 1 h : ' + fmtBps(Math.max(...rs1.map(x => sum(x.rx))));
    $('#k-tx2').textContent = 'max. 1 h : ' + fmtBps(Math.max(...rs1.map(x => sum(x.tx))));
  }
  $('#k-poe').textContent = POE ? s.poe_total.toFixed(1) + ' W' : 'n/a';
  $('#k-poe2').textContent = POE ? `${ps.filter(p => p.poe_w > 0).length} appareil(s) alimenté(s)` : '';
  $('#k-temp').textContent = s.poe_temp != null ? s.poe_temp.toFixed(1) + ' °C' : '–';
  $('#k-volt').textContent = s.poe_volt != null ? s.poe_volt + ' V' : '';
  $('#k-fan').textContent = s.fan_pct != null ? s.fan_pct + ' %' : '–';
  $('#k-fan2').textContent = s.temp_board != null ? `carte ${s.temp_board.toFixed(1)} °C · puce ${s.temp_asic.toFixed(1)} °C` : '';
  $('#k-load').textContent = s.load.split(' ')[0];
  $('#k-mem').textContent = `mémoire libre ${Math.round(s.mem_avail / 1024)} / ${Math.round(s.mem_total / 1024)} Mo`;
  $('#k-up').textContent = fmtDur(s.uptime); $('#k-kern').textContent = 'noyau ' + s.kernel;
  // façade : impairs en haut, pairs en bas
  $('#panel').innerHTML = ps.map(p => {
    const cls = ['pt', p.link ? 'up' : '', p.link && p.mbps < 1000 ? 'f100' : '', p.enabled ? '' : 'dis'].join(' ');
    return `<div class="${cls}" data-p="${p.port}" title="${esc(p.name)}" style="grid-row:${p.port % 2 ? 1 : 2}">
      <span class="n">${p.port}</span><span class="s">${p.link ? speedTxt(p) : p.enabled ? '' : 'off'}</span>
      ${POE && p.poe_w > 0 ? `<span class="pw">⚡</span>` : ''}${hasSfp(p) ? '<span class="cb">SFP</span>' : ''}</div>`;
  }).join('');
  $$('#panel .pt').forEach(e => e.onclick = () => openPort(+e.dataset.p));
  // graphe global
  const rs = rates(H10);
  chart($('#c-dash'), [
    { label: 'Entrant', color: '#1f9d55', fill: true, data: rs.map(x => [x.t, x.rx.reduce((a, b) => a + b)]) },
    { label: 'Sortant', color: '#3b82f6', fill: true, data: rs.map(x => [x.t, x.tx.reduce((a, b) => a + b)]) }], fmtBps);
  $('#dash-poe').classList.toggle('hidden', !POE);
  if (POE) chart($('#c-dash-poe'), [{ label: 'PoE total (W)', color: '#e0a800', fill: true, data: H10.map(r => [r[0], poeTot(r)]) }], v => v.toFixed(1) + ' W', { min: 2 });
  // ports les plus actifs
  if (r) {
    const top = ps.map((p, i) => ({ p, v: r.rx[i] + r.tx[i], rx: r.rx[i], tx: r.tx[i] })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 6);
    $('#top').innerHTML = '<tr><th>Port</th><th>Nom</th><th>Entrant</th><th>Sortant</th><th>Lien</th></tr>' +
      (top.map(x => `<tr class="click" data-p="${x.p.port}"><td>${x.p.port}</td><td>${esc(x.p.name)}</td><td>${fmtBps(x.rx)}</td><td>${fmtBps(x.tx)}</td><td>${speedTxt(x.p)}</td></tr>`).join('') || '<tr><td colspan=5 class="hint">Aucun trafic</td></tr>');
    $$('#top tr.click').forEach(e => e.onclick = () => openPort(+e.dataset.p));
  }
}
function vlanTxt(p) {
  return p.vlan_mode === 'access' ? `Accès ${p.pvid}` : `Trunk · natif ${p.pvid} · ${p.vlans || 'tous'}`;
}
function renderPorts() {
  const r = rates(H10).at(-1);
  $('#t-ports').innerHTML = `<tr><th>Port</th><th>Nom</th><th>État</th><th>Lien</th><th>VLAN</th>${POE ? '<th>PoE</th>' : ''}<th>STP</th><th>Débit ↓ / ↑</th><th>Reçu / Envoyé</th><th>MAC</th></tr>` +
    ST.ports.map((p, i) => `<tr class="click" data-p="${p.port}">
      <td><b>${p.port}</b>${isCombo(p) ? ` <span class="badge">${hasSfp(p) ? 'SFP' : 'combo'}</span>` : ''}</td><td>${esc(p.name)}</td>
      <td>${p.enabled ? '<span class="badge ok">activé</span>' : '<span class="badge bad">désactivé</span>'}</td>
      <td>${p.link ? `<span class="badge ok">${speedTxt(p)}${p.fdx ? '' : ' half'}</span>` : '<span class="badge">pas de lien</span>'}${p.mode === 'forced' ? ' <span class="badge warn">forcé ' + p.speed + '</span>' : ''}</td>
      <td>${vlanTxt(p)}</td>
      ${POE ? `<td>${p.poe_on ? (p.poe_w > 0 ? `<span class="badge ok">${p.poe_w.toFixed(1)} W</span>` : '<span class="badge">prêt</span>') : '<span class="badge">coupé</span>'}</td>` : ''}
      <td>${p.stp ? `<span class="badge ${p.stp_state === 'forwarding' ? 'ok' : ''}">${p.stp_state}</span>` : '<span class="badge">désactivé</span>'}</td>
      <td>${r ? fmtBps(r.rx[i]) + ' / ' + fmtBps(r.tx[i]) : '…'}</td>
      <td>${fmtBytes(p.rx_bytes)} / ${fmtBytes(p.tx_bytes)}</td><td>${p.macs || ''}</td></tr>`).join('');
  $$('#t-ports tr.click').forEach(e => e.onclick = () => openPort(+e.dataset.p));
}
function inList(list, v) {
  if (!list) return true;
  return list.split(',').some(x => { const [a, b] = x.split('-').map(Number); return b ? v >= a && v <= b : v === a; });
}
let vlanEdit = [];
function renderVlans() {
  if (!CFG) return;
  if (!vlanEdit.length) vlanEdit = CFG.vlans.map(v => ({ ...v }));
  $('#t-vlans').innerHTML = '<tr><th>ID</th><th>Nom</th><th>Ports non étiquetés</th><th>Ports étiquetés</th><th></th></tr>' +
    vlanEdit.map((v, i) => {
      const u = ST.ports.filter(p => p.pvid === v.id).map(p => p.port);
      const t = ST.ports.filter(p => p.vlan_mode === 'trunk' && p.pvid !== v.id && inList(p.vlans, v.id)).map(p => p.port);
      return `<tr><td>${v.id}</td><td>${esc(v.name)}</td><td>${u.join(', ') || '–'}</td><td>${t.length === N - u.length && t.length > 8 ? 'tous les trunks' : t.join(', ') || '–'}</td>
      <td>${v.id === 1 ? '' : `<button class="btn" data-del="${i}">Supprimer</button>`}</td></tr>`;
    }).join('');
  $$('#t-vlans [data-del]').forEach(b => b.onclick = () => { vlanEdit.splice(+b.dataset.del, 1); renderVlans(); });
  $('#t-vmatrix').innerHTML = '<tr><th>VLAN</th>' + ST.ports.map(p => `<th>${p.port}</th>`).join('') + '</tr>' +
    vlanEdit.map(v => `<tr><td><b>${v.id}</b> ${esc(v.name)}</td>` + ST.ports.map(p =>
      `<td>${p.pvid === v.id ? 'U' : p.vlan_mode === 'trunk' && inList(p.vlans, v.id) ? 'T' : '–'}</td>`).join('') + '</tr>').join('');
}
function renderPoe() {
  const s = ST.system;
  if (!POE) { $('#t-poe').innerHTML = '<tr><td>Ce modèle ne gère pas le PoE.</td></tr>'; return; }
  $('#p-tot').textContent = s.poe_total.toFixed(1) + ' W';
  $('#p-volt').textContent = s.poe_volt != null ? s.poe_volt + ' V' : '–';
  $('#p-temp').textContent = s.poe_temp != null ? s.poe_temp.toFixed(1) + ' °C' : '–';
  $('#p-n').textContent = ST.ports.filter(p => p.poe_w > 0).length;
  $('#t-poe').innerHTML = '<tr><th>Port</th><th>Nom</th><th>PoE</th><th>Norme</th><th>Priorité</th><th>Consommation</th><th></th></tr>' +
    ST.ports.map(p => `<tr><td>${p.port}</td><td>${esc(p.name)}</td>
      <td>${p.poe_on ? '<span class="badge ok">activé</span>' : '<span class="badge bad">coupé</span>'}</td><td>802.3${p.poe_type}</td><td>${p.poe_prio}</td>
      <td>${p.poe_w > 0 ? '<b>' + p.poe_w.toFixed(1) + ' W</b>' : '–'}</td>
      <td><button class="btn" data-tog="${p.port}">${p.poe_on ? 'Couper' : 'Activer'}</button>
          <button class="btn" data-rst="${p.port}" ${p.poe_on ? '' : 'disabled'}>Redémarrer</button></td></tr>`).join('');
  $$('#t-poe [data-tog]').forEach(b => b.onclick = async () => {
    const p = ST.ports[b.dataset.tog - 1];
    if (p.poe_on && p.poe_w > 0 && !confirm(`Couper l'alimentation de l'appareil du port ${p.port} ?`)) return;
    await savePort(p, { poe: p.poe_on ? 0 : 1 });
  });
  $$('#t-poe [data-rst]').forEach(b => b.onclick = () => poeReset(+b.dataset.rst));
  renderPoeChart();
}
const PALETTE = ['#e0a800', '#3b82f6', '#1f9d55', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#64748b'];
function renderPoeChart() {
  const sel = $('#pg-port');
  if (!sel.options.length) {
    sel.innerHTML = '<option value="tot">Total du switch</option><option value="each">Une courbe par appareil</option>' +
      ST.ports.map(p => `<option value="${p.port}">Port ${p.port} – ${esc(p.name)}</option>`).join('');
  }
  const h = $('#pg-range').value === '60' ? H60 : H10, v = sel.value, W = x => x.toFixed(1) + ' W';
  let ser;
  if (v === 'tot') ser = [{ label: 'Total (W)', color: PALETTE[0], fill: true, data: h.map(r => [r[0], poeTot(r)]) }];
  else if (v === 'each') {
    ser = ST.ports.map((p, i) => ({ p, i })).filter(({ i }) => h.some(r => poeCol(r, i) > 0))
      .map(({ p, i }, k) => ({ label: `${p.port} ${p.name}`, color: PALETTE[k % PALETTE.length], data: h.map(r => [r[0], poeCol(r, i)]) }));
    if (!ser.length) ser = [{ label: 'Aucun appareil alimenté', color: PALETTE[9], data: h.map(r => [r[0], 0]) }];
  } else {
    const i = +v - 1;
    ser = [{ label: `Port ${v} (W)`, color: PALETTE[1], fill: true, data: h.map(r => [r[0], poeCol(r, i)]) }];
  }
  chart($('#c-poe'), ser, W, { min: 2 });
  // statistiques de la période affichée
  const vals = ser.flatMap(s => s.data.map(d => d[1])), sum = ser.length === 1 ? ser[0].data.map(d => d[1]) : h.map(r => poeTot(r));
  if (sum.length) {
    const avg = sum.reduce((a, b) => a + b, 0) / sum.length, hours = (h.at(-1)[0] - h[0][0]) / 3600;
    $('#pg-info').textContent = `Sur la période : moyenne ${W(avg)} · maximum ${W(Math.max(...vals))} · énergie ≈ ${(avg * hours).toFixed(avg * hours < 10 ? 2 : 1)} Wh`;
  }
}
function renderGraphs() {
  const sel = $('#g-port');
  if (!sel.options.length) {
    sel.innerHTML = '<option value="0">Tous les ports</option>' + ST.ports.map(p => `<option value="${p.port}">Port ${p.port} – ${esc(p.name)}</option>`).join('');
  }
  const p = +sel.value, h = $('#g-range').value === '60' ? H60 : H10;
  const rs = rates(h);
  const pick = (x, k) => p ? x[k][p - 1] : x[k].reduce((a, b) => a + b);
  chart($('#c-port'), [
    { label: 'Entrant', color: '#1f9d55', fill: true, data: rs.map(x => [x.t, pick(x, 'rx')]) },
    { label: 'Sortant', color: '#3b82f6', fill: true, data: rs.map(x => [x.t, pick(x, 'tx')]) }], fmtBps);
  const ser = [{ label: 'Charge CPU ×10', color: '#8b5cf6', data: H60.map(r => [r[0], loadCol(r) * 10]) }];
  if (POE) ser.unshift({ label: 'Température PoE (°C)', color: '#ef4444', data: H60.map(r => [r[0], tempCol(r)]) });
  chart($('#c-sys'), ser, v => v.toFixed(0), { min: 10 });
}
function renderMac() {
  const f = $('#m-filter').value.trim().toLowerCase();
  const name = p => ST.ports[p - 1]?.name || '';
  const cl = m => clients.find(c => c.mac.toUpperCase() === m.mac.toUpperCase()) || {};
  const rows = macs.filter(m => !f || `${m.mac} ${m.port} ${m.vlan} ${name(m.port)} ${cl(m).ip || ''} ${cl(m).name || ''}`.toLowerCase().includes(f));
  $('#t-mac').innerHTML = `<tr><th>Adresse MAC</th><th>Adresse IP</th><th>Nom de l'appareil</th><th>VLAN</th><th>Port</th><th>Nom du port</th><th>Type</th></tr>` +
    rows.map(m => `<tr><td><code>${m.mac}</code></td><td>${esc(cl(m).ip || '')}</td><td>${esc(cl(m).name || '')}</td><td>${m.vlan}</td><td>${m.port}</td><td>${esc(name(m.port))}</td><td>${m.static === true || m.static === 'true' ? 'statique' : 'dynamique'}</td></tr>`).join('') +
    `<tr><td colspan=7 class="hint">${rows.length} adresse(s)</td></tr>`;
}
function renderDiagSelects() {
  if ($('#d-port').options.length) return;
  const opts = ST.ports.map(p => `<option value="${p.port}">Port ${p.port} – ${esc(p.name)}</option>`).join('');
  $('#d-port').innerHTML = opts;
  $('#mi-dest').innerHTML = '<option value="0">Désactivé</option>' + opts;
}
function renderSystem() {
  const s = ST.system;
  $('#t-info').innerHTML = [
    ['Modèle', s.model], ['Adresse MAC', s.mac], ['Noyau', s.kernel], ['En service depuis', fmtDur(s.uptime)],
    ['Adresse IP actuelle', `${s.ip} / ${s.mask}`], ['Passerelle', s.gw], ['DNS', s.dns], ['VLAN d\'administration', s.vlan],
    ['Charge', s.load], ['Mémoire', `${Math.round(s.mem_avail / 1024)} Mo libres sur ${Math.round(s.mem_total / 1024)} Mo`],
    ['Ports', `${N} (21 à 24 : combo RJ45/SFP 1 Gb/s)`],
    ['Températures', s.temp_board != null ? `carte ${s.temp_board.toFixed(1)} °C · puce ${s.temp_asic.toFixed(1)} °C · PoE ${s.poe_temp ?? '–'} °C` : '–'],
    ['Ventilateur', s.fan_pct != null ? s.fan_pct + ' %' : '–']
  ].map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('');
  renderVersions();
}
function fillSystemForm() {
  const c = CFG.system;
  $('#s-host').value = c.HOSTNAME || ''; $('#s-mode').value = c.IP_MODE || 'dhcp';
  $('#s-ip').value = c.IP_ADDR || ST.system.ip; $('#s-mask').value = c.IP_MASK || ST.system.mask;
  $('#s-gw').value = c.IP_GW || ST.system.gw; $('#s-dns').value = c.IP_DNS || ST.system.dns; $('#s-vlan').value = c.MGMT_VLAN || 1;
  const sp = $('#s-stp'); sp.innerHTML = Array.from({ length: 16 }, (_, i) => `<option value="${i * 4096}">${i * 4096}${i * 4096 === 32768 ? ' (défaut)' : ''}</option>`).join('');
  sp.value = c.STP_PRIO || 61440; $('#s-lldp').checked = c.LLDP === '1'; $('#s-igmp').checked = c.IGMP === '1';
  $('#mi-dest').value = c.MIRROR_DEST || 0; $('#mi-in').value = c.MIRROR_IN || ''; $('#mi-out').value = c.MIRROR_OUT || '';
  toggleStatic();
}
function toggleStatic() { const st = $('#s-mode').value === 'static'; ['#s-ip', '#s-mask', '#s-gw', '#s-dns'].forEach(i => $(i).disabled = !st); }

// ---------- configuration d'un port ----------
let curPort = null;
function openPort(n) {
  const p = ST.ports[n - 1]; curPort = p;
  const f = $('#f-port');
  $('#dlg-title').textContent = `Port ${p.port}${isCombo(p) ? (hasSfp(p) ? ' (SFP)' : ' (RJ45, port combo)') : ''}`;
  f.name.value = p.name; f.enabled.checked = !!p.enabled;
  f.speedsel.value = p.mode === 'forced' && p.speed ? p.speed : 'aneg';
  f.vlan_mode.value = p.vlan_mode; f.pvid.value = p.pvid; f.vlans.value = p.vlans;
  f.poe.checked = !!p.poe_on; f.stp.checked = !!p.stp; f.edge.value = p.edge; f.isolated.checked = !!p.isolated; f.storm.checked = !!p.storm;
  $$('.poe-only').forEach(e => e.classList.toggle('hidden', !POE));
  $$('.trunk-only').forEach(e => e.classList.toggle('hidden', f.vlan_mode.value !== 'trunk'));
  $('#dlg-info').innerHTML = `Lien : ${p.link ? speedTxt(p) + (p.fdx ? ' full-duplex' : ' half-duplex') : 'aucun'} · Support : ${esc(mediaTxt(p))}${hasSfp(p) ? ' — ' + esc(p.sfp) : ''} · ` +
    `Reçu ${fmtBytes(p.rx_bytes)} (${p.rx_pkts} paquets) · Envoyé ${fmtBytes(p.tx_bytes)} (${p.tx_pkts} paquets) · ${p.macs} adresse(s) MAC` +
    (POE && p.poe_w > 0 ? ` · PoE ${p.poe_w.toFixed(1)} W` : '');
  $('#dlg').showModal();
  renderDlgChart();
  renderDevices(p.port);
  loadClients().then(() => renderDevices(p.port));
}
async function loadClients() { try { clients = (await get('clients')).clients; } catch (e) { } }
function agoTxt(s) { return s < 60 ? `il y a ${s} s` : s < 3600 ? `il y a ${Math.round(s / 60)} min` : `il y a ${Math.round(s / 3600)} h`; }
function renderDevices(port) {
  const list = clients.filter(c => c.port === port);
  const known = new Set(list.map(c => c.mac.toUpperCase()));
  // adresses MAC apprises sur le port mais pas encore vues avec une IP
  const unicast = mac => !(parseInt(mac.slice(0, 2), 16) & 1);   // exclut multicast et broadcast
  macs.filter(m => +m.port === port && unicast(m.mac) && !known.has(m.mac.toUpperCase())).forEach(m => list.push({ mac: m.mac, ip: '', name: '', ago: null, vlan: m.vlan }));
  $('#t-dev').innerHTML = list.length ? '<tr><th>Adresse IP</th><th>Nom</th><th>Adresse MAC</th><th>Vu</th></tr>' + list.map(c =>
    `<tr><td>${c.ip ? `<a href="http://${esc(c.ip)}/" target="_blank" rel="noopener">${esc(c.ip)}</a>` : '<span class="hint">inconnue</span>'}</td>
     <td>${esc(c.name) || '–'}</td><td><code>${esc(c.mac)}</code></td><td>${c.ago != null ? agoTxt(c.ago) : '–'}</td></tr>`).join('')
    : '<tr><td class="hint">Aucun appareil détecté sur ce port</td></tr>';
}
async function renderDlgChart() {
  const p = curPort; if (!p) return;
  if ($('#dlg-range').value === '60' && H60.length < 2) H60 = parseHist(await get('hist', '&r=60'));
  const h = $('#dlg-range').value === '60' ? H60 : H10, i = p.port - 1, rs = rates(h);
  chart($('#c-dlg'), [
    { label: 'Entrant', color: '#1f9d55', fill: true, data: rs.map(x => [x.t, x.rx[i]]) },
    { label: 'Sortant', color: '#3b82f6', fill: true, data: rs.map(x => [x.t, x.tx[i]]) }], fmtBps);
  const showPoe = POE && h.some(r => poeCol(r, i) > 0);
  $('#c-dlg-poe').classList.toggle('hidden', !showPoe);
  if (showPoe) chart($('#c-dlg-poe'), [{ label: 'PoE (W)', color: '#e0a800', fill: true, data: h.map(r => [r[0], poeCol(r, i)]) }], v => v.toFixed(1) + ' W', { min: 1 });
}
$('#dlg-range').onchange = renderDlgChart;
$('#f-port').vlan_mode.onchange = e => $$('.trunk-only').forEach(x => x.classList.toggle('hidden', e.target.value !== 'trunk'));
async function savePort(p, over = {}) {
  const d = {
    port: p.port, name: p.name, enabled: p.enabled, mode: p.mode, speed: p.speed, vlan_mode: p.vlan_mode, pvid: p.pvid,
    vlans: p.vlans, poe: p.poe_on, stp: p.stp, edge: p.edge, isolated: p.isolated, storm: p.storm, ...over
  };
  try { await post('set_port', d); toast(`Port ${p.port} appliqué`); await refresh(); }
  catch (e) { toast(e.message, true); }
}
$('#dlg-save').onclick = async () => {
  const f = $('#f-port'), p = curPort, sp = f.speedsel.value;
  if (p.link && !f.enabled.checked && !confirm(`Le port ${p.port} a un lien actif. Le désactiver ?`)) return;
  if (p.port === uplinkPort() && (!f.enabled.checked || f.vlan_mode.value === 'access' && +f.pvid.value !== +ST.system.vlan)) {
    if (!confirm('Ce port semble être celui par lequel vous accédez au switch. La modification peut couper l\'accès. Continuer ?')) return;
  }
  $('#dlg').close();
  await savePort(p, {
    name: f.name.value, enabled: f.enabled.checked ? 1 : 0, mode: sp === 'aneg' ? 'aneg' : 'forced', speed: sp === 'aneg' ? '' : sp,
    vlan_mode: f.vlan_mode.value, pvid: f.pvid.value, vlans: f.vlans.value.replace(/\s/g, ''), poe: f.poe.checked ? 1 : 0,
    stp: f.stp.checked ? 1 : 0, edge: f.edge.value, isolated: f.isolated.checked ? 1 : 0, storm: f.storm.checked ? 1 : 0
  });
};
async function poeReset(n) {
  if (!confirm(`Couper puis rétablir l'alimentation du port ${n} ?`)) return;
  try { await post('poe_reset', { port: n }); toast(`PoE du port ${n} redémarré`); } catch (e) { toast(e.message, true); }
}
$('#dlg-poe-reset').onclick = () => poeReset(curPort.port);
// port montant probable : celui qui voit le plus d'adresses MAC (le reste du réseau)
function uplinkPort() {
  const best = ST.ports.reduce((a, p) => p.macs > (a?.macs || 0) ? p : a, null);
  return best && best.macs >= 3 ? best.port : null;
}

// ---------- actions ----------
$('#b-rst').onclick = async () => { if (!confirm('Remettre à zéro les compteurs de tous les ports ?')) return; await post('reset_counters'); H10 = []; toast('Compteurs remis à zéro'); refresh(); };
$('#v-add').onclick = () => {
  const id = +$('#v-id').value, name = $('#v-name').value.trim();
  if (!(id >= 1 && id <= 4094)) return toast('ID de VLAN invalide (1 à 4094)', true);
  if (vlanEdit.some(v => v.id === id)) return toast('Ce VLAN existe déjà', true);
  vlanEdit.push({ id, name: name || 'VLAN ' + id }); vlanEdit.sort((a, b) => a.id - b.id); $('#v-id').value = $('#v-name').value = ''; renderVlans();
};
$('#v-save').onclick = async () => {
  try { await post('set_vlans', { list: vlanEdit.map(v => `${v.id}:${v.name}`).join(';') }); toast('VLAN enregistrés'); CFG = await get('config'); vlanEdit = []; renderVlans(); }
  catch (e) { toast(e.message, true); }
};
$('#m-filter').oninput = renderMac;
$('#m-flush').onclick = async () => { if (!confirm('Vider la table des adresses MAC ?')) return; await post('flush_mac'); toast('Table MAC vidée'); loadMac(); };
$('#d-run').onclick = async () => {
  const p = +$('#d-port').value;
  if (ST.ports[p - 1].link && !confirm(`Le lien du port ${p} sera coupé pendant le test. Continuer ?`)) return;
  try { await post('veriphy', { port: p }); toast('Test en cours…'); setTimeout(() => showVeriphy(p), 6000); } catch (e) { toast(e.message, true); }
};
async function showVeriphy(p) {
  const j = await get('veriphy_status'); const r = j.result.find(x => x.port === p);
  if (!r) return;
  const st = s => { const t = s.split(':')[1]; return t === 'ok' ? '<span class="badge ok">correcte</span>' : `<span class="badge bad">${esc(t)}</span>`; };
  $('#t-veriphy').innerHTML = '<tr><th>Paire</th><th>État</th><th>Longueur / distance du défaut</th></tr>' +
    [0, 1, 2, 3].map(i => `<tr><td>${['A (1-2)', 'B (3-6)', 'C (4-5)', 'D (7-8)'][i]}</td><td>${st(r['st' + i])}</td><td>${r['len' + i]} m</td></tr>`).join('');
}
async function saveSystem(extra = {}) {
  const d = {
    HOSTNAME: $('#s-host').value, IP_MODE: $('#s-mode').value, IP_ADDR: $('#s-ip').value, IP_MASK: $('#s-mask').value, IP_GW: $('#s-gw').value,
    IP_DNS: $('#s-dns').value, MGMT_VLAN: $('#s-vlan').value, STP_PRIO: $('#s-stp').value, LLDP: $('#s-lldp').checked ? 1 : 0, IGMP: $('#s-igmp').checked ? 1 : 0,
    MIRROR_DEST: $('#mi-dest').value, MIRROR_IN: $('#mi-in').value.replace(/\s/g, ''), MIRROR_OUT: $('#mi-out').value.replace(/\s/g, ''), ...extra
  };
  if (d.IP_MODE === 'static' && d.IP_ADDR !== ST.system.ip && !confirm(`L'adresse va passer à ${d.IP_ADDR}. Vous devrez ouvrir http://${d.IP_ADDR}/ ensuite. Continuer ?`)) return;
  try { await post('set_system', d); toast('Configuration appliquée'); CFG = await get('config'); refresh(); } catch (e) { toast(e.message, true); }
}
$('#s-mode').onchange = toggleStatic;
$('#s-save').onclick = () => saveSystem();
$('#mi-save').onclick = () => saveSystem();
$('#a-save').onclick = async () => {
  const pw = $('#a-pw').value;
  if (pw.length < 6) return toast('6 caractères minimum', true);
  if (pw !== $('#a-pw2').value) return toast('Les mots de passe ne correspondent pas', true);
  try { await post('set_password', { user: $('#a-user').value, password: pw }); toast('Mot de passe changé : reconnectez-vous'); $('#a-pw').value = $('#a-pw2').value = ''; }
  catch (e) { toast(e.message, true); }
};
$('#r-file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  if (!confirm('Remplacer toute la configuration par ce fichier ?')) return;
  try { await post('restore', { data: await f.text() }); toast('Configuration restaurée'); CFG = await get('config'); refresh(); } catch (er) { toast(er.message, true); }
  e.target.value = '';
};
$('#b-reboot').onclick = async () => {
  if (!confirm('Redémarrer le switch ? Le réseau sera coupé environ 3 minutes.')) return;
  await post('reboot'); toast('Redémarrage en cours…'); $('#h-dot').className = 'dot bad';
};
// ---------- ventilation ----------
const FAN_PRESETS = [
  { id: 'silent', name: 'Silencieux', desc: '30 % jusqu\'à 50 °C, 70 % max à 72 °C', v: { FAN_MODE: 'auto', FAN_MIN: 30, FAN_MAX: 70, FAN_T_LOW: 50, FAN_T_HIGH: 72 } },
  { id: 'balanced', name: 'Équilibré (recommandé)', desc: '30 % jusqu\'à 45 °C, 100 % à 70 °C', v: { FAN_MODE: 'auto', FAN_MIN: 30, FAN_MAX: 100, FAN_T_LOW: 45, FAN_T_HIGH: 70 } },
  { id: 'perf', name: 'Performance', desc: '40 % jusqu\'à 38 °C, 100 % à 60 °C', v: { FAN_MODE: 'auto', FAN_MIN: 40, FAN_MAX: 100, FAN_T_LOW: 38, FAN_T_HIGH: 60 } },
  { id: 'full', name: 'Plein régime', desc: '100 % en permanence', v: { FAN_MODE: 'manual', FAN_MANUAL: 100 } }
];
const fanForm = () => ({ FAN_MODE: $('#f-mode').value, FAN_MANUAL: +$('#f-manual').value, FAN_MIN: +$('#f-min').value, FAN_MAX: +$('#f-max').value, FAN_T_LOW: +$('#f-low').value, FAN_T_HIGH: +$('#f-high').value });
function setFanForm(c) {
  $('#f-mode').value = c.FAN_MODE || 'auto'; $('#f-manual').value = c.FAN_MANUAL || 60; $('#f-min').value = c.FAN_MIN || 30;
  $('#f-max').value = c.FAN_MAX || 100; $('#f-low').value = c.FAN_T_LOW || 45; $('#f-high').value = c.FAN_T_HIGH || 70;
  toggleFan();
}
function toggleFan() {
  const m = $('#f-mode').value === 'manual';
  $$('.f-man').forEach(e => e.classList.toggle('hidden', !m)); $$('.f-auto').forEach(e => e.classList.toggle('hidden', m));
}
function fanPct(c, t) {        // même calcul que sbin/sui-fan
  if (t >= 75) return 100;
  let p = c.FAN_MODE === 'manual' ? c.FAN_MANUAL : t <= c.FAN_T_LOW ? c.FAN_MIN : t >= c.FAN_T_HIGH ? c.FAN_MAX :
    c.FAN_MIN + (c.FAN_MAX - c.FAN_MIN) * (t - c.FAN_T_LOW) / (c.FAN_T_HIGH - c.FAN_T_LOW);
  return Math.min(100, Math.max(30, p));
}
function drawCurve(cv, c, tNow) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth; if (!cv._h) cv._h = cv.height;
  const h = cv._h; cv.width = W * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement), mut = css.getPropertyValue('--mut').trim(), line = css.getPropertyValue('--line').trim();
  const L = 42, R = 12, T = 10, B = 26, t0 = 20, t1 = 80;
  const X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = p => T + (1 - p / 100) * (h - T - B);
  g.font = '11px system-ui'; g.fillStyle = mut; g.strokeStyle = line; g.lineWidth = 1;
  for (let p = 0; p <= 100; p += 25) { g.beginPath(); g.moveTo(L, Y(p)); g.lineTo(W - R, Y(p)); g.stroke(); g.fillText(p + ' %', 4, Y(p) + 4); }
  for (let t = t0; t <= t1; t += 10) g.fillText(t + ' °C', X(t) - 12, h - 8);
  g.fillStyle = '#ef444422'; g.fillRect(X(75), T, X(t1) - X(75), h - T - B);
  g.fillStyle = '#ef4444'; g.fillText('sécurité', X(75) + 3, T + 12);
  g.beginPath(); g.strokeStyle = '#1f6feb'; g.lineWidth = 2.5;
  for (let t = t0; t <= t1; t += 0.5) { const y = Y(fanPct(c, t)); t === t0 ? g.moveTo(X(t), y) : g.lineTo(X(t), y); }
  g.stroke();
  if (tNow != null) {
    const p = fanPct(c, tNow);
    g.beginPath(); g.fillStyle = '#e0a800'; g.arc(X(Math.min(Math.max(tNow, t0), t1)), Y(p), 6, 0, 7); g.fill();
    // étiquette au-dessus du point, ou en dessous s'il est trop près du haut
    const lbl = `${tNow.toFixed(1)} °C → ${Math.round(p)} %`, lw = g.measureText(lbl).width;
    const ly = Y(p) - 10 < T + 12 ? Y(p) + 20 : Y(p) - 10;
    g.fillStyle = mut; g.fillText(lbl, Math.min(X(tNow) + 9, W - R - lw), ly);
  }
}
const tRef = s => Math.max(s.temp_board ?? -99, s.temp_asic ?? -99, s.poe_temp ?? -99);
function renderFan() {
  const s = ST.system, saved = CFG?.system || {};
  $('#fa-pct').textContent = s.fan_pct != null ? s.fan_pct + ' %' : '–';
  $('#fa-mode').textContent = saved.FAN_MODE === 'manual' ? 'vitesse fixe' : 'automatique';
  $('#fa-board').textContent = s.temp_board != null ? s.temp_board.toFixed(1) + ' °C' : '–';
  $('#fa-asic').textContent = s.temp_asic != null ? s.temp_asic.toFixed(1) + ' °C' : '–';
  $('#fa-poe').textContent = s.poe_temp != null ? s.poe_temp.toFixed(1) + ' °C' : '–';
  $('#fa-ref').textContent = tRef(s) > -99 ? tRef(s).toFixed(1) + ' °C' : '–';
  if (!$('#fa-presets').children.length) {
    $('#fa-presets').innerHTML = FAN_PRESETS.map(p => `<button class="preset" data-p="${p.id}"><b>${p.name}</b><small>${p.desc}</small></button>`).join('');
    $$('#fa-presets .preset').forEach(b => b.onclick = () => {
      const p = FAN_PRESETS.find(x => x.id === b.dataset.p);
      setFanForm({ ...fanForm(), ...p.v }); fanChanged();
    });
    if (CFG) setFanForm(CFG.system);
  }
  const cur = fanForm();
  $$('#fa-presets .preset').forEach(b => {
    const v = FAN_PRESETS.find(x => x.id === b.dataset.p).v;
    b.classList.toggle('on', Object.keys(v).every(k => String(v[k]) === String(cur[k])));
  });
  drawCurve($('#c-curve'), cur, tRef(s) > -99 ? tRef(s) : null);
  const h = ($('#fa-range').value === '60' ? H60 : H10).filter(r => r.length > xb() + 2);
  chart($('#c-fan-t'), [
    { label: 'Carte (°C)', color: '#1f9d55', data: h.map(r => [r[0], boardCol(r)]) },
    { label: 'Puce (°C)', color: '#3b82f6', data: h.map(r => [r[0], asicCol(r)]) },
    ...(POE ? [{ label: 'PoE (°C)', color: '#ef4444', data: h.map(r => [r[0], tempCol(r)]) }] : [])], v => v.toFixed(0) + ' °C', { min: 50 });
  chart($('#c-fan-p'), [{ label: 'Ventilateur (%)', color: '#8b5cf6', fill: true, data: h.map(r => [r[0], fanCol(r)]) }], v => v.toFixed(0) + ' %', { min: 90 });
}
function fanChanged() {
  toggleFan();
  const c = fanForm(), s = CFG?.system || {};
  const dirty = Object.keys(c).some(k => String(c[k]) !== String(s[k] ?? ''));
  $('#f-dirty').textContent = dirty ? 'Modifications non appliquées' : '';
  if (ST) renderFan();
}
['#f-mode', '#f-manual', '#f-min', '#f-max', '#f-low', '#f-high'].forEach(i => $(i).oninput = fanChanged);
$('#fa-range').onchange = async () => { if ($('#fa-range').value === '60') H60 = parseHist(await get('hist', '&r=60')); renderFan(); };
$('#f-save').onclick = async () => {
  const c = fanForm();
  if (c.FAN_MODE === 'auto') {
    if (c.FAN_T_LOW >= c.FAN_T_HIGH) return toast('Le début de la montée doit être inférieur à la température du maximum', true);
    if (c.FAN_MIN > c.FAN_MAX) return toast('La vitesse minimale doit être inférieure ou égale à la maximale', true);
  }
  try {
    await post('set_system', c); CFG = await get('config'); setFanForm(CFG.system); fanChanged();
    toast('Ventilation appliquée');
  } catch (e) { toast(e.message, true); }
};

// ---------- mise à jour ----------
function renderVersions() {
  const s = ST.system;
  $('#t-ver').innerHTML = `<tr><td>Version de l'interface</td><td>${esc(s.ui_version || 'non renseignée')}</td></tr>` +
    `<tr><td>Noyau</td><td>${esc(s.kernel)}</td></tr>`;
  $('#u-rollback').classList.toggle('hidden', !s.has_prev);
}
async function updPost(a, body) {
  const r = await fetch(`cgi-bin/update?a=${a}`, { method: 'POST', body, headers: body ? { 'Content-Type': 'application/octet-stream' } : {} });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'erreur');
  return j;
}
$('#u-file').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  toast(`Envoi et vérification de ${f.name}…`);
  try {
    const j = await updPost('upload', await f.arrayBuffer());
    $('#t-upd').innerHTML = [
      ['Paquet', `${esc(j.name)} — version ${esc(j.version)}`], ['Description', esc(j.description)],
      ['Fichiers installés', j.files.length ? j.files.map(esc).join('<br>') : 'aucun'],
      ['Nouveau noyau', j.kernel ? '<span class="badge bad">oui — écrit dans la puce (environ 1 minute), puis redémarrage. NE PAS COUPER L\'ALIMENTATION pendant l\'installation : un noyau incomplet empêche le démarrage (récupération au programmateur)</span>' : 'non'],
      ['Script d\'installation', j.script ? 'oui' : 'non'], ['Redémarrage', j.reboot || j.kernel ? 'oui (environ 3 minutes de coupure)' : 'non']
    ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('#u-info').classList.remove('hidden'); toast('Paquet vérifié');
  } catch (er) { toast(er.message, true); }
};
$('#u-cancel').onclick = async () => { await updPost('cancel').catch(() => { }); $('#u-info').classList.add('hidden'); };
$('#u-apply').onclick = async () => {
  if (!confirm('Installer cette mise à jour ?')) return;
  try {
    const j = await updPost('apply');
    $('#u-info').classList.add('hidden');
    toast(j.reboot ? 'Mise à jour installée — redémarrage du switch…' : 'Mise à jour installée');
    setTimeout(() => location.reload(), j.reboot ? 200000 : 20000);
  } catch (er) { toast(er.message, true); }
};
$('#u-rollback').onclick = async () => {
  if (!confirm('Revenir à la version précédente de l\'interface ? Votre configuration est conservée.')) return;
  try { await updPost('rollback'); toast('Version précédente restaurée'); setTimeout(() => location.reload(), 20000); } catch (er) { toast(er.message, true); }
};

$('#l-ref').onclick = loadLog;
async function loadLog() { const j = await get('log'); $('#log').textContent = j.log; $('#log').scrollTop = 1e9; }
async function loadMac() { const j = await get('mac'); macs = j.macs; await loadClients(); renderMac(); }

// ---------- onglets et rafraîchissement ----------
let tab = 'dash';
$$('#tabs button').forEach(b => b.onclick = () => {
  tab = b.dataset.tab;
  $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('.tab').forEach(s => s.classList.toggle('on', s.id === tab));
  try { localStorage.setItem('sui-tab', tab); } catch (e) { }
  if (tab === 'mac') loadMac();
  if (tab === 'diag') loadLog();
  if (tab === 'system' && CFG) fillSystemForm();
  render();
});
$('#g-port').onchange = renderGraphs; $('#g-range').onchange = renderGraphs;
$('#pg-port').onchange = renderPoeChart; $('#pg-range').onchange = renderPoeChart;
window.onresize = () => render();

function render() {
  if (!ST) return;
  renderHeader();
  ({ dash: renderDash, ports: renderPorts, vlans: renderVlans, poe: renderPoe, graphs: renderGraphs, fan: renderFan, mac: renderMac, diag: renderDiagSelects, system: renderSystem })[tab]();
}
async function refresh() {
  try {
    ST = await get('status'); N = ST.ports.length; POE = !!ST.system.poe;
    H10 = parseHist(await get('hist', '&r=10'));
    if (!H60.length || tab === 'graphs' || tab === 'poe' || tab === 'fan') H60 = parseHist(await get('hist', '&r=60'));
    render();
    if ($('#dlg').open) renderDlgChart();
  } catch (e) { $('#h-dot').className = 'dot bad'; $('#h-ip').textContent = 'hors ligne'; }
}
(async () => {
  try { const t = localStorage.getItem('sui-tab'); if (t) $(`#tabs [data-tab="${t}"]`)?.click(); } catch (e) { }
  CFG = await get('config').catch(() => null);
  await refresh(); renderDiagSelects(); if (CFG) fillSystemForm();
  macs = (await get('mac').catch(() => ({ macs: [] }))).macs; loadClients();
  setInterval(refresh, 10000);
})();
