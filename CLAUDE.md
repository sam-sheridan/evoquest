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
- Whenever you start a test or anything else that takes more than a minute or so, tell Sam roughly how long it
  will take (for example "about 4–6 minutes"). Rough guide: smoke test under a minute, `scenarios.py 6 15` about
  3–5 minutes, `scenarios.py 6 30` about 6–10 minutes; running batches side by side speeds things up.

- Removing, moving or rewording existing pieces can go straight into the preview without a draft; anything
  with a new look (new icons, new drawing styles, new layouts) still gets drawn first. When Sam says "no need to
  check with me", build straight into the preview.
- Write screenshots and scratch scripts to the scratchpad, using absolute paths (screenshots saved into the repo
  folder are ignored by git but get read back by mistake). Don't run prettier on `README.md` or `CLAUDE.md`: it
  reflows the whole file.

## Where things stand

- Mechanics are beta-ready. The game was reworked in October 2026: one fixed colour per species (the released species keeps
  the creator's colour, each new species gets the most different one when it appears), black or white eyes set per
  species, a redesigned creator (stat tags that fill like bars, a ? help popup, a refresh button for Randomise)
  and 15 achievements.
- The map was redesigned again on 29 October 2026 as a **diorama** (README section 15): stepped low-poly terraces
  (7 steps), sand beaches and coastal cliffs, sea-glass seabed steps, low-poly trees and mauve rock, low-poly
  creatures with a thin outline in their own dark shade that hop over each step, faceted food (berry gems, acorns,
  a single frilled seaweed blade for algae), river streaks and waves rolling onto shores. Sam chose to keep the
  interface scientific: "observing a real world through a scientific lens". The inked field-notebook map it
  replaced was deleted (it is in the git history). Sam's choices along the way: calmer, less saturated colours; no
  pines; rivers keep stepped banks; the open sea stays still (ripples and swells were tried and rejected); the
  original spreading-arc swimming wake. Heavy shading is always a small smoothed image (Safari's limit).
- The intro shipped in October 2026: a title screen every time the game loads (wandering creatures round the name,
  "A game by Sam Sheridan" in the corner) and five panes explaining the game, reopened from the creator's EvoQuest
  title. Sam chose wandering creatures over a pinned "specimen plate" look (kept in the branch history).
- Thickets stay as they are: Sam decided against thickets that change over time.
- Species became four ways of life on 28 October 2026 (README section 10), replacing splits found by trait
  clusters; the old system is written up there, with how to bring it back. The same release added natural
  habitats (open-water algae for swimmers, amphibians near water, walkers wading rivers), breeding at 75% energy
  and full thicket speed for small creatures. Sam wants mechanics to follow nature: fix the world's causes rather
  than adding penalties. Known gap: nothing yet gives big bodies the advantages they have in nature, which is why
  a natural energy rule (small bodies need less food) made everything shrink and was left out.

- Sam's own music shipped on 28 October 2026 (README section 14): a title track on the title screen, intro and
  creator, a zoom track that fades in as you zoom (replacing the generated drum beat) and eight recorded ambient notes
  that fade out as it comes in. He makes them in GarageBand and uploads WAVs; `tools/music.py` converts a loop. A run
  now starts at 1× zoom. His recorded creature sounds (eating, birth, death) shipped on 29 October 2026; the chime,
  warning beep and event effects are still generated.

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
   `main`, set the `?v=` version on every script and the stylesheet in `index.html` to the date (add b, c and so on for a
   second ship that day, so browsers never mix old and new files), run the checks once more, merge into `main`, push, and tell Sam it will be live in a minute or two.
   Keep the branch afterwards: Sam likes old branches kept as a record. Never delete an unmerged branch.

Changes that only touch `CLAUDE.md` or `README.md`, and don't affect the game, can go straight to `main`.

If something goes wrong on the live site, revert the merge on `main` (git keeps every version), then fix it
properly on a branch.

## Checks before every preview and every merge

In a Claude Code cloud session, Chromium is preinstalled but Playwright isn't. Install the version that matches
the browser (`pip install playwright==1.56.0` matched `chromium-1194`); don't run `playwright install`. If no
version matches (`chromium-1243` had none), install any recent one, make a folder of symlinks named the way it
expects (for example `chromium_headless_shell-1200` pointing at `/opt/pw-browsers/chromium_headless_shell-1243`)
and run the tests with `PLAYWRIGHT_BROWSERS_PATH` set to that folder.

1. Run `python3 tests/smoke.py`. It must print PASS with no page errors.
   When a push depends on a test, don't pipe the test through `tail` without `set -o pipefail`, or a failing
   test won't stop the push.
2. If you changed balance (anything in `js/config.js`, or energy, breeding, food, events or speciation logic), run
   `python3 tests/scenarios.py 6 15` and compare against the targets below. Report the numbers to Sam briefly.
3. If you changed a mechanic, a number, a control or a design decision, **update `README.md` to match** in the
   same commit. Keeping the README accurate matters: it is how Sam keeps track of the game.

## Balance targets

- About a quarter of the land explored after 10 minutes, with a population of roughly 20–50 then (creatures keep
  to home ranges, so populations start local and spread). Since October 2026's faster breeding and habitats, the
  15-minute check often runs higher (26–83 at 10 minutes, up to about 60% explored); Sam is fine with that, and
  with lower numbers too.
- Populations mostly 40–100 after 20 minutes. Going over 100 briefly is fine. **No hard caps.** Crowding and
  local food should keep numbers in range naturally. Use `python3 tests/scenarios.py 6 30` to see the later
  numbers.
- Gentle seasonal swings.
- Species are four ways of life (README section 10): *natans* (water), *silvicola* (thicket), *campestris* (plains)
  and *vulgaris* (in between), so at most 4 alive and every species looks different. Over an hour, most runs should
  see 1–3 new species appear and last a good while once formed; some runs staying one species is fine. Use
  `python3 tests/study.py 60 4 3` (75 hour-long runs, about 30 minutes) to check this.
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
  - Safari silently drops the land's colour layers if they hold too many drawing points (summer went blue at about
    110,000; about 70,000 is fine). Draw heavy shading as a small smoothed image, not as more vector shapes.
  - Safari won't play Web Audio straight to the speakers on some Macs; sound goes through an `<audio>` element.
