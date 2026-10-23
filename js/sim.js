/* The simulation. S holds the state of the current run. Each step: food regrows, creatures plan routes to food
   (Dijkstra over the terrain grid), move, eat, breed and die; seasons turn; world events happen; stats are
   sampled; speciation and achievements are checked. */

/* ---------- simulation ---------- */
let S = null;
// turns a species name into a Latin-style genus: Blorbs → Blorbus
function genus(n) {
  let s = (n || '').toLowerCase().replace(/[^a-z]/g, '');
  if (s.length < 3) s = 'nov';
  if (s.endsWith('s') && s.length > 3) s = s.slice(0, -1);
  s = s.replace(/[aeiouy]+$/, '') || 'nov';
  return s[0].toUpperCase() + s.slice(1) + 'us';
}
function newGame(design, seed) {
  design = upgrade(design); // designs saved before mouths or leg length existed
  if (!world || world.seed !== seed || world.dirty) genWorld(seed);
  nextId = 1;
  // S: everything about the current run
  S = {
    t: 0, // seconds since release (simulation time)
    design: { ...design }, // what the player designed in the creator
    seed, // world number
    creatures: [], // living creatures
    newborns: [], // born this step, added at the end of the step
    sites: world.sites, // food sites (berries on land, algae in water)
    speed: 1, // testing speed from Settings: 1×, 2×, 4× or 10× (fast forward multiplies on top)
    paused: false,
    over: false, // lineage extinct
    hist: [], // trait averages sampled every 2 s, for the charts
    sampleT: 0,
    frames: [], // positions recorded for the replay
    frameT: 0,
    frameStep: 1,
    born: START,
    deaths: 0,
    deathBy: { starvation: 0, 'old age': 0, 'meteor strike': 0 },
    peak: START,
    maxGen: 1,
    events: 0, // world events so far
    lastEvent: -1,
    nextEvent: EVENTS.first[0] + rand() * EVENTS.first[1], // when the next world event happens
    nextKind: null, // which event it will be (decided a little early; changing season must not re-roll it)
    evStart: 0,
    season: 0, // 0 spring, 1 summer, 2 autumn, 3 winter
    nextSeason: SEASON_LEN,
    seasonStart: 0,
    log: [], // event log entries
    sel: null, // creature selected in the inspector
    follow: false,
    badges: [], // achievements earned this run
    replay: null,
    claims: [], // creatures reaching food this step (resolved together so the biggest wins)
    genus: genus(design.name), // Latin genus made from the species name
    species: [], // every species this run, living or extinct
    spT: 0,
    colorMode: 'body', // map colours: 'body' or 'species'
  };
  S.sites = world.sites;
  world.sites.forEach(f => {
    f.active = true;
    f.gone = false;
    f.t = 0;
    f.cl = 0;
  });
  S.species.push({
    id: 0,
    epithet: 'primus',
    tag: TAGS[0],
    parent: null,
    born: 0,
    died: null,
    reason: 'founding population',
    n: START,
    peak: START,
    streak: 0,
    key: null,
  });
  const probe = { ...design };
  enforce(probe);
  compute(probe);
  // the release spot: lots of food the design can eat nearby (RELEASE.near), and lots more it can reach from there
  // without leaving the ground it's allowed on (RELEASE.reach), so it isn't put in a rich dead end such as a strip of
  // shallows at the map's edge
  const foodAt = new Map();
  for (const f of world.sites)
    if (allowed(probe, f.i, world.type[f.i])) foodAt.set(f.i, (foodAt.get(f.i) || 0) + 1);
  const reachable = i0 => {
    const x0 = i0 % GW,
      y0 = (i0 / GW) | 0,
      R = RELEASE.reach / CS,
      seen = new Set([i0]),
      st = [i0];
    let n = 0;
    while (st.length) {
      const j = st.pop(),
        x = j % GW,
        y = (j / GW) | 0;
      n += foodAt.get(j) || 0;
      for (const [dx, dy] of NB) {
        const xx = x + dx,
          yy = y + dy,
          k = yy * GW + xx;
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || seen.has(k)) continue;
        if ((xx - x0) ** 2 + (yy - y0) ** 2 > R * R || !allowed(probe, k, world.type[k])) continue;
        seen.add(k);
        st.push(k);
      }
    }
    return n;
  };
  const spot = comp => {
    const cand = [];
    for (let k = 0; k < 600; k++) {
      const x = rand() * W,
        y = rand() * H;
      if (!inside(x, y)) continue;
      const i = cellI(x, y);
      if (!allowed(probe, i, world.type[i]) || world.type[i] === 2) continue;
      if (probe.tail < 0.5 && world.comp[i] !== comp) continue;
      if (probe.tail >= 0.5 && world.dLand[i] > 48 && !(world.comp[i] === comp)) continue;
      let s = 0;
      for (const [j, n] of foodAt) {
        const dx = ((j % GW) + 0.5) * CS - x,
          dy = (((j / GW) | 0) + 0.5) * CS - y;
        if (dx * dx + dy * dy < RELEASE.near ** 2) s += n;
      }
      cand.push({ x, y, i, s });
    }
    // only the most promising places are checked for how much they can reach
    let best = null,
      bs = -1;
    for (const c of cand.sort((a, b) => b.s - a.s).slice(0, 30)) {
      const s = c.s + RELEASE.weight * reachable(c.i);
      if (s > bs) [bs, best] = [s, [c.x, c.y]];
    }
    return best || [W / 2, H / 2];
  };
  const spots = [spot(world.main)]; // release site on the main landmass
  S.home = spots[0];
  const base = { ...design, gen: 0, id: 0, sp: 0 };
  for (let k = 0; k < START; k++) {
    const home = spots[k % spots.length];
    let x,
      y,
      n = 0;
    do {
      const a = rand() * TAU,
        r = rand() * 70;
      x = home[0] + Math.cos(a) * r;
      y = home[1] + Math.sin(a) * r;
      n++;
    } while ((!inside(x, y) || !allowed(probe, cellI(x, y), cellT(x, y))) && n < 60);
    if (!inside(x, y) || !allowed(probe, cellI(x, y), cellT(x, y))) {
      x = home[0];
      y = home[1];
    }
    const c = makeChild(base, x, y, 1.5);
    // founders settle homes spread around the release spot, so they don't all share one patch of food
    for (let t = 0; t < 12; t++) {
      const b = rand() * TAU,
        r = Math.sqrt(rand()) * HOME.founders,
        hx = x + Math.cos(b) * r,
        hy = y + Math.sin(b) * r;
      if (inside(hx, hy) && allowed(c, cellI(hx, hy), cellT(hx, hy))) {
        c.home = [hx, hy];
        break;
      }
    }
    c.E = c.cap * 0.8;
    c.age = rand() * 20;
    S.creatures.push(c);
  }
  const best = spots[0];
  S.orig = summ([probe]);
  logEv(`Released ${START} ${design.name} on world #${seed}`);
  cam.x = best[0];
  cam.y = best[1];
  cam.z = Math.max(fitZ() * 1.05, 1.3);
  {
    const g = tcan.getContext('2d');
    g.setTransform(TS, 0, 0, TS, 0, 0);
    paintTerrain(g);
    paintStipple(g);
    bakeLo();
    detail.ok = false;
  }
  sample();
  selectTab('sp');
  syncUI(true);
}
// does the ground suit this food? berries and nuts need land or thicket, algae shallow water (rivers or the sea's
// shelf)
function suits(f) {
  const t = world.type[f.i];
  return f.kind === 'w' ? isWater(t) && !world.deep[f.i] : t === 1 || t === 2;
}
function edible(f) {
  return f.active && !f.gone;
}
function region(f) {
  if (f.kind === 'w') return 'water';
  const i = f.i,
    t = world.type[i];
  if (t === 2) return 'thicket';
  if (world.comp[i] !== world.main) return 'island';
  return (world.fert[i] - world.fLo) / (world.fHi - world.fLo) > 0.55 ? 'meadow' : 'plain';
}
function regrow(f) {
  const g = GROW[SEASONS[S.season].grow[region(f)]],
    w = S.season === 3 ? GROW.winter : 1;
  return (g[0] + rand() * g[1]) * w;
}
// can this creature be in cell i of type t?
function allowed(c, i, t) {
  if (t === 3) return false;
  if (isWater(t)) {
    if (t === 4 && c.vW < RIVER) return false;
    return world.dLand[i] <= c.dW;
  }
  if (t === 2 && world.dThick[i] > c.dT) return false;
  return world.dWater[i] <= c.dL;
}
// old creatures slow down over their last few seconds (OLD)
const ageing = c =>
  c.age <= OLD.from ? 1 : 1 - ((1 - OLD.slowest) * (c.age - OLD.from)) / (LIFE - OLD.from);
function speedIn(c, t, i, ok) {
  if (!ok) return 7;
  return (isWater(t) ? c.vW * (t === 4 ? 0.75 : 1) : t === 2 ? c.vL * 0.85 : c.vL) * ageing(c);
}
function canEnter(c, hereOk, x, y) {
  if (!inside(x, y)) return false;
  const i = cellI(x, y),
    t = world.type[i];
  if (t === 3) return false;
  return !hereOk || allowed(c, i, t);
}
/* ---------- path finding: Dijkstra over the terrain grid, per creature ---------- */
const NN = GW * GH,
  pd = new Float32Array(NN),
  pv = new Int32Array(NN),
  pst = new Uint32Array(NN);
let pgen = 0;
const HA = new Int32Array(NN * 8),
  HK = new Float32Array(NN * 8);
let hn = 0;
function hpush(i, k) {
  let j = hn++;
  HA[j] = i;
  HK[j] = k;
  while (j > 0) {
    const p = (j - 1) >> 1;
    if (HK[p] <= HK[j]) break;
    const ta = HA[p],
      tk = HK[p];
    HA[p] = HA[j];
    HK[p] = HK[j];
    HA[j] = ta;
    HK[j] = tk;
    j = p;
  }
}
function hpop() {
  const top = HA[0],
    k = HK[0];
  hn--;
  if (hn > 0) {
    HA[0] = HA[hn];
    HK[0] = HK[hn];
    let j = 0;
    for (;;) {
      const l = 2 * j + 1,
        r = l + 1;
      let m = j;
      if (l < hn && HK[l] < HK[m]) m = l;
      if (r < hn && HK[r] < HK[m]) m = r;
      if (m === j) break;
      const ta = HA[m],
        tk = HK[m];
      HA[m] = HA[j];
      HK[m] = HK[j];
      HA[j] = ta;
      HK[j] = tk;
      j = m;
    }
  }
  return [top, k];
}
const NB = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.4142],
  [1, -1, 1.4142],
  [-1, 1, 1.4142],
  [-1, -1, 1.4142],
];
function okCell(c, j, strand) {
  const t = world.type[j];
  return allowed(c, j, t) || (strand && t !== 3);
}
function stepCost(c, j, strand) {
  const t = world.type[j];
  return allowed(c, j, t) ? 1 / speedIn(c, t, j, true) : strand ? 1 / 7 : Infinity;
}
// food sites indexed by map cell, so the search can check each cell as it reaches it
function cellIndex() {
  if (S.cIdx && S.cIdxN === S.sites.length) return S.cIdx;
  const m = new Map();
  for (const f of S.sites) {
    let L = m.get(f.i);
    if (!L) m.set(f.i, (L = []));
    L.push(f);
  }
  S.cIdx = m;
  S.cIdxN = S.sites.length;
  return m;
}
let PI = 0,
  PK = 0;
function hpop2() {
  PI = HA[0];
  PK = HK[0];
  hn--;
  if (hn > 0) {
    HA[0] = HA[hn];
    HK[0] = HK[hn];
    let j = 0;
    for (;;) {
      const l = 2 * j + 1,
        r = l + 1;
      let m = j;
      if (l < hn && HK[l] < HK[m]) m = l;
      if (r < hn && HK[r] < HK[m]) m = r;
      if (m === j) break;
      const ta = HA[m],
        tk = HK[m];
      HA[m] = HA[j];
      HK[m] = HK[j];
      HA[j] = ta;
      HK[j] = tk;
      j = m;
    }
  }
}
// home range in px: wider when hungry, so a creature will roam rather than starve
const homeRange = c => HOME.r * (1 + HOME.hunger * clamp(1 - c.E / (c.cap * HOME.starving), 0, 1));
// extra cost, in seconds of travel, of food beyond the home range
function awayCost(c, f, range) {
  const d = Math.hypot(f.x - c.home[0], f.y - c.home[1]);
  return d > range ? ((d - range) / HOME.r) * HOME.pull : 0;
}
// Dijkstra outwards from the creature; stops as soon as nothing further away could beat the best food found
function dijkstra(c) {
  pgen++;
  hn = 0;
  const s = cellI(clamp(c.x, 0, W - 1), clamp(c.y, 0, GH * CS - 1));
  const strand = !allowed(c, s, world.type[s]);
  const idx = cellIndex();
  pd[s] = 0;
  pv[s] = -1;
  pst[s] = pgen;
  hpush(s, 0);
  let n = 0;
  c._best = null;
  c._wait = null;
  let bs = Infinity,
    ws = Infinity;
  const range = homeRange(c);
  while (hn) {
    hpop2();
    const i = PI,
      k = PK;
    if (k > pd[i] + 1e-6) continue;
    if (k - 1.5 > bs || k > MAXT || ++n > 2600) break;
    const L = idx.get(i);
    if (L)
      for (const f of L) {
        if (f.gone || !allowed(c, f.i, world.type[f.i])) continue;
        const mine = f === c.target,
          cl = (f.cl || 0) - (mine ? 1 : 0);
        // food that is regrowing or already has three heading for it is somewhere to wait if nothing else is free
        if (!f.active || cl >= 3) {
          const w = k + awayCost(c, f, range);
          if (w < ws) [ws, c._wait] = [w, f];
          continue;
        }
        const sc = k + cl * 2.5 - (mine ? 1.5 : 0) + awayCost(c, f, range);
        if (sc < bs) {
          bs = sc;
          c._best = f;
        }
      }
    const x = i % GW,
      y = (i / GW) | 0;
    for (const [dx, dy, w] of NB) {
      const xx = x + dx,
        yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
      const j = yy * GW + xx;
      if (!okCell(c, j, strand)) continue;
      if (dx && dy && (!okCell(c, y * GW + xx, strand) || !okCell(c, yy * GW + x, strand))) continue;
      const nd = k + CS * w * stepCost(c, j, strand);
      if (pst[j] !== pgen || nd < pd[j]) {
        pst[j] = pgen;
        pd[j] = nd;
        pv[j] = i;
        hpush(j, nd);
      }
    }
  }
  return strand;
}
function lineOk(c, x0, y0, x1, y1, strand) {
  const d = Math.hypot(x1 - x0, y1 - y0),
    n = Math.max(1, Math.ceil(d / 5));
  for (let k = 1; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n,
      y = y0 + ((y1 - y0) * k) / n;
    if (!inside(x, y)) return false;
    const j = cellI(x, y);
    if (!okCell(c, j, strand)) return false;
  }
  return true;
}
function setTarget(c, f) {
  if (c.target === f) return;
  if (c.target) c.target.cl = Math.max(0, (c.target.cl || 0) - 1);
  c.target = f;
  if (f) f.cl = (f.cl || 0) + 1;
}
// pick the quickest food to reach that fewer than 3 others are already heading for, then a smoothed route to it
function plan(c) {
  c.rt = 3.5 + rand() * 1.5;
  const strand = dijkstra(c);
  const best = c._best,
    // with no food free, head for the nearest regrowing or busy food and wait there (looking again soon)
    goal = best || c._wait;
  setTarget(c, best);
  c.blk = 0;
  if (!best) c.rt = 1.2 + rand();
  if (!goal) {
    c.path = null;
    return;
  }
  const raw = [];
  let j = goal.i;
  while (j !== -1 && raw.length < 400) {
    raw.push([((j % GW) + 0.5) * CS, (((j / GW) | 0) + 0.5) * CS]);
    j = pv[j];
  }
  raw.reverse();
  raw.shift();
  raw.push([goal.x, goal.y]);
  const path = [];
  let cx = c.x,
    cy = c.y,
    i = 0;
  while (i < raw.length) {
    let k = raw.length - 1;
    while (k > i && !lineOk(c, cx, cy, raw[k][0], raw[k][1], strand)) k--;
    path.push(raw[k]);
    cx = raw[k][0];
    cy = raw[k][1];
    i = k + 1;
  }
  c.path = path;
  c.wp = 0;
}
function crowd(c) {
  let n = 0;
  const r2 = CRW.r * CRW.r;
  for (const o of S.creatures) {
    if (o === c || o.dead) continue;
    const dx = o.x - c.x,
      dy = o.y - c.y;
    if (dx * dx + dy * dy < r2 && ++n >= 12) break;
  }
  return n;
}
const breedChance = n => 1 / (1 + Math.pow(n / CRW.half, CRW.pow));
function update(c, dt) {
  c.age += dt;
  if (c.age >= LIFE) return kill(c, 'old age');
  if (c.pb >= 0) {
    c.pb -= dt;
    if (c.pb < 0) {
      c.pb = -1;
      birth(c);
    }
  }
  if (c.rest > 0) {
    c.rest -= dt;
    c.burnNow = burn(c, 0);
    c.E -= c.burnNow * dt;
    if (c.E <= 0) return kill(c, 'starvation');
    return;
  }
  if (S.ctrl === c) return steer(c, dt);
  c.rt -= dt;
  if (c.rt <= 0 || (c.target && !edible(c.target))) plan(c);
  const hi = cellI(clamp(c.x, 0, W - 1), clamp(c.y, 0, GH * CS - 1)),
    here = world.type[hi],
    ok = allowed(c, hi, here);
  let desired,
    near = Infinity, // how far the next point on its route is
    waiting = false; // heading for regrowing or busy food to wait by, rather than food it can eat
  if (c.path && c.wp < c.path.length) {
    let p = c.path[c.wp];
    if (Math.hypot(p[0] - c.x, p[1] - c.y) < 6 && c.wp < c.path.length - 1) {
      c.wp++;
      p = c.path[c.wp];
    }
    desired = Math.atan2(p[1] - c.y, p[0] - c.x);
    near = Math.hypot(p[0] - c.x, p[1] - c.y);
    waiting = !c.target && c.wp === c.path.length - 1;
  } else {
    c.wander += (rand() - 0.5) * dt * 1.2;
    // wanderers drift back towards home once they are outside their range, or out in deep water (unless fully
    // aquatic)
    const hx = c.home[0] - c.x,
      hy = c.home[1] - c.y;
    if (hx * hx + hy * hy > homeRange(c) ** 2 || (world.deep[hi] && c.tail < 1)) {
      const toHome = Math.atan2(hy, hx),
        off = Math.atan2(Math.sin(c.wander - toHome), Math.cos(c.wander - toHome));
      c.wander -= off * Math.min(1, dt * 1.5);
    }
    desired = c.wander;
    // near the oval edge of the map, turn back towards the middle
    if (edgeDist(c.x / CS, c.y / CS) < EDGE + 2.5) {
      desired = Math.atan2(H / 2 - c.y, W / 2 - c.x);
      c.wander = desired;
    }
  }
  const da = ((((desired - c.dir + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  c.dir += clamp(da, -3 * dt, 3 * dt);
  // a waiting creature that has reached its spot stands still, and one that must turn sharply close to its next
  // point turns on the spot first: otherwise it can circle that point for ever, never quite getting there
  const halt = (waiting && near < 12) || (near < 20 && Math.abs(da) > 1.2),
    sp = halt ? 0 : speedIn(c, here, hi, ok) * (Math.abs(da) > 1.2 ? 0.5 : 1);
  let moved = false;
  for (const off of [0, 0.45, -0.45, 1, -1, 1.8, -1.8]) {
    const d = c.dir + off,
      nx = c.x + Math.cos(d) * sp * dt,
      ny = c.y + Math.sin(d) * sp * dt;
    if (canEnter(c, ok, nx, ny)) {
      c.x = nx;
      c.y = ny;
      if (off) c.blk += dt;
      else c.blk = Math.max(0, c.blk - dt * 0.5);
      moved = true;
      break;
    }
  }
  if (!moved) {
    c.wander = c.dir + Math.PI;
    c.blk += dt;
  }
  if (moved) c.walk += dt * sp * 0.2;
  c.burnNow = burn(c, moved ? sp : 0);
  c.E -= c.burnNow * dt;
  if (c.E <= 0) return kill(c, 'starvation');
  if (c.blk > 1.5) {
    c.blk = 0;
    c.rt = 0;
  }
  if (c.target) {
    const dx = c.target.x - c.x,
      dy = c.target.y - c.y;
    if (dx * dx + dy * dy < c.reach * c.reach) S.claims.push(c);
  }
}
function resolveClaims() {
  if (!S.claims.length) return;
  const by = new Map();
  for (const c of S.claims) {
    if (c.dead) continue;
    const f = c.target;
    const w = by.get(f);
    if (!w || c.size > w.size) by.set(f, c);
  }
  for (const [f, c] of by) {
    if (edible(f)) eat(c, f);
  }
  for (const c of S.claims) if (c.target && !edible(c.target)) c.rt = 0;
  S.claims = [];
}
// how much energy the mouth gets from each food, as a multiple of FOOD: a claw gets more from nuts, a straw more
// from algae, and berries give every mouth the same
const mouthGain = (c, kind) =>
  kind === 'n'
    ? MOUTH.nut * (1 + MOUTH.bonus * (1 - 2 * c.mth))
    : kind === 'w'
      ? 1 + MOUTH.bonus * (2 * c.mth - 1)
      : 1;
const foodEnergy = (c, f) => FOOD * mouthGain(c, f.kind);
function eat(c, f) {
  f.active = false;
  f.t = regrow(f);
  f.t0 = f.t;
  c.E = Math.min(c.cap, c.E + foodEnergy(c, f));
  c.eaten++;
  setTarget(c, null);
  c.path = null;
  c.rt = 0;
  c.blk = 0;
  c.rest = 0.8 + rand() * 0.6;
  f.vis = Math.min(c.rest / 2, 1.5);
  if (c.E >= c.cap * 0.85 && c.pb < 0 && c.age >= MATURE && rand() < breedChance(crowd(c))) c.pb = rand() * 3;
  if (audible(c)) SND.eat();
}
function birth(p) {
  if (p.dead || p.E < p.cap * 0.5) return;
  if (S.creatures.length + S.newborns.length >= MAXPOP) return;
  const a = rand() * TAU;
  let x = p.x + Math.cos(a) * p.reach,
    y = p.y + Math.sin(a) * p.reach;
  if (!inside(x, y) || !allowed(p, cellI(x, y), cellT(x, y))) {
    x = p.x;
    y = p.y;
  }
  const c = makeChild(p, x, y);
  // the newborn's home: near its parent's home (not wherever the parent happened to be), sometimes a little further out
  for (let k = 0; k < 6; k++) {
    const b = rand() * TAU,
      r = rand() * HOME.disperse,
      hx = p.home[0] + Math.cos(b) * r,
      hy = p.home[1] + Math.sin(b) * r;
    if (inside(hx, hy) && allowed(c, cellI(hx, hy), cellT(hx, hy))) {
      c.home = [hx, hy];
      break;
    }
  }
  p.E -= p.cap * 0.45;
  S.newborns.push(c);
  p.births++;
  S.born++;
  if (c.gen > S.maxGen) S.maxGen = c.gen;
  parts.push({ x, y, t: 0, k: 'pop', col: col(c) });
  if (audible(p)) SND.birth();
}
// a creature the player controls moves only while an arrow key is held, by the usual rules (speed, terrain,
// energy, ageing); it eats any food it reaches and then rests as usual. Pressing into ground it can't enter makes
// its corner brackets bump.
function steer(c, dt) {
  const hi = cellI(clamp(c.x, 0, W - 1), clamp(c.y, 0, GH * CS - 1)),
    here = world.type[hi],
    ok = allowed(c, hi, here),
    kx = keys.right - keys.left,
    ky = keys.down - keys.up,
    sp = speedIn(c, here, hi, ok);
  setTarget(c, null);
  c.path = null;
  c.bump = Math.max(0, (c.bump || 0) - dt);
  let moved = false;
  if (kx || ky) {
    const d = Math.atan2(ky, kx);
    c.dir = d;
    for (const off of [0, 0.5, -0.5]) {
      const nx = c.x + Math.cos(d + off) * sp * dt,
        ny = c.y + Math.sin(d + off) * sp * dt;
      if (canEnter(c, ok, nx, ny)) {
        [c.x, c.y, moved] = [nx, ny, true];
        break;
      }
    }
    if (moved) c.walk += dt * sp * 0.2;
    else {
      c.bump = 0.25;
      // which of its limits stopped it, so the specimen tab can flash that stat
      const why = blockedBy(
        c,
        c.x + Math.cos(d) * Math.max(2, sp * dt),
        c.y + Math.sin(d) * Math.max(2, sp * dt)
      );
      if (why) [c.blockWhy, c.blockAt] = [why, performance.now()];
    }
  }
  c.burnNow = burn(c, moved ? sp : 0);
  c.E -= c.burnNow * dt;
  if (c.E <= 0) return kill(c, 'starvation');
  const idx = cellIndex(),
    x0 = hi % GW,
    y0 = (hi / GW) | 0;
  for (let y = y0 - 1; y <= y0 + 1; y++)
    for (let x = x0 - 1; x <= x0 + 1; x++)
      for (const f of idx.get(y * GW + x) || [])
        if (edible(f) && allowed(c, f.i, world.type[f.i]) && Math.hypot(f.x - c.x, f.y - c.y) < c.reach) {
          setTarget(c, f);
          S.claims.push(c);
          return;
        }
}
// why a creature can't go to x, y: 'range' (too far from shore or from water), 'speed' (allowed in the water but too
// slow a swimmer for a river's current), 'thicket' (too big to get that far into a thicket), or null (rock, the
// map's edge, or allowed)
function blockedBy(c, x, y) {
  if (!inside(x, y)) return null;
  const i = cellI(x, y),
    t = world.type[i];
  if (t === 3 || allowed(c, i, t)) return null;
  if (isWater(t)) return world.dLand[i] > c.dW ? 'range' : 'speed';
  return t === 2 && world.dThick[i] > c.dT && world.dWater[i] <= c.dL ? 'thicket' : 'range';
}
function kill(c, why) {
  if (S.ctrl === c) S.ctrl = null;
  setTarget(c, null);
  c.dead = why;
  c.diedAt = S.t;
  S.deaths++;
  S.deathBy[why] = (S.deathBy[why] || 0) + 1;
  parts.push({ x: c.x, y: c.y, t: 0, k: 'poof' });
  if (audible(c)) SND.die();
}
function step(dt) {
  S.t += dt;
  for (const f of S.sites) {
    if (f.vis > 0) f.vis -= dt;
    // food on the wrong ground after a flood or drought is wiped out, and regrows from scratch once the ground
    // suits it again
    if (!suits(f)) {
      if (!f.gone) [f.gone, f.active, f.vis] = [true, false, 0];
      continue;
    }
    if (f.gone) {
      f.gone = false;
      f.t = f.t0 = regrow(f);
    }
    if (!f.active) {
      f.t -= dt;
      if (f.t <= 0) f.active = true;
    }
  }
  const C = S.creatures,
    n = C.length,
    o = n ? (rand() * n) | 0 : 0;
  for (let k = 0; k < n; k++) {
    const c = C[(k + o) % n];
    if (!c.dead) update(c, dt);
  }
  resolveClaims();
  if (S.newborns.length || C.some(c => c.dead)) {
    S.creatures = C.filter(c => !c.dead).concat(S.newborns);
    S.newborns = [];
  }
  if (S.creatures.length > S.peak) S.peak = S.creatures.length;
  if (!S.nextKind) {
    S.nextKind = pickEvent();
    S.nextMajor = rand() < EVENTS.major;
  }
  if (S.t >= S.nextEvent) {
    worldEvent(S.nextKind, S.nextMajor);
    S.evStart = S.t;
    S.nextEvent = S.t + EVENTS.gap[0] + rand() * EVENTS.gap[1];
    S.nextKind = null;
  }
  if (S.t >= S.nextSeason) {
    S.season = (S.season + 1) % 4;
    S.seasonStart = S.t;
    S.nextSeason = S.t + SEASON_LEN;
    const m = SEASONS[S.season].msg;
    logEv(m);
    seasonFade();
  }
  S.sampleT += dt;
  if (S.sampleT >= 2) {
    S.sampleT = 0;
    sample();
    checkBadges();
  }
  S.spT += dt;
  if (S.spT >= 5) {
    S.spT = 0;
    checkSpeciation();
  }
  S.frameT += dt;
  if (S.frameT >= S.frameStep) {
    S.frameT = 0;
    record();
  }
  if (!S.creatures.length) {
    sample();
    record();
    endRun();
  }
}

/* events & tools */
function pickEvent() {
  const w = world;
  if (rand() < EVENTS.meteor) return 'meteor';
  const ev = { ...SEASONS[S.season].ev };
  // when land is too high for a drought (or too low for a flood), that share goes to the opposite event,
  // not to earthquakes, so earthquakes stay as common as the season says
  if (w.landFrac > w.land0 + LAND.noDrought) {
    ev.flood += ev.drought;
    ev.drought = 0;
  }
  if (w.landFrac < w.land0 + LAND.noFlood) {
    ev.drought += ev.flood;
    ev.flood = 0;
  }
  const kinds = Object.entries(ev).filter(k => k[1] > 0);
  let roll = rand() * kinds.reduce((s, k) => s + k[1], 0);
  for (const [n, wt] of kinds) {
    roll -= wt;
    if (roll <= 0) return n;
  }
  return kinds.length ? kinds[0][0] : 'meteor';
}
// forced: triggered from the testing buttons, so it always happens as asked
function worldEvent(kind, major, forced) {
  const w = world;
  let k = kind || pickEvent();
  if (
    !forced &&
    ((k === 'drought' && w.landFrac > w.land0 + LAND.noDrought) ||
      (k === 'flood' && w.landFrac < w.land0 + LAND.noFlood))
  )
    k = pickEvent();
  let msg;
  if (k === 'meteor') {
    for (let tries = 0; tries < 200; tries++) {
      const x = rand() * W,
        y = rand() * H;
      if (cellT(x, y) === 1) {
        meteor(x, y, major);
        return;
      }
    }
    return;
  }
  const m = major ? 1 : 0,
    amt = EVENTS.shift[m];
  if (k === 'flood') {
    w.landFrac = Math.max(w.land0 + LAND.min, w.landFrac - amt);
    const [opened] = widen(EVENTS.widen[m]);
    msg = major
      ? 'Major flood. The sea surged far inland, drowning low land and its food.'
      : 'Flood. The sea rose; low land and its food are underwater.';
    const nr = w.channels.filter(ch => !ch.sea).length + opened,
      ns = w.channels.length - nr;
    if (nr || ns)
      msg += ` ${nr && ns ? 'Rivers and sea channels have' : nr ? (nr > 1 ? 'Rivers have' : 'A river has') : ns > 1 ? 'Sea channels have' : 'A sea channel has'} widened.`;
    if (opened)
      msg +=
        opened > 1
          ? ` ${opened} rivers have become channels of sea.`
          : ' A river has become a channel of sea.';
  } else if (k === 'drought') {
    w.landFrac = Math.min(w.land0 + LAND.max, w.landFrac + amt);
    const rivers = dryUp(false, m),
      seas = dryUp(true, m),
      [, closed] = widen(1 / EVENTS.widen[m]);
    msg = major
      ? 'Major drought. The sea fell sharply, exposing new land and joining islands.'
      : 'Drought. The sea fell, joining some islands back to the mainland.';
    if (rivers) msg += rivers > 1 ? ` ${rivers} rivers have dried up.` : ' A river has dried up.';
    if (seas) msg += seas > 1 ? ` ${seas} sea channels have closed.` : ' A sea channel has closed.';
    if (closed)
      msg +=
        closed > 1
          ? ` ${closed} channels of sea have shrunk back to rivers.`
          : ' A channel of sea has shrunk back to a river.';
  } else {
    let seas = 0;
    for (let n = 0; n < EVENTS.splits[m]; n++) {
      const sea = rand() < EVENTS.seaSplit;
      seas += sea;
      w.channels.push(makeChannel(rand, sea));
    }
    const rivers = EVENTS.splits[m] - seas;
    msg = major
      ? `Major earthquake. ${
          !seas
            ? 'Two new rivers have'
            : !rivers
              ? 'Two sea channels have'
              : 'A new river and a sea channel have'
        } torn the land apart.`
      : seas
        ? 'Earthquake. The land has cracked apart and the sea has flooded in.'
        : 'Earthquake. A new river has split the land.';
  }
  w.dirty = true;
  const old = snapMap();
  buildTerrain();
  startFade(old);
  S.events++;
  S.lastEvent = S.t;
  logEv(msg);
  if (major) S.majorAt = S.t;
  SFX[k] && SFX[k](major);
  if (k === 'quake') startShake('quake', major);
  eventAlert(k);
}
// droughts dry up rivers (or close sea channels) at random, turning them back into land: a share of those there
// are, and at least a set number (EVENTS.dry, dryShare); returns how many
// floods widen rivers and sea channels (f above 1) and droughts narrow them (f below 1); returns how many rivers
// became sea channels and how many sea channels that began as rivers became rivers again
function widen(f) {
  let opened = 0,
    closed = 0;
  for (const ch of world.channels) {
    if (ch.w0 === undefined) [ch.w0, ch.wasRiver] = [ch.w, !ch.sea];
    ch.w = clamp(ch.w * f, ch.w0, EVENTS.seaMax);
    if (!ch.sea && ch.w >= EVENTS.toSea) [ch.sea, opened] = [true, opened + 1];
    else if (ch.sea && ch.wasRiver && ch.w < EVENTS.toSea) [ch.sea, closed] = [false, closed + 1];
  }
  return [opened, closed];
}
function dryUp(sea, m) {
  const pick = world.channels.filter(ch => ch.sea === sea),
    n = Math.max(EVENTS.dry[m], Math.round(pick.length * EVENTS.dryShare[m]));
  let k = 0;
  for (; k < n && pick.length; k++) {
    const ch = pick.splice((rand() * pick.length) | 0, 1)[0];
    world.channels.splice(world.channels.indexOf(ch), 1);
  }
  return k;
}
function meteor(x, y, major) {
  world.craters.push({
    x: x / CS,
    y: y / CS,
    gap: rand() * TAU,
    r: EVENTS.crater[major ? 1 : 0],
    p: [rand() * TAU, rand() * TAU, rand() * TAU],
  });
  let k = 0;
  for (const c of S.creatures) {
    if (!c.dead && Math.hypot(c.x - x, c.y - y) < EVENTS.blast[major ? 1 : 0]) {
      kill(c, 'meteor strike');
      k++;
    }
  }
  world.dirty = true;
  const old = snapMap();
  buildTerrain();
  startFade(old);
  parts.push({ x, y, t: 0, k: 'boom' });
  S.events++;
  S.lastEvent = S.t;
  const m = `${major ? 'Major meteor strike' : 'Meteor strike'}. ${k} creature${k === 1 ? '' : 's'} killed. A crater wall now rings the impact, with a small lake at its centre.`;
  logEv(m);
  if (major) S.majorAt = S.t;
  SFX.meteor(major);
  startShake('meteor', major);
  eventAlert('meteor');
  if (k >= 5) S.meteorHit = (S.meteorHit || 0) + 1;
}
function logEv(m) {
  S.log.unshift({ t: S.t, m });
  if (S.log.length > 50) S.log.pop();
}

/* stats */
const dHue = c => ((c.hue - S.design.hue + 540) % 360) - 180;
const vec = c => [
  c.w / 10,
  c.h / 10,
  c.leg,
  c.hab,
  c.mth * MOUTH_SPLIT,
  dHue(c) / 60,
  c.round * 0.5,
  c.tail > 0 ? SHOWS.tail : 0,
  c.legs === 6 ? SHOWS.legs : 0,
];
const KEYS = [
  'w',
  'h',
  'leg',
  'legs',
  'hab',
  'mth',
  'dTc',
  'river',
  'size',
  'round',
  'dhue',
  'lt',
  'vL',
  'vW',
  'dWc',
  'dLc',
  'burnW',
  'cap',
];
function summ(C) {
  const n = C.length,
    m = { n };
  KEYS.forEach(k => (m[k] = 0));
  if (!n) return m;
  for (const c of C) {
    for (const k of KEYS) if (k !== 'river' && k !== 'dhue') m[k] += c[k];
    m.river += c.vW >= RIVER && c.dW >= 16 ? 1 : 0;
    m.dhue += S ? dHue(c) : 0;
  }
  for (const k of KEYS) m[k] /= n;
  m.hue = S ? (S.design.hue + m.dhue + 360) % 360 : 0;
  return m;
}
function bySpecies() {
  const by = {};
  for (const c of S.creatures) (by[c.sp] ??= []).push(c);
  return by;
}
function sample() {
  const by = bySpecies(),
    e = { t: S.t, total: S.creatures.length, sp: {}, all: summ(S.creatures) };
  for (const sp of S.species) {
    const M = by[sp.id] || [];
    if (!sp.died) {
      sp.n = M.length;
      sp.peak = Math.max(sp.peak, sp.n);
      if (sp.n) e.sp[sp.id] = summ(M);
      else {
        sp.died = S.t;
        if (S.creatures.length) {
          logEv(`${S.genus} ${sp.epithet} went extinct.`);
          toast(`${S.genus} ${sp.epithet} went extinct.`, 'Extinction');
        }
      }
    }
  }
  S.hist.push(e);
  if (S.hist.length > 1200) S.hist = S.hist.filter((_, i) => i % 2 === 0);
}
function record() {
  const C = S.creatures,
    a = new Float32Array(C.length * 6);
  C.forEach((c, i) => {
    a.set([c.x, c.y, c.hue, c.lt, c.bw, c.bh], i * 6);
  });
  S.frames.push({ t: S.t, a });
  if (S.frames.length > 1400) {
    S.frames = S.frames.filter((_, i) => i % 2 === 0);
    S.frameStep *= 2;
  }
}

/* speciation */
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const centroid = M => {
  const s = new Array(vec(M[0]).length).fill(0);
  for (const c of M) {
    const v = vec(c);
    for (let i = 0; i < v.length; i++) s[i] += v[i];
  }
  return s.map(v => v / M.length);
};
function kmeans2(M) {
  const P = M.map(vec),
    cen = centroid(M);
  let a = P.reduce((b, p) => (dist(p, cen) > dist(b, cen) ? p : b), P[0]),
    b = P.reduce((q, p) => (dist(p, a) > dist(q, a) ? p : q), P[0]);
  let lab = [];
  for (let it = 0; it < 8; it++) {
    lab = P.map(p => (dist(p, a) <= dist(p, b) ? 0 : 1));
    const A = P.filter((_, i) => !lab[i]),
      B = P.filter((_, i) => lab[i]);
    if (!A.length || !B.length) return null;
    const m = G => G[0].map((_, k) => G.reduce((s, p) => s + p[k], 0) / G.length);
    a = m(A);
    b = m(B);
  }
  let wss = 0;
  P.forEach((p, i) => {
    wss += dist(p, lab[i] ? b : a) ** 2;
  });
  const within = Math.sqrt(wss / P.length) || 1e-6,
    d = dist(a, b);
  return { d, ratio: d / within, groups: [M.filter((_, i) => !lab[i]), M.filter((_, i) => lab[i])] };
}
function checkSpeciation() {
  const by = bySpecies();
  const hard = 1 + SPC.extra * (S.species.filter(s => !s.died).length - 1);
  for (const sp of S.species) {
    if (sp.died) continue;
    const M = by[sp.id] || [];
    if (M.length < 20 || S.t - sp.born < SPC.age || S.t - (sp.lastSplit || -99) < SPC.cool) {
      sp.streak = 0;
      continue;
    }
    let key = null,
      small = null,
      reason = '',
      island = false;
    const g = new Map();
    for (const c of M) {
      if (!inside(c.x, c.y)) continue;
      const i = cellI(c.x, c.y),
        t = world.type[i];
      if (t !== 1 && t !== 2) continue;
      const k = world.comp[i];
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(c);
    }
    const gs = [...g.entries()].sort((x, y) => y[1].length - x[1].length);
    if (gs.length >= 2 && gs[1][1].length >= 8) {
      const d = dist(centroid(gs[0][1]), centroid(gs[1][1]));
      if (d > SPC.geo * hard) {
        key = 'geo' + gs[0][0] + '-' + gs[1][0];
        small = gs[1][1];
        reason = 'diverged after being cut off on separate land';
        island = gs[1][0] !== world.main;
      }
    }
    if (!key) {
      const r = kmeans2(M);
      if (
        r &&
        r.d > SPC.eco * hard &&
        r.ratio > SPC.ratio &&
        Math.min(r.groups[0].length, r.groups[1].length) >= 8
      ) {
        key = 'eco';
        small = r.groups[0].length < r.groups[1].length ? r.groups[0] : r.groups[1];
        reason = 'split into a different way of life';
      }
    }
    if (key && key === sp.key) sp.streak++;
    else {
      sp.key = key;
      sp.streak = key ? 1 : 0;
    }
    if (sp.streak >= SPC.streak) {
      split(
        sp,
        small,
        M.filter(c => !small.includes(c)),
        reason,
        island
      );
      sp.streak = 0;
      sp.key = null;
      break;
    }
  }
}
const EPI = [
  ['hab', 1, 'natans'],
  ['hab', -1, 'terrestris'],
  ['mth', 1, 'sorbens'],
  ['mth', -1, 'chelifer'],
  ['leg', 1, 'longipes'],
  ['leg', -1, 'brevipes'],
  ['size', 1, 'magnus'],
  ['size', -1, 'minimus'],
  ['round', 1, 'rotundus'],
  ['round', -1, 'acutus'],
];
function split(sp, small, rest, reason, island) {
  const a = summ(small),
    b = summ(rest);
  const used = new Set(S.species.map(s => s.epithet));
  const scale = { hab: 0.15, mth: 0.15, leg: 0.15, size: 0.25, round: 0.25 };
  const cand = EPI.map(([k, s, name]) => ({ name, v: (s * (a[k] - b[k])) / scale[k] }))
    .filter(x => x.v > 0)
    .sort((x, y) => y.v - x.v)
    .map(x => x.name);
  if (island) cand.unshift('insularis');
  cand.push('novus', 'alter', 'tertius', 'remotus');
  let ep = cand.find(n => !used.has(n));
  if (!ep) ep = 'forma' + S.species.length;
  const ns = {
    at: { self: a, parent: b },
    id: S.species.length,
    epithet: ep,
    tag: TAGS[S.species.length % TAGS.length],
    parent: sp.id,
    born: S.t,
    died: null,
    reason,
    n: small.length,
    peak: small.length,
    streak: 0,
    key: null,
  };
  S.species.push(ns);
  sp.lastSplit = S.t;
  for (const c of small) c.sp = ns.id;
  sp.n = rest.length;
  // the biggest change, always put as a strength: [when the trait went up, when it went down]
  const top = diffs(a, b, 1)[0],
    TRAIT = {
      hab: ['longer-tailed and more at home in water', 'shorter-tailed and more at home on land'],
      mth: ['better at sipping algae through its straw-like mouth', 'better at cracking nuts with its claw'],
      leg: ['longer-legged and faster on land', 'shorter-legged and a better swimmer'],
      size: ['bigger and thriftier with energy', 'smaller and quicker on its feet'],
      dTc: ['small enough to slip deeper into thickets', 'bigger and thriftier with energy'],
      river: ['better at crossing rivers', 'more settled on dry land'],
      dhue: ['a striking new colour', 'a striking new colour'],
      round: ['rounder and a better swimmer', 'blockier and a better walker'],
    };
  const how = top ? (TRAIT[top.k] || [top.l, top.l])[top.va > top.vb ? 0 : 1] : 'a little different';
  const m = `Welcome the first ${S.genus} ${ep}, who is ${how}.`;
  logEv('New species: ' + m);
  toast(m, 'A new species has formed!');
  SND.badge();
}

/* achievements (named 'badges' in the code) */
const live = () => Object.values(S.hist.at(-1).sp);
const BADGES = [
  {
    id: 'yr1',
    name: 'First Year',
    d: `Survive all four seasons (${(SEASON_LEN * 4) / 60} minutes)`,
    f: () => S.t >= SEASON_LEN * 4,
  },
  { id: 't20', name: 'Old Lineage', d: 'Lineage lasts 20 minutes', f: () => S.t >= 1200 },
  { id: 't45', name: 'Ancient Line', d: 'Lineage lasts 45 minutes', f: () => S.t >= 2700 },
  { id: 'g30', name: 'Dynasty', d: 'Reach generation 30', f: () => S.maxGen >= 30 },
  { id: 'g80', name: 'Deep Time', d: 'Reach generation 80', f: () => S.maxGen >= 80 },
  { id: 'ev8', name: 'Weathered', d: 'Survive 8 world events', f: () => S.events >= 8 },
  {
    id: 'maj',
    name: 'Against the Odds',
    d: 'Still going 60 s after a major world event',
    f: () => S.majorAt != null && S.t - S.majorAt >= 60,
  },
  {
    id: 'met',
    name: 'Impact Survivor',
    d: 'Recover after a meteor kills 5 or more',
    f: () => S.meteorHit > 0 && S.creatures.length >= 40,
  },
  {
    id: 'fins',
    name: 'Taking to the Water',
    d: "A species' tail grows by 40 points",
    f: () => live().some(m => m.hab - S.orig.hab >= 0.4),
  },
  {
    id: 'ashore',
    name: 'Coming Ashore',
    d: "A species' tail shrinks by 40 points",
    f: () => live().some(m => S.orig.hab - m.hab >= 0.4),
  },
  {
    id: 'claw',
    name: 'Nutcracker',
    d: 'A species shifts 40 points towards a claw',
    f: () => live().some(m => S.orig.mth - m.mth >= 0.4),
  },
  {
    id: 'straw',
    name: 'Sipper',
    d: 'A species shifts 40 points towards a straw',
    f: () => live().some(m => m.mth - S.orig.mth >= 0.4),
  },
  {
    id: 'squeeze',
    name: 'Squeezer',
    d: 'A species gets small enough to reach the heart of the thickets',
    f: () => S.orig.dT < world.tDeep && live().some(m => m.dTc >= world.tDeep),
  },
  {
    id: 'drift',
    name: 'New Look',
    d: 'Average colour drifts 60° from the original',
    f: () => Math.abs(S.hist.at(-1).all.dhue) >= 60,
  },
  { id: 'branch', name: 'Branching Out', d: 'Witness a new species form', f: () => S.species.length >= 2 },
  {
    id: 'three',
    name: 'Crowded Tree',
    d: 'Three species alive at once',
    f: () => S.species.filter(s => !s.died).length >= 3,
  },
  { id: 'tree', name: 'Tree of Life', d: 'Six species over one run', f: () => S.species.length >= 6 },
];
function checkBadges() {
  if (!S.creatures.length) return;
  for (const b of BADGES) {
    if (S.badges.includes(b.id)) continue;
    let ok = false;
    try {
      ok = b.f();
    } catch (e) {}
    if (ok) {
      S.badges.push(b.id);
      toast(`${b.name}. ${b.d}`, 'Achievement');
      SND.badge();
      logEv('Achievement: ' + b.name);
      renderBadges();
    }
  }
}
