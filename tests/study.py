"""Long balance study: many long runs across every world type and several kinds of design, run side by side.

Usage:  python3 tests/study.py [minutes] [workers] [worlds per type] [results file] [designs]
        e.g.  python3 tests/study.py 45 4 3 study.jsonl      (75 runs of 45 minutes, four at a time)

For each world type it picks worlds with a mix of shapes, and on every world it releases five designs: a middling
one, a fully random one (as Randomise makes), a small beaked walker, a big long-legged walker and a water creature.
Each run records, as one line of JSON: population at 10, 20 and 30 minutes and at the end, time over 100, seasonal swing, new
species (when, which of the four types, and where the founding group lived), how many creatures moved between
species and how often a species came back, most species alive at once, extinction (when, and what killed them),
exploration at 10 minutes, how far each body trait moved, and the type of every species. A summary is printed at
the end.

Needs Python 3 and Playwright:  pip install playwright && playwright install chromium
"""
import json
import multiprocessing as mp
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MINUTES = float(sys.argv[1]) if len(sys.argv) > 1 else 45
WORKERS = int(sys.argv[2]) if len(sys.argv) > 2 else 4
PER_TYPE = int(sys.argv[3]) if len(sys.argv) > 3 else 3
OUT = sys.argv[4] if len(sys.argv) > 4 else os.path.join(ROOT, 'study.jsonl')
ONLY = sys.argv[5].split(',') if len(sys.argv) > 5 else None  # run only these designs (comma-separated names)

DESIGNS = {
    'middling': {'w': 4, 'h': 4.5, 'leg': 0.5, 'hab': 0.1, 'mth': 0.5, 'round': 0.5},
    'random': None,  # made in the page by the creator's own Randomise
    'small beaked walker': {'w': 2.5, 'h': 3, 'leg': 0.6, 'hab': 0.05, 'mth': 0.05, 'round': 0.2},
    'big long-legged walker': {'w': 6, 'h': 6.5, 'leg': 0.9, 'hab': 0.05, 'mth': 0.5, 'round': 0.15},
    'water creature': {'w': 3.8, 'h': 4.5, 'leg': 0.05, 'hab': 0.97, 'mth': 0.97, 'round': 0.95},
}

RUN = (
    """([steps, designName]) => {
  const q = window.EvoQuestDebug, S = q.state, w = q.world;
  // lakes: water not joined to the open sea at the map's edge (worked out when a split happens)
  const lakeMask = () => {
    const N = GW * GH, sea = new Uint8Array(N), st = [];
    for (let i = 0; i < N; i++) if (w.type[i] === 0 && border(i)) { sea[i] = 1; st.push(i); }
    while (st.length) { const j = st.pop(), x = j % GW, y = (j / GW) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const xx = x + dx, yy = y + dy, k = yy * GW + xx;
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH || sea[k] || w.type[k] !== 0) continue; sea[k] = 1; st.push(k); } }
    return i => w.type[i] === 0 && !sea[i];
  };
  // record every new species: when, which type, and where the founding group was living; and how often creatures
  // move between species, and species come back
  const splits = [];
  let moved = 0, returns = 0;
  // (the game's own functions are kept once, so the recorders don't stack up over many runs in one page)
  const found0 = (window._found0 ||= found), move0 = (window._move0 ||= move), revive0 = (window._revive0 ||= revive);
  found = (z, parent, G) => {
    const inLake = lakeMask(), cells = G.map(c => cellI(c.x, c.y));
    splits.push({ t: Math.round(S.t), type: z, from: parent.epithet,
      inWater: +(cells.filter(i => isWater(w.type[i])).length / cells.length).toFixed(2),
      inLake: +(cells.filter(inLake).length / cells.length).toFixed(2), alive: S.species.filter(s => !s.died).length + 1 });
    return found0(z, parent, G);
  };
  move = (G, from, to) => { moved += G.length; return move0(G, from, to); };
  revive = sp => { returns++; return revive0(sp); };
  const seasons = [[], [], [], []], pops = {}, over = [0, 0], BW = Math.ceil(GW / 4), seen = new Uint8Array(BW * Math.ceil(GH / 4));
  let maxLive = 1, explored10 = null;
  const marks = [600, 1200, 1800], t0 = performance.now();
  for (let i = 0; i < steps && !S.over; i++) {
    q.step(0.05);
    if (i % 20 === 0 && S.t <= 600) for (const c of S.creatures) seen[((c.y / CS / 4) | 0) * BW + ((c.x / CS / 4) | 0)] = 1;
    for (const m of marks) if (pops[m] === undefined && S.t >= m) pops[m] = S.creatures.length;
    if (explored10 === null && S.t >= 600) {
      const land = new Uint8Array(seen.length);
      for (let k = 0; k < GW * GH; k++) if (isLand(w.type[k])) land[(((k / GW) | 0) >> 2) * BW + ((k % GW) >> 2)] = 1;
      let a = 0, b = 0; for (let k = 0; k < land.length; k++) if (land[k]) { a++; if (seen[k]) b++; }
      explored10 = Math.round((b / a) * 100);
    }
    if (i % 40 === 0 && S.t > 180) {
      const n = S.creatures.length; seasons[S.season].push(n); over[1]++; if (n > 100) over[0]++;
      maxLive = Math.max(maxLive, S.species.filter(s => !s.died).length);
    }
  }
  const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const last = S.hist.at(-1), first = S.orig;
  // each species' type
  const types = S.species.map(sp => sp.epithet);
  // how spread out bodies are at the end (standard deviation across every living creature), and what share of
  // them lives each way (by body, whatever species they belong to)
  const C = S.creatures, sd = k => { const m = C.reduce((a, c) => a + c[k], 0) / C.length; return +Math.sqrt(C.reduce((a, c) => a + (c[k] - m) ** 2, 0) / C.length).toFixed(3); };
  const endSpread = C.length > 1 ? { size: sd('size'), hab: sd('hab'), mth: sd('mth'), leg: sd('leg') } : null;
  const endTypes = C.length ? Object.fromEntries(TYPE_NAMES.map(z => [z, +(C.filter(c => typeOf(c) === z).length / C.length).toFixed(2)])) : null;
  const drift = last && last.total ? Object.fromEntries(['size', 'leg', 'hab', 'mth', 'round'].map(k => [k, +(last.all[k] - first[k]).toFixed(2)])) : null;
  return {
    design: designName, released: { size: +first.size.toFixed(2), leg: +first.leg.toFixed(2), hab: +first.hab.toFixed(2), mth: +first.mth.toFixed(2), round: +first.round.toFixed(2) },
    releasedType: typeOf(first), minutes: Math.round(S.t / 6) / 10, extinct: S.over, extinctAt: S.over ? Math.round(S.t) : null,
    deathBy: S.deathBy, pop10: pops[600] ?? 0, pop20: pops[1200] ?? 0, pop30: pops[1800] ?? 0, popEnd: S.over ? 0 : S.creatures.length,
    pctOver100: over[1] ? Math.round((100 * over[0]) / over[1]) : 0, seasonAverages: seasons.map(avg),
    newSpecies: S.species.length - 1, maxLiveSpecies: maxLive, splits, speciesTypes: types, moved, returns,
    // every species' life: when it formed, when it died out (null if still alive at the end) and its peak
    species: S.species.map(sp => ({ born: Math.round(sp.born), died: sp.died === null || (S.over && sp.died === S.t) ? null : Math.round(sp.died), peak: sp.peak })),
    explored10, drift, endSpread, endTypes, maxGen: S.maxGen, events: S.events, msPerStep: +((performance.now() - t0) / Math.max(1, steps)).toFixed(2),
  };
}"""
)


def pick_worlds(pg, per_type):
    # walk through world numbers until each type has per_type worlds, preferring a new shape each time
    return pg.evaluate(
        """(per) => { const got = {}, out = [];
      for (let s = 5003; out.length < per * 5 && s < 200000; s += 97) {
        const r = rollWorld(s), L = (got[r.kind] ||= []);
        if (L.length >= per) continue;
        const shapes = L.map(x => x.shape);
        if (shapes.includes(r.shape) && L.length < 3 && shapes.length < 3 && s % 5 !== 0) continue; // the same worlds every time
        L.push(r); out.push({ seed: s, kind: r.kind, shape: r.shape }); }
      return out; }""",
        per_type,
    )


def worker(jobs):
    out = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={'width': 800, 'height': 600})
        pg.goto('file://' + os.path.join(ROOT, 'index.html'))
        time.sleep(1)
        for job in jobs:
            pg.evaluate("() => { document.querySelector('#creator').hidden = false; document.querySelector('#end').hidden = true; document.querySelector('#intro').hidden = true }")
            if DESIGNS[job['design']] is None:
                pg.evaluate('() => randomDesign()')
            else:
                pg.evaluate(f"() => window.EvoQuestDebug.setDesign({json.dumps(DESIGNS[job['design']])})")
            pg.evaluate(
                f"""() => {{ const sel = document.querySelector('#fWorld');
                sel.innerHTML += `<option value="{job['seed']}">t</option>`; sel.value = '{job['seed']}'; }}"""
            )
            pg.click('#go')
            pg.click('#bPause')
            res = pg.evaluate(RUN, [int(MINUTES * 60 / 0.05), job['design']])
            res.update(job)
            out.append(res)
            with open(OUT, 'a') as f:
                f.write(json.dumps(res) + '\n')
            print(f"done: {job['kind']} {job['shape']} #{job['seed']} · {job['design']} · "
                  f"{'extinct at ' + str(res['extinctAt']) + ' s' if res['extinct'] else 'alive'} · "
                  f"{res['newSpecies']} new species", flush=True)
        browser.close()
    return out


if __name__ == '__main__':
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto('file://' + os.path.join(ROOT, 'index.html'))
        time.sleep(1)
        worlds = pick_worlds(pg, PER_TYPE)
        b.close()
    jobs = [{**w, 'design': d} for w in worlds for d in DESIGNS if not ONLY or d in ONLY]
    print(f'{len(jobs)} runs of {MINUTES:g} minutes on {len(worlds)} worlds, {WORKERS} at a time', flush=True)
    open(OUT, 'w').close()
    t = time.time()
    with mp.Pool(WORKERS) as pool:
        parts = pool.map(worker, [jobs[k::WORKERS] for k in range(WORKERS)])
    results = [r for part in parts for r in part]
    print(f'\nAll done in {round((time.time() - t) / 60, 1)} minutes; results in {OUT}')
    alive = [r for r in results if not r['extinct']]
    print(f"  extinct: {len(results) - len(alive)} of {len(results)}")
    per15 = [r['newSpecies'] / max(0.25, r['minutes'] / 15) for r in results]
    print(f"  new species per 15 minutes (average): {sum(per15) / len(per15):.2f}; most alive at once: {max(r['maxLiveSpecies'] for r in results)}")
    from collections import Counter
    print(f"  released as: {dict(Counter(r['releasedType'] for r in results))}")
    print(f"  species that appeared (besides the released one): {dict(Counter(t for r in results for t in r['speciesTypes'][1:]))}")
    print(f"  new species per run: {dict(sorted(Counter(r['newSpecies'] for r in results).items()))}")
    # convergence: on each world, how different the designs still are from each other at the end (the spread of
    # their average bodies; bigger means the starting design still matters), and how spread out each run's bodies are
    import statistics
    ends = {}
    for r in results:
        if r['drift']:
            ends.setdefault(r['seed'], []).append({k: r['released'][k] + r['drift'][k] for k in ('size', 'hab', 'mth')})
    between = [statistics.mean(statistics.pstdev([e[k] for e in E]) for k in ('size', 'hab', 'mth')) for E in ends.values() if len(E) > 1]
    within = [statistics.mean(r['endSpread'][k] for k in ('size', 'hab', 'mth')) for r in results if r.get('endSpread')]
    if between:
        print(f"  designs' end bodies differ by (average spread between designs on a world): {statistics.mean(between):.3f}")
    if within:
        print(f"  bodies within a run differ by (average spread): {statistics.mean(within):.3f}")
    mh = [r['moved'] / max(0.25, r['minutes'] / 60) for r in results]
    print(f"  creatures moving between species per hour: median {sorted(mh)[len(mh) // 2]:.0f}; species coming back: {sum(r['returns'] for r in results)}")
    for m, label in [('pop10', '10 minutes'), ('pop20', '20 minutes'), ('pop30', '30 minutes'), ('popEnd', 'the end')]:
        v = [r[m] for r in alive]
        if v:
            print(f"  population at {label} (survivors): median {sorted(v)[len(v) // 2]}, range {min(v)}-{max(v)}")
