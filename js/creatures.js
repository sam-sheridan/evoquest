/* Creature traits, how traits turn into abilities (speed, reach, energy), inheritance with small random
   changes, and how a creature is drawn.
   Body traits (affect survival): w width, h length, spd speed, hab habitat (0 = land, 1 = water),
   mth mouth (0 = claw, 1 = straw).
   Look traits (drift by chance): hue, lt (lightness), round, taper. Legs come from body length. */

/* ---------- creatures ---------- */
// Body (functional): w width, h height, spd speed, hab habitat 0 = land … 1 = water, mth mouth 0 = claw … 1 = straw.  Look (neutral): hue, lt, round, taper, legs.
let nextId = 1;
function enforce(c) {
  c.w = clamp(c.w, 1, 7);
  c.h = clamp(c.h, 1, 7);
  c.spd = clamp(c.spd, 1, 10);
  c.hab = clamp(c.hab, 0, 1);
  c.mth = clamp(c.mth ?? 0.5, 0, 1);
  c.round = clamp(c.round, 0, 1);
  c.taper = clamp(c.taper, 0, 1);
  c.lt = clamp(c.lt, 22, 82);
  c.hue = ((c.hue % 360) + 360) % 360;
}
function compute(c) {
  c.bw = 6 + c.w * 2.2;
  c.bh = 6 + c.h * 2.2;
  c.thick = Math.min(c.bw, c.bh);
  c.legs = c.h >= LEG6 ? 6 : 4;
  c.size = Math.sqrt(c.bw * c.bh) / 17;
  const sm = 1.6 / (0.6 + c.size),
    base = c.spd * 6 * sm;
  c.vL = base * (1 - 0.85 * c.hab);
  c.vW = base * (0.15 + 0.85 * c.hab);
  // how far it will swim from shore and walk from water: only fully land (0) or fully water (1) creatures go
  // anywhere in their own element; in between, both limits apply, HAB.range px each way at 50%
  c.dW = c.hab >= 1 ? 1e9 : HAB.range * (c.hab / (1 - c.hab)) ** 2;
  c.dL = c.hab <= 0 ? 1e9 : HAB.range * ((1 - c.hab) / c.hab) ** 2;
  c.reach = Math.max(c.bw, c.bh) * 0.5 + 4;
  c.cap = 30 + 25 * c.size;
  c.poly = shapePoly(c);
  c.anch = anchors(c);
  c.p2 = new Path2D();
  c.poly.forEach((p, i) => (i ? c.p2.lineTo(p[0], p[1]) : c.p2.moveTo(p[0], p[1])));
  c.p2.closePath();
}
// energy burnt per second moving at speed v (the creator shows this), and in the world with temperature added
const moveBurn = (c, v) => 0.4 * c.size + 0.9 * c.size * (v / 30) ** 2;
// deep water costs more for creatures that aren't fully aquatic
function burn(c, v) {
  const i = cellI(clamp(c.x, 0, W - 1), clamp(c.y, 0, GH * CS - 1));
  return (moveBurn(c, v) + climate(c, i)) * (world.deep[i] ? 1 + SEA.deepCost * (1 - c.hab) : 1);
}
// extra energy per second for the temperature in cell i: keeping warm costs small bodies most, cooling down
// costs big bodies most
function climate(c, i) {
  const t = world.temp[i] + world.tOff + TEMP.season[S.season];
  if (t < TEMP.cold)
    return TEMP.coldCost * Math.min(1, (TEMP.cold - t) / TEMP.cold) * clamp(1.4 - 0.6 * c.size, 0.4, 1.2);
  if (t > TEMP.hot) return TEMP.heatCost * Math.min(1, (t - TEMP.hot) / (1 - TEMP.hot)) * c.size * c.size;
  return 0;
}
// bird's-eye body: length runs along the heading (+x), width across it; taper narrows the front
function shapePoly(c) {
  const L = c.bh,
    Wd = c.bw,
    tw = Math.max(0.6, Wd * (1 - c.taper * 0.97));
  const V = [
      [-L / 2, -Wd / 2],
      [L / 2, -tw / 2],
      [L / 2, tw / 2],
      [-L / 2, Wd / 2],
    ],
    R = c.round * Math.min(L, Wd) * 0.5 + 0.8,
    P = [];
  for (let i = 0; i < 4; i++) {
    const p = V[i],
      a = V[(i + 3) % 4],
      b = V[(i + 1) % 4];
    const l1 = Math.hypot(p[0] - a[0], p[1] - a[1]),
      l2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const r = Math.min(R, l1 * 0.5, l2 * 0.5);
    const s = [p[0] + ((a[0] - p[0]) / l1) * r, p[1] + ((a[1] - p[1]) / l1) * r],
      e = [p[0] + ((b[0] - p[0]) / l2) * r, p[1] + ((b[1] - p[1]) / l2) * r];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8,
        q = 1 - t;
      P.push([
        q * q * s[0] + 2 * q * t * p[0] + t * t * e[0],
        q * q * s[1] + 2 * q * t * p[1] + t * t * e[1],
      ]);
    }
  }
  return P;
}
// the outline's half-width at distance x along the body
function sideAt(P, x) {
  let best = 0;
  for (let k = 0; k < P.length; k++) {
    const [x1, y1] = P[k],
      [x2, y2] = P[(k + 1) % P.length];
    if (x1 === x2 || (x1 - x) * (x2 - x) > 0) continue;
    best = Math.max(best, y1 + ((y2 - y1) * (x - x1)) / (x2 - x1));
  }
  return best;
}
// legs in pairs along the sides only (none at the front or back), the front pair splayed forwards and the back
// pair backwards; on a pointed body the front pair moves back so it stays clear of the mouth
function anchors(c) {
  const m = c.legs / 2,
    L = c.bh / 2,
    r = 5 * mouthScale(c), // no leg closer than this to the root of the mouth
    xb = -0.55 * L,
    A = [];
  let xf = 0.4 * L;
  while (xf > xb + 0.3 * L && Math.hypot(L - xf, sideAt(c.poly, xf)) < r) xf -= 0.2;
  for (let k = 0; k < m; k++) {
    const x = xf + ((xb - xf) * k) / (m - 1),
      y = sideAt(c.poly, x),
      splay = 0.5 * (x / L);
    for (const s of [1, -1]) A.push([x, s * y, s * (Math.PI / 2 - splay)]);
  }
  return A;
}
function trace(g, P) {
  g.beginPath();
  P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
}
const jit = (v, m) => (rand() < 0.3 ? v : v + (rand() * 2 - 1) * m);
function makeChild(p, x, y, spread = 1) {
  const c = {
    id: nextId++,
    gen: p.gen + 1,
    parent: p.id,
    sp: p.sp,
    w: jit(p.w, 0.5 * VAR * spread),
    h: jit(p.h, 0.5 * VAR * spread),
    spd: jit(p.spd, 0.5 * VAR * spread),
    hab: jit(p.hab, 0.05 * VAR * spread),
    mth: jit(p.mth, 0.05 * VAR * spread),
    hue: jit(p.hue, 6 * spread),
    sat: p.sat,
    lt: jit(p.lt, 2.5 * spread),
    round: jit(p.round, 0.05 * spread),
    taper: jit(p.taper, 0.05 * spread),
    x,
    y,
    home: [x, y], // where it prefers to look for food (see HOME)
    dir: rand() * TAU,
    face: 1,
    wander: rand() * TAU,
    age: 0,
    births: 0,
    eaten: 0,
    pb: -1,
    rest: 0,
    target: null,
    rt: 0,
    blk: 0,
    born: S ? S.t : 0,
    burnNow: 0,
    walk: rand() * 10,
  };
  enforce(c);
  compute(c);
  c.E = c.cap * 0.5;
  return c;
}

// Survey-glyph style: pale body, ink outline, legs as short ink bars all round like map ticks.
// Longer bars mean more speed on land; wider, shorter bars mean a creature that leans towards water.
function drawCreature(g, c, x, y, sc, detail, fill, t, swim, lw) {
  const L = c.bh / 2,
    Wd = c.bw / 2;
  g.save();
  g.translate(x, y);
  g.rotate(c.dir);
  g.scale(sc, sc);
  g.lineJoin = 'round';
  if (swim && detail) {
    // wake: shallow arcs close behind, drifting outwards and fading
    const s = Math.max(0.7, c.bw / 15),
      ph = (t * 1.1 + c.id * 0.37) % 1;
    g.lineWidth = lw;
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const kk = k + ph,
        r = (11 + kk * 3.5) * s,
        apex = -L - 1.5 * s - kk * 2.4 * s,
        span = 0.38 + kk * 0.11, // each arc spans wider the further it is behind, so the wake spreads out
        a = Math.min(1, kk / 0.4) * Math.max(0, 0.75 - kk * 0.24);
      g.strokeStyle = `rgba(77,115,133,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(apex + r, 0, r, Math.PI - span, Math.PI + span);
      g.stroke();
    }
  }
  if (detail) drawMouth(g, c, L, t);
  g.strokeStyle = INK;
  if (detail) {
    const Lg = (2.2 + c.spd * 0.25) * (1 - c.hab * 0.4) * (swim ? 0.7 : 1),
      wd = 2 + c.hab * 1.6;
    g.lineCap = 'butt';
    g.lineWidth = wd;
    g.beginPath();
    c.anch.forEach(([ex, ey, a], k) => {
      if (swim && Math.cos(a) < 0) return;
      const sw = (swim ? Math.sin(t * 4 + k * Math.PI) : Math.sin(c.walk * 2.2 + k * Math.PI)) * 0.22,
        aa = a + sw;
      g.moveTo(ex + Math.cos(aa) * 0.8, ey + Math.sin(aa) * 0.8);
      g.lineTo(ex + Math.cos(aa) * (0.8 + Lg), ey + Math.sin(aa) * (0.8 + Lg));
    });
    g.stroke();
  }
  g.fillStyle = fill;
  g.fill(c.p2);
  if (swim) {
    // back half below the surface
    g.save();
    g.clip(c.p2);
    g.beginPath();
    g.moveTo(1, -Wd - 3);
    g.quadraticCurveTo(-2, 0, 1, Wd + 3);
    g.lineTo(-L - 6, Wd + 3);
    g.lineTo(-L - 6, -Wd - 3);
    g.closePath();
    g.fillStyle = '#a9c5cf';
    g.fill();
    g.globalAlpha = 0.12;
    g.fillStyle = fill;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(77,115,133,.9)';
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(1, -Wd - 3);
    g.quadraticCurveTo(-2, 0, 1, Wd + 3);
    g.stroke();
    g.restore();
    g.save();
    g.beginPath();
    g.rect(-0.5, -Wd - 6, L + 12, 2 * Wd + 12);
    g.clip();
    g.lineWidth = lw * 1.3;
    g.strokeStyle = INK;
    g.stroke(c.p2);
    g.restore();
  } else {
    g.lineWidth = lw * 1.3;
    g.stroke(c.p2);
  }
  if (detail) {
    const ex = L * 0.52 - c.taper * L * 0.24,
      half = Math.max(1.4, Math.min(c.bw * (1 - c.taper * 0.6) * 0.22, 3.2));
    g.fillStyle = INK;
    if (c.lt < 40 && fill === col(c)) g.fillStyle = '#fcfcfb';
    for (const s of [-1, 1]) g.fillRect(ex - 1.1, s * half - 1.1, 2.2, 2.2);
  }
  g.restore();
}

// the mouth changes shape smoothly with mth: values at mth = 0, 0.25, 0.5, 0.75 and 1, blended in between
const MOUTH_SHAPE = {
  len: [4.4, 4.9, 5.3, 5.6, 5.8], // length, longer towards the straw
  root: [1.35, 1.15, 0.95, 0.8, 0.75], // half-width where it joins the body
  bulge: [2.0, 1.3, 0.7, 0.25, 0], // how curved (claw-like) each jaw is
  tipY: [0.08, 0.35, 0.6, 0.5, 0.28], // how far each jaw's tip sits from the centre line
  th: [0.05, 0.25, 0.4, 0.5, 0.56], // thickness of each jaw at its tip
  rest: [0.04, 0.1, 0.14, 0.08, 0], // resting opening angle: tweezers and prongs stay a little open
  amp: [0.35, 0.22, 0.12, 0.06, 0], // how far the jaws swing: a big snap for the claw, a waggle for prongs
};
// the mouth's size goes with the body's
const mouthScale = c => clamp(Math.sqrt(c.bw * c.bh) / 12.5, 0.7, 1.8);
function mouthKey(name, m) {
  const v = MOUTH_SHAPE[name],
    p = Math.min(3.999, m * 4),
    i = Math.floor(p);
  return v[i] + (v[i + 1] - v[i]) * (p - i);
}
// two jaws at the front, drawn under the body; they snap quickly while the creature eats and open and close
// gently otherwise. From 0.75 to 1 the two prongs close together into one straw that flares slightly at the end.
function drawMouth(g, c, L, t) {
  const m = c.mth ?? 0.5,
    s = mouthScale(c),
    len = mouthKey('len', m),
    root = mouthKey('root', m),
    bulge = mouthKey('bulge', m),
    th = mouthKey('th', m),
    close = clamp((m - 0.75) / 0.2, 0, 1),
    tipY = mouthKey('tipY', m),
    tipOut = tipY + th / 2,
    flare = 0.7 * clamp((m - 0.75) / 0.25, 0, 1),
    tipIn = Math.max(0, tipY - th / 2) * (1 - close),
    eating = c.rest > 0,
    osc = 0.5 + 0.5 * Math.sin(eating ? t * 9 : t * 1.3 + c.id),
    swing = (mouthKey('rest', m) + mouthKey('amp', m) * osc * (eating ? 1 : 0.35)) * (1 - close);
  g.save();
  g.translate(L - 0.6 * s, 0);
  g.scale(s, s);
  g.lineJoin = 'round';
  g.lineWidth = 0.45;
  g.strokeStyle = INK;
  g.fillStyle = INK;
  for (const k of [-1, 1]) {
    g.save();
    g.rotate(k * swing * (k < 0 ? 1 : 0.4));
    g.beginPath();
    g.moveTo(0, k * root);
    g.bezierCurveTo(
      len * 0.25,
      k * (root + bulge),
      len * 0.8,
      k * (tipOut + bulge * 0.8),
      len,
      k * (tipOut + flare)
    );
    g.lineTo(len, k * tipIn);
    g.bezierCurveTo(len * 0.7, k * (tipIn + bulge * 0.25), len * 0.3, k * tipIn * 0.5, 0, k * tipIn * 0.3);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
  g.restore();
}
