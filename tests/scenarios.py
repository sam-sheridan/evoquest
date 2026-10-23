"""Balance test: runs many full simulations headlessly and reports population, seasons and speciation.

Usage:  python3 tests/scenarios.py [runs] [minutes]       e.g.  python3 tests/scenarios.py 6 15

Each run uses a different world and one of several starting designs, steps the simulation as fast as
possible (no rendering), and prints one line per run plus a summary. What "healthy" looks like
(the targets the current config was tuned to):
  - population mostly between about 40 and 100 (pctOver100 low)
  - seasons swing gently (summer/autumn a bit busier than winter/spring)
  - new species are rare in 15 minutes (the target is primus plus 1-3 over an hour: see study.py), never more than 3 alive at once
  - extinction now and then, even for ordinary designs (a real risk while populations are small and local)
  - about a quarter of the land explored after 10 minutes (explored10)

Needs Python 3 and Playwright:  pip install playwright && playwright install chromium
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 4
MINUTES = float(sys.argv[2]) if len(sys.argv) > 2 else 12

# tails count from 15% (TAIL.min): 0.15 + 0.85 x the effective tail
DESIGNS = [
    ('default', {}),
    ('aquatic', {'hab': 0.66}),
    ('small and long-legged', {'leg': 0.8, 'w': 2, 'h': 2.5}),
    ('big and short-legged', {'leg': 0.2, 'w': 6, 'h': 6}),
    ('long and thin', {'hab': 0.44, 'w': 2.5, 'h': 5}),
    ('long legs', {'leg': 0.75}),
]

MEASURE = """(steps) => {
  const q = window.EvoQuestDebug, S = q.state, seasons = [[], [], [], []];
  let min = 1e9, max = 0, over = 0, count = 0, maxLive = 1, explored10 = null, pop10 = null, late = [];
  // exploration: which 4x4-cell blocks any creature has stood in, as a share of blocks with land, at 10 minutes
  const w = q.world, BW = Math.ceil(GW / 4), seen = new Uint8Array(BW * Math.ceil(GH / 4));
  const t0 = performance.now();
  for (let i = 0; i < steps; i++) {
    if (S.over) break;
    q.step(0.05);
    if (i % 20 === 0 && S.t <= 600)
      for (const c of S.creatures) seen[((c.y / CS / 4) | 0) * BW + ((c.x / CS / 4) | 0)] = 1;
    if (i % 40 === 0 && S.t > 1200) late.push(S.creatures.length);
    if (explored10 === null && S.t >= 600) {
      pop10 = S.creatures.length;
      const land = new Uint8Array(seen.length);
      for (let k = 0; k < GW * GH; k++) if (isLand(w.type[k])) land[(((k / GW) | 0) >> 2) * BW + ((k % GW) >> 2)] = 1;
      let a = 0, b = 0;
      for (let k = 0; k < land.length; k++) if (land[k]) { a++; if (seen[k]) b++; }
      explored10 = Math.round((b / a) * 100);
    }
    if (i % 40 === 0 && S.t > 180) {               // sample every 2 s, after a 3-minute settling period
      const n = S.creatures.length;
      seasons[S.season].push(n); min = Math.min(min, n); max = Math.max(max, n); count++;
      if (n > 100) over++;
      maxLive = Math.max(maxLive, S.species.filter(s => !s.died).length);
    }
  }
  const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  return { minutes: Math.round(S.t / 6) / 10, extinct: S.over, newSpecies: S.species.length - 1,
           maxLiveSpecies: maxLive, seasonAverages: seasons.map(avg), min: min === 1e9 ? 0 : min, max,
           pctOver100: count ? Math.round((over / count) * 100) : 0, worldEvents: S.events,
           explored10, pop10, lateAvg: late.length ? Math.round(late.reduce((x, y) => x + y, 0) / late.length) : null,
           lateMax: late.length ? Math.max(...late) : null,
           mouthEnd: S.hist.length ? +S.hist.at(-1).all.mth.toFixed(2) : null,
           roundEnd: S.hist.length ? +S.hist.at(-1).all.round.toFixed(2) : null,
           tailEnd: S.hist.length ? +S.hist.at(-1).all.hab.toFixed(2) : null,
           sizeEnd: S.hist.length ? +S.hist.at(-1).all.size.toFixed(2) : null,
           legEnd: S.hist.length ? +S.hist.at(-1).all.leg.toFixed(2) : null,
           msPerStep: +((performance.now() - t0) / steps).toFixed(2) };
}"""

results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    pg = browser.new_page(viewport={'width': 800, 'height': 600})
    pg.goto('file://' + os.path.join(ROOT, 'index.html'))
    time.sleep(1)
    for r in range(RUNS):
        name, design = DESIGNS[r % len(DESIGNS)]
        seed = 1000 + r * 37
        pg.evaluate("() => { document.querySelector('#creator').hidden = false; document.querySelector('#end').hidden = true }")
        pg.evaluate(f"() => window.EvoQuestDebug.setDesign({{ w: 4, h: 4.5, leg: 0.5, hab: 0.32, mth: 0.5, round: 0.5, ...{json.dumps(design)} }})")
        pg.evaluate(f"""() => {{ const sel = document.querySelector('#fWorld');
            sel.innerHTML += `<option value="{seed}">test</option>`; sel.value = '{seed}'; }}""")
        pg.click('#go')
        pg.click('#bPause')
        res = pg.evaluate(MEASURE, int(MINUTES * 60 / 0.05))
        res['design'] = name
        res['world'] = seed
        results.append(res)
        print(json.dumps(res))
    browser.close()

alive = [r for r in results if not r['extinct']]
print('\nSummary')
print(f"  runs: {len(results)}, extinct: {len(results) - len(alive)}")
if alive:
    print(f"  average % of time over 100 creatures: {round(sum(r['pctOver100'] for r in alive) / len(alive))}%")
    print(f"  new species per run: {[r['newSpecies'] for r in results]}")
    print(f"  most species alive at once: {max(r['maxLiveSpecies'] for r in results)}")
    print(f"  % of land explored at 10 minutes: {[r['explored10'] for r in results]}")
    print(f"  population at 10 minutes: {[r['pop10'] for r in results]}")
    print(f"  average population after 20 minutes: {[r['lateAvg'] for r in results]}")
    print(f"  average mouth at the end (0 claw, 1 straw; released at 0.5): {[r['mouthEnd'] for r in results]}")
    print(f"  average roundness at the end (released at 0.5): {[r['roundEnd'] for r in results]}")
    print(f"  average tail at the end: {[(r['design'], r['tailEnd']) for r in results]}")
    print(f"  average size at the end (released at 0.9; 0.64 small, 1.13 big): {[r['sizeEnd'] for r in results]}")
    print(f"  average legs at the end: {[(r['design'], r['legEnd']) for r in results]}")
    print(f"  ms per simulation step: {[r['msPerStep'] for r in results]}")
