// land drafts: stronger meadows/dry ground, lone trees, grass and reed tufts, optional hill shading
(() => {
  const P = (window.PROTO = Object.assign({ shade: 0 }, window.PROTO || {}));
  const C = {};
  function prep() {
    const w = world,
      V = w.vec;
    if (C.vec === V) return;
    C.vec = V;
    const N = GW * GH,
      T = w.type,
      r = mulberry32(w.seed ^ 0x1a4d),
      rockAt = document.createElement('canvas').getContext('2d'),
      onRock = (x, y, d) =>
        [0, 1.6, 3.2, 4.8].some(a => rockAt.isPointInPath(V.rock.outline, x + Math.cos(a) * d, y + Math.sin(a) * d, 'evenodd'));
    const fz = i => clamp((w.fert[i] - w.fLo) / (w.fHi - w.fLo), 0, 1);
    // lone trees and small clumps on fertile open ground
    C.lone = { crowns: new Path2D(), shade: new Path2D(), shadow: new Path2D() };
    for (let i = 0; i < N; i++) {
      if (T[i] !== 1 || w.dThick[i] < 3 * CS) continue;
      if (r() > 0.02 + 0.06 * fz(i) ** 2) continue;
      const n = r() < 0.5 ? 1 : 2 + ((r() * 2) | 0);
      const cx = ((i % GW) + r()) * CS,
        cy = (((i / GW) | 0) + r()) * CS;
      for (let k = 0; k < n; k++) {
        const x = cx + (k ? (r() - 0.5) * 18 : 0),
          y = cy + (k ? (r() - 0.5) * 14 : 0),
          rr = 4.5 + r() * 3.5;
        if (cellT(x, y) !== 1 || onRock(x, y, rr + 2)) continue;
        crown(C.lone.crowns, x, y, rr, rr > 6 ? 7 : 6, r() * TAU);
        if (r() > 0.3) {
          const a = r() * TAU,
            q = rr * 0.55;
          C.lone.shade.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
          C.lone.shade.arc(x, y, q, a, a + 0.8 + r());
        }
        C.lone.shadow.moveTo(x + rr * 1.45, y + rr * 0.4);
        C.lone.shadow.arc(x + rr * 0.35, y + rr * 0.4, rr * 1.1, 0, TAU);
      }
    }
    // grass tufts on meadows; reed marks on low wet ground by lakes and rivers
    C.grass = new Path2D();
    C.reed = new Path2D();
    const lake = new Uint8Array(N),
      sea = typeof openSea === 'function' ? openSea(T) : null;
    for (let i = 0; i < N; i++) if ((T[i] === 0 && sea && !sea[i]) || T[i] === 4) lake[i] = 1;
    const dLake = distField(i => lake[i] === 1);
    for (let i = 0; i < N; i++) {
      if (T[i] !== 1) continue;
      const x0 = (i % GW) * CS,
        y0 = ((i / GW) | 0) * CS,
        wet = dLake[i] < 2.5 * CS && w.hgt[i] < w.level + 0.06;
      if (wet && r() < 0.55) {
        const x = x0 + r() * CS,
          y = y0 + r() * CS;
        if (onRock(x, y, 4)) continue;
        // marsh symbol: a short base line with reeds rising from it
        C.reed.moveTo(x - 3.5, y);
        C.reed.lineTo(x + 3.5, y);
        for (const dx of [-2, 0, 2]) {
          C.reed.moveTo(x + dx, y - 0.5);
          C.reed.lineTo(x + dx * 1.3, y - 3.2 - (dx ? 0 : 1));
        }
      } else if (fz(i) > 0.45 && r() < 0.35 * fz(i)) {
        const x = x0 + r() * CS,
          y = y0 + r() * CS;
        if (onRock(x, y, 4)) continue;
        // grass tuft: three short strokes fanning upwards
        for (const a of [-0.5, 0, 0.5]) {
          C.grass.moveTo(x + a * 1.2, y);
          C.grass.lineTo(x + a * 3.4, y - 3.4 + Math.abs(a) * 1.2);
        }
      }
    }
    // hill shading: one pixel per cell, smoothed, darker on slopes facing away from the north-west light
    let h = new Float32Array(N);
    for (let i = 0; i < N; i++) h[i] = isLand(T[i]) ? w.hgt[i] : w.level;
    for (let k = 0; k < 2; k++) h = soften(h);
    const can = document.createElement('canvas');
    can.width = GW;
    can.height = GH;
    const g = can.getContext('2d'),
      img = g.createImageData(GW, GH),
      d = img.data;
    let sMax = 1e-9;
    const sl = new Float32Array(N);
    for (let y = 1; y < GH - 1; y++)
      for (let x = 1; x < GW - 1; x++) {
        const i = y * GW + x,
          gx = h[i + 1] - h[i - 1],
          gy = h[i + GW] - h[i - GW];
        sl[i] = gx + gy; // rising towards the south-east: lit; falling: shaded
        sMax = Math.max(sMax, Math.abs(sl[i]));
      }
    for (let i = 0; i < N; i++) {
      const v = clamp(-sl[i] / (sMax * 0.35), -1, 1) * clamp(w.dWater[i] / (3 * CS) - 0.3, 0, 1),
        k = i * 4;
      if (v > 0) [d[k], d[k + 1], d[k + 2], d[k + 3]] = [92, 84, 66, 255 * v];
      else [d[k], d[k + 1], d[k + 2], d[k + 3]] = [255, 252, 240, 255 * -v * 0.6];
    }
    g.putImageData(img, 0, 0);
    C.shadeImg = can;
    // fertility, softened, for the blended meadow / dry-ground wash
    let f = new Float32Array(N);
    for (let i = 0; i < N; i++) f[i] = fz(i);
    for (let k = 0; k < 2; k++) f = soften(f);
    C.fert = f;
    C.washes = {};
  }
  // meadows (fertile) and dry ground (poor) as one image, one pixel per cell, scaled up smoothly so they fade into
  // each other; middling ground stays the plain land colour
  const SEAWASH = [
    [[150, 190, 110, 0.36], [222, 200, 140, 0.32]],
    [[160, 190, 110, 0.26], [228, 196, 110, 0.36]],
    [[185, 175, 110, 0.3], [220, 190, 130, 0.32]],
    [[160, 180, 150, 0.22], [215, 210, 195, 0.28]],
  ];
  function wash(se) {
    if (C.washes[se]) return C.washes[se];
    const can = document.createElement('canvas');
    can.width = GW;
    can.height = GH;
    const g = can.getContext('2d'),
      img = g.createImageData(GW, GH),
      d = img.data,
      [gr, dr] = SEAWASH[se];
    for (let i = 0; i < GW * GH; i++) {
      const v = C.fert[i],
        m = clamp((v - 0.5) / 0.3, 0, 1),
        p = clamp((0.45 - v) / 0.3, 0, 1),
        c = m > 0 ? gr : dr,
        a = (m > 0 ? m : p) * c[3],
        k = i * 4;
      [d[k], d[k + 1], d[k + 2], d[k + 3]] = [c[0], c[1], c[2], 255 * a];
    }
    g.putImageData(img, 0, 0);
    return (C.washes[se] = can);
  }
  const orig = paintTerrain;
  window.paintTerrain = function (g) {
    const V0 = world.vec,
      keep = [V0.mead, V0.dry];
    V0.mead = V0.dry = new Path2D();
    try {
      orig(g);
    } finally {
      [V0.mead, V0.dry] = keep;
    }
    prep();
    const V = world.vec,
      se = typeof S !== 'undefined' && S ? S.season : 0,
      big = [-W, -H, 3 * W, 3 * H];
    g.save();
    g.clip(V.land);
    const out = p => {
      const q = new Path2D();
      q.rect(...big);
      q.addPath(p);
      g.clip(q, 'evenodd');
    };
    out(V.rock.outline);
    if (P.shade) {
      g.globalAlpha = P.shade;
      g.imageSmoothingEnabled = true;
      g.drawImage(C.shadeImg, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    out(V.thick);
    // 1: stronger meadows and dry ground (dry shows in every season, strongest in summer)
    g.imageSmoothingEnabled = true;
    g.drawImage(wash(se), 0, 0, W, H);
    // 3: tufts
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(60,90,45,.7)';
    g.lineWidth = 0.85;
    g.stroke(C.grass);
    g.strokeStyle = 'rgba(45,80,90,.75)';
    g.stroke(C.reed);
    g.restore();
    // 2: lone trees, on the ground layer (creatures walk over them)
    g.save();
    g.fillStyle = 'rgba(60,80,50,.13)';
    g.fill(C.lone.shadow);
    g.fillStyle = TREES.colour[se][1];
    g.globalAlpha = 0.9;
    g.fill(C.lone.crowns);
    g.globalAlpha = 1;
    g.strokeStyle = '#34502b';
    g.lineWidth = 0.75;
    g.lineJoin = 'round';
    g.stroke(C.lone.crowns);
    g.stroke(C.lone.shade);
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
