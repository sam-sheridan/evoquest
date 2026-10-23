"""Smoke test: opens the game, clicks through every feature and fails if the page throws an error.

Usage:  python3 tests/smoke.py            (tests index.html)
        python3 tests/smoke.py some.html  (tests another page that exposes window.EvoQuestDebug)

Needs Python 3 and Playwright:  pip install playwright && playwright install chromium
"""
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page_file = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file://' + os.path.abspath(page_file))
    time.sleep(1)

    # creator: randomise (to exercise the button), then release a sturdy design on a known world, so the run
    # doesn't die out early and leave the end screen covering the controls
    pg.click('#rnd')
    pg.evaluate("() => window.EvoQuestDebug.setDesign({ w: 2, h: 2.5, leg: 0.8, hab: 0.2 })")
    pg.evaluate("""() => { const sel = document.querySelector('#fWorld');
        sel.innerHTML += '<option value="1074">test</option>'; sel.value = '1074'; }""")
    pg.click('#go')
    time.sleep(0.3)

    # run 2.5 minutes of simulation, then force one of every major world event
    pg.evaluate("""() => { const q = window.EvoQuestDebug;
        for (let i = 0; i < 3000; i++) q.step(0.05);
        for (const k of ['flood', 'drought', 'quake', 'meteor']) q.triggerEvent(k, true); }""")
    time.sleep(1.5)

    # inspector tabs, chart options and map colour toggle
    for tab in ['sp', 'stats', 'one', 'world']:
        pg.click(f'[data-tab={tab}]')
        time.sleep(0.2)
    pg.click('[data-tab=stats]')
    for metric in ['n', 'vL', 'vW', 'dWc', 'dLc', 'burnW', 'cap', 'dTc', 'river']:
        pg.click(f'[data-m={metric}]')
        time.sleep(0.1)
    pg.click('[data-tab=world]')
    pg.click('#cmode [data-cm=species]')
    pg.click('#cmode [data-cm=body]')

    # menus and info popovers
    for button in ['#bLog', '#bBadge', '#bSet']:
        pg.click(button)
        time.sleep(0.2)
        pg.mouse.click(500, 500)
    for info in ['#clock', '#evSq']:
        pg.click(info)
        pg.mouse.click(500, 500)

    # controls
    for button in ['#bFast', '#bPause', '#bPause']:
        pg.click(button)
    # testing speeds live in Settings
    pg.click('#bSet')
    for spd in ['10', '1']:
        pg.click(f'#sSpeed [data-spd="{spd}"]')
    pg.click('#sSound')
    pg.click('#sSound')
    pg.click('#bSet')

    # zoom in (sharp map layer and beat), select a creature, zoom back out
    pg.mouse.move(640, 400)
    for _ in range(8):
        pg.mouse.wheel(0, -300)
        time.sleep(0.05)
    time.sleep(1)
    pg.mouse.click(640, 400)
    for _ in range(10):
        pg.mouse.wheel(0, 300)
        time.sleep(0.05)
    pg.click('#grab')
    pg.click('#grab')

    # select a creature directly (the youngest, so it won't die of old age mid-test), take control, steer it with
    # the arrow keys, then let go
    sx, sy = pg.evaluate("""() => { const c = window.EvoQuestDebug.state.creatures.reduce((a, b) => (b.age < a.age ? b : a));
        return [(c.x - cam.x) * cam.z + innerWidth / 2, (c.y - cam.y) * cam.z + innerHeight / 2]; }""")
    pg.mouse.click(sx, sy)
    if pg.query_selector('#ctl'):
        pg.click('#ctl')
        for key in ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']:
            pg.keyboard.down(key)
            time.sleep(0.2)
            pg.keyboard.up(key)
        if pg.query_selector('#ctl'):
            pg.click('#ctl')

    # extinction -> summary -> replay -> new run on the same world -> creator from settings
    pg.evaluate("""() => { const q = window.EvoQuestDebug;
        for (const c of q.state.creatures) c.dead = 'old age'; q.step(0.05); }""")
    time.sleep(0.5)
    summary_shown = pg.evaluate("() => !document.querySelector('#end').hidden")
    pg.click('#eReplay')
    time.sleep(1)
    pg.click('#rpExit')
    time.sleep(0.3)
    pg.click('#eSame')
    time.sleep(0.3)
    pg.click('#go')
    time.sleep(0.5)
    pg.click('#bSet')
    pg.click('#bNew')
    time.sleep(0.3)
    pg.click('#cancel')
    alive = pg.evaluate('() => window.EvoQuestDebug.state.creatures.length')

    browser.close()

ok = summary_shown and alive > 0 and not errors
print('PASS' if ok else 'FAIL', '| summary shown:', summary_shown, '| new run alive:', alive, '| page errors:', errors)
sys.exit(0 if ok else 1)
