/* Creature traits, how traits turn into abilities (speed, reach, energy), inheritance with small random
   changes, and how a creature is drawn.
   Body traits (affect survival): w width, h length, spd speed, hab habitat (0 = land, 1 = water).
   Look traits (drift by chance): hue, lt (lightness), round, taper, legs. */

/* ---------- creatures ---------- */
// Body (functional): w width, h height, spd speed, hab habitat 0 = land … 1 = water.  Look (neutral): hue, lt, round, taper, legs.
let nextId = 1;
function enforce(c) {
  c.w = clamp(c.w, 1, 7);
  c.h = clamp(c.h, 1, 7);
  c.spd = clamp(c.spd, 1, 10);
  c.hab = clamp(c.hab, 0, 1);
  c.round = clamp(c.round, 0, 1);
  c.taper = clamp(c.taper, 0, 1);
  c.legs = clamp(c.legs, 4, 8);
  c.lt = clamp(c.lt, 22, 82);
  c.hue = ((c.hue % 360) + 360) % 360;
}
function compute(c) {
  c.bw = 6 + c.w * 2.2;
  c.bh = 6 + c.h * 2.2;
  c.thick = Math.min(c.bw, c.bh);
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
function edgeAt(P, a) {
  let best = P[0],
    bd = 9;
  for (const p of P) {
    const d = Math.abs(((((Math.atan2(p[1], p[0]) - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
function anchors(c) {
  const n = Math.round(c.legs),
    A = [];
  for (let k = 0; k < n; k++) {
    const a = 0.6 + ((k + 0.5) / n) * (TAU - 1.2),
      e = edgeAt(c.poly, a);
    A.push([e[0], e[1], a]);
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
    hue: jit(p.hue, 6 * spread),
    sat: p.sat,
    lt: jit(p.lt, 2.5 * spread),
    round: jit(p.round, 0.05 * spread),
    taper: jit(p.taper, 0.05 * spread),
    legs: p.legs,
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
