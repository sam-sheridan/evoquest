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
  riverShapes(w, D);
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
  paintRiverBed(g, D);
  paintRockDio(g, se);
  // lone trees, on the ground layer (creatures walk over them)
  g.fillStyle = DIO.trunk;
  g.fill(V.landD.trunk);
  for (const s of TREE_ORDER) {
    g.fillStyle = DIO.trees[se][s];
    g.fill(V.landD.loneF[s]);
  }
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

/* creatures: low-poly bodies with a thin outline in their own dark shade */
// a creature's colour as [hue, saturation, lightness], read from its fill (which can be part-way through a species'
// colour change), and a shade of it with lightness and saturation moved by dl and ds
const hslOf = fill => (fill.match(/[\d.]+/g) || [0, 60, 50]).map(Number);
const shade = ([h, s, l], dl, ds = 0) => `hsl(${h} ${clamp(s + ds, 0, 100)}% ${clamp(l + dl, 3, 97)}%)`;

// the creature drawn for the diorama map, with the same body, legs, mouth, tail and eyes as the notebook one: a
// shadow on the ground, a raised side, four flat faces lit from the north-west, legs and outline in a dark shade
// of its own colour, and a swimmer's back half tinted by the water
function drawCreatureDio(g, c, x, y, sc, detail, fill, t, swim, flat) {
  const P = DIO.creature,
    L = c.bh / 2,
    Wd = c.bw / 2,
    hsl = hslOf(fill),
    body = detail && c.tail > 0 ? pathOf(outline(c, t, swim ? 1 : 0.3)) : c.p2;
  if (!swim && !flat) {
    g.save();
    g.translate(x + P.shadow[1] * 0.6 * sc, y + P.shadow[1] * sc);
    g.rotate(c.dir);
    g.scale(sc, sc);
    g.fillStyle = P.shadow[0];
    g.fill(body);
    g.restore();
  }
  g.save();
  g.translate(x, y);
  g.rotate(c.dir);
  g.scale(sc, sc);
  g.lineJoin = 'round';
  if (swim && detail) dioWake(g, c, t, L);
  if (detail) {
    drawLegs(g, c, t, swim, shade(hsl, -hsl[2] * P.legs[0], P.legs[1]), P.legs[2]);
    drawMouth(g, c, L, t, P.mouth, 0);
  }
  // the raised side: the body moved down the screen, in a darker tone
  g.save();
  g.translate(Math.sin(c.dir) * P.side[0], Math.cos(c.dir) * P.side[0]);
  g.fillStyle = shade(hsl, P.side[1]);
  g.fill(body);
  g.restore();
  g.fillStyle = fill;
  g.fill(body);
  if (detail) {
    // four flat faces: the spine splits left from right and a crease splits front from back, each lit by how much
    // it faces the north-west light (worked out in the body's own turned frame)
    const a = c.dir,
      lx = -Math.SQRT1_2 * (Math.cos(a) + Math.sin(a)),
      ly = -Math.SQRT1_2 * (Math.cos(a) - Math.sin(a)),
      xc = L * 0.15;
    g.save();
    g.clip(body);
    for (const sy of [-1, 1])
      for (const sx of [-1, 1]) {
        const v = 0.75 * sy * ly + 0.45 * sx * lx;
        g.fillStyle = shade(hsl, P.faces[v > 0.3 ? 0 : v > -0.2 ? 1 : 2]);
        g.beginPath();
        if (sx > 0) g.rect(xc, sy > 0 ? 0 : -Wd - 6, L + 6, Wd + 6);
        else g.rect(-L - c.bh * 2 - 6, sy > 0 ? 0 : -Wd - 6, L + c.bh * 2 + 6 + xc, Wd + 6);
        g.fill();
      }
    g.restore();
  }
  if (swim) {
    // back half below the surface, tinted by the water, with a light waterline
    g.save();
    g.clip(body);
    g.beginPath();
    g.moveTo(1, -Wd - 3);
    g.quadraticCurveTo(-2, 0, 1, Wd + 3);
    g.lineTo(-L - c.bh * 2 - 6, Wd + 3);
    g.lineTo(-L - c.bh * 2 - 6, -Wd - 3);
    g.closePath();
    g.globalAlpha = P.water;
    g.fillStyle = BAND[0];
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(1, -Wd - 3);
    g.quadraticCurveTo(-2, 0, 1, Wd + 3);
    g.stroke();
    g.restore();
  }
  g.strokeStyle = shade(hsl, -hsl[2] * P.line[0], P.line[1]);
  g.lineWidth = P.line[2];
  g.stroke(body);
  if (detail) {
    // eye colour is set once per species, from its starting lightness, so every member matches
    const ex = L * 0.52,
      half = Math.max(1.4, Math.min(c.bw * 0.22, 3.2)),
      lt = S?.species[c.sp]?.lt ?? c.lt;
    g.fillStyle = lt < EYE_WHITE ? '#fcfcfb' : '#211d1b';
    for (const s of [-1, 1]) g.fillRect(ex - 1.1, s * half - 1.1, 2.2, 2.2);
  }
  g.restore();
}
// a swimmer's wake: white arcs behind the tail, spreading out and fading
function dioWake(g, c, t, L) {
  const s = Math.max(0.7, c.bw / 15),
    ph = (t * 1.1 + c.id * 0.37) % 1;
  g.lineWidth = 0.9;
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const kk = k + ph,
      r = (11 + kk * 3.5) * s,
      apex = -L - tailLen(c) - 1.5 * s - kk * 2.4 * s,
      span = 0.38 + kk * 0.11,
      a = Math.min(1, kk / 0.4) * Math.max(0, 0.75 - kk * 0.24);
    g.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    g.beginPath();
    g.arc(apex + r, 0, r, Math.PI - span, Math.PI + span);
    g.stroke();
  }
}

/* food: faceted gems */
// a closed polygon of n corners, radius r, stretched by sx and sy
function ring(n, r, a0, sx = 1, sy = 1) {
  const P = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + (k * TAU) / n;
    P.push([Math.cos(a) * r * sx, Math.sin(a) * r * sy]);
  }
  return P;
}
// a polygon filled in its middle colour, with the faces towards the north-west lit and those away shaded, all meeting
// at (cx, cy)
function gem(g, P, [lit, mid, dark], cx, cy) {
  g.fillStyle = mid;
  g.beginPath();
  P.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
  g.closePath();
  g.fill();
  P.forEach((p, k) => {
    const q = P[(k + 1) % P.length],
      mx = (p[0] + q[0]) / 2 - cx,
      my = (p[1] + q[1]) / 2 - cy,
      d = -(mx + my) / ((Math.hypot(mx, my) || 1) * Math.SQRT2);
    if (d > -0.4 && d <= 0.2) return;
    g.fillStyle = d > 0.2 ? lit : dark;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(...p);
    g.lineTo(...q);
    g.closePath();
    g.fill();
  });
}
function foodShadow(g, rx, ry) {
  g.fillStyle = DIO.food.shadow;
  g.beginPath();
  g.ellipse(0.5, 1.1, rx, ry, 0, 0, TAU);
  g.fill();
}
// a berry: a red gem with a leaf; regrowing, a smaller pale one (with its leaf from half grown)
function drawBerryDio(g, x, y, p) {
  const F = DIO.food,
    r = p >= 1 ? 1.35 : 0.6 + 0.5 * p;
  g.save();
  g.translate(x, y);
  g.scale(2.5, 2.5);
  foodShadow(g, r, r * 0.55);
  if (p >= 0.5) {
    g.fillStyle = F.leaf;
    g.beginPath();
    g.moveTo(0.3, -r * 0.6);
    g.lineTo(1.9, -1.9);
    g.lineTo(0.9, -0.4);
    g.fill();
  }
  gem(g, ring(6, r, 0.3), F.berryFaces[p >= 1 ? 0 : 1], -r * 0.25, -r * 0.3);
  g.restore();
}
// a nut: a faceted acorn, smaller and paler while regrowing, its cap back from half grown
function drawNutDio(g, x, y, p) {
  const F = DIO.food,
    k = 0.45 + 0.55 * p,
    ripe = p >= 1 ? 0 : 1;
  g.save();
  g.translate(x, y);
  g.scale(3.1 * k, 3.1 * k);
  foodShadow(g, 1.1, 0.6);
  gem(
    g,
    ring(6, 1, Math.PI / 6, 0.9, 1.15).map(([a, b]) => [a, b + 0.35]),
    F.nutFaces[ripe],
    -0.3,
    0
  );
  if (p >= 0.5) {
    g.fillStyle = F.cap[ripe][0];
    g.beginPath();
    g.moveTo(-1.1, -0.15);
    g.lineTo(-0.7, -0.95);
    g.lineTo(0.7, -0.95);
    g.lineTo(1.1, -0.15);
    g.closePath();
    g.fill();
    g.fillStyle = F.cap[ripe][1];
    g.beginPath();
    g.moveTo(-1.1, -0.15);
    g.lineTo(-0.7, -0.95);
    g.lineTo(0, -0.95);
    g.lineTo(-0.2, -0.15);
    g.closePath();
    g.fill();
  }
  g.restore();
}
// algae: a faceted lily pad with a notch, a flower on it when ripe; regrowing, a small yellowish pad
function drawAlgaeDio(g, x, y, p) {
  const F = DIO.food,
    r = p >= 1 ? 1.7 : 0.8 + 0.4 * p,
    P = ring(8, r, 0.2, 1, 0.8);
  P.splice(1, 0, [0, 0]);
  g.save();
  g.translate(x, y);
  g.scale(2.5, 2.5);
  gem(g, P, F.padFaces[p >= 1 ? 0 : 1], -0.3, -0.25);
  if (p >= 1) {
    g.fillStyle = F.flower[0];
    g.beginPath();
    ring(5, 0.6, 0).forEach(([a, b], i) => (i ? g.lineTo(a - 0.4, b + 0.2) : g.moveTo(a - 0.4, b + 0.2)));
    g.fill();
    g.fillStyle = F.flower[1];
    g.beginPath();
    g.arc(-0.4, 0.2, 0.22, 0, TAU);
    g.fill();
  }
  g.restore();
}

/* the intro's pictures, in the diorama style */
// a closed low-poly loop round (x, y): n corners on an ellipse rx by ry, turned by a, as a path
function lowPolyBlob(x, y, rx, ry, a, n = 12) {
  const p = new Path2D(),
    ca = Math.cos(a),
    sa = Math.sin(a);
  for (let k = 0; k < n; k++) {
    const t = (k * TAU) / n,
      u = Math.cos(t) * rx * (1 + 0.06 * Math.sin(k * 2.7)),
      v = Math.sin(t) * ry * (1 + 0.06 * Math.cos(k * 1.9));
    if (k) p.lineTo(x + u * ca - v * sa, y + u * sa + v * ca);
    else p.moveTo(x + u * ca - v * sa, y + u * sa + v * ca);
  }
  p.closePath();
  return p;
}
// a stretch of coast: land to the left of coast(y), with a beach, a low hill and the seabed stepping down
function introCoastDio(g, coast, w, h) {
  const C = dioColours(0),
    cr = DIO.coast,
    side = off => {
      const p = new Path2D();
      p.moveTo(-20, -20);
      for (let y = -20; y <= h + 20; y += 5) p.lineTo(coast(y) + off, y);
      p.lineTo(-20, h + 20);
      p.closePath();
      return p;
    },
    edge = new Path2D();
  for (let y = -20; y <= h + 20; y += 5) edge.lineTo(coast(y), y);
  g.fillStyle = BAND[3];
  g.fillRect(0, 0, w, h);
  [150, 95, 45].forEach((off, i) =>
    dioStep(g, side(off), DIO.sea.rise, C.seaSide[2 - i], BAND[2 - i], DIO.sea.lip)
  );
  const land = side(0);
  g.save();
  g.translate(0, cr.rise + cr.shadow[1]);
  g.fillStyle = cr.shadow[0];
  g.fill(land);
  g.translate(0, -cr.shadow[1]);
  g.strokeStyle = cr.foam[0];
  g.lineWidth = cr.foam[1];
  g.stroke(edge);
  g.fillStyle = cr.wall;
  g.fill(land);
  g.restore();
  g.fillStyle = DIO.sand[0];
  g.fill(land);
  dioStep(g, side(-16), DIO.rise, C.side[1], C.top[1], DIO.lip, DIO.foot);
  dioStep(g, lowPolyBlob(170, 160, 140, 62, 0.2), DIO.rise, C.side[3], C.top[3], DIO.lip, DIO.foot);
  dioStep(g, lowPolyBlob(160, 150, 74, 30, 0.2, 10), DIO.rise, C.side[5], C.top[5], DIO.lip, DIO.foot);
  // the thicket's floor at the top left
  g.fillStyle = DIO.thicket[0];
  g.fill(lowPolyBlob(60, 60, 95, 62, 0.3));
}
// a meadow: open grass raised a step above lower ground at the bottom left, with a higher step at the top right
function introMeadowDio(g, w, h) {
  const C = dioColours(0),
    poly = pts => {
      const p = new Path2D();
      pts.forEach((q, i) => (i ? p.lineTo(...q) : p.moveTo(...q)));
      p.closePath();
      return p;
    };
  g.fillStyle = C.top[1];
  g.fillRect(0, 0, w, h);
  const mid = poly([
    [-10, -10],
    [w + 10, -10],
    [w + 10, 112],
    [212, 120],
    [150, 140],
    [96, 150],
    [40, 140],
    [-10, 150],
  ]);
  dioStep(g, mid, DIO.rise, C.side[2], C.top[2], DIO.lip, DIO.foot);
  const hi = poly([
    [370, -10],
    [392, 26],
    [452, 48],
    [520, 40],
    [w + 10, 58],
    [w + 10, -10],
  ]);
  dioStep(g, hi, DIO.rise, C.side[3], C.top[3], DIO.lip, DIO.foot);
}
// low-poly trees for the intro's thicket, a little see-through so the nuts show, drawn from the back
function introTreesDio(g, list, alpha) {
  const cols = DIO.trees[0];
  g.globalAlpha = alpha;
  for (const [x, y, r] of [...list].sort((a, b) => a[1] - b[1])) {
    const P = cols.map(() => new Path2D()),
      rnd = mulberry32(x * 31 + y);
    treeFacets((s, pts) => addLoop(P[s], pts), x, y, r, rnd);
    for (const s of TREE_ORDER) {
      g.fillStyle = cols[s];
      g.fill(P[s]);
    }
  }
  g.globalAlpha = 1;
}

/* rivers: smooth banks (see buildTerrain), a deeper middle and a moving surface */
// D.river: the rivers' water, for clipping; D.flows: each river's runs of water as points every 6 px along its line
// [x, y, normal x, normal y], running downhill (from the higher end of the land it crosses to the lower), with the
// river's half-width hw and a path along its middle
function riverShapes(w, D) {
  const T = w.type;
  D.river = loopsPath(i => (T[i] === 4 ? -w.rD[i] : -Math.max(w.rD[i], 0.5)), 0, 0, 0);
  D.flows = [];
  D.mid = new Path2D();
  for (const ch of w.channels) {
    if (ch.sea) continue;
    const P = [];
    for (let k = 0; k < ch.pts.length - 1; k++) {
      const [ax, ay] = ch.pts[k],
        [bx, by] = ch.pts[k + 1],
        len = Math.hypot(bx - ax, by - ay) * CS,
        nx = -(by - ay) / (len / CS),
        ny = (bx - ax) / (len / CS);
      for (let d = 0; d < len; d += 6)
        P.push([(ax + ((bx - ax) * d) / len) * CS, (ay + ((by - ay) * d) / len) * CS, nx, ny]);
    }
    const runs = [];
    let run = null;
    for (const p of P) {
      if (cellT(p[0], p[1]) === 4) (run ||= []).push(p);
      else if (run) {
        if (run.length > 3) runs.push(run);
        run = null;
      }
    }
    if (run && run.length > 3) runs.push(run);
    if (!runs.length) continue;
    // downhill: the end whose land is lower is where it flows to
    const hAt = p => w.hgt[cellI(p[0], p[1])];
    if (hAt(runs[0][0]) < hAt(runs.at(-1).at(-1))) {
      runs.reverse();
      for (const r of runs) {
        r.reverse();
        for (const p of r) [p[2], p[3]] = [-p[2], -p[3]];
      }
    }
    const hw = ch.w * CS;
    for (const r of runs) {
      r.forEach((p, k) => (k ? D.mid.lineTo(p[0], p[1]) : D.mid.moveTo(p[0], p[1])));
      const xs = r.map(p => p[0]),
        ys = r.map(p => p[1]);
      // lanes along the river (for streaks), each a path offset from the middle by a share of the half-width
      const lane = o => {
        const q = new Path2D();
        r.forEach((p, k) =>
          k
            ? q.lineTo(p[0] + p[2] * o * hw, p[1] + p[3] * o * hw)
            : q.moveTo(p[0] + p[2] * o * hw, p[1] + p[3] * o * hw)
        );
        return q;
      };
      const rnd = mulberry32((r[0][0] * 7 + r[0][1]) | 0);
      D.flows.push({
        r,
        hw,
        box: [Math.min(...xs) - hw, Math.min(...ys) - hw, Math.max(...xs) + hw, Math.max(...ys) + hw],
        lanes: [-0.5, 0.05, 0.5].map(lane),
        glints: Array.from({ length: Math.ceil(r.length / 2.5) }, () => [
          rnd(),
          (rnd() * 2 - 1) * 0.7,
          14 + rnd() * 12,
        ]),
      });
    }
  }
}
// the river's deeper middle, on the map image
function paintRiverBed(g, D) {
  g.save();
  g.clip(D.river, 'evenodd');
  g.strokeStyle = 'rgba(60,110,120,.16)';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const f of D.flows) {
    g.lineWidth = f.hw * 0.95;
    const p = new Path2D();
    f.r.forEach((q, k) => (k ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    g.stroke(p);
  }
  g.restore();
}
// DRAFT: the moving surface, drawn every frame over the map. style: A streaks drifting downstream in three lanes,
// B riffles (bowed ripple lines across the current) travelling downstream, C glints that drift and twinkle, with
// foam along the banks
const RIVER_DASH = [
  [7, 26, 3, 34, 12, 41],
  [4, 31, 9, 22, 2, 37],
  [10, 38, 5, 27, 3, 30],
];
function drawRiverFlow(g, t, view, style) {
  const D = world.vec.dio;
  if (!D || !D.flows) return;
  g.save();
  g.clip(D.river, 'evenodd');
  g.lineCap = 'round';
  if (style === 'C') {
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = 2.4;
    g.stroke(D.river);
  }
  for (const f of D.flows) {
    const [x0, y0, x1, y1] = f.box;
    if (x1 < view[0] || y1 < view[1] || x0 > view[2] || y0 > view[3]) continue;
    const L = f.r.length * 6;
    if (style === 'A') {
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 1.3;
      f.lanes.forEach((p, k) => {
        g.setLineDash(RIVER_DASH[k]);
        g.lineDashOffset = -(t * (20 + k * 4) + k * 40);
        g.stroke(p);
      });
      g.setLineDash([]);
    } else if (style === 'B') {
      g.lineWidth = 1.1;
      for (let k = 0; k * 26 < L; k++) {
        const s = (k * 26 + t * 18) % L,
          i = Math.min(f.r.length - 2, (s / 6) | 0),
          [x, y, nx, ny] = f.r[i],
          tx = ny,
          ty = -nx,
          o = 0.25 * Math.sin(k * 2.3),
          a = 0.25 + 0.3 * Math.max(0, Math.sin(k * 1.7 + t * 1.3)),
          span = f.hw * (0.35 + 0.15 * Math.sin(k * 3.1));
        const cx = x + nx * o * f.hw,
          cy = y + ny * o * f.hw;
        g.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        g.beginPath();
        g.moveTo(cx - nx * span, cy - ny * span);
        g.quadraticCurveTo(cx + tx * 5, cy + ty * 5, cx + nx * span, cy + ny * span);
        g.stroke();
      }
    } else {
      g.lineWidth = 1.2;
      for (const [ph, o, v] of f.glints) {
        const s = (ph * L + t * v) % L,
          i = Math.min(f.r.length - 2, (s / 6) | 0),
          [x, y, nx, ny] = f.r[i],
          tx = ny,
          ty = -nx,
          a = Math.max(0, Math.sin(t * 2.4 + ph * 40)) ** 2;
        if (a < 0.05) continue;
        const cx = x + nx * o * f.hw,
          cy = y + ny * o * f.hw;
        g.strokeStyle = `rgba(255,255,255,${(0.9 * a).toFixed(2)})`;
        g.beginPath();
        g.moveTo(cx - tx * 2.5, cy - ty * 2.5);
        g.lineTo(cx + tx * 2.5, cy + ty * 2.5);
        g.stroke();
      }
    }
  }
  g.restore();
}
