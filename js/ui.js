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
// the season clock: the year as a ring of four seasons in full colour, going round clockwise from the top, with the
// current season's symbol in the middle and a dot that travels round the year
const RING = { r: 19, band: 7 }; // radius of the ring's band and its thickness, px
function syncClock(sp) {
  const el = $('#hud'),
    k = S.season,
    { r, band } = RING,
    at = a => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  el.hidden = false;
  let st = '';
  for (let q = 0; q < 4; q++) {
    const a0 = (q * Math.PI) / 2 + 0.04,
      a1 = ((q + 1) * Math.PI) / 2 - 0.04;
    st += `<path d="M${at(a0)}A${r} ${r} 0 0 1 ${at(a1)}" fill="none" stroke="${SEASONS[q].col}" stroke-width="${band}"/>`;
  }
  const [dx, dy] = at(((k + sp) * Math.PI) / 2).split(' ');
  st += `<circle cx="${dx}" cy="${dy}" r="4.2" fill="var(--panel)" stroke="${INK}" stroke-width="1.8"/>`;
  st += `<g style="color:${INK}">${SEASON_ICON[k]}</g>`;
  $('#clkPie').innerHTML = st;
  const v = worldTemp(),
    f = clamp((v - 0.2) / 0.6, 0, 1),
    c = v < 0.45 ? '#56B4E9' : v < 0.58 ? '#c9c27a' : '#E69F00',
    key = k + '|' + v;
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  $('#clkSeason').textContent = SEASONS[k].name;
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
      if (!S || !testUnlocked) return;
      S.speed = +b.dataset.spd;
      // controlling only works in real time: a testing speed above 1× lets go of a controlled creature
      if (S.speed > 1) S.ctrl = null;
      if (S.speed > 1) fast.on = false;
      syncUI(true);
    })
);
// Extinction: asks once more, then a shower of meteors wipes out every species and the end screen follows
let doomAsk = 0;
$('#bDoom').onclick = () => {
  if (!S || S.over || S.replay || S.doom) return;
  if (performance.now() - doomAsk > 3000) {
    doomAsk = performance.now();
    $('#bDoom').textContent = 'Click again to confirm';
    setTimeout(syncSettings, 3100);
    return;
  }
  doomAsk = 0;
  $('#setPop').hidden = true;
  $('#bSet').classList.remove('on');
  S.paused = false;
  S.doom = { t: 0 };
  logEv('Extinction. A shower of meteors is wiping out every species.');
  syncSettings();
  syncUI(true);
};
// the Settings menu: the Sound switch, Extinction, and the testing tools, which need a password and (for events) a
// live run
function syncSettings() {
  $('#sSound').setAttribute('aria-pressed', String(sound));
  const live = S && !S.over && !S.replay;
  for (const b of document.querySelectorAll('#sSpeed button, #sMajor')) b.disabled = !testUnlocked;
  for (const b of document.querySelectorAll('.testev button')) b.disabled = !testUnlocked || !live;
  $('#testTools').hidden = !testUnlocked;
  $('#sPw').disabled = $('#sPwGo').disabled = testUnlocked;
  if (performance.now() - doomAsk > 3000) $('#bDoom').textContent = 'Extinction (end run)';
  $('#bDoom').disabled = !live || !!S.doom;
}
// the testing tools are locked until the password (TEST_PASSWORD) is entered: a tick when it's right, and the tools
// unlock until the page is reloaded; a cross when it's wrong
let testUnlocked = false;
$('#pwForm').onsubmit = e => {
  e.preventDefault();
  testUnlocked = $('#sPw').value === TEST_PASSWORD;
  $('#sPw').value = '';
  $('#pwMark').className = 'pwmark ' + (testUnlocked ? 'ok' : 'no');
  $('#pwMark').innerHTML = testUnlocked
    ? '<svg viewBox="0 0 16 16" width="16" height="16" aria-label="Unlocked"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 16 16" width="16" height="16" aria-label="Wrong password"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  syncSettings();
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
  $('#bSet').classList.toggle('on', !p.hidden);
};
// testing: fire a world event straight away (it replaces nothing: the scheduled event still comes on time)
$('#sMajor').onclick = e => {
  const b = e.currentTarget;
  b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
};
for (const b of document.querySelectorAll('.testev button'))
  b.onclick = () => {
    if (!S || S.over || S.replay || !testUnlocked) return;
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
// Help (?): pauses the game and labels each part of the screen; pressing it again takes the labels away and carries
// on (still paused if it was paused before). Each label: [what it points at, which side it goes, title, text]
let help = null; // while help is on: { was: whether the game was already paused }
const helpIcon = id => $(id).querySelector('svg')?.outerHTML ?? $(id).textContent;
const HELP = [
  [
    '#bar .idp',
    'below',
    'Your species',
    'Its name, then creatures alive · species · highest generation · time.',
  ],
  [
    '#bar .strip',
    'below',
    'Controls',
    () =>
      [
        ['#bPause', 'Pause or play'],
        ['#bFast', 'Fast forward: 8× for up to 40 s. The ring shows the charge left'],
        ['#bLog', 'Event log'],
        ['#bBadge', 'Achievements'],
        ['#bSet', 'Settings: sound and ending the run'],
        ['#bHelp', 'Help: press again to carry on'],
      ]
        .map(([id, t]) => `<div class="hrow"><i>${helpIcon(id)}</i><span>${t}</span></div>`)
        .join(''),
  ],
  [
    '#sheet .tabs',
    'left',
    'Inspector',
    [
      ['Species', 'each species’ average body'],
      ['Stats', 'charts over time'],
      ['Specimen', 'the creature you tap; Control steers it with the arrow keys'],
      ['World', 'event counts and a map key'],
    ]
      .map(([t, d]) => `<div><em>${t}</em>: ${d}</div>`)
      .join('') + '<div>The arrow hides or shows it.</div>',
  ],
  ['#clock', 'above', 'Season', 'The year’s clock, the season and the world’s temperature. Tap for more.'],
  [
    '#evSq',
    'right',
    'World event sign',
    'Flashes orange just before a flood, drought, earthquake or meteor. Tap for more.',
  ],
  [null, 'map', 'Map', 'Drag to move, scroll or pinch to zoom, and tap a creature to follow it.'],
];
// put each label beside the part it explains, kept on screen and clear of the outlines and the other labels (moved
// down, or up for labels above their part, past anything in the way); parts covered by something else (the
// season clock under an open inspector on a phone) get no label
function placeHelp() {
  const L = $('#helpLayer'),
    vw = innerWidth,
    vh = innerHeight,
    m = 8,
    gap = 8,
    taken = [],
    hits = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  L.innerHTML = '';
  const sheet = $('#sheet').getBoundingClientRect();
  const parts = HELP.map(([sel, ...rest]) => {
    if (!sel) return [null, ...rest];
    const el = $(sel),
      r = el && el.getBoundingClientRect();
    if (!r || !r.width || el.closest('[hidden]')) return null;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top && !el.contains(top) && !L.contains(top)) return null;
    const ring = document.createElement('div');
    ring.className = 'hring';
    Object.assign(ring.style, {
      left: r.left - 3 + 'px',
      top: r.top - 3 + 'px',
      width: r.width + 2 + 'px',
      height: r.height + 2 + 'px',
    });
    L.append(ring);
    taken.push({ x: r.left - 3, y: r.top - 3, w: r.width + 6, h: r.height + 6 });
    return [r, ...rest];
  });
  for (const part of parts) {
    if (!part) continue;
    const [r, side, title, text] = part;
    const c = document.createElement('div');
    c.className = 'hcall';
    c.innerHTML = `<b>${title}</b>${typeof text === 'function' ? text() : text}`;
    L.append(c);
    const w = c.offsetWidth,
      h = c.offsetHeight;
    let x, y;
    if (side === 'map') {
      // the middle of the open map, left of the inspector when there's room
      const right = sheet.width && sheet.left > vw / 2 ? sheet.left : vw;
      [x, y] = [(right - w) / 2, vh * 0.45 - h / 2];
    } else if (side === 'below') [x, y] = [r.left, r.bottom + gap];
    else if (side === 'above') [x, y] = [r.left, r.top - h - gap];
    else if (side === 'right') [x, y] = [r.right + gap, r.bottom - h];
    // left of the inspector, or above it when there's no room (phones)
    else if (r.left - w - gap >= m) [x, y] = [r.left - w - gap, r.top];
    else [x, y] = [r.right - w, r.top - h - gap];
    const up = y < (r ? r.top : 0);
    const box = { x: Math.max(m, Math.min(vw - w - m, x)), y, w, h };
    for (let i = 0, t; i < 20 && (t = taken.find(o => hits(box, o))); i++)
      box.y = up ? t.y - h - gap / 2 : t.y + t.h + gap / 2;
    box.y = Math.max(m, Math.min(vh - h - m, box.y));
    taken.push(box);
    c.style.left = box.x + 'px';
    c.style.top = box.y + 'px';
  }
}
function setHelp(on) {
  if (on === !!help) return;
  if (on) {
    help = { was: S.paused };
    S.paused = true;
  } else {
    if (!S.over && !S.doom) S.paused = help.was;
    help = null;
  }
  $('#helpLayer').hidden = !on;
  $('#bHelp').classList.toggle('on', on);
  $('#bHelp').setAttribute('aria-pressed', String(on));
  syncUI(true);
}
$('#bHelp').onclick = () => {
  if (S && !S.over && !S.replay) setHelp(!help);
};
addEventListener('resize', () => help && placeHelp());
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
  g.font = '11px "IBM Plex Mono", monospace';
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
  ['Leg length', (m, c) => legLen(c).toFixed(1), 'leg', 0.12],
  ['Tail length', (m, c) => (c.tail > 0 ? tailLen(c).toFixed(1) : 'None'), 'hab', 0.12],
  ['Mouth', (m, c) => mouthTxt(m.mth), 'mth', 0.12],
  ['Roundness', (m, c) => roundTxt(m.round), 'round', 0.2],
];
// a species' average traits: now if it is alive, otherwise as last seen alive
function spAvg(sp) {
  const M = S.creatures.filter(c => c.sp === sp.id);
  return M.length ? summ(M) : sp.last || null;
}
// a creature built from average traits, for drawing and for leg and tail length
function avgCreature(m) {
  const c = { ...m, hue: S.design.hue, sat: S.design.sat, id: 0, dir: -Math.PI / 2, walk: 0.6, rest: 0 };
  enforce(c);
  compute(c);
  return c;
}
let picQueue = [];
const SP_COL = 86; // width of every species column, px
// the row names column is only as wide as its longest name, so the first species sits as far left as it can
const labelWidth = labels => {
  const g = (labelWidth.g ||= document.createElement('canvas').getContext('2d'));
  g.font = '12px "IBM Plex Sans", system-ui, sans-serif';
  return Math.ceil(Math.max(...labels.map(l => g.measureText(l).width))) + 10;
};
// grey: in the inspector (extinct species greyed out); the released design is always the first column, headed
// Released in the inspector and at the end of a run
function speciesTable(grey) {
  const start = { name: 'Released', m: S.orig, key: 'r' },
    cols = [start];
  // living species first, extinct ones at the far right
  const order = [
    ...S.species.filter(s => !s.died),
    ...S.species.filter(s => s.died).sort((a, b) => a.died - b.died),
  ];
  for (const sp of order) {
    const m = spAvg(sp);
    if (!m) continue;
    // primus is compared with the released design only at the end of a run: in the inspector it has no highlights
    const parent = sp.parent === null ? (grey ? null : 'r') : sp.parent;
    cols.push({ sp, m, key: sp.id, ext: grey && !!sp.died, parent });
  }
  // each picture is in its species' colour (the released design's for that column)
  for (const k of cols) {
    const s = k.sp ?? S.design;
    k.c = Object.assign(avgCreature(k.m), { hue: s.hue, sat: s.sat, lt: s.lt });
  }
  const byKey = new Map(cols.map(k => [k.key, k]));
  // the one or two traits that differ most from the parent, if they differ notably (none on primus)
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
    across = Math.max(...cols.map(k => k.c.bw + 2 * (legLen(k.c) + 1.5))),
    sc = Math.min(2.6, 68 / (up + down), (SP_COL - 14) / across);
  // every picture is the column's width, with the creature drawn at the right so it sits above the values
  picQueue = cols.map(k => [k.c, sc, up * sc, (up + down) * sc, SP_COL - 10 - (across * sc) / 2 - 2]);
  const ext = k => (k.ext ? ' class="ext"' : '');
  // population now (or at its peak, at the end of a run, when every species has died) and how long it has lived
  const info = [
    [
      grey ? 'Population' : 'Peak population',
      // the released design has no population of its own in the inspector, so its cell is left empty
      k => (k.sp ? (grey ? S.creatures.filter(c => c.sp === k.sp.id).length : k.sp.peak) : grey ? '' : START),
    ],
    ['Time alive', k => (k.sp ? fmtT((k.sp.died ?? S.t) - k.sp.born) : '–')],
  ];
  // fixed column widths, so the table doesn't shift as the species change
  const first = labelWidth([...info.map(r => r[0]), ...SP_ROWS.map(r => r[0])]);
  return `<table class="sp" style="width:${first + SP_COL * cols.length}px"><colgroup><col style="width:${first}px">${cols
    .map(() => `<col style="width:${SP_COL}px">`)
    .join('')}</colgroup><thead><tr><th></th>${cols
    .map(k =>
      k.sp
        ? `<th${ext(k)}><span class="tag" style="background:${k.sp.tag}"></span><span class="latin">${k.sp.epithet}${k.ext ? ' †' : ''}</span></th>`
        : `<th class="sd">Released</th>`
    )
    .join('')}</tr></thead><tbody><tr class="pic"><td></td>${cols
    .map(
      (k, i) =>
        `<td${ext(k)}><canvas data-pic="${i}" aria-label="${k.sp ? `Average ${k.sp.epithet}` : 'Released design'}"></canvas></td>`
    )
    .join('')}</tr>${info
    .map(([l, f]) => `<tr><td>${l}</td>${cols.map(k => `<td${ext(k)}>${f(k)}</td>`).join('')}</tr>`)
    .join('')}${SP_ROWS.map(
    ([l, f], i) =>
      `<tr><td>${l}</td>${cols
        .map(
          k =>
            `<td class="${k.ext ? 'ext ' : ''}${k.hl.includes(i) ? 'hl" title="Differs most from the species it split from' : ''}">${f(k.m, k.c)}</td>`
        )
        .join('')}</tr>`
  ).join('')}</tbody></table>`;
}
// draw the average creatures into the table's picture row
function drawPics(root) {
  for (const cv of root.querySelectorAll('canvas[data-pic]')) {
    const [c, sc, y, h, x] = picQueue[+cv.dataset.pic],
      s = SP_COL - 10;
    cv.width = s * dpr;
    cv.height = Math.ceil(h) * dpr;
    cv.style.width = s + 'px';
    cv.style.height = Math.ceil(h) + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the head points up and the tail down, the body at the same height in every column
    drawCreature(g, c, x, y, sc, 7, col(c), 0, false, 1.1 / sc);
  }
}
// every achievement, the earned ones in full and the rest greyed out (the popup and the end screen)
const badgesHTML = mine =>
  `<div class="badges">${BADGES.map(b => `<div class="badge ${mine.includes(b.id) ? 'got' : ''}"><b>${b.name}</b>${b.d}</div>`).join('')}</div>`;
function renderBadges() {
  const all = BADGES,
    mine = S ? S.badges : [],
    got = all.filter(b => mine.includes(b.id)).length;
  $('#badgePop').innerHTML =
    `<div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Achievements this run</b><span class="lbl">${got} / ${all.length}</span></div>${badgesHTML(mine)}`;
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
    () => `<b>Seasons</b><p class="hint" style="margin:4px 0 8px">Each season lasts ${SEASON_LEN / 60} minutes and changes where food regrows quickly and which world events are likely. The thermometer shows how cold or warm the whole world is this season; high ground is always colder than that, and lowland warmer.</p>
  <table><thead><tr><th>Season</th><th>Food</th><th>Likely events</th></tr></thead><tbody>${SEASONS.map((s, k) => `<tr${k === S?.season ? ' style="background:var(--chip)"' : ''}><td><span class="tag" style="background:${s.col}"></span>${s.name}</td><td style="font-family:var(--sans);text-align:left">${{ 0: 'Meadows and plains fast', 1: 'Plains dry out; meadows and islands thrive', 2: 'Thickets and islands fruit', 3: 'Slow everywhere, including water' }[k]}</td><td style="font-family:var(--sans);text-align:left">${{ 0: 'Floods', 1: 'Droughts', 2: 'Earthquakes', 3: 'Floods' }[k]}</td></tr>`).join('')}</tbody></table>`,
  event:
    () => `<b>World events</b><p class="hint" style="margin:4px 0 8px">A world event happens once every ${EVENTS.gap[0] / 60} minutes. Watch out for the flashing symbol. Some events will have a bigger impact than usual.</p>
  <div class="legend">${['flood', 'drought', 'quake', 'meteor'].map(k => `<span style="display:flex">${OMEN[k]}</span><span><b>${{ flood: 'Flood', drought: 'Drought', quake: 'Earthquake', meteor: 'Meteor' }[k]}.</b> ${{ flood: 'The sea rises and low land is lost.', drought: 'The sea falls; new land appears, islands may join, and rivers and sea channels can dry up.', quake: 'The land splits, usually with a new river, sometimes with a channel of sea.', meteor: 'A strike kills creatures nearby and leaves a crater. About 1 in 7 events.' }[k]}</span>`).join('')}</div>
`,
};
function openInfo(which) {
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
document.querySelectorAll('#evSq, #clock').forEach(
  b =>
    (b.onclick = e => {
      e.stopPropagation();
      openInfo(b.dataset.info);
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
// controlling a creature needs arrow keys: on a touch-first device (a phone or tablet) Control starts greyed out,
// and the first key press shows a keyboard is there after all
let hasKeys = !matchMedia('(hover: none) and (pointer: coarse)').matches;
addEventListener('keydown', () => {
  if (hasKeys) return;
  hasKeys = true;
  syncUI(true);
});
function syncUI() {
  if (!S) return;
  // help closes when the run ends or the creator opens; otherwise its labels follow the screen as it changes
  if (help && (S.over || S.replay || !$('#creator').hidden)) setHelp(false);
  if (help) placeHelp();
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
      // why Control can't be used right now, if it can't: no keyboard, or a testing speed above 1×
      why = !hasKeys
        ? 'Control uses the arrow keys, so it needs a keyboard.'
        : S.speed > 1
          ? 'Set the testing speed back to 1× to take control.'
          : '',
      key = c.id + '|' + (S.ctrl === c) + '|' + !!c.dead + '|' + why;
    if (el.dataset.k !== key) {
      el.dataset.k = key;
      el.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><div><span class="lbl">Specimen ${c.id}</span><h3 class="latin" style="font-size:17px;font-weight:500">${esc(S.genus)} ${sp.epithet}</h3></div>
      ${c.dead ? '' : `<button class="btn" id="ctl" aria-pressed="${S.ctrl === c}"${why ? ' disabled' : ''}>Control</button>`}</div>${why && !c.dead ? `<p class="hint" style="margin-top:-4px">${why}</p>` : ''}<div id="oneBody"></div>`;
      if ($('#ctl'))
        $('#ctl').onclick = () => {
          if (S.speed > 1 || !hasKeys) return;
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
        <div${lim('speed')}><span>Speed</span><b>land ${Math.round(c.vL)} · water ${Math.round(c.vW)} px/s</b></div>
        <div${lim('range')}><span>Range</span><b>${rangeTxt(c)}</b></div>
        <div${lim('thicket')}><span>Thickets</span><b>${thickTxt(c)[0].toUpperCase() + thickTxt(c).slice(1)}</b></div>
        <div><span>Mouth</span><b>${mouthTxt(c.mth)}</b></div><div><span>Feeding</span><b>${mouthFeed(c)}</b></div>
      </div>`;
  } else {
    const sw = (f, s, ex = '') =>
      `<svg width="22" height="14"><rect x=".5" y=".5" width="21" height="13" fill="${f}" stroke="${s}"/>${ex}</svg>`;
    const n = S.count;
    $('#worldBody').innerHTML =
      `<div class="kv"><div><span>World</span><b>#${S.seed}</b></div><div><span>Thicket cover</span><b>${world.stats.thicket}% of land</b></div>
      <div><span>Land cover</span><b>${world.stats.land}%</b></div><div><span>Sea cover</span><b>${world.stats.sea}%</b></div>
      <div><span>Floods</span><b>${n.flood}</b></div><div><span>Droughts</span><b>${n.drought}</b></div>
      <div><span>Earthquakes</span><b>${n.quake}</b></div><div><span>Meteor strikes</span><b>${n.meteor}</b></div></div>
      <div class="legend">
       ${sw('#dfe5cf', '#151918', '<ellipse cx="13.6" cy="4.3" rx="2.2" ry="1.1" transform="rotate(-40 13.6 4.3)" fill="#5f7d4e"/><circle cx="11" cy="7.5" r="3.2" fill="#D55E00" stroke="currentColor" stroke-width=".7"/>')}<span><b>Meadow and plain.</b> Berries; eaten ones regrow from a small ring. Meadows (greener) fruit heavily in spring, plains sparsely.</span>
       ${sw('#d3dfc0', '#5f7d4e', '<g fill="#5f7d4e"><circle cx="5" cy="4" r=".9"/><circle cx="10" cy="9" r=".9"/><circle cx="15" cy="5" r=".9"/><circle cx="7" cy="10" r=".9"/><circle cx="17" cy="10" r=".9"/></g>')}<span><b>Thicket.</b> Rich in autumn. Bigger, closer trees mean tighter growth: only smaller creatures get far in, where more of the food is nuts.</span>
       ${sw('#d3dfc0', '#5f7d4e', '<ellipse cx="11" cy="8" rx="2.4" ry="2.9" fill="#9a6a35" stroke="currentColor" stroke-width=".7"/><path d="M8.1 5.9a2.9 1.5 0 0 1 5.8 0q-2.9 1.1-5.8 0z" fill="#5b3a1a" stroke="currentColor" stroke-width=".7"/>')}<span><b>Nuts.</b> Grow in thickets alongside berries. A beak gets more from them than a straw does.</span>
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
  // water is always at least one cell (16 px) from land and the other way round, so a smaller limit means never
  if (c.dW < CS) return 'Never enters water';
  if (c.dL < CS) return 'Never leaves water';
  // past 2000 px the limit no longer matters on this map
  const sw = c.dW > 2000 ? 'Swims anywhere' : `Swims up to ${Math.round(c.dW)} px from shore`,
    wk = c.dL > 2000 ? 'walks anywhere' : `walks up to ${Math.round(c.dL)} px from water`;
  return `${sw}, ${wk}`;
}
