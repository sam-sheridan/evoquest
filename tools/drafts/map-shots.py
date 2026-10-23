"""shot.py SEED OUTPREFIX [inject.js] [season] -- screenshots of the map at three zooms"""
import sys, time, os
from playwright.sync_api import sync_playwright
ROOT = '/home/user/evoquest'
seed, out = sys.argv[1], sys.argv[2]
inj = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != '-' else None
season = int(sys.argv[4]) if len(sys.argv) > 4 else 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html')
    time.sleep(0.8)
    if inj:
        pg.add_script_tag(path=inj)
    pg.evaluate("() => window.EvoQuestDebug.setDesign({ w: 2, h: 2.5, leg: 0.8, hab: 0.1 })")
    pg.evaluate(f"""() => {{ const sel = document.querySelector('#fWorld');
        sel.innerHTML += '<option value="{seed}">t</option>'; sel.value = '{seed}'; }}""")
    pg.click('#go')
    time.sleep(0.5)
    pg.evaluate("() => { const q = window.EvoQuestDebug; for (let i = 0; i < 1200; i++) q.step(0.05); }")
    if season:
        pg.evaluate(f"() => {{ const S = window.EvoQuestDebug.state; S.season = {season}; seasonFade(); S.fade = null; }}")
    pg.add_style_tag(content='body > *:not(#cv){display:none !important}')
    # views: whole map, mid zoom on creatures, close on a thicket near water
    views = pg.evaluate("""() => { const w = window.EvoQuestDebug.world, S = window.EvoQuestDebug.state;
      const c = S.creatures[0] || {x: W/2, y: H/2};
      let best = null, bd = 1e9;
      for (let i = 0; i < GW*GH; i++) if (w.type[i] === 2 && w.dWater[i] > 2 && w.dWater[i] < 6) {
        const x = (i%GW+.5)*CS, y = ((i/GW|0)+.5)*CS, d = Math.hypot(x-c.x, y-c.y);
        if (d < bd) { bd = d; best = [x, y]; } }
      best = best || [c.x, c.y];
      return [[W/2, H/2, fitZ()], [c.x, c.y, 1.0], [best[0], best[1], 3.0]]; }""")
    for k, (x, y, z) in enumerate(views):
        pg.evaluate(f"() => {{ const c = window.EvoQuestDebug.camera; c.x={x}; c.y={y}; c.z={z}; camMoved = 0; }}")
        time.sleep(0.6)
        pg.screenshot(path=f'{out}-{k}.png')
    print('errors:', errs)
    b.close()
