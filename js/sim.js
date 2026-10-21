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
    speed: 1, // 1×, 2× or 4×
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
    nextKind: null, // which event it will be (decided early so the warning symbol can show)
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
  const spot = comp => {
    let best = null,
      bs = -1;
    for (let k = 0; k < 600; k++) {
      const x = rand() * W,
        y = rand() * H;
      if (!inside(x, y)) continue;
      const i = cellI(x, y);
      if (!allowed(probe, i, world.type[i]) || world.type[i] === 2) continue;
      if (probe.hab < 0.5 && world.comp[i] !== comp) continue;
      if (probe.hab >= 0.5 && world.dLand[i] > 48 && !(world.comp[i] === comp)) continue;
      let s = 0;
      for (const f of world.sites) {
        const dx = f.x - x,
          dy = f.y - y;
        if (dx * dx + dy * dy < 180 * 180 && allowed(probe, f.i, world.type[f.i])) s++;
      }
      if (s > bs) {
        bs = s;
        best = [x, y];
      }
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
  selectTab('pop');
  syncUI(true);
}
function edible(f) {
  if (!f.active) return false;
  const t = world.type[f.i];
  return f.kind === 'w' ? isWater(t) : t === 1 || t === 2;
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
  if (t === 2 && c.thick > world.gap[i]) return false;
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
  let bs = Infinity;
  while (hn) {
    hpop2();
    const i = PI,
      k = PK;
    if (k > pd[i] + 1e-6) continue;
    if (k - 1.5 > bs || k > MAXT || ++n > 2600) break;
    const L = idx.get(i);
    if (L)
      for (const f of L) {
        if (!edible(f) || !allowed(c, f.i, world.type[f.i])) continue;
        const mine = f === c.target,
          cl = (f.cl || 0) - (mine ? 1 : 0);
        if (cl >= 3) continue;
        const sc = k + cl * 2.5 - (mine ? 1.5 : 0);
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
  const best = c._best;
  setTarget(c, best);
  c.blk = 0;
  if (!best) {
    c.path = null;
    c.rt = 1.2 + rand();
    return;
  }
  const raw = [];
  let j = best.i;
  while (j !== -1 && raw.length < 400) {
    raw.push([((j % GW) + 0.5) * CS, (((j / GW) | 0) + 0.5) * CS]);
    j = pv[j];
  }
  raw.reverse();
  raw.shift();
  raw.push([best.x, best.y]);
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
  c.rt -= dt;
  if (c.rt <= 0 || (c.target && !edible(c.target))) plan(c);
  const hi = cellI(clamp(c.x, 0, W - 1), clamp(c.y, 0, GH * CS - 1)),
    here = world.type[hi],
    ok = allowed(c, hi, here);
  let desired;
  if (c.path && c.wp < c.path.length) {
    let p = c.path[c.wp];
    if (Math.hypot(p[0] - c.x, p[1] - c.y) < 6 && c.wp < c.path.length - 1) {
      c.wp++;
      p = c.path[c.wp];
    }
    desired = Math.atan2(p[1] - c.y, p[0] - c.x);
  } else {
    c.wander += (rand() - 0.5) * dt * 1.2;
    desired = c.wander;
    const m = EDGE * CS + 40;
    let ex = 0,
      ey = 0;
    if (c.x < m) ex = 1;
    else if (c.x > W - m) ex = -1;
    if (c.y < m) ey = 1;
    else if (c.y > GH * CS - m) ey = -1;
    if (ex || ey) {
      desired = Math.atan2(ey, ex);
      c.wander = desired;
    }
  }
  const da = ((((desired - c.dir + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  c.dir += clamp(da, -3 * dt, 3 * dt);
  const sp = speedIn(c, here, hi, ok) * (Math.abs(da) > 1.2 ? 0.5 : 1);
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
function eat(c, f) {
  f.active = false;
  f.t = regrow(f);
  f.t0 = f.t;
  c.E = Math.min(c.cap, c.E + FOOD);
  c.eaten++;
  setTarget(c, null);
  c.path = null;
  c.rt = 0;
  c.blk = 0;
  c.rest = 0.8 + rand() * 0.6;
  f.vis = c.rest / 2;
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
  p.E -= p.cap * 0.45;
  S.newborns.push(c);
  p.births++;
  S.born++;
  if (c.gen > S.maxGen) S.maxGen = c.gen;
  parts.push({ x, y, t: 0, k: 'pop', col: col(c) });
  if (audible(p)) SND.birth();
}
function kill(c, why) {
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
  let kinds = Object.entries(SEASONS[S.season].ev);
  if (w.landFrac > 0.55) kinds = kinds.filter(k => k[0] !== 'drought');
  if (w.landFrac < 0.3) kinds = kinds.filter(k => k[0] !== 'flood');
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
  if (!forced && ((k === 'drought' && w.landFrac > 0.55) || (k === 'flood' && w.landFrac < 0.3)))
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
    w.landFrac = Math.max(0.24, w.landFrac - amt);
    msg = major
      ? 'Major flood. The sea surged far inland, drowning low land and its food.'
      : 'Flood. The sea rose; low land and its food are underwater.';
  } else if (k === 'drought') {
    w.landFrac = Math.min(0.6, w.landFrac + amt);
    const rivers = dryUp(false, EVENTS.dry[m]),
      seas = dryUp(true, EVENTS.dry[m]);
    msg = major
      ? 'Major drought. The sea fell sharply, exposing new land and joining islands.'
      : 'Drought. The sea fell, joining some islands back to the mainland.';
    if (rivers) msg += rivers > 1 ? ` ${rivers} rivers have dried up.` : ' A river has dried up.';
    if (seas) msg += seas > 1 ? ` ${seas} sea channels have closed.` : ' A sea channel has closed.';
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
  eventAlert((major ? 'Major ' : '') + { flood: 'flood', drought: 'drought', quake: 'earthquake' }[k] + '!');
}
// droughts dry up rivers (or close sea channels) at random, turning them back into land; returns how many
function dryUp(sea, n) {
  const pick = world.channels.filter(ch => ch.sea === sea);
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
  eventAlert(major ? 'Major meteor!' : 'Meteor strike!');
  if (k >= 5) S.meteorHit = (S.meteorHit || 0) + 1;
}
function logEv(m) {
  S.log.unshift({ t: S.t, m });
  if (S.log.length > 50) S.log.pop();
}

/* stats */
const dHue = c => ((c.hue - S.design.hue + 540) % 360) - 180;
const vec = c => [c.w / 10, c.h / 10, c.spd / 10, c.hab, dHue(c) / 60, c.round * 0.5, c.taper * 0.5];
const KEYS = [
  'w',
  'h',
  'spd',
  'hab',
  'thick',
  'river',
  'size',
  'round',
  'taper',
  'legs',
  'dhue',
  'lt',
  'vL',
  'vW',
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
  const s = new Array(7).fill(0);
  for (const c of M) {
    const v = vec(c);
    for (let i = 0; i < 7; i++) s[i] += v[i];
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
  ['spd', 1, 'velox'],
  ['spd', -1, 'lentus'],
  ['thick', -1, 'gracilis'],
  ['size', 1, 'magnus'],
  ['size', -1, 'minimus'],
  ['round', 1, 'rotundus'],
  ['round', -1, 'acutus'],
  ['taper', 1, 'conicus'],
  ['taper', -1, 'quadratus'],
];
function split(sp, small, rest, reason, island) {
  const a = summ(small),
    b = summ(rest);
  const used = new Set(S.species.map(s => s.epithet));
  const scale = { hab: 0.15, spd: 2, thick: 4, size: 0.25, round: 0.25, taper: 0.25, legs: 1 };
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
  const top = diffs(a, b, 1)[0],
    TRAIT = {
      hab: ['more at home in water', 'more at home on land'],
      spd: ['faster', 'slower'],
      w: ['wider', 'narrower'],
      h: ['longer', 'shorter'],
      thick: ['broader', 'slimmer'],
      river: ['better at crossing rivers', 'worse at crossing rivers'],
      dhue: ['a different colour', 'a different colour'],
      round: ['rounder', 'more angular'],
      taper: ['more tapered', 'squarer'],
    };
  const how = top ? (TRAIT[top.k] || [top.l, top.l])[top.va > top.vb ? 0 : 1] : 'a little different';
  const m = `Welcome the first ${S.genus} ${ep}, who is ${how} than ${S.genus} ${sp.epithet}. It ${reason}.`;
  logEv('New species: ' + m);
  toast(m, 'Speciation has occurred!');
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
    d: 'A species shifts 40 points towards water',
    f: () => live().some(m => m.hab - S.orig.hab >= 0.4),
  },
  {
    id: 'ashore',
    name: 'Coming Ashore',
    d: 'A species shifts 40 points towards land',
    f: () => live().some(m => S.orig.hab - m.hab >= 0.4),
  },
  {
    id: 'squeeze',
    name: 'Squeezer',
    d: 'A species slims to fit 10 px gaps',
    f: () => S.orig.thick > 10 && live().some(m => m.thick <= 10),
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
