/* Drawing the map: turns the terrain grid into smooth vector shapes (marching squares), paints them in the
   field-notebook style, keeps sharp and low-detail copies for different zoom levels, and draws food. */

const tcan = document.createElement('canvas');
tcan.width = W * TS;
tcan.height = H * TS;
const tlo = document.createElement('canvas');
tlo.width = (W * LO) | 0;
tlo.height = (H * LO) | 0;
function bakeLo() {
  const g = tlo.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(tcan, 0, 0, tlo.width, tlo.height);
}
const detail = {
  can: document.createElement('canvas'),
  can2: document.createElement('canvas'),
  x: 0,
  y: 0,
  z: 0,
  ok: false,
};
let camMoved = 0;
function march(fv, thr, wantFill, wantLine) {
  const fill = new Path2D(),
    line = new Path2D();
  for (let y = 0; y < GH - 1; y++)
    for (let x = 0; x < GW - 1; x++) {
      const P = [
          [x, y],
          [x + 1, y],
          [x + 1, y + 1],
          [x, y + 1],
        ],
        V = P.map(([a, b]) => fv(b * GW + a));
      const ins = V.map(v => v >= thr);
      const cnt = ins.filter(Boolean).length;
      const px = a => (a + 0.5) * CS;
      if (cnt === 0) continue;
      if (cnt === 4) {
        if (wantFill) fill.rect(px(x), px(y), CS + 0.6, CS + 0.6);
        continue;
      }
      const poly = [],
        cross = [];
      for (let k = 0; k < 4; k++) {
        const a = P[k],
          b = P[(k + 1) % 4],
          va = V[k],
          vb = V[(k + 1) % 4];
        if (ins[k]) poly.push([px(a[0]), px(a[1])]);
        if (ins[k] !== ins[(k + 1) % 4]) {
          const f = (thr - va) / (vb - va);
          const q = [px(a[0] + (b[0] - a[0]) * f), px(a[1] + (b[1] - a[1]) * f)];
          poly.push(q);
          cross.push(q);
        }
      }
      if (wantFill) {
        fill.moveTo(poly[0][0], poly[0][1]);
        for (let k = 1; k < poly.length; k++) fill.lineTo(poly[k][0], poly[k][1]);
        fill.closePath();
      }
      if (wantLine)
        for (let k = 0; k + 1 < cross.length; k += 2) {
          line.moveTo(cross[k][0], cross[k][1]);
          line.lineTo(cross[k + 1][0], cross[k + 1][1]);
        }
    }
  return { fill, line };
}
function hatch(g, clip, spacing, colr, lw, ang = 1) {
  g.save();
  g.clip(clip);
  g.strokeStyle = colr;
  g.lineWidth = lw;
  g.beginPath();
  for (let k = -H; k < W + H; k += spacing) {
    g.moveTo(k, 0);
    g.lineTo(k + H * ang, H);
  }
  g.stroke();
  g.restore();
}
// terrain is kept as vector paths so it can be redrawn sharply at any zoom
function renderTerrain() {
  const w = world,
    N = GW * GH,
    T = w.type,
    V = {};
  const sea = i => (T[i] === 0 ? 200 - w.dLand[i] : 200);
  V.bands = [110, 64, 30].map(d => march(sea, 200 - d, true, false).fill);
  V.river = march(
    i => (w.lS[i] > -2.5 && T[i] !== 0 ? clamp(0.5 + w.lS[i] * 0.35, 0, 1) : T[i] === 4 ? 1 : 0),
    0.5,
    true,
    false
  ).fill;
  const land = march(i => w.fl[i], w.level, true, true);
  V.land = land.fill;
  V.coast = land.line;
  V.mead = march(
    i => (T[i] === 1 && w.comp[i] >= 0 ? (w.fert[i] - w.fLo) / (w.fHi - w.fLo) : 0),
    0.62,
    true,
    false
  ).fill;
  const thick = march(
    i =>
      T[i] === 2
        ? Math.max(w.thk[i], w.tThr + 0.002)
        : T[i] === 1 || T[i] === 3
          ? Math.min(w.thk[i], w.tThr - 0.002)
          : 0,
    w.tThr,
    true,
    true
  );
  V.thick = thick.fill;
  V.thickL = thick.line;
  const r = mulberry32(w.seed ^ 0xd07);
  V.dots = new Path2D();
  for (let i = 0; i < N; i++)
    if (T[i] === 2) {
      const keep = w.gap[i] === 10 ? 0.9 : w.gap[i] === 13 ? 0.62 : 0.4,
        x0 = (i % GW) * CS,
        y0 = ((i / GW) | 0) * CS;
      for (let yy = 1.6; yy < CS; yy += 3.2)
        for (let xx = 1.6; xx < CS; xx += 3.2)
          if (r() < keep) {
            const x = x0 + xx + (r() - 0.5) * 2.4,
              y = y0 + yy + (r() - 0.5) * 2.4;
            V.dots.moveTo(x + 1.15, y);
            V.dots.arc(x, y, 1.15, 0, TAU);
          }
    }
  let rMax = w.rThr;
  for (let i = 0; i < N; i++) if (T[i] === 3 && w.rck[i] > rMax) rMax = w.rck[i];
  const rs = (rMax - w.rThr) / 4.2;
  // elevation used for contours: in 'steep' mode rocks rise sharply out of the land, so contour lines bunch around them
  let tMax = w.tThr;
  for (let i = 0; i < N; i++) if (T[i] === 2 && w.thk[i] > tMax) tMax = w.thk[i];
  const t0 = w.tThr - 0.03;
  if (!w.refH) {
    const a = [];
    for (let i = 0; i < N; i++) if (isLand(T[i])) a.push(w.hgt[i]);
    w.refH = Float32Array.from(a).sort();
  }
  const R = w.refH,
    cdf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (!isLand(T[i])) continue;
    const v = w.hgt[i];
    let lo = 0,
      hi = R.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (R[m] < v) lo = m + 1;
      else hi = m;
    }
    cdf[i] = lo / R.length;
  }
  const r0 = w.rThr - 0.035,
    el = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = T[i];
    el[i] = !isLand(t)
      ? 0
      : cdf[i] +
        clamp((w.rck[i] - r0) / (rMax - r0), 0, 1) ** 1.3 * 1.7 -
        clamp((w.thk[i] - t0) / (tMax - t0), 0, 1) ** 1.2 * 0.22;
  } // thickets sit in hollows
  const fn = i => (w.fert[i] - w.fLo) / (w.fHi - w.fLo);
  V.dry = march(i => (T[i] === 1 ? 1 - fn(i) : 0), 0.62, true, false).fill;
  V.tint = [
    [0.35, '#e5e7d4'],
    [0.6, '#e1dfca'],
    [0.82, '#dbd5bd'],
  ].map(([d, c]) => [march(i => (isLand(T[i]) ? cdf[i] : 0), d, true, false).fill, c]);
  const rf0 = i =>
    T[i] === 3
      ? Math.max(w.rck[i], w.rThr + 0.002)
      : T[i] === 1 || T[i] === 2
        ? Math.min(w.rck[i], w.rThr - 0.002)
        : 0;
  const rf = i => {
    if (w.cS[i] > -2.5 && T[i] !== 0 && T[i] !== 4) {
      const vc = w.rThr + w.cS[i] * 0.02;
      return T[i] === 3 && w.rck[i] >= w.rThr ? Math.max(rf0(i), vc) : vc;
    }
    return rf0(i);
  };
  V.rings = [0, 1, 2, 3].map(k => march(rf, w.rThr + k * rs, true, true));
  V.cont = new Path2D();
  for (let k = 1; k <= 24; k++)
    V.cont.addPath(march(i => (T[i] === 0 || T[i] === 4 ? 0 : el[i]), k / 9, false, true).line);
  V.chev = new Path2D();
  for (const ch of w.channels) {
    for (let k = 0; k < ch.pts.length - 1; k++) {
      const [ax, ay] = ch.pts[k],
        [bx, by] = ch.pts[k + 1],
        len = Math.hypot(bx - ax, by - ay) * CS,
        a = Math.atan2(by - ay, bx - ax),
        ca = Math.cos(a),
        sa = Math.sin(a);
      for (let s = 10; s < len; s += 34) {
        const x = (ax + ((bx - ax) * s) / len) * CS,
          y = (ay + ((by - ay) * s) / len) * CS;
        if (cellT(x, y) !== 4) continue;
        const P = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
        const p1 = P(-3, -3.5),
          p2 = P(2, 0),
          p3 = P(-3, 3.5);
        V.chev.moveTo(...p1);
        V.chev.lineTo(...p2);
        V.chev.lineTo(...p3);
      }
    }
  }
  w.vec = V;
  const g = tcan.getContext('2d');
  g.setTransform(TS, 0, 0, TS, 0, 0);
  paintTerrain(g);
  paintStipple(g);
  bakeLo();
  detail.ok = false;
  if (typeof S !== 'undefined' && S) for (const c of S.creatures) c.rt = 0;
}
function paintTerrain(g) {
  const V = world.vec;
  g.fillStyle = BAND[3];
  g.fillRect(0, 0, W, H);
  g.fillStyle = BAND[2];
  g.fill(V.bands[0]);
  g.fillStyle = BAND[1];
  g.fill(V.bands[1]);
  g.fillStyle = BAND[0];
  g.fill(V.bands[2]);
  g.fillStyle = BAND[0];
  g.fill(V.river);
  g.fillStyle = '#e9ecde';
  g.fill(V.land);
  const se = typeof S !== 'undefined' && S ? S.season : 0;
  g.save();
  g.clip(V.land);
  for (const [p, c] of V.tint) {
    g.fillStyle = c;
    g.fill(p);
  }
  if (se === 1) {
    g.fillStyle = 'rgba(232,203,112,.42)';
    g.fill(V.dry);
    g.fillStyle = 'rgba(226,196,104,.22)';
    g.fill(V.tint[1] ? V.tint[1][0] : V.dry);
  }
  if (se === 3) {
    g.fillStyle = 'rgba(226,234,238,.32)';
    g.fillRect(0, 0, W, H);
    if (V.tint[2]) {
      g.fillStyle = 'rgba(244,247,248,.7)';
      g.fill(V.tint[2][0]);
    }
  }
  g.fillStyle = [
    'rgba(196,220,170,.7)',
    'rgba(205,220,180,.35)',
    'rgba(218,212,170,.45)',
    'rgba(205,214,196,.35)',
  ][se];
  g.fill(V.mead);
  g.fillStyle = ['#bdd0a6', '#bdd0a6', '#c6c99c', '#b6c2aa'][se];
  g.fill(V.thick);
  g.strokeStyle = '#47643a';
  g.lineWidth = 1;
  g.stroke(V.thickL);
  g.restore();
  const RF =
    se === 3 ? ['#cfc8bb', '#bfb7a8', '#e9eeef', '#fbfcfc'] : ['#cfc8bb', '#bfb7a8', '#aea595', '#9d9483']; // winter: snow on the peaks
  V.rings.forEach((r, k) => {
    g.fillStyle = RF[k];
    g.fill(r.fill);
  });
  g.save();
  g.strokeStyle = 'rgba(21,25,24,.14)';
  g.lineWidth = 0.8;
  g.stroke(V.cont);
  g.clip(V.rings[0].fill);
  g.strokeStyle = 'rgba(60,55,48,.45)';
  g.lineWidth = 0.9;
  g.stroke(V.cont);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke(V.rings[0].line);
  g.strokeStyle = 'rgba(21,25,24,.75)';
  g.lineWidth = 1.2;
  g.stroke(V.coast);
  g.strokeStyle = '#4d7385';
  g.lineWidth = 1.2;
  g.lineJoin = 'round';
  g.stroke(V.chev);
}
// thicket stipple lives on its own layer, drawn over creatures and food so they look tucked into the bushes
function paintStipple(g) {
  const V = world.vec;
  g.save();
  g.clip(V.land);
  g.clip(V.thick);
  g.fillStyle = '#34502b';
  g.fill(V.dots);
  g.restore();
}

// when zoomed past the base texture's resolution, redraw the visible area from vectors (twice the screen, so panning stays sharp)
function blitVisible(can, ox, oy) {
  const sx = Math.round(dpr * (cw / 2 - ox)),
    sy = Math.round(dpr * (ch / 2 - oy)),
    w = Math.round(cw * dpr),
    h = Math.round(ch * dpr);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(can, sx, sy, w, h, 0, 0, w, h);
  ctx.restore();
}
function drawStipple(det) {
  blitVisible(detail.can2, det[0], det[1]);
}
function drawBerry(g, x, y, p) {
  g.save();
  g.translate(x, y);
  g.scale(2.5, 2.5);
  const r = 0.45 + 0.9 * p;
  if (p >= 0.5) {
    g.fillStyle = '#5f7d4e';
    g.beginPath();
    g.ellipse(1.1, -1.1, 0.95 * p, 0.45 * p, -0.7, 0, TAU);
    g.fill();
  }
  g.strokeStyle = INK;
  g.lineWidth = 0.28;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  if (p >= 1) {
    g.fillStyle = '#D55E00';
    g.fill();
  } else if (p > 0) {
    g.fillStyle = 'rgba(213,94,0,.28)';
    g.fill();
  }
  g.stroke();
  g.restore();
}
function drawAlgae(g, x, y, p) {
  g.save();
  g.translate(x, y);
  g.scale(2.5, 2.5);
  const L = 0.8 + 2.2 * p;
  g.strokeStyle = p >= 1 ? '#009E73' : '#D9C21E';
  g.lineWidth = 0.5;
  g.lineCap = 'round';
  for (const a of [-0.55, 0, 0.55]) {
    g.beginPath();
    g.moveTo(0, 1);
    g.quadraticCurveTo(Math.sin(a) * L * 0.4 + a * 0.6, 1 - L * 0.6, Math.sin(a) * L * 0.9, 1 - L);
    g.stroke();
  }
  g.fillStyle = INK;
  g.beginPath();
  g.arc(0, 1, 0.32, 0, TAU);
  g.fill();
  g.restore();
}
function snapMap() {
  const mk = src => {
    const c = document.createElement('canvas');
    c.width = (W * LO) | 0;
    c.height = (H * LO) | 0;
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c;
  };
  return mk(tcan);
}
function seasonFade() {
  const old = snapMap();
  const g = tcan.getContext('2d');
  g.setTransform(TS, 0, 0, TS, 0, 0);
  paintTerrain(g);
  paintStipple(g);
  bakeLo();
  detail.ok = false;
  S.fade = { t: 0, a: old, dur: 2.5 };
}
function startFade(old) {
  if (S) S.fade = { t: 0, a: old, dur: 3 };
}
