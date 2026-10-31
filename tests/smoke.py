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
    # the game's random numbers come from a fixed seed, so the test plays out much the same way every time
    pg.add_init_script('''(() => { let s = 1074;
        Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })()''')
    pg.goto('file://' + os.path.abspath(page_file))
    time.sleep(1)

    # the intro opens by itself on a first visit: click through every pane to the creator, then reopen it from the
    # creator's title and skip it
    intro_first = pg.evaluate("() => !document.querySelector('#intro').hidden")
    pg.click('#inStart')
    for _ in range(5):
        time.sleep(0.3)
        pg.click('#inNext')
    pg.click('#crLogo')
    time.sleep(0.3)
    pg.click('#inSkip')
    intro_ok = intro_first and pg.evaluate("() => document.querySelector('#intro').hidden")

    # creator: randomise (to exercise the button), then release a sturdy design on a known world, so the run
    # doesn't die out early and leave the end screen covering the controls
    pg.click('#rnd')
    pg.evaluate("() => window.EvoQuestDebug.setDesign({ w: 2, h: 2.5, hab: 0.1 })")
    pg.evaluate("""() => { const sel = document.querySelector('#fWorld');
        sel.innerHTML += '<option value="1074">test</option>'; sel.value = '1074'; }""")
    pg.click('#go')
    time.sleep(0.3)

    # run 2.5 minutes of simulation, then force one of every major world event. Those can occasionally wipe the
    # population out by chance (the end screen would then cover the controls), so in that case release again on the
    # same world and try once more, up to three times in all; that's the test's setup, not a fault in the game
    for attempt in range(3):
        pg.evaluate("""() => { const q = window.EvoQuestDebug;
            for (let i = 0; i < 3000 && !q.state.over; i++) q.step(0.05);
            for (const k of ['flood', 'drought', 'quake', 'meteor']) if (!q.state.over) q.triggerEvent(k, true); }""")
        time.sleep(1.5)
        if not pg.evaluate('() => window.EvoQuestDebug.state.over'):
            break
        pg.click('#eSame')
        time.sleep(0.3)
        pg.click('#go')
        time.sleep(0.3)

    # inspector tabs, chart options and map colour toggle
    for tab in ['sp', 'stats', 'one', 'world']:
        pg.click(f'[data-tab={tab}]')
        time.sleep(0.2)
    pg.click('[data-tab=stats]')
    for metric in ['n', 'vL', 'vW', 'dWc', 'dLc', 'burnW', 'cap', 'dTc', 'river']:
        pg.click(f'[data-m={metric}]')
        time.sleep(0.1)
    pg.click('[data-tab=world]')

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
    # testing tools live in Settings, hidden until the password is entered
    pg.click('#bSet')
    locked = pg.evaluate("() => document.querySelector('#testTools').hidden")
    pg.fill('#sPw', 'wrong')
    pg.click('#sPwGo')
    still_locked = pg.evaluate("() => document.querySelector('#testTools').hidden")
    pg.fill('#sPw', '1234')
    pg.click('#sPwGo')
    for spd in ['10', '1']:
        pg.click(f'#sSpeed [data-spd="{spd}"]')
    pg.click('#sMajor')
    pg.click('#sMajor')
    lock_ok = locked and still_locked and not pg.evaluate("() => document.querySelector('#testTools').hidden")
    pg.click('#sSound')
    pg.click('#sSound')
    pg.click('#bSet')

    # zoom in (sharp map layer and zoom music), select a creature, zoom back out
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

    # select a creature directly (the youngest on open map that isn't resting after a meal, so it won't die of old
    # age mid-test, the click isn't caught by a panel over it and it can move straight away), take control, steer
    # it with the arrow keys, then let go
    sx, sy = pg.evaluate("""() => { const at = c => [(c.x - cam.x) * cam.z + innerWidth / 2, (c.y - cam.y) * cam.z + innerHeight / 2];
        const C = [...window.EvoQuestDebug.state.creatures].sort((a, b) => a.age - b.age),
          c = C.find(c => c.rest <= 0 && document.elementFromPoint(...at(c))?.id === 'cv') || C[0];
        return at(c); }""")
    pg.mouse.click(sx, sy)
    steer_ok = True
    if pg.query_selector('#ctl'):
        pg.click('#ctl')
        # a resting creature can't move until its rest is over, so wait for that first (at most 2 seconds)
        for _ in range(40):
            if not pg.evaluate("() => { const c = window.EvoQuestDebug.state.ctrl; return c && c.rest > 0; }"):
                break
            time.sleep(0.05)
        start = pg.evaluate("() => { const c = window.EvoQuestDebug.state.ctrl; return c && [c.x, c.y]; }")
        # the four keys trace a square, so an unobstructed creature ends exactly where it started: check its position
        # after each key, not just at the end
        seen = []
        for key in ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']:
            pg.keyboard.down(key)
            time.sleep(0.2)
            pg.keyboard.up(key)
            seen.append(pg.evaluate("() => { const c = window.EvoQuestDebug.state.ctrl; return c && [c.x, c.y, c.dir]; }"))
        # the controlled creature must still be under control, have moved, and face a real direction throughout
        steer_ok = (
            bool(start)
            and all(seen)
            and all(v == v for p in seen for v in p)
            and any((p[0], p[1]) != tuple(start) for p in seen)
        )
        if not steer_ok:
            print('steering failed: start', start, 'then after each key', seen)
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
    alive = pg.evaluate('() => window.EvoQuestDebug.state.creatures.length')

    # Extinction from Settings (asks twice), which should end the run with meteors
    pg.click('#bSet')
    pg.click('#bDoom')
    pg.click('#bDoom')
    pg.evaluate("() => { const q = window.EvoQuestDebug; for (let i = 0; i < 4000 && !q.state.over; i++) q.step(0.05); }")
    time.sleep(0.5)
    doomed = pg.evaluate("() => window.EvoQuestDebug.state.over && !document.querySelector('#end').hidden")

    browser.close()

ok = intro_ok and steer_ok and summary_shown and alive > 0 and lock_ok and doomed and not errors
print('PASS' if ok else 'FAIL', '| intro works:', intro_ok, '| steering works:', steer_ok, '| summary shown:', summary_shown, '| new run alive:', alive, '| testing lock works:', lock_ok,
      '| extinction ends the run:', doomed, '| page errors:', errors)
sys.exit(0 if ok else 1)
