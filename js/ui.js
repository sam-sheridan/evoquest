/* Interface: status bar, controls, season and event bars, inspector tabs and chart, notifications, info
   popovers, event log and achievements menu. */

/* ---------- UI ---------- */
// the event bar pulses and briefly names what just happened; details go to the event log
function eventAlert(kick) {
  if (!S) return;
  S.hl = S.hl || {};
  S.hl.event = { until: performance.now() + 7000, text: kick };
  const el = $('#mEvent');
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  if (!$('#logPop').hidden) renderLog();
}
const ICON_PLAY =
    '<svg viewBox="0 0 12 12" width="11" height="11"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg>',
  ICON_PAUSE =
    '<svg viewBox="0 0 12 12" width="11" height="11"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/></svg>';
function syncMeters() {
  if (!S) return;
  const sp = clamp((S.t - S.seasonStart) / (S.nextSeason - S.seasonStart), 0, 1),
    ep = clamp((S.t - S.evStart) / (S.nextEvent - S.evStart), 0, 1);
  const se = SEASONS[S.season];
  document.documentElement.style.setProperty('--season', se.col);
  const now = performance.now(),
    he = S.hl && S.hl.event && S.hl.event.until > now;
  $('#mSeason i').style.width = sp * 100 + '%';
  $('#mSeason span').textContent = se.name;
  $('#mEvent i').style.width = ep * 100 + '%';
  $('#mEvent span').textContent = he ? S.hl.event.text : 'World event';
  $('#mEvent').classList.toggle('hot', !!he);
  const om = $('#omen'),
    show = S.nextEvent - S.t <= EVENTS.warn && S.nextKind && !S.over;
  om.hidden = !show;
  const key = S.nextKind + (S.nextMajor ? '!' : '');
  if (show && om.dataset.k !== key) {
    om.dataset.k = key;
    om.innerHTML =
      OMEN[S.nextKind] + (S.nextMajor ? '<b style="font-family:var(--mono);margin-left:2px">!</b>' : '');
    om.style.color = S.nextMajor ? '#D55E00' : '#151918';
    om.title = (S.nextMajor ? 'A major ' : '') + OMEN_T[S.nextKind].replace(/^An? /, S.nextMajor ? '' : '$&');
  }
}
// small symbols that appear in the event bar shortly before an event
const OMEN = {
  flood:
    '<svg viewBox="0 0 20 14" width="20" height="14"><path d="M1 5q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0M1 10q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  drought:
    '<svg viewBox="0 0 20 14" width="20" height="14"><circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 0v2M10 12v2M3 7h2M15 7h2M5 2l1.4 1.4M13.6 10.6 15 12M5 12l1.4-1.4M13.6 3.4 15 2" stroke="currentColor" stroke-width="1.4"/></svg>',
  quake:
    '<svg viewBox="0 0 20 14" width="20" height="14"><path d="M1 8 5 4l3 6 3-8 3 7 2-3h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  meteor:
    '<svg viewBox="0 0 20 14" width="20" height="14"><circle cx="14" cy="9" r="3.2" fill="currentColor"/><path d="M2 2l9 5M5 1l7 5M1 5l9 4" stroke="currentColor" stroke-width="1.2"/></svg>',
};
const OMEN_T = {
  flood: 'A flood is coming',
  drought: 'A drought is coming',
  quake: 'An earthquake is coming',
  meteor: 'A meteor is coming',
};
function toast(m, k) {
  const box = $('#toast'),
    el = document.createElement('div');
  el.className = 'note';
  el.innerHTML = (k ? `<b>${esc(k)}</b>` : '') + esc(m);
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 9000);
}
let tab = 'pop',
  metric = 'n';
const METRICS = [
  ['n', 'Population'],
  ['spd', 'Speed'],
  ['hab', 'Habitat'],
  ['thick', 'Narrowest'],
  ['round', 'Roundness'],
  ['taper', 'Taper'],
];
$('#metrics').innerHTML = METRICS.map(([k, l]) => `<button data-m="${k}">${l}</button>`).join('');
$('#cmode').onclick = e => {
  const b = e.target.closest('[data-cm]');
  if (b && S) {
    S.colorMode = b.dataset.cm;
    syncUI(true);
  }
};
$('#metrics').onclick = e => {
  const b = e.target.closest('[data-m]');
  if (b) {
    metric = b.dataset.m;
    syncUI(true);
  }
};
function selectTab(t) {
  tab = t;
  document
    .querySelectorAll('.tabs [data-tab]')
    .forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  for (const k of ['pop', 'one', 'world']) $('#p-' + k).hidden = k !== t;
  syncUI(true);
}
document.querySelectorAll('.tabs [data-tab]').forEach(
  b =>
    (b.onclick = () => {
      selectTab(b.dataset.tab);
      openSheet(true);
    })
);
const ARR_UP =
    '<svg viewBox="0 0 12 8" width="12" height="8"><path d="M1 7l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  ARR_DN =
    '<svg viewBox="0 0 12 8" width="12" height="8"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
function openSheet(o) {
  $('#sheet').classList.toggle('closed', !o);
  $('#grab').innerHTML = o ? ARR_DN : ARR_UP;
  $('#grab').setAttribute('aria-label', o ? 'Collapse inspector' : 'Expand inspector');
}
$('#grab').onclick = () => openSheet($('#sheet').classList.contains('closed'));
$('#bPause').onclick = () => {
  if (!S || S.over) return;
  S.paused = !S.paused;
  syncUI(true);
};
$('#bSpeed').onclick = () => {
  if (!S) return;
  const L = [1, 2, 4];
  S.speed = L[(L.indexOf(S.speed) + 1) % L.length];
  syncUI(true);
};
$('#bNew').onclick = () => {
  $('#setPop').hidden = true;
  $('#bSet').classList.remove('on');
  if (S && !S.over) S.paused = true;
  openCreator(S ? S.seed : null, null, true);
  syncUI(true);
};
$('#bSet').onclick = e => {
  e.stopPropagation();
  const p = $('#setPop');
  p.hidden = !p.hidden;
  for (const [x, y] of [
    ['#badgePop', '#bBadge'],
    ['#logPop', '#bLog'],
  ]) {
    $(x).hidden = true;
    $(y).classList.remove('on');
  }
  syncSettings();
  for (const b of document.querySelectorAll('.testev button')) b.disabled = !S || S.over || !!S.replay;
  $('#bSet').classList.toggle('on', !p.hidden);
};
// testing: fire a world event straight away (it replaces nothing: the scheduled event still comes on time)
$('#sMajor').onclick = e => {
  const b = e.currentTarget;
  b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
};
for (const b of document.querySelectorAll('.testev button'))
  b.onclick = () => {
    if (!S || S.over || S.replay) return;
    worldEvent(b.dataset.ev, $('#sMajor').getAttribute('aria-pressed') === 'true', true);
    syncUI(true);
  };
document.addEventListener('click', e => {
  const p = $('#setPop');
  if (!p.hidden && !p.contains(e.target) && !$('#bSet').contains(e.target)) {
    p.hidden = true;
    $('#bSet').classList.remove('on');
  }
});
const liveSp = () => S.species.filter(s => !s.died).sort((a, b) => b.n - a.n);
function drawChart() {
  const c = $('#chart'),
    r = c.getBoundingClientRect();
  if (!r.width) return;
  c.width = r.width * dpr;
  c.height = r.height * dpr;
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = r.width,
    h = r.height,
    HS = S.hist,
    pad = { l: 34, r: 8, t: 10, b: 18 };
  g.clearRect(0, 0, w, h);
  const mul = metric === 'hab' ? 100 : 1;
  const series = S.species
    .map(sp => ({ sp, pts: HS.filter(e => e.sp[sp.id]).map(e => [e.t, e.sp[sp.id][metric] * mul]) }))
    .filter(s => s.pts.length);
  const tot = metric === 'n' ? HS.map(e => [e.t, e.total]) : null;
  const o = metric === 'n' ? START : S.orig[metric] * mul;
  let vals = [o];
  series.forEach(s => s.pts.forEach(p => vals.push(p[1])));
  if (tot) tot.forEach(p => vals.push(p[1]));
  const small = metric === 'round';
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  if (hi - lo < 1e-6) {
    hi += small ? 0.1 : 1;
    lo -= small ? 0.1 : 1;
  }
  const sp = hi - lo;
  lo -= sp * 0.08;
  hi += sp * 0.08;
  lo = Math.max(0, lo);
  const T = Math.max(10, S.t),
    X = t => pad.l + ((w - pad.l - pad.r) * t) / T,
    Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  g.font = '10px "IBM Plex Mono", monospace';
  g.fillStyle = '#636d69';
  g.strokeStyle = '#d2d8d4';
  g.lineWidth = 1;
  const dec = metric === 'n' || metric === 'hab' ? 0 : small ? 2 : 1;
  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * k) / 3;
    g.beginPath();
    g.moveTo(pad.l, Y(v));
    g.lineTo(w - pad.r, Y(v));
    g.stroke();
    g.fillText(v.toFixed(dec) + (metric === 'hab' ? '%' : ''), 2, Y(v) + 3);
  }
  g.fillText('0:00', pad.l, h - 4);
  const lab = fmtT(S.t);
  g.fillText(lab, w - pad.r - g.measureText(lab).width, h - 4);
  g.setLineDash([3, 3]);
  g.strokeStyle = '#636d69';
  g.beginPath();
  g.moveTo(pad.l, Y(o));
  g.lineTo(w - pad.r, Y(o));
  g.stroke();
  g.setLineDash([]);
  const line = (pts, c2, lw) => {
    if (pts.length < 2) return;
    g.strokeStyle = c2;
    g.lineWidth = lw;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
    g.stroke();
  };
  if (tot && series.length > 1) line(tot, INK, 1);
  for (const s of series) {
    line(s.pts, s.sp.tag, 1.8);
    if (!s.sp.died) {
      const e = s.pts.at(-1);
      g.fillStyle = s.sp.tag;
      g.fillRect(X(e[0]) - 3, Y(e[1]) - 3, 6, 6);
    }
  }
}
function cell(v, o, d = 1, suf = '') {
  const x = v - o,
    thr = suf === '%' ? 0.05 : d === 2 ? 0.04 : 0.15,
    cls = Math.abs(x) < thr ? '' : x > 0 ? 'up' : 'down';
  return `<td class="${cls}">${suf === '%' ? Math.round(v * 100) + '%' : v.toFixed(d) + suf}</td>`;
}
// rank the traits that separate two groups, biggest difference first (scaled so traits are comparable)
const DIFF = [
  ['hab', 'Habitat', 0.12, v => Math.round(v * 100) + '% water'],
  ['spd', 'Speed', 1.2, v => v.toFixed(1)],
  ['w', 'Width', 1.2, v => v.toFixed(1)],
  ['h', 'Length', 1.2, v => v.toFixed(1)],
  ['thick', 'Narrowest side', 2.5, v => v.toFixed(1) + ' px'],
  ['river', 'Crosses rivers', 0.25, v => Math.round(v * 100) + '%'],
  ['dhue', 'Colour', 20, v => (v >= 0 ? '+' : '') + Math.round(v) + '°'],
  ['round', 'Roundness', 0.2, v => v.toFixed(2)],
  ['taper', 'Taper', 0.2, v => v.toFixed(2)],
];
function diffs(a, b, n = 4) {
  return DIFF.map(([k, l, s, f]) => ({ l, k, va: a[k], vb: b[k], f, sc: Math.abs(a[k] - b[k]) / s }))
    .filter(d => d.sc >= 0.6)
    .sort((x, y) => y.sc - x.sc)
    .slice(0, n);
}
function renderBadges() {
  const all = BADGES,
    mine = S ? S.badges : [],
    got = all.filter(b => mine.includes(b.id)).length;
  $('#badgePop').innerHTML =
    `<div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Achievements this run</b><span class="lbl">${got} / ${all.length}</span></div><div class="badges">${all.map(b => `<div class="badge ${mine.includes(b.id) ? 'got' : ''}"><b>${b.name}</b>${b.d}</div>`).join('')}</div>`;
  $('#bBadge').querySelector('small').textContent = got;
}
$('#bBadge').onclick = e => {
  e.stopPropagation();
  const p = $('#badgePop');
  p.hidden = !p.hidden;
  $('#logPop').hidden = true;
  $('#bLog').classList.remove('on');
  $('#setPop').hidden = true;
  $('#bSet').classList.remove('on');
  if (!p.hidden) renderBadges();
  $('#bBadge').classList.toggle('on', !p.hidden);
};
document.addEventListener('click', e => {
  const p = $('#badgePop');
  if (!p.hidden && !p.contains(e.target) && e.target !== $('#bBadge')) {
    p.hidden = true;
    $('#bBadge').classList.remove('on');
  }
});
const INFO = {
  season:
    () => `<b>Seasons</b><p class="hint" style="margin:4px 0 8px">Each season lasts ${SEASON_LEN / 60} minutes and changes where food regrows quickly and which world events are likely.</p>
  <table><thead><tr><th>Season</th><th>Food</th><th>Likely events</th></tr></thead><tbody>${SEASONS.map((s, k) => `<tr${k === S?.season ? ' style="background:var(--chip)"' : ''}><td><span class="tag" style="background:${s.col}"></span>${s.name}</td><td style="font-family:var(--sans);text-align:left">${{ 0: 'Meadows and plains fast', 1: 'Plains dry out; meadows and islands thrive', 2: 'Thickets and islands fruit', 3: 'Slow everywhere, including water' }[k]}</td><td style="font-family:var(--sans);text-align:left">${{ 0: 'Floods', 1: 'Droughts', 2: 'Earthquakes', 3: 'Floods' }[k]}</td></tr>`).join('')}</tbody></table>`,
  event:
    () => `<b>World events</b><p class="hint" style="margin:4px 0 8px">The bar fills until the next event. Near the end a symbol warns you what is coming. In orange with a “!”, it will be a major event.</p>
  <div class="legend">${['flood', 'drought', 'quake', 'meteor'].map(k => `<span style="display:flex">${OMEN[k]}</span><span><b>${{ flood: 'Flood', drought: 'Drought', quake: 'Earthquake', meteor: 'Meteor' }[k]}.</b> ${{ flood: 'The sea rises and low land is lost.', drought: 'The sea falls; new land appears, islands may join, and rivers and sea channels can dry up.', quake: 'The land splits, usually with a new river, sometimes with a channel of sea.', meteor: 'A strike kills creatures nearby and leaves a crater. About 1 in 20 events.' }[k]}</span>`).join('')}</div>
  <p class="hint" style="margin:6px 0 0">About 1 in 10 events is major: floods and droughts move the sea further, earthquakes open two rivers, and meteors hit a wider area.</p>`,
};
function openInfo(which, btn) {
  const p = $('#infoPop');
  if (!p.hidden && p.dataset.w === which) {
    p.hidden = true;
    return;
  }
  p.dataset.w = which;
  p.innerHTML = INFO[which]();
  p.hidden = false;
  const r = $('#meters').getBoundingClientRect();
  p.style.top = r.bottom + 6 + 'px';
  p.style.right = innerWidth - r.right + 'px';
}
document.querySelectorAll('.info').forEach(
  b =>
    (b.onclick = e => {
      e.stopPropagation();
      openInfo(b.dataset.info, b);
    })
);
function renderLog() {
  $('#logPop').innerHTML =
    `<b>Event log</b><ul class="log">${S ? S.log.map(l => `<li><time>${fmtT(l.t)}</time><span>${esc(l.m)}</span></li>`).join('') : ''}</ul>`;
}
$('#bLog').onclick = e => {
  e.stopPropagation();
  const p = $('#logPop');
  p.hidden = !p.hidden;
  $('#badgePop').hidden = true;
  $('#bBadge').classList.remove('on');
  $('#setPop').hidden = true;
  $('#bSet').classList.remove('on');
  if (!p.hidden) renderLog();
  $('#bLog').classList.toggle('on', !p.hidden);
};
document.addEventListener('click', e => {
  for (const [id, btn] of [
    ['#logPop', '#bLog'],
    ['#infoPop', null],
  ]) {
    const p = $(id);
    if (!p.hidden && !p.contains(e.target) && (!btn || !$(btn).contains(e.target))) {
      p.hidden = true;
      if (btn) $(btn).classList.remove('on');
    }
  }
});
function syncUI() {
  if (!S) return;
  const n = S.creatures.length,
    ls = S.species.filter(s => !s.died).length;
  $('#spName').innerHTML =
    `${esc(S.design.name)} <span class="latin" style="font-weight:400;color:var(--muted)">${esc(S.genus)}</span>`;
  $('#spDot').style.background = col(S.design);
  $('#spSub').textContent =
    `${n} alive · ${ls} species · gen ${S.maxGen} · ${fmtT(S.t)}${S.over ? ' · extinct' : S.paused ? ' · paused' : ''}`;
  {
    const pl = S.paused && !S.over;
    $('#bPause').innerHTML = pl ? ICON_PLAY : ICON_PAUSE;
    $('#bPause').setAttribute('aria-label', pl ? 'Play' : 'Pause');
    $('#bPause').title = pl ? 'Play' : 'Pause';
    $('#bPause').classList.toggle('on', pl);
  }
  $('#bSpeed').textContent = S.speed + '×';
  $('#bSound').innerHTML = sound ? SPK_ON : SPK_OFF;
  $('#bSound').setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
  $('#bSound').title = sound ? 'Sound on' : 'Sound off';
  updScale();
  if ($('#sheet').classList.contains('closed') || $('#sheet').hidden) return;
  if (tab === 'pop') {
    document
      .querySelectorAll('#metrics button')
      .forEach(b => b.classList.toggle('on', b.dataset.m === metric));
    drawChart();
    document
      .querySelectorAll('#cmode button')
      .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cm === S.colorMode)));
    const L = liveSp().slice(0, 3),
      by = bySpecies(),
      o = S.orig,
      ms = L.map(s => summ(by[s.id] || []));
    $('#thead').innerHTML =
      `<tr><th>Trait</th><th>Released</th>${L.map(s => `<th><span class="tag" style="background:${s.tag}"></span>${s.epithet}</th>`).join('')}</tr>`;
    const cols = 2 + L.length;
    const R1 = [
      ['Width', 'w'],
      ['Length', 'h'],
      ['Narrowest side', 'thick', 1, ' px'],
      ['Speed', 'spd'],
      ['Habitat (water)', 'hab', 0, '%'],
      ['Crosses rivers', 'river', 0, '%'],
    ];
    const R2 = [
      ['Roundness', 'round', 2],
      ['Taper', 'taper', 2],
    ];
    const row = ([l, k, d = 1, suf = '']) =>
      `<tr><td>${l}</td><td>${suf === '%' ? Math.round(o[k] * 100) + '%' : o[k].toFixed(d) + suf}</td>${ms.map(m => cell(m[k], o[k], d, suf)).join('')}</tr>`;
    $('#ttab').innerHTML =
      `<tr class="grp"><td colspan="${cols}">Body · shaped by the world</td></tr>${R1.map(row).join('')}
      <tr class="grp"><td colspan="${cols}">Look · drifts by chance</td></tr>${R2.map(row).join('')}
      <tr><td>Colour</td><td><span class="tag" style="width:22px;height:12px;vertical-align:-1px;background:${col(S.design)}"></span></td>${ms.map(m => `<td><span class="tag" style="width:22px;height:12px;vertical-align:-1px;background:hsl(${m.hue} ${S.design.sat}% ${m.lt}%)"></span></td>`).join('')}</tr>`;
  } else if (tab === 'one') {
    const c = S.sel;
    if (!c) {
      $('#p-one').innerHTML = '<p class="hint">Tap any creature on the map to inspect and follow it.</p>';
      return;
    }
    const sp = S.species[c.sp];
    $('#p-one').innerHTML =
      `<div class="row" style="justify-content:space-between;margin-bottom:10px"><div><span class="lbl">Specimen ${c.id}</span><h3 class="latin" style="font-size:17px;font-weight:500">${esc(S.genus)} ${sp.epithet}</h3></div>
      <button class="btn" id="fol">${S.follow ? 'Stop following' : 'Follow'}</button></div>
      ${c.dead ? `<p class="hint">Died of ${c.dead} at ${fmtT(c.diedAt)}, aged ${Math.round(c.age)} s.</p>` : ''}
      <div class="kv">
        <div><span>Generation</span><b>${c.gen}</b></div><div><span>Parent</span><b>${c.parent ? '#' + c.parent : 'Founder'}</b></div>
        <div><span>Offspring</span><b>${c.births}</b></div><div><span>Meals</span><b>${c.eaten}</b></div>
        <div><span>Energy</span><b>${c.dead ? 0 : Math.round(c.E)} / ${Math.round(c.cap)}</b><div class="meter"><i style="width:${c.dead ? 0 : Math.max(0, (c.E / c.cap) * 100)}%"></i></div></div>
        <div><span>Burning</span><b>${c.dead ? '–' : c.burnNow.toFixed(2) + ' /s'}</b></div>
        <div><span>Age</span><b>${Math.round(c.age)} / ${LIFE} s</b><div class="meter"><i style="width:${Math.min(100, (c.age / LIFE) * 100)}%;background:var(--muted)"></i></div></div>
        <div><span>Width × length</span><b>${c.w.toFixed(1)} × ${c.h.toFixed(1)}</b></div>
        <div><span>Narrowest side</span><b>${c.thick.toFixed(1)} px</b></div><div><span>Thicket gaps</span><b>${
          [10, 13, 16]
            .filter(g => c.thick <= g)
            .map(g => g + 'px')
            .join(' ') || 'none'
        }</b></div>
        <div><span>Speed</span><b>${c.spd.toFixed(1)} · land ${Math.round(c.vL)} · water ${Math.round(c.vW)} px/s</b></div>
        <div><span>Habitat</span><b>${habTxt(c.hab)}</b></div><div><span>Range</span><b>${rangeTxt(c)}</b></div>
        <div><span>Look</span><b>${Math.round(c.legs)} legs · round ${c.round.toFixed(2)} · taper ${c.taper.toFixed(2)}</b></div>
      </div>`;
    $('#fol').onclick = () => {
      S.follow = !S.follow;
      syncUI(true);
    };
  } else {
    const sw = (f, s, ex = '') =>
      `<svg width="22" height="14"><rect x=".5" y=".5" width="21" height="13" fill="${f}" stroke="${s}"/>${ex}</svg>`;
    $('#p-world').innerHTML =
      `<div class="kv"><div><span>World</span><b>#${S.seed}</b></div><div><span>Season</span><b>${SEASONS[S.season].name} · ${Math.max(0, Math.round(S.nextSeason - S.t))} s left</b></div>
      <div><span>Land cover</span><b>${world.stats.land}%</b></div><div><span>Sea cover</span><b>${world.stats.sea}%</b></div>
      <div><span>Next event</span><b>${S.over ? '–' : '~' + Math.max(0, Math.round(S.nextEvent - S.t)) + ' s'}</b></div>
<div><span>Landmasses</span><b>${world.stats.lands}</b></div>
      <div><span>Craters</span><b>${world.stats.craters}</b></div>
      <div><span>Thicket cover</span><b>${world.stats.thicket}% of land</b></div><div><span>Rock cover</span><b>${world.stats.rock}% of land</b></div></div>
      <div class="legend">
       ${sw('#dfe5cf', '#151918', '<ellipse cx="13.6" cy="4.3" rx="2.2" ry="1.1" transform="rotate(-40 13.6 4.3)" fill="#5f7d4e"/><circle cx="11" cy="7.5" r="3.2" fill="#D55E00" stroke="currentColor" stroke-width=".7"/>')}<span><b>Meadow and plain.</b> Berries; eaten ones regrow from a small ring. Meadows (darker) fruit heavily in spring, plains sparsely.</span>
       ${sw('#d3dfc0', '#5f7d4e', '<g fill="#5f7d4e"><circle cx="5" cy="4" r=".9"/><circle cx="10" cy="9" r=".9"/><circle cx="15" cy="5" r=".9"/><circle cx="7" cy="10" r=".9"/><circle cx="17" cy="10" r=".9"/></g>')}<span><b>Thicket.</b> Rich in autumn. Denser dots mean a narrower gap: 10, 13 or 16 px.</span>
       ${sw('#d2e0e5', '#151918', '<g fill="none" stroke="#009E73" stroke-width="1.2" stroke-linecap="round"><path d="M11 12q-2-3-3.5-7"/><path d="M11 12q0-3 0-8"/><path d="M11 12q2-3 3.5-7"/></g>')}<span><b>Shallows and rivers.</b> Algae grows here all year, for creatures that will go into the water.</span>
       ${sw('#d2e0e5', '#4d7385', '<path d="M8 4l4 3-4 3" stroke="#4d7385" fill="none"/>')}<span><b>River.</b> Strong current. Needs ${RIVER} px/s of swimming to cross.</span>
       ${sw('#b9cfd7', '#151918')}<span><b>Open sea.</b> Only creatures that lean towards water venture far from shore.</span>
       ${sw('#ddd8ce', '#151918', '<ellipse cx="11" cy="7" rx="6" ry="3.5" fill="#c6bfb1" stroke="#7d776b"/><ellipse cx="11" cy="7" rx="2.5" ry="1.4" fill="#b9b1a2" stroke="#7d776b"/>')}<span><b>Rock.</b> Impassable.</span>
      </div>

`;
  }
}
function rangeTxt(c) {
  if (c.hab <= 0.0) return 'Never enters water';
  if (c.hab < 0.5) return `Swims up to ${Math.round(c.dW)} px from shore`;
  if (c.hab >= 1) return 'Never leaves water';
  if (c.hab > 0.5) return `Walks up to ${Math.round(c.dL)} px from water`;
  return 'Equally at home in both';
}
