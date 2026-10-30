# EvoQuest

Design a species, release 20 of them onto a randomly generated island world, and watch the world decide what
they become. Food, terrain, seasons and world events shape their bodies over generations. Every species lives one
of four ways (in the water, in the thickets, on the plains or in between), and creatures that take up another way
of life become that species.

**Play online:** https://sam-sheridan.github.io/evoquest/

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

1. **The intro** opens every time the game loads (see [the intro](#the-intro)).
2. **Design** a species in the creator. You set its name, body, look and which world to use.
3. **Release.** 20 creatures (`START`) appear together on the main landmass (or in the water near it, for a
   design that lives in water). The release spot is chosen for the food the design can eat within 180 px, plus half
   the food it can reach within 640 px without leaving ground it's allowed on (`RELEASE`). So a water design isn't
   left in a rich but cut-off strip of shallows at the map's edge when a longer coast or a river network is on
   offer. The founders start with 90% energy and already
   old enough to breed, aged 15 to 45 seconds (`FOUNDERS`), so the population gets going without a long wait. Their ages are spread so
   they don't all die of old age at the same moment, which used to halve the population at about 70 seconds. Their
   traits are varied 1.5 times more than normal so selection has something to work on straight away.
4. **The simulation runs.** Food regrows, creatures plan routes to food, eat, breed and die. Seasons change
   every 2.5 minutes. A world event happens every 12 minutes.
5. **Evolution.** Offspring inherit their parent's traits with small random changes. Traits that help
   creatures eat and breed in this world become more common.
6. **Speciation.** If part of the population gets cut off or settles into a different way of life, it can
   become a new species with its own Latin name.
7. **The run ends** only when every creature of every species has died. There is no win condition and no time
   limit. You can also end a run at any time with *Extinction* in Settings, which brings up the end screen, where
   you can start a new species.

Time in this README means game time. At 2× or 4× speed everything happens faster in real time. Times in the game
are shown as m:ss, and as hh:mm:ss from an hour on (for example 01:12:01).

---

## 2. The species creator

### The intro

Every time the game loads, a title screen comes up first: the name large in the middle ("Evo" in ink, "Quest" in
orange), the line "Design a species. Release it. Watch the world decide what it becomes.", and "A game by Sam
Sheridan" in the bottom right corner. Behind it, on squared paper, 10 random creatures (6 on a phone-sized screen,
`INTRO`) wander round the page, drawn 2.6 to 4 times life size. They are random designs like *Randomise* makes, one of
each palette colour in turn, drawn with the game's own creature drawing, and they walk at a speed that follows their
real land speed. They keep clear of the title, the screen's edges and each other, and stop now and then to snap their
mouths.

*How it works* opens five panes, each with a small moving picture; *Skip to the creator* goes straight to the
creator. Each pane has Back (Title on the first), Next and Skip, and dots to jump to any pane; the arrow keys move
between panes and Esc closes the intro. The creatures carry on behind the panes, faded. Every pane's card is the
height of the tallest, so the card and its buttons never move between panes, and each picture starts from the
beginning when its pane is reached.

1. **Design a species**: one creature changing smoothly from one random design to the next, with its size, tail
   and mouth written under it.
2. **Release it into the world**: a stretch of coast with berries, nuts under thicket trees and algae in the
   shallows, a beaked walker standing still eating a nut and a straw-mouthed swimmer eating algae.
3. **Eat, breed, die. Repeat.**: a creature walks to a berry, eats, its energy bar fills and it has one offspring, with a
   caption for each step (loops every 9 seconds, `INTRO.loop`).
4. **The world keeps changing**: the four seasons and the four world events, with the game's own symbols.
5. **Evolve into new species**: a family tree growing across the picture, with *vulgaris* carrying on and *natans*
   and *campestris* branching off, using the genus of the creator's current name. Its last button, *Get Started*, closes the intro. Back and Next stay the same size on every pane, so the dots
   never move.

Clicking **EvoQuest** at the top left of the creator opens the intro again.

### The creator

| Control | What it does |
|---|---|
| **Species name** | Up to 20 characters. Also becomes the Latin genus (see [naming](#10-speciation-and-naming)). |
| **Width, Length** | Body traits, 1 to 7. They only matter through the body's **size**, so a long thin creature and a short stubby one of the same size do equally well. A bigger body is slower but holds more energy, so it goes further on a full tank and roams further from home, and can't go as far into thickets. |
| **Tail** | Body trait, none (a land creature) to full (a water creature). Below 15% there is no tail ("None · land only"); a tail shows and counts from 15%. A bigger tail swims faster but walks slower, and lets the creature go further from shore but less far from water. You can see it: the back of the body curves into a longer tail. |
| **Mouth** | Body trait, from beak to straw. A beak gets more from nuts; a straw gets more from algae. The label names the shape (Beak, Slim beak, Tweezers, Prongs, Straw) and the stats under the preview give how much it gets from each. |
| **Roundness** | Body trait, 0 (blocky) to 1 (round). Softens the body's corners. A rounder body swims more cheaply (streamlining: less drag); on land it makes no difference. |
| **Colour** | Under the name. One of the 7 Okabe–Ito colours (a palette designed to stay distinguishable for colour-blind players). |
| **World** | A new random world, the current world, or any world from a past run. Each world has a number (its seed) and the same number always builds the same world. |
| **Randomise** | The refresh button in the preview's top right corner. Random name (two made-up syllables from a list of 40, sometimes with an "s": 3,200 possible names, or 1,600 different Latin genus names, since the genus drops a trailing "s"), body (tail and mouth included), colour and shape. |
| **Release into the world** | Starts the run, releasing 20 creatures (`START`). |

The **preview** shows the creature at 7× zoom with a 10 px scale bar. Every few
seconds it acts out eating, so you can see its mouth snap. There is no text beside the headings or under the
sliders. Under the preview, **tags** list every stat the sliders change, in four rows:

1. Size, land speed and water speed (px/s).
2. How far it swims out from shore and how far it walks inland from water. These run from 0 px (never) to
   2000 px (`RANGE_CAP`; past that the limit no longer matters on this map, so 2000 px means anywhere).
3. Energy store, energy burnt per second walking flat out, and the energy it gets from a nut and from algae.
4. How far into thickets it goes (up to 200 px, which reaches every thicket's middle), and whether it swims or wades across rivers.

Each tag is filled from the left like a bar, showing where its value sits between the lowest and highest any
design can have (worked out once, over a grid of designs covering every slider's range). Energy burnt uses a log
scale, since a few extreme designs burn far more than the rest. Rivers is either/or, so its tag has
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
| Tail (`hab`) | 0–1 | Below 0.15 (`TAIL.min`): no tail, fully land. From 0.15 a tail shows and counts, up to 1 = full tail, fully water. (The code calls it `hab` because it began as an invisible "habitat" setting; now you can see it as the tail.) |
| Mouth (`mth`) | 0–1 | 0 = beak, 1 = straw (see [mouths](#mouths)). |
| Roundness (`round`) | 0–1 | 0 = blocky, 1 = round. Changes the energy cost of swimming by up to 50% (see below). |

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
- **Legs**: drawn as 4, or 6 from size 1.0 (`LEGS.sixFrom`), the same size at which a body counts as *campestris*, and
  all the same length (`LEGS.len`). They are only a look: they don't change speed, energy or speciation. (Leg length
  was a trait until October 2026, with long legs walking faster and short ones swimming faster. It was removed
  because it adapted to nothing: the adaptation test (`tests/adapt.py`) found it followed no place on the map, only
  drifting shorter, and it was barely visible. Legs are now fixed at what was the middle length.)
- **Base speed** = 48 ÷ (0.6 + size) (`LEGS.base` × 1.5). Big bodies are slower: 32 px/s at size 0.9, 44 at the
  smallest and 26 at the biggest.
- **Effective tail** = (tail − 0.15) ÷ 0.85, and 0 below 0.15. Everything below uses this, so 15% and below
  behave exactly alike, as a creature with no tail.
- **Land speed** = base × (1 − 0.85 × tail).
- **Water speed** = base × (0.15 + 0.85 × tail).
  Roundness doesn't change speed. It is streamlining, which makes swimming cheaper instead (see
  [energy](#energy)): a smooth body meets less drag, which is why fish, seals and tadpoles all converge on it. On
  land roundness makes no difference, so land creatures' roundness drifts freely by chance and separate
  populations can end up blocky or round, while swimmers turn smooth and round. (Until 30 October 2026 it changed
  speed instead: first ±10%, with round bodies also walking 10% slower, a cost with no natural cause; then ±25%
  in water only. The adaptation test found neither followed anything, because a faster creature also burns more
  energy per step, so speed alone is no advantage.)
  A creature with no tail still swims at 15% of its base speed. One with a full tail walks at 15%.
- **Range.** Only a creature with no tail (0%) goes anywhere on land, and only one with a full tail (100%)
  anywhere in water. Everything in between has two limits:
  - it swims at most 16 + 200 × (tail ÷ (1 − tail))² px from shore (`HAB.range`, `HAB.first`), so every visible tail
    gets into at least the first band of water
  - it walks at most 70 × ((1 − tail) ÷ tail)² px from water (`HAB.inland`; 200 before October 2026): amphibious
    creatures stay near the water's edge, leaving the interior to true walkers

  | Tail (slider) | Effective tail | Swims from shore | Walks from water |
  |---|---|---|---|
  | 0–15% | 0 | never enters water | anywhere |
  | 16% | just above 0 | 16 px | anywhere |
  | 32% | 0.2 | 29 px | 1120 px |
  | 41% | 0.3 | 53 px | 381 px |
  | 49% | 0.4 | 105 px | 158 px |
  | 58% | 0.5 | 216 px | 70 px |
  | 66% | 0.6 | 466 px | 31 px |
  | 83% | 0.8 | 3216 px (anywhere, in practice) | 4 px (never leaves water, in practice) |
  | 100% | 1 | anywhere | never leaves water |

  Water is always at least one cell (16 px) from land and land from water, so a limit under 16 px means never. Every
  visible tail swims at least 16 px, so only a tailless creature never enters water, while a tail above about 81%
  never leaves it. The creator and the specimen tab say "Never enters water" or "Never leaves water" for these.

  So a 67% creature lives along coasts and lakesides, and being in between is no longer a free pass.
- **Food energy** doesn't depend on the tail or size; the mouth decides it (see [mouths](#mouths)).
- **River crossing.** Swimming across a river's current needs water speed of at least 14 px/s (`RIVER`), and the
  creature must swim at least 16 px from shore, which every visible tail does. In practice a tail of about 33% or
  more is needed to swim that fast, depending on size and roundness. Every other creature **wades** across instead,
  at 35% of its walking speed (`WADE.speed`), as land animals ford streams, so rivers slow walkers down but no
  longer trap them on one piece of land. The creator's chip says "Swims rivers" or "Wades rivers".
- **Reach** = half the longest side + 4 px.
- **Energy capacity** = 30 + 25 × size: 42 for the smallest, 62 for the biggest. Energy burn doesn't depend on
  size, so a bigger tank simply lasts longer: standing still, a full tank lasts about 130 seconds for the smallest
  and 195 for the biggest.
- **Home range** grows with size, from 150 px for the smallest to 350 px for the biggest (`HOME.r`): big animals
  roam further (see [choosing food](#choosing-food)).

### Mouths

Every creature has one mouthpart at the front, which changes shape gradually along the mouth trait:

| Mouth | Look | Energy from a nut | Energy from algae |
|---|---|---|---|
| 0 (Beak) | a stout beak that snaps shut | 15 | 1 |
| 0.25 (Slim beak) | a slimmer beak | 11.5 | 4.5 |
| 0.5 (Tweezers) | straighter jaws that stay a little open | 8 | 8 |
| 0.75 (Prongs) | two thin prongs with a small gap | 4.5 | 11.5 |
| 1 (Straw) | the prongs closed into one tube that flares slightly at the end | 1 | 15 |

- **Nuts and algae mirror each other**: a middling mouth gets 8 from either, the same as from a berry (`FOOD`),
  the right mouth 7 more and the wrong one 7 less (`MOUTH.gap`), changing evenly in between. So the mouth only
  matters where nuts or algae grow: a middling mouth does equally well on every food. A straw can hardly crack a nut, and a beak is
  poor at sipping algae.
- Until 30 October 2026 the two weren't mirrored: a middling mouth got 1.25 times a berry from a nut (10) but only
  a berry's worth from algae (8), and the mouth added or took away a share of that, so a beak got 16 from a nut
  and a straw 12.8 from algae, and a middling mouth did better on nuts than on berries. The mirrored numbers centre
  on a berry's 8 and stay round.
- That share was 25% until October 2026. Then the adaptation test (`tests/adapt.py`) showed beaks didn't take hold in
  thickets at all: a 0.1 beakier mouth earned only about 2% more food over a life, too little to beat chance and
  the newcomers that keep arriving from the open land around each thicket (about 3 in 10 thicket dwellers have a
  parent from outside it). Widening the gap to 60% made mouths follow water strongly (straws by water in 36 of 41
  runs, up from 27 of 38) but still not thickets (beakier in thickets in 18 of 31, chance): berries were still
  half of a thicket dweller's food. Since thickets grow only nuts, beaks take hold there too (beakier in thickets
  in 28 of 34 runs).
- **Berries** give every mouth the same 8.

So a world full of thickets favours beaks and a watery world favours straws, and the mouth evolves like any other
body trait. Between the two ends, the beak stretches into tweezers, the tweezers straighten into prongs, and from
0.75 the prongs close together into a single straw with a slight trumpet at the end. The mouth is always drawn in
charcoal. The jaws snap quickly
while the creature eats and open and close gently the rest of the time. Mouths, like eyes and legs, are only drawn
when zoomed in.

Designs from before mouths existed (saved past lineages) start with a mouth of 0.5, and the leg length that designs
saved before 30 October 2026 carry is ignored. Designs saved when tails counted
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

The middling design (width 4, length 4.5, no tail, roundness 0.5) is size 0.90 (drawn with 4 legs), goes 40 px
into thickets, walks at about 32 px/s, swims at about 5 px/s, can't cross rivers, and holds about 53 energy.

### Colour: one per species

Colour has **no effect on survival**, and it doesn't evolve. Each species is a single colour, so species can be
told apart on the map at a glance:

- **The released species** is the colour you chose in the creator.
- **A new species** gets the one of the 7 creator colours that looks most unlike every species so far
  (`newColour()`, using a weighted RGB distance). With at most four species in a run, each keeps its own colour,
  including one that dies out and comes back.
- **Individuals** differ only in shade: each newborn is up to 4 lightness points lighter or darker than its
  species' colour (`SHADE`), so a crowd doesn't look cloned. The shade doesn't build up over generations.
- **When a creature moves to another species**, it blends from the old colour to the new one over 1.5 seconds
  (`SPLIT_FADE`), round the colour wheel the short way so they stay bright rather than passing through grey.

The same colour is used for the species everywhere: on the map, in the Species tab, the Stats chart, the family
tree and the end screen.

### Inheritance

Each trait on each newborn independently has a **30% chance of copying the parent exactly**. Otherwise it
moves by a random amount up to:

| Trait | Maximum change per generation |
|---|---|
| Width, length | ±0.8 (that is 0.5 × `VAR`, and `VAR` = 1.6) |
| Tail, mouth | ±8 percentage points (0.05 × `VAR`) |
| Roundness | ±0.08 (0.05 × `VAR`) |

Traits are then held inside their allowed ranges. `VAR` scales body-trait variation only.

---

## 4. Energy, eating, breeding and death

### Energy

- **Burn per second** = 0.32 + 0.81 × (current speed ÷ 30)², plus temperature, and more in deep water (`BURN`). It
  is the same for every size: only the tank grows with size.
  - Standing still costs a little; moving fast costs a lot, because of the squared term. That is the cost of
    a small, fast body.
  - **Swimming** (moving through water): the moving part is multiplied by 1 − 0.5 × (2 × roundness − 1)
    (`ROUND.swim`), so a fully round body pays 50% less to swim than a middling one and a fully blocky one 50% more.
    This is streamlining, and a big gap is realistic: a blocky shape meets many times the drag of a streamlined one.
  - Small bodies are faster, so on the move they burn more: walking flat out, the smallest burns about 2.1 a
    second, a size-0.9 creature 1.2 and the biggest 0.9. Per px travelled the smallest pays about 4.7 energy per
    100 px and the biggest about 3.6, so on a full tank a big creature can travel roughly 1,700 px and a small one
    about 900. That is how big bodies cope with food spread far apart, and small ones need food close together.
  - Until 30 October 2026 bigger bodies also burned less overall (`BURN.size`: the smallest 21% more than a
    size-0.9 creature, the biggest 18% less) and paid up to 30% less to move (`BURN.stride`). Both were removed:
    a big animal doesn't burn less in total than a small one in nature.
  - **Cold** (see [temperature](#temperature)): keeping warm costs up to 0.18 × (1.4 − 0.6 × size) energy per
    second (`TEMP.coldCost`), so small creatures pay most: about 0.20 for the smallest, 0.16 for a size-0.9
    creature and 0.12 for the biggest.
  - **Heat**: cooling down costs up to 0.15 × size² per second (`TEMP.heatCost`), so big creatures pay most: about
    0.03 for the smallest, 0.12 for a size-0.9 creature and 0.24 for the biggest.
  - Both are the cost at the very coldest or hottest spot. The cost starts at nothing at the edge of the cold or hot
    zone (see [temperature](#temperature)) and grows steadily towards the extreme, so a creature somewhere in the
    zone typically pays about half. For comparison, a size-0.9 creature burns 0.32 a second standing and about 1.2
    walking, so temperature adds roughly 5–15% to a moving creature's costs.
  - **Deep water**: the whole burn is multiplied by 1 + 0.8 × (1 − tail) (`SEA.deepCost`). A creature with no
    tail burns 80% more there; one with a full tail burns nothing extra.
  - The creator shows the burn when walking, without temperature or deep water.
- **Food**: a berry gives 8 energy (`FOOD`), and nuts and algae 1–15 depending on the mouth (see
  [mouths](#mouths)). Energy never goes over the creature's capacity.
- After eating, a creature **rests** for 0.8–1.4 seconds (burning only the standing cost), then plans its next
  meal.

### Breeding

A creature may breed when it eats **and** all of these are true:

- it is at least 15 seconds old (`MATURE`)
- its energy after eating is at least 75% of capacity (`BREED.full`; 85% before October 2026, when most runs struggled to grow past about 20)
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
| Land | It is within its walking range of water (always true with no tail, 15% or less; a 32% tail still walks over 1,000 px from water). | Land speed |
| Thicket | It is no further from the thicket's edge than its size allows (see [traits](#body-traits-shaped-by-the-world)), plus the land rule. | 85% of land speed for size 1.0 or more, easing to full land speed at size 0.75 or less: small creatures slip through the undergrowth (`THICKET.slow`) |
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
  piece is regrowing or already has three creatures heading for it), it heads for the nearest such food and, once
  within 60 px of it, ambles round it at half pace rather than standing still (`AMBLE`), looking again every second
  or two. Only if there is no food at all in range does it wander further.
- **Home range.** Every creature has a **home**: for the founders, a spot near where they were released; for everyone else,
  a spot up to 100 px from their parent's home (`HOME.disperse`). The founders' homes are spread up to 450 px
  around the release spot (`HOME.founders`), so they don't all compete for one patch of food. Each creature's
  range grows with its size, from 150 px for the smallest to 350 px for the biggest (`HOME.r`; 250 px for every
  size until 30 October 2026), as big animals roam further. Food beyond the range counts as 6 extra seconds of
  travel for every further range's worth (`HOME.pull`), so creatures prefer food near home.
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
  1.5 seconds less travel (`FOOD_PREF`). A beak gets 15 from a nut, so a nut counts as 10.5 seconds closer, and
  a straw's algae (15) the same. So creatures go out of their way for the food their mouth suits, which
  pulls mouths, and the ways of life that go with them, apart.
- The route is then smoothed into straight lines wherever the way is clear.

### Moving

- Creatures turn at most 3 radians a second and move at half speed while turning sharply. Close to the next point
  on their route (within 20 px) they turn on the spot instead. Without this, a creature could circle a point for ever without ever
  quite reaching it. A creature waiting by regrowing or busy food never stands still: within 60 px of it, it
  ambles round it at half pace.
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
| **Rock** | The top part of a "rock" noise pattern, on land (the share is set by the world type), weighted by region. Impassable. Drawn as angular crags (see [how things are drawn](#15-how-things-are-drawn)). There is no tiny rock: a piece under 6 cells becomes open ground (`ROCKS.minCells`), including after events. |
| **River** | A meandering channel cut right across the map, coast to coast, at any angle. Strong current. |

### World types and shapes

Each world secretly rolls a **type** from its world number, each type equally likely. The player never sees it: the point is that you have
no say in the world, and different worlds favour different designs. All the numbers are in `WORLD_TYPES`.

| Type | How often | Land at start | Strait | Thicket | Rock | Food (land sites / algae) | Temperature |
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
   is filled in. The pass is cut into the rock pattern itself, so later events can't seal it again. The opposite
   way round, a piece of rock smaller than 6 cells becomes open ground, here and whenever an event reshapes the land.
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
- **How much land is cold or hot**, on an ordinary world: in spring and autumn the highest 30% of land is cold and
  the lowest 20% hot; in summer 18% cold and 32% hot; in winter 45% cold and 5% hot. Highlands have more cold land
  and archipelagos more hot.
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
| **Berries** (orange) | Open land | 320–440 land food sites (berries and nuts together) are drawn up, depending on the world type, more likely on fertile ground, in thickets (where they are nuts, most towards the middle) and on islands. Open land is sparse, though: only some of its berry sites grow, from 20% on the poorest ground to 75% on the most fertile (`BERRIES`), about two thirds overall, so berries are far apart on dry plains and closer together on meadows. That suits big bodies, which go further on a full tank (thinned from 30 October 2026; before, every site grew). |
| **Nuts** (acorns) | Thicket | Every food site in a thicket grows nuts, just as all food in water is algae (until October 2026 thickets also grew berries, with nuts 1 in 5 at the edge rising to 4 in 5 in the middle). Richer than berries for a beak, much poorer for a straw (see [mouths](#mouths)). |
| **Algae** (green) | Shallow shelf, rivers and lakes | 60–250 sites, depending on the world type, in rivers or on the sea's shallow shelf (not in the outer margin). On top of that, lakes get 8 sites for every 100 lake cells, so a world with big lakes has much more algae (a supercontinent, with 60 in its seas, ends up with about 120–190). Another 30% of the world type's algae waits on low land a major flood would drown, and grows only once the water arrives, and 40% waits in deep water just beyond the shelf, for when a drought moves the shallows out. On top of all that, **open-water beds** half as many again as the world type's algae grow out at sea, at least 200 px from any land (`SEA.open`, `SEA.openFrom`): food only strong swimmers reach. Each new meteor crater's lake starts 3 algae sites. |

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
- **meadow**: land in the more fertile 45% of the fertility range, shown greener (the map's green and straw
  colours follow fertility, fading into each other)
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

- The first event comes exactly 12 minutes into a run (`EVENTS.first`).
- After that, one comes every 12 minutes (`EVENTS.gap`), with no random variation. A 30-minute run sees two
  events, at 12 and 24 minutes. Events don't line up with seasons: a year is 10 minutes, so each event comes 2
  minutes later in the year than the one before, and they work through spring, summer, autumn and winter in turn.
- There is **no timer** on screen. For the last 7 seconds before an event (`EVENTS.warn`), the **world event
  sign** (bottom left) flashes orange with the coming event's symbol, then stays bright orange for 2 seconds once
  it happens (`EVENTS.show`). Major events look the same there.

### Which event

- **1 in 7** events (about 14%) is a meteor (`EVENTS.meteor`).
- Otherwise the event is picked by the current season's weights (see the table above). Some events are ruled
  out when they would push the world too far:
  - no drought when land is more than 12 points above where the world started (`LAND.noDrought`)
  - no flood when land is more than 12 points below where it started (`LAND.noFlood`)

  So an archipelago starting at 20% land can grow to about 32% (a classic world's amount) and a supercontinent
  can shrink to about 32% too: world types can turn into one another.

  When a drought is ruled out, its share of the odds goes to floods, and when a flood is ruled out, its share
  goes to droughts. (Earlier, those shares went mostly to earthquakes, which grew to about half of all events.)
- **No more than 2 floods in a row, or 2 droughts in a row** (`EVENTS.streak`). After two floods, the next event
  can't be a flood: it is picked from the other kinds by their usual odds (the same for droughts). A meteor or
  earthquake in between breaks the run. Earthquakes and meteors have no such limit. Events fired from the testing
  buttons don't count towards a run.

  There is no limit on rivers or sea channels: droughts dry them up again, and the more there are, the more each
  drought undoes, so the map doesn't keep breaking up over hours of play.
- **10%** of events are **major** (`EVENTS.major`).

### What each event does

| Event | Normal | Major |
|---|---|---|
| **Flood** | Sea level rises: land falls by 12 percentage points of the map (never more than 18 below where the world started, `LAND.min`). Low land and its food go underwater. Every river and sea channel widens by 35%, and a river that reaches 2.6 cells wide becomes a **sea channel** (`EVENTS.widen`, `toSea`). | Land falls by 20 points, and rivers and sea channels widen by 60%. |
| **Drought** | Sea level falls: land rises by 12 points (never more than 18 above where it started, `LAND.max`). New land appears and islands may join the mainland, and big droughts can even close the main strait. A quarter of the rivers dry up and a quarter of the sea channels close (at least one of each, if there are any). The rest narrow by the same share a flood widens them, but never below the width they started at; a sea channel that began as a river turns back into one when it narrows below 2.6 cells. | Land rises by 20 points. Half the rivers dry up and half the sea channels close (at least two of each), and the rest narrow by the share a major flood widens them. |
| **Earthquake** | One new split cuts across the map. It is a river, or 30% of the time a **sea channel**: a wider cut of open sea that land creatures can't cross the way strong swimmers cross a river. | Two new splits, each with its own 30% chance of being a sea channel (so at least one sea channel about half the time). |
| **Meteor** | Hits a land spot near the creatures: within 250 px of a random living one (`EVENTS.near`), so it usually strikes a population. Kills every creature within 190 px. Leaves a crater: an irregular rock rim with a gap, and a small lake in the middle, where 3 algae sites start growing. | Kills within 280 px and makes a much bigger crater. |

Sizes and chances are in `EVENTS` in `js/config.js` (`shift`, `blast`, `crater`, `splits`, `seaSplit`, `dry`,
`dryShare`, `near`).

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

### Four ways of life

Every species is one of four types, each a way of life with its own Latin name (`TYPES`):

| Species | Way of life | Body |
|---|---|---|
| *natans* | water | a tail of at least 50% (counting from where a tail starts to show), whatever its size or mouth |
| *silvicola* | thickets | small (size 0.8 or less) with a beak-like mouth (0.4 or less, on the beak 0 to straw 1 scale), and not water |
| *campestris* | plains | large (size 1.0 or more), any mouth, and not water |
| *vulgaris* | in between | everything else |

Water comes first: a creature with a clear tail is *natans* whatever else it is. So there are never more than four
species alive at once, and species look clearly different on average. Individual creatures near a border can
look alike, though (see the margin below): a *vulgaris* with a 55% tail can sit beside a *natans* with a 45% one.

The **released species** is whichever type the creator's design falls into, and keeps the colour you chose. There
is no *primus*: release a water creature and the run starts with *natans*.

This is the "ecological" idea of a species (a group with its own way of life) rather than "creatures that can
interbreed", which doesn't apply here: reproduction is asexual, each newborn a slightly changed copy of one parent.
(Sam chose this in October 2026, replacing splits found by trait clusters, which could leave one species holding
several quite different body types.)

### Moving between species

Newborns take their parent's species. As traits drift, some creatures end up living another way. Every 5 seconds:

- Each creature **leans** towards a type. That is its own species' type unless it is clearly outside it: at least
  one margin past the border (`TYPES.margin`: 8 points of tail, 0.04 of size or 8 points of mouth). Then it leans
  towards the type it now fits best. A creature's body never changes during its life, so its lean is set by how it
  was born. The margin works across generations: newborns are slightly changed copies, so a family living near a
  border keeps having young on both sides of it. Without the margin, a child just over the line would move to the
  other species and its own child, back over the line, would move back again, leaving a herd speckled with both
  colours. With it, a child just over the line stays in its parent's species, and only a line that has clearly
  moved changes. The cost is an overlap: between 42% and 58% tail, for example, a creature can be *natans* or
  *vulgaris* depending on its family.
- A creature leaning towards another type **joins** that species if it is alive and at least **3** other creatures
  within **200 px** lean the same way or already belong there (`TYPES.join`, `TYPES.radius`). It blends into the new
  colour over 1.5 seconds (`SPLIT_FADE`), keeping its own shade.
- To **found a new species** (or bring back one that died out), at least **6** creatures leaning that way must be
  within 200 px of one of them (`TYPES.found`), and their average must be **two margins** inside the new type
  (`TYPES.deep`: a 66% tail for *natans*, for example), so a new species starts clearly different.
- Only creatures living the same way count towards each other. A few small beaked creatures at a thicket's edge can
  become *silvicola* even beside a big plains herd, while a lone creature with no like-minded neighbours stays with
  the species around it, so you don't see one stray *natans* in a crowd of *vulgaris*. A group can take a couple of
  checks to change completely, since creatures at its edge have fewer neighbours.
- When the last members of a species move to others, the log says so ("The last Blorbus vulgaris have become
  natans"). When a species dies out and creatures later take up its way of life again, it **comes back** under the
  same name and colour, with a notification, and the family tree shows each stretch it was alive.

Because creatures can move in both directions, creatures from different species can end up in one type: species
here describe how creatures live, not a single line of descent. The family tree shows where each species first came
from.

(Earlier versions, all October 2026: each creature moving on its own left stray creatures of one species inside
crowds of another; needing members of the new species nearby left species' averages drifting from their type;
judging whole herds by their average let big herds swallow the few thicket dwellers beside them, so *silvicola*
almost never formed. Counting like-minded neighbours fixed all three.)

In 75 hour-long study runs (October 2026, with the habitat changes in section 16): 60 had at least one new species
(median 14 minutes before the first), with up to 4 alive at once, and 102 of 118 new species lasted to the end of the
run. New species by type: *campestris* 46, *vulgaris* 32, *natans* 31, *silvicola* 9. Every world type had runs
with each type. 15 times a species died out and came back. 8 of the 75 runs died out altogether.

### Names

- **Genus** comes from your species name: lower-cased, letters only, a trailing "s" and vowels removed, then
  "-us" added. "Blorbs" becomes *Blorbus*.
- The **epithet** is the type: *natans* (swimming), *silvicola* (woodland-dwelling), *campestris* (of the plains)
  or *vulgaris* (common).
- Each species gets its colour when it first appears: the palette colour most unlike every species so far, so all
  of a run's species keep different colours.

A notification headed **"A new species has formed!"** welcomes it by name, for example "Welcome the first Blorbus
natans." The event log keeps the same line.

### The earlier species system (live until 28 October 2026)

Kept here in case it is wanted back. Until 28 October 2026 species were **family lines found by splitting**, not
the four ways of life: a species split in two when part of it was cut off on separate land, or drifted into a
clearly separate cluster of traits. The founding species was always *primus*, and new species were named after
the trait that most set them apart. Its strengths were variety (any combination of traits could become a species,
with a name describing how it changed) and a true family tree. It was replaced because it could leave one species
holding several quite different body types while another species looked almost the same, its rules were hard to
predict, and splits got much harder as more species were alive.

**To bring it back:** the whole game as it was is commit `1f8ffd9` on `main` (the last commit before the four types
were merged). The species code is `checkSpeciation`, `kmeans2`, `split`, `EPI`, `vec`, `centroid` and `dist` in
`js/sim.js`, and `SPC`, `MOUTH_SPLIT` and `SHOWS` in `js/config.js`; the founding species and *primus* are in
`newGame` in `js/sim.js`. Later changes would need joining up by hand: species' `spans` (dying out and coming back),
`aliveFor`, the four-type achievements, the intro's family tree names and the study test, which records new species
by hooking `found` rather than `split`. The description below is the README's own from that time.

#### When a new species forms

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

**Trait difference** is measured only on the body traits that change how a creature lives: size (× 1.2,
`SPC.size`), leg length (× 0.75, `SPC.leg`), tail (× 1.3, `SPC.tail`), mouth (× 0.9, `MOUTH_SPLIT`) and roundness
(× 0.5). What a creature eats (its mouth) and where it lives (its tail) count for more than how big it is or how
long its legs are, as in real animals, where a change of diet or habitat is a classic start to a new species. Colour never makes a new
species (each new species is given its own), and width and length count only through size, so two
groups that only look a little different stay one species. Having a tail at all counts extra (`SHOWS`, 0.25), because it changes how creatures live and look even when the
tail trait has barely moved. (The number of legs drawn doesn't count: it only follows size.)

**No copies.** A group that would be within 0.2 of a species already alive (`SPC.same`) doesn't split off, so a
species can't split into a copy of one that already exists.

Species never merge back together.

#### Names

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
| Changing of the Guard | A newer species outlives the one you released |
| Tree of Life | All four species in one run |

---

## 12. The screen: controls, bars and inspector

### Top left: status

Your species' colour, name and genus, then: creatures alive · species alive · highest generation · time
(· paused / extinct).

### Top: controls

| Button | What it does |
|---|---|
| Play / pause | Pauses the simulation. |
| Fast forward (⏩) | Runs the game at 8×. It works like a battery holding up to 40 real seconds (`FAST`): it drains while on, switches itself off when empty, and refills while off, from empty to full in 2 minutes. Press it to start and press again to stop; it can be started whenever at least a second is stored. A ring round the icon shows the charge; hover to see how much is stored. It is greyed out while a testing speed above 1× is set. |
| Notepad | **Event log**: the last 50 events, seasons, achievements and new species, with times. |
| Medal | **Achievements** for this run (the menu shows how many you have). |
| Cog | **Settings**: *Extinction (end run)* (press it twice, the second time when it says "Click again to confirm": one huge meteor lands among the creatures a second later, five small ones follow, and about 3 seconds after pressing every creature is dead and the end screen appears (`DOOM`). It's a way to start again rather than a world event, so it leaves no craters), *Sound* on/off (all sound: the music, ambient notes, creature sounds and event effects). **Testing tools** show only a password box until you enter the password (`TEST_PASSWORD`, 1234 to begin with) and press *Unlock*: a green tick means it's right and the testing options appear until the page is reloaded, an orange cross means it's wrong and they stay hidden. The password can't be changed in the game; to change it, edit `TEST_PASSWORD` in `js/config.js`. It only keeps the tools out of casual reach, since anyone reading the code can find it. **Testing: speed** sets 1×, 2×, 4× or 10×, handy for checking things quickly. **Testing** event buttons fire a flood, drought, earthquake or meteor straight away, normal or major (the *Major* toggle). They always do exactly what they say, even past the usual land limits, and don't move the next scheduled event (which kind it will be is chosen again, since the land may have changed). |
| ? | **Help**: pauses the game and puts a short label beside each part of the screen (your species, the controls, the inspector's tabs, the season clock, the world event sign and the map), with an orange outline round the part it explains. Labels move clear of each other, and parts hidden behind something (the season clock under an open inspector on a phone) get none. Press ? again to take the labels away and carry on (still paused if the game was paused before). It closes by itself if the run ends. |

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
  - **Table**: a **Released** column first, with the released design's traits (its population is left empty), then one column for every species, living ones first and extinct ones
    at the far right, greyed out and marked †. Every column has the same fixed width, so the table doesn't shift as
    species change. Numbers are shown to one decimal place (size to two). When there are too many to fit, the table
    scrolls sideways while the row names stay in view. The first row
    is a drawing of each species' average creature (its average traits, in the species' colour), all at
    one scale, at the same height and right-aligned above the values. Then: population (on the end screen,
    each species' peak), time alive (how long the species has existed, or did), size, tail length (in px, or None), mouth
    (Beak to Straw) and roundness (Blocky, Squarish, Rounded or Round). Stats such as speed are in the Stats tab
    instead. In each species' column, the one or two traits that most set it apart from the species it first
    came from are highlighted in orange, with a tooltip saying so (there is no note under the table). In the
    inspector the released species has no highlights, since it didn't come from anything (on the end screen it is
    compared with the released design). A trait counts only if it
    differs notably: by 0.06 in size, 0.2 in roundness, or 12 percentage points in the tail
    or mouth traits.
- **Stats**
  - **Chart**: pick Population, Land speed, Water speed, Swims from shore, Walks from water, Energy use (burnt per
    second walking flat out, without temperature or deep water), Energy store, Into thickets (how far, in px) or
    Swims rivers (the share of a species that can swim across a river rather than wade, never shown above 100%). One line per species, of the species' average. Distances
    beyond 2,000 px (more than most of the map, so in practice "anywhere") count as 2,000, and thicket reach beyond
    200 px counts as 200, so a few unlimited
    creatures don't swamp the average. For population, a thin black line shows the total. The dashed line is the
    released design's value. A chart shows at most the last 20 minutes (`CHART_SPAN`). After that a **slider**
    appears under it: drag it left to look back through earlier time, and right to the end to follow the present
    again.
  - **Even spacing.** The charts keep one point every 6 seconds for the whole run (`HIST.step`), so the start of
    an hours-long run looks the same as the latest minutes. (Earlier, history was halved whenever it grew long,
    so the oldest part kept getting coarser while the newest stayed fine.) Only after 12 hours (`HIST.max`, 7,200
    points) is every other point dropped and the spacing doubled, evenly across the whole run. Counts,
    extinctions and achievements are still checked every 2 seconds.
- **Specimen**: tap any creature on the map to select it. The camera follows it automatically (dragging the map
  stops following). The tab shows its:
  - generation, parent, offspring and meals
  - energy and age
  - its stats: land and water speed, range (how far it goes from shore and from water), how far into thickets it
    can go, mouth type and how it feeds (the energy it gets from a nut, from algae and from a berry)

  Its visible features (size, tail, roundness) aren't listed: you can see them on the creature, and the
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
- **Scroll or pinch** to zoom. You can zoom out to a little beyond the whole world and in to 6×. A run starts at
  1× (`START_ZOOM`), centred on the released species.
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
  (none greyed out, since all have died), and the released design as the first column, headed **Released** as in
  the inspector. Here the released species' one or two most changed traits are highlighted against the released
  design, the same way other species are against the species they came from.
- **Family tree**: every species as a line through time, with a marker every minute (every few minutes on long
  runs, so the labels don't overlap). Branches show which species each first came from. A
  thick line means still alive at the end, and a tick marks each time it died out (a species that came back has
  more than one stretch).
- **Achievements**: every achievement, the ones earned this run in full and the rest greyed out.
- **Watch replay** plays the whole run back at 12 recorded moments per second. A moment is recorded each
  second of game time, and the gap between recordings doubles on very long runs to save memory.
- **Past lineages**: your last 10 runs.

Past runs (up to 30) are saved **in your browser on that device**, not online. Clearing browser data, or
playing on another device or browser, starts the list fresh.

---

## 14. Sound

The title music, the zoom music, the end music, the ambient notes and the creature sounds are Sam's own, made in GarageBand. The achievement chime, the warning blip and the world event effects are generated live in the browser.

| Sound | Details |
|---|---|
| **Title music** | Sam's track (`audio/title.mp3`), a 16-bar loop at 88 bpm, plays on repeat on the title screen, the intro panes and the creator, at `TITLE_MUSIC.vol` (0.35). It fades in over 1.5 s and fades out over 1.5 s when a species is released, and starts again when the creator comes back after a run. Browsers only start sound after a click or key press, so on first load it begins with the first one (usually *Start* on the title screen). The *Sound* setting turns it off too. |
| **Ambient notes** | Sam's recorded notes (`audio/ambient.mp3`: D4 F4 G4 C5 D5 F5 G5 C6, one every 2 bars at 88 bpm in one file; the game plays the slice for each note). Every 1.2 s, a 60% chance of one at random, at `AMB_VOL` (0.2). 35% of the time an echo follows 0.2 s later at 40% of the loudness (`AMB_ECHO`, 0.08): the same note at double speed, so an octave up and half as long. Plays while a run is going, not while paused. The notes fade out as the zoom music fades in, notes still ringing included: full at 1× zoom, half at 1.5× and silent from 2× (`AMB_GONE`), where the zoom music is at half, so the two only overlap at the zoomed-out end. They replaced generated sine notes (A3 B3 D4 E4 G4 A4 B4) in October 2026. |
| **Creature sounds** | Sam's recordings: one for eating (`audio/eat.mp3`), one for a birth (`birth.mp3`) and one for a death (`death.mp3`), cut from one GarageBand file. Loudness 0.15 (`CRT_SOUNDS.vol`), varied at random by up to 25% either way each time (`CRT_SOUNDS.vary`), so a crowd doesn't sound mechanical. Only for creatures on screen when zoomed in to 1.8× or more, or the selected creature. At most one every 0.07 s. The death sound is only for a creature dying: the end of a run makes no sound. They replaced generated tones (a tick, a two-note rise and a low note) in October 2026. |
| **Achievement / new species** | A three-note chime. |
| **World event warning** | While the world event sign flashes, before an event, a short high blip once a second, on every other flash (`WARN_BEEP`). Only in the run-up, not as the event happens, and not while paused. |
| **World events** | Each has its own effect, louder and longer when major, with no musical notes: flood (rushing water), drought (dry hiss), earthquake (low rumble with a shudder), meteor (whistle then a boom). |
| **Zoom music** | Sam's second track (`audio/zoom.mp3`), a 16-bar loop at 88 bpm (44 s). It plays through each run but is only heard when zoomed in: it fades in from 1× zoom, is at half loudness at 2× and reaches full loudness (`ZOOM_MUSIC.vol`, 0.9, where 1 is the track exactly as exported) at 3×. A run starts at 1×, so it is silent at the starting view, and it goes quiet while paused. Because it keeps running when zoomed out, zooming in again picks up wherever the track has got to rather than restarting it. It replaced a generated drum beat (50 bpm semiquavers: kick, hat, hat, hat, snare, hat, hat, hat) in October 2026. |
| **End music** | Sam's track (`audio/end.mp3`) on repeat on the end-of-run screen and through its replay: 16 bars at 88 bpm (44 s). Loudness 0.45 (`END_MUSIC.vol`), which makes it about as loud as the title music, as the recording is a little quieter. Fades in over 1.5 s, and fades out as the creator opens and the title music returns. |

**Adding or replacing music.** Export the loop from GarageBand as WAV (Share → Export Song to Disk), with the cycle
region set exactly to the bars that loop. `python3 tools/music.py track.wav audio/name.mp3` converts it to MP3 and
prints the loop length for `js/config.js`. If the file runs on past the loop (a reverb tail, or stray parts later on),
`--bars 16 --tail 3` takes 16 bars as the loop and mixes the next 3 bars onto its start, leaving out the rest. The MP3 holds the loop followed by its first second again: MP3 decoders
add a few milliseconds of silence at the start (different amounts in different browsers), so the game loops between
0.5 s and 0.5 s + the loop length, where there is always real music, and the repeat has no gap.
`tools/build.py` puts the files in `audio/` inside the single-file build.

Browsers pause a page's sound when it's hidden or the device sleeps. The game wakes it again when the page comes
back into view, and on the next tap or key press if the browser insists on one.

Some browsers can also leave the sound engine "playing" (the speaker shows on the tab) while nothing comes out, often
after the Mac sleeps or the audio device changes. So every 2 seconds the game checks that the engine's clock is
moving; if it is frozen, or the engine won't wake, a fresh engine replaces it on the next click or key press.
Turning *Sound* off and on in Settings always starts a fresh engine, as a sure cure for silence.

**Sound goes out through an audio element.** On some Macs, browsers keep sound sent straight to the speakers
silent, even though the tab shows the speaker, while sound from an audio element (the kind of player YouTube
uses) is heard. So all the game's sound feeds a hidden audio element, started by the click that releases a
species. Browsers that can't do this send sound straight to the speakers instead.

---

## 15. How things are drawn

The world is a **diorama**: stepped, low-poly land and water like a painted relief model, with low-poly
creatures, seen through a clean, scientific interface (as if observing a real world through a researcher's
instruments). Sam chose this in October 2026, replacing the inked **field notebook** map (see the end of this
section). The
diorama's numbers and colours are in `DIO` in `js/config.js`, and its drawing in `js/diorama.js`.

- **Text.** Two fonts from one family: IBM Plex Sans for writing and IBM Plex Mono for numbers, labels and
  times. Every piece of text uses one of seven sizes (`--fs-xs` to `--fs-3xl` at the top of `css/style.css`:
  11, 12, 13, 15, 17, 22 and 28 px); only the title screen's big name and tagline scale with the window. Charts
  and the family tree use the smallest size for their labels.
- **Favicon and link preview.** The browser tab icon is a sky blue creature with the shortest possible tail on a
  pale tile with the title screen's grid; the phone home screen icon is the same without the rounded corners
  (phones round them). Both were drawn by the game's own creature code. The link preview (the card shown when
  the link is shared) is the title on the grid beside the diorama map of world #159 just after a release of
  vermilion creatures, with thickets, rocks and a lake. They are fixed pictures in `img/`; changing the game's look
  doesn't update them.
- **Land: terraces.** The land's height is split into 7 steps (`DIO.levels`), each holding about the same share of
  the land, measured against the world's original heights so floods and droughts don't recolour what remains.
  Each step is a flat plateau seen slightly from the south: its side shows as a darker band 4 px tall below every
  edge that faces down the screen (`DIO.rise`), with a soft shadow at its foot and a light line along its edge.
  Edges are angular, low-poly lines (`DIO.straight`). Rivers don't cut the steps: the steps run on across a river
  as if it weren't there, so they don't crowd down into it.
  - Colours run from pale yellow-green on the lowest step to deeper green on the highest, every other step a touch
    lighter, and change with the seasons (`DIO.grass`): fresh in spring, yellower in summer, olive in autumn, pale
    in winter with the top two steps under snow (`DIO.snow`). Sam asked for calmer, less saturated colours.
  - A **sand beach** lines every coast and river bank (`DIO.beach`), and the land drops into the water as a sandy
    cliff with white foam at its foot (`DIO.coast`).
  - Meadows (fertile ground) are washed a little greener and dry ground a little straw-coloured (`DIO.wash`),
    drawn as a small smoothed image. There are no contour lines or hill
    shading: the steps show the height.
  - **Temperature** shows as a frosty wash on cold high ground and a faint warm wash on hot lowland
    (`DIO.temp` sets their strength), drawn as a small image as before.
- **Thickets** have a soft green floor with **low-poly trees** on top: a jagged crown raised above its foot, filled
  in a middle green with lit faces towards the north-west and shaded faces away (`DIO.trees`, by season: orange
  and gold in autumn), with a faint shadow on the ground. Size, spacing, the see-through mix and the rule that no
  tree reaches onto rock are set by `TREES`. Lone trees on open land are the same trees with a
  short trunk. (There are no pines: Sam's choice, October 2026.)
- **Rock** is a mauve slab with a dark side below its edges, its top split into flat faces lit from the north-west,
  and paler tiers stacked on top, each with its own side (`DIO.rock`). In winter the tiers are snow. The outline,
  faces, tiers and crater walls come from the same shapes as before (`ROCKS`).
- **Sea.** Soft sea-glass colours from pale aqua shallows to slate-blue deep water (`BAND`), in the same depth bands
  (`BAND_AT`), each a step of the seabed with its own side and a light lip (`DIO.sea`). The deepest colour is also
  the background beyond the map.
- **Rivers** keep their stepped edges (Sam's choice) and run a little deeper down the middle. There are no arrows:
  instead white streaks of different lengths drift along three lanes, each at its own speed (`DIO.river`). Each
  river flows from the higher end of the land it crosses towards the lower (only a look: the current just slows
  creatures crossing).
- **Moving water.** Wave lines roll in towards every coast and lake shore, two at a time, from about 100 px out,
  fading in at the outer edge and out at the shore (`DIO.seaMotion`). The open sea further out is still (Sam tried
  small ripples and large swells there in October 2026 and preferred it still). The waves and the river streaks
  are drawn fresh every frame over the map, only where they are on screen, and not when zoomed right out.
- **Map key.** The World tab's key is drawn from the same colours as the map (`dioLegend`).
- **Detail.** When zoomed out, a pre-drawn image of the map is used, plus a lower-resolution copy when very far
  out (`TS` = 0.8 and `LO` = 0.4 pixels per world px, kept low because the map is large). From a mid zoom inwards (`DETAIL`: 0.65 screen pixels per world px), the visible part is redrawn sharply. While zooming or panning, the last
  sharp image is stretched until the redraw catches up, and fades between seasons and after events keep the old
  map at full sharpness, so the map doesn't go blurry. From that zoom inwards, creatures stay under the trees,
  which are partly see-through (`TREES.alpha`): 40% of trees are the most see-through, 35% a bit more solid,
  20% more solid again and 5% almost fully solid, so creatures and food show through most of them.
- **Creatures** are seen from above, drawn low-poly with a thin outline (`DIO.creature`).
  - Body: four flat faces (the spine splits left from right, a crease splits front from back), each lit by how
    much it faces the north-west light; a slightly raised darker side; a thin outline in a dark shade of the
    creature's own colour; and, on the map, a soft shadow on the ground. Pictures on paper (the creator, the species
    table in the inspector and at the end of a run, the title screen and the diagram panes) have no shadow.
  - Eyes: two small square eyes, near-black, or white on a dark species colour (lightness below `EYE_WHITE`, 40), so
    every member of a species has the same eyes even though shades vary slightly from creature to creature.
  - Legs: 4, or 6 from size 1.0 (`LEGS.sixFrom`, 0.9 before October 2026), so they follow size and change as it evolves (only a look). They sit in
    pairs along the full-width part of the sides only, never at the front, at the back or where the body curves
    into the tail: the front pair splays forwards, the back pair backwards, and the front pair keeps clear of the
    mouth. On a short body the three pairs sit closer together. The bars are all 3.8 px long (`LEGS.len`) before the tail
    shortens them, and wider, shorter bars mean a creature that leans towards water.
    They are drawn in a dark shade of the creature's own colour.
  - Mouth: one charcoal mouthpart at the front, from a snapping beak to a slightly trumpeted straw (see
    [mouths](#mouths)).
  - In water, the back half is tinted by the water with a light waterline, and white arcs trail behind, spreading
    wider the further they are from the body. (Sam tried a foam trail in October 2026 and preferred the arcs.)
  - **Hops.** A creature on land hops as it crosses onto another terrace step: lifted briefly above its shadow,
    higher and slower going up than coming down (`DIO.hop`). It is only a look: it doesn't change how creatures
    move. Sam chose this in October 2026 so creatures don't glide over the steps as if the land were flat.
- **Food** is faceted like the trees (`DIO.food`): berries are red gems with a leaf, nuts faceted acorns, and algae
  a single blade of seaweed, broad at the top with a pointed stem below, its frilled edges rippling as it waves
  gently. Regrowing food is smaller and paler (regrowing algae shorter and yellowish). Zoomed out, food shows as dots in
  the same colours.
- **Intro.** The "Release it into the world" pane shows a diorama coast (seabed steps, beach, terraces, a low-poly
  thicket) and "Eat, breed, die. Repeat." a terraced meadow.
- **Effects.** A coloured ring for a birth, a grey cross for a death, an orange shockwave for a meteor.
- **The notebook look** (live until October 2026, deleted when the diorama shipped; it is in the git history,
  in any commit before the merge of `changes/2026-10-29-terraces`): an inked survey map with
  pale land, contour lines every ninth of the height range (every third bolder), ink-drawn scalloped trees, angular
  inked crags with hatching strokes, pale blue sea bands edged with thin lines, rivers marked with arrows, and pale
  creatures with black ink outlines, legs and mouths.

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
  species gets a clearly different one, so species read at a glance and a new species is a visible moment. This
  also replaced the *Creature colour* setting (body colour or species colour), since the two are now the same.
- **Legs are only a look.** Small bodies have 4 legs and big ones 6, on the sides only, which keeps the front for
  the mouth and the back for the tail, and all legs are the same length. The count used to change speed by 5%,
  which made a sudden jump at size 0.9 and duplicated what size already does. Leg length was a trait until 30
  October 2026 (long legs walked faster, short ones swam faster), but the adaptation test showed it followed no
  place on the map, it was barely visible and it repeated what size and the tail already do, so it was removed:
  every remaining trait has one clear job you can see.
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
- **Each way of life owns part of the world** (October 2026). With evolution switched off, a half-tailed creature
  used to support 5 to 10 times the population of a walker or a swimmer in every world type: it walked over most of
  the land, grazed the shoreline algae, and swam across the rivers that trapped walkers, so every design drifted to
  the same middle body. Rather than penalise the middle, three natural changes give the specialists back their
  ground: open-water algae beds only strong swimmers reach (as fish have the open sea), amphibians that stay near
  the water's edge, and land creatures that wade across rivers. Now the best body depends on the world: swimmers do
  best on archipelagos, walkers on supercontinents, part-tailed creatures on highlands and in forests. Walkers often
  still evolve a small tail, to wade out for shoreline algae, which is fine.
- **Big bodies are travellers; small ones live in dense cover** (30 October 2026). Energy burn is the same for
  every size and only the tank grows, so a big body goes further on a full tank, and big bodies roam wider home
  ranges, as big animals do. So food spread far apart (open land) favours big bodies and food close together in
  tight places (thickets) small ones, tied to the world rather than to an energy rule. Before, big bodies simply
  burned less, which isn't how nature works but was kept because a natural rule tried earlier in October (total
  energy use growing with size) made every design shrink to about size 0.7: nothing then gave big bodies a reason
  to exist.
- **Every ability comes from the body you can see.** Speed, energy use, range and what food gives all come from
  size, tail, roundness and mouth, so a new species always looks different from its parent. The old speed
  setting was replaced by leg length (itself removed in October 2026), the three thicket gap widths by a reach into thickets set by size, and nut cracking by a simple
  energy bonus for beaks. Width and length only matter through size, so long thin and short stubby designs are
  both fair choices. Each feature has a benefit and a cost: big bodies go far on a full tank but are slow and kept
  to the edges of thickets, a beak thrives on nuts but struggles with algae, the tail trades walking against swimming,
  and roundness makes swimming cheaper. Earlier, the tail replaced an invisible habitat setting and taper was removed (it did
  nothing for survival).
- **The sea edge is always water.** This avoids corner traps and odd edge behaviour.
- **Species are ways of life.** Four fixed types, so species always look different, there are never more than four
  alive, and the names mean the same in every run. Creatures move between them as they change (see section 10).
- **Meteors are occasional (about 1 in 7 events)** and dramatic.
- **Almost no player tools during a run.** You design, then watch. The one exception is controlling a single
  creature's movement: it follows every normal rule, so it lets you feel the world's pressures without steering
  evolution.
- **Max 3 creatures per food.** This stops crowds piling onto one berry.
- **Colours come from the Okabe–Ito palette** for colour-blind accessibility.
- **The music is original.** Sam made the title music, the zoom music and the ambient notes in GarageBand.

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
| Base speed (set by size), leg count and leg length drawn | `LEGS` |
| Energy burnt standing and moving | `BURN` |
| How sparse berries are on open land | `BERRIES` |
| How far into thickets each size goes, and where thicker food and bigger trees begin | `THICKET` |
| Size and spacing of thicket trees | `TREES` |
| How rock is drawn (faces, tiers, strokes, stones) | `ROCKS` |
| Typical population level | `CRW` (bigger `half` means more crowding allowed, so larger populations) |
| How fast food regrows | `GROW` (smaller numbers mean faster regrowth and more creatures) |
| Season length, foods and event odds per season | `SEASON_LEN`, `SEASONS` |
| Event frequency, meteor and major odds | `EVENTS` |
| Where the four species' borders are | `TYPES` (`water`, `thicket`, `plains`); `margin` for how far past a border a creature must be to lean elsewhere, `radius` and `join` for how many like-minded neighbours it needs to move, `found` and `deep` for how many and how clearly different they must be to found a species |
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
| How much roundness saves on swimming | `ROUND` |
| How much the mouth changes the energy from nuts and algae | `MOUTH` |
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
| `img/` | The favicon (`favicon-16.png`, `favicon-32.png`), the phone home screen icon (`apple-touch-icon.png`) and the link preview picture (`preview.jpg`) |
| `js/config.js` | **Every number worth tuning**: world size, seasons, food regrowth, crowding, speciation, events, colours |
| `js/util.js` | Shared helpers: random numbers, maths, saved runs, noise |
| `js/world.js` | World generation: coastlines, rivers, thickets, rocks, craters, food sites |
| `js/map.js` | Turning the terrain into shapes (marching squares, rock faces, tree placement), sharp and low-detail layers |
| `js/diorama.js` | The diorama look: terraces, sea, rivers and moving water, low-poly trees, rock, creatures and food, the intro's pictures and the World tab's key |
| `js/creatures.js` | Traits, inheritance, abilities, drawing creatures |
| `js/sim.js` | The simulation: route planning, eating, breeding, seasons, events, stats, speciation, achievements |
| `audio/` | Sound files: `title.mp3` (the title music), `zoom.mp3` (the zoom music), `end.mp3` (the end music), `ambient.mp3` (the ambient notes), and `eat.mp3`, `birth.mp3` and `death.mp3` (the creature sounds) |
| `js/audio.js` | All sound: the title and zoom music, the ambient notes, the creature sounds, and the generated chime, warning blip and event effects |
| `js/summary.js` | End-of-run summary, past runs, family tree, replay |
| `js/ui.js` | Status bar, season clock and world event sign, inspector, notifications, menus |
| `js/creator.js` | The species creator |
| `js/intro.js` | The intro: title screen and the five panes explaining the game |
| `js/main.js` | Camera, input, rendering each frame, the main loop |
| `tools/build.py` | Bundles everything, music included, into one HTML file in `dist/` |
| `tools/music.py` | Converts a looping WAV from GarageBand into the game's MP3 (see [Sound](#14-sound)) |
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

The tests need Python 3 and Playwright:

```
pip install playwright
playwright install chromium
python3 tests/smoke.py
python3 tests/scenarios.py 6 15
```

- **`smoke.py`** clicks through every feature (starting with every pane of the intro) and prints PASS or FAIL. Its
  random numbers come from a fixed seed, so it plays out much the same way each time, and if the major events it
  forces happen to wipe the population out, it releases again on the same world (up to three tries) rather than
  failing on a chance extinction.
- **`scenarios.py [runs] [minutes]`** runs full simulations as fast as possible across six test designs and
  reports population, seasonal swing, extinctions, new species, how much land was explored at 10 minutes, the
  population at 10 minutes and after 20, and the time per simulation step.

  The current settings aim for (use `python3 tests/scenarios.py 6 30` to see the later numbers):
  - about a quarter of the land explored at 10 minutes, with a population of roughly 20–50
  - populations mostly between 40 and 100 after 20 minutes
  - gentle seasonal swings
  - over an hour (use `study.py`), most runs see 1–3 new species appear and last a good while (at most 4 alive, by
    design)

  Results vary from run to run, so compare batches rather than single runs.
- **`study.py [minutes] [workers] [worlds per type] [results file]`** is the long study: every world type (three
  worlds each by default, with a mix of shapes) and five designs on each (middling, fully random, small beaked
  walker, big walker, water creature), run several at a time. `python3 tests/study.py 45 4 3` makes 75
  runs of 45 minutes and takes about half an hour. Each run is saved as a line of JSON: populations at 10, 20 and 30
  minutes and at the end, time over 100, seasonal swing, new species with when and how each split happened,
  extinctions and their causes, exploration, how far each body trait moved, and which creature type each species
  ended up as.
- **`adapt.py [minutes] [workers] [worlds per type] [results file]`** checks whether body traits **adapt** to
  where creatures live or just drift by chance. On every world it releases a middling design, a half-tailed one
  and a random one, and from 10 minutes on records each creature's traits and its home patch once a minute
  (water, near water or inland; thicket or open; high cold land or low warm land; how much land food grows near
  it). For each pair of places it compares a trait's average in every run with enough creatures in both, and
  counts how many runs went each way: drift goes either way and cancels out over many runs, adaptation goes the
  same way every time (a sign test gives the chance of the split by pure luck). `python3 tests/adapt.py 30 4 3`
  makes 45 runs of 30 minutes and takes about 25 minutes; `python3 tests/adapt.py --summary [results file]`
  prints the summary of an earlier run again.

  First results (30 October 2026, 45 runs): tail follows water strongly (more tail in water in 36 of 38 runs,
  near water 36 of 40) and bodies are smaller in thickets (30 of 32). Mouths lean towards straws in water (27 of
  38) but show nothing in thickets (17 of 32). Water creatures came out a little bigger than land ones (29 of 38).
  Size on high cold land, legs in water and roundness anywhere were down to chance, and legs shortened over most
  runs (29 of 42). With the wider mouth gap (`MOUTH.bonus` 0.6), mouths follow water in 36 of 41 runs but
  thickets are still chance (18 of 31). With thickets growing only nuts as well, mouths follow both: straws by
  water in 36 of 44 runs (about 14 points more straw-like) and beaks in thickets in 28 of 34 (about 5 points more
  beak-like). Leg length was then removed (it adapted to nothing), so the test no longer measures it.
  Roundness as streamlining (±25% swimming speed, no effect on land) still followed nothing (rounder in water in
  23 of 41 runs): faster swimming also burns more energy, so speed alone is no advantage. As energy saved when
  swimming it works: at 50% (`ROUND.swim` 0.5) creatures with water homes lean rounder (28 of 42 runs, about 5
  points), held back by amphibians that swim little, while full swimmers (tail 80% or more) are clearly rounder
  than tailless walkers (17 of 19 runs, about 20 points; at 30% it was 10 of 16). The test now makes this
  comparison too. With nuts and algae mirrored around a berry's 8 (14 / 8 / 2), straws by water got stronger (33 of
  36 runs, about 16 points) but beaks in thickets fell back to chance (17 of 33), in one batch. The gap was then
  widened to 7 (15 / 8 / 1), and every mouth and roundness comparison came out clear: beaks in thickets in 25 of 31
  runs (about 11 points, the strongest yet), straws by water in 35 of 39 (about 18 points), and creatures with
  water homes rounder in 31 of 39 (about 6 points).
  With the same burn for every size and home ranges growing with size, bodies stayed much smaller in thickets (35 of
  36 runs) and leaned bigger where land food is sparse (30 of 45, but only 0.01 of size), while shrinking over most
  runs (33 of 43, median 0.83 at 30 minutes, from about 0.9). Roundness showed nothing in that batch (21 of 42).

The tests use `window.EvoQuestDebug`, a small read-only hook at the end of `js/main.js`. The bundled file leaves
it out.

### Single-file build

`python3 tools/build.py` writes `dist/evoquest.html`: the whole game in one file you can share or host
anywhere. `dist/` isn't stored in the repo, so run the build again whenever you need a fresh copy.
