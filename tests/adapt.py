"""Adaptation study: do body traits follow the places creatures live, run after run, or just drift by chance?

Usage:  python3 tests/adapt.py [minutes] [workers] [worlds per type] [results file]
        python3 tests/adapt.py --summary [results file]      (summarise an earlier run again)
        e.g.  python3 tests/adapt.py 30 4 3      (45 runs of 30 minutes, four at a time, about 10-15 minutes)

On every world it releases three designs: the middling one, a half-tailed one (which can move towards land or
water) and one made by the creator's Randomise. From 10 minutes on, once a minute, it records every creature's body
traits and what its home patch is like: water or land, near water or inland, thicket or open ground, high (cold)
or low (warm) land, and how much land food grows close by.

For each pair of places it compares a trait's average in one with the other (for example roundness on high land
against low land) in every run that has enough creatures in both. Drift by chance pushes a run's difference either
way, so over many runs it cancels out; adaptation pushes the same way every time. So the summary shows, for each
comparison, how many runs went each way and how likely that split would be by pure chance (a sign test).

Needs Python 3 and Playwright:  pip install playwright && playwright install chromium
"""
import json
import math
import multiprocessing as mp
import os
import statistics
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = [] if sys.argv[1:2] == ['--summary'] else sys.argv[1:]
MINUTES = float(ARGS[0]) if len(ARGS) > 0 else 30
WORKERS = int(ARGS[1]) if len(ARGS) > 1 else 4
PER_TYPE = int(ARGS[2]) if len(ARGS) > 2 else 3
OUT = ARGS[3] if len(ARGS) > 3 else os.path.join(tempfile.gettempdir(), 'adapt.jsonl')

DESIGNS = {
    'middling': {'w': 4, 'h': 4.5, 'leg': 0.5, 'hab': 0.1, 'mth': 0.5, 'round': 0.5},
    'half-tailed': {'w': 4, 'h': 4.5, 'leg': 0.5, 'hab': 0.5, 'mth': 0.5, 'round': 0.5},
    'random': None,  # made in the page by the creator's own Randomise
}
TRAITS = ['size', 'leg', 'hab', 'mth', 'round']
NAMES = {'size': 'Size', 'leg': 'Legs', 'hab': 'Tail', 'mth': 'Mouth', 'round': 'Roundness'}
# environment codes recorded for each creature (see RUN): place 0 water, 1 land near water, 2 land inland;
# thick 1 if home is in a thicket; height 0 low (warm), 1 middle, 2 high (cold), land only; food = land food sites
# within FOOD_R px of home
FOOD_R = 150
# comparisons: (trait, label, group A, group B, what nature would predict for A against B)
# a group is a test on one record (a dict of the environment codes)
water = lambda r: r['place'] == 0
land = lambda r: r['place'] > 0
COMPARE = [
    ('hab', 'water vs land', water, land, 'more tail in water'),
    ('hab', 'land near water vs inland', lambda r: r['place'] == 1, lambda r: r['place'] == 2, 'more tail near water'),
    ('mth', 'water vs land', water, land, 'straws in water'),
    ('mth', 'thicket vs open land', lambda r: land(r) and r['thick'], lambda r: land(r) and not r['thick'], 'beaks in thickets'),
    ('size', 'thicket vs open land', lambda r: land(r) and r['thick'], lambda r: land(r) and not r['thick'], 'smaller in thickets'),
    ('size', 'high (cold) vs low (warm) land', lambda r: land(r) and r['height'] == 2, lambda r: land(r) and r['height'] == 0, 'bigger on cold high land'),
    ('size', 'water vs land', water, land, 'none expected'),
    ('leg', 'water vs land', water, land, 'shorter legs in water'),
    ('leg', 'thicket vs open land', lambda r: land(r) and r['thick'], lambda r: land(r) and not r['thick'], 'none expected'),
    ('leg', 'sparse vs dense land food', None, None, 'unclear'),  # groups set per run (see compare())
    ('round', 'water vs land', water, land, 'rounder in water'),
    ('round', 'high (cold) vs low (warm) land', lambda r: land(r) and r['height'] == 2, lambda r: land(r) and r['height'] == 0, 'none today'),
]
MIN_N = 20  # records needed in each group for a run to count

RUN = (
    """([steps, every]) => {
  const q = window.EvoQuestDebug, S = q.state, w = q.world;
  // land food sites per cell, then how many lie within FOOD_R px of each home (counted from the static site list)
  const R = %d, sites = w.sites.filter(s => s.kind !== 'w');
  const foodNear = (x, y) => { let n = 0; for (const s of sites) if ((s.x - x) ** 2 + (s.y - y) ** 2 < R * R) n++; return n; };
  const rec = [], first = S.orig;
  for (let i = 0; i < steps && !S.over; i++) {
    q.step(0.05);
    if (S.t >= 600 && i %% every === 0) {
      const snap = Math.round(S.t);
      for (const c of S.creatures) {
        const [hx, hy] = c.home, k = cellI(hx, hy), t = w.type[k];
        const place = isWater(t) ? 0 : w.dWater[k] <= 64 ? 1 : 2;
        // height from the land's own temperature rank (0 highest, 1 lowest), as the game uses: cold below
        // TEMP.cold, hot above TEMP.hot, before seasons and world type
        const tp = w.temp[k], height = place === 0 ? -1 : tp < TEMP.cold ? 2 : tp > TEMP.hot ? 0 : 1;
        rec.push([snap, place, t === 2 ? 1 : 0, height, place === 0 ? -1 : foodNear(hx, hy),
          +c.size.toFixed(3), +c.leg.toFixed(3), +c.hab.toFixed(3), +c.mth.toFixed(3), +c.round.toFixed(3)]);
      }
    }
  }
  const last = S.creatures;
  const avg = k => (last.length ? +(last.reduce((a, c) => a + c[k], 0) / last.length).toFixed(3) : null);
  return { released: Object.fromEntries(['size', 'leg', 'hab', 'mth', 'round'].map(k => [k, +first[k].toFixed(3)])),
    end: Object.fromEntries(['size', 'leg', 'hab', 'mth', 'round'].map(k => [k, avg(k)])),
    extinct: S.over, minutes: Math.round(S.t / 6) / 10, popEnd: last.length, rec };
}"""
    % FOOD_R
)


def pick_worlds(pg, per_type):
    # the same world-picking as study.py: walk through world numbers until each type has per_type worlds
    return pg.evaluate(
        """(per) => { const got = {}, out = [];
      for (let s = 5003; out.length < per * 5 && s < 200000; s += 97) {
        const r = rollWorld(s), L = (got[r.kind] ||= []);
        if (L.length >= per) continue;
        const shapes = L.map(x => x.shape);
        if (shapes.includes(r.shape) && L.length < 3 && shapes.length < 3 && s % 5 !== 0) continue;
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
            res = pg.evaluate(RUN, [int(MINUTES * 60 / 0.05), int(60 / 0.05)])
            res.update(job)
            out.append(res)
            with open(OUT, 'a') as f:
                f.write(json.dumps(res) + '\n')
            print(f"done: {job['kind']} {job['shape']} #{job['seed']} · {job['design']} · "
                  f"{'extinct' if res['extinct'] else str(res['popEnd']) + ' alive'}", flush=True)
        browser.close()
    return out


def records(run):
    keys = ['t', 'place', 'thick', 'height', 'food'] + TRAITS
    return [dict(zip(keys, r)) for r in run['rec']]


def compare(run, trait, a, b):
    """Average of trait in group A minus group B for one run, or None if either group is too small."""
    R = records(run)
    if a is None:  # sparse vs dense land food: the lowest and highest third of this run's land records
        L = sorted((r for r in R if r['place'] > 0), key=lambda r: r['food'])
        if len(L) < 3 * MIN_N:
            return None
        A, B = L[: len(L) // 3], L[-(len(L) // 3):]
        if A[-1]['food'] >= B[0]['food']:
            return None
    else:
        A, B = [r for r in R if a(r)], [r for r in R if b(r)]
    if len(A) < MIN_N or len(B) < MIN_N:
        return None
    return statistics.mean(r[trait] for r in A) - statistics.mean(r[trait] for r in B)


def sign_p(k, n):
    """Two-sided sign test: chance of a split at least this uneven if each run were a coin toss."""
    m = max(k, n - k)
    return min(1.0, 2 * sum(math.comb(n, i) for i in range(m, n + 1)) / 2**n)


def fmt(trait, v):
    # tail, mouth, legs and roundness in percentage points of their 0-1 scale; size as it is
    return f"{v:+.3f}" if trait == 'size' else f"{v * 100:+.1f} pts"


def summary(results):
    runs = [r for r in results if r['rec']]
    print(f"\n{len(runs)} runs with creatures past 10 minutes (of {len(results)}); "
          f"{sum(r['extinct'] for r in results)} died out")
    print('\nTrait differences between places (A minus B), counted over runs with at least '
          f'{MIN_N} records in each place:\n')
    for trait, label, a, b, pred in COMPARE:
        d = [x for x in (compare(r, trait, a, b) for r in runs) if x is not None]
        if not d:
            print(f"  {NAMES[trait]:<10} {label:<32} no run had enough creatures in both places")
            continue
        up = sum(x > 0 for x in d)
        p = sign_p(up, len(d))
        verdict = 'consistent' if p < 0.01 else 'leaning' if p < 0.1 else 'chance'
        print(f"  {NAMES[trait]:<10} {label:<32} A higher in {up:>2} of {len(d):<2} runs  "
              f"median {fmt(trait, statistics.median(d)):>10}  p={p:.3f}  {verdict:<10} (nature: {pred})")
    print('\nWhole-population change from release to the end (survivors), runs going up / down:\n')
    alive = [r for r in results if r['end']['size'] is not None]
    for t in TRAITS:
        d = [r['end'][t] - r['released'][t] for r in alive]
        if d:
            print(f"  {NAMES[t]:<10} up {sum(x > 0.005 for x in d):>2}, down {sum(x < -0.005 for x in d):>2}, "
                  f"median change {fmt(t, statistics.median(d))}")


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--summary':  # re-read an earlier results file
        summary([json.loads(l) for l in open(sys.argv[2] if len(sys.argv) > 2 else OUT)])
        sys.exit()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto('file://' + os.path.join(ROOT, 'index.html'))
        time.sleep(1)
        worlds = pick_worlds(pg, PER_TYPE)
        b.close()
    jobs = [{**w, 'design': d} for w in worlds for d in DESIGNS]
    print(f'{len(jobs)} runs of {MINUTES:g} minutes on {len(worlds)} worlds, {WORKERS} at a time', flush=True)
    open(OUT, 'w').close()
    t = time.time()
    with mp.Pool(WORKERS) as pool:
        parts = pool.map(worker, [jobs[k::WORKERS] for k in range(WORKERS)])
    print(f'\nAll done in {round((time.time() - t) / 60, 1)} minutes; results in {OUT}')
    summary([r for part in parts for r in part])
