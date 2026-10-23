# EvoQuest

Design a species, release 20 of them onto a randomly generated island world, and watch the world decide what
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
2. **Release.** 20 creatures (`START`) appear together on the main landmass (or in the water near it, for a
   design that lives in water). The release spot is chosen for the food the design can eat within 180 px, plus half
   the food it can reach within 640 px without leaving ground it's allowed on (`RELEASE`). So a water design isn't
   left in a rich but cut-off strip of shallows at the map's edge when a longer coast or a river network is on
   offer. The founders start with 90% energy and already
   old enough to breed, aged 15 to 45 seconds (`FOUNDERS`), so the population gets going without a long wait. Their ages are spread so
   they don't all die of old age at the same moment, which used to halve the population at about 70 seconds. Their
   traits are varied 1.5 times more than normal so selection has something to work on straight away.
3. **The simulation runs.** Food regrows, creatures plan routes to food, eat, breed and die. Seasons change
   every 2.5 minutes. A world event happens every 7 minutes.
4. **Evolution.** Offspring inherit their parent's traits with small random changes. Traits that help
   creatures eat and breed in this world become more common.
5. **Speciation.** If part of the population gets cut off or settles into a different way of life, it can
   become a new species with its own Latin name.
6. **The run ends** only when every creature of every species has died. There is no win condition and no time
   limit. You can also end a run at any time with *Extinction* in Settings, which brings up the end screen, where
   you can start a new species.

Time in this README means game time. At 2× or 4× speed everything happens faster in real time. Times in the game
are shown as m:ss, and as hh:mm:ss from an hour on (for example 01:12:01).

---

## 2. The species creator

| Control | What it does |
|---|---|
| **Species name** | Up to 20 characters. Also becomes the Latin genus (see [naming](#10-speciation-and-naming)). |
| **Width, Length** | Body traits, 1 to 7. They only matter through the body's **size**, so a long thin creature and a short stubby one of the same size do equally well. A bigger body is slower but burns less energy and holds more, and can't go as far into thickets. |
| **Legs** | Body trait, short to long (0–100%). Longer legs walk faster but swim slower. Moving fast burns much more energy, so long legs aren't free. |
| **Tail** | Body trait, none (a land creature) to full (a water creature). Below 15% there is no tail ("None · land only"); a tail shows and counts from 15%. A bigger tail swims faster but walks slower, and lets the creature go further from shore but less far from water. You can see it: the back of the body curves into a longer tail. |
| **Mouth** | Body trait, from beak to straw. A beak gets more from nuts; a straw gets more from algae. The label names the shape (Beak, Slim beak, Tweezers, Prongs, Straw) and the stats under the preview give how much it gets from each. |
| **Roundness** | Body trait, 0 (blocky) to 1 (round). Softens the body's corners. A rounder body swims a little faster and walks a little slower; a blockier one the reverse. |
| **Colour** | Under the name. One of the 7 Okabe–Ito colours (a palette designed to stay distinguishable for colour-blind players). |
| **World** | A new random world, the current world, or any world from a past run. Each world has a number (its seed) and the same number always builds the same world. |
| **Randomise** | The refresh button in the preview's top right corner. Random name (two made-up syllables from a list of 40, sometimes with an "s": 3,200 possible names, or 1,600 different Latin genus names, since the genus drops a trailing "s"), body (legs and mouth included), colour and shape. |
| **Release into the world** | Starts the run, releasing 20 creatures (`START`). |

The **preview** shows the creature at 7× zoom with a 10 px scale bar. Every few
seconds it acts out eating, so you can see its mouth snap. There is no text beside the headings or under the
sliders. Under the preview, **tags** list every stat the sliders change, in four rows:

1. Size, number of legs, land speed and water speed (px/s).
2. How far it swims out from shore and how far it walks inland from water. These run from 0 px (never) to
   2000 px (`RANGE_CAP`; past that the limit no longer matters on this map, so 2000 px means anywhere).
3. Energy store, energy burnt per second walking flat out, and what it gets from nuts and from algae (× a berry's
   worth).
4. How far into thickets it goes (up to 200 px, which reaches every thicket's middle), and whether it crosses rivers.

Each tag is filled from the left like a bar, showing where its value sits between the lowest and highest any
design can have (worked out once, over a grid of designs covering every slider's range). Energy burnt uses a log
scale, since a few extreme designs burn far more than the rest. Legs and rivers are either/or, so their tags have
no fill. Each tag is as wide as its longest possible text, so tags don't change size as values gain or lose
digits.

The round **?** button at the top right opens *How it works*: energy, breeding and lifespan, then how each slider trades
one thing against another. Click anywhere else to close it.

The creator **starts randomised**: every time it opens, it is as if *Randomise* had been pressed, including a new
name. The exceptions are **Retry world** and **New world** on the end screen, which bring back the design that
just died, and **Revisit world** on a past lineage, which brings back that run's design.

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
| Width (`w`) | 1–7 | Body width in pixels = 6 + 2.2 × width. Only matters through size. |
| Length (`h`) | 1–7 | Body length in pixels = 6 + 2.2 × length. Only matters through size. |
| Legs (`leg`) | 0–1 | Leg length: 0 = short, 1 = long. Long legs walk faster, short ones swim faster. |
| Tail (`hab`) | 0–1 | Below 0.15 (`TAIL.min`): no tail, fully land. From 0.15 a tail shows and counts, up to 1 = full tail, fully water. (The code calls it `hab` because it began as an invisible "habitat" setting; now you can see it as the tail.) |
| Mouth (`mth`) | 0–1 | 0 = beak, 1 = straw (see [mouths](#mouths)). |
| Roundness (`round`) | 0–1 | 0 = blocky, 1 = round. Changes land and water speed by up to 10% (see below). |

From these, the game works out:

Every ability comes from these. There is no separate speed or energy setting: what a creature can do is set by
what you can see.

- **Size** = √(body width × body length) ÷ 17, from 0.48 (width and length 1) to 1.26 (both 7). Width and
  length do nothing else, so a 3 × 6 body and a 4.5 × 4 one are the same size and do equally well.
- **Thickets.** Thickets are tighter towards the middle, so size sets how far in a creature can go, measured from
  the thicket's edge (an edge cell counts as 16 px in): 16 + 33 × ((1.26 − size) ÷ (size − 0.48))² px (`THICKET`).
  This works like the tail's limits on land and water.

  | Size | Goes into thickets |
  |---|---|
  | 1.26 (biggest) | 16 px (the edge cells only) |
  | 1.1 | 18 px |
  | 1.0 | 24 px |
  | 0.9 | 40 px |
  | 0.8 | 84 px |
  | 0.7 or less | anywhere (no thicket is much deeper than 180 px) |

  Half of a typical thicket lies within about 32 px of its edge and nine tenths within about 80 px, so a middling
  creature reaches about half of it and only small ones its heart.
- **Legs**: 4, or 6 from size 0.9 (`LEGS.sixFrom`). Six legs walk 5% faster and swim 5% slower, four the reverse
  (`LEGS.six`). Leg count follows size; there is no control for it.
- **Base speed** = 48 ÷ (0.6 + size) (`LEGS.base` × 1.5). Big bodies are slower: 32 px/s at size 0.9, 44 at the
  smallest and 26 at the biggest.
- **Effective tail** = (tail − 0.15) ÷ 0.85, and 0 below 0.15. Everything below uses this, so 15% and below
  behave exactly alike, as a creature with no tail.
- **Land speed** = base × (0.4 + 1.2 × legs) × (1 ± 0.05 for 6 or 4 legs) × (1 − 0.85 × tail) ×
  (1 − 0.1 × (2 × roundness − 1)). Leg length takes walking from 0.4 to 1.6 times the base (`LEGS.land`).
- **Water speed** = base × (1 + 0.15 × (1 − 2 × legs)) × (1 ∓ 0.05 for 6 or 4 legs) × (0.15 + 0.85 × tail) ×
  (1 + 0.1 × (2 × roundness − 1)). The shortest legs swim 15% faster and the longest 15% slower (`LEGS.water`);
  medium legs make no difference.
  The roundness part (`ROUND`) is ±10% at the extremes and nothing at 0.5: a fully round body swims 10% faster
  and walks 10% slower, a fully blocky one the reverse. So everything about a water creature pulls the same way:
  short legs, four of them, a tail and a round body make smooth, round, tailed swimmers (rather like tadpoles),
  and long legs, no tail and a blocky body make walkers.
  A creature with no tail still swims at 15% of its base speed. One with a full tail walks at 15%.
- **Range.** Only a creature with no tail (0%) goes anywhere on land, and only one with a full tail (100%)
  anywhere in water. Everything in between has two limits (`HAB.range` = 200):
  - it swims at most 16 + 200 × (tail ÷ (1 − tail))² px from shore (`HAB.first`), so every visible tail gets into
    at least the first band of water
  - it walks at most 200 × ((1 − tail) ÷ tail)² px from water

  | Tail (slider) | Effective tail | Swims from shore | Walks from water |
  |---|---|---|---|
  | 0–15% | 0 | never enters water | anywhere |
  | 16% | just above 0 | 16 px | anywhere |
  | 32% | 0.2 | 29 px | 3200 px (anywhere, in practice) |
  | 41% | 0.3 | 53 px | 1089 px |
  | 49% | 0.4 | 105 px | 450 px |
  | 58% | 0.5 | 216 px | 200 px |
  | 66% | 0.6 | 466 px | 89 px |
  | 83% | 0.8 | 3216 px (anywhere, in practice) | 13 px (never leaves water, in practice) |
  | 100% | 1 | anywhere | never leaves water |

  Water is always at least one cell (16 px) from land and land from water, so a limit under 16 px means never. Every
  visible tail swims at least 16 px, so only a tailless creature never enters water, while a tail above about 81%
  never leaves it. The creator and the specimen tab say "Never enters water" or "Never leaves water" for these.

  So a 67% creature lives along coasts and lakesides, and being in between is no longer a free pass.
- **Food energy** doesn't depend on the tail or size; the mouth decides it (see [mouths](#mouths)).
- **River crossing.** Needs water speed of at least 14 px/s (`RIVER`). The "Crosses rivers" chip also needs
  the creature to swim at least 16 px from shore, which every visible tail does. In practice a tail of about 33% or
  more is needed to swim that fast, depending on legs and roundness.
- **Reach** = half the longest side + 4 px.
- **Energy capacity** = 30 + 25 × size: 42 for the smallest, 62 for the biggest.

### Mouths

Every creature has one mouthpart at the front, which changes shape gradually along the mouth trait:

| Mouth | Look | Energy from a nut | Energy from algae |
|---|---|---|---|
| 0 (Beak) | a stout beak that snaps shut | 12.5 | 6 |
| 0.25 (Slim beak) | a slimmer beak | 11.3 | 7 |
| 0.5 (Tweezers) | straighter jaws that stay a little open | 10 | 8 |
| 0.75 (Prongs) | two thin prongs with a small gap | 8.8 | 9 |
| 1 (Straw) | the prongs closed into one tube that flares slightly at the end | 7.5 | 10 |

- **Nuts** give 1.25 times a berry's energy for a middling mouth (`MOUTH.nut`), and a beak gets 25% more than
  that, a straw 25% less (`MOUTH.bonus`).
- **Algae** gives 1 + 0.25 × (2 × mouth − 1) times a berry's energy: a straw gets 25% more, a beak 25% less.
- **Berries** give every mouth the same 8.

So a world full of thickets favours beaks and a watery world favours straws, and the mouth evolves like any other
body trait. Between the two ends, the beak stretches into tweezers, the tweezers straighten into prongs, and from
0.75 the prongs close together into a single straw with a slight trumpet at the end. The mouth is always drawn in
black ink. The jaws snap quickly
while the creature eats and open and close gently the rest of the time. Mouths, like eyes and legs, are only drawn
when zoomed in.

Designs from before mouths existed (saved past lineages) start with a mouth of 0.5, and designs from before leg
length existed get legs from their old speed setting (speed 1 = short, 10 = long). Designs saved when tails counted
from 33% have their tail moved onto today's scale, so a tailless design stays tailless and a tail looks as it did.

### Tails

The tail is the visible form of the old habitat setting. The body's straight sides curve smoothly in to a slim
tail that tapers to a point, with no corner where body and tail meet. Only the slim part sways, starting gently
where the curve-in ends. A bigger tail is longer (up to
1.1 times the body's length, `TAIL.len`) and a little broader. With no tail (15% or less) the back of the body is
rounded off like the front. Just above 15% the tail appears at once as a short but proper tail, 30% of the full
length (`TAIL.first`), rather than a thin spike, and grows from there. The bottom 15% of the scale has no effect, so a
tailless parent can't have a tailed child in one step (a child's tail moves at most 8 points), but a land lineage
near water can drift up to 15% within a run and start using a tail when the water pays. (Tails used to count from
33%, which a lineage starting at 0% would take 30–40 minutes of drifting to reach.)

**Randomise** gives about a third of designs no tail (0–13%) and the rest a visible one (25–90%). Zoomed in, the tail sways: strongly while swimming, gently while walking. In water it is drawn
under the surface with the back of the body, and the wake starts behind its tip.

The middling design (width 4, length 4.5, legs 50%, no tail, roundness 0.5) is size 0.90 with 6 legs, goes 40 px
into thickets, walks at about 34 px/s, swims at about 5 px/s, can't cross rivers, and holds about 53 energy.

### Colour: one per species

Colour has **no effect on survival**, and it doesn't evolve. Each species is a single colour, so species can be
told apart on the map at a glance:

- **Primus** is the colour you chose in the creator.
- **A new species** gets the one of the 7 creator colours that looks most unlike every species alive at that
  moment (`newColour()`, using a weighted RGB distance). With at most 3 species alive there is always a clear
  choice. Colours of extinct species can come back on long runs.
- **Individuals** differ only in shade: each newborn is up to 4 lightness points lighter or darker than its
  species' colour (`SHADE`), so a crowd doesn't look cloned. The shade doesn't build up over generations.
- **At a split**, the new species' creatures blend from the old colour to the new one over 1.5 seconds
  (`SPLIT_FADE`), round the colour wheel the short way so they stay bright rather than passing through grey.

The same colour is used for the species everywhere: on the map, in the Species tab, the Stats chart, the family
tree and the end screen.

### Inheritance

Each trait on each newborn independently has a **30% chance of copying the parent exactly**. Otherwise it
moves by a random amount up to:

| Trait | Maximum change per generation |
|---|---|
| Width, length | ±0.8 (that is 0.5 × `VAR`, and `VAR` = 1.6) |
| Legs, tail, mouth | ±8 percentage points (0.05 × `VAR`) |
| Roundness | ±0.08 (0.05 × `VAR`) |

Traits are then held inside their allowed ranges. `VAR` scales body-trait variation only.

---

## 4. Energy, eating, breeding and death

### Energy

- **Burn per second** = (0.32 + 0.81 × (current speed ÷ 30)² × (1 + 0.9 − size)) × (1 + 0.5 × (0.9 − size)), plus
  temperature, and more in deep water (`BURN`). The middle part (`BURN.stride`) makes moving cheaper for big bodies,
  like long strides: a size-1.2 creature pays 30% less to move than a middling one, a size-0.6 one 30% more.
  - Standing still costs a little; moving fast costs a lot, because of the squared term. That is the cost of
    long legs.
  - Big bodies burn less: the smallest burn about 21% more than a size-0.9 creature, the biggest about 18% less.
    Small bodies are faster, though, so on the move they burn much more: walking flat out, the smallest burns
    about 3.1 a second and the biggest about 0.6.
  - **Cold** (see [temperature](#temperature)): keeping warm costs up to 0.35 energy per second (`TEMP.coldCost`)
    for a mid-sized creature, scaled by 1.4 − 0.6 × size, so small creatures pay most (about 1.1 times as much)
    and big ones least (about 0.65 times).
  - **Heat**: cooling down costs up to 0.3 × size² per second (`TEMP.heatCost`), so big creatures pay most.
  - **Deep water**: the whole burn is multiplied by 1 + 0.8 × (1 − tail) (`SEA.deepCost`). A creature with no
    tail burns 80% more there; one with a full tail burns nothing extra.
  - The creator shows the burn when walking, without temperature or deep water.
- **Food**: a berry gives 8 energy (`FOOD`), and nuts and algae 6–12.5 depending on the mouth (see
  [mouths](#mouths)). Energy never goes over the creature's capacity.
- After eating, a creature **rests** for 0.8–1.4 seconds (burning only the standing cost), then plans its next
  meal.

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
| Land | It is within its walking range of water (always true with no tail, 15% or less; a 40% tail still walks over 1,000 px from water). | Land speed |
| Thicket | It is no further from the thicket's edge than its size allows (see [traits](#body-traits-shaped-by-the-world)), plus the land rule. | 85% of land speed |
| Sea | It is within its swimming range of land. | Water speed |
| River | Water speed is at least 14 px/s, plus the sea rule. | 75% of water speed (the current) |
| Rock | Never. | – |

A creature that ends up somewhere it isn't allowed (for example, land flooded under it, or a water creature left on
dry land by a drought) is **stranded**. It moves at 7 px/s and can cross anything except rock until it gets back to
allowed ground. It heads for the quickest food it can eat; if there is none within its planning range (22 seconds of
travel, only about 150 px at that crawl), it makes for the nearest ground it is allowed on, however far. It can
still starve on the way, especially in deep water, where a creature with no tail burns 80% more.

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
- **Richer food counts as closer.** Every point of energy a food gives this creature beyond a berry's 8 counts as
  1.5 seconds less travel (`FOOD_PREF`). A beak gets 12.5 from a nut, so a nut counts as about 7 seconds closer, and
  a straw's algae (10) as 3 seconds closer. So creatures go out of their way for the food their mouth suits, which
  pulls mouths, and the ways of life that go with them, apart.
- The route is then smoothed into straight lines wherever the way is clear.

### Moving

- Creatures turn at most 3 radians a second and move at half speed while turning sharply. Close to the next point
  on their route (within 20 px) they turn on the spot instead, and a creature waiting by regrowing or busy food
  stands still once within 12 px of its spot (a stranded creature heading for safe ground never stops short of it). Without this, a creature could circle a point for ever without ever
  quite reaching it.
- Old creatures slow down: from 85 seconds old their speed falls steadily, coming to a halt at 90 (`OLD`).
- If the way ahead is blocked, a creature tries angles to either side before turning around.
- Wanderers turn back towards the middle of the map near its oval edge.

### Reaching food

A creature eats only food in front of it, within about 35° of the way it faces (`EAT_FACE`), so the food goes into
its mouth. Close to its food it turns on the spot until it faces it. A controlled creature eats the same way.

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
| **Sea** | Everything below sea level: a shallow shelf round every coast, wider along some stretches and over offshore banks, and deep water beyond, always deep near the map's edge (see [sea depth](#sea-depth)). |
| **Land** | Everything above sea level. |
| **Thicket** | The densest part of a "thicket" noise pattern, on land (the share is set by the world type), weighted by region (see below). Tighter towards the middle: the bigger a creature, the less far in it can go (see [traits](#body-traits-shaped-by-the-world)). On the map, small scattered bushes at the edge grow into big, packed trees towards the middle. |
| **Rock** | The top part of a "rock" noise pattern, on land (the share is set by the world type), weighted by region. Impassable. Drawn as contoured grey plates. |
| **River** | A meandering channel cut right across the map, coast to coast, at any angle. Strong current. |

### World types and shapes

Each world secretly rolls a **type** from its world number, each type equally likely. The player never sees it: the point is that you have
no say in the world, and different worlds favour different designs. All the numbers are in `WORLD_TYPES`.

| Type | How often | Land at start | Strait | Thicket | Rock | Food (berries / algae) | Temperature |
|---|---|---|---|---|---|---|---|
| **Classic** | 1 in 5 | 31–35% | yes | 20% of land | 10% | 375 / 125 | normal |
| **Archipelago** | 1 in 5 | 20–24%, broken into many islands, no strait or sea channels | no | 20% | 6% | 320 / 250 | a little warmer |
| **Supercontinent** | 1 in 5 | 42–46% | no | 18% | 8% | 440 / 60 | normal |
| **Highlands** | 1 in 5 | 33–37% | yes | 8% | 28% | 375 / 125 | colder |
| **Forest** | 1 in 5 | 32–36% | yes | 45% | 5% | 400 / 100 | normal |

Rivers: an 85% chance of one and a 55% chance of a second, except archipelagos (30%, never two), supercontinents
(always one, 70% a second) and highlands (85%, 30%). Supercontinents have slightly fewer wetlands, highlands
noticeably fewer.

**Lakes** (`lakes` in `WORLD_TYPES`, and `LAKES`): each world carves lake basins into its land, at least 5 cells from
the coast, 4 to 10 cells across with wobbly shores: 2–4 on classic and forest worlds, 3–6 on supercontinents, 4–7 on
highlands (a lake district) and 0–1 on archipelagos, which have water enough. Basins that touch become one bigger
lake. The land slopes gently down to each lake over its last 6 cells (`LAKES.shore`, `LAKES.slope`), so a lake sits
in a hollow with a smooth shoreline, not in a steep-sided pit. Their floors are only a little below the starting sea level, so a big drought can drain the shallow ones and a
flood spreads them. Low wetlands still hold a few small lakes of their own. Lakes are water like the sea, always
shallow, so the same rules apply: land creatures keep out, and a water creature in a lake that can't leave water is
cut off there, which can lead to a new species.

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
   sea level, so coasts stay where they are. High ground is cold (see [temperature](#temperature)). Then the
   **lakes** are carved (see above). The sea stays where it started: the lakes take their share out of the land.
5. **Regions.** Broad, slowly varying patterns give each area its own character (`REGIONS.strength` = 1.3):
   - **thicket country**: thickets cluster here
   - **rocky uplands**: rock clusters here
   - **low wetlands**: the land is flattened to just above the starting sea level, with hollows that hold lakes.
     Floods drown these areas first and droughts drain them first, while uplands barely change.

   Everywhere else is more open. Different regions favour different bodies (small bodies in thickets,
   swimmers in wetlands), which is meant to encourage different species in different parts of the map.
6. Thicket and rock are set as shares of the starting land, so each type gets the amount it asks for. No ground is
   left sealed off by rock: a pocket walled in by rock (common on highlands worlds, up to 5% of their open land) gets
   a pass 2 cells wide cut through to the nearest open ground, like a mountain valley, and a tiny one (under 6 cells)
   is filled in. The pass is cut into the rock pattern itself, so later events can't seal it again.
7. Rivers (chances above). Each runs coast to coast at a random angle and meanders along its length (two
   overlapping waves plus a little jitter), so splits aren't straight lines.
8. **Food sites** are placed, in the numbers the world type sets (see [food](#7-food)).

### Sea depth

The sea has a **shallow shelf** and **deep water** beyond it, and the map draws exactly what the game uses: the
three pale bands round the coasts are the shelf, and the edge of the outer band is where deep water starts.
(Before the map redesign the shelf was worked out separately and never drawn, and the bands were a fixed width.)

- **Every coast** has a tapering shelf as wide as the nearest 30% of the world's open sea at the start
  (`SEA.shelf`), as the shelf was before, but never narrower than 110 px (`SEA.minWidth`). So worlds with a lot of
  open sea have wide shelves (about 250 px on classic and forest worlds) and supercontinents narrow ones (about
  130–145 px). That width is fixed for the world, so after a flood or drought the shelf follows the new coast.
- **Along some stretches** the shallows reach further out, up to 2.2 times as far (`SEA.widen`, `SEA.wide`).
- **Shallow banks** rise as separate patches out at sea, where there is room (`SEA.bank`).
- **Each wider stretch and bank has its own shallowest depth** (`SEA.top`, `SEA.topAt`): usually only the outer
  band, sometimes the middle band, and now and then all three. Next to the coast the plain taper stays, so a wide
  stretch is a broad shelf beyond the normal bands. They settle in the middle of a band, never on its edge, which
  would give ragged outlines.
- **Smooth shapes.** The whole depth pattern is softened 5 times (`SEA.smooth`), so every band has smooth curves
  and the stretches and banks join the coastal shelf naturally.
- **Near the map's edge**, wider stretches and banks fade away over the 14 cells inside the sea margin
  (`SEA.edgeFade`), and within the margin itself even a plain shelf runs out, so the open ocean round the map is
  always deep.
- **Lakes** (water not joined to the open sea) are always shallow.

With the extra stretches and banks, the shelf is about 29–39% of the open sea, a little more than the 30% it was.
Depth is worked out again after every flood, drought or earthquake.

- **Algae** grows only on the shelf, most thickly close to shore (`SEA.algaeFade`).
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
| **Berries** (orange) | Land and thicket | 320–440 sites (nuts included), depending on the world type. More likely on fertile ground, in thickets (most towards the middle) and on islands. |
| **Nuts** (acorns) | Thicket | In thickets, 1 in 5 food sites at the edge grow nuts instead of berries, rising to 4 in 5 from 48 px in (`THICKET.nuts`, `THICKET.deep`), about half overall. Richer than berries for a beak, poorer for a straw (see [mouths](#mouths)). |
| **Algae** (green) | Shallow shelf, rivers and lakes | 60–250 sites, depending on the world type, in rivers or on the sea's shallow shelf (not in the outer margin). On top of that, lakes get 8 sites for every 100 lake cells, so a world with big lakes has much more algae (a supercontinent, with 60 in its seas, ends up with about 120–190). Another 30% of the world type's algae waits on low land a major flood would drown, and grows only once the water arrives, and 40% waits in deep water just beyond the shelf, for when a drought moves the shallows out. Each new meteor crater's lake starts 3 algae sites. |

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
- A regrowing nut grows in size through three stages: a bare pale nut with no cap just after it's eaten, a pale nut
  with a small pale cap at half-grown, and the full dark acorn when it's ready to eat.
- A regrowing algae site shows as small yellow fronds and turns green when ready.
- When zoomed out, food is drawn as simple dots.

**Floods and droughts wipe food out.** Berries and nuts on land that floods, algae on water that dries up, and algae left
in deep water when the shelf moves are wiped out: they vanish and can't be eaten. When the ground suits them again
(say a drought after a flood), they start regrowing from scratch rather than reappearing fully grown. The algae
waiting on low land works the same way: a flood is what makes it grow, so floods bring food to swimmers while they
take it from walkers. Likewise, 40% more of the world type's algae waits in the deep water just beyond the shelf
(`SEA.drought`, up to half a shelf width past its edge, `SEA.beyond`): a drought dries the old shallows and wipes their algae, and pulls the shelf out to where that algae
waits. Without it, a drought could take two thirds of an archipelago's algae at once.

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
| **Meteor** | Hits a random land spot. Kills every creature within 190 px. Leaves a crater: an irregular rock rim with a gap, and a small lake in the middle, where 3 algae sites start growing. | Kills within 280 px and makes a much bigger crater. |

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
- plays its own sound effect (and the sign beeps softly once a second while it flashes beforehand)
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
   on. If the second-biggest group has at least 12 members (`SPC.min`) and differs enough in traits from the biggest group
   (more than `SPC.geo` = 0.22), that is a candidate split.
2. **Ecological: a different way of life.** If there is no geographic split, the members are sorted into the
   two most distinct trait clusters. The clusters must differ by more than `SPC.eco` (0.4) and be clearly
   separate, with the gap between them at least 1.8 times the spread within them (`SPC.ratio`). The smaller
   cluster must have at least 12 members.

The same candidate must hold for **4 checks in a row**, about 20 seconds (`SPC.streak`). Then the smaller group
becomes a new species.

**More species make splitting harder.** Both thresholds are multiplied by 1 + 0.9 × (living species − 1)
(`SPC.extra`). With 2 species alive, splits need 90% more difference, and with 3 alive, 180% more. In 75
hour-long test runs that lasted the hour, three in four had 1–3 new species (the rest none), none ever had more
than 3 alive at once, and most new species were still alive at the end of the hour.

**Trait difference** is measured only on the body traits that change how a creature lives: size (× 1.5,
`SPC.size`), legs, tail, mouth (× 0.6, `MOUTH_SPLIT`) and roundness (× 0.5). Colour never makes a new
species (each new species is given its own), and width and length count only through size, so two
groups that only look a little different stay one species. Two features that are either there or not count extra
(`SHOWS`), because they change how creatures live and look even when the trait behind them has barely moved: having
a tail at all adds 0.25, and having 6 legs rather than 4 adds 0.15.

**No copies.** A group that would be within 0.2 of a species already alive (`SPC.same`) doesn't split off, so a
species can't split into a copy of one that already exists.

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
| *rostratus* | a more beak-like mouth ("beaked") |
| *longipes* | longer-legged |
| *brevipes* | shorter-legged |
| *magnus* | bigger |
| *minimus* | smaller |
| *rotundus* | rounder ("a better swimmer") |
| *acutus* | blockier ("a better walker") |

- *insularis* is used first if the new group was cut off on an island (not the main landmass).
- If those names are all taken, the fallbacks are *novus*, *alter*, *tertius* and *remotus*.

A notification headed **"A new species has formed!"** welcomes it by name, for example "Welcome the first Blorbus
natans." It doesn't say how the new species differs: one changed trait can't tell you how well it does overall (shorter
legs swim faster, but not if the tail shrank too), so the Species tab is the place to compare them. Its Latin name
still hints at its biggest change. The event log keeps the same line.

---

## 11. Achievements

Achievements are earned per run and reset with each new run. They are checked every 2 seconds.

| Achievement | How to earn it |
|---|---|
| First Year | Survive all four seasons (10 minutes) |
| Old Lineage | Lineage lasts 30 minutes |
| Ancient Line | Lineage lasts an hour |
| Dynasty | Reach generation 100 (runs reach about generation 65–85 in an hour, so this takes a long run) |
| Weathered | Survive 10 world events |
| Against the Odds | Population grows to 20 after falling to 5 or lower (checked every 2 seconds, so a very brief dip can be missed) |
| Trauma Bonding | Survive at least one of each world event: flood, drought, earthquake and meteor |
| Re-productive | One creature has 5 offspring (most have 0–2; in 10-minute test runs about 1 creature in 6 runs reached 5) |
| Taking to the Water | A species' average tail grows by 40 points |
| Coming Ashore | A species' average tail shrinks by 40 points |
| Branching Out | Witness a new species form |
| Land and Sea | An entirely land species (on average it never enters water) and an entirely water species (on average it never leaves water) alive at once |
| Crowded Tree | Three species alive at once |
| Changing of the Guard | A newer species outlives primus |
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
| Cog | **Settings**: *Extinction (end run)* (press it twice, the second time when it says "Click again to confirm": one huge meteor lands among the creatures a second later, five small ones follow, and about 3 seconds after pressing every creature is dead and the end screen appears (`DOOM`). It's a way to start again rather than a world event, so it leaves no craters), *Sound* on/off (all sound: ambient notes, creature sounds, event effects and the zoomed-in beat). **Testing tools** show only a password box until you enter the password (`TEST_PASSWORD`, 1234 to begin with) and press *Unlock*: a green tick means it's right and the testing options appear until the page is reloaded, an orange cross means it's wrong and they stay hidden. The password can't be changed in the game; to change it, edit `TEST_PASSWORD` in `js/config.js`. It only keeps the tools out of casual reach, since anyone reading the code can find it. **Testing: speed** sets 1×, 2×, 4× or 10×, handy for checking things quickly. **Testing** event buttons fire a flood, drought, earthquake or meteor straight away, normal or major (the *Major* toggle). They always do exactly what they say, even past the usual land limits, and don't move the next scheduled event (which kind it will be is chosen again, since the land may have changed). |

### Bottom left: season clock, temperature and world event sign

- The **season clock**: the year as a ring of four seasons, going round clockwise from the top, each in its colour,
  all in full colour all year. A dot travels round the ring through the year, and the current
  season's symbol sits in the middle: a flower for spring, sun for summer, leaf for autumn, snowflake for winter.
- The current season's **name**.
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

Collapse or expand it with the arrow. It has four tabs.

- **Species**
  - **Table**: one column for every species (the starting design isn't shown here, since it never changes), living ones first and extinct ones
    at the far right, greyed out and marked †. Every column has the same fixed width, so the table doesn't shift as
    species change. Numbers are shown to one decimal place (size to two). When there are too many to fit, the table
    scrolls sideways while the row names stay in view. The first row
    is a drawing of each species' average creature (its average traits, in the species' colour), all at
    one scale, at the same height and right-aligned above the values. Then: population (on the end screen,
    each species' peak), time alive (how long the species has existed, or did), size, leg length (in px, as drawn), leg number (an average, such as 4.7), tail length (in px, or None), mouth
    (Beak to Straw) and roundness (Blocky, Squarish, Rounded or Round). Stats such as speed are in the Stats tab
    instead. In each species' column, the one or two traits that most set it apart from the species it split
    from are highlighted in orange, with a tooltip saying so (there is no note under the table). Primus has no
    highlights, since it didn't split from anything. A trait counts only if it
    differs notably: by 0.06 in size, 0.6 legs, 0.2 in roundness, or 12 percentage points in the leg length, tail
    or mouth traits.
- **Stats**
  - **Chart**: pick Population, Land speed, Water speed, Swims from shore, Walks from water, Energy use (burnt per
    second walking flat out, without temperature or deep water), Energy store, Into thickets (how far, in px) or
    Crosses rivers (the share of a species that can, never shown above 100%). One line per species, of the species' average. Distances
    beyond 2,000 px (more than most of the map, so in practice "anywhere") count as 2,000, and thicket reach beyond
    200 px counts as 200, so a few unlimited
    creatures don't swamp the average. For population, a thin black line shows the total. The dashed line is the
    released design's value. A chart shows at most the last 20 minutes (`CHART_SPAN`). After that a **slider**
    appears under it: drag it left to look back through earlier time, and right to the end to follow the present
    again.
- **Specimen**: tap any creature on the map to select it. The camera follows it automatically (dragging the map
  stops following). The tab shows its:
  - generation, parent, offspring and meals
  - energy and age
  - its stats: land and water speed, range (how far it goes from shore and from water), how far into thickets it
    can go, mouth type and how it feeds (how much it gets from nuts and algae compared with a berry)

  Its visible features (size, legs, tail, roundness) aren't listed: you can see them on the creature, and the
  Species tab gives them for its whole species.

  The selected creature has orange corner brackets and a dashed line to its food target.

  **Control** lets you steer it with the **arrow keys** (keyboard only). The button turns black while you are in
  control; press it again to let go. Everything else stays the same: its
  speed, the ground it can and can't enter, energy, ageing, its 90-second lifespan and breeding. It moves only
  while a key is held and stands still otherwise (burning just its resting energy). It eats any food it reaches,
  then rests as usual before you can move it again. Pressing into ground it can't enter makes its corner brackets
  bump, and the stat that stops it turns orange in the tab (just its text, nothing added): **Range** (too far from shore or from water),
  **Speed** (allowed in the water but slower than the 14 px/s a river's current needs) or **Thickets** (too big to
  get that far into a thicket). Rock and the map's edge stop everyone, so nothing flashes for them. The dashed food line is hidden while you control it. Control ends when you press *Control* again,
  select another creature, or it dies. *Control* is greyed out on phones and tablets, which usually have no arrow keys (pressing any key on an attached keyboard turns it back on), and while a testing speed above 1× is set (controlling
  only makes sense in real time), and choosing such a speed lets go of a controlled creature.
- **World**: world number, thicket cover (as a share of the land), land cover and sea cover (shares of the whole
  map, measured as it is now; rivers and lakes make up the rest), how many floods, droughts, earthquakes and
  meteor strikes there have been so far, and a map key.

### Map

- **Drag** to pan.
- **Scroll or pinch** to zoom. You can zoom out to a little beyond the whole world and in to 6×.
- A **scale bar** under the status bar shows distance in px.
- Above 2.2× zoom, each creature shows a small **energy bar**, which turns brown below 25%.

---

## 13. End of a run: summary, family tree, replay

When the last creature dies, the summary shows, under the *Lineage extinct* heading:

- **Watch replay**, **Retry world** (the same world) and **New world** (a new random world), at the top. Retry and
  New world both open the creator set to the design that just died, ready to change or release again.
- **Time alive, generations, peak population, ever born, species, achievements** (earned out of the total, such as
  3 / 15).
- **How they died**: a bar split by starvation, old age and meteor strike.
- **Species table**: the same table as the inspector's Species tab, with every species as it was last seen
  (none greyed out, since all have died), and the **starting design** as the first column. Primus isn't
  highlighted against it; compare the two columns by eye.
- **Family tree**: every species as a line through time, with a marker every minute (every few minutes on long
  runs, so the labels don't overlap). Branches show where each split from its parent. A
  thick line means still alive at the end, and a tick marks extinction.
- **Achievements**: every achievement, the ones earned this run in full and the rest greyed out.
- **Watch replay** plays the whole run back at 12 recorded moments per second. A moment is recorded each
  second of game time, and the gap between recordings doubles on very long runs to save memory.
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
| **World event warning** | While the world event sign flashes, before an event, a short high blip once a second, on every other flash (`WARN_BEEP`). Only in the run-up, not as the event happens, and not while paused. |
| **World events** | Each has its own effect, louder and longer when major, with no musical notes: flood (rushing water), drought (dry hiss), earthquake (low rumble with a shudder), meteor (whistle then a boom). |
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
  - The sea is shown in four depth bands (`BAND`, starting at the depths in `BAND_AT`), each edged with a thin
    line, as on a sea chart. The outer band's edge is where deep water starts. The deepest colour is
    also the background beyond the map, so the map has no visible border.
  - Land is pale with darker fertile meadows. Thickets are woodland: a soft green floor with ink-drawn trees on
    top, each a bumpy crown outline with a faint shadow. Most have a small curved shading stroke inside, placed and sized differently on each tree; about a third have none (`TREES.plain`). At the edge they are small
    scattered bushes, about a third as many as in the middle. They grow bigger over the first 48 px in, where the
    thicket gets too tight for bigger creatures, and closer together all the way to the middle of each patch (or
    112 px in, for a big patch), where they are packed and bigger than the creatures (`TREES`).
    Trees are drawn in rows from the top of the map down, so nearer crowns hide the ones behind. Rock is grey
    contoured plates. Rivers are pale blue with a
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
  out (`TS` = 0.8 and `LO` = 0.4 pixels per world px, kept low because the map is large). From a mid zoom inwards (`DETAIL`: 0.65 screen pixels per world px), the visible part is redrawn sharply. While zooming or panning, the last
  sharp image is stretched until the redraw catches up, and fades between seasons and after events keep the old
  map at full sharpness, so the map doesn't go blurry. From that zoom inwards, creatures stay under the trees,
  which are partly see-through (`TREES.alpha`), so creatures and food show through them.
- **Creatures** are seen from above.
  - Body: a pale body with an ink outline, an eye pair at the front, and legs as short ink bars along the sides.
  - Eyes: two small square eyes, black, or white on a dark species colour (lightness below `EYE_WHITE`, 40), so
    every member of a species has the same eyes even though shades vary slightly from creature to creature.
  - Legs: 4, or 6 from size 0.9 (`LEGS.sixFrom`), so they follow size and change as it evolves. They sit in
    pairs along the full-width part of the sides only, never at the front, at the back or where the body curves
    into the tail: the front pair splays forwards, the back pair backwards, and the front pair keeps clear of the
    mouth. On a short body the three pairs sit closer together. The bars' length shows the leg length trait (2.45
    to 5.2 px before the tail shortens them), and wider, shorter bars mean a creature that leans towards water.
  - Mouth: one black mouthpart at the front, from a snapping beak to a slightly trumpeted straw (see
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
- **Body traits are selected; colour marks the species.** Colour used to drift by chance, to show how long
  groups had been apart, but the drift was slow and hard to see. Now each species has one fixed colour and a new
  species gets a clearly different one, so species read at a glance and the split is a visible moment. This
  also replaced the *Creature colour* setting (body colour or species colour), since the two are now the same.
- **Leg count follows size, leg length evolves.** Small bodies have 4 legs and big ones 6, on the sides only,
  which keeps the front for the mouth and the back for the tail.
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
- **Every ability comes from the body you can see.** Speed, energy use, range and what food gives all come from
  size, legs, tail, roundness and mouth, so a new species always looks different from its parent. The old speed
  setting was replaced by leg length, the three thicket gap widths by a reach into thickets set by size, and nut cracking by a simple
  energy bonus for beaks. Width and length only matter through size, so long thin and short stubby designs are
  both fair choices. Each feature has a benefit and a cost: big bodies are thrifty but slow and kept to the
  edges of thickets, long legs walk fast but swim slowly and burn energy, and the tail, roundness and leg count each trade
  walking against swimming. Earlier, the tail replaced an invisible habitat setting and taper was removed (it did
  nothing for survival).
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
| How leg length, leg count and size set speed | `LEGS` |
| Energy burnt standing, moving, and by size | `BURN` |
| How far into thickets each size goes, and where nuts and bigger trees begin | `THICKET` |
| Size and spacing of thicket trees | `TREES` |
| Typical population level | `CRW` (bigger `half` means more crowding allowed, so larger populations) |
| How fast food regrows | `GROW` (smaller numbers mean faster regrowth and more creatures) |
| Season length, foods and event odds per season | `SEASON_LEN`, `SEASONS` |
| Event frequency, meteor and major odds | `EVENTS` |
| How easily species split | `SPC` (bigger `geo`/`eco` means rarer splits, smaller `ratio` means less clearly separate groups can split, bigger `extra` means fewer species at once); `SHOWS` for how much having a tail or 6 legs counts |
| River-crossing speed | `RIVER` |
| How far ahead creatures plan | `MAXT` |
| How far creatures stray from home, and how fast populations spread | `HOME` |
| World types: how often, land, thicket, rock, rivers, food, temperature | `WORLD_TYPES` |
| World shapes | `SHAPES` |
| How hilly the land is | `RELIEF` |
| Temperature: cold and hot levels, season shifts, energy costs | `TEMP` |
| Shallow shelf size and shape, and deep-water cost | `SEA` |
| Lakes: how many per world type, size, depth, their algae, algae for floods and craters | `lakes` in `WORLD_TYPES`, `LAKES` |
| How far tails let creatures go from shore and from water | `HAB` |
| Where tails start to show and count, and how long a full tail looks | `TAIL` |
| How much roundness helps swimming and blockiness walking | `ROUND` |
| Nut energy, how much beaks gain from nuts and straws from algae | `MOUTH` |
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
  - over an hour (use `study.py`), primus plus 1–3 new species, each clearly different and lasting a good while,
    with at most 3 alive at once

  Results vary from run to run, so compare batches rather than single runs.
- **`study.py [minutes] [workers] [worlds per type] [results file]`** is the long study: every world type (three
  worlds each by default, with a mix of shapes) and five designs on each (middling, fully random, small beaked
  walker, big long-legged walker, water creature), run several at a time. `python3 tests/study.py 45 4 3` makes 75
  runs of 45 minutes and takes about half an hour. Each run is saved as a line of JSON: populations at 10, 20 and 30
  minutes and at the end, time over 100, seasonal swing, new species with when and how each split happened,
  extinctions and their causes, exploration, how far each body trait moved, and which creature type each species
  ended up as.

The tests use `window.EvoQuestDebug`, a small read-only hook at the end of `js/main.js`. The bundled file leaves
it out.

### Single-file build

`python3 tools/build.py` writes `dist/evoquest.html`: the whole game in one file you can share or host
anywhere. `dist/` isn't stored in the repo, so run the build again whenever you need a fresh copy.
