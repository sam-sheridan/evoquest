# EvoQuest

Design a species, release 25 of them onto a randomly generated island world, and watch the world decide what
they become. Food, terrain, seasons and world events shape their bodies over generations. Groups that get cut
off, or that take up a different way of life, can split into new species.

**Play online:** https://sam-sheridan.github.io/evoquest/ (this works once GitHub Pages is switched on for the
repo)

**Play from a download:** open `index.html` in a browser. Nothing to install, nothing to build.

**Leaving the tab:** a run keeps going while its tab is open in the background on a computer. Browsers only run a
hidden tab's timers about once a second (less often after a few minutes), so the game catches up on the time that
has passed each time, up to 15 seconds per catch-up (`BG_MAX`). Phones freeze a page in the background, so there
the run pauses until you come back. Closing the tab ends the run.

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
2. **Release.** 25 creatures (`START`) appear together on the main landmass. The release spot is chosen to
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
| **Tail** | Body trait, none (a land creature) to full (a water creature). A bigger tail swims faster but walks slower, and lets the creature go further from shore but less far from water. You can see it: the back of the body curves into a longer tail. |
| **Mouth** | Body trait, from claw to straw. A claw cracks nuts quickly; a straw gets more from algae. The label names the shape (Claw, Slim claw, Tweezers, Prongs, Straw) and the line under the sliders gives the nut-cracking time and algae bonus. |
| **Roundness** | Look trait, 0 to 1. Softens the body's corners, from boxy to round. |
| **Colour** | One of the 7 Okabe–Ito colours (a palette designed to stay distinguishable for colour-blind players). |
| **World** | A new random world, the current world, or any world from a past run. Each world has a number (its seed) and the same number always builds the same world. |
| **Randomise** | Random name (two made-up syllables from a list of 40, sometimes with an "s": 3,200 possible names, or 1,600 different Latin genus names, since the genus drops a trailing "s"), body (mouth included), colour and shape. |
| **Release 25 specimens** | Starts the run. |
| **Back to game** | Only shown if you opened the creator during a live run. Returns without changing anything. |

The **preview** shows the creature at 7× zoom with a 10 px scale bar. Every few seconds it acts out eating, so
you can see its mouth snap. It also shows the body size in pixels
and which thicket gaps it fits through. The **chips** under it show:

- land speed and water speed in px/s
- whether it can cross rivers
- energy capacity and how fast it burns energy while walking
- reach (how close it must get to food to eat it)

The creator **starts randomised**: every time it opens, it is as if *Randomise* had been pressed, including a new
name. The only exception is **Revisit world** on a past lineage, which brings back that run's design.

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
| Speed (`spd`) | 1–10 | Base speed before size and tail are applied. |
| Tail (`hab`) | 0–1 | 0 = no tail, fully land; 1 = full tail, fully water. (The code calls it `hab` because it began as an invisible "habitat" setting; now you can see it as the tail.) |
| Mouth (`mth`) | 0–1 | 0 = claw, 1 = straw (see [mouths](#mouths)). |

From these, the game works out:

- **Size** = √(body width × body length) ÷ 17. Default Blorbs are about 0.9.
- **Narrowest side** = the smaller of body width and body length. This decides which thicket gaps it fits
  through (10, 13 or 16 px).
- **Base speed** = speed × 6 × 1.6 ÷ (0.6 + size). Big bodies are slower.
- **Land speed** = base × (1 − 0.85 × tail).
- **Water speed** = base × (0.15 + 0.85 × tail).
  A creature with no tail still swims at 15% of its base speed. One with a full tail walks at 15%.
- **Range.** Only a creature with no tail (0%) goes anywhere on land, and only one with a full tail (100%)
  anywhere in water. Everything in between has two limits (`HAB.range` = 200):
  - it swims at most 200 × (tail ÷ (1 − tail))² px from shore
  - it walks at most 200 × ((1 − tail) ÷ tail)² px from water

  | Tail | Swims from shore | Walks from water |
  |---|---|---|
  | 0% | never enters water | anywhere |
  | 20% | 13 px | 3200 px (anywhere, in practice) |
  | 30% | 37 px | 1089 px |
  | 40% | 89 px | 450 px |
  | 50% | 200 px | 200 px |
  | 60% | 450 px | 89 px |
  | 80% | 3200 px | 13 px |
  | 100% | anywhere | never leaves water |

  So a 50% creature lives along coasts and lakesides, and being in between is no longer a free pass.
- **Food energy** doesn't depend on the tail; the mouth decides it (see [mouths](#mouths)).
- **River crossing.** Needs water speed of at least 14 px/s (`RIVER`). The "Crosses rivers" chip also needs
  the creature to be willing to swim at least 16 px from shore (a tail of about 22% or more).
- **Reach** = half the longest side + 4 px.
- **Energy capacity** = 30 + 25 × size.

### Mouths

Every creature has one mouthpart at the front, which changes shape gradually along the mouth trait:

| Mouth | Look | Cracks a nut in | Energy from algae |
|---|---|---|---|
| 0 (Claw) | a stout claw that snaps shut | 0.5 s | × 0.75 |
| 0.25 (Slim claw) | a slimmer claw | 2.4 s | × 0.88 |
| 0.5 (Tweezers) | straighter jaws that stay a little open | 4.3 s | × 1 |
| 0.75 (Prongs) | two thin prongs with a small gap | 6.1 s | × 1.13 |
| 1 (Straw) | the prongs closed into one tube that flares slightly at the end | 8 s | × 1.25 |

- **Nuts** (`MOUTH.nut`) give 1.5 times the energy of a berry, but the creature must crack them first: from
  0.5 s with a claw to 8 s with a straw (`MOUTH.crack`), on top of the usual pause after eating. When choosing
  food, a creature counts that cracking time as extra travel time, so straw mouths mostly leave nuts alone.
- **Algae** gives 1 + 0.25 × (2 × mouth − 1) times its usual energy (`MOUTH.algae`): a straw gets 25% more, a
  claw 25% less.
- **Berries** suit any mouth.

So a world full of thickets favours claws and a watery world favours straws, and the mouth evolves like any other
body trait. Between the two ends, the claw stretches into tweezers, the tweezers straighten into prongs, and from
0.75 the prongs close together into a single straw with a slight trumpet at the end. The mouth is always drawn in
black ink. The jaws snap quickly
while the creature eats and open and close gently the rest of the time. Mouths, like eyes and legs, are only drawn
when zoomed in.

Designs from before mouths existed (saved past lineages) start with a mouth of 0.5.

### Tails

The tail is the visible form of the old habitat setting. The body's straight sides curve smoothly in to a slim
tail that tapers to a point, with no corner where body and tail meet. Only the slim part sways, starting gently
where the curve-in ends. A bigger tail is longer (up to
1.1 times the body's length, `TAIL.len`) and a little broader. With no tail the back of the body is rounded off
like the front. Zoomed in, the tail sways: strongly while swimming, gently while walking. In water it is drawn
under the surface with the back of the body, and the wake starts behind its tip.

The default design (width 4, length 4.5, speed 5, tail 20%) walks at about 26 px/s, swims at about 10 px/s,
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

### Inheritance

Each trait on each newborn independently has a **30% chance of copying the parent exactly**. Otherwise it
moves by a random amount up to:

| Trait | Maximum change per generation |
|---|---|
| Width, length, speed | ±0.8 (that is 0.5 × `VAR`, and `VAR` = 1.6) |
| Tail, mouth | ±8 percentage points (0.05 × `VAR`) |
| Hue | ±6° |
| Lightness | ±2.5 |
| Roundness | ±0.05 |

Traits are then held inside their allowed ranges. `VAR` scales body-trait variation only.

---

## 4. Energy, eating, breeding and death

### Energy

- **Burn per second** = 0.4 × size + 0.9 × size × (current speed ÷ 30)², plus temperature, and more in deep
  water.
  - Standing still costs a little; moving fast costs a lot, because of the squared term.
  - Big creatures pay more for both.
  - **Cold** (see [temperature](#temperature)): keeping warm costs up to 0.35 energy per second (`TEMP.coldCost`)
    for a mid-sized creature, scaled by 1.4 − 0.6 × size, so small creatures pay most (about 1.1 times as much)
    and big ones least (about 0.65 times).
  - **Heat**: cooling down costs up to 0.3 × size² per second (`TEMP.heatCost`), so big creatures pay most.
  - **Deep water**: the whole burn is multiplied by 1 + 0.8 × (1 − tail) (`SEA.deepCost`). A creature with a
    20% tail burns 64% more there; one with a full tail burns nothing extra.
  - The creator shows the burn when walking, without temperature or deep water.
- **Food**: a berry gives 8 energy (`FOOD`), a nut 1.5 times that, and algae 6–10 depending on the mouth (see
  [mouths](#mouths)). Energy never goes over the creature's capacity.
- After eating, a creature **rests** for 0.8–1.4 seconds (burning only the standing cost), plus the time to crack
  it if it was a nut, then plans its next meal.

### Breeding

A creature may breed when it eats **and** all of these are true:

- it is at least 15 seconds old (`MATURE`)
- its energy after eating is at least 85% of capacity
- it isn't already about to give birth
- it passes the **crowding roll**

**Crowding roll:** count the other creatures within 80 px (`CRW.r`), stopping at 12. The chance of breeding
is 1 ÷ (1 + (neighbours ÷ 2)²) (`CRW.half` = 2, `CRW.pow` = 2):

| Neighbours within 80 px | Chance to breed |
|---|---|
| 0 | 100% |
| 1 | 80% |
| 2 | 50% |
| 3 | 31% |
| 5 | 14% |
| 10 | 4% |

This, together with how much food each area grows, is what keeps populations in range without a hard limit.
Crowded areas stop breeding, and quieter areas keep going. Because creatures keep to their home ranges, local
groups are denser than before, so crowding allows a little more than it used to.

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
| Old age | 90 seconds old (`LIFE`). From 85 seconds old creatures slow down steadily, coming to a halt at 90 (`OLD`). |
| Meteor strike | Within the blast radius of a meteor (see [events](#9-world-events)). |

A species is marked extinct when it has no members at a stats check (every 2 seconds). The run ends when no
creatures are left at all.

---

## 5. How creatures move and find food

### Where a creature is allowed to be

| Terrain | Allowed if… | Speed there |
|---|---|---|
| Land | It is within its walking range of water (always true for a tail of 50% or less). | Land speed |
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

- It only plans up to **22 seconds of travel** ahead (`MAXT`). If no food is free in range (say every nearby
  piece is regrowing or already has three creatures heading for it), it heads for the nearest such food and waits
  there, looking again every second or two. Only if there is no food at all in range does it wander.
- **Home range.** Every creature has a **home**: for the founders, a spot near where they were released; for everyone else,
  a spot up to 100 px from their parent's home (`HOME.disperse`). The founders' homes are spread up to 450 px
  around the release spot (`HOME.founders`), so they don't all compete for one patch of food. Food more than 250 px from home (`HOME.r`)
  counts as 6 extra seconds of travel for every further 250 px (`HOME.pull`), so creatures prefer food near home.
  Below half energy (`HOME.starving`) the range widens, up to four times as far when nearly empty
  (`HOME.hunger`), so a hungry creature roams rather than starves. Wanderers drift back towards home once they
  are outside their range, or once they stray into deep water (unless fully aquatic).

  This is why a population **spreads slowly**, over generations, instead of every creature roaming the whole
  map: only about a quarter of the land is explored in the first 10 minutes. It also keeps groups in different
  areas apart, which helps different species form in different regions.
- **No more than 3 creatures chase the same food.** Each creature already heading for a piece of food adds a
  2.5-second penalty to it, so others prefer free food nearby.
- A creature gets a 1.5-second bonus for sticking with its current target, which stops it flip-flopping.
- A nut counts the time this creature would take to crack it as extra travel (see [mouths](#mouths)).
- The route is then smoothed into straight lines wherever the way is clear.

### Moving

- Creatures turn at most 3 radians a second and move at half speed while turning sharply.
- Old creatures slow down: from 85 seconds old their speed falls steadily, coming to a halt at 90 (`OLD`).
- If the way ahead is blocked, a creature tries angles to either side before turning around.
- Wanderers turn back towards the middle of the map near its oval edge.

### Reaching food

When several creatures reach the same food in the same moment, **the biggest one gets it**. The others
re-plan at once.

---

## 6. The world

### Size and grid

- The world is a grid of **282 × 197 cells**, each 16 px square: 4512 × 3152 px in total.
- Land is kept inside an **oval**, with a **10-cell sea margin** (`EDGE`) inside the oval's edge. The edge is
  roughened by the same warp as the coastline, so even after several droughts the land grows into a natural,
  rounded shape rather than filling out to a rectangle.

### Terrain types

| Type | How it is made |
|---|---|
| **Sea** | Everything below sea level: a shallow shelf near coasts and over banks, and deep water beyond (see [sea depth](#sea-depth)). |
| **Land** | Everything above sea level. |
| **Thicket** | The densest part of a "thicket" noise pattern, on land (the share is set by the world type), weighted by region (see below). Each thicket cell has a gap width of 10, 13 or 16 px (roughly a third each, narrower in thicket country). Denser dots on the map mean narrower gaps. |
| **Rock** | The top part of a "rock" noise pattern, on land (the share is set by the world type), weighted by region. Impassable. Drawn as contoured grey plates. |
| **River** | A meandering channel cut right across the map, coast to coast, at any angle. Strong current. |

### World types and shapes

Each world secretly rolls a **type** from its world number. The player never sees it: the point is that you have
no say in the world, and different worlds favour different designs. All the numbers are in `WORLD_TYPES`.

| Type | How often | Land at start | Strait | Thicket | Rock | Food (berries / algae) | Temperature |
|---|---|---|---|---|---|---|---|
| **Classic** | 3 in 10 | 31–35% | yes | 20% of land | 10% | 375 / 125 | normal |
| **Archipelago** | 2 in 10 | 20–24%, broken into many islands, no strait or sea channels | no | 20% | 6% | 250 / 250 | a little warmer |
| **Supercontinent** | 2 in 10 | 42–46% | no | 18% | 8% | 440 / 60 | normal |
| **Highlands** | 1.5 in 10 | 33–37% | yes | 8% | 28% | 375 / 125 | colder |
| **Forest** | 1.5 in 10 | 32–36% | yes | 45% | 5% | 400 / 100 | normal |

Rivers: an 85% chance of one and a 55% chance of a second, except archipelagos (30%, never two), supercontinents
(always one, 70% a second) and highlands (85%, 30%). Supercontinents have slightly fewer wetlands, highlands
noticeably fewer.

Each world also rolls a **shape** (`SHAPES`), separately from its type:

| Shape | How often | What it looks like |
|---|---|---|
| **Oval** | 4 in 7 | Land in the middle of the oval, as before. |
| **Lagoon** | 1.5 in 7 | A broad hollow in the middle leaves the land as a ring around a central sea. |
| **Crescent** | 1.5 in 7 | A bigger hollow pushed off to one side, so the land curves round a bay. |

### How a world is generated

1. Smooth random height patterns are combined. The island shape is warped so coastlines are irregular, and
   the land is pushed down towards the edges. Archipelagos blend in a finer pattern and a weaker fall-off, which
   breaks the land into islands. Lagoons and crescents add their hollow.
2. In types with a strait, a **strait** splits the world into **two landmasses** at the start (70% of the time it
   runs roughly north–south). It is only moderately deep (`LAND.strait`), so a big drought, or several in a row,
   can dry it up and join the two landmasses.
3. If a world with a strait has a second landmass smaller than a quarter of the first (or under 1100 cells), the
   world is rebuilt from a variation of the same seed (up to 5 tries).
4. **Relief.** Ridged hills and valleys are added to the land (`RELIEF`). They grow with height above the starting
   sea level, so coasts stay where they are. High ground is cold (see [temperature](#temperature)).
5. **Regions.** Broad, slowly varying patterns give each area its own character (`REGIONS.strength` = 1.3):
   - **thicket country**: thickets cluster here, with the narrowest gaps
   - **rocky uplands**: rock clusters here
   - **low wetlands**: the land is flattened to just above the starting sea level, with hollows that hold lakes.
     Floods drown these areas first and droughts drain them first, while uplands barely change.

   Everywhere else is more open. Different regions favour different bodies (small and slim in thickets,
   swimmers in wetlands), which is meant to encourage different species in different parts of the map.
6. Thicket and rock are set as shares of the starting land, so each type gets the amount it asks for.
7. Rivers (chances above). Each runs coast to coast at a random angle and meanders along its length (two
   overlapping waves plus a little jitter), so splits aren't straight lines.
8. **Food sites** are placed, in the numbers the world type sets (see [food](#7-food)).

### Sea depth

The sea has a **shallow shelf** and **deep water** beyond it. Depth blends distance from shore (two thirds) with
the sea floor's depth (one third), each measured as a rank among sea cells, so shelves follow the coasts and reach
out over offshore banks. The shallowest 30% of the sea is shelf (`SEA.shelf`). It is worked out again after
every flood, drought or earthquake.

- **Algae** grows only on the shelf.
- **Deep water** costs extra energy for anything that isn't fully aquatic (see [energy](#energy)), so it is a real
  barrier for land creatures and amphibians.

### Temperature

Temperature comes from **height**: the highest land is coldest and the lowest warmest. Each piece of land is
ranked against the world's original land, so every world has the full range, whatever its relief. Water is mild.

- **Seasons shift it** (`TEMP.season`): no change in spring and autumn, warmer in summer (+0.12), colder in winter
  (−0.15). The cold creeps down the hills in winter and pulls back up in summer.
- **World types shift it too**: highlands are colder overall and archipelagos a little warmer.
- **Cold** is below 0.3 (`TEMP.cold`) and **hot** above 0.8 (`TEMP.hot`), on a scale where the highest land is 0
  and the lowest 1. Cold and heat cost energy (see [energy](#energy)): small bodies suffer in the cold and big
  bodies in the heat, so the hills and the lowlands of one world pull a species in different directions. That
  is how geographical speciation happens in nature too.
- **On the map**, cold land gets a frosty blue wash and hot land a faint warm one, and the season decides how
  far each reaches.

The **main landmass** is the biggest piece of land. Any other land counts as an **island** for food and
naming.

The same world number always produces the same starting world, so you can replay a world with a new design.

---

## 7. Food

There are three kinds of food, at fixed sites that regrow after being eaten.

| Food | Where | Placement |
|---|---|---|
| **Berries** (orange) | Land and thicket | 250–440 sites (nuts included), depending on the world type. More likely on fertile ground, in thickets (most in the narrowest-gap thickets) and on islands. |
| **Nuts** (acorns) | Thicket | Half of the food sites in thickets grow nuts instead of berries (`MOUTH.share`). Richer than berries, but quick to eat only with a claw (see [mouths](#mouths)). |
| **Algae** (green) | Shallow shelf and rivers | 60–250 sites, depending on the world type, in rivers or on the sea's shallow shelf. Not in the outer margin. |

**Regrowth.** An eaten site regrows after a time set by its region and the season:

| Speed | Regrowth time |
|---|---|
| Fast | 16–21.5 s |
| Normal | 19–26.5 s |
| Slow | 23.5–31 s |

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
- A regrowing nut is a small, faint acorn that grows and darkens.
- A regrowing algae site shows as small yellow fronds and turns green when ready.
- When zoomed out, food is drawn as simple dots.

**Floods and droughts wipe food out.** Berries and nuts on land that floods, algae on water that dries up, and algae left
in deep water when the shelf moves are wiped out: they vanish and can't be eaten. When the ground suits them again
(say a drought after a flood), they start regrowing from scratch rather than reappearing fully grown.

---

## 8. Seasons

There are four seasons of 2.5 minutes (150 seconds) each (`SEASON_LEN`), so a year lasts 10 minutes. Seasons change which
regions regrow fast, which world events are likely, and the [temperature](#temperature). The map cross-fades to the new season's colours over
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
- There is **no timer** on screen. For the last 7 seconds before an event (`EVENTS.warn`), the **world event
  sign** (bottom left) flashes orange with the coming event's symbol, then stays bright orange for 2 seconds once
  it happens (`EVENTS.show`). Major events look the same there.

### Which event

- **5%** of events are meteors (`EVENTS.meteor`, about 1 in 20).
- Otherwise the event is picked by the current season's weights (see the table above). Some events are ruled
  out when they would push the world too far:
  - no drought when land is more than 12 points above where the world started (`LAND.noDrought`)
  - no flood when land is more than 12 points below where it started (`LAND.noFlood`)

  So an archipelago starting at 20% land can grow to about 32% (a classic world's amount) and a supercontinent
  can shrink to about 32% too: world types can turn into one another.

  When a drought is ruled out, its share of the odds goes to floods, and when a flood is ruled out, its share
  goes to droughts. (Earlier, those shares went mostly to earthquakes, which grew to about half of all events.)

  There is no limit on rivers or sea channels: droughts dry them up again, and the more there are, the more each
  drought undoes, so the map doesn't keep breaking up over hours of play.
- **10%** of events are **major** (`EVENTS.major`).

### What each event does

| Event | Normal | Major |
|---|---|---|
| **Flood** | Sea level rises: land falls by 12 percentage points of the map (never more than 18 below where the world started, `LAND.min`). Low land and its food go underwater. Every river and sea channel widens by 35%, and a river that reaches 2.6 cells wide becomes a **sea channel** (`EVENTS.widen`, `toSea`). | Land falls by 20 points, and rivers and sea channels widen by 60%. |
| **Drought** | Sea level falls: land rises by 12 points (never more than 18 above where it started, `LAND.max`). New land appears and islands may join the mainland, and big droughts can even close the main strait. A quarter of the rivers dry up and a quarter of the sea channels close (at least one of each, if there are any). The rest narrow by the same share a flood widens them, but never below the width they started at; a sea channel that began as a river turns back into one when it narrows below 2.6 cells. | Land rises by 20 points. Half the rivers dry up and half the sea channels close (at least two of each), and the rest narrow by the share a major flood widens them. |
| **Earthquake** | One new split cuts across the map. It is a river, or 30% of the time a **sea channel**: a wider cut of open sea that land creatures can't cross the way strong swimmers cross a river. | Two new splits, each with its own 30% chance of being a sea channel (so at least one sea channel about half the time). |
| **Meteor** | Hits a random land spot. Kills every creature within 190 px. Leaves a crater: an irregular rock rim with a gap, and a small lake in the middle. | Kills within 280 px and makes a much bigger crater. |

Sizes and chances are in `EVENTS` in `js/config.js` (`shift`, `blast`, `crater`, `splits`, `seaSplit`, `dry`,
`dryShare`).

A dried-up river or closed sea channel turns straight back into ordinary land, leaving no trace, so creatures can
walk across it at once. Which river or channel dries up is picked at random, including the ones the world started
with.

Each event:

- cross-fades the map over 3 seconds
- earthquakes shake the view for 1.6 seconds (major: 2.2, harder), and meteor strikes give it a short jolt
  one second after the strike, with the boom of the impact (`SHAKE`); there is no shake when the device is set
  to reduce motion
- plays its own sound effect
- turns the world event sign bright orange with the event's symbol for 2 seconds (after 7 seconds of flashing
  beforehand)
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
   (more than `SPC.geo` = 0.22), that is a candidate split.
2. **Ecological: a different way of life.** If there is no geographic split, the members are sorted into the
   two most distinct trait clusters. The clusters must differ by more than `SPC.eco` (0.4) and be clearly
   separate, with the gap between them at least 3.1 times the spread within them (`SPC.ratio`). The smaller
   cluster must have at least 8 members.

The same candidate must hold for **4 checks in a row**, about 20 seconds (`SPC.streak`). Then the smaller group
becomes a new species.

**More species make splitting harder.** Both thresholds are multiplied by 1 + 0.55 × (living species − 1)
(`SPC.extra`). With 2 species alive, splits need 55% more difference, and with 3 alive, 110% more. That keeps
runs to about 0–2 new species per 15 minutes, with rarely more than 3 alive.

**Trait difference** is measured across eight traits on comparable scales: width, length, speed (each
÷ 10), tail, mouth (× 0.6, `MOUTH_SPLIT`), colour drift (÷ 60°), and roundness (× 0.5). Look traits count too, so long
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
| *sorbens* | a more straw-like mouth ("sipping") |
| *chelifer* | a more claw-like mouth ("claw-bearing") |
| *velox* | faster |
| *lentus* | slower |
| *gracilis* | slimmer |
| *magnus* | bigger |
| *minimus* | smaller |
| *rotundus* | rounder |
| *acutus* | more angular |

- *insularis* is used first if the new group was cut off on an island (not the main landmass).
- If those names are all taken, the fallbacks are *novus*, *alter*, *tertius* and *remotus*.

A notification headed **"A new species has formed!"** welcomes it with its biggest change from its parent, always
put as a strength: for example "Welcome the first Blorbus natans, who is more at home in water." A species that
became slower is "slower but thriftier with energy", one whose mouth moved towards a claw is "better at cracking
nuts with its claw" (or towards a straw, "better at sipping algae through its straw-like mouth"), and one that lost the ability to cross rivers is "more settled
on dry land". The event log keeps the same line.

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
| Taking to the Water | A species' average tail grows by 40 points |
| Coming Ashore | A species' average tail shrinks by 40 points |
| Nutcracker | A species' average mouth shifts 40 points towards a claw |
| Sipper | A species' average mouth shifts 40 points towards a straw |
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
| Fast forward (⏩) | Runs the game at 4×. It works like a battery holding up to 20 real seconds (`FAST`): it drains while on, switches itself off when empty, and refills while off, from empty to full in 2 minutes. Press it to start and press again to stop; it can be started whenever at least a second is stored. A ring round the icon shows the charge; hover to see how much is stored. It is greyed out while a testing speed above 1× is set. |
| Notepad | **Event log**: the last 50 events, seasons, achievements and new species, with times. |
| Medal | **Achievements** for this run, with a count. |
| Cog | **Settings**: *New species…* (opens the creator and pauses the run), *Sound* on/off (all sound: ambient notes, creature sounds, event effects and the zoomed-in beat). **Testing: speed** sets 1×, 2×, 4× or 10×, handy for checking things quickly. **Testing** event buttons fire a flood, drought, earthquake or meteor straight away, normal or major (the *Major* toggle). They always do exactly what they say, even past the usual land limits, and don't move the next scheduled event (which kind it will be is chosen again, since the land may have changed). |

### Bottom left: season clock, temperature and world event sign

- A small **clock** split into four quarters, one per season in its colour (the current one stronger), with a
  hand that goes round once a year.
- The current season's **symbol and name**: a flower for spring, sun for summer, leaf for autumn, snowflake for
  winter.
- A **thermometer** for the whole world's temperature this season: the season's shift plus the world type's
  offset, around a mild middle. Hover over it to see it in words (cold, cool, mild, warm or hot). High ground is always colder than this, and
  lowland warmer (see [temperature](#temperature)).
- **Click it** for a quick reference to seasons.
- Beside it, in its own square, the **world event sign**: a warning triangle with rounded corners and "!". For the
  last 7 seconds before an event, the "!" changes to the coming event's symbol (waves, sun, jagged line or falling
  rock) and the triangle flashes orange; once the event happens it stays bright orange for 2 seconds, then goes back
  to "!". Major events look the same. Click it for a quick reference to events.
- On narrow screens, an expanded inspector covers them.

### Notifications

New species, extinctions and achievements pop up below the status bar for 9 seconds. Up to 4 stack at once.

### Bottom right: inspector

Collapse or expand it with the arrow. It has three tabs.

- **Traits**
  - **Map colours**: colour creatures by their own body colour, or by species tag.
  - **Chart**: pick Population, Speed, Tail, Mouth (as % of the way to a straw), Narrowest or Roundness. One line per species. For
    population, a thin black line shows the total. The dashed line is the starting value. A chart shows at most
    the last 20 minutes (`CHART_SPAN`). After that a **slider** appears under it: drag it left to look back
    through earlier time, and right to the end to follow the present again.
  - **Table**: compares the released design with the three biggest living species. Values noticeably up or
    down from the release are highlighted. Body traits and look traits are grouped separately.
- **Specimen**: tap any creature on the map to select it. The camera follows it automatically (dragging the map
  stops following). The tab shows its:
  - generation, parent, offspring and meals
  - energy and burn rate, and age
  - size and which thicket gaps it fits
  - land and water speed, tail and range
  - mouth, and how it feeds (how long it takes to crack a nut, and how much it gets from algae)
  - look

  The selected creature has orange corner brackets and a dashed line to its food target.

  **Control** lets you steer it with the **arrow keys** (keyboard only). The button turns black while you are in
  control; press it again to let go. Everything else stays the same: its
  speed, the ground it can and can't enter, energy, ageing, its 90-second lifespan and breeding. It moves only
  while a key is held and stands still otherwise (burning just its resting energy). It eats any food it reaches,
  then rests as usual before you can move it again. Pressing into ground it can't enter makes its corner brackets
  bump. The dashed food line is hidden while you control it. Control ends when you press *Control* again,
  select another creature, or it dies.
- **World**: world number, current season and time left, sea cover, time to the next event, number of
  landmasses (ignoring specks under 20 cells), land cover and sea cover (shares of the whole map; rivers and
  crater lakes make up the rest), craters still above the sea, thicket and rock cover as a share of the land, and
  a map key. All of them are measured from the map as it is now, so they change after every event.

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
| **Ambient notes** | Every 1.2 s, a 60% chance of one soft note from A3 B3 D4 E4 G4 A4 B4, sometimes with a quieter octave echo. Plays while a run is going, at about the loudness of the zoomed-in beat's snare. |
| **Creature sounds** | A soft tick when eating, a quiet two-note rise for a birth, a low note for a death. Only for creatures on screen when zoomed in to 1.8× or more, or the selected creature. At most one every 0.07 s. |
| **Achievement / new species** | A three-note chime. |
| **World events** | Each has its own effect, louder and longer when major: flood (rushing water and falling notes), drought (dry hiss and rising notes), earthquake (low rumble with a shudder), meteor (whistle then a boom). |
| **Zoom beat** | A drum pattern at 50 bpm in semiquavers (one step every 0.3 s): kick, hat, hat, hat, snare, hat, hat, hat. It fades in from 1.6× zoom and reaches full volume at 3.2×. |

Browsers pause a page's sound when it's hidden or the device sleeps. The game wakes it again when the page comes
back into view, and on the next tap or key press if the browser insists on one.

Safari can also leave the sound engine "playing" (the speaker shows on the tab) while nothing comes out, often
after the Mac sleeps or the audio device changes. So every 2 seconds the game checks that the engine's clock is
moving; if it is frozen, or the engine won't wake, a fresh engine replaces it on the next click or key press.
Turning *Sound* off and on in Settings always starts a fresh engine, as a sure cure for silence.

**Sound goes out through an audio element.** On some Macs Safari keeps sound sent straight to the speakers
silent, even though the tab shows the speaker, while sound from an audio element (the kind of player YouTube
uses) is heard. So all the game's sound feeds a hidden audio element, started by the click that releases a
species. Browsers that can't do this send sound straight to the speakers instead.

---

## 15. How things are drawn

The look is a scientific **field notebook / survey map**.

- **Map.** Coastlines and contours are smooth vector lines, not pixel steps.
  - The sea is shown in four depth bands by distance from shore (`BAND`). The shallow shelf isn't drawn
    separately, but the paler bands near coasts roughly follow it. Land is pale with darker fertile meadows. Thickets are green with
    dots, and denser dots mean narrower gaps. Rock is grey contoured plates. Rivers are pale blue with a
    blue-grey edge. Sea channels are carved into the land's heights as smooth troughs (`SEA_WALL`), like the strait,
    so their coasts are smooth curves, and the land's details fade out over the last few cells before them. Rivers
    keep their stepped edges.
  - Land colours are measured against the world's original heights, so floods and droughts don't recolour the
    land that remains.
  - **Contours** are drawn every ninth of the land's height range, and every third one is an **index contour**,
    drawn bold, as on an Ordnance Survey map.
  - **Temperature** shows as a frosty blue wash on cold high ground and a faint warm wash on hot lowland, five
    steps each, so it shades gradually. The season decides how far each reaches. It is drawn as a small image (one
    pixel per map cell) scaled up smoothly, not as shapes: Safari stops drawing the land's colours when the map
    holds too many detailed shapes.
- **Detail.** When zoomed out, a pre-drawn image of the map is used, plus a lower-resolution copy when very far
  out (`TS` = 0.8 and `LO` = 0.4 pixels per world px, kept low because the map is large). When zoomed in, the visible part is redrawn sharply. While zooming or panning, the last
  sharp image is stretched until the redraw catches up, and fades between seasons and after events keep the old
  map at full sharpness, so the map doesn't go blurry. When zoomed in, creatures stay under the thicket dots,
  mid-zoom included.
- **Creatures** are seen from above.
  - Body: a pale body with an ink outline, an eye pair at the front, and legs as short ink bars along the sides.
  - Legs: 4, or 6 once the body's length trait is 4 or more (`LEG6`) and there is room for three pairs, so they
    follow body length and change as it evolves; there is no leg control. They sit in pairs along the full-width
    part of the sides only, never at the front, at the back or where the body curves into the tail: the front pair
    splays forwards, the back pair backwards, and the front pair keeps clear of the mouth. A big tail leaves less
    room, so a long-tailed creature may have 4 legs where a tailless one of the same length has 6. Longer bars mean more land speed, and wider, shorter bars mean a creature that leans towards water.
  - Mouth: one black mouthpart at the front, from a snapping claw to a slightly trumpeted straw (see
    [mouths](#mouths)).
  - In water, the back half is drawn as submerged and a small wake trails behind, its arcs spreading wider the
    further they are from the body.
- **Effects.** A coloured ring for a birth, a grey cross for a death, an orange shockwave for a meteor.

---

## 16. Design decisions and why

These were deliberate choices made while building the game. They are recorded here so they don't get undone by
accident.

- **No hard population cap.** Crowding and local food lower breeding instead. A run starts with a small local
  population (about 20–50 at 10 minutes) that grows into the 40–100 range as it spreads across the map, and can
  briefly go over.
- **Extinction is a real risk.** Early on, a population is small and local, and a bad winter, flood or meteor
  near home can wipe it out, even for an ordinary design. There is deliberately no safety net.
- **Home ranges.** Creatures keep to the area they were born in, so the world is explored gradually (about a
  quarter of the land in the first 10 minutes) and groups in different areas stay apart.
- **A bigger, oval, regional world.** The map is 1.5 times larger each way than it first was, land stays inside
  an oval, and regions differ in thicket, rock and wetland.
- **Body traits are selected; look traits drift.** Colour and roundness do nothing for survival, so
  their change shows pure chance and how long groups have been apart.
- **Legs follow body length.** Short bodies have 4 and long ones 6, on the sides only, which keeps the front for
  the mouth and the back clear (for a possible tail one day).
- **Hidden world types.** Each world secretly rolls a type (classic, archipelago, supercontinent, highlands,
  forest) and a shape. They are never shown, so the player has no say in the world, and no single design is
  best everywhere.
- **Two landmasses on most worlds.** The strait gives geographic speciation a real chance, but it isn't
  permanent: droughts can close it, so the map can come together as well as break apart. Archipelagos and
  supercontinents have no strait: their islands, rivers and hills do that job.
- **Temperature comes from height, not from one side of the map.** Every hill is its own cold island, so
  cold-adapted groups end up stranded apart ("sky islands"), which encourages new species.
- **Being in between costs something.** Only no tail or a full tail goes anywhere in its element, so a 50% tail
  is a jack of all trades, master of none.
- **Every survival trait can be seen.** Width, length, mouth and tail all show on the creature, and leg length
  shows speed, so you can read a way of life from the body. The tail replaced an invisible habitat setting, and the
  mouth took over which food suits which creature. Taper was removed: it did nothing for survival and, with a tail
  at the back, looked like roundness again.
- **The sea edge is always water.** This avoids corner traps and odd edge behaviour.
- **Species don't merge back.** Instead, splitting gets harder as more species are alive.
- **Meteors are rare (about 1 in 20 events)** and dramatic.
- **Almost no player tools during a run.** You design, then watch. The one exception is controlling a single
  creature's movement: it follows every normal rule, so it lets you feel the world's pressures without steering
  evolution.
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
| How far creatures stray from home, and how fast populations spread | `HOME` |
| World types: how often, land, thicket, rock, rivers, food, temperature | `WORLD_TYPES` |
| World shapes | `SHAPES` |
| How hilly the land is | `RELIEF` |
| Temperature: cold and hot levels, season shifts, energy costs | `TEMP` |
| Shallow shelf size and deep-water cost | `SEA` |
| How far tails let creatures go from shore and from water | `HAB` |
| How long a full tail looks | `TAIL` |
| Nuts in thickets, nut energy and cracking time, algae bonus for straw mouths | `MOUTH` |
| How different regions are | `REGIONS` |
| Land limits for floods and droughts | `LAND` |

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
| `js/ui.js` | Status bar, season clock and world event sign, inspector, notifications, menus |
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
  reports population, seasonal swing, extinctions, new species, how much land was explored at 10 minutes, the
  population at 10 minutes and after 20, and the time per simulation step.

  The current settings aim for (use `python3 tests/scenarios.py 6 30` to see the later numbers):
  - about a quarter of the land explored at 10 minutes, with a population of roughly 20–50
  - populations mostly between 40 and 100 after 20 minutes
  - gentle seasonal swings
  - 0 to 2 new species per 15 minutes, with at most 3 alive at once

  Results vary from run to run, so compare batches rather than single runs.

The tests use `window.EvoQuestDebug`, a small read-only hook at the end of `js/main.js`. The bundled file leaves
it out.

### Single-file build

`python3 tools/build.py` writes `dist/evoquest.html`: the whole game in one file you can share or host
anywhere. `dist/` isn't stored in the repo, so run the build again whenever you need a fresh copy.
