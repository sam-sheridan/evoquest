// prototype map painter: overrides paintTerrain / paintStipple for drafts
(() => {
  const P = (window.PROTO = Object.assign({ contours: 0, ink: 0, K: 4, crownA: 0.88, depthMix: 0.65, shade: 1.6 }, window.PROTO || {}));
  const C = {};
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  // bilinear sample of a per-cell array at fractional cell coords
  const bil = (A, fx, fy) => {
    fx = clamp(fx - 0.5, 0, GW - 1.001);
    fy = clamp(fy - 0.5, 0, GH - 1.001);
    const x = fx | 0,
      y = fy | 0,
      u = fx - x,
      v = fy - y,
      i = y * GW + x;
    return lerp(lerp(A[i], A[i + 1], u), lerp(A[i + GW], A[i + GW + 1], u), v);
  };
  function prep() {
    const w = world;
    if (C.vec === w.vec) return;
    C.vec = w.vec;
    C.img = {};
    const N = GW * GH,
      T = w.type;
    // land elevation (rank) with rocks rising, as renderTerrain does
    const R = w.refH,
      el = new Float32Array(N);
    let rMax = w.rThr;
    for (let i = 0; i < N; i++) if (T[i] === 3 && w.rck[i] > rMax) rMax = w.rck[i];
    const r0 = w.rThr - 0.035;
    let mean = 0,
      n = 0;
    for (let i = 0; i < N; i++) {
      const v = w.hgt[i];
      let lo = 0,
        hi = R.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (R[m] < v) lo = m + 1;
        else hi = m;
      }
      el[i] = lo / R.length + clamp((w.rck[i] - r0) / (rMax - r0), 0, 1) ** 1.3 * 1.2 * (isLand(T[i]) ? 1 : 0);
    }
    C.el = el;
    const es = new Float32Array(N);
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        let a = 0,
          n2 = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx,
              yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
            a += el[yy * GW + xx];
            n2++;
          }
        es[y * GW + x] = a / n2;
      }
    C.es = es;
    // water depth: sea depth rank, blended (optionally) with more sea-floor influence
    const dep = new Float32Array(N);
    const sea = [];
    for (let i = 0; i < N; i++) if (T[i] === 0) sea.push(i);
    const rank = f => {
      const rr = new Float32Array(N);
      sea.slice().sort((a, b) => f(a) - f(b)).forEach((i, k) => (rr[i] = k / sea.length));
      return rr;
    };
    const rD = rank(i => w.dLand[i]),
      rF = rank(i => w.level - w.hgt[i]);
    for (let i = 0; i < N; i++)
      dep[i] = T[i] === 0 ? (P.depthMix ? (1 - P.depthMix) * rD[i] + P.depthMix * rF[i] : w.depth[i]) : T[i] === 4 ? 0.05 : 0;
    // land cells next to water read as depth 0 so shallows meet the shore
    C.dep = dep;
    const fz = new Float32Array(N);
    for (let i = 0; i < N; i++) fz[i] = clamp((w.fert[i] - w.fLo) / (w.fHi - w.fLo), 0, 1);
    C.fz = fz;
    const tmp = new Float32Array(N);
    for (let i = 0; i < N; i++) tmp[i] = isLand(T[i]) ? w.temp[i] : 0.5;
    C.tmp = tmp;
    const isl = new Float32Array(N);
    for (let i = 0; i < N; i++) isl[i] = isLand(T[i]) ? 1 : 0;
    C.isl = isl;
    const th = new Float32Array(N);
    for (let i = 0; i < N; i++) th[i] = T[i] === 2 ? 1 : 0;
    C.th = th;
    // a fine mottling noise for algae and grain
    const rn = mulberry32(w.seed ^ 0x51ab);
    C.mot = field(rn, [
      [24, 1],
      [48, 0.7],
      [96, 0.4],
    ]);
    C.mot2 = field(rn, [
      [10, 1],
      [20, 0.6],
    ]);
    trees();
  }
  // ---------- water ----------
  function waterImg() {
    if (C.img.water) return C.img.water;
    const K = P.K,
      cw2 = GW * K,
      ch2 = GH * K,
      can = document.createElement('canvas');
    can.width = cw2;
    can.height = ch2;
    const g = can.getContext('2d'),
      img = g.createImageData(cw2, ch2),
      d = img.data;
    const stops = [
      [0, hex('#d4e9d9')],
      [0.12, hex('#b9ddd2')],
      [0.26, hex('#9fd0cc')],
      [0.33, hex('#83b9c6')],
      [0.45, hex('#6fa5bd')],
      [0.7, hex('#5b91ae')],
      [1, hex('#4b7f9f')],
    ];
    const ramp = t => {
      for (let k = 1; k < stops.length; k++)
        if (t <= stops[k][0]) return mix(stops[k - 1][1], stops[k][1], (t - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]));
      return stops[stops.length - 1][1];
    };
    const algae = hex('#86b07a'),
      w = world;
    for (let y = 0; y < ch2; y++)
      for (let x = 0; x < cw2; x++) {
        const fx = (x + 0.5) / K,
          fy = (y + 0.5) / K,
          u = fx / GW,
          v = fy / GH;
        let t = bil(C.dep, fx, fy);
        // a little ripple of the sea floor so even depths aren't flat
        t = clamp(t + (C.mot2(u, v) - 0.5) * 0.08, 0, 1);
        // fade to the deepest blue towards the map's edge, so the world has no visible border
        t = Math.max(t, 1 - Math.min(fx, fy, GW - fx, GH - fy) / 14);
        let c = ramp(t);
        // algae beds: mottled green patches on the shallow shelf
        const sh = 1 - sstep(SEA.shelf - 0.12, SEA.shelf + 0.02, t),
          m = sstep(0.47, 0.62, C.mot(u, v));
        c = mix(c, algae, sh * m * 0.55);
        const k = (y * cw2 + x) * 4;
        d[k] = c[0];
        d[k + 1] = c[1];
        d[k + 2] = c[2];
        d[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    return (C.img.water = can);
  }
  // ---------- land ----------
  const SEAS = [
    { green: '#98bb78', dry: '#d0cc98', high: '#b9b596', top: '#a7a08d', floor: '#5f7f45' },
    { green: '#b4c482', dry: '#e2cf92', high: '#cbbf9d', top: '#b9b09a', floor: '#55743d' },
    { green: '#b5bd84', dry: '#d9c493', high: '#c2b59b', top: '#b0a795', floor: '#6a7140' },
    { green: '#b9c4ae', dry: '#d3d0bd', high: '#dfe3e2', top: '#f6f8f8', floor: '#56684c' },
  ];
  function landImg(se) {
    const key = 'land' + se;
    if (C.img[key]) return C.img[key];
    const K = P.K,
      cw2 = GW * K,
      ch2 = GH * K,
      can = document.createElement('canvas');
    can.width = cw2;
    can.height = ch2;
    const g = can.getContext('2d'),
      img = g.createImageData(cw2, ch2),
      d = img.data,
      w = world,
      Z = SEAS[se];
    const green = hex(Z.green),
      dry = hex(Z.dry),
      high = hex(Z.high),
      top = hex(Z.top),
      sand = hex('#e8dfbc'),
      frost = hex(se === 3 ? '#e6edf0' : '#b9c2b0'),
      warm = hex('#e8c98a');
    const sh = w.tOff + TEMP.season[se];
    for (let y = 0; y < ch2; y++)
      for (let x = 0; x < cw2; x++) {
        const fx = (x + 0.5) / K,
          fy = (y + 0.5) / K,
          u = fx / GW,
          v = fy / GH;
        const L = bil(C.isl, fx, fy),
          e = bil(C.el, fx, fy),
          f = bil(C.fz, fx, fy);
        const mo = C.mot(u, v) - 0.5;
        let c = mix(dry, green, sstep(0.3, 0.75, f + (C.mot2(u, v) - 0.5) * 0.25 + mo * 0.35));
        c = mix(c, high, sstep(0.55, 0.9, e));
        c = mix(c, top, sstep(0.88, 1.15, e));
        // temperature: frost on cold ground, warmth on hot (gameplay information)
        const tp = bil(C.tmp, fx, fy);
        const cold = sstep(TEMP.cold + 0.05 - sh, TEMP.cold - 0.2 - sh, tp),
          hot = sstep(TEMP.hot - 0.05 - sh, TEMP.hot + 0.2 - sh, tp);
        if (cold > 0) c = mix(c, frost, cold * (se === 3 ? 0.8 : 0.55));
        if (hot > 0) c = mix(c, warm, hot * 0.3);
        // sand at the shore
        c = mix(sand, c, sstep(0.5, 0.9, L));
        // hill shading, light from the north-west
        const ex = bil(C.es, fx + 0.6, fy) - bil(C.es, fx - 0.6, fy),
          ey = bil(C.es, fx, fy + 0.6) - bil(C.es, fx, fy - 0.6),
          s = clamp(1 - (ex + ey) * P.shade, 0.82, 1.1);
        const gr = 1 + mo * 0.07 + (Math.random() - 0.5) * 0.025;
        const k = (y * cw2 + x) * 4;
        d[k] = clamp(c[0] * s * gr, 0, 255);
        d[k + 1] = clamp(c[1] * s * gr, 0, 255);
        d[k + 2] = clamp(c[2] * s * gr, 0, 255);
        d[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    return (C.img[key] = can);
  }
  // ---------- trees ----------
  function trees() {
    const w = world,
      r = mulberry32(w.seed ^ 0x7ee5),
      T = w.type,
      list = [];
    for (let i = 0; i < GW * GH; i++) {
      if (T[i] !== 2) continue;
      const k = clamp((w.dThick[i] - THICKET.edge) / (THICKET.deep - THICKET.edge), 0, 1),
        n = 0.55 + 1.1 * k + r() * 0.5,
        x0 = (i % GW) * CS,
        y0 = ((i / GW) | 0) * CS;
      for (let j = 0; j < n; j++) {
        const x = x0 + r() * CS,
          y = y0 + r() * CS;
        if (T[cellI(x, y)] !== 2) continue;
        list.push({ x, y, r: 3.2 + 5.5 * k + r() * 2.4, g: (r() * 3) | 0, a: r() * TAU, k });
      }
    }
    list.sort((a, b) => a.y - b.y);
    const sh = new Path2D(),
      cr = [new Path2D(), new Path2D(), new Path2D()],
      hl = [new Path2D(), new Path2D(), new Path2D()],
      ink = new Path2D();
    for (const t of list) {
      const lobes = t.r > 6 ? 4 : 3;
      for (let j = 0; j < lobes; j++) {
        const a = t.a + (j * TAU) / lobes,
          lx = t.x + Math.cos(a) * t.r * 0.42,
          ly = t.y + Math.sin(a) * t.r * 0.42,
          lr = t.r * 0.68;
        sh.moveTo(lx + t.r * 0.35 + lr, ly + t.r * 0.45);
        sh.arc(lx + t.r * 0.35, ly + t.r * 0.45, lr, 0, TAU);
        cr[t.g].moveTo(lx + lr, ly);
        cr[t.g].arc(lx, ly, lr, 0, TAU);
      }
      const hx = t.x - t.r * 0.28,
        hy = t.y - t.r * 0.3,
        hr = t.r * 0.42;
      hl[t.g].moveTo(hx + hr, hy);
      hl[t.g].arc(hx, hy, hr, 0, TAU);
      if (P.ink) {
        ink.moveTo(t.x + t.r * 0.9, t.y + t.r * 0.25);
        ink.arc(t.x, t.y, t.r * 0.95, 0.25, 2.2);
      }
    }
    C.tr = { sh, cr, hl, ink, n: list.length };
  }
  const CROWN = [
    [['#6e9c4c', '#638f45', '#7aa556'], ['#9cc46d', '#8fb862', '#a8cc78']],
    [['#4f7a38', '#466f33', '#5a843f'], ['#79a054', '#6f964c', '#83aa5c']],
    [['#7f8a3a', '#9a7a36', '#687a37'], ['#a6ad5a', '#c09a55', '#8f9f55']],
    [['#4d6747', '#45603f', '#55704e'], ['#e4ebe9', '#d9e2df', '#eef2f1']],
  ];
  BAND[3] = '#4b7f9f';
  window.paintTerrain = function (g) {
    prep();
    const V = world.vec,
      se = typeof S !== 'undefined' && S ? S.season : 0;
    g.imageSmoothingEnabled = true;
    g.drawImage(waterImg(), 0, 0, W, H);
    // surf: a pale band just off the shore
    g.save();
    g.strokeStyle = 'rgba(240,248,244,.55)';
    g.lineWidth = 5;
    g.lineJoin = 'round';
    g.stroke(V.coast);
    g.restore();
    g.fillStyle = '#9fd0cc';
    g.fill(V.river);
    g.save();
    g.clip(V.land);
    g.drawImage(landImg(se), 0, 0, W, H);
    // forest floor
    g.fillStyle = SEAS[se].floor;
    g.globalAlpha = 0.55;
    g.fill(V.thick);
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(25,40,20,.32)';
    g.fill(C.tr.sh);
    g.restore();
    const RF = se === 3 ? ['#cfc8bb', '#bfb7a8', '#e9eeef', '#fbfcfc'] : ['#c9c1b2', '#b6ad9d', '#a39a8a', '#918877'];
    V.rings.forEach((r, k) => {
      g.fillStyle = RF[k];
      g.fill(r.fill);
    });
    g.save();
    g.clip(V.rings[0].fill);
    g.strokeStyle = 'rgba(60,55,48,.35)';
    g.lineWidth = 0.9;
    g.stroke(V.cont);
    g.stroke(V.contB);
    g.restore();
    g.strokeStyle = 'rgba(60,52,44,.7)';
    g.lineWidth = 1.1;
    g.stroke(V.rings[0].line);
    if (P.contours) {
      g.save();
      g.clip(V.land);
      g.strokeStyle = 'rgba(70,62,50,.13)';
      g.lineWidth = 0.8;
      g.stroke(V.cont);
      g.strokeStyle = 'rgba(70,62,50,.22)';
      g.lineWidth = 1.1;
      g.stroke(V.contB);
      g.restore();
    }
    g.strokeStyle = 'rgba(70,80,70,.55)';
    g.lineWidth = 0.9;
    g.stroke(V.coast);
    g.strokeStyle = '#4d7385';
    g.lineWidth = 1.2;
    g.lineJoin = 'round';
    g.stroke(V.chev);
  };
  window.paintStipple = function (g) {
    prep();
    const se = typeof S !== 'undefined' && S ? S.season : 0,
      [cc, hc] = CROWN[se];
    g.save();
    g.globalAlpha = P.crownA;
    for (let k = 0; k < 3; k++) {
      g.fillStyle = cc[k];
      g.fill(C.tr.cr[k]);
    }
    g.globalAlpha = P.crownA * 0.8;
    for (let k = 0; k < 3; k++) {
      g.fillStyle = hc[k];
      g.fill(C.tr.hl[k]);
    }
    if (P.ink) {
      g.globalAlpha = 0.55;
      g.strokeStyle = '#2b3d22';
      g.lineWidth = 0.8;
      g.stroke(C.tr.ink);
    }
    g.restore();
  };
  // repaint now
  if (!world) return;
  const g = tcan.getContext('2d');
  g.setTransform(TS, 0, 0, TS, 0, 0);
  paintTerrain(g);
  paintStipple(g);
  bakeLo();
  detail.ok = false;
})();
