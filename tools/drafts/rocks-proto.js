// rock drafts: angular outlines, faceted / hachured / cracked styles, stone clusters
(() => {
  const P = (window.PROTO = Object.assign({ style: 'A', stones: 1 }, window.PROTO || {}));
  const C = (window.__rk = {});
  const TAU2 = Math.PI * 2;
  // ---- outline tracing: marching squares, chained into closed loops ----
  function trace(fv, thr) {
    const segs = [],
      px = a => (a + 0.5) * CS;
    for (let y = 0; y < GH - 1; y++)
      for (let x = 0; x < GW - 1; x++) {
        const Pt = [
            [x, y],
            [x + 1, y],
            [x + 1, y + 1],
            [x, y + 1],
          ],
          V = Pt.map(([a, b]) => fv(b * GW + a)),
          ins = V.map(v => v >= thr);
        const cnt = ins.filter(Boolean).length;
        if (cnt === 0 || cnt === 4) continue;
        const cross = [];
        for (let k = 0; k < 4; k++) {
          const a = Pt[k],
            b = Pt[(k + 1) % 4],
            va = V[k],
            vb = V[(k + 1) % 4];
          if (ins[k] !== ins[(k + 1) % 4]) {
            const f = (thr - va) / (vb - va);
            cross.push([px(a[0] + (b[0] - a[0]) * f), px(a[1] + (b[1] - a[1]) * f)]);
          }
        }
        for (let k = 0; k + 1 < cross.length; k += 2) segs.push([cross[k], cross[k + 1]]);
      }
    const key = p => Math.round(p[0] * 8) + ',' + Math.round(p[1] * 8),
      adj = new Map();
    segs.forEach((s, i) => {
      for (const e of [0, 1]) {
        const k = key(s[e]);
        if (!adj.has(k)) adj.set(k, []);
        adj.get(k).push(i);
      }
    });
    const used = new Uint8Array(segs.length),
      loops = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const loop = [segs[i][0], segs[i][1]];
      let end = segs[i][1];
      for (;;) {
        const nb = (adj.get(key(end)) || []).find(j => !used[j]);
        if (nb === undefined) break;
        used[nb] = 1;
        const s = segs[nb],
          nxt = key(s[0]) === key(end) ? s[1] : s[0];
        loop.push(nxt);
        end = nxt;
      }
      loops.push(loop);
    }
    return loops;
  }
  // Douglas–Peucker: keeps the corners, drops the small wiggles, giving long straight angular edges
  function simplify(pts, tol) {
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop();
      let md = 0,
        mi = -1;
      const [ax, ay] = pts[a],
        [bx, by] = pts[b],
        L = Math.hypot(bx - ax, by - ay) || 1;
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
  const area = p => {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i],
        [x2, y2] = p[(i + 1) % p.length];
      s += x1 * y2 - x2 * y1;
    }
    return s / 2;
  };
  function stone(path, dark, ink, x, y, r, rnd) {
    const n = 5 + ((rnd() * 2) | 0),
      a0 = rnd() * TAU2,
      pts = [];
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * TAU2,
        rr = r * (0.75 + rnd() * 0.4);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85]);
    }
    path.moveTo(...pts[0]);
    pts.forEach(p => path.lineTo(...p));
    path.closePath();
    ink.moveTo(...pts[0]);
    pts.forEach(p => ink.lineTo(...p));
    ink.closePath();
    // the shaded south-east half
    dark.moveTo(x, y);
    pts.forEach(([px, py]) => {
      if ((px - x) + (py - y) > -r * 0.2) dark.lineTo(px, py);
    });
    dark.closePath();
  }
  window.__tr = trace;
  window.__simp = simplify;
  // parallel hatching lines across a triangle, at angle ang, gap px apart
  function hatchTri(path, A, B, Cc, ang, gap) {
    const nx = -Math.sin(ang),
      ny = Math.cos(ang),
      P3 = [A, B, Cc],
      t = P3.map(p => p[0] * nx + p[1] * ny),
      lo = Math.min(...t),
      hi = Math.max(...t);
    for (let v = Math.ceil(lo / gap) * gap; v < hi; v += gap) {
      const pts = [];
      for (let k = 0; k < 3; k++) {
        const a = P3[k],
          b = P3[(k + 1) % 3],
          ta = t[k],
          tb = t[(k + 1) % 3];
        if ((ta - v) * (tb - v) < 0) {
          const f = (v - ta) / (tb - ta);
          pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        }
      }
      if (pts.length === 2) {
        path.moveTo(...pts[0]);
        path.lineTo(...pts[1]);
      }
    }
  }
  function prep() {
    const w = world;
    if (C.vec === w.vec) return;
    C.vec = w.vec;
    const N = GW * GH,
      T = w.type,
      rnd = mulberry32(w.seed ^ 0x40c);
    // rock components; small ones become stone clusters instead of plates
    const comp = new Int32Array(N).fill(-1),
      sizes = [],
      cells = [];
    for (let s = 0; s < N; s++) {
      if (T[s] !== 3 || comp[s] >= 0) continue;
      const id = sizes.length,
        st = [s],
        list = [s];
      comp[s] = id;
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
          if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || comp[k] >= 0 || T[k] !== 3) continue;
          comp[k] = id;
          st.push(k);
          list.push(k);
        }
      }
      sizes.push(list.length);
      cells.push(list);
    }
    const small = id => sizes[id] < P.minCells;
    const thr = w.rThr,
      big = i => T[i] === 3 && !small(comp[i]),
      // water next to rock counts as rock, so the outline runs out past the coast and is cut by the smooth coastline
      wet = i => {
        if (!isWater(T[i])) return false;
        const x = i % GW,
          y = (i / GW) | 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx,
              yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < GW && yy < GH && big(yy * GW + xx)) return true;
          }
        return false;
      },
      fv = i => (big(i) || wet(i) ? Math.max(w.rck[i], thr + 0.002) : Math.min(w.rck[i], thr - 0.002));
    // angular outlines
    C.outline = new Path2D();
    C.loops = [];
    for (const l of trace(fv, thr)) {
      // a closed loop is split at the point farthest from its start, and each half straightened
      let m = 0,
        md = -1;
      l.forEach((p, k) => {
        const d = Math.hypot(p[0] - l[0][0], p[1] - l[0][1]);
        if (d > md) [md, m] = [d, k];
      });
      const s = simplify(l.slice(0, m + 1), P.tol).concat(simplify(l.slice(m), P.tol).slice(1, -1));
      if (s.length < 3 || Math.abs(area(s)) < 120) continue;
      C.loops.push(s);
      C.outline.moveTo(...s[0]);
      for (const p of s) C.outline.lineTo(...p);
      C.outline.closePath();
    }
    // smooth rock height for shading: 0 at the rock's edge, rising inside
    let h = new Float32Array(N);
    for (let i = 0; i < N; i++) h[i] = Math.max(0, w.rck[i] - thr + 0.01);
    for (let k = 0; k < 2; k++) {
      const b = new Float32Array(N);
      for (let y = 0; y < GH; y++)
        for (let x = 0; x < GW; x++) {
          let s = 0,
            n = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx,
                yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
              s += h[yy * GW + xx];
              n++;
            }
          b[y * GW + x] = s / n;
        }
      h = b;
    }
    let hMax = 1e-6;
    for (let i = 0; i < N; i++) if (T[i] === 3) hMax = Math.max(hMax, h[i]);
    const Hs = (x, y) => {
      const fx = clamp(x / CS - 0.5, 0, GW - 1.001),
        fy = clamp(y / CS - 0.5, 0, GH - 1.001),
        xi = fx | 0,
        yi = fy | 0,
        u = fx - xi,
        v = fy - yi,
        i = yi * GW + xi;
      return (
        ((h[i] * (1 - u) + h[i + 1] * u) * (1 - v) + (h[i + GW] * (1 - u) + h[i + GW + 1] * u) * v) / hMax
      );
    };
    const isRock = (x, y) => {
      const i = cellI(clamp(x, 0, W - 1), clamp(y, 0, H - 1 - 1));
      return w.rck[i] > thr - 0.03 && !(T[i] === 3 && small(comp[i]));
    };
    // ---- faceted relief: a jittered triangle mesh, each face shaded by which way it faces ----
    C.tone = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    C.ridge = new Path2D();
    C.toneH = [0, 1, 2].map(() => [0, 1, 2].map(() => new Path2D()));
    C.hatchF = new Path2D();
    C.crack = new Path2D();
    const sp = 'BC'.includes(P.style) ? 34 : 44,
      nx = Math.ceil(W / sp) + 1,
      ny = Math.ceil(H / sp) + 1,
      vx = new Float32Array(nx * ny),
      vy = new Float32Array(nx * ny),
      vz = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        vx[k] = i * sp + (rnd() - 0.5) * sp * 0.7;
        vy[k] = j * sp + (rnd() - 0.5) * sp * 0.7;
        vz[k] = Hs(vx[k], vy[k]) * P.relief;
      }
    const L = [-0.55, -0.62, 0.56],
      edges = new Map(),
      shadeOf = (a, b, c) => {
        const ux = vx[b] - vx[a],
          uy = vy[b] - vy[a],
          uz = vz[b] - vz[a],
          wx = vx[c] - vx[a],
          wy = vy[c] - vy[a],
          wz = vz[c] - vz[a];
        let nx2 = uy * wz - uz * wy,
          ny2 = uz * wx - ux * wz,
          nz2 = ux * wy - uy * wx;
        if (nz2 < 0) [nx2, ny2, nz2] = [-nx2, -ny2, -nz2];
        const m = Math.hypot(nx2, ny2, nz2) || 1;
        return (nx2 * L[0] + ny2 * L[1] + nz2 * L[2]) / m;
      };
    const tri = (a, b, c) => {
      const cx = (vx[a] + vx[b] + vx[c]) / 3,
        cy = (vy[a] + vy[b] + vy[c]) / 3;
      if (!isRock(cx, cy) && !isRock(vx[a], vy[a]) && !isRock(vx[b], vy[b]) && !isRock(vx[c], vy[c])) return;
      const s = shadeOf(a, b, c),
        zs = [vz[a], vz[b], vz[c]],
        flat = Math.max(...zs) - Math.min(...zs) < P.flat * P.relief,
        t = flat || s > 0.52 ? 0 : s > 0.4 ? 1 : 2,
        hb = Math.min(2, Math.floor(((zs[0] + zs[1] + zs[2]) / 3 / P.relief) * 3));
      C.toneH[t][hb].moveTo(vx[a], vy[a]);
      C.toneH[t][hb].lineTo(vx[b], vy[b]);
      C.toneH[t][hb].lineTo(vx[c], vy[c]);
      C.toneH[t][hb].closePath();
      const p = C.tone[t];
      if (t === 2) hatchTri(C.hatchF, [vx[a], vy[a]], [vx[b], vy[b]], [vx[c], vy[c]], 0.9, P.hatchGap);
      p.moveTo(vx[a], vy[a]);
      p.lineTo(vx[b], vy[b]);
      p.lineTo(vx[c], vy[c]);
      p.closePath();
      for (const [u, v] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const k = u < v ? u + ',' + v : v + ',' + u;
        if (!edges.has(k)) edges.set(k, [u, v, []]);
        edges.get(k)[2].push(s);
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
    // ink along ridges and gullies: edges where the faces on each side are lit very differently
    for (const [u, v, s] of edges.values())
      if (s.length === 2 && Math.min(s[0], s[1]) < 0.4 && Math.max(s[0], s[1]) > 0.52 && (vz[u] + vz[v]) / 2 > 0.04 * P.relief) {
        C.ridge.moveTo(vx[u], vy[u]);
        C.ridge.lineTo(vx[v], vy[v]);
      }
    // cracks: short jagged lines on the bigger rocks
    for (const list of cells) {
      if (list.length < P.minCells * 3) continue;
      const n = Math.min(6, Math.floor(list.length / 40) + 1);
      for (let q = 0; q < n; q++) {
        const i = list[(rnd() * list.length) | 0];
        let x = (i % GW + rnd()) * CS,
          y = (((i / GW) | 0) + rnd()) * CS,
          a = rnd() * TAU2;
        C.crack.moveTo(x, y);
        for (let s = 0; s < 3 + rnd() * 3; s++) {
          a += (rnd() - 0.5) * 1.2;
          x += Math.cos(a) * (5 + rnd() * 6);
          y += Math.sin(a) * (5 + rnd() * 6);
          if (!isRock(x, y)) break;
          C.crack.lineTo(x, y);
        }
      }
    }
    // ---- hachures: short strokes running downhill, closer together on steep and shaded slopes ----
    C.hach = new Path2D();
    C.hachD = new Path2D();
    if ('BC'.includes(P.style)) {
      // rows of strokes: start on evenly spaced height levels and run downhill towards the next level
      const hv = i => h[i] / hMax;
      for (let lv = 0.06; lv < 1; lv += P.lvl)
        for (const line of trace(hv, lv)) {
          let carry = 0;
          for (let k = 0; k + 1 < line.length; k++) {
            const [ax, ay] = line[k],
              [bx, by] = line[k + 1],
              seg = Math.hypot(bx - ax, by - ay);
            for (let d = carry; d < seg; d += P.hs) {
              const px = ax + ((bx - ax) * d) / seg,
                py = ay + ((by - ay) * d) / seg;
              if (!isRock(px, py)) continue;
              const gx = (Hs(px + 4, py) - Hs(px - 4, py)) / 8,
                gy = (Hs(px, py + 4) - Hs(px, py - 4)) / 8,
                g = Math.hypot(gx, gy);
              if (g < 1e-5) continue;
              const len = clamp((P.lvl / g) * 0.75, 3, 13),
                dx = -gx / g,
                dy = -gy / g,
                shadow = dx + dy > 0.2,
                p = shadow ? C.hachD : C.hach;
              p.moveTo(px, py);
              p.lineTo(px + dx * len, py + dy * len);
            }
            carry = (carry - seg) % P.hs;
            if (carry < 0) carry += P.hs;
          }
        }
    }
    // ---- stones: clusters where the tiny rock bits were, and a few loose ones along big rocks' edges ----
    C.stone = new Path2D();
    C.stoneD = new Path2D();
    C.stoneI = new Path2D();
    if (P.stones)
      for (const list of cells)
        if (small(comp[list[0]])) {
          let sx = 0,
            sy = 0;
          for (const i of list) {
            sx += (i % GW) + 0.5;
            sy += ((i / GW) | 0) + 0.5;
          }
          sx = (sx / list.length) * CS;
          sy = (sy / list.length) * CS;
          const n = 2 + Math.min(3, list.length) + ((rnd() * 2) | 0);
          for (let k = 0; k < n; k++)
            stone(C.stone, C.stoneD, C.stoneI, sx + (rnd() - 0.5) * 20, sy + (rnd() - 0.5) * 16, 3 + rnd() * 3.5, rnd);
        }
    if (P.loose)
      for (const s of C.loops) {
        if (Math.abs(area(s)) < 4000) continue;
        const sg = area(s) > 0 ? 1 : -1;
        for (let k = 0; k < s.length; k++) {
          if (rnd() > P.loose) continue;
          const [ax, ay] = s[k],
            [bx, by] = s[(k + 1) % s.length],
            t = rnd(),
            x = ax + (bx - ax) * t,
            y = ay + (by - ay) * t,
            l = Math.hypot(bx - ax, by - ay) || 1,
            // outward normal (depends on the loop's direction)
            ox = (-(by - ay) / l) * sg,
            oy = ((bx - ax) / l) * sg,
            n = 2 + ((rnd() * 3) | 0);
          for (let q = 0; q < n; q++) {
            const d = 7 + rnd() * 9;
            const cx = x - ox * d + (rnd() - 0.5) * 10,
              cy = y - oy * d + (rnd() - 0.5) * 10;
            if (isRock(cx, cy) || !isLand(T[cellI(clamp(cx, 0, W - 1), clamp(cy, 0, H - 2))])) continue;
            stone(C.stone, C.stoneD, C.stoneI, cx, cy, 2.2 + rnd() * 2.6, rnd);
          }
        }
      }
    // summits: a small ink peak mark on each high point
    C.summit = new Path2D();
    {
      const pk = [];
      for (let y = 1; y < GH - 1; y++)
        for (let x = 1; x < GW - 1; x++) {
          const i = y * GW + x,
            v = h[i];
          if (T[i] !== 3 || v / hMax < 0.45) continue;
          let top = true;
          for (let dy = -2; dy <= 2 && top; dy++)
            for (let dx = -2; dx <= 2; dx++) {
              const xx = x + dx,
                yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
              if (h[yy * GW + xx] > v) {
                top = false;
                break;
              }
            }
          if (top && !pk.some(([px2, py2]) => Math.hypot(px2 - x, py2 - y) < 6)) pk.push([x, y]);
        }
      for (const [x, y] of pk) {
        const cx = (x + 0.5) * CS,
          cy = (y + 0.5) * CS;
        C.summit.moveTo(cx - 4.5, cy + 3);
        C.summit.lineTo(cx, cy - 4.5);
        C.summit.lineTo(cx + 4.5, cy + 3);
        C.summit.closePath();
      }
    }
    // skirt: one ring of short strokes just inside each rock's edge, longer where the rock rises higher
    C.tick = new Path2D();
    const tctx = document.createElement('canvas').getContext('2d');
    C.tickD = new Path2D();
    for (const l of C.loops) {
      let carry = 0;
      for (let k = 0; k < l.length; k++) {
        const [ax, ay] = l[k],
          [bx, by] = l[(k + 1) % l.length],
          seg = Math.hypot(bx - ax, by - ay);
        if (seg < 1) continue;
        let nx2 = -(by - ay) / seg,
          ny2 = (bx - ax) / seg;
        const mx = (ax + bx) / 2,
          my = (ay + by) / 2;
        const inRock = (x, y) => tctx.isPointInPath(C.outline, x, y, 'evenodd');
        if (!inRock(mx + nx2 * 4, my + ny2 * 4)) [nx2, ny2] = [-nx2, -ny2];
        if (!inRock(mx + nx2 * 4, my + ny2 * 4)) continue;
        for (let d = carry; d < seg; d += P.tick) {
          const x = ax + ((bx - ax) * d) / seg,
            y = ay + ((by - ay) * d) / seg,
            rise = Hs(x + nx2 * 14, y + ny2 * 14),
            len = clamp(4 + rise * 22, 4, 13),
            shade = -nx2 - ny2 > 0.3,
            p = shade ? C.tickD : C.tick;
          p.moveTo(x + nx2 * 1.5, y + ny2 * 1.5);
          p.lineTo(x + nx2 * len, y + ny2 * len);
        }
        carry = (((carry - seg) % P.tick) + P.tick) % P.tick;
      }
    }
    // tiers: angular inner outlines at two heights
    C.tiers = [0.33, 0.62].map(lv => {
      const p = new Path2D();
      for (const l of trace(i => h[i] / hMax, lv)) {
        let m = 0,
          md = -1;
        l.forEach((q, k) => {
          const d = Math.hypot(q[0] - l[0][0], q[1] - l[0][1]);
          if (d > md) [md, m] = [d, k];
        });
        const sl = simplify(l.slice(0, m + 1), P.tol).concat(simplify(l.slice(m), P.tol).slice(1, -1));
        if (sl.length < 3 || Math.abs(area(sl)) < 400) continue;
        p.moveTo(...sl[0]);
        for (const q of sl) p.lineTo(...q);
        p.closePath();
      }
      return p;
    });
  }
  const TONE = ['#e2dccf', '#cdc5b5', '#b3a998', '#978d7c'];
  function drawRocks(g) {
    prep();
    g.save();
    g.clip(world.vec.land);
    g.fillStyle = P.style === 'B' ? '#d6cfc1' : TONE[1];
    g.fill(C.outline, 'evenodd');
    g.clip(C.outline, 'evenodd');
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if ('AEF'.includes(P.style)) {
      C.tone.forEach((p, k) => {
        g.fillStyle = ['#e4ded2', '#d6cebf', '#c9c0ae'][k];
        g.fill(p);
      });
    }
    if (P.style === 'D') {
      const DT = [
        ['#d9d2c4', '#e3ddd1', '#eee9e0'],
        ['#c9c0ae', '#d4ccbc', '#dfd8cb'],
        ['#b8ae9b', '#c4bba9', '#d0c8b8'],
      ];
      C.toneH.forEach((row, t) =>
        row.forEach((p, hb) => {
          g.fillStyle = DT[t][hb];
          g.fill(p);
        })
      );
    }
    if (P.style === 'F') {
      for (const p of C.tiers) {
        g.fillStyle = 'rgba(255,253,248,.22)';
        g.fill(p, 'evenodd');
      }
    }
    if ('ADEF'.includes(P.style)) {
      g.strokeStyle = 'rgba(40,36,30,.5)';
      g.lineWidth = 0.7;
      g.stroke(C.hatchF);
    }
    if (P.style === 'F') {
      g.strokeStyle = 'rgba(40,36,30,.55)';
      g.lineWidth = 0.9;
      for (const p of C.tiers) g.stroke(p);
    }
    if (P.style === 'E') {
      g.strokeStyle = 'rgba(40,36,30,.6)';
      g.lineWidth = 0.85;
      g.stroke(C.tick);
      g.strokeStyle = 'rgba(30,26,22,.85)';
      g.lineWidth = 1.1;
      g.stroke(C.tickD);
    }
    if (P.style === 'C') {
      g.fillStyle = 'rgba(120,108,90,.28)';
      g.fill(C.tone[2]);
    }
    if ('BC'.includes(P.style)) {
      g.strokeStyle = 'rgba(40,36,30,.5)';
      g.lineWidth = 0.7;
      g.stroke(C.hach);
      g.strokeStyle = 'rgba(30,26,22,.8)';
      g.lineWidth = 0.95;
      g.stroke(C.hachD);
    }
    if (P.style !== 'B') {
      g.strokeStyle = 'rgba(30,26,22,.75)';
      g.lineWidth = 0.9;
      g.stroke(C.ridge);
    }
    g.restore();
    g.save();
    g.clip(world.vec.land);
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.lineJoin = 'miter';
    g.stroke(C.outline);
    g.restore();
    g.strokeStyle = 'rgba(21,25,24,.75)';
    g.lineWidth = 1.2;
    g.stroke(world.vec.coast);
    if (P.style === 'D') {
      g.fillStyle = '#4a4238';
      g.fill(C.summit);
    }
    g.fillStyle = '#d9d2c4';
    g.fill(C.stone);
    g.fillStyle = '#a79d8b';
    g.fill(C.stoneD);
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.stroke(C.stoneI);
  }
  Object.assign(P, { minCells: 6, tol: 5, relief: 160, hs: 5.5, lvl: 0.11, loose: 0.22, hatchGap: 3.4, flat: 0.14, tick: 5 }, window.PROTO2 || {});
  const orig = paintTerrain;
  window.paintTerrain = function (g) {
    const V = world.vec,
      keep = V.rings;
    V.rings = keep.map(() => ({ fill: new Path2D(), line: new Path2D() }));
    try {
      orig(g);
    } finally {
      V.rings = keep;
    }
    drawRocks(g);
  };
  if (!world) return;
  const g = tcan.getContext('2d');
  g.setTransform(TS, 0, 0, TS, 0, 0);
  paintTerrain(g);
  paintStipple(g);
  bakeLo();
  detail.ok = false;
})();
