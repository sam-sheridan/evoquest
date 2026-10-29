/* The diorama map (MAP_STYLE 'diorama'): the land as stacked terraces seen slightly from the south, like a painted
   relief model. Each step is a flat plateau with a shaded side showing below its edge; the coast drops into the sea
   as a sandy cliff, the seabed steps down through the water, trees are faceted low-poly crowns and rock is stacked
   faceted slabs. Uses the same terrain as the notebook map (map.js); only the drawing differs. */

// colours as [r, g, b]: from '#rrggbb', mixed, and back to a CSS colour
const hexRGB = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16));
const mixRGB = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
const cssRGB = a => `rgb(${a.map(Math.round).join(',')})`;

// the outlines of everywhere fv is at least thr, as closed loops (filled 'evenodd', so holes stay open). Edges are
// straightened by tol px into angular, low-poly lines; loops smaller than minA px² are dropped
function loopsPath(fv, thr, tol, minA) {
  const p = new Path2D();
  for (const l of traceLoops(fv, thr)) {
    const q = tol ? straightenLoop(l, tol) : l;
    if (q.length >= 3 && Math.abs(loopArea(q)) > minA) addLoop(p, q);
  }
  return p;
}

// the diorama's shapes: the coast, the beach's inner edge, each terrace step and each seabed step
function dioShapes(w, cdf, sm, shallow, thkF) {
  const N = GW * GH,
    T = w.type,
    D = { tiers: [] };
  D.coast = loopsPath(i => w.fl[i], w.level, 0, 0);
  // the woodland floor as outlines (a fill made of grid squares shows faint seams under a see-through colour)
  D.thick = loopsPath(thkF, w.tThr, 0, 0);
  // step heights: each land cell's rank among the land's heights; rivers take their banks' height, so the steps run
  // on across a river instead of all crowding down into it
  let h = new Float32Array(N);
  for (let i = 0; i < N; i++) h[i] = isLand(T[i]) ? cdf[i] : 0;
  for (let pass = 0; pass < 4; pass++) {
    const h2 = h.slice();
    for (let i = 0; i < N; i++) {
      if (T[i] !== 4) continue;
      const x = i % GW,
        y = (i / GW) | 0;
      for (const [dx, dy] of D4) {
        const xx = x + dx,
          yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < GW && yy < GH) h2[i] = Math.max(h2[i], h[yy * GW + xx]);
      }
    }
    h = h2;
  }
  D.base = loopsPath(
    sm(i => (isLand(T[i]) ? w.dWater[i] : 0)),
    DIO.beach,
    DIO.straight,
    60
  );
  for (let k = 1; k < DIO.levels; k++)
    D.tiers.push(
      loopsPath(
        sm(i => h[i]),
        k / DIO.levels,
        DIO.straight,
        150
      )
    );
  D.bands = BAND_AT.map(d => loopsPath(shallow, -d, DIO.straight, 100));
  return D;
}

// each season's step colours: the lowest step to the highest blended between the season's two grass colours, every
// other one a touch lighter, the top ones snow in winter; each side mixed darker from its step
const dioCols = [];
function dioColours(se) {
  if (dioCols[se]) return dioCols[se];
  const [lo, hi] = DIO.grass[se].map(hexRGB),
    white = [255, 255, 255],
    sideTo = hexRGB(DIO.side[0]),
    top = [],
    side = [];
  for (let k = 0; k < DIO.levels; k++) {
    let c = mixRGB(lo, hi, k / (DIO.levels - 1));
    if (k % 2) c = mixRGB(c, white, DIO.alt);
    if (se === 3 && k >= DIO.snow[0]) c = hexRGB(DIO.snow[1]);
    top.push(cssRGB(c));
    side.push(cssRGB(mixRGB(c, sideTo, DIO.side[1])));
  }
  const seaSide = BAND.map(b => cssRGB(mixRGB(hexRGB(b), hexRGB(DIO.sea.side[0]), DIO.sea.side[1])));
  return (dioCols[se] = { top, side, seaSide });
}

// one raised step: a soft shadow just below, the side (the shape moved down by rise, so it shows only below edges
// that face south), the flat top, and a light line along the edge
function dioStep(g, p, rise, side, top, lip, foot) {
  if (foot) {
    g.save();
    g.translate(0, rise + foot[1]);
    g.fillStyle = foot[0];
    g.fill(p, 'evenodd');
    g.restore();
  }
  g.save();
  g.translate(0, rise);
  g.fillStyle = side;
  g.fill(p, 'evenodd');
  g.restore();
  g.fillStyle = top;
  g.fill(p, 'evenodd');
  if (lip) {
    g.strokeStyle = lip[0];
    g.lineWidth = lip[1];
    g.lineJoin = 'round';
    g.stroke(p);
  }
}

function paintDiorama(g) {
  const V = world.vec,
    D = V.dio,
    se = S ? S.season : 0,
    C = dioColours(se),
    cr = DIO.coast;
  g.fillStyle = BAND[BAND.length - 1];
  g.fillRect(0, 0, W, H);
  // the seabed, stepping up from the deep to the shallows
  for (let k = D.bands.length - 1; k >= 0; k--)
    dioStep(g, D.bands[k], DIO.sea.rise, C.seaSide[k], BAND[k], DIO.sea.lip);
  // the coast: a shadow in the water, foam at the cliff's foot, then the sandy cliff (also lining the river banks)
  g.save();
  g.translate(0, cr.rise + cr.shadow[1]);
  g.fillStyle = cr.shadow[0];
  g.fill(D.coast, 'evenodd');
  g.translate(0, -cr.shadow[1]);
  g.strokeStyle = cr.foam[0];
  g.lineWidth = cr.foam[1];
  g.lineJoin = 'round';
  g.stroke(D.coast);
  g.fillStyle = cr.wall;
  g.fill(D.coast, 'evenodd');
  g.restore();
  // the land: beach, then the terraces from the lowest up
  g.save();
  g.clip(V.land);
  g.fillStyle = DIO.sand[se];
  g.fillRect(0, 0, W, H);
  dioStep(g, D.base, DIO.rise, C.side[0], C.top[0], DIO.lip, DIO.foot);
  D.tiers.forEach((p, k) => dioStep(g, p, DIO.rise, C.side[k + 1], C.top[k + 1], DIO.lip, DIO.foot));
  // meadows and dry ground, the woodland floor, temperature, and the trees' shadows
  g.imageSmoothingEnabled = true;
  g.save();
  clipOut(g, D.thick);
  g.drawImage(landWash(se), 0, 0, W, H);
  g.restore();
  g.fillStyle = DIO.thicket[se];
  g.fill(D.thick, 'evenodd');
  g.globalAlpha = DIO.temp;
  g.drawImage(tempWash(se), 0, 0, W, H);
  g.globalAlpha = 1;
  g.fillStyle = DIO.shadow;
  g.fill(V.trees.shadow);
  g.fill(V.landD.loneShadow);
  g.restore();
  paintRockDio(g, se);
  // lone trees, on the ground layer (creatures walk over them)
  g.fillStyle = DIO.trunk;
  g.fill(V.landD.trunk);
  for (const s of TREE_ORDER) {
    g.fillStyle = DIO.trees[se][s];
    g.fill(V.landD.loneF[s]);
  }
  // river current: light streaks
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.lineWidth = 1.2;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.stroke(V.chev);
}

// rock: a slab with a dark side, faceted on top, with paler stacked tiers (snow in winter)
function paintRockDio(g, se) {
  const R = world.vec.rock,
    P = DIO.rock;
  g.save();
  g.clip(world.vec.land);
  dioStep(g, R.outline, P.rise, P.wall, P.face[0], null, DIO.foot);
  g.clip(R.outline, 'evenodd');
  R.face.forEach((p, k) => {
    g.fillStyle = P.face[k];
    g.fill(p);
  });
  R.tiers.forEach((p, k) =>
    dioStep(
      g,
      p,
      P.tierRise,
      P.face[2],
      se === 3 ? DIO.snow[1] : P.tier[k],
      ['rgba(255,255,255,.3)', 1],
      null
    )
  );
  g.restore();
}

// thicket trees, on their own layer over creatures (partly see-through, as in the notebook map)
function paintStippleDio(g) {
  const se = S ? S.season : 0,
    keepOut = new Path2D();
  keepOut.rect(-W, -H, 3 * W, 3 * H);
  keepOut.addPath(world.vec.rock.outline);
  g.save();
  g.clip(keepOut, 'evenodd');
  for (const row of world.vec.trees.rows) {
    if (!row.f) continue;
    for (const s of TREE_ORDER) {
      g.fillStyle = DIO.trees[se][s];
      TREES.alpha.forEach(([a], k) => {
        g.globalAlpha = a;
        g.fill(row.f[s][k]);
      });
    }
  }
  g.globalAlpha = 1;
  g.restore();
}

// a low-poly tree standing at (x, y): add(shade, triangle) collects its pieces by shade (0 lit, 1 middle,
// 2 shaded). The crown is jagged and raised above its foot, filled in the middle shade, with lit faces towards the
// north-west and shaded ones away. They are drawn in TREE_ORDER, so the faces sit on top of the whole crown
const TREE_ORDER = [1, 0, 2];
function treeFacets(add, x, y, r, rnd) {
  const n = 7,
    cx = x,
    cy = y - r * 0.55,
    a0 = rnd() * TAU,
    pts = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + (k * TAU) / n + (rnd() - 0.5) * 0.5,
      rr = r * (0.85 + rnd() * 0.3);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9]);
  }
  add(1, pts);
  const ax = cx - r * 0.2,
    ay = cy - r * 0.25;
  for (let k = 0; k < n; k++) {
    const p = pts[k],
      q = pts[(k + 1) % n],
      mx = (p[0] + q[0]) / 2 - ax,
      my = (p[1] + q[1]) / 2 - ay,
      d = -(mx + my) / ((Math.hypot(mx, my) || 1) * Math.SQRT2);
    if (d > 0.25) add(0, [[ax, ay], p, q]);
    else if (d < -0.45) add(2, [[ax, ay], p, q]);
  }
}
