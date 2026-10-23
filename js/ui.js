/* Interface: status bar, controls, season and event bars, inspector tabs and chart, notifications, info
   popovers, event log and achievements menu. */

/* ---------- UI ---------- */
// the world event sign flashes with the coming event's symbol for its last EVENTS.warn seconds, then stays bright
// orange for EVENTS.show seconds once it happens; details go to the event log
function eventAlert(kind) {
  if (!S) return;
  S.hl = S.hl || {};
  S.hl.event = { until: performance.now() + EVENTS.show * 1000, kind };
  syncEvent();
  if (!$('#logPop').hidden) renderLog();
}
// the sign: a rounded warning triangle with "!", or with the event's symbol around the time of an event
function syncEvent() {
  const el = $('#evSq'),
    hit = S.hl && S.hl.event && S.hl.event.until > performance.now(),
    warn = !hit && !S.over && S.nextKind && S.nextEvent - S.t <= EVENTS.warn,
    key = hit ? S.hl.event.kind : warn ? S.nextKind : '!';
  el.classList.toggle('hot', !!hit);
  el.classList.toggle('warn', !!warn);
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  const sym =
    key === '!'
      ? '<g class="sym" fill="currentColor"><rect x="14.75" y="10.2" width="1.5" height="8" rx=".75"/><circle cx="15.5" cy="21.4" r="1.15"/></g>'
      : `<g class="sym" transform="translate(9.2 13.8) scale(0.63)">${OMEN[key].replace(/<\/?svg[^>]*>/g, '')}</g>`;
  el.innerHTML = `<svg width="31" height="29" viewBox="0 0 31 29"><path class="tri" d="M14.22 5.26Q15.5 3 16.78 5.26L27.22 23.74Q28.5 26 25.90 26.00L5.10 26.00Q2.5 26 3.78 23.74Z" stroke-width="1.6" stroke-linejoin="round"/>${sym}</svg>`;
}
const ICON_PLAY =
    '<svg viewBox="0 0 12 12" width="14" height="14" style="transform:translateX(1px)"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg>',
  ICON_PAUSE =
    '<svg viewBox="0 0 12 12" width="14" height="14"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/></svg>';
// season symbols for the clock: flower, sun, leaf, snowflake (drawn in a 16-unit box centred on 0)
const SEASON_ICON = [
  '<g fill="none" stroke="currentColor" stroke-width="1.3"><circle r="1.6"/>' +
    [0, 72, 144, 216, 288]
      .map(a => `<ellipse cx="0" cy="-3.6" rx="1.7" ry="2.3" transform="rotate(${a})"/>`)
      .join('') +
    '</g>',
  '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle r="2.6"/>' +
    [0, 45, 90, 135, 180, 225, 270, 315]
      .map(a => `<line x1="0" y1="-4.3" x2="0" y2="-6" transform="rotate(${a})"/>`)
      .join('') +
    '</g>',
  '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M-4 4 C-4 -2 0 -5 5 -5 C5 0 2 4 -4 4 Z"/><path d="M-4 4 L2 -2"/></g>',
  '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">' +
    [0, 60, 120]
      .map(
        a =>
          `<g transform="rotate(${a})"><line x1="0" y1="-5.5" x2="0" y2="5.5"/><path d="M-1.6 -4.3 L0 -2.9 L1.6 -4.3 M-1.6 4.3 L0 2.9 L1.6 4.3"/></g>`
      )
      .join('') +
    '</g>',
];
// the whole world's temperature this season (0 cold to 1 warm): the season's shift and the world type's offset
// around a mild middle; high ground is always colder than this and lowland warmer
const worldTemp = () => 0.5 + world.tOff + TEMP.season[S.season],
  tempWord = v => (v < 0.3 ? 'cold' : v < 0.45 ? 'cool' : v < 0.58 ? 'mild' : v < 0.72 ? 'warm' : 'hot');
// the clock: a pie in four quarters (the current one stronger) with a hand that goes round once a year
function syncClock(sp) {
  const el = $('#hud'),
    k = S.season,
    a = ((k + sp) / 4) * TAU,
    R = 15;
  el.hidden = false;
  let pie = '';
  for (let q = 0; q < 4; q++) {
    const a0 = (q / 4) * TAU - Math.PI / 2,
      a1 = ((q + 1) / 4) * TAU - Math.PI / 2;
    pie += `<path d="M0 0L${R * Math.cos(a0)} ${R * Math.sin(a0)}A${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)}Z" fill="${SEASONS[q].col}" fill-opacity="${q === k ? 1 : 0.35}" stroke="${INK}" stroke-width=".8"/>`;
  }
  pie += `<line x1="0" y1="0" x2="${(R + 1) * Math.sin(a)}" y2="${-(R + 1) * Math.cos(a)}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
  $('#clkPie').innerHTML = pie;
  const v = worldTemp(),
    f = clamp((v - 0.2) / 0.6, 0, 1),
    c = v < 0.45 ? '#56B4E9' : v < 0.58 ? '#c9c27a' : '#E69F00',
    key = k + '|' + v;
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  $('#clkSeason').innerHTML =
    `<svg width="16" height="16" viewBox="-8 -8 16 16">${SEASON_ICON[k]}</svg>${SEASONS[k].name}`;
  $('#clkTemp').innerHTML =
    `<svg width="14" height="26" viewBox="0 0 14 26"><rect x="4" y="2" width="6" height="16" rx="3" fill="var(--panel)" stroke="${INK}"/><rect x="6" y="${4 + 12 * (1 - f)}" width="2" height="${12 * f + 4}" fill="${c}"/><circle cx="7" cy="20.5" r="4.5" fill="${c}" stroke="${INK}"/></svg>`;
  $('#clkTemp').title = `World temperature this season: ${tempWord(v)}`;
}
function syncMeters() {
  if (!S) return;
  syncClock(clamp((S.t - S.seasonStart) / (S.nextSeason - S.seasonStart), 0, 1));
  syncEvent();
}
// a symbol for each world event, shown in the world event sign while it happens
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
let tab = 'sp',
  metric = 'n';
// what the Stats chart can show: [key, label, decimals, unit]; shares (river) are shown as %
const METRICS = [
  ['n', 'Population', 0, ''],
  ['vL', 'Land speed', 0, ' px/s'],
  ['vW', 'Water speed', 0, ' px/s'],
  ['dWc', 'Swims from shore', 0, ' px'],
  ['dLc', 'Walks from water', 0, ' px'],
  ['burnW', 'Energy use', 1, '/s'],
  ['cap', 'Energy store', 0, ''],
  ['dTc', 'Into thickets', 0, ' px'],
  ['river', 'Crosses rivers', 0, '%'],
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
  for (const k of ['sp', 'stats', 'one', 'world']) $('#p-' + k).hidden = k !== t;
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
// fast forward works like a battery holding up to FAST.dur real seconds at FAST.speed: it drains while on (and
// switches itself off when empty) and refills while off, from empty to full in FAST.cool real seconds. It can be
// switched on whenever at least a second is stored, and is off while a testing speed above 1× is set.
const fast = { on: false, charge: FAST.dur, last: performance.now() };
function tickFast() {
  const now = performance.now(),
    dt = (now - fast.last) / 1000;
  fast.last = now;
  if (fast.on) {
    fast.charge -= dt;
    if (fast.charge <= 0) [fast.charge, fast.on] = [0, false];
  } else fast.charge = Math.min(FAST.dur, fast.charge + (dt * FAST.dur) / FAST.cool);
}
const fastOn = () => (tickFast(), fast.on);
$('#bFast').onclick = () => {
  tickFast();
  if (fast.on) fast.on = false;
  else if (S && !S.over && S.speed === 1 && fast.charge >= 1) fast.on = true;
  syncUI(true);
};
document.querySelectorAll('#sSpeed button').forEach(
  b =>
    (b.onclick = () => {
      if (!S) return;
      S.speed = +b.dataset.spd;
      if (S.speed > 1) fast.on = false;
      syncUI(true);
    })
);
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
    // the land may have changed, so the coming event is chosen again (its timing stays the same)
    S.nextKind = null;
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
// the chart shows at most CHART_SPAN seconds; chartEnd is the time at its right edge, or null to follow the present
let chartEnd = null;
$('#chartPos').oninput = e => {
  const v = +e.target.value;
  chartEnd = v >= 1000 ? null : CHART_SPAN + ((S.t - CHART_SPAN) * v) / 1000;
  drawChart();
};
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
    pad = { l: 34, r: 8, t: 10, b: 18 },
    now = Math.max(10, S.t),
    span = Math.min(CHART_SPAN, now);
  if (chartEnd !== null && (chartEnd >= S.t || S.t <= CHART_SPAN)) chartEnd = null;
  const t1 = chartEnd === null ? now : Math.max(span, chartEnd),
    t0 = t1 - span,
    seen = t => t >= t0 && t <= t1,
    slider = $('#chartPos');
  slider.hidden = S.t <= CHART_SPAN;
  if (!slider.hidden) {
    const v = chartEnd === null ? 1 : (t1 - CHART_SPAN) / (S.t - CHART_SPAN);
    slider.value = v * 1000;
    slider.style.setProperty('--p', `calc(${v * 100}% - ${v * 12 - 6}px)`); // the track fills up to the thumb
  }
  g.clearRect(0, 0, w, h);
  const [, , dec, unit] = METRICS.find(m => m[0] === metric),
    pct = unit === '%',
    mul = pct ? 100 : 1;
  const series = S.species
    .map(sp => ({ sp, pts: HS.filter(e => e.sp[sp.id]).map(e => [e.t, e.sp[sp.id][metric] * mul]) }))
    .filter(s => s.pts.length);
  const tot = metric === 'n' ? HS.map(e => [e.t, e.total]) : null;
  const o = metric === 'n' ? START : S.orig[metric] * mul;
  let vals = [o];
  series.forEach(s => s.pts.forEach(p => seen(p[0]) && vals.push(p[1])));
  if (tot) tot.forEach(p => seen(p[0]) && vals.push(p[1]));
  const small = dec === 2;
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
  if (pct) hi = Math.min(hi, 100); // a share never goes over 100%
  const X = t => pad.l + ((w - pad.l - pad.r) * (t - t0)) / span,
    Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  g.font = '10px "IBM Plex Mono", monospace';
  g.fillStyle = '#636d69';
  g.strokeStyle = '#d2d8d4';
  g.lineWidth = 1;
  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * k) / 3;
    g.beginPath();
    g.moveTo(pad.l, Y(v));
    g.lineTo(w - pad.r, Y(v));
    g.stroke();
    g.fillText(v.toFixed(dec) + (pct ? '%' : ''), 2, Y(v) + 3);
  }
  g.fillText(fmtT(t0), pad.l, h - 4);
  const lab = fmtT(t1);
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
  g.save();
  g.beginPath();
  g.rect(pad.l, 0, w - pad.l, h);
  g.clip();
  if (tot && series.length > 1) line(tot, INK, 1);
  for (const s of series) {
    line(s.pts, s.sp.tag, 1.8);
    if (!s.sp.died && seen(s.pts.at(-1)[0])) {
      const e = s.pts.at(-1);
      g.fillStyle = s.sp.tag;
      g.fillRect(X(e[0]) - 3, Y(e[1]) - 3, 6, 6);
    }
  }
  g.restore();
}

// the Species table: the released design and every species, each as its average creature, with the traits that
// most set each species apart from the one it split from highlighted. grey: grey out extinct species (not at the
// end of a run, when every species has died)
const SP_ROWS = [
  // [label, how to show it, trait compared for highlighting, how much difference counts as notable]
  ['Size', (m, c) => m.size.toFixed(2), 'size', 0.06],
  ['Leg length (px)', (m, c) => legLen(c).toFixed(1), 'leg', 0.12],
  ['Leg number', (m, c) => m.legs.toFixed(1), 'legs', 0.6],
  ['Tail length (px)', (m, c) => (c.tail > 0 ? tailLen(c).toFixed(1) : 'None'), 'hab', 0.12],
  ['Mouth', (m, c) => mouthTxt(m.mth), 'mth', 0.12],
  ['Roundness', (m, c) => roundTxt(m.round), 'round', 0.2],
];
// a species' average traits: now if it is alive, otherwise as last recorded
function spAvg(sp) {
  const M = S.creatures.filter(c => c.sp === sp.id);
  if (M.length) return summ(M);
  const e = [...S.hist].reverse().find(e => e.sp[sp.id]);
  return e ? e.sp[sp.id] : null;
}
// a creature built from average traits, for drawing and for leg and tail length
function avgCreature(m) {
  const c = { ...m, hue: m.hue, sat: S.design.sat, id: 0, dir: -Math.PI / 2, walk: 0.6, rest: 0 };
  enforce(c);
  compute(c);
  return c;
}
let picQueue = [];
function speciesTable(grey) {
  const cols = [{ name: 'Released', m: S.orig, key: 'r' }];
  for (const sp of S.species) {
    const m = spAvg(sp);
    if (!m) continue;
    cols.push({ sp, m, key: sp.id, ext: grey && !!sp.died, parent: sp.parent === null ? 'r' : sp.parent });
  }
  for (const k of cols) k.c = avgCreature(k.m);
  const byKey = new Map(cols.map(k => [k.key, k]));
  // the one or two traits that differ most from the parent, if they differ notably
  for (const k of cols) {
    const p = byKey.get(k.parent);
    k.hl = p
      ? SP_ROWS.map(([, , t, sc], i) => [i, Math.abs(k.m[t] - p.m[t]) / sc])
          .filter(d => d[1] >= 1)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(d => d[0])
      : [];
  }
  // one drawing scale for every picture, so sizes compare fairly, and every body centred at the same height:
  // room above for the longest head and mouth, below for the longest tail
  const up = Math.max(...cols.map(k => k.c.bh / 2 + 7)),
    down = Math.max(...cols.map(k => k.c.bh / 2 + tailLen(k.c) + 3)),
    sc = Math.min(2.6, 68 / (up + down)),
    // the pictures are only as wide as the widest creature with its legs, so they sit right above the values
    wide = Math.max(...cols.map(k => k.c.bw + 2 * (legLen(k.c) + 1.5))) * sc + 4;
  picQueue = cols.map(k => [k.c, sc, up * sc, (up + down) * sc, wide]);
  const ext = k => (k.ext ? ' class="ext"' : '');
  return `<table class="sp"><thead><tr><th></th>${cols
    .map(k =>
      k.sp
        ? `<th${ext(k)}><span class="tag" style="background:${k.sp.tag}"></span><span class="latin">${k.sp.epithet}${k.ext ? ' †' : ''}</span></th>`
        : `<th>Released</th>`
    )
    .join('')}</tr></thead><tbody><tr class="pic"><td></td>${cols
    .map(
      (k, i) =>
        `<td${ext(k)}><canvas data-pic="${i}" aria-label="Average ${k.sp ? k.sp.epithet : 'released design'}"></canvas></td>`
    )
    .join('')}</tr>${SP_ROWS.map(
    ([l, f], i) =>
      `<tr><td>${l}</td>${cols
        .map(k => `<td class="${k.ext ? 'ext ' : ''}${k.hl.includes(i) ? 'hl' : ''}">${f(k.m, k.c)}</td>`)
        .join('')}</tr>`
  ).join('')}</tbody></table>`;
}
// draw the average creatures into the table's picture row
function drawPics(root) {
  for (const cv of root.querySelectorAll('canvas[data-pic]')) {
    const [c, sc, y, h, w] = picQueue[+cv.dataset.pic],
      s = Math.ceil(w);
    cv.width = s * dpr;
    cv.height = Math.ceil(h) * dpr;
    cv.style.width = s + 'px';
    cv.style.height = Math.ceil(h) + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the head points up and the tail down, the body at the same height in every column
    drawCreature(g, c, s / 2, y, sc, 7, col(c), 0, false, 1.1 / sc);
  }
}
// rank the traits that separate two groups, biggest difference first (scaled so traits are comparable)
const DIFF = [
  ['hab', 'Tail', 0.12, v => Math.round(v * 100) + '%'],
  ['mth', 'Mouth', 0.12, v => `${mouthTxt(v)} (${Math.round(v * 100)}% straw)`],
  ['leg', 'Legs', 0.12, v => Math.round(v * 100) + '%'],
  ['size', 'Size', 0.12, v => v.toFixed(2)],
  ['dTc', 'Reach into thickets', 25, v => Math.round(v) + ' px'],
  ['river', 'Crosses rivers', 0.25, v => Math.round(v * 100) + '%'],
  ['dhue', 'Colour', 20, v => (v >= 0 ? '+' : '') + Math.round(v) + '°'],
  ['round', 'Roundness', 0.2, v => v.toFixed(2)],
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
    () => `<b>Seasons</b><p class="hint" style="margin:4px 0 8px">Each season lasts ${SEASON_LEN / 60} minutes and changes where food regrows quickly and which world events are likely. The clock's hand goes round once a year. The thermometer shows how cold or warm the whole world is this season; high ground is always colder than that, and lowland warmer.</p>
  <table><thead><tr><th>Season</th><th>Food</th><th>Likely events</th></tr></thead><tbody>${SEASONS.map((s, k) => `<tr${k === S?.season ? ' style="background:var(--chip)"' : ''}><td><span class="tag" style="background:${s.col}"></span>${s.name}</td><td style="font-family:var(--sans);text-align:left">${{ 0: 'Meadows and plains fast', 1: 'Plains dry out; meadows and islands thrive', 2: 'Thickets and islands fruit', 3: 'Slow everywhere, including water' }[k]}</td><td style="font-family:var(--sans);text-align:left">${{ 0: 'Floods', 1: 'Droughts', 2: 'Earthquakes', 3: 'Floods' }[k]}</td></tr>`).join('')}</tbody></table>`,
  event:
    () => `<b>World events</b><p class="hint" style="margin:4px 0 8px">One comes every ${EVENTS.gap[0] / 60} minutes. For its last ${EVENTS.warn} seconds the warning sign flashes orange with the coming event's symbol, and it stays bright orange for a moment once the event happens.</p>
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
  // both guides open above the season clock and world event sign (bottom left)
  const r = $('#hud').getBoundingClientRect();
  Object.assign(p.style, {
    top: 'auto',
    right: 'auto',
    bottom: innerHeight - r.top + 6 + 'px',
    left: r.left + 'px',
  });
}
document.querySelectorAll('.info, #evSq, #clock').forEach(
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
  {
    // the ring shows the charge: it drains while fast forward runs and fills again while it is off
    tickFast();
    const b = $('#bFast'),
      off = S.speed > 1 || S.over,
      full = fast.charge >= FAST.dur;
    b.classList.toggle('on', fast.on);
    b.classList.toggle('charging', !fast.on && !full);
    b.disabled = off || (!fast.on && fast.charge < 1);
    b.style.setProperty('--p', fast.charge / FAST.dur);
    b.title = off
      ? 'Fast forward is off while a testing speed is set'
      : fast.on
        ? `Fast forward: ${Math.ceil(fast.charge)} s left (press to stop)`
        : full
          ? `Fast forward: ${FAST.speed}× for up to ${FAST.dur} s`
          : `Fast forward: ${Math.floor(fast.charge)} s stored, full in ${fmtT(((FAST.dur - fast.charge) * FAST.cool) / FAST.dur)}`;
    document
      .querySelectorAll('#sSpeed button')
      .forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.spd === S.speed)));
  }
  updScale();
  if ($('#sheet').classList.contains('closed') || $('#sheet').hidden) return;
  if (tab === 'sp') {
    // keep the table's sideways scroll while it refreshes
    const box = $('#spTable'),
      x = box.scrollLeft;
    box.innerHTML = speciesTable(true);
    drawPics(box);
    box.scrollLeft = x;
    $('#spMore').hidden = box.scrollWidth <= box.clientWidth + 1;
  } else if (tab === 'stats') {
    document
      .querySelectorAll('#metrics button')
      .forEach(b => b.classList.toggle('on', b.dataset.m === metric));
    drawChart();
  } else if (tab === 'one') {
    const c = S.sel;
    if (!c) {
      $('#p-one').innerHTML =
        '<p class="hint">Tap any creature on the map to inspect and follow it, and to take control of it.</p>';
      $('#p-one').dataset.k = '';
      return;
    }
    const sp = S.species[c.sp],
      el = $('#p-one'),
      // the heading and Control button are rebuilt only when they change, so the button doesn't flicker under the
      // mouse as the figures below refresh
      key = c.id + '|' + (S.ctrl === c) + '|' + !!c.dead;
    if (el.dataset.k !== key) {
      el.dataset.k = key;
      el.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><div><span class="lbl">Specimen ${c.id}</span><h3 class="latin" style="font-size:17px;font-weight:500">${esc(S.genus)} ${sp.epithet}</h3></div>
      ${c.dead ? '' : `<button class="btn" id="ctl" aria-pressed="${S.ctrl === c}">Control</button>`}</div><div id="oneBody"></div>`;
      if ($('#ctl'))
        $('#ctl').onclick = () => {
          S.ctrl = S.ctrl === c ? null : c;
          S.follow = true;
          syncUI(true);
        };
    }
    // while the player steers it into somewhere it can't go, the limit that stops it flashes orange
    const lim = k =>
      S.ctrl === c && c.blockWhy === k && performance.now() - c.blockAt < 700 ? ' class="limit"' : '';
    $('#oneBody').innerHTML =
      `${c.dead ? `<p class="hint">Died of ${c.dead} at ${fmtT(c.diedAt)}, aged ${Math.round(c.age)} s.</p>` : ''}
      <div class="kv">
        <div><span>Generation</span><b>${c.gen}</b></div><div><span>Parent</span><b>${c.parent ? '#' + c.parent : 'Founder'}</b></div>
        <div><span>Offspring</span><b>${c.births}</b></div><div><span>Meals</span><b>${c.eaten}</b></div>
        <div><span>Energy</span><b>${c.dead ? 0 : Math.round(c.E)} / ${Math.round(c.cap)}</b><div class="meter"><i style="width:${c.dead ? 0 : Math.max(0, (c.E / c.cap) * 100)}%"></i></div></div>
        <div><span>Age</span><b>${Math.round(c.age)} / ${LIFE} s</b><div class="meter"><i style="width:${Math.min(100, (c.age / LIFE) * 100)}%;background:var(--muted)"></i></div></div>
        <div${lim('speed')}><span>Speed</span><b>land ${Math.round(c.vL)} · water ${Math.round(c.vW)} px/s${lim('speed') ? ` · rivers need ${RIVER}` : ''}</b></div>
        <div${lim('range')}><span>Range</span><b>${rangeTxt(c)}</b></div>
        <div${lim('thicket')}><span>Thickets</span><b>${thickTxt(c)[0].toUpperCase() + thickTxt(c).slice(1)}</b></div>
        <div><span>Mouth</span><b>${mouthTxt(c.mth)}</b></div><div><span>Feeding</span><b>${mouthFeed(c)}</b></div>
      </div>`;
  } else {
    const sw = (f, s, ex = '') =>
      `<svg width="22" height="14"><rect x=".5" y=".5" width="21" height="13" fill="${f}" stroke="${s}"/>${ex}</svg>`;
    document
      .querySelectorAll('#cmode button')
      .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cm === S.colorMode)));
    $('#worldBody').innerHTML =
      `<div class="kv"><div><span>World</span><b>#${S.seed}</b></div><div><span>Season</span><b>${SEASONS[S.season].name} · ${Math.max(0, Math.round(S.nextSeason - S.t))} s left</b></div>
      <div><span>Land cover</span><b>${world.stats.land}%</b></div><div><span>Sea cover</span><b>${world.stats.sea}%</b></div>
      <div><span>Next event</span><b>${S.over ? '–' : '~' + Math.max(0, Math.round(S.nextEvent - S.t)) + ' s'}</b></div>
<div><span>Landmasses</span><b>${world.stats.lands}</b></div>
      <div><span>Craters</span><b>${world.stats.craters}</b></div>
      <div><span>Thicket cover</span><b>${world.stats.thicket}% of land</b></div><div><span>Rock cover</span><b>${world.stats.rock}% of land</b></div></div>
      <div class="legend">
       ${sw('#dfe5cf', '#151918', '<ellipse cx="13.6" cy="4.3" rx="2.2" ry="1.1" transform="rotate(-40 13.6 4.3)" fill="#5f7d4e"/><circle cx="11" cy="7.5" r="3.2" fill="#D55E00" stroke="currentColor" stroke-width=".7"/>')}<span><b>Meadow and plain.</b> Berries; eaten ones regrow from a small ring. Meadows (darker) fruit heavily in spring, plains sparsely.</span>
       ${sw('#d3dfc0', '#5f7d4e', '<g fill="#5f7d4e"><circle cx="5" cy="4" r=".9"/><circle cx="10" cy="9" r=".9"/><circle cx="15" cy="5" r=".9"/><circle cx="7" cy="10" r=".9"/><circle cx="17" cy="10" r=".9"/></g>')}<span><b>Thicket.</b> Rich in autumn. Denser dots mean tighter growth: only smaller creatures get far in, where more of the food is nuts.</span>
       ${sw('#d3dfc0', '#5f7d4e', '<ellipse cx="11" cy="8" rx="2.4" ry="2.9" fill="#9a6a35" stroke="currentColor" stroke-width=".7"/><path d="M8.1 5.9a2.9 1.5 0 0 1 5.8 0q-2.9 1.1-5.8 0z" fill="#5b3a1a" stroke="currentColor" stroke-width=".7"/>')}<span><b>Nuts.</b> Grow in thickets alongside berries. A claw gets more from them than a straw does.</span>
       ${sw('#d2e0e5', '#151918', '<g fill="none" stroke="#009E73" stroke-width="1.2" stroke-linecap="round"><path d="M11 12q-2-3-3.5-7"/><path d="M11 12q0-3 0-8"/><path d="M11 12q2-3 3.5-7"/></g>')}<span><b>Shallows and rivers.</b> Algae grows here all year, for creatures that will go into the water.</span>
       ${sw('#d2e0e5', '#4d7385', '<path d="M8 4l4 3-4 3" stroke="#4d7385" fill="none"/>')}<span><b>River.</b> Strong current. Needs ${RIVER} px/s of swimming to cross.</span>
       ${sw('#b9cfd7', '#151918')}<span><b>Open sea.</b> Only creatures that lean towards water venture far from shore.</span>
       ${sw('#ddd8ce', '#151918', '<ellipse cx="11" cy="7" rx="6" ry="3.5" fill="#c6bfb1" stroke="#7d776b"/><ellipse cx="11" cy="7" rx="2.5" ry="1.4" fill="#b9b1a2" stroke="#7d776b"/>')}<span><b>Rock.</b> Impassable.</span>
      </div>

`;
  }
}
// how much the mouth gets from each food, compared with a berry
const mouthFeed = c => `nuts ×${mouthGain(c, 'n').toFixed(2)} · algae ×${mouthGain(c, 'w').toFixed(2)}`;
function rangeTxt(c) {
  if (c.tail <= 0) return 'Never enters water';
  if (c.tail >= 1) return 'Never leaves water';
  // past 2000 px the limit no longer matters on this map
  const sw = c.dW > 2000 ? 'Swims anywhere' : `Swims up to ${Math.round(c.dW)} px from shore`,
    wk = c.dL > 2000 ? 'walks anywhere' : `walks up to ${Math.round(c.dL)} px from water`;
  return `${sw}, ${wk}`;
}
