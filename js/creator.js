/* The species creator: sliders, randomise, the live preview and starting a run.
   D holds the design being edited. */

/* ---------- creator ---------- */
let D = {
  name: 'Blorbs',
  w: 4,
  h: 4.5,
  leg: 0.5,
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
  ['#fL', 'leg', 0.01],
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
// a random name, body, colour and look; the creator starts like this whenever it opens without a past design
function randomDesign() {
  const r = (a, b) => a + rand() * (b - a),
    pick = a => a[(rand() * a.length) | 0],
    o = pick(OKABE);
  let nm = pick(SYL) + pick(SYL);
  if (rand() < 0.5) nm += 's';
  nm = nm[0].toUpperCase() + nm.slice(1);
  Object.assign(D, {
    name: nm,
    w: +r(1.5, 6.5).toFixed(1),
    h: +r(1.5, 6.5).toFixed(1),
    leg: +r(0, 1).toFixed(2),
    // about a third are land creatures with no tail; the rest have a clearly visible tail
    hab: +(rand() < 0.35 ? r(0, 0.13) : r(0.25, 0.9)).toFixed(2),
    mth: +r(0, 1).toFixed(2),
    hue: o[2],
    sat: o[3],
    lt: o[4],
    round: +r(0, 1).toFixed(2),
  });
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
function updP() {
  document.querySelectorAll('#creator input[type=range]').forEach(r => {
    const p = (r.value - r.min) / (r.max - r.min);
    r.style.setProperty('--p', `calc(${p * 100}% - ${p * 12 - 6}px)`);
  });
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
  $('#fL').value = Math.round(D.leg * 100);
  $('#fHab').value = Math.round(D.hab * 100);
  $('#fMth').value = Math.round(D.mth * 100);
  $('#fR').value = D.round;
  $('#oW').textContent = D.w.toFixed(1);
  $('#oH').textContent = D.h.toFixed(1);
  $('#oL').textContent = legTxt(D.leg);
  $('#oHab').textContent = tailTxt(D.hab);
  $('#oMth').textContent = mouthTxt(D.mth);
  $('#oR').textContent = D.round.toFixed(2);
  const c = { ...D, id: 0, dir: 0, walk: 0 };
  compute(c);
  pvC = c;
  const b = moveBurn(c, c.vL),
    river = c.vW >= RIVER && c.dW >= 16,
    // how far it goes from shore and from water: Never under one cell, Anywhere past 2000 px (as in rangeTxt)
    far = (d, other) =>
      d < CS ? 'Never' : other < CS ? 'Anywhere' : d > 2000 ? 'Anywhere' : `${Math.round(d)} px`;
  // what the body does, roughly most important first; crossing rivers and thickets last
  $('#pvStats').innerHTML = [
    ['Land speed', `${Math.round(c.vL)} px/s`],
    ['Water speed', `${Math.round(c.vW)} px/s`],
    ['Energy store', Math.round(c.cap)],
    ['Energy use', `${b.toFixed(2)}/s`],
    ['Swims from shore', far(c.dW, c.dL)],
    ['Walks from water', far(c.dL, c.dW)],
    ['From nuts', `×${mouthGain(c, 'n').toFixed(2)}`],
    ['From algae', `×${mouthGain(c, 'w').toFixed(2)}`],
    ['Size', c.size.toFixed(2)],
    ['Legs', c.legs],
    ['Reach', `${c.reach.toFixed(0)} px`],
    ['Into thickets', c.dT >= 200 ? 'Anywhere' : `${Math.round(c.dT)} px`],
    ['Crosses rivers', river ? 'Yes' : 'No'],
  ]
    .map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`)
    .join('');
  $('#pvWhy').innerHTML =
    `Width and length only matter through size: a bigger body is slower but burns less energy, and doesn't get as far into thickets, whose middles are tighter. From size ${LEGS.sixFrom} a creature has 6 legs, which walk a little faster and swim a little slower. Longer legs walk faster but swim slower. A bigger tail swims faster but walks slower, and goes further from shore but less far from water. A rounder body swims a little faster, a blockier one walks a little faster. A beak gets more from nuts, a straw more from algae, and berries suit any mouth.`;
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
  drawCreature(g, pvC, 260, 175, k, 7, col(pvC), t, false, 1.1 / k);
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(40, 340);
  g.lineTo(40 + 10 * k, 340);
  g.moveTo(40, 335);
  g.lineTo(40, 345);
  g.moveTo(40 + 10 * k, 335);
  g.lineTo(40 + 10 * k, 345);
  g.stroke();
  g.fillStyle = INK;
  g.font = '12px "IBM Plex Mono", monospace';
  g.fillText('10 px', 40, 360);
  g.fillText(`${pvC.bw.toFixed(1)} × ${pvC.bh.toFixed(1)} px`, 40, 378);
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
  $('#pastWrap')
    .querySelectorAll('[data-revisit]')
    .forEach(
      b =>
        (b.onclick = () => {
          const r = saved.runs[+b.dataset.revisit];
          openCreator(r.seed, r.design);
        })
    );
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
    leg: D.leg,
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
