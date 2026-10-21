# Working on EvoQuest

EvoQuest is Sam's browser evolution game. It is live at https://sam-sheridan.github.io/evoquest/ through
GitHub Pages: anything pushed to `main` goes live within a minute or two. So game changes never go straight to
`main`: they go on a branch, Sam plays a preview, and only then are they merged (see "How a batch of changes
works" below).

`README.md` is the full reference for how the game works: every mechanism, its numbers, and the design decisions.
Read the relevant section before changing a mechanic.

## Working with Sam

- Sam doesn't read HTML, CSS or JavaScript, but he wants to learn. Lead with what changed in the game, then
  feel free to say how it was done. Use proper technical terms (commit, branch, merge, function and so on) rather
  than dumbing things down, with a brief explanation the first time a term comes up. He'll ask if something isn't
  clear. Use British English.
- **Draw visual changes before building them.** For anything that changes how the game looks (map style, creature
  design, icons, layout), show a draft first and get a yes. Offering 2–3 labelled options works well.
- When Sam floats an idea or asks "what do you think", give an honest opinion and any trade-offs before building.
  When he says "go ahead" or lists changes, build them all.
- Batched feedback is common: one message with many small fixes. Use a task list and work through every item.

## How a batch of changes works

Sam isn't comfortable with git yet, so Claude does all of it.

1. **Branch.** Start each batch of changes on a new branch from the latest `main`, named like
   `changes/2026-10-21-predators`. If unfinished work from an earlier session is on a branch, ask Sam whether to
   carry on with it.
2. **Build the changes** and commit as you go, with clear messages describing what changed in the game. Push the
   branch to GitHub so the work survives the session ending.
3. **Check.** Before every preview, run the checks below.
4. **Preview.** Run `python3 tools/build.py --fragment` and publish `dist/evoquest-fragment.html` as a private
   Artifact (the fragment suits hosts that add their own page wrapper), then give Sam the link. Republish to the same Artifact after each round of feedback, so the link stays the same
   within a session.
5. **Ship only when Sam says so** ("ship it", "merge it", "make it live"). Bring the branch up to date with
   `main`, run the checks once more, merge into `main`, push, and tell Sam it will be live in a minute or two.
   Keep the branch afterwards: Sam likes old branches kept as a record. Never delete an unmerged branch.

Changes that only touch `CLAUDE.md` or `README.md`, and don't affect the game, can go straight to `main`.

If something goes wrong on the live site, revert the merge on `main` (git keeps every version), then fix it
properly on a branch.

## Checks before every preview and every merge

In a Claude Code cloud session, Chromium is preinstalled but Playwright isn't. Install the version that matches
the browser (`pip install playwright==1.56.0` matched `chromium-1194`); don't run `playwright install`.

1. Run `python3 tests/smoke.py`. It must print PASS with no page errors.
2. If you changed balance (anything in `js/config.js`, or energy, breeding, food, events or speciation logic), run
   `python3 tests/scenarios.py 6 15` and compare against the targets below. Report the numbers to Sam briefly.
3. If you changed a mechanic, a number, a control or a design decision, **update `README.md` to match** in the
   same commit. Keeping the README accurate matters: it is how Sam keeps track of the game.

## Balance targets

- About a quarter of the land explored after 10 minutes, with a population of roughly 20–50 then (creatures keep
  to home ranges, so populations start local and spread).
- Populations mostly 40–100 after 20 minutes. Going over 100 briefly is fine. **No hard caps.** Crowding and
  local food should keep numbers in range naturally. Use `python3 tests/scenarios.py 6 30` to see the later
  numbers.
- Gentle seasonal swings.
- 0–2 new species per 15-minute run, at most 3 alive at once. Species never merge back.
- Extinction should happen now and then, even for ordinary designs: Sam wants it to be a real risk, especially
  early on while a population is small and local. Don't add safety nets that rescue struggling populations.
  Extreme designs dying out is expected.

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
