"""Balance test: runs many full simulations headlessly and reports population, seasons and speciation.

Usage:  python3 tests/scenarios.py [runs] [minutes]       e.g.  python3 tests/scenarios.py 6 15

Each run uses a different world and one of several starting designs, steps the simulation as fast as
possible (no rendering), and prints one line per run plus a summary. What "healthy" looks like
(the targets the current config was tuned to):
  - population mostly between about 40 and 100 (pctOver100 low)
  - seasons swing gently (summer/autumn a bit busier than winter/spring)
  - 0 to 2 new species per 15-minute run, never more than 3 alive at once
  - no extinctions for ordinary designs (the big, slow design is allowed to struggle)

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

DESIGNS = [
    ('default', {}),
    ('aquatic', {'hab': 0.6}),
    ('small and fast', {'spd': 8, 'w': 2, 'h': 2.5}),
    ('big and slow', {'spd': 3, 'w': 6, 'h': 6}),
    ('long and thin', {'hab': 0.35, 'w': 2.5, 'h': 5}),
    ('quick', {'spd': 6.5}),
]

MEASURE = """(steps) => {
  const q = window.EvoQuestDebug, S = q.state, seasons = [[], [], [], []];
  let min = 1e9, max = 0, over = 0, count = 0, maxLive = 1;
  for (let i = 0; i < steps; i++) {
    if (S.over) break;
    q.step(0.05);
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
           pctOver100: count ? Math.round((over / count) * 100) : 0, worldEvents: S.events };
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
        pg.evaluate(f"() => window.EvoQuestDebug.setDesign({{ w: 4, h: 4.5, spd: 5, hab: 0.2, ...{json.dumps(design)} }})")
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
