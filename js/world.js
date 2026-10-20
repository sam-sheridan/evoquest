/* World generation: terrain heights, coastlines, rivers, thickets, rocks, craters, food sites and the distance
   fields creatures use to decide where they may go.
   Cell types: 0 sea, 1 land, 2 thicket, 3 rock, 4 river. */

/* ---------- world ---------- */
// types: 0 sea, 1 land, 2 thicket, 3 rock, 4 river
let world = null;
const isLand = t => t === 1 || t === 2 || t === 3,
  isWater = t => t === 0 || t === 4;
const border = i => {
  const x = i % GW,
    y = (i / GW) | 0;
  return x < EDGE || y < EDGE || x >= GW - EDGE || y >= GH - EDGE;
};
function makeChannel(rng) {
  const horiz = rng() < 0.5,
    pts = [];
  let p = (horiz ? GH : GW) * (0.25 + rng() * 0.5);
  const len = horiz ? GW : GH;
  for (let k = 0; k <= 16; k++) {
    const a = -3 + (k * (len + 6)) / 16;
    p += (rng() - 0.5) * 6;
    pts.push(horiz ? [a, p] : [p, a]);
  }
  return { pts, w: 1.15 + rng() * 0.45 };
}
function genWorld(seed, att = 0) {
  const rng = mulberry32(seed + att * 7777);
  const fo = field(rng, [
      [2, 0.4],
      [4, 0.35],
      [9, 0.25],
    ]),
    fo2 = field(rng, [
      [3, 0.6],
      [7, 0.4],
    ]),
    fh = field(rng, [
      [4, 0.5],
      [8, 0.3],
      [17, 0.2],
    ]),
    ft = field(rng, [
      [20, 0.7],
      [38, 0.3],
    ]),
    fr = field(rng, [
      [25, 0.6],
      [45, 0.4],
    ]),
    ff = field(rng, [
      [6, 0.6],
      [14, 0.4],
    ]),
    fg = field(rng, [[5, 1]]);
  const N = GW * GH,
    hgt = new Float32Array(N),
    thk = new Float32Array(N),
    rck = new Float32Array(N),
    fert = new Float32Array(N),
    gapN = new Float32Array(N);
  // a strait always splits the world into two landmasses; it is deep enough that droughts never close it
  const vert = rng() < 0.7,
    ang = (vert ? Math.PI / 2 : 0) + (rng() - 0.5) * 0.7,
    cx = GW * (0.4 + rng() * 0.2),
    cy = GH * (0.4 + rng() * 0.2),
    nx = -Math.sin(ang),
    ny = Math.cos(ang),
    wob = rng() * 6;
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x,
        u = (x + 0.5) / GW,
        v = (y + 0.5) / GH;
      const wu = u + (fo2(u, v) - 0.5) * 0.22,
        wv = v + (fo2(v, u) - 0.5) * 0.22,
        dx = (wu - 0.5) * 2,
        dy = (wv - 0.5) * 2,
        rr = Math.hypot(dx * 0.92, dy) + (fo(u, v) - 0.5) * 1.25,
        fall = clamp((rr - 0.3) / 0.55, 0, 1);
      const edgeCells = Math.min(x, y, GW - 1 - x, GH - 1 - y),
        hard = clamp((EDGE + 12 - edgeCells) / 13, 0, 1);
      const along = (x - cx) * Math.cos(ang) + (y - cy) * Math.sin(ang),
        sd = (x - cx) * nx + (y - cy) * ny + Math.sin(along * 0.18 + wob) * 2.5;
      hgt[i] = fh(u, v) * 1.25 - fall * 0.95 - hard * hard * 0.9 - 1.5 * Math.exp(-((sd / 3) ** 2));
      thk[i] = ft(u, v);
      rck[i] = fr(u, v);
      fert[i] = ff(u, v);
      gapN[i] = fg(u, v);
    }
  world = {
    seed,
    hgt,
    thk,
    rck,
    fert,
    gapN,
    type: new Uint8Array(N),
    gap: new Uint8Array(N),
    comp: new Int16Array(N),
    fl: new Float32Array(N),
    dLand: null,
    dWater: null,
    landFrac: 0.36 + rng() * 0.06,
    channels: [],
    craters: [],
    level: 0,
    tThr: quant(thk, 0.79),
    rThr: quant(rck, 0.9),
    fLo: quant(fert, 0.1),
    fHi: quant(fert, 0.92),
    gLo: quant(gapN, 0.34),
    gHi: quant(gapN, 0.67),
  };
  if (rng() < 0.85) world.channels.push(makeChannel(rng));
  if (rng() < 0.55) world.channels.push(makeChannel(rng));
  buildTerrain();
  // must be two decent landmasses; otherwise try again with a variation of the same seed
  if (att < 5) {
    const cnt = {};
    for (const c of world.comp) if (c >= 0) cnt[c] = (cnt[c] || 0) + 1;
    const sz = Object.values(cnt).sort((a, b) => b - a);
    if (!(sz[1] >= Math.max(500, sz[0] * 0.25))) return genWorld(seed, att + 1);
  }
  world.sites = [];
  let tries = 0,
    nl = 0,
    nw = 0;
  while (nl < 300 && tries < 60000) {
    tries++;
    const x = rng() * W,
      y = rng() * H,
      i = cellI(x, y),
      t = world.type[i];
    if (t !== 1 && t !== 2) continue;
    let f = clamp((world.fert[i] - world.fLo) / (world.fHi - world.fLo), 0, 1);
    if (t === 2) f = Math.min(1, f * 0.6 + (world.gap[i] === 10 ? 0.65 : world.gap[i] === 13 ? 0.5 : 0.35));
    if (world.comp[i] !== world.main) f = Math.min(1, f + 0.35);
    if (rng() < f * f * 0.9 + 0.04) {
      world.sites.push({ x, y, i, kind: 'l', active: true, t: 0 });
      nl++;
    }
  }
  tries = 0;
  while (nw < 100 && tries < 60000) {
    tries++;
    const x = rng() * W,
      y = rng() * H,
      i = cellI(x, y),
      t = world.type[i];
    if (!isWater(t) || border(i)) continue;
    if (t === 0 && world.dLand[i] > 56) continue;
    world.sites.push({ x, y, i, kind: 'w', active: true, t: 0 });
    nw++;
  }
}
function distPoly(px, py, pts) {
  let m = 1e9;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k],
      [bx, by] = pts[k + 1],
      dx = bx - ax,
      dy = by - ay;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1),
      ex = ax + dx * t - px,
      ey = ay + dy * t - py;
    m = Math.min(m, ex * ex + ey * ey);
  }
  return Math.sqrt(m);
}
function distField(src) {
  const N = GW * GH,
    d = new Float32Array(N),
    D = CS,
    D2 = CS * 1.4142;
  for (let i = 0; i < N; i++) d[i] = src(i) ? 0 : 1e9;
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + D);
      if (y > 0) {
        v = Math.min(v, d[i - GW] + D);
        if (x > 0) v = Math.min(v, d[i - GW - 1] + D2);
        if (x < GW - 1) v = Math.min(v, d[i - GW + 1] + D2);
      }
      d[i] = v;
    }
  for (let y = GH - 1; y >= 0; y--)
    for (let x = GW - 1; x >= 0; x--) {
      const i = y * GW + x;
      let v = d[i];
      if (x < GW - 1) v = Math.min(v, d[i + 1] + D);
      if (y < GH - 1) {
        v = Math.min(v, d[i + GW] + D);
        if (x < GW - 1) v = Math.min(v, d[i + GW + 1] + D2);
        if (x > 0) v = Math.min(v, d[i + GW - 1] + D2);
      }
      d[i] = v;
    }
  return d;
}
function buildTerrain() {
  const w = world,
    N = GW * GH;
  w.level = quant(w.hgt, 1 - w.landFrac);
  for (let i = 0; i < N; i++) {
    let t = w.hgt[i] >= w.level ? 1 : 0;
    if (border(i)) t = 0;
    if (t) {
      if (w.thk[i] >= w.tThr) t = 2;
      else if (w.rck[i] >= w.rThr) t = 3;
    }
    w.type[i] = t;
    w.gap[i] = w.gapN[i] < w.gLo ? 10 : w.gapN[i] < w.gHi ? 13 : 16;
  }
  for (const ch of w.channels)
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (w.type[i] !== 1 && w.type[i] !== 2) continue;
        if (distPoly(x + 0.5, y + 0.5, ch.pts) < ch.w) w.type[i] = 4;
      }
  // craters keep smooth signed distances (rim and lake) so their outlines can be drawn as curves rather than grid steps
  w.cS = new Float32Array(N).fill(-99);
  w.lS = new Float32Array(N).fill(-99);
  for (const c of w.craters)
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x,
          d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
        if (d > (c.r || 2.7) * 1.5 + 3) continue;
        const a = (Math.atan2(y + 0.5 - c.y, x + 0.5 - c.x) + TAU) % TAU,
          p = c.p || [0, 0, 0],
          wob =
            1 + 0.16 * Math.sin(3 * a + p[0]) + 0.09 * Math.sin(5 * a + p[1]) + 0.05 * Math.sin(9 * a + p[2]),
          R = (c.r || 2.7) * wob,
          th = 0.55 + 0.35 * (Math.sin(4 * a + p[1]) * 0.5 + 0.5);
        let s = th - Math.abs(d - R);
        const ga = (a - c.gap + 0.25 + TAU) % TAU;
        if (ga < 0.5) s = Math.min(s, -0.3 - (0.25 - Math.abs(ga - 0.25)) * 2);
        const ls = c.r ? R * (0.38 + 0.1 * Math.sin(2 * a + p[2])) - d : -99;
        w.cS[i] = Math.max(w.cS[i], s);
        w.lS[i] = Math.max(w.lS[i], ls);
        if (w.type[i] === 0) continue;
        if (s > 0) w.type[i] = 3;
        else if (ls > 0) w.type[i] = 4;
        else if (d < R && w.type[i] === 3) w.type[i] = 1;
      }
  w.comp.fill(-1);
  const sizes = [];
  let id = 0;
  for (let i = 0; i < N; i++) {
    if (w.comp[i] !== -1 || (w.type[i] !== 1 && w.type[i] !== 2)) continue;
    let n = 0;
    const st = [i];
    w.comp[i] = id;
    while (st.length) {
      const j = st.pop();
      n++;
      const x = j % GW,
        y = (j / GW) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + dx,
          yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
        const k = yy * GW + xx;
        if (w.comp[k] === -1 && (w.type[k] === 1 || w.type[k] === 2)) {
          w.comp[k] = id;
          st.push(k);
        }
      }
    }
    sizes.push(n);
    id++;
  }
  const ord = sizes.map((n, i) => [n, i]).sort((a, b) => b[0] - a[0]);
  w.main = ord.length ? ord[0][1] : 0;
  w.second = ord.length > 1 ? ord[1][1] : w.main;
  w.dLand = distField(i => isLand(w.type[i]));
  w.dWater = distField(i => isWater(w.type[i]));
  for (let i = 0; i < N; i++) {
    const t = w.type[i];
    w.fl[i] = isLand(t)
      ? Math.max(w.hgt[i], w.level + 0.004)
      : t === 4
        ? w.level - 0.03
        : Math.min(w.hgt[i], w.level - 0.004);
  }
  for (let i = 0; i < N; i++) if (w.lS[i] > -1.5 && w.type[i] !== 0) w.fl[i] = w.level - w.lS[i] * 0.03;
  renderTerrain();
}
const cellI = (x, y) => ((y / CS) | 0) * GW + ((x / CS) | 0);
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < GH * CS;
function cellT(x, y) {
  if (!inside(x, y)) return 3;
  return world.type[cellI(x, y)];
}
