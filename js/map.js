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
// a scalloped tree crown: n bumps round the edge, as one closed outline
function crown(p, x, y, r, n, a0) {
  for (let k = 0; k <= n; k++) {
    const a = a0 + (k * TAU) / n,
      px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r;
    if (k === 0) p.moveTo(px, py);
    else {
      const am = a - Math.PI / n;
      p.quadraticCurveTo(x + Math.cos(am) * r * 1.38, y + Math.sin(am) * r * 1.38, px, py);
    }
  }
  p.closePath();
}
// for each thicket cell, how far in (px) the middle of its patch is, up to TREES.mid
function patchMiddles(w) {
  const T = w.type,
    mid = new Float32Array(GW * GH),
    seen = new Uint8Array(GW * GH);
  for (let s = 0; s < GW * GH; s++) {
    if (T[s] !== 2 || seen[s]) continue;
    const cells = [s],
      st = [s];
    seen[s] = 1;
    let top = 0;
    while (st.length) {
      const j = st.pop(),
        x = j % GW,
        y = (j / GW) | 0;
      top = Math.max(top, w.dThick[j]);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + dx,
          yy = y + dy,
          k = yy * GW + xx;
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || seen[k] || T[k] !== 2) continue;
        seen[k] = 1;
        cells.push(k);
        st.push(k);
      }
    }
    for (const j of cells) mid[j] = Math.max(THICKET.edge + CS, Math.min(top, TREES.mid));
  }
  return mid;
}
// thicket trees: small bushes scattered at the edge, big trees packed in the middle, where only smaller creatures
// can go. They are grouped into rows 8 px tall, drawn from the top down, so nearer crowns hide the ones behind
function trees(w) {
  const r = mulberry32(w.seed ^ 0x7ee5),
    T = w.type,
    list = [],
    mid = patchMiddles(w);
  for (let i = 0; i < GW * GH; i++) {
    if (T[i] !== 2) continue;
    // size follows how far in a creature can go; how close together they grow rises all the way to the patch's middle
    const k = clamp((w.dThick[i] - THICKET.edge) / (THICKET.deep - THICKET.edge), 0, 1),
      m = clamp((w.dThick[i] - THICKET.edge) / (mid[i] - THICKET.edge), 0, 1),
      per = TREES.per[0] + (TREES.per[1] - TREES.per[0]) * m,
      n = Math.floor(per) + (r() < per % 1 ? 1 : 0),
      x0 = (i % GW) * CS,
      y0 = ((i / GW) | 0) * CS;
    for (let j = 0; j < n; j++) {
      const x = x0 + r() * CS,
        y = y0 + r() * CS;
      if (T[cellI(x, y)] !== 2) continue;
      list.push({ x, y, r: TREES.r[0] + (TREES.r[1] - TREES.r[0]) * k + r() * TREES.jitter, a: r() * TAU });
    }
  }
  list.sort((a, b) => a.y - b.y);
  const rows = [],
    shadow = new Path2D();
  let row = null;
  for (const t of list) {
    const y8 = Math.floor(t.y / 8);
    if (!row || row.y8 !== y8)
      rows.push(
        (row = { y8, crowns: new Path2D(), fills: TREES.alpha.map(() => new Path2D()), shade: new Path2D() })
      );
    // each crown's outline is inked, and its fill goes in one of a few groups, each a little more or less see-through
    crown(row.crowns, t.x, t.y, t.r, t.r > 8 ? 9 : 7, t.a);
    crown(row.fills[(r() * TREES.alpha.length) | 0], t.x, t.y, t.r, t.r > 8 ? 9 : 7, t.a);
    // most crowns get a shading stroke somewhere inside, of varying length; some have none. And a soft shadow on
    // the ground
    if (r() > TREES.plain) {
      const a = r() * TAU,
        len = 0.7 + r() * 1.1,
        rr = t.r * (0.5 + r() * 0.2);
      row.shade.moveTo(t.x + Math.cos(a) * rr, t.y + Math.sin(a) * rr);
      row.shade.arc(t.x, t.y, rr, a, a + len);
    }
    shadow.moveTo(t.x + t.r * 1.45, t.y + t.r * 0.4);
    shadow.arc(t.x + t.r * 0.35, t.y + t.r * 0.4, t.r * 1.1, 0, TAU);
  }
  return { rows, shadow };
}
// terrain is kept as vector paths so it can be redrawn sharply at any zoom
function renderTerrain() {
  const w = world,
    N = GW * GH,
    T = w.type,
    V = {};
  // near a sea channel, details fade out over its last few cells, so they follow its smooth coast instead of
  // stopping at the grid cells it cut
  const fade = i => clamp(w.seaD[i] / 3, 0, 1),
    sm = f => i => f(i) * fade(i);
  // sea depth bands (land counts as shallowest, so each band meets the shore under the land), with the edge of each
  // kept as a line: thin ones for the bands, and the shelf's edge, where deep water starts, drawn dashed
  const shallow = i => (T[i] === 0 ? -w.depth[i] : 20);
  V.bands = BAND_AT.map(d => march(shallow, -d, true, true));
  const land = march(i => w.fl[i], w.level, true, true);
  V.land = land.fill;
  V.coast = land.line;
  V.mead = march(
    sm(i => (T[i] === 1 && w.comp[i] >= 0 ? (w.fert[i] - w.fLo) / (w.fHi - w.fLo) : 0)),
    0.62,
    true,
    false
  ).fill;
  V.thick = march(
    sm(i =>
      T[i] === 2
        ? Math.max(w.thk[i], w.tThr + 0.002)
        : T[i] === 1 || T[i] === 3
          ? Math.min(w.thk[i], w.tThr - 0.002)
          : 0
    ),
    w.tThr,
    true,
    false
  ).fill;
  V.trees = trees(w);
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
  V.dry = march(
    sm(i => (T[i] === 1 ? 1 - fn(i) : 0)),
    0.62,
    true,
    false
  ).fill;
  V.tint = [
    [0.35, '#e5e7d4'],
    [0.6, '#e1dfca'],
    [0.82, '#dbd5bd'],
  ].map(([d, c]) => [
    march(
      sm(i => (isLand(T[i]) ? cdf[i] : 0)),
      d,
      true,
      false
    ).fill,
    c,
  ]);
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
  V.rings = [0, 1, 2, 3].map(k => march(sm(rf), w.rThr + k * rs, true, true));
  // contours: every third one is an index contour, drawn bold so hills read at a glance
  V.cont = new Path2D();
  V.contB = new Path2D();
  for (let k = 1; k <= 24; k++)
    (k % 3 ? V.cont : V.contB).addPath(
      march(
        sm(i => (T[i] === 0 || T[i] === 4 ? 0 : el[i])),
        k / 9,
        false,
        true
      ).line
    );
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
// temperature wash: one pixel per cell, scaled up smoothly, so it shades gradually without adding detailed shapes
// to the map (Safari drops the land's colours when a map holds too many). Five frosty layers fade in below the
// cold level and five warm ones above the hot level, and the season decides how far each reaches.
const washCan = document.createElement('canvas'),
  wash = { temp: null, se: -1 };
washCan.width = GW;
washCan.height = GH;
function tempWash(se) {
  const w = world;
  if (wash.temp === w.temp && wash.se === se) return washCan;
  wash.temp = w.temp;
  wash.se = se;
  const g = washCan.getContext('2d'),
    img = g.createImageData(GW, GH),
    d = img.data,
    sh = w.tOff + TEMP.season[se];
  for (let i = 0; i < GW * GH; i++) {
    if (!isLand(w.type[i])) continue;
    const t = w.temp[i];
    let nc = 0,
      nw = 0;
    for (const L of [0.05, 0.15, 0.25, 0.35, 0.45]) if (t <= L && L + sh <= TEMP.cold + 0.05) nc++;
    for (const L of [0.55, 0.65, 0.75, 0.85, 0.95]) if (t >= L && L + sh >= TEMP.hot - 0.05) nw++;
    const k = i * 4;
    if (nc) [d[k], d[k + 1], d[k + 2], d[k + 3]] = [222, 235, 246, 255 * (1 - 0.8 ** nc)];
    else if (nw) [d[k], d[k + 1], d[k + 2], d[k + 3]] = [236, 204, 135, 255 * (1 - 0.93 ** nw)];
  }
  g.putImageData(img, 0, 0);
  return washCan;
}
function paintTerrain(g) {
  const V = world.vec;
  g.fillStyle = BAND[BAND.length - 1];
  g.fillRect(0, 0, W, H);
  for (let k = V.bands.length - 1; k >= 0; k--) {
    g.fillStyle = BAND[k];
    g.fill(V.bands[k].fill);
  }
  g.fillStyle = BAND[0];
  g.fill(V.river);
  g.strokeStyle = 'rgba(77,115,133,.35)';
  g.lineWidth = 0.7;
  for (const b of V.bands) g.stroke(b.line);
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
  // woodland floor: a soft tint with no hard outline (the trees on top show the edge)
  g.fillStyle = [
    'rgba(176,200,150,.55)',
    'rgba(176,200,150,.55)',
    'rgba(190,190,140,.55)',
    'rgba(180,192,170,.5)',
  ][se];
  g.fill(V.thick);
  g.imageSmoothingEnabled = true;
  g.drawImage(tempWash(se), 0, 0, W, H);
  g.fillStyle = 'rgba(60,80,50,.13)';
  g.fill(V.trees.shadow);
  g.restore();
  const RF =
    se === 3 ? ['#cfc8bb', '#bfb7a8', '#e9eeef', '#fbfcfc'] : ['#cfc8bb', '#bfb7a8', '#aea595', '#9d9483']; // winter: snow on the peaks
  V.rings.forEach((r, k) => {
    g.fillStyle = RF[k];
    g.fill(r.fill);
  });
  g.save();
  g.strokeStyle = 'rgba(70,62,50,.32)';
  g.lineWidth = 0.9;
  g.stroke(V.cont);
  g.strokeStyle = 'rgba(70,62,50,.5)';
  g.lineWidth = 1.6;
  g.stroke(V.contB);
  g.clip(V.rings[0].fill);
  g.strokeStyle = 'rgba(60,55,48,.45)';
  g.lineWidth = 0.9;
  g.stroke(V.cont);
  g.stroke(V.contB);
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
// thicket trees live on their own layer, drawn over creatures and food so they look tucked in among the trees
function paintStipple(g) {
  const se = typeof S !== 'undefined' && S ? S.season : 0;
  g.save();
  g.lineJoin = 'round';
  g.strokeStyle = '#34502b';
  g.lineWidth = 0.75;
  g.fillStyle = ['#cfe0b8', '#c9dcae', '#d6d4a0', '#cfd8c6'][se];
  for (const row of world.vec.trees.rows) {
    TREES.alpha.forEach((a, k) => {
      g.globalAlpha = a;
      g.fill(row.fills[k]);
    });
    g.globalAlpha = 1;
    g.stroke(row.crowns);
    g.stroke(row.shade);
  }
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
// an acorn: brown nut under a darker cap; regrowing ones are small and pale
// a nut grows through three stages: a bare pale nut just after eating, a pale nut with a small cap half grown, and
// the full dark acorn when ready to eat
function drawNut(g, x, y, p) {
  const k = 0.45 + 0.55 * p,
    ripe = p >= 1;
  g.save();
  g.translate(x, y);
  g.scale(3.2 * k, 3.2 * k);
  g.lineWidth = 0.28 / k;
  g.strokeStyle = INK;
  g.beginPath();
  g.ellipse(0, 0.35, 0.95, 1.15, 0, 0, TAU);
  g.fillStyle = ripe ? '#b07a3c' : '#d8b98e';
  g.fill();
  g.stroke();
  if (ripe) {
    g.beginPath();
    g.ellipse(0, -0.55, 1.15, 0.6, 0, Math.PI, TAU);
    g.lineTo(1.15, -0.45);
    g.quadraticCurveTo(0, 0, -1.15, -0.45);
    g.closePath();
    g.fillStyle = '#5b3a1a';
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(0, -1.15);
    g.lineTo(0.15, -1.6);
    g.lineWidth *= 1.25;
    g.stroke();
  } else if (p > 0) {
    g.beginPath();
    g.ellipse(0, -0.45, 0.8, 0.42, 0, Math.PI, TAU);
    g.lineTo(0.8, -0.38);
    g.quadraticCurveTo(0, -0.08, -0.8, -0.38);
    g.closePath();
    g.fillStyle = '#a07d55';
    g.fill();
    g.stroke();
  }
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
// the map as it was, kept sharp for the cross-fade: a full-resolution copy of the base map, plus the zoomed-in
// detail image if there is one (handed over to the fade; the detail layer gets a fresh canvas to redraw into)
function snapMap() {
  let a = document.createElement('canvas');
  a.width = tcan.width;
  a.height = tcan.height;
  // if the browser refuses another big canvas, skip the fade rather than stop the map repainting
  const ga = a.getContext('2d');
  if (ga) ga.drawImage(tcan, 0, 0);
  else a = null;
  let d = null;
  if (detail.ok) {
    d = { can: detail.can, x: detail.x, y: detail.y, z: detail.z };
    detail.can = document.createElement('canvas');
    detail.ok = false;
  }
  return { a, d };
}
// where a detail image (drawn for camera d) sits in world coordinates: [x, y, width, height]
function detailRect(d) {
  return [d.x - cw / d.z, d.y - ch / d.z, d.can.width / (dpr * d.z), d.can.height / (dpr * d.z)];
}
// Safari frees a canvas's memory only when it is garbage collected, and caps the total, so the fade's copies are
// emptied as soon as the fade is over or replaced
function endFade() {
  if (!S || !S.fade) return;
  for (const c of [S.fade.a, S.fade.d && S.fade.d.can]) if (c) c.width = c.height = 0;
  S.fade = null;
}
function seasonFade() {
  endFade();
  const old = snapMap();
  const g = tcan.getContext('2d');
  g.setTransform(TS, 0, 0, TS, 0, 0);
  paintTerrain(g);
  paintStipple(g);
  bakeLo();
  detail.ok = false;
  S.fade = { t: 0, ...old, dur: 2.5 };
}
function startFade(old) {
  endFade();
  if (S) S.fade = { t: 0, ...old, dur: 3 };
}
