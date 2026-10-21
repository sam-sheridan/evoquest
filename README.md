# EvoQuest

Design a species, release 20 of them onto a randomly generated island world, and watch the world decide what
they become. Food, terrain, seasons and world events shape their bodies over generations. Groups that get cut
off, or that take up a different way of life, can split into new species.

**Play online:** https://sam-sheridan.github.io/evoquest/ (this works once GitHub Pages is switched on for the
repo)

**Play from a download:** open `index.html` in a browser. Nothing to install, nothing to build.

This README is the reference for how the game works. Every number below comes from the code. When a number can
be changed, its name in `js/config.js` is shown like `this`.

---

## Contents

1. [A run from start to finish](#1-a-run-from-start-to-finish)
2. [The species creator](#2-the-species-creator)
3. [Traits: body and look](#3-traits-body-and-look)
4. [Energy, eating, breeding and death](#4-energy-eating-breeding-and-death)
5. [How creatures move and find food](#5-how-creatures-move-and-find-food)
6. [The world](#6-the-world)
7. [Food](#7-food)
8. [Seasons](#8-seasons)
9. [World events](#9-world-events)
10. [Speciation and naming](#10-speciation-and-naming)
11. [Achievements](#11-achievements)
12. [The screen: controls, bars and inspector](#12-the-screen-controls-bars-and-inspector)
13. [End of a run: summary, family tree, replay](#13-end-of-a-run-summary-family-tree-replay)
14. [Sound](#14-sound)
15. [How things are drawn](#15-how-things-are-drawn)
16. [Design decisions and why](#16-design-decisions-and-why)
17. [Changing the balance](#17-changing-the-balance)
18. [Code layout](#18-code-layout)
19. [Tests and building](#19-tests-and-building)

---

## 1. A run from start to finish

1. **Design** a species in the creator. You set its name, body, look and which world to use.
2. **Release.** 20 creatures (`START`) appear together on the main landmass. The release spot is chosen to
   have as much food the design can reach as possible nearby. The founders start with 80% energy, ages spread
   between 0 and 20 seconds, and traits varied 1.5 times more than normal so selection has something to work on
   straight away.
3. **The simulation runs.** Food regrows, creatures plan routes to food, eat, breed and die. Seasons change
   every 2.5 minutes. A world event happens every 7 minutes.
4. **Evolution.** Offspring inherit their parent's traits with small random changes. Traits that help
   creatures eat and breed in this world become more common.
5. **Speciation.** If part of the population gets cut off or settles into a different way of life, it can
   become a new species with its own Latin name.
6. **The run ends** only when every creature of every species has died. There is no win condition and no time
   limit. You can also start a new species at any time from Settings.

Time in this README means game time. At 2× or 4× speed everything happens faster in real time.

---

## 2. The species creator

| Control | What it does |
|---|---|
| **Species name** | Up to 20 characters. Also becomes the Latin genus (see [naming](#10-speciation-and-naming)). |
| **Width, Length** | Body traits, 1 to 7. Bigger bodies hold more energy but burn more and are slower. |
| **Speed** | Body trait, 1 to 10. Faster creatures reach food sooner but burn much more energy moving. |
| **Habitat** | Body trait, 0% (land) to 100% (water). Splits speed between land and water and limits how far from home ground the creature goes. |
| **Starting shape** | Presets: **Round** (roundness 1, taper 0), **Block** (roundness 0.22, taper 0), **Peak** (roundness 0.25, taper 0.9). |
| **Roundness, Taper** | Look traits, 0 to 1. Roundness softens corners. Taper narrows the front of the body. |
| **Legs** | 4, 6 or 8. Fixed: never changes through evolution. |
| **Colour** | One of the 7 Okabe–Ito colours (a palette designed to stay distinguishable for colour-blind players). |
| **World** | A new random world, the current world, or any world from a past run. Each world has a number (its seed) and the same number always builds the same world. |
| **Randomise** | Random name (two made-up syllables from a list of 40, sometimes with an "s": 3,200 possible names, or 1,600 different Latin genus names, since the genus drops a trailing "s"), body, colour, shape and legs. |
| **Release 20 specimens** | Starts the run. |
| **Back to game** | Only shown if you opened the creator during a live run. Returns without changing anything. |

The **preview** shows the creature at 7× zoom with a 10 px scale bar. It also shows the body size in pixels
and which thicket gaps it fits through. The **chips** under it show:

- land speed and water speed in px/s
- whether it can cross rivers
- energy capacity and how fast it burns energy while walking
- reach (how close it must get to food to eat it)

**Past lineages** appear under the creator once you have finished a run, with a "Revisit world" button for
each.

---

## 3. Traits: body and look

Every creature carries these traits. Offspring copy their parent's traits with a small random change (see
[inheritance](#inheritance)).

### Body traits: shaped by the world

These affect survival, so natural selection pushes them in useful directions.

| Trait | Range | What it controls |
|---|---|---|
| Width (`w`) | 1–7 | Body width in pixels = 6 + 2.2 × width. |
| Length (`h`) | 1–7 | Body length in pixels = 6 + 2.2 × length. |
| Speed (`spd`) | 1–10 | Base speed before size and habitat are applied. |
| Habitat (`hab`) | 0–1 | 0 = fully land, 1 = fully water. |

From these, the game works out:

- **Size** = √(body width × body length) ÷ 17. Default Blorbs are about 0.9.
- **Narrowest side** = the smaller of body width and body length. This decides which thicket gaps it fits
  through (10, 13 or 16 px).
- **Base speed** = speed × 6 × 1.6 ÷ (0.6 + size). Big bodies are slower.
- **Land speed** = base × (1 − 0.85 × habitat).
- **Water speed** = base × (0.15 + 0.85 × habitat).
  A fully land creature still swims at 15% of its base speed. A fully water creature walks at 15%.
- **Range from home ground.**
  - Habitat below 50%: it swims at most 300 × (habitat ÷ 0.5)³ px from shore. At 20% that is about 19 px, at
    40% about 154 px, and at 0% it never enters water.
  - Habitat above 50%: the same rule applies to how far it walks from water.
  - Habitat of exactly 50%: equally at home in both, with no limit.
- **River crossing.** Needs water speed of at least 14 px/s (`RIVER`). The "Crosses rivers" chip also needs
  the creature to be willing to swim at least 16 px from shore.
- **Reach** = half the longest side + 4 px.
- **Energy capacity** = 30 + 25 × size.

The default design (width 4, length 4.5, speed 5, habitat 20%) walks at about 26 px/s, swims at about 10 px/s,
can't cross rivers, and holds about 53 energy.

### Look traits: drift by chance

These have **no effect on survival**. They change only through random variation, so related groups slowly
come to look different. That is the same "neutral drift" real biologists use to date how long ago species
split.

| Trait | Range | Notes |
|---|---|---|
| Hue | 0–360° | Starts at your chosen colour. Saturation never changes. |
| Lightness | 22–82% | |
| Roundness | 0–1 | |
| Taper | 0–1 | |
| Legs | 4, 6, 8 | Never changes. |

### Inheritance

Each trait on each newborn independently has a **30% chance of copying the parent exactly**. Otherwise it
moves by a random amount up to:

| Trait | Maximum change per generation |
|---|---|
| Width, length, speed | ±0.8 (that is 0.5 × `VAR`, and `VAR` = 1.6) |
| Habitat | ±8 percentage points (0.05 × `VAR`) |
| Hue | ±6° |
| Lightness | ±2.5 |
| Roundness, taper | ±0.05 |

Traits are then held inside their allowed ranges. `VAR` scales body-trait variation only.

---

## 4. Energy, eating, breeding and death

### Energy

- **Burn per second** = 0.4 × size + 0.9 × size × (current speed ÷ 30)².
  - Standing still costs a little; moving fast costs a lot, because of the squared term.
  - Big creatures pay more for both.
- **Food** gives 8 energy (`FOOD`), up to the creature's capacity.
- After eating, a creature **rests** for 0.8–1.4 seconds (burning only the standing cost), then plans its next
  meal.

### Breeding

A creature may breed when it eats **and** all of these are true:

- it is at least 15 seconds old (`MATURE`)
- its energy after eating is at least 85% of capacity
- it isn't already about to give birth
- it passes the **crowding roll**

**Crowding roll:** count the other creatures within 80 px (`CRW.r`), stopping at 12. The chance of breeding
is 1 ÷ (1 + (neighbours ÷ 1.5)²) (`CRW.half` = 1.5, `CRW.pow` = 2):

| Neighbours within 80 px | Chance to breed |
|---|---|
| 0 | 100% |
| 1 | 69% |
| 2 | 36% |
| 3 | 20% |
| 5 | 8% |
| 10 | 2% |

This is what keeps populations near 100 without a hard limit. Crowded areas stop breeding, and quieter areas
keep going.

If the roll succeeds, the birth happens 0–3 seconds later, as long as the parent still has at least 50% energy
then. The parent loses 45% of its capacity. The newborn appears beside it with 50% of its own capacity and
grows from 40% to full drawn size in its first few moments. Each birth makes one offspring and there are no
mates.

`MAXPOP` (400) is a safety limit only, to stop the browser grinding if balance ever goes badly wrong. Normal
runs never come near it.

### Death

| Cause | When |
|---|---|
| Starvation | Energy reaches 0. |
| Old age | 90 seconds old (`LIFE`). |
| Meteor strike | Within the blast radius of a meteor (see [events](#9-world-events)). |

A species is marked extinct when it has no members at a stats check (every 2 seconds). The run ends when no
creatures are left at all.

---

## 5. How creatures move and find food

### Where a creature is allowed to be

| Terrain | Allowed if… | Speed there |
|---|---|---|
| Land | It is within its walking range of water (always true for habitat ≤ 50%). | Land speed |
| Thicket | Its narrowest side fits that thicket's gap (10, 13 or 16 px), plus the land rule. | 85% of land speed |
| Sea | It is within its swimming range of land. | Water speed |
| River | Water speed is at least 14 px/s, plus the sea rule. | 75% of water speed (the current) |
| Rock | Never. | – |

A creature that ends up somewhere it isn't allowed (for example, land flooded under it) is **stranded**. It
moves at 7 px/s and can cross anything except rock until it gets back to allowed ground.

### Choosing food

Every 3.5–5 seconds, or sooner if its target is eaten or it has been blocked for 1.5 seconds, each creature
plans again. It searches outwards across the terrain grid for the food it can reach soonest, using a standard
shortest-route search (Dijkstra's algorithm). The search allows for terrain speed and avoids anything it isn't
allowed into.

- It only plans up to **22 seconds of travel** ahead (`MAXT`). If nothing is in range, it wanders.
- **No more than 3 creatures chase the same food.** Each creature already heading for a piece of food adds a
  2.5-second penalty to it, so others prefer free food nearby.
- A creature gets a 1.5-second bonus for sticking with its current target, which stops it flip-flopping.
- The route is then smoothed into straight lines wherever the way is clear.

### Moving

- Creatures turn at most 3 radians a second and move at half speed while turning sharply.
- If the way ahead is blocked, a creature tries angles to either side before turning around.
- Wanderers steer away from the outer sea margin.

### Reaching food

When several creatures reach the same food in the same moment, **the biggest one gets it**. The others
re-plan at once.

---

## 6. The world

### Size and grid

- The world is a grid of **188 × 131 cells**, each 16 px square: 3008 × 2096 px in total.
- Every world has a **10-cell sea margin** (`EDGE`) all round, so land never touches the edge.

### Terrain types

| Type | How it is made |
|---|---|
| **Sea** | Everything below sea level. Shown in four depth bands. |
| **Land** | Everything above sea level. |
| **Thicket** | The densest 21% of a "thicket" noise pattern, on land. Each thicket cell has a gap width of 10, 13 or 16 px (roughly a third each). Denser dots on the map mean narrower gaps. |
| **Rock** | The top 10% of a "rock" noise pattern, on land. Impassable. Drawn as contoured grey plates. |
| **River** | A meandering channel cut right across the map, coast to coast, at any angle. Strong current. |

### How a world is generated

1. Smooth random height patterns are combined. The island shape is warped so coastlines are irregular, and
   the land is pushed down towards the edges.
2. A **strait** always splits the world into **two landmasses** (70% of the time it runs roughly north–south).
   It is deep enough that droughts never close it.
3. If the second landmass is smaller than a quarter of the first, the world is rebuilt from a variation of the
   same seed (up to 5 tries).
4. 36–42% of the map starts as land.
5. Rivers: an 85% chance of one, plus a 55% chance of a second. Each runs coast to coast at a random angle and
   meanders along its length (two overlapping waves plus a little jitter), so splits aren't straight lines.
6. **Food sites** are placed: 300 berry sites on land and 100 algae sites in water (see [food](#7-food)).

The **main landmass** is the biggest piece of land. Any other land counts as an **island** for food and
naming.

The same world number always produces the same starting world, so you can replay a world with a new design.

---

## 7. Food

There are two kinds of food, at fixed sites that regrow after being eaten.

| Food | Where | Placement |
|---|---|---|
| **Berries** (orange) | Land and thicket | 300 sites. More likely on fertile ground, in thickets (most in the narrowest-gap thickets) and on islands. |
| **Algae** (green) | Shallows and rivers | 100 sites, in rivers or sea within 56 px of land. Not in the outer margin. |

**Regrowth.** An eaten site regrows after a time set by its region and the season:

| Speed | Regrowth time |
|---|---|
| Fast | 17–23 s |
| Normal | 20–28 s |
| Slow | 25–33 s |

In winter, all regrowth takes a further 10% longer (`GROW.winter`).

**Regions** used for regrowth:

- **water**: algae sites
- **thicket**
- **island**: land that isn't on the main landmass
- **meadow**: land in the more fertile 45% of the fertility range, shown as darker green
- **plain**: all other land

**What you see:**

- Eaten food fades out over a moment rather than vanishing.
- A regrowing berry is a small ring that fills out, with its leaf appearing at half-grown.
- A regrowing algae site shows as small yellow fronds and turns green when ready.
- When zoomed out, food is drawn as simple dots.

Food on land that floods, or in water that dries up, can't be eaten until the terrain changes back.

---

## 8. Seasons

There are four seasons of 2.5 minutes (150 seconds) each (`SEASON_LEN`), so a year lasts 10 minutes. Seasons change which
regions regrow fast and which world events are likely. The map cross-fades to the new season's colours over
2.5 seconds.

| Season | Plain | Meadow | Thicket | Island | Water | Event weights (flood / drought / quake) | Look |
|---|---|---|---|---|---|---|---|
| **Spring** | fast | fast | slow | normal | normal | 5 / 1 / 3 | Fresh green meadows |
| **Summer** | slow | fast | normal | fast | normal | 1 / 5 / 3 | Plains turn dry and yellow |
| **Autumn** | slow | normal | fast | fast | normal | 3 / 2 / 4 | Olive thickets |
| **Winter** | slow | slow | slow | slow | slow | 4 / 1 / 3 | Snow on the peaks, pale wash |

All of this is in the `SEASONS` table in `js/config.js`.

---

## 9. World events

### Timing

- The first event comes exactly 7 minutes into a run (`EVENTS.first`).
- After that, one comes every 7 minutes (`EVENTS.gap`), with no random variation. A 15-minute run sees two
  events, at 7 and 14 minutes. Events don't line up with seasons: a year is 10 minutes, so each event falls in a
  different season from the one before.
- The **event bar** fills up until the next event. When it is 80% full, a **warning symbol** shows which event
  is coming. An orange symbol with "!" means a major event.

### Which event

- **5%** of events are meteors (`EVENTS.meteor`, about 1 in 20).
- Otherwise the event is picked by the current season's weights (see the table above). Some events are ruled
  out when they would push the world too far:
  - no drought when more than 55% of the map is land
  - no flood when less than 30% is land

  There is no limit on rivers or sea channels: droughts dry them up again.
- **10%** of events are **major** (`EVENTS.major`).

### What each event does

| Event | Normal | Major |
|---|---|---|
| **Flood** | Sea level rises: land falls by 12 percentage points of the map (never below 24%). Low land and its food go underwater. | Land falls by 20 points. |
| **Drought** | Sea level falls: land rises by 12 points (never above 60%). New land appears and islands may join the mainland, but never across the main strait. One river dries up and one sea channel closes, if there are any. | Land rises by 20 points. Two rivers dry up and two sea channels close. |
| **Earthquake** | One new split cuts across the map. It is a river, or 30% of the time a **sea channel**: a wider cut of open sea that land creatures can't cross the way strong swimmers cross a river. | Two new splits, each with its own 30% chance of being a sea channel (so at least one sea channel about half the time). |
| **Meteor** | Hits a random land spot. Kills every creature within 190 px. Leaves a crater: an irregular rock rim with a gap, and a small lake in the middle. | Kills within 280 px and makes a much bigger crater. |

Sizes and chances are in `EVENTS` in `js/config.js` (`shift`, `blast`, `crater`, `splits`, `seaSplit`, `dry`).

A dried-up river or closed sea channel becomes ordinary land straight away, so creatures can walk across it at
once. It leaves a faint sandy **bed** with a dashed edge, tracing where the water was, which fades away over 5
minutes (`EVENTS.dryFade`). Which river or channel dries up is picked at random, including the ones the world
started with.

Each event:

- cross-fades the map over 3 seconds
- plays its own sound effect
- flashes the event bar with its name for 7 seconds
- adds a line to the event log

Land heights never change, only the sea level (and rivers and sea channels cut on top), so the colours of land
that stays above water don't shift.

---

## 10. Speciation and naming

### When a new species forms

Every 5 seconds, each living species is checked. A species can only split if:

- it has at least 20 members
- it is at least 90 seconds old (`SPC.age`)
- at least 110 seconds have passed since it last split (`SPC.cool`)

Two kinds of split are looked for:

1. **Geographic: cut off on separate land.** Members standing on land are grouped by which landmass they are
   on. If the second-biggest group has at least 8 members and differs enough in traits from the biggest group
   (more than `SPC.geo` = 0.18), that is a candidate split.
2. **Ecological: a different way of life.** If there is no geographic split, the members are sorted into the
   two most distinct trait clusters. The clusters must differ by more than `SPC.eco` (0.34) and be clearly
   separate, with the gap between them at least 3.1 times the spread within them (`SPC.ratio`). The smaller
   cluster must have at least 8 members.

The same candidate must hold for **4 checks in a row**, about 20 seconds (`SPC.streak`). Then the smaller group
becomes a new species.

**More species make splitting harder.** Both thresholds are multiplied by 1 + 0.55 × (living species − 1)
(`SPC.extra`). With 2 species alive, splits need 55% more difference, and with 3 alive, 110% more. That keeps
runs to about 0–2 new species per 15 minutes, with rarely more than 3 alive.

**Trait difference** is measured across all seven traits on comparable scales: width, length, speed (each
÷ 10), habitat, colour drift (÷ 60°), and roundness and taper (each × 0.5). Look traits count too, so long
separation alone can eventually be enough.

Species never merge back together.

### Names

- **Genus** comes from your species name: lower-cased, letters only, a trailing "s" and vowels removed, then
  "-us" added. "Blorbs" becomes *Blorbus*.
- The **founding species** is always *primus*.
- A **new species** is named after the trait that most separates it from its parent:

| Name | Meaning |
|---|---|
| *natans* | more aquatic |
| *terrestris* | more land-living |
| *velox* | faster |
| *lentus* | slower |
| *gracilis* | slimmer |
| *magnus* | bigger |
| *minimus* | smaller |
| *rotundus* | rounder |
| *acutus* | more angular |
| *conicus* | more tapered |
| *quadratus* | squarer |

- *insularis* is used first if the new group was cut off on an island (not the main landmass).
- If those names are all taken, the fallbacks are *novus*, *alter*, *tertius* and *remotus*.

A notification welcomes the new species and says how it differs, for example "Welcome the first Blorbus natans,
who is more at home in water than Blorbus primus. It diverged after being cut off on separate land."

---

## 11. Achievements

Achievements are earned per run and reset with each new run. They are checked every 2 seconds.

| Achievement | How to earn it |
|---|---|
| First Year | Survive all four seasons (10 minutes) |
| Old Lineage | Lineage lasts 20 minutes |
| Ancient Line | Lineage lasts 45 minutes |
| Dynasty | Reach generation 30 |
| Deep Time | Reach generation 80 |
| Weathered | Survive 8 world events |
| Against the Odds | Still going 60 s after a major world event |
| Impact Survivor | Recover to 40 creatures after a meteor kills 5 or more |
| Taking to the Water | A species' average habitat shifts 40 points towards water |
| Coming Ashore | A species' average habitat shifts 40 points towards land |
| Squeezer | A species slims to fit 10 px gaps (only if it started too wide) |
| New Look | Average colour drifts 60° from the original |
| Branching Out | Witness a new species form |
| Crowded Tree | Three species alive at once |
| Tree of Life | Six species over one run |

---

## 12. The screen: controls, bars and inspector

### Top left: status

Your species' colour, name and genus, then: creatures alive · species alive · highest generation · time
(· paused / extinct).

### Top: controls

| Button | What it does |
|---|---|
| Play / pause | Pauses the simulation. |
| 1× / 2× / 4× | Simulation speed. |
| Speaker | Sound on or off. |
| Notepad | **Event log**: the last 50 events, seasons, achievements and new species, with times. |
| Medal | **Achievements** for this run, with a count. |
| Cog | **Settings**: *New species…* (opens the creator and pauses the run), *Ambient notes* on/off, *Beat when zoomed in* on/off. |

### Top right: season and event bars

- The **season bar** fills over the season and is tinted the season's colour.
- The **event bar** fills until the next world event. The warning symbol appears near the end.
- The **i** buttons open quick reference tables for seasons and events.

### Notifications

New species, extinctions and achievements pop up below the status bar for 9 seconds. Up to 4 stack at once.

### Bottom right: inspector

Collapse or expand it with the arrow. It has three tabs.

- **Traits**
  - **Map colours**: colour creatures by their own body colour, or by species tag.
  - **Chart**: pick Population, Speed, Habitat, Narrowest, Roundness or Taper. One line per species. For
    population, a thin black line shows the total. The dashed line is the starting value.
  - **Table**: compares the released design with the three biggest living species. Values noticeably up or
    down from the release are highlighted. Body traits and look traits are grouped separately.
- **Specimen**: tap any creature on the map to see its:
  - generation, parent, offspring and meals
  - energy and burn rate, and age
  - size and which thicket gaps it fits
  - land and water speed, habitat and range
  - look

  The **Follow** button keeps the camera on it. The selected creature has orange corner brackets and a dashed
  line to its food target.
- **World**: world number, current season and time left, sea cover, time to the next event, and a map key.

### Map

- **Drag** to pan.
- **Scroll or pinch** to zoom. You can zoom out to a little beyond the whole world and in to 6×.
- A **scale bar** under the status bar shows distance in px.
- Above 2.2× zoom, each creature shows a small **energy bar**, which turns brown below 25%.

---

## 13. End of a run: summary, family tree, replay

When the last creature dies, the summary shows:

- **Time alive, generations, peak population, ever born, species, achievements.**
- **How they died**: a bar split by starvation, old age and meteor strike.
- **Trait table**: the released design compared with the last survivors, split into "shaped by the world"
  and "drifted by chance".
- **Family tree**: every species as a line through time. Branches show where each split from its parent. A
  thick line means still alive at the end, and a tick marks extinction.
- **Watch replay**: the whole run played back at 12 recorded moments per second. A moment is recorded each
  second of game time, and the gap between recordings doubles on very long runs to save memory.
- **New species, same world** or **New species, new world**.
- **Past lineages**: your last 10 runs.

Past runs (up to 30) are saved **in your browser on that device**, not online. Clearing browser data, or
playing on another device or browser, starts the list fresh.

---

## 14. Sound

All sound is generated live in the browser. There are no audio files.

| Sound | Details |
|---|---|
| **Ambient notes** | Every 1.2 s, a 60% chance of one soft note from A3 B3 D4 E4 G4 A4 B4, sometimes with a quiet octave echo. Plays while a run is going. |
| **Creature sounds** | A soft tick when eating, a quiet two-note rise for a birth, a low note for a death. Only for creatures on screen when zoomed in to 1.8× or more, or the selected creature. At most one every 0.07 s. |
| **Achievement / new species** | A three-note chime. |
| **World events** | Each has its own effect, louder and longer when major: flood (rushing water and falling notes), drought (dry hiss and rising notes), earthquake (low rumble with a shudder), meteor (whistle then a boom). |
| **Zoom beat** | A drum pattern at 50 bpm in semiquavers (one step every 0.3 s): kick, hat, hat, hat, snare, hat, hat, hat. It fades in from 1.6× zoom and reaches full volume at 3.2×. |

---

## 15. How things are drawn

The look is a scientific **field notebook / survey map**.

- **Map.** Coastlines and contours are smooth vector lines, not pixel steps.
  - The sea is shown in four depth bands. Land is pale with darker fertile meadows. Thickets are green with
    dots, and denser dots mean narrower gaps. Rock is grey contoured plates. Rivers are pale blue with a
    blue-grey edge. Sea channels are drawn like the shallowest sea. Dried-up rivers and closed sea channels
    leave a sandy bed with a dashed edge that fades out.
  - Land colours are measured against the world's original heights, so floods and droughts don't recolour the
    land that remains.
- **Detail.** When zoomed out, a pre-drawn image of the map is used, plus a lower-resolution copy when very far
  out (`TS`, `LO`). When zoomed in, the visible part is redrawn sharply.
- **Creatures** are seen from above.
  - Body: a pale body with an ink outline, an eye pair at the front, and legs as short ink bars all round.
  - Legs: longer bars mean more land speed, and wider, shorter bars mean a creature that leans towards water.
  - In water, the back half is drawn as submerged and a small wake trails behind.
- **Effects.** A coloured ring for a birth, a grey cross for a death, an orange shockwave for a meteor.

---

## 16. Design decisions and why

These were deliberate choices made while building the game. They are recorded here so they don't get undone by
accident.

- **No hard population cap.** Crowding lowers breeding instead, so numbers settle naturally around 40–100 and
  can briefly go over.
- **Body traits are selected; look traits drift.** Colour, roundness and taper do nothing for survival, so
  their change shows pure chance and how long groups have been apart.
- **Legs are fixed.** They are a choice you make, not something that evolves.
- **Two landmasses, always.** The permanent strait gives geographic speciation a real chance on every world.
- **The sea edge is always water.** This avoids corner traps and odd edge behaviour.
- **Species don't merge back.** Instead, splitting gets harder as more species are alive.
- **Meteors are rare (about 1 in 20 events)** and dramatic.
- **There are no player tools during a run.** You design, then watch.
- **Max 3 creatures per food.** This stops crowds piling onto one berry.
- **Colours come from the Okabe–Ito palette** for colour-blind accessibility.
- **The music is original.** The ambient note set and the zoom beat were written for the game.

---

## 17. Changing the balance

Every number worth tuning is in **`js/config.js`**, with a comment on each. You can edit it in any text
editor, or directly on GitHub with the pencil icon. Then reload the game.

| To change… | Edit |
|---|---|
| Starting creatures | `START` |
| Lifespan / breeding age | `LIFE` / `MATURE` |
| Energy per food | `FOOD` |
| How much offspring vary | `VAR` |
| Typical population level | `CRW` (bigger `half` means more crowding allowed, so larger populations) |
| How fast food regrows | `GROW` (smaller numbers mean faster regrowth and more creatures) |
| Season length, foods and event odds per season | `SEASON_LEN`, `SEASONS` |
| Event frequency, meteor and major odds | `EVENTS` |
| How easily species split | `SPC` (bigger `geo`/`eco` means rarer splits, bigger `extra` means fewer species at once) |
| River-crossing speed | `RIVER` |
| How far ahead creatures plan | `MAXT` |

To see the effect of a change across many runs, use the balance test below.

---

## 18. Code layout

Plain HTML, CSS and JavaScript with no libraries. The scripts load in this order and share one scope.

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

Short names you'll see in the code:

| Name | Means |
|---|---|
| `S` | The current run's state |
| `D` | The design being edited in the creator |
| `c` | A creature |
| `f` | A food site |
| `world` | The generated map |
| `cam` | The camera |

In the code, achievements are called "badges".

---

## 19. Tests and building

### Tests

Both tests need Python 3 and Playwright:

```
pip install playwright
playwright install chromium
python3 tests/smoke.py
python3 tests/scenarios.py 6 15
```

- **`smoke.py`** clicks through every feature and prints PASS or FAIL.
- **`scenarios.py [runs] [minutes]`** runs full simulations as fast as possible across six test designs and
  reports population, seasonal swing, extinctions and new species.

  The current settings aim for:
  - populations mostly between 40 and 100
  - gentle seasonal swings
  - 0 to 2 new species per 15 minutes, with at most 3 alive at once

  Results vary from run to run, so compare batches rather than single runs.

The tests use `window.EvoQuestDebug`, a small read-only hook at the end of `js/main.js`. The bundled file leaves
it out.

### Single-file build

`python3 tools/build.py` writes `dist/evoquest.html`: the whole game in one file you can share or host
anywhere. `dist/` isn't stored in the repo, so run the build again whenever you need a fresh copy.
