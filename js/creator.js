/* The species creator: sliders, randomise, the live preview and starting a run.
   D holds the design being edited. */

/* ---------- creator ---------- */
let D = {
  name: 'Blorbs',
  w: 4,
  h: 4.5,
  hab: 0.1,
  mth: 0.5,
  hue: 41,
  sat: 100,
  lt: 45,
  round: 1,
};
$('#fHue').innerHTML = OKABE.map(
  ([n, hex], k) => `<button data-v="${k}" aria-label="${n}" title="${n}" style="background:${hex}"></button>`
).join('');

$('#fHue').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const o = OKABE[+b.dataset.v];
  D.hue = o[2];
  D.sat = o[3];
  D.lt = o[4];
  syncCreator();
};
for (const [id, key, k] of [
  ['#fW', 'w', 1],
  ['#fH', 'h', 1],
  ['#fHab', 'hab', 0.01],
  ['#fMth', 'mth', 0.01],
  ['#fR', 'round', 1],
])
  $(id).oninput = e => {
    D[key] = +e.target.value * k;
    syncCreator();
  };
const SYL = [
  'blor',
  'zib',
  'quo',
  'mur',
  'tak',
  'vel',
  'pim',
  'dro',
  'fen',
  'lup',
  'sna',
  'gor',
  'wib',
  'tul',
  'kra',
  'mox',
  'glim',
  'bok',
  'tir',
  'nox',
  'zan',
  'pel',
  'rud',
  'yim',
  'fop',
  'wex',
  'dax',
  'lim',
  'gub',
  'sor',
  'vik',
  'plo',
  'tem',
  'jub',
  'nim',
  'kav',
  'ral',
  'hob',
  'zun',
  'mip',
];
const pick = a => a[(rand() * a.length) | 0];
// a random name: two made-up syllables, sometimes with an "s"
function randomName() {
  const nm = pick(SYL) + pick(SYL) + (rand() < 0.5 ? 's' : '');
  return nm[0].toUpperCase() + nm.slice(1);
}
// a random body, colour and look (the intro's creatures use this too)
function randomBody() {
  const r = (a, b) => a + rand() * (b - a),
    o = pick(OKABE);
  return {
    w: +r(1.5, 6.5).toFixed(1),
    h: +r(1.5, 6.5).toFixed(1),
    // about a third are land creatures with no tail; the rest have a clearly visible tail
    hab: +(rand() < 0.35 ? r(0, 0.13) : r(0.25, 0.9)).toFixed(2),
    mth: +r(0, 1).toFixed(2),
    hue: o[2],
    sat: o[3],
    lt: o[4],
    round: +r(0, 1).toFixed(2),
  };
}
// a random name, body, colour and look; the creator starts like this whenever it opens without a past design
function randomDesign() {
  Object.assign(D, { name: randomName(), ...randomBody() });
}
$('#rnd').onclick = () => {
  randomDesign();
  $('#fName').value = D.name;
  syncCreator();
};
$('#fName').oninput = e => {
  D.name = e.target.value;
};
let pvC = null;
// the help popup (top right): how energy, breeding and each slider work
$('#crHelpBtn').onclick = e => {
  e.stopPropagation();
  const p = $('#crHelp');
  p.hidden = !p.hidden;
  e.currentTarget.setAttribute('aria-expanded', String(!p.hidden));
};
document.addEventListener('click', e => {
  if (!$('#crHelp').hidden && !e.target.closest('#crHelp')) {
    $('#crHelp').hidden = true;
    $('#crHelpBtn').setAttribute('aria-expanded', 'false');
  }
});
function updP() {
  document.querySelectorAll('#creator input[type=range]').forEach(r => {
    const p = (r.value - r.min) / (r.max - r.min);
    r.style.setProperty('--p', `calc(${p * 100}% - ${p * 12 - 6}px)`);
  });
}
// the values the creator's tags show: distances run from 0 to RANGE_CAP px (past that the limit no longer matters
// on this map), thickets from 0 to 200 px (past that it reaches every thicket's middle)
const RANGE_CAP = 2000;
function tagVals(c) {
  const cap = (d, other) => (d < CS ? 0 : other < CS ? RANGE_CAP : Math.min(RANGE_CAP, Math.round(d)));
  return {
    size: c.size,
    vL: c.vL,
    vW: c.vW,
    dW: cap(c.dW, c.dL),
    dL: cap(c.dL, c.dW),
    cap: c.cap,
    swim: 1 - ROUND.swim * (2 * c.round - 1), // share of the usual energy it pays to swim (ROUND)
    nut: mouthEnergy(c, 'n'),
    alg: mouthEnergy(c, 'w'),
    dT: Math.min(200, Math.round(c.dT)),
  };
}
// the lowest and highest value of each tag over the whole range of designs, worked out once
let ranges = null;
function statRanges() {
  if (ranges) return ranges;
  ranges = {};
  const ends = [0, 0.5, 1],
    sizes = [1, 2.5, 4, 5.5, 7];
  for (const w of sizes)
    for (const h of sizes)
      for (const hab of [0, 0.15, 0.5, 0.85, 1])
        for (const mth of [0, 1])
          for (const round of ends) {
            const c = { w, h, hab, mth, round, hue: 0, sat: 100, lt: 50 };
            enforce(c);
            compute(c);
            for (const [k, x] of Object.entries(tagVals(c))) {
              const r = (ranges[k] ||= [x, x]);
              r[0] = Math.min(r[0], x);
              r[1] = Math.max(r[1], x);
            }
          }
  return ranges;
}
function syncCreator() {
  $('#fHue')
    .querySelectorAll('button')
    .forEach(b => {
      const o = OKABE[+b.dataset.v];
      b.setAttribute('aria-pressed', String(o[2] === D.hue && o[4] === D.lt));
    });
  $('#fW').value = D.w;
  $('#fH').value = D.h;
  $('#fHab').value = Math.round(D.hab * 100);
  $('#fMth').value = Math.round(D.mth * 100);
  $('#fR').value = D.round;
  $('#oW').textContent = D.w.toFixed(1);
  $('#oH').textContent = D.h.toFixed(1);
  $('#oHab').textContent = tailTxt(D.hab);
  $('#oMth').textContent = mouthTxt(D.mth);
  $('#oR').textContent = D.round.toFixed(2);
  const c = { ...D, id: 0, dir: 0, walk: 0 };
  compute(c);
  pvC = c;
  const v = tagVals(c),
    R = statRanges(),
    // each tag is filled like a bar: how far its value sits between the lowest and highest any design can have.
    // It is as wide as its longest possible text (fmt at either end of the range, or every alternative), so tags
    // don't change size as values gain or lose digits
    tag = (k, fmt, alts) => {
      const r = R[k],
        f = !r ? 0 : clamp((v[k] - r[0]) / (r[1] - r[0] || 1), 0, 1),
        t = r ? fmt(v[k]) : fmt,
        w = Math.max(...(r ? [fmt(r[0]), fmt(r[1]), t] : alts).map(x => x.length));
      return `<span class="chip" style="--f:${(f * 100).toFixed(1)}%;width:calc(${w}ch + 16px)">${t}</span>`;
    };
  const px = x => Math.round(x);
  // in four rows: body, getting about, energy and food, then thickets and rivers
  $('#pvStats').innerHTML = [
    [
      tag('size', x => `Size ${x.toFixed(2)}`),
      tag('vL', x => `Land ${px(x)} px/s`),
      tag('vW', x => `Water ${px(x)} px/s`),
    ],
    [tag('dW', x => `Swims out ${x} px`), tag('dL', x => `Walks inland ${x} px`)],
    [
      tag('cap', x => `Energy ${px(x)}`),
      tag('swim', x => `Swim ×${x.toFixed(2)}`),
      tag('nut', x => `Nuts ${Math.round(x)}`),
      tag('alg', x => `Algae ${Math.round(x)}`),
    ],
    [
      tag('dT', x => `${x} px into thickets`),
      tag(null, c.vW >= RIVER && c.dW >= 16 ? 'Swims rivers' : 'Wades rivers', [
        'Swims rivers',
        'Wades rivers',
      ]),
    ],
  ]
    .map(r => `<div class="chiprow">${r.join('')}</div>`)
    .join('');
  $('#pvWhy').innerHTML =
    `Width and length only matter through size: a bigger body is slower but holds more energy, so it goes further between meals and roams further from home, and doesn't get as far into thickets, whose middles are tighter. A bigger tail swims faster but walks slower, and goes further from shore but less far from water. A rounder body swims more cheaply; on land roundness makes no difference. A beak gets more from nuts, a straw more from algae, and berries suit any mouth.`;
  updP();
}
function drawPreview(t) {
  const p = $('#pv'),
    g = p.getContext('2d'),
    Wp = 520,
    Hp = 390;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#fcfcfb';
  g.fillRect(0, 0, Wp, Hp);
  g.strokeStyle = '#e3e8e5';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0.5; x < Wp; x += 13) {
    g.moveTo(x, 0);
    g.lineTo(x, Hp);
  }
  for (let y = 0.5; y < Hp; y += 13) {
    g.moveTo(0, y);
    g.lineTo(Wp, y);
  }
  g.stroke();
  if (!pvC) return;
  const k = 7;
  pvC.walk = t * 3;
  pvC.rest = t % 5 < 1.6 ? 1 : 0; // every few seconds it pretends to eat, so the mouth snaps
  pvC.dir = -0.35 + Math.sin(t * 0.6) * 0.3;
  drawCreature(g, pvC, 260, 175, k, 7, col(pvC), t, false, true);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(40, 358);
  g.lineTo(40 + 10 * k, 358);
  g.moveTo(40, 353);
  g.lineTo(40, 363);
  g.moveTo(40 + 10 * k, 353);
  g.lineTo(40 + 10 * k, 363);
  g.stroke();
  g.fillStyle = INK;
  g.font = '12px "IBM Plex Mono", monospace';
  g.fillText('10 px', 40, 378);
}
function openCreator(seed, design) {
  if (design && design.w !== undefined && design.sat !== undefined)
    D = { ...D, ...upgrade(design), w: Math.min(design.w, 7), h: Math.min(design.h, 7) };
  else randomDesign();
  const opts = [`<option value="">New random world</option>`];
  const seen = new Set();
  if (S && S.seed != null) {
    opts.push(`<option value="${S.seed}">This world #${S.seed}</option>`);
    seen.add(S.seed);
  }
  for (const r of saved.runs) {
    if (seen.has(r.seed)) continue;
    seen.add(r.seed);
    opts.push(`<option value="${r.seed}">#${r.seed} · ${esc(r.name)}</option>`);
  }
  $('#fWorld').innerHTML = opts.join('');
  $('#fWorld').value = seed != null ? String(seed) : '';
  $('#fName').value = D.name;
  $('#pastWrap').innerHTML = saved.runs.length
    ? `<h3 class="sec" style="margin-top:22px">Past lineages</h3>${histHTML()}`
    : '';
  bindHist($('#pastWrap'));
  syncCreator();
  $('#creator').hidden = false;
  $('#sheet').hidden = true;
}
$('#go').onclick = () => {
  D.name = ($('#fName').value.trim() || 'Blorbs').slice(0, 20);
  const v = $('#fWorld').value;
  const seed = v ? +v : (Math.random() * 1e6) | 0;
  const d = {
    name: D.name,
    w: D.w,
    h: D.h,
    hab: D.hab,
    v: 2, // tails count from TAIL.min (see upgrade)
    mth: D.mth,
    hue: D.hue,
    sat: D.sat,
    lt: D.lt,
    round: D.round,
  };
  ensureAudio();
  newGame(d, seed);
  $('#creator').hidden = true;
  $('#end').hidden = true;
  $('#replayBar').hidden = true;
  $('#sheet').hidden = false;
  openSheet(true);
  placeScale();
  if (AC && AC.state === 'suspended') AC.resume();
};
