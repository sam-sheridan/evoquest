// prototype 2: the original field-notebook map, with new sea depths, algae beds and hand-drawn trees
(() => {
  const P = (window.PROTO = Object.assign({ tree: 1, algae: 1, floorMix: 0.65 }, window.PROTO || {}));
  const C = {};
  function blur(A, n) {
    let a = A;
    for (let k = 0; k < n; k++) {
      const b = new Float32Array(a.length);
      for (let y = 0; y < GH; y++)
        for (let x = 0; x < GW; x++) {
          let s = 0,
            m = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx,
                yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
              s += a[yy * GW + xx];
              m++;
            }
          b[y * GW + x] = s / m;
        }
      a = b;
    }
    return a;
  }
  function prep() {
    const w = world;
    if (C.vec === w.vec) return;
    C.vec = w.vec;
    const N = GW * GH,
      T = w.type,
      sea = [];
    for (let i = 0; i < N; i++) if (T[i] === 0) sea.push(i);
    const rank = f => {
      const r = new Float32Array(N);
      sea.slice()
        .sort((a, b) => f(a) - f(b))
        .forEach((i, k) => (r[i] = k / sea.length));
      return r;
    };
    const rD = rank(i => w.dLand[i]),
      rF = rank(i => w.level - w.hgt[i]);
    let dep = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = i % GW,
        y = (i / GW) | 0,
        edge = 1 - Math.min(x, y, GW - 1 - x, GH - 1 - y) / 10;
      dep[i] =
        T[i] === 0 ? Math.max(edge, (1 - P.floorMix) * rD[i] + P.floorMix * rF[i]) : isLand(T[i]) ? -0.15 : 0;
    }
    dep = blur(dep, 2);
    // land must stay "shallow" so bands meet the shore
    for (let i = 0; i < N; i++) if (isLand(T[i])) dep[i] = -0.2;
    C.dep = dep;
    const shal = i => 1 - dep[i];
    C.bands = [0.16, SEA.shelf, 0.55, 0.8].map(d => march(shal, 1 - d, true, true));
    // algae beds: patches on the shallow shelf, from a mottling noise
    const rn = mulberry32(w.seed ^ 0x51ab),
      mot = field(rn, [
        [18, 1],
        [36, 0.6],
        [72, 0.3],
      ]);
    const al = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = i % GW,
        y = (i / GW) | 0;
      al[i] = T[i] === 0 || T[i] === 4 ? mot(x / GW, y / GH) + (SEA.shelf - dep[i]) * 0.9 : 0;
    }
    const alg = march(i => al[i], 0.66, true, true);
    C.alg = alg;
    // algae marks inside the beds
    const r = mulberry32(w.seed ^ 0xa16a);
    C.algD = new Path2D();
    for (let i = 0; i < N; i++) {
      if (al[i] < 0.66 || !(T[i] === 0 || T[i] === 4)) continue;
      const x0 = (i % GW) * CS,
        y0 = ((i / GW) | 0) * CS;
      if (P.algae === 1) {
        for (let k = 0; k < 3; k++) {
          const x = x0 + r() * CS,
            y = y0 + r() * CS;
          C.algD.moveTo(x + 0.9, y);
          C.algD.arc(x, y, 0.9, 0, TAU);
        }
      } else if (r() < 0.45) {
        // a little weed tuft
        const x = x0 + r() * CS,
          y = y0 + r() * CS;
        C.algD.moveTo(x - 2.2, y - 2.6);
        C.algD.quadraticCurveTo(x - 1.6, y - 0.6, x, y);
        C.algD.quadraticCurveTo(x + 1.6, y - 0.6, x + 2.2, y - 2.6);
        C.algD.moveTo(x, y);
        C.algD.lineTo(x, y - 3.2);
      }
    }
    trees();
  }
  // ---------- trees, drawn back to front in rows so nearer crowns hide the ones behind ----------
  function crown(p, x, y, r, n, a0) {
    // a scalloped crown: n bumps round the edge, as one closed outline
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
  function trees() {
    const w = world,
      r = mulberry32(w.seed ^ 0x7ee5),
      T = w.type,
      list = [];
    for (let i = 0; i < GW * GH; i++) {
      if (T[i] !== 2) continue;
      const k = clamp((w.dThick[i] - THICKET.edge) / (THICKET.deep - THICKET.edge), 0, 1),
        n = (P.tree === 3 ? 0.5 + 0.9 * k : 0.45 + 0.8 * k) + r() * 0.4,
        x0 = (i % GW) * CS,
        y0 = ((i / GW) | 0) * CS;
      for (let j = 0; j < n; j++) {
        const x = x0 + r() * CS,
          y = y0 + r() * CS;
        if (T[cellI(x, y)] !== 2) continue;
        list.push({ x, y, r: 3 + 4.2 * k + r() * 1.8, a: r() * TAU, k });
      }
    }
    list.sort((a, b) => a.y - b.y);
    const rows = [],
      sh = new Path2D();
    let cur = null;
    for (const t of list) {
      const row = Math.floor(t.y / 8);
      if (!cur || cur.row !== row) rows.push((cur = { row, fill: new Path2D(), ink: new Path2D(), dots: new Path2D() }));
      if (P.tree === 3) {
        // side-view tree: round crown on a short trunk
        const h = t.r * 1.7;
        cur.ink.moveTo(t.x, t.y - h + t.r * 0.9);
        cur.ink.lineTo(t.x, t.y);
        crown(cur.fill, t.x, t.y - h, t.r, t.r > 5 ? 7 : 5, -Math.PI / 2);
        crown(cur.ink, t.x, t.y - h, t.r, t.r > 5 ? 7 : 5, -Math.PI / 2);
        sh.moveTo(t.x + t.r * 0.9, t.y);
        sh.ellipse(t.x, t.y, t.r * 0.9, t.r * 0.32, 0, 0, TAU);
      } else {
        const n = t.r > 5 ? 7 : 5;
        crown(cur.fill, t.x, t.y, t.r, n, t.a);
        crown(cur.ink, t.x, t.y, t.r, n, t.a);
        sh.moveTo(t.x + t.r * 0.35 + t.r * 1.1, t.y + t.r * 0.4);
        sh.arc(t.x + t.r * 0.35, t.y + t.r * 0.4, t.r * 1.1, 0, TAU);
        if (P.tree === 2) {
          for (let j = 0; j < t.r * 0.9; j++) {
            const a = r() * TAU,
              d = Math.sqrt(r()) * t.r * 0.8,
              x = t.x + Math.cos(a) * d + t.r * 0.15,
              y = t.y + Math.sin(a) * d + t.r * 0.15;
            cur.dots.moveTo(x + 0.75, y);
            cur.dots.arc(x, y, 0.75, 0, TAU);
          }
        } else {
          // a shading stroke on the lower right of the crown
          const a1 = 0.1,
            a2 = 1.5;
          cur.ink.moveTo(t.x + Math.cos(a1) * t.r * 0.62, t.y + Math.sin(a1) * t.r * 0.62);
          cur.ink.arc(t.x, t.y, t.r * 0.62, a1, a2);
        }
      }
    }
    C.rows = rows;
    C.sh = sh;
  }
  const FILL = ['#cfe0b8', '#c9dcae', '#d6d4a0', '#cfd8c6'],
    FILL2 = ['#bcd3a2', '#b4cd98', '#c8c48a', '#bfcbb3'];
  window.paintTerrain = function (g) {
    prep();
    const V = world.vec,
      se = typeof S !== 'undefined' && S ? S.season : 0;
    g.fillStyle = BAND[3];
    g.fillRect(0, 0, W, H);
    // sea depth bands, deepest first
    const BC = ['#dbe7e7', '#cbdde1', '#bfd4da', '#b5ccd4', '#adc6cf'];
    g.fillStyle = BC[4];
    g.fillRect(0, 0, W, H);
    for (let k = 3; k >= 0; k--) {
      g.fillStyle = BC[k];
      g.fill(C.bands[k].fill);
    }
    // algae beds
    g.fillStyle = 'rgba(160,196,150,.38)';
    g.fill(C.alg.fill);
    g.strokeStyle = 'rgba(70,120,80,.35)';
    g.lineWidth = 0.7;
    g.stroke(C.alg.line);
    g.fillStyle = 'rgba(52,110,70,.55)';
    g.strokeStyle = 'rgba(52,110,70,.6)';
    g.lineWidth = 0.7;
    if (P.algae === 1) g.fill(C.algD);
    else g.stroke(C.algD);
    // depth lines: thin, and the shelf edge (where deep water begins) dashed
    g.strokeStyle = 'rgba(77,115,133,.35)';
    g.lineWidth = 0.7;
    g.stroke(C.bands[0].line);
    g.stroke(C.bands[2].line);
    g.save();
    g.setLineDash([5, 3.5]);
    g.strokeStyle = 'rgba(60,98,118,.65)';
    g.lineWidth = 0.9;
    g.stroke(C.bands[1].line);
    g.restore();
    g.fillStyle = BC[0];
    g.fill(V.river);
    g.fillStyle = '#e9ecde';
    g.fill(V.land);
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
    g.fillStyle = ['rgba(196,220,170,.7)', 'rgba(205,220,180,.35)', 'rgba(218,212,170,.45)', 'rgba(205,214,196,.35)'][se];
    g.fill(V.mead);
    // woodland floor: a soft tint, no hard outline
    g.fillStyle = ['rgba(176,200,150,.55)', 'rgba(176,200,150,.55)', 'rgba(190,190,140,.55)', 'rgba(180,192,170,.5)'][se];
    g.fill(V.thick);
    g.drawImage(tempWash(se), 0, 0, W, H);
    g.fillStyle = 'rgba(60,80,50,.13)';
    g.fill(C.sh);
    g.restore();
    const RF = se === 3 ? ['#cfc8bb', '#bfb7a8', '#e9eeef', '#fbfcfc'] : ['#cfc8bb', '#bfb7a8', '#aea595', '#9d9483'];
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
  };
  // trees sit on the layer over creatures, so creatures look tucked in among them
  window.paintStipple = function (g) {
    prep();
    const se = typeof S !== 'undefined' && S ? S.season : 0;
    g.save();
    g.lineJoin = 'round';
    for (let k = 0; k < C.rows.length; k++) {
      const row = C.rows[k];
      g.fillStyle = FILL[se];
      g.globalAlpha = P.alpha ?? 0.92;
      g.fill(row.fill);
      g.globalAlpha = 1;
      g.strokeStyle = '#34502b';
      g.lineWidth = 0.75;
      g.stroke(row.ink);
      if (P.tree === 2) {
        g.fillStyle = '#34502b';
        g.fill(row.dots);
      }
    }
    g.restore();
  };
  if (!world) return;
  const g = tcan.getContext('2d');
  g.setTransform(TS, 0, 0, TS, 0, 0);
  paintTerrain(g);
  paintStipple(g);
  bakeLo();
  detail.ok = false;
})();
