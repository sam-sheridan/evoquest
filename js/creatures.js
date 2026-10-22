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

// Survey-glyph style: pale body, ink outline, and hair-like legs: tapering ink strokes from the body's edge, longer
// for faster creatures. Their outer half swings back and forth while the base stays still: land creatures flip the
// tip like a hinge, water creatures ripple a wave out along the leg, and creatures in between do a bit of both.
// A leg starts a little inside the body (straight in from the edge), so the body always covers its base however far
// it bends.
function drawLeg(g, ex, ey, dir, len, w0, bend) {
  const N = 12,
    r = Math.hypot(ex, ey) || 1,
    nx = ex / r,
    ny = ey / r,
    inset = w0 * 0.6 + 1.2,
    // a short stem from inside the body straight out to the edge (hidden under the body, so the base never shows
    // even when the leg lies almost along the edge), then the leg proper from the edge
    P = [ex - nx * inset - (ny * w0) / 2, ey - ny * inset + (nx * w0) / 2],
    Q = [ex - nx * inset + (ny * w0) / 2, ey - ny * inset - (nx * w0) / 2];
  let x = ex,
    y = ey;
  for (let i = 0; i <= N; i++) {
    const s = i / N,
      d = dir + bend(s),
      w = (w0 * Math.pow(1 - s, 0.85) + 0.3) / 2;
    if (i) {
      x += (Math.cos(d) * len) / N;
      y += (Math.sin(d) * len) / N;
    }
    P.push(x - Math.sin(d) * w, y + Math.cos(d) * w);
    Q.push(x + Math.sin(d) * w, y - Math.cos(d) * w);
  }
  g.moveTo(P[0], P[1]);
  for (let i = 2; i < P.length; i += 2) g.lineTo(P[i], P[i + 1]);
  for (let i = Q.length - 2; i >= 0; i -= 2) g.lineTo(Q[i], Q[i + 1]);
  g.closePath();
}
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
    const h = c.hab,
      len = (6.5 + c.spd * 0.3) * (1 - 0.15 * h) * (swim ? 0.85 : 1),
      w0 = 2.1 + 0.9 * h;
    g.fillStyle = INK;
    g.beginPath();
    c.anch.forEach(([ex, ey, a], k) => {
      if (swim && Math.cos(a) < 0) return;
      const a0 = ((a % TAU) + TAU) % TAU,
        side = a0 < Math.PI ? 1 : -1, // bending towards the tail is +side
        // front legs point forwards on land; the more aquatic, the more they start out sideways instead, so a water
        // creature's front legs don't head towards the head before curving back
        fwd = side > 0 ? Math.max(0, Math.PI / 2 - a0) : Math.max(0, a0 - 1.5 * Math.PI),
        base = a0 + side * fwd * h,
        // how far the leg turns back towards the tail: a little on land, a lot in water
        sweep = Math.abs(Math.PI - base) * (0.1 + 0.55 * h),
        ph = (swim ? t * 5 : c.walk * 2.2) + k * Math.PI; // neighbouring legs swing in opposite phase
      // one swing whose wave spreads further along the leg the more aquatic it is: a hinge flip on land, a ripple
      // travelling out to the tip in water, and every creature keeps the full swing
      drawLeg(
        g,
        ex,
        ey,
        base,
        len,
        w0,
        // the leg leaves the body straight out (its thick base square to the edge), turns back over its first
        // half, and its outer part swings
        s => {
          const u = clamp((s - 0.08) / 0.45, 0, 1),
            // in water the inner third of the leg stays out of the swing, so it never arches towards the head
            o = clamp((s - 0.3 * h) / (1 - 0.3 * h), 0, 1);
          return (
            side *
            (sweep * u * u * (3 - 2 * u) + (1.25 + 0.05 * h) * Math.sin(ph - s * 4.2 * h) * o * o + 0.22 * s)
          );
        }
      );
    });
    g.fill();
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
