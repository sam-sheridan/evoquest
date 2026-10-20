# EvoQuest

Design a species, release 20 of them onto a randomly generated island world, and watch the world decide what
they become. Food, terrain, seasons and world events shape their bodies over generations; groups that get cut off
or take up a different way of life can split into new species.

## Playing it

Open `index.html` in a browser. Nothing to install, nothing to build.

For a single file you can share or host anywhere, run `python3 tools/build.py` and use `dist/evoquest.html`.

## How the game works

- **Creatures** have body traits that affect survival (width, length, speed, habitat from land to water) and
  look traits that only drift by chance (colour, roundness, taper). Legs are fixed at whatever you choose.
- **Energy**: food fills it; moving, being big and being fast drain it. A creature dies at zero energy or at
  90 seconds old.
- **Breeding**: once 15 seconds old, a creature that eats with a nearly full bar may have one offspring with
  slightly varied traits. The more neighbours it has, the less likely it is to breed, which keeps populations
  near 100 without a hard limit.
- **Getting around**: each creature plans a route to the best food it can reach, avoiding rock, rivers it
  can't cross, thicket gaps too narrow for it, and water or land outside its habitat range. No more than three
  creatures chase the same piece of food.
- **Seasons** (90 s each) change where food regrows fastest and which world events are likely.
- **World events** (floods, droughts, earthquakes and rare meteors; about 1 in 10 is major) reshape the map.
  A warning symbol appears in the event bar shortly before each one.
- **Speciation**: every 5 seconds, a species is checked for a group that is either cut off on separate land or
  clustered into a different way of life. If the difference holds for about 20 seconds, the group becomes a new
  species named after the trait that sets it apart. Each extra living species makes the next split harder.

## Code layout

Plain HTML, CSS and JavaScript with no libraries. The scripts are loaded in this order and share one scope.

| File | What it does |
|---|---|
| `index.html` | Page structure: status bar, controls, inspector, creator, summary |
| `css/style.css` | All styling |
| `js/config.js` | **Every number worth tuning**: world size, seasons, food regrowth, crowding, speciation, events, colours |
| `js/util.js` | Shared helpers: random numbers, maths, saved runs, noise |
| `js/world.js` | World generation: coastlines, rivers, thickets, rocks, craters, food sites |
| `js/map.js` | Drawing the map in the field-notebook style, sharp and low-detail layers, food symbols |
| `js/creatures.js` | Traits, inheritance, abilities, drawing creatures |
| `js/sim.js` | The simulation: route planning, eating, breeding, seasons, events, stats, speciation, achievements |
| `js/audio.js` | All sound, generated live: ambient notes, creature sounds, event effects, zoomed-in beat |
| `js/summary.js` | End-of-run summary, past runs, family tree, replay |
| `js/ui.js` | Status bar, season and event bars, inspector, notifications, menus |
| `js/creator.js` | The species creator |
| `js/main.js` | Camera, input, rendering each frame, the main loop |
| `tools/build.py` | Bundles everything into one HTML file in `dist/` |
| `tests/smoke.py` | Clicks through every feature and fails on any error |
| `tests/scenarios.py` | Runs many simulations headlessly and reports population and speciation |

Short names you'll see in the code: `S` is the current run's state, `D` is the design being edited in the
creator, `c` is a creature, `f` is a food site, `world` is the generated map, `cam` is the camera.

## Changing the balance

Edit `js/config.js`, then run the balance test to see the effect:

```
python3 tests/scenarios.py 6 15
```

This runs six 15-minute simulations across different designs and worlds. The current settings aim for
populations mostly between 40 and 100, gentle seasonal swings, and 0 to 2 new species per 15 minutes with
at most 3 alive at once. Results vary from run to run, so compare batches rather than single runs.

## Tests

Both tests need Python 3 and Playwright:

```
pip install playwright
playwright install chromium
python3 tests/smoke.py
python3 tests/scenarios.py
```

The tests use `window.EvoQuestDebug`, a small read-only hook defined at the end of `js/main.js`. The bundled
`dist/` file leaves it out.
