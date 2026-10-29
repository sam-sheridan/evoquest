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
// marching squares again, but chained into closed loops (lists of points) rather than loose segments, so outlines
// can be straightened
function traceLoops(fv, thr) {
  const segs = [],
    px = a => (a + 0.5) * CS;
  for (let y = 0; y < GH - 1; y++)
    for (let x = 0; x < GW - 1; x++) {
      const P = [
          [x, y],
          [x + 1, y],
          [x + 1, y + 1],
          [x, y + 1],
        ],
        V = P.map(([a, b]) => fv(b * GW + a)),
        ins = V.map(v => v >= thr),
        cnt = ins.filter(Boolean).length;
      if (cnt === 0 || cnt === 4) continue;
      const cross = [];
      for (let k = 0; k < 4; k++)
        if (ins[k] !== ins[(k + 1) % 4]) {
          const a = P[k],
            b = P[(k + 1) % 4],
            f = (thr - V[k]) / (V[(k + 1) % 4] - V[k]);
          cross.push([px(a[0] + (b[0] - a[0]) * f), px(a[1] + (b[1] - a[1]) * f)]);
        }
      for (let k = 0; k + 1 < cross.length; k += 2) segs.push([cross[k], cross[k + 1]]);
    }
  const key = p => Math.round(p[0] * 8) + ',' + Math.round(p[1] * 8),
    ends = new Map();
  segs.forEach((s, i) => {
    for (const p of s) {
      const k = key(p);
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k).push(i);
    }
  });
  const used = new Uint8Array(segs.length),
    loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const loop = [segs[i][0], segs[i][1]];
    for (let end = segs[i][1]; ; ) {
      const j = ends.get(key(end)).find(n => !used[n]);
      if (j === undefined) break;
      used[j] = 1;
      end = key(segs[j][0]) === key(end) ? segs[j][1] : segs[j][0];
      loop.push(end);
    }
    loops.push(loop);
  }
  return loops;
}
// straightens a line: keeps the corners and drops wiggles smaller than tol px (Douglas–Peucker)
function straighten(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(),
      [ax, ay] = pts[a],
      [bx, by] = pts[b],
      L = Math.hypot(bx - ax, by - ay) || 1;
    let md = 0,
      mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
      if (d > md) [md, mi] = [d, i];
    }
    if (md > tol) {
      keep[mi] = 1;
      st.push([a, mi], [mi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
// a closed loop is split at the point farthest from its start, and each half straightened
function straightenLoop(l, tol) {
  let m = 0,
    md = -1;
  l.forEach((p, k) => {
    const d = Math.hypot(p[0] - l[0][0], p[1] - l[0][1]);
    if (d > md) [md, m] = [d, k];
  });
  return straighten(l.slice(0, m + 1), tol).concat(straighten(l.slice(m), tol).slice(1, -1));
}
const loopArea = p =>
  p.reduce((s, [x1, y1], i) => s + x1 * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y1, 0) / 2;
function addLoop(path, p) {
  path.moveTo(...p[0]);
  for (const q of p) path.lineTo(...q);
  path.closePath();
}
// rock, drawn as angular crags: straightened outlines, the slopes split into flat faces (plain where lit from the
// north-west, a plain darker tone in the shade, inked along ridges), paler tiers at set heights, and a ring of short strokes
// just inside the edge pointing uphill. rf is the rock pattern (rock where it is at least w.rThr).
function rocks(w, rf, land) {
  const N = GW * GH,
    T = w.type,
    thr = w.rThr,
    rnd = mulberry32(w.seed ^ 0x40c),
    R = {
      outline: new Path2D(),
      face: [new Path2D(), new Path2D(), new Path2D()],
      ridge: new Path2D(),
      tiers: ROCKS.tiers.map(() => new Path2D()),
      tick: new Path2D(),
      tickD: new Path2D(),
    };
  // separate pieces of rock (each is lifted to a minimum height below)
  const comp = new Int32Array(N).fill(-1),
    pieces = [];
  for (let s = 0; s < N; s++) {
    if (T[s] !== 3 || comp[s] >= 0) continue;
    const list = [s];
    comp[s] = pieces.length;
    for (let q = 0; q < list.length; q++) {
      const j = list[q],
        x = j % GW,
        y = (j / GW) | 0;
      for (const [dx, dy] of D4) {
        const xx = x + dx,
          yy = y + dy,
          k = yy * GW + xx;
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || comp[k] >= 0 || T[k] !== 3) continue;
        comp[k] = pieces.length;
        list.push(k);
      }
    }
    pieces.push(list);
  }
  // (pieces too small to draw were already turned into open ground when the world was built)
  const isRock = i => T[i] === 3,
    // water next to rock counts as rock, so the outline runs out past the coast and is cut by the smooth coastline
    wet = i => {
      if (!isWater(T[i])) return false;
      const x = i % GW,
        y = (i / GW) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < GW && yy < GH && isRock(yy * GW + xx)) return true;
        }
      return false;
    },
    fv = i => (isRock(i) ? rf(i) : wet(i) ? Math.max(rf(i), thr + 0.002) : Math.min(rf(i), thr - 0.002));
  // the outline's loops, kept for the skirt of strokes below
  const loops = [];
  for (const l of traceLoops(fv, thr)) {
    const p = straightenLoop(l, ROCKS.straight);
    if (p.length >= 3 && Math.abs(loopArea(p)) > 120) {
      addLoop(R.outline, p);
      loops.push(p);
    }
  }
  const g = document.createElement('canvas').getContext('2d'),
    inRock = (x, y) => g.isPointInPath(R.outline, x, y, 'evenodd');
  // height inside the rock, softened: 0 at the edge, 1 at the highest point
  let h = new Float32Array(N);
  // (a crater wall takes its height from the crater's ring, rising to its crest)
  for (let i = 0; i < N; i++)
    h[i] = Math.max(0, w.rck[i] - thr + 0.01, T[i] === 3 && w.cS[i] > 0 ? 0.01 + w.cS[i] * 0.02 : 0);
  for (let k = 0; k < 2; k++) h = soften(h);
  let top = 1e-6;
  for (let i = 0; i < N; i++) if (T[i] === 3) top = Math.max(top, h[i]);
  for (let i = 0; i < N; i++) h[i] /= top;
  // every rock gets some height: each piece is lifted so its peak reaches at least ROCKS.minPeak, while taller
  // ranges keep their lead
  for (const list of pieces) {
    let peak = 1e-6;
    for (const i of list) peak = Math.max(peak, h[i]);
    const k = (ROCKS.minPeak + (1 - ROCKS.minPeak) * peak) / peak;
    if (k > 1) for (const i of list) h[i] *= k;
  }
  // rock lowers towards water over its last ROCKS.shore cells, so its faces and tiers taper off into sea cliffs
  for (let i = 0; i < N; i++) {
    const t = clamp((w.dWater[i] - CS * 0.5) / (ROCKS.shore * CS), 0, 1);
    h[i] *= t * t * (3 - 2 * t);
  }
  const hAt = (x, y) => {
    const fx = clamp(x / CS - 0.5, 0, GW - 1.001),
      fy = clamp(y / CS - 0.5, 0, GH - 1.001),
      xi = fx | 0,
      yi = fy | 0,
      u = fx - xi,
      v = fy - yi,
      i = yi * GW + xi;
    return (h[i] * (1 - u) + h[i + 1] * u) * (1 - v) + (h[i + GW] * (1 - u) + h[i + GW + 1] * u) * v;
  };
  // faces: a jittered triangle mesh over the rock, each triangle shaded by which way it faces the light
  const sp = ROCKS.mesh,
    nx = Math.ceil(W / sp) + 1,
    ny = Math.ceil(H / sp) + 1,
    vx = new Float32Array(nx * ny),
    vy = new Float32Array(nx * ny),
    vz = new Float32Array(nx * ny),
    near = (x, y) => {
      const i = cellI(clamp(x, 0, W - 1), clamp(y, 0, H - 1));
      return w.rck[i] > thr - 0.03 || T[i] === 3 || w.cS[i] > -1;
    };
  for (let k = 0; k < nx * ny; k++) {
    vx[k] = (k % nx) * sp + (rnd() - 0.5) * sp * 0.7;
    vy[k] = ((k / nx) | 0) * sp + (rnd() - 0.5) * sp * 0.7;
    vz[k] = hAt(vx[k], vy[k]) * ROCKS.relief;
  }
  const lit = [],
    edges = new Map(),
    tri = (a, b, c) => {
      if (
        ![a, b, c].some(k => near(vx[k], vy[k])) &&
        !near((vx[a] + vx[b] + vx[c]) / 3, (vy[a] + vy[b] + vy[c]) / 3)
      )
        return;
      const ux = vx[b] - vx[a],
        uy = vy[b] - vy[a],
        uz = vz[b] - vz[a],
        wx = vx[c] - vx[a],
        wy = vy[c] - vy[a],
        wz = vz[c] - vz[a];
      let n0 = uy * wz - uz * wy,
        n1 = uz * wx - ux * wz,
        n2 = ux * wy - uy * wx;
      if (n2 < 0) [n0, n1, n2] = [-n0, -n1, -n2];
      // how directly the face meets light from the north-west and above
      const s = (-0.55 * n0 - 0.62 * n1 + 0.56 * n2) / (Math.hypot(n0, n1, n2) || 1),
        zs = [vz[a], vz[b], vz[c]],
        t = Math.max(...zs) - Math.min(...zs) < ROCKS.flat * ROCKS.relief || s > 0.52 ? 0 : s > 0.4 ? 1 : 2,
        P3 = [a, b, c].map(k => [vx[k], vy[k]]);
      addLoop(R.face[t], P3);
      for (const [u, v] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const k = u < v ? u * 1e6 + v : v * 1e6 + u;
        if (!edges.has(k)) edges.set(k, [u, v, []]);
        edges.get(k)[2].push(t);
      }
    };
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i,
        b = a + 1,
        c = a + nx,
        d = c + 1;
      if (rnd() < 0.5) {
        tri(a, b, d);
        tri(a, d, c);
      } else {
        tri(a, b, c);
        tri(b, d, c);
      }
    }
  // ridges: ink where a lit face meets a shaded one
  for (const [u, v, t] of edges.values())
    if (t.length === 2 && Math.abs(t[0] - t[1]) === 2 && vz[u] + vz[v] > 0.08 * ROCKS.relief) {
      R.ridge.moveTo(vx[u], vy[u]);
      R.ridge.lineTo(vx[v], vy[v]);
    }
  // tiers: angular inner outlines at set heights
  ROCKS.tiers.forEach((lv, k) => {
    for (const l of traceLoops(i => h[i], lv)) {
      const p = straightenLoop(l, ROCKS.straight);
      if (p.length >= 3 && Math.abs(loopArea(p)) > 400) addLoop(R.tiers[k], p);
    }
  });
  // skirt: short strokes just inside the edge, pointing uphill, longer where the rock rises higher and darker on the
  // shaded side
  for (const l of loops) {
    let carry = 0;
    for (let k = 0; k < l.length; k++) {
      const [ax, ay] = l[k],
        [bx, by] = l[(k + 1) % l.length],
        seg = Math.hypot(bx - ax, by - ay);
      if (seg < 1) continue;
      let ox = -(by - ay) / seg,
        oy = (bx - ax) / seg;
      const mx = (ax + bx) / 2,
        my = (ay + by) / 2;
      if (!inRock(mx + ox * 4, my + oy * 4)) [ox, oy] = [-ox, -oy];
      if (inRock(mx + ox * 4, my + oy * 4))
        for (let d = carry; d < seg; d += ROCKS.tick) {
          const x = ax + ((bx - ax) * d) / seg,
            y = ay + ((by - ay) * d) / seg,
            len = clamp(4 + hAt(x + ox * 14, y + oy * 14) * 22, 4, 13),
            p = -ox - oy > 0.3 ? R.tickD : R.tick;
          p.moveTo(x + ox * 1.5, y + oy * 1.5);
          p.lineTo(x + ox * len, y + oy * len);
        }
      carry = (((carry - seg) % ROCKS.tick) + ROCKS.tick) % ROCKS.tick;
    }
  }
  // sea cliffs: where rock meets water the coast gets the rock's ink line and a row of strokes pointing inland
  R.cliff = new Path2D();
  const dRock = distField(i => T[i] === 3),
    nearRock = (x, y) => dRock[cellI(clamp(x, 0, W - 1), clamp(y, 0, H - 1))] < 2 * CS;
  for (const l of traceLoops(i => w.fl[i], w.level)) {
    let carry = 0;
    for (let k = 0; k + 1 < l.length; k++) {
      const [ax, ay] = l[k],
        [bx, by] = l[k + 1],
        seg = Math.hypot(bx - ax, by - ay);
      if (seg < 0.01) continue;
      let ox = -(by - ay) / seg,
        oy = (bx - ax) / seg;
      const mx = (ax + bx) / 2,
        my = (ay + by) / 2;
      // (the exact tests are slow, so they only run close to rock)
      if (!nearRock(mx, my)) {
        carry = (((carry - seg) % ROCKS.tick) + ROCKS.tick) % ROCKS.tick;
        continue;
      }
      if (!g.isPointInPath(land, mx + ox * 3, my + oy * 3)) [ox, oy] = [-ox, -oy];
      const rocky = inRock(mx + ox * 3, my + oy * 3);
      if (rocky) {
        R.cliff.moveTo(ax, ay);
        R.cliff.lineTo(bx, by);
      }
      for (let d = carry; d < seg; d += ROCKS.tick) {
        const x = ax + ((bx - ax) * d) / seg,
          y = ay + ((by - ay) * d) / seg;
        if (!rocky || !inRock(x + ox * 3, y + oy * 3)) continue;
        const p = -ox - oy > 0.3 ? R.tickD : R.tick,
          len = 4 + ((x * 7 + y * 13) % 3);
        p.moveTo(x + ox * 1, y + oy * 1);
        p.lineTo(x + ox * len, y + oy * len);
      }
      carry = (((carry - seg) % ROCKS.tick) + ROCKS.tick) % ROCKS.tick;
    }
  }
  return R;
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
      for (const [dx, dy] of D4) {
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
function trees(w, rock) {
  const onRock = document.createElement('canvas').getContext('2d');
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
      const rr = TREES.r[0] + (TREES.r[1] - TREES.r[0]) * k + r() * TREES.jitter;
      // rock blocks thickets: no tree whose crown would reach onto rock
      if (
        [0, 1, 2, 3, 4, 5].some(q =>
          onRock.isPointInPath(rock, x + Math.cos(q) * rr, y + Math.sin(q) * rr, 'evenodd')
        )
      )
        continue;
      list.push({ x, y, r: rr, a: r() * TAU });
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
        (row = {
          y8,
          crowns: new Path2D(),
          fills: TREES.colour[0].map(() => TREES.alpha.map(() => new Path2D())),
          shade: new Path2D(),
        })
      );
    // each crown's outline is inked, and its fill goes in a group by shade and by how see-through it is
    crown(row.crowns, t.x, t.y, t.r, t.r > 8 ? 9 : 7, t.a);
    let pick = r(),
      k = 0;
    while (k < TREES.alpha.length - 1 && pick >= TREES.alpha[k][1]) pick -= TREES.alpha[k++][1];
    crown(row.fills[(r() * TREES.colour[0].length) | 0][k], t.x, t.y, t.r, t.r > 8 ? 9 : 7, t.a);
    // (the diorama map's low-poly tree, in the same see-through group)
    if (MAP_STYLE === 'diorama') {
      row.f ||= DIO.trees[0].map(() => TREES.alpha.map(() => new Path2D()));
      treeFacets((s, p) => addLoop(row.f[s][k], p), t.x, t.y, t.r, r);
    }
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
  // kept as a thin line (the outer band's edge is the shelf's edge, where deep water starts)
  const shallow = i => (T[i] === 0 ? -w.depth[i] : 20);
  V.bands = BAND_AT.map(d => march(shallow, -d, true, true));
  const land = march(i => w.fl[i], w.level, true, true);
  V.land = land.fill;
  V.coast = land.line;
  const thkF = sm(i =>
    T[i] === 2
      ? Math.max(w.thk[i], w.tThr + 0.002)
      : T[i] === 1 || T[i] === 3
        ? Math.min(w.thk[i], w.tThr - 0.002)
        : 0
  );
  V.thick = march(thkF, w.tThr, true, false).fill;
  // how deep thickets sit in their hollows, for the contours
  let tMax = w.tThr;
  for (let i = 0; i < N; i++) if (T[i] === 2 && w.thk[i] > tMax) tMax = w.thk[i];
  const t0 = w.tThr - 0.03;
  // each piece of land's rank among the world's original land heights (0 lowest, 1 highest): the reverse of its
  // temperature (see buildTerrain), so floods and droughts don't recolour the land that remains
  const cdf = new Float32Array(N);
  for (let i = 0; i < N; i++) if (isLand(T[i])) cdf[i] = 1 - w.temp[i];
  // contour heights follow the land itself (rocks sit on top and show their own height), with thickets in hollows
  const el = new Float32Array(N);
  for (let i = 0; i < N; i++)
    el[i] = isLand(T[i]) ? cdf[i] - clamp((w.thk[i] - t0) / (tMax - t0), 0, 1) ** 1.2 * 0.22 : 0;
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
  V.rock = rocks(w, sm(rf), V.land);
  V.trees = trees(w, V.rock.outline);
  V.landD = landDetail(w, V);
  if (MAP_STYLE === 'diorama') V.dio = dioShapes(w, cdf, sm, shallow, thkF);
  // contours: every third one is an index contour, drawn bold so hills read at a glance
  V.cont = new Path2D();
  V.contB = new Path2D();
  for (let k = 1; k <= 8; k++)
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
  if (S) for (const c of S.creatures) c.rt = 0;
}
// the open land's details: softened fertility for the meadow / dry-ground wash, hill shading as a small image, lone
// trees and small clumps on fertile ground
function landDetail(w, V) {
  const N = GW * GH,
    T = w.type,
    r = mulberry32(w.seed ^ 0x1a4d),
    g0 = document.createElement('canvas').getContext('2d'),
    dRock = distField(i => T[i] === 3),
    // (the exact test is slow, so it only runs close to rock)
    onRock = (x, y, d) =>
      dRock[cellI(clamp(x, 0, W - 1), clamp(y, 0, H - 1))] < d + 2 * CS &&
      [0, 1.6, 3.2, 4.8].some(a =>
        g0.isPointInPath(V.rock.outline, x + Math.cos(a) * d, y + Math.sin(a) * d, 'evenodd')
      ),
    fz = i => clamp((w.fert[i] - w.fLo) / (w.fHi - w.fLo), 0, 1),
    L = {
      washes: [],
      lone: new Path2D(),
      loneShade: new Path2D(),
      loneShadow: new Path2D(),
      // the diorama map's lone trees: faces by shade, and trunks
      loneF: DIO.trees[0].map(() => new Path2D()),
      trunk: new Path2D(),
    };
  let f = new Float32Array(N);
  for (let i = 0; i < N; i++) f[i] = fz(i);
  for (let k = 0; k < 2; k++) f = soften(f);
  L.fert = f;
  for (let i = 0; i < N; i++) {
    if (T[i] !== 1 || w.dThick[i] < 3 * CS || r() > OPENLAND.lone[0] + OPENLAND.lone[1] * fz(i) ** 2)
      continue;
    const cx = ((i % GW) + r()) * CS,
      cy = (((i / GW) | 0) + r()) * CS;
    for (let k = r() < 0.5 ? 1 : 2 + ((r() * 2) | 0); k > 0; k--) {
      const x = cx + (k > 1 ? (r() - 0.5) * 18 : 0),
        y = cy + (k > 1 ? (r() - 0.5) * 14 : 0),
        rr = 4.5 + r() * 3.5;
      if (cellT(x, y) !== 1 || onRock(x, y, rr + 2)) continue;
      crown(L.lone, x, y, rr, rr > 6 ? 7 : 6, r() * TAU);
      if (MAP_STYLE === 'diorama') {
        treeFacets((s, p) => addLoop(L.loneF[s], p), x, y, rr, r);
        L.trunk.rect(x - 0.9, y - rr * 0.1, 1.8, rr * 0.75);
      }
      if (r() > TREES.plain) {
        const a = r() * TAU,
          q = rr * 0.55;
        L.loneShade.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        L.loneShade.arc(x, y, q, a, a + 0.8 + r());
      }
      L.loneShadow.moveTo(x + rr * 1.45, y + rr * 0.4);
      L.loneShadow.arc(x + rr * 0.35, y + rr * 0.4, rr * 1.1, 0, TAU);
    }
  }
  // hill shading: darker on slopes facing away from the north-west light, a faint highlight on the lit side, fading
  // out by the water
  let h = new Float32Array(N);
  for (let i = 0; i < N; i++) h[i] = isLand(T[i]) ? w.hgt[i] : w.level;
  for (let k = 0; k < 2; k++) h = soften(h);
  const sl = new Float32Array(N);
  let sMax = 1e-9;
  for (let y = 1; y < GH - 1; y++)
    for (let x = 1; x < GW - 1; x++) {
      const i = y * GW + x;
      sl[i] = h[i + 1] - h[i - 1] + h[i + GW] - h[i - GW];
      sMax = Math.max(sMax, Math.abs(sl[i]));
    }
  L.hill = document.createElement('canvas');
  L.hill.width = GW;
  L.hill.height = GH;
  const g = L.hill.getContext('2d'),
    img = g.createImageData(GW, GH),
    d = img.data;
  for (let i = 0; i < N; i++) {
    const v = clamp(-sl[i] / (sMax * 0.35), -1, 1) * clamp(w.dWater[i] / (3 * CS) - 0.3, 0, 1),
      k = i * 4;
    [d[k], d[k + 1], d[k + 2], d[k + 3]] = v > 0 ? [92, 84, 66, 255 * v] : [255, 252, 240, 255 * -v * 0.6];
  }
  g.putImageData(img, 0, 0);
  return L;
}
// meadows (fertile ground) and dry ground as one image, one pixel per cell, scaled up smoothly so they fade into each
// other, with middling ground left the plain land colour. One image per season, made when first needed
function landWash(se) {
  const L = world.vec.landD;
  if (L.washes[se]) return L.washes[se];
  const can = document.createElement('canvas');
  can.width = GW;
  can.height = GH;
  const g = can.getContext('2d'),
    img = g.createImageData(GW, GH),
    d = img.data,
    [gr, dr] = (MAP_STYLE === 'diorama' ? DIO.wash : OPENLAND.wash)[se];
  for (let i = 0; i < GW * GH; i++) {
    const v = L.fert[i],
      m = clamp((v - 0.5) / 0.3, 0, 1),
      c = m > 0 ? gr : dr,
      a = (m > 0 ? m : clamp((0.45 - v) / 0.3, 0, 1)) * c[3],
      k = i * 4;
    [d[k], d[k + 1], d[k + 2], d[k + 3]] = [c[0], c[1], c[2], 255 * a];
  }
  g.putImageData(img, 0, 0);
  return (L.washes[se] = can);
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
// limits drawing to everywhere outside path p
function clipOut(g, p) {
  const q = new Path2D();
  q.rect(-W, -H, 3 * W, 3 * H);
  q.addPath(p);
  g.clip(q, 'evenodd');
}
function paintTerrain(g) {
  if (MAP_STYLE === 'diorama') return paintDiorama(g);
  const V = world.vec;
  g.fillStyle = BAND[BAND.length - 1];
  g.fillRect(0, 0, W, H);
  for (let k = V.bands.length - 1; k >= 0; k--) {
    g.fillStyle = BAND[k];
    g.fill(V.bands[k].fill);
  }
  g.strokeStyle = 'rgba(77,115,133,.35)';
  g.lineWidth = 0.7;
  for (const b of V.bands) g.stroke(b.line);
  g.fillStyle = '#e9ecde';
  g.fill(V.land);
  const se = S ? S.season : 0;
  g.save();
  g.clip(V.land);
  for (const [p, c] of V.tint) {
    g.fillStyle = c;
    g.fill(p);
  }
  if (se === 1 && V.tint[1]) {
    g.fillStyle = 'rgba(226,196,104,.22)';
    g.fill(V.tint[1][0]);
  }
  if (se === 3) {
    g.fillStyle = 'rgba(226,234,238,.32)';
    g.fillRect(0, 0, W, H);
    if (V.tint[2]) {
      g.fillStyle = 'rgba(244,247,248,.7)';
      g.fill(V.tint[2][0]);
    }
  }
  g.imageSmoothingEnabled = true;
  g.save();
  clipOut(g, V.thick);
  g.drawImage(landWash(se), 0, 0, W, H);
  g.restore();
  // woodland floor: a soft tint with no hard outline (the trees on top show the edge)
  g.fillStyle = [
    'rgba(176,200,150,.55)',
    'rgba(176,200,150,.55)',
    'rgba(190,190,140,.55)',
    'rgba(180,192,170,.5)',
  ][se];
  g.fill(V.thick);
  g.drawImage(tempWash(se), 0, 0, W, H);
  g.globalAlpha = OPENLAND.hill;
  g.drawImage(V.landD.hill, 0, 0, W, H);
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(60,80,50,.13)';
  g.fill(V.trees.shadow);
  g.fill(V.landD.loneShadow);
  g.restore();
  g.strokeStyle = CONTOURS.line[0];
  g.lineWidth = CONTOURS.line[1];
  g.stroke(V.cont);
  g.strokeStyle = CONTOURS.bold[0];
  g.lineWidth = CONTOURS.bold[1];
  g.stroke(V.contB);
  if (CONTOURS.halo) {
    // contours fade out just before a rock: a soft band of the land's colour round each rock, under the rock
    g.save();
    g.clip(V.land);
    g.strokeStyle = CONTOURS.halo[0];
    g.lineWidth = CONTOURS.halo[1];
    g.lineJoin = 'round';
    g.stroke(V.rock.outline);
    g.restore();
  }
  paintRock(g, se);
  g.strokeStyle = 'rgba(21,25,24,.75)';
  g.lineWidth = 1.2;
  g.stroke(V.coast);
  // lone trees, on the ground layer (creatures walk over them)
  g.fillStyle = TREES.colour[se][1];
  g.globalAlpha = 0.9;
  g.fill(V.landD.lone);
  g.globalAlpha = 1;
  g.strokeStyle = '#34502b';
  g.lineWidth = 0.75;
  g.lineJoin = 'round';
  g.stroke(V.landD.lone);
  g.stroke(V.landD.loneShade);
  g.strokeStyle = '#4d7385';
  g.lineWidth = 1.2;
  g.lineJoin = 'round';
  g.stroke(V.chev);
}
// rock: faces, tiers and ridges inside the straightened outline (cut off at the coast), then the
// outline and the skirt of strokes. In winter the upper tiers are snow
function paintRock(g, se) {
  const R = world.vec.rock;
  g.save();
  g.clip(world.vec.land);
  g.save();
  g.clip(R.outline, 'evenodd');
  g.fillStyle = ROCKS.face[0];
  g.fill(R.outline, 'evenodd');
  R.face.forEach((p, k) => {
    g.fillStyle = ROCKS.face[k];
    g.fill(p);
  });
  R.tiers.forEach(p => {
    g.fillStyle = se === 3 ? 'rgba(250,252,252,.6)' : ROCKS.tier;
    g.fill(p, 'evenodd');
  });
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.fillStyle = ROCKS.shade;
  g.fill(R.face[2]);
  g.strokeStyle = 'rgba(40,36,30,.55)';
  g.lineWidth = 0.9;
  for (const p of R.tiers) g.stroke(p);
  g.strokeStyle = 'rgba(30,26,22,.75)';
  g.stroke(R.ridge);
  g.strokeStyle = 'rgba(40,36,30,.6)';
  g.lineWidth = 0.85;
  g.stroke(R.tick);
  g.strokeStyle = 'rgba(30,26,22,.85)';
  g.lineWidth = 1.1;
  g.stroke(R.tickD);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.lineJoin = 'miter';
  g.stroke(R.outline);
  g.lineJoin = 'round';
  g.stroke(R.cliff);
  g.restore();
}
// thicket trees live on their own layer, drawn over creatures and food so they look tucked in among the trees
function paintStipple(g) {
  if (MAP_STYLE === 'diorama') return paintStippleDio(g);
  const se = S ? S.season : 0,
    keepOut = new Path2D();
  // anything still overlapping rock is cut off where the rock begins
  keepOut.rect(-W, -H, 3 * W, 3 * H);
  keepOut.addPath(world.vec.rock.outline);
  g.save();
  g.clip(keepOut, 'evenodd');
  g.lineJoin = 'round';
  g.strokeStyle = '#34502b';
  g.lineWidth = 0.75;
  for (const row of world.vec.trees.rows) {
    TREES.colour[se].forEach((c, j) => {
      g.fillStyle = c;
      TREES.alpha.forEach(([a], k) => {
        g.globalAlpha = a;
        g.fill(row.fills[j][k]);
      });
    });
    g.globalAlpha = 1;
    g.stroke(row.crowns);
    g.stroke(row.shade);
  }
  g.restore();
}

// copies the part of a zoomed-in detail image (drawn at twice the screen's size, so panning stays sharp) that is on
// screen now, offset by how far the camera has moved since it was drawn
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
// an acorn: a brown nut under a darker cap. A regrowing nut is smaller and goes through three stages: a bare pale nut
// just after eating, a pale nut with a small cap half grown, and the full dark acorn when ready to eat
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
