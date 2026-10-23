/* World generation: terrain heights, coastlines, rivers, thickets, rocks, craters, food sites and the distance
   fields creatures use to decide where they may go.
   Cell types: 0 sea, 1 land, 2 thicket, 3 rock, 4 river. */

/* ---------- world ---------- */
// types: 0 sea, 1 land, 2 thicket, 3 rock, 4 river
let world = null;
const isLand = t => t === 1 || t === 2 || t === 3,
  isWater = t => t === 0 || t === 4;
// how far a cell is inside the oval edge of the map, in cells (roughly; exact on the axes)
function edgeDist(x, y) {
  const dx = x + 0.5 - GW / 2,
    dy = y + 0.5 - GH / 2,
    e = Math.hypot(dx / (GW / 2), dy / (GH / 2)),
    rc = Math.hypot(dx, dy);
  return e < 1e-6 ? GH / 2 : (rc * (1 - e)) / e;
}
const border = i => edgeDist(i % GW, (i / GW) | 0) < EDGE;
// a split from coast to coast at any angle, meandering along its length: a river, or a wider sea channel
function makeChannel(rng, sea = false) {
  const ang = rng() * Math.PI,
    cx = GW * (0.25 + rng() * 0.5),
    cy = GH * (0.25 + rng() * 0.5),
    dx = Math.cos(ang),
    dy = Math.sin(ang),
    half = Math.hypot(GW, GH) / 2 + 4,
    // two waves of different lengths make a meander that doesn't look regular
    f1 = 1 + rng() * 1.5,
    f2 = 2.5 + rng() * 2.5,
    a1 = (4 + rng() * 6) * (GH / 131), // bends scale with the map, so big maps don't get straighter rivers
    a2 = (1.5 + rng() * 2.5) * (GH / 131),
    p1 = rng() * TAU,
    p2 = rng() * TAU,
    all = [];
  for (let k = 0; k <= 40; k++) {
    const s = -half + (2 * half * k) / 40,
      u = s / half,
      off = a1 * Math.sin(f1 * Math.PI * u + p1) + a2 * Math.sin(f2 * Math.PI * u + p2) + (rng() - 0.5) * 1.5;
    all.push([cx + dx * s - dy * off, cy + dy * s + dx * off]);
  }
  // keep only the stretch over the map (plus one point either side), so terrain building stays quick
  const on = ([x, y]) => x > -4 && y > -4 && x < GW + 4 && y < GH + 4,
    a = Math.max(0, all.findIndex(on) - 1),
    b = Math.min(all.length - 1, all.findLastIndex(on) + 1);
  return { pts: all.slice(a, b + 1), w: sea ? 2.6 + rng() * 1.2 : 1.15 + rng() * 0.45, sea };
}
// the world type and shape come from the seed alone, so they stay the same when a world has to be remade
function rollWorld(seed) {
  const r = mulberry32((seed ^ 0x2c1b3c6d) >>> 0),
    pick = wts => {
      const e = Object.entries(wts);
      let x = r() * e.reduce((a, [, v]) => a + v, 0);
      for (const [k, v] of e) if ((x -= v) <= 0) return k;
      return e[0][0];
    };
  const kind = pick(Object.fromEntries(Object.entries(WORLD_TYPES).map(([k, t]) => [k, t.w])));
  return { kind, shape: pick(SHAPES) };
}
function genWorld(seed, att = 0) {
  const rng = mulberry32(seed + att * 7777),
    { kind, shape } = rollWorld(seed),
    T = WORLD_TYPES[kind],
    // a second random stream for what world types and shapes add, so a classic oval world keeps the layout it
    // had before types existed
    rx = mulberry32(seed * 7 + 99991 + att * 131),
    fi = field(rx, [
      [10, 0.5],
      [17, 0.3],
      [29, 0.2],
    ]),
    // relief: ridges, hills and valleys on land
    fR = field(rx, [
      [10, 0.6],
      [21, 0.4],
    ]),
    bay = rx() * TAU, // which side a crescent's bay opens towards
    split = rx() < T.split,
    nSeas = T.seas[0] + Math.floor(rx() * (T.seas[1] - T.seas[0] + 1));
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
      [6, 0.5],
      [12, 0.3],
      [26, 0.2],
    ]),
    ft = field(rng, [
      [30, 0.7],
      [57, 0.3],
    ]),
    fr = field(rng, [
      [38, 0.6],
      [68, 0.4],
    ]),
    ff = field(rng, [
      [9, 0.6],
      [21, 0.4],
    ]),
    // once set thicket gap widths; no longer used, but still made so every world number keeps its layout
    fg = field(rng, [[8, 1]]),
    // regions: broad patterns that make some areas thicket country, some rocky, some low and wet
    rT = field(rng, [
      [3, 0.6],
      [5, 0.4],
    ]),
    rR = field(rng, [
      [3, 0.6],
      [5, 0.4],
    ]),
    rW = field(rng, [
      [2, 0.5],
      [4, 0.5],
    ]),
    fl = field(rng, [
      [14, 0.6],
      [27, 0.4],
    ]);
  const N = GW * GH,
    hgt = new Float32Array(N),
    thk = new Float32Array(N),
    rck = new Float32Array(N),
    fert = new Float32Array(N);
  // a strait splits the world into two landmasses at the start; it is shallow enough that droughts can close it
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
        r0 = Math.hypot(dx * 0.92, dy),
        rr = r0 + (fo(u, v) - 0.5) * 1.25,
        fall = clamp((rr - 0.3) / 0.55, 0, 1),
        // lagoon: a broad hollow in the middle leaves the land as a ring around a central sea; crescent: a bigger
        // hollow pushed off to one side, so the land curves round a bay open to the sea
        rb = Math.hypot(dx * 0.92 - Math.cos(bay) * 0.55, dy - Math.sin(bay) * 0.55),
        lagoon =
          shape === 'lagoon'
            ? 1.1 * Math.exp(-((r0 / 0.38) ** 2))
            : shape === 'crescent'
              ? 1.3 * Math.exp(-((rb / 0.5) ** 2))
              : 0,
        I = T.isles;
      // the oval edge is roughened by the same warp as the coast, so it never reads as a clean ellipse
      const hard = clamp((EDGE + 12 - edgeDist(x, y) + (fo2(u, v) - 0.5) * 16) / 13, 0, 1);
      const along = (x - cx) * Math.cos(ang) + (y - cy) * Math.sin(ang),
        sd = (x - cx) * nx + (y - cy) * ny + Math.sin(along * 0.18 + wob) * 2.5;
      // isles blends in a finer pattern and weakens the fall-off towards the edge, breaking land into islands
      hgt[i] =
        fh(u, v) * 1.25 * (1 - I) +
        fi(u, v) * 1.5 * I -
        fall * 0.95 * (1 - 0.6 * I) -
        hard * hard * 0.9 -
        lagoon -
        (split ? LAND.strait * Math.exp(-((sd / 3) ** 2)) : 0);
      const R = REGIONS.strength,
        bt = (rT(u, v) - 0.5) * R,
        br = (rR(u, v) - 0.5) * R;
      thk[i] = ft(u, v) + bt * 0.9;
      rck[i] = fr(u, v) + br * 0.9;
      fert[i] = ff(u, v);
    }
  // relief: ridged hills are added to the land, growing with height above the starting sea level so coasts stay
  // where they are; wetlands: in wet regions the land is then flattened down to just above that sea level, with
  // hollows that hold lakes, so floods drown these areas first and droughts drain them first
  const landFrac = T.land[0] + rng() * T.land[1],
    lvl0 = quant(hgt, 1 - landFrac);
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x,
        u = (x + 0.5) / GW,
        v = (y + 0.5) / GH,
        wet = clamp((rW(u, v) - 0.5 + T.wet) * 4.5 * REGIONS.strength, 0, 1);
      if (hgt[i] < lvl0) continue;
      const rd = 1 - Math.abs(2 * fR(u, v) - 1);
      hgt[i] += rd * rd * RELIEF * clamp((hgt[i] - lvl0) / 0.1, 0, 1);
      if (!wet) continue;
      const flat = lvl0 + 0.03 + (hgt[i] - lvl0) * 0.25 - Math.max(0, fl(u, v) - 0.5) * 0.9;
      hgt[i] += (flat - hgt[i]) * wet;
    }
  // lakes: basins carved into the land away from the coast, with wobbly shorelines (their own random stream, so the rest
  // of the world keeps its layout)
  const rl = mulberry32(seed * 13 + 4241 + att * 17),
    nLakes = T.lakes[0] + Math.floor(rl() * (T.lakes[1] + 1)),
    fromSea = distField(i => hgt[i] < lvl0 || border(i));
  for (let n = 0, tries = 0; n < nLakes && tries < 300; tries++) {
    const c = (rl() * GW * GH) | 0,
      room = fromSea[c] / CS - 2;
    if (room < LAKES.inland) continue;
    const r = Math.min(room, LAKES.r[0] + rl() * LAKES.r[1]),
      deep = LAKES.depth[0] + rl() * LAKES.depth[1],
      p1 = rl() * TAU,
      p2 = rl() * TAU,
      cx = c % GW,
      cy = (c / GW) | 0;
    const span = Math.ceil(r * 1.4);
    for (let y = Math.max(0, cy - span); y < Math.min(GH, cy + span); y++)
      for (let x = Math.max(0, cx - span); x < Math.min(GW, cx + span); x++) {
        const a = Math.atan2(y - cy, x - cx),
          d =
            Math.hypot(x - cx, y - cy) / (r * (1 + 0.22 * Math.sin(3 * a + p1) + 0.1 * Math.sin(5 * a + p2)));
        if (d < 1) hgt[y * GW + x] = Math.min(hgt[y * GW + x], lvl0 - 0.004 - deep * (1 - d * d));
      }
    n++;
  }
  // the sea stays where it was: the lakes' basins come out of the land share, rather than the sea rising to make up
  // for them (which would flood the low wetlands)
  let landNow = 0;
  for (let i = 0; i < GW * GH; i++) if (hgt[i] >= lvl0) landNow++;
  const land = landNow / (GW * GH);
  // thicket and rock are shares of the starting land, so each world type gets the amount it asks for
  const onLand = a => a.filter((_, i) => hgt[i] >= lvl0 && !border(i));
  world = {
    seed,
    kind,
    shape,
    hgt,
    thk,
    rck,
    fert,
    type: new Uint8Array(N),
    comp: new Int16Array(N),
    fl: new Float32Array(N),
    dLand: null,
    dWater: null,
    landFrac: land,
    land0: land,
    tOff: T.temp,
    channels: [],
    craters: [],
    level: 0,
    tThr: quant(onLand(thk), 1 - T.thicket),
    rThr: quant(onLand(rck), 1 - T.rock),
    fLo: quant(fert, 0.1),
    fHi: quant(fert, 0.92),
  };
  if (rng() < T.rivers[0]) world.channels.push(makeChannel(rng));
  if (rng() < T.rivers[1]) world.channels.push(makeChannel(rng));
  for (let k = 0; k < nSeas; k++) world.channels.push(makeChannel(rx, true));
  buildTerrain();
  // a split world must have two decent landmasses (smaller ones will do on broken-up worlds); otherwise try
  // again with a variation of the same seed
  if (split && att < 5) {
    const cnt = {};
    for (const c of world.comp) if (c >= 0) cnt[c] = (cnt[c] || 0) + 1;
    const sz = Object.values(cnt).sort((a, b) => b - a);
    if (!(sz[1] >= Math.max(1100 * (1 - 0.5 * T.isles), sz[0] * 0.25 * (1 - 0.6 * T.isles))))
      return genWorld(seed, att + 1);
  }
  world.sites = [];
  let tries = 0,
    nl = 0,
    nw = 0;
  while (nl < T.food[0] && tries < T.food[0] * 200) {
    tries++;
    const x = rng() * W,
      y = rng() * H,
      i = cellI(x, y),
      t = world.type[i];
    if (t !== 1 && t !== 2) continue;
    let f = clamp((world.fert[i] - world.fLo) / (world.fHi - world.fLo), 0, 1);
    // thicket food grows more thickly towards the middle, and more of it is nuts there
    const deep = t === 2 ? clamp((world.dThick[i] - THICKET.edge) / (THICKET.deep - THICKET.edge), 0, 1) : 0;
    if (t === 2) f = Math.min(1, f * 0.6 + 0.35 + 0.3 * deep);
    if (world.comp[i] !== world.main) f = Math.min(1, f + 0.35);
    if (rng() < f * f * 0.9 + 0.04) {
      // some thicket food is nuts rather than berries, most of it in the middle
      const kind =
        t === 2 && rng() < THICKET.nuts[0] + (THICKET.nuts[1] - THICKET.nuts[0]) * deep ? 'n' : 'l';
      world.sites.push({ x, y, i, kind, active: true, t: 0 });
      nl++;
    }
  }
  tries = 0;
  while (nw < T.food[1] && tries < T.food[1] * 600) {
    tries++;
    const x = rng() * W,
      y = rng() * H,
      i = cellI(x, y),
      t = world.type[i];
    if (!isWater(t) || border(i)) continue;
    // algae grows only on the shelf, and most thickly close to shore
    if (t === 0 && (world.deep[i] || rng() > Math.exp(-world.dLand[i] / SEA.algaeFade))) continue;
    world.sites.push({ x, y, i, kind: 'w', active: true, t: 0 });
    nw++;
  }
  // lakes (water not joined to the open sea) get their own algae, and some algae waits on low land a big flood would
  // drown, growing only once it is under water
  const sea = new Uint8Array(GW * GH),
    st = [];
  for (let i = 0; i < GW * GH; i++) if (world.type[i] === 0 && border(i)) [sea[i], st[st.length]] = [1, i];
  while (st.length) {
    const j = st.pop(),
      x = j % GW,
      y = (j / GW) | 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = x + dx,
        yy = y + dy,
        k = yy * GW + xx;
      if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || sea[k] || world.type[k] !== 0) continue;
      sea[k] = 1;
      st.push(k);
    }
  }
  const lake = [],
    low = [],
    floodLine = quant(world.hgt, 1 - Math.max(0.02, landFrac + LAND.min));
  for (let i = 0; i < GW * GH; i++) {
    if (world.type[i] === 0 && !sea[i] && !world.deep[i]) lake.push(i);
    else if (isLand(world.type[i]) && world.type[i] !== 3 && world.hgt[i] < floodLine) low.push(i);
  }
  const rl2 = mulberry32(seed * 31 + 977),
    put = i =>
      world.sites.push({
        x: ((i % GW) + rl2()) * CS,
        y: (((i / GW) | 0) + rl2()) * CS,
        i,
        kind: 'w',
        active: true,
        t: 0,
      });
  for (let k = Math.round(lake.length * LAKES.algae); k > 0 && lake.length; k--)
    put(lake[(rl2() * lake.length) | 0]);
  for (let k = Math.round(T.food[1] * LAKES.flood); k > 0 && low.length; k--)
    put(low[(rl2() * low.length) | 0]);
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
  // sea channels are carved into the heights as smooth troughs (like the strait), so their coasts are traced as
  // curves; h is the height used for this build, while w.hgt (and the land colours) stay as they were
  // seaD: how far each cell is from the nearest sea channel's edge, in cells, used to fade map details out
  // smoothly towards it
  const h = Float32Array.from(w.hgt);
  w.seaD = new Float32Array(N).fill(99);
  for (const ch of w.channels) {
    if (!ch.sea) continue;
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x,
          d = distPoly(x + 0.5, y + 0.5, ch.pts) - ch.w;
        if (d < w.seaD[i]) w.seaD[i] = d;
        if (d < 40) h[i] = Math.min(h[i], w.level + d * SEA_WALL);
      }
  }
  for (let i = 0; i < N; i++) {
    let t = h[i] >= w.level ? 1 : 0;
    if (border(i)) t = 0;
    if (t) {
      if (w.thk[i] >= w.tThr) t = 2;
      else if (w.rck[i] >= w.rThr) t = 3;
    }
    w.type[i] = t;
  }
  // rivers are cut cell by cell into land and thicket
  for (const ch of w.channels) {
    if (ch.sea) continue;
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (w.type[i] !== 1 && w.type[i] !== 2) continue;
        if (distPoly(x + 0.5, y + 0.5, ch.pts) < ch.w) w.type[i] = 4;
      }
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
  // figures for the inspector's World tab, measured from the map as it is now (landmasses ignore specks under
  // 20 cells; a crater counts while its centre is above the sea)
  let nT = 0,
    nR = 0,
    nL = 0,
    nS = 0;
  for (let i = 0; i < N; i++) {
    const t = w.type[i];
    if (isLand(t)) nL++;
    if (t === 0) nS++;
    if (t === 2) nT++;
    if (t === 3) nR++;
  }
  w.stats = {
    lands: sizes.filter(n => n >= 20).length,
    craters: w.craters.filter(c => w.type[(c.y | 0) * GW + (c.x | 0)] !== 0).length,
    land: Math.round((nL / N) * 100),
    sea: Math.round((nS / N) * 100),
    thicket: Math.round((nT / Math.max(1, nL)) * 100),
    rock: Math.round((nR / Math.max(1, nL)) * 100),
  };
  w.main = ord.length ? ord[0][1] : 0;
  w.second = ord.length > 1 ? ord[1][1] : w.main;
  // temperature: land by its height among the world's original land (high is cold), water mild
  if (!w.refH) {
    const a = [];
    for (let i = 0; i < N; i++) if (isLand(w.type[i])) a.push(w.hgt[i]);
    w.refH = Float32Array.from(a).sort();
  }
  w.temp = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (!isLand(w.type[i])) {
      w.temp[i] = TEMP.water;
      continue;
    }
    const R = w.refH,
      v = w.hgt[i];
    let lo = 0,
      hi = R.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (R[m] < v) lo = m + 1;
      else hi = m;
    }
    w.temp[i] = 1 - lo / R.length;
  }
  w.dLand = distField(i => isLand(w.type[i]));
  // how far each thicket cell is from the thicket's edge (16 px for an edge cell), which sets who can go there
  w.dThick = distField(i => w.type[i] !== 2);
  // the heart of the thickets: how far in the deepest tenth of thicket ground lies (for the Squeezer achievement)
  const td = [];
  for (let i = 0; i < N; i++) if (w.type[i] === 2) td.push(w.dThick[i]);
  w.tDeep = td.length ? quant(td, 0.9) : 1e9;
  w.dWater = distField(i => isWater(w.type[i]));
  // sea depth: a blend of distance from shore and the sea floor, each as a rank among sea cells, so shallow
  // shelves follow the coasts and reach out over offshore banks; the shallowest share is the shelf
  const sea = [];
  for (let i = 0; i < N; i++) if (w.type[i] === 0) sea.push(i);
  const rank = f => {
    const r = new Float32Array(N);
    sea.sort((a, b) => f(a) - f(b)).forEach((i, k) => (r[i] = k / sea.length));
    return r;
  };
  const rD = rank(i => w.dLand[i]),
    rF = rank(i => w.level - w.hgt[i]);
  w.depth = new Float32Array(N);
  w.deep = new Uint8Array(N);
  for (const i of sea) {
    w.depth[i] = 0.65 * rD[i] + 0.35 * rF[i];
    w.deep[i] = w.depth[i] > SEA.shelf ? 1 : 0;
  }
  for (let i = 0; i < N; i++) {
    const t = w.type[i];
    w.fl[i] = isLand(t)
      ? Math.max(h[i], w.level + 0.004)
      : t === 4
        ? w.level - 0.03
        : Math.min(h[i], w.level - 0.004);
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
