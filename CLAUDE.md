# Working on EvoQuest

EvoQuest is Sam's browser evolution game. It is live at https://sam-sheridan.github.io/evoquest/ through
GitHub Pages: anything pushed to `main` goes live within a minute or two.

`README.md` is the full reference for how the game works: every mechanism, its numbers, and the design decisions.
Read the relevant section before changing a mechanic.

## Working with Sam

- Sam is not a coder: he doesn't read HTML, CSS or JavaScript. Explain changes in plain terms: what changed in
  the game, not which functions changed. Use British English.
- **Draw visual changes before building them.** For anything that changes how the game looks (map style, creature
  design, icons, layout), show a draft first and get a yes. Offering 2–3 labelled options works well.
- When Sam floats an idea or asks "what do you think", give an honest opinion and any trade-offs before building.
  When he says "go ahead" or lists changes, build them all.
- Batched feedback is common: one message with many small fixes. Use a task list and work through every item.

## Before every push

1. Run `python3 tests/smoke.py`. It must print PASS with no page errors.
2. If you changed balance (anything in `js/config.js`, or energy, breeding, food, events or speciation logic), run
   `python3 tests/scenarios.py 6 15` and compare against the targets below. Report the numbers to Sam briefly.
3. If you changed a mechanic, a number, a control or a design decision, **update `README.md` to match** in the
   same commit. Keeping the README accurate matters: it is how Sam keeps track of the game.
4. Commit with a clear message describing what changed in the game, then push to `main`.

## Balance targets

- Populations mostly 40–100. Going over 100 briefly is fine. **No hard caps.** Crowding should keep numbers in
  range naturally.
- Gentle seasonal swings.
- 0–2 new species per 15-minute run, at most 3 alive at once. Species never merge back.
- Ordinary designs shouldn't go extinct. Extinction is acceptable for extreme designs.

## Code notes

- Plain HTML/CSS/JS, no libraries, no build step needed to play. Scripts load in the order listed in
  `index.html` and share one global scope.
- All tunable numbers live in `js/config.js`. Keep them there, with a comment on each.
- Format with prettier (`.prettierrc` is in the repo).
- `window.EvoQuestDebug` at the end of `js/main.js` is used by the tests. Keep it working.
  `tools/build.py` strips it from the single-file build.
- Known pitfalls:
  - Noise fields need whole-number frequencies. Fractional ones give NaN heights and an all-sea world.
  - The release design must carry `sat` (saturation), or colours go dull.
  - Land colour bands use the world's original heights (`refH`), so events don't recolour remaining land.
  - Changing season must not re-roll the upcoming event (`nextKind`).
