/* EvoQuest configuration: every number worth tuning lives here. */

/* ---- world size and creatures ---- */
const MATURE = 15; // seconds old before a creature can breed
const LIFE = 90; // maximum lifespan in seconds
// ageing: from this age creatures slow down steadily, reaching this fraction of their speed at LIFE (0 = a halt)
const OLD = { from: 85, slowest: 0 };
const BG_MAX = 15; // in a hidden tab, the most real seconds of play caught up in one background tick
const AMB_VOL = 0.07; // loudness of an ambient note (1 = full volume), about level with the zoomed-in beat's snare
const AMB_ECHO = 0.028; // loudness of an ambient note's quieter octave echo
const BEAT_VOL = 0.22; // loudness of the zoomed-in beat at full zoom (scales every drum)
// the blip, once a second, while the world event sign flashes before an event (not at the event itself): pitch (Hz),
// length (s), loudness
const WARN_BEEP = { f: 880, dur: 0.09, vol: 0.06 };
// the password for the testing tools in Settings (change it here; it can't be changed in the game)
const TEST_PASSWORD = '1234';
// Extinction (Settings): impact = seconds until one huge meteor lands among the creatures, killing all within blast
// px; then small ones strike survivors every gap seconds; at end seconds every creature left dies (all game time)
const DOOM = { impact: 1, blast: 900, small: 5, gap: 0.35, end: 3.2 };
const AUDIO_CHECK = 2; // seconds between checks that the sound engine's clock is moving (a frozen one is replaced on the next click)
const W = 4512; // world width in px (GW cells of CS px)
const H = 3152; // world height in px (GH cells of CS px)
const CS = 16; // size of one terrain cell in px
const GW = 282; // terrain grid width in cells
const GH = 197; // terrain grid height in cells
const MAXPOP = 400; // safety limit only, far above normal numbers (crowding keeps populations near 100)
const RIVER = 14; // water speed (px/s) needed to swim across a river current
const FOOD = 8; // energy gained from one piece of food
// choosing food: each point of energy a food gives this creature beyond a berry's counts as this many seconds less
// travel, so a beak goes out of its way for nuts and a straw for algae
const FOOD_PREF = 1.5;
const START = 20; // number of creatures released at the start
// the founders are released already old enough to breed (MATURE plus up to this many seconds, spread so they don't
// all die of old age at once) and this full, so the population gets going without a long wait
const FOUNDERS = { age: 30, energy: 0.9 };
// a creature only eats food in front of it: within this angle (radians, about 35 degrees) of the way it faces, so the
// food goes into its mouth; close to food it turns on the spot to face it
const EAT_FACE = 0.6;
// where they are released: the place with the most food they can eat within near px, plus weight x the food they
// can reach within reach px without leaving ground they are allowed on
const RELEASE = { near: 180, reach: 640, weight: 0.5 };
// how steeply the sides of a sea channel drop, in height per cell; steep enough that the coast is crisp, while
// the heights still vary smoothly so the coastline is drawn as a curve rather than grid steps
const SEA_WALL = 0.03;
const EDGE = 10; // width in cells of the guaranteed sea margin inside the oval edge of the map
// land as a share of the whole (rectangular) map: each world type sets where it starts; floods and droughts keep
// it between min and max of the starting share, and aren't picked once land is below noFlood or above noDrought
// of it (all four are offsets from the world's starting share)
// strait: how deep the strait between the two starting landmasses is; 1.0 keeps it open at the start but lets a
// big drought close it in about a third of worlds
const LAND = { min: -0.18, max: 0.18, noFlood: -0.12, noDrought: 0.12, strait: 1.0 };
// world types: each world secretly rolls one, never shown to the player, so the same traits don't win everywhere
//   w: how often it is picked (relative weight; all 1, so each type is equally likely); land: starting land share [minimum, random extra]
//   split: chance of a strait splitting it into two landmasses at the start; seas: [fewest, most] extra sea
//   channels cutting it up; isles: 0 = solid landmasses, 1 = broken into many islands
//   rivers: [chance of a first, chance of a second]; thicket, rock: share of the starting land that is each
//   wet: added to how widespread low wetlands are (0 normal, + more, - fewer); food: [berry sites, algae sites]
//   temp: added to the whole world's temperature (0 normal, - colder, + warmer)
//   lakes: [fewest, random extra] lake basins carved into the land (see LAKES)
const WORLD_TYPES = {
  classic: {
    w: 1,
    land: [0.31, 0.04],
    split: 1,
    seas: [0, 0],
    isles: 0,
    rivers: [0.85, 0.55],
    thicket: 0.2,
    rock: 0.1,
    wet: 0,
    temp: 0,
    food: [375, 125],
    lakes: [2, 2],
  },
  archipelago: {
    w: 1,
    land: [0.2, 0.04],
    split: 0,
    seas: [0, 0],
    isles: 1,
    rivers: [0.3, 0],
    thicket: 0.2,
    rock: 0.06,
    wet: 0,
    temp: 0.05,
    food: [320, 250],
    lakes: [0, 1],
  },
  supercontinent: {
    w: 1,
    land: [0.42, 0.04],
    split: 0,
    seas: [0, 0],
    isles: 0,
    rivers: [1, 0.7],
    thicket: 0.18,
    rock: 0.08,
    wet: -0.05,
    temp: 0,
    food: [440, 60],
    lakes: [3, 3],
  },
  highlands: {
    w: 1,
    land: [0.33, 0.04],
    split: 1,
    seas: [0, 0],
    isles: 0,
    rivers: [0.85, 0.3],
    thicket: 0.08,
    rock: 0.28,
    wet: -0.12,
    temp: -0.08,
    food: [375, 125],
    lakes: [4, 3],
  },
  forest: {
    w: 1,
    land: [0.32, 0.04],
    split: 1,
    seas: [0, 0],
    isles: 0,
    rivers: [0.85, 0.55],
    thicket: 0.45,
    rock: 0.05,
    wet: -0.04,
    temp: 0,
    food: [400, 100],
    lakes: [2, 2],
  },
};
// lakes: basins carved into the land at least inland cells from the coast, radius r cells [smallest, random extra],
// their floors depth below the starting sea level [shallowest, random extra], so a big drought can drain the shallow
// ones and a flood can spread them. algae: algae sites per lake cell, on top of the world type's algae. flood: share
// of the world type's algae that waits, dormant, on low land a big flood would drown, growing once it does.
// crater: algae sites that start in each new crater's lake. slope: how much the ground falls per cell towards a lake's
// shore, and the floor per cell below it; shore: how many cells out from the shore the land slopes down to it
const LAKES = {
  inland: 5,
  r: [4, 6],
  depth: [0.03, 0.08],
  algae: 0.08,
  flood: 0.3,
  crater: 3,
  slope: 0.015,
  shore: 6,
};
// overall shape of the land, rolled separately from the type (relative weights): oval as before, lagoon (land in a
// ring around a central sea) or crescent (land curving round a big bay)
const SHAPES = { oval: 4, lagoon: 1.5, crescent: 1.5 };
// regions: broad areas with their own character (thicket country, rocky uplands, low wetlands with lakes);
// strength 0 spreads thicket and rock evenly everywhere, 1 is the normal amount, higher is more extreme
const REGIONS = { strength: 1.3 };
// temperature comes from height: the highest land is coldest (0), the lowest warmest (1), water is mild (water);
// each season shifts it (spring, summer, autumn, winter). Below cold, creatures burn extra energy keeping warm,
// which hurts small bodies most; above hot they burn extra cooling down, which hurts big bodies most.
//   coldCost: extra energy per second at the coldest, for a mid-sized creature; heatCost: the same at the hottest
// sea depth is measured in shelf widths: 1 is where the shallow shelf ends and deep water starts on a plain coast.
// Each world's plain shelf is as wide as the nearest shelf share of its open sea at the start, as the shelf was
// before the map redesign, but never under minWidth px. Every coast has at least that tapering shelf; along some
// stretches the shallows reach further out, up to 1 + widen times as far, where a broad pattern is between wide[0]
// and wide[1] and above. Shallow banks rise out at sea where another pattern goes over bank[0], tapering bank[1]
// shelf widths of depth per unit of the pattern. Neither gets shallower than top: from top[0] (in the outer band)
// where a third pattern is below topAt[0], to top[1] (the shallowest band) where it is above topAt[1]. Both fade out
// over edgeFade cells inside the map's sea margin, so the open ocean round the map is always deep. Lakes are always
// shallow. Algae grows only on the shelf, thinning out with distance from shore (algaeFade px). In deep water,
// creatures burn up to deepCost more energy (none for fully aquatic ones). drought: share of the world type's algae
// that waits, dormant, in the deep water just beyond the shelf (up to beyond shelf widths past its edge), growing
// once a drought pulls the shallows out to it
const SEA = {
  shelf: 0.3,
  minWidth: 110,
  widen: 1.2,
  wide: [0.52, 0.72],
  bank: [0.77, 10],
  top: [0.84, 0.07],
  topAt: [0.45, 0.75],
  edgeFade: 14,
  algaeFade: 80,
  deepCost: 0.8,
  drought: 0.4,
  beyond: 0.5,
};
const TEMP = {
  cold: 0.3,
  hot: 0.8,
  water: 0.55,
  season: [0, 0.12, 0, -0.15],
  coldCost: 0.18,
  heatCost: 0.15,
};
const RELIEF = 1.5; // height of the ridges and hills added to land (0 = smooth land as before); high ground is cold
// tail (once called habitat): range = how far (px) a 50% tail goes from shore into water, and from water onto land;
// the limit grows quickly towards either end. first: every visible tail swims at least this far from shore (one
// cell, so into the first band of water), on top of the curve
const HAB = { range: 200, first: 16 };
// tail: min = the tail trait (hab) from which a tail shows and counts; below it the creature has no tail. From min
// to 1 the effective tail (c.tail) grows from 0 to 1, and that is what speed, range and drawing use.
// len = length of a full tail, as a share of body length; first = how long the smallest tail is, as a share of a
// full one, so a tail appears as a short proper tail rather than a spike (both drawing only)
const TAIL = { min: 0.15, len: 1.1, first: 0.3 };
// roundness: a fully round body swims swim faster and walks walk slower than a middling one (roundness 0.5); a fully
// blocky one the reverse, so water creatures drift smooth and round and land creatures blocky
const ROUND = { swim: 0.1, walk: 0.1 };
// mouths: each creature's mouth runs from a snapping beak (0) through tweezers and prongs to a sucking straw (1).
//   nut: energy from a nut for a middling mouth (x FOOD); how many thicket food sites are nuts is in THICKET
//   bonus: a beak gets 1 + bonus times the energy from a nut and 1 - bonus from algae; a straw the reverse;
//   berries give every mouth the same (the tail doesn't change what food gives)
const MOUTH = { nut: 1.25, bonus: 0.25 };
const MOUTH_SPLIT = 0.6; // how much a difference in mouths counts towards a new species (the tail counts 1)
// features that are either there or not count extra towards a new species, since they make creatures look
// different: having a tail at all, and having 6 legs rather than 4
const SHOWS = { tail: 0.25, legs: 0.15 };
// speed comes from the body. A creature of size 0.9 with legs at 50%, no tail and roundness 0.5 walks at about
// base px/s; bigger bodies are slower, smaller ones faster.
//   land: how much leg length scales land speed [shortest legs, longest legs]; water: the shortest legs swim this
//   share faster and the longest this share slower (medium legs make no difference)
//   six: 6 legs walk this share faster and swim this share slower, 4 legs the reverse; sixFrom: the size from which a
//   creature has 6 legs rather than 4
// eyes are white on a species whose starting body is darker than this lightness, black otherwise
const EYE_WHITE = 40;
const LEGS = { base: 32, land: [0.4, 1.6], water: 0.15, six: 0.05, sixFrom: 0.9 };
// energy burnt per second: rest standing still, plus move x (speed / 30)^2 while moving, for a middling creature
// (size 0.9); size: the whole burn is multiplied by 1 + size x (0.9 - the creature's size), so bigger bodies burn less;
// stride: moving costs a further 1 + stride x (0.9 - size) times as much, so big bodies cover ground cheaply (long strides)
const BURN = { rest: 0.32, move: 0.81, size: 0.5, stride: 1 };
// thickets: size sets how far into a thicket a creature can go, measured from the thicket's edge (an edge cell is
// 16 px in). The biggest body (size 1.26) gets edge px in, a middling one (0.9) about 40, and the smallest (0.48)
// anywhere: edge + depth x ((1.26 - size) / (size - 0.48))^2.
//   deep: how far in (px) the middle of a thicket starts: from the edge to there, food grows more thickly, more of it
//   is nuts (nuts: [share at the edge, share from deep in]) and the trees on the map get bigger and closer together
const THICKET = { edge: 16, depth: 33, deep: 48, nuts: [0.2, 0.8] };
const VAR = 1.6; // how much offspring traits vary from their parent (1 = base amount)

/* ---- map rendering ---- */
const TS = 0.8; // resolution of the pre-drawn map image (pixels per world px)
const LO = 0.4; // resolution of the low-detail copy used when zoomed far out
// sea depth bands, shallowest to deepest, and the depths (in shelf widths, see SEA) where each deeper band starts;
// the last is the shelf's edge, drawn dashed. The deepest colour is also the background beyond the map
const BAND = ['#d2e0e5', '#c6d8de', '#b9cfd7', '#adc6cf'];
const BAND_AT = [0.27, 0.58, 1];
// thicket trees: crown radius in px [at the edge, from THICKET.deep in], plus up to jitter px more. Trees per cell
// [at the edge, in the middle of the patch] (on average): they grow closer together all the way to the middle of
// each patch, or to mid px in for a big patch, so the edge has a few small bushes and the middle big, packed trees
const TREES = { r: [5.5, 10.5], jitter: 2.5, per: [0.3, 1], mid: 112 };

/* ---- colours ---- */
// Okabe–Ito palette: a widely used colour set designed to stay distinguishable for colour-blind viewers
// each entry: [name, hex, hue, saturation, lightness]
const OKABE = [
  ['Orange', '#E69F00', 41, 100, 45],
  ['Sky blue', '#56B4E9', 202, 77, 63],
  ['Bluish green', '#009E73', 164, 100, 31],
  ['Yellow', '#F0E442', 56, 85, 60],
  ['Blue', '#0072B2', 202, 100, 35],
  ['Vermilion', '#D55E00', 26, 100, 42],
  ['Reddish purple', '#CC79A7', 327, 46, 64],
];
// each species is one colour: primus keeps the creator's colour, and a new species takes the palette colour most
// unlike every living species'. Individuals differ only in shade, up to SHADE lightness points either way
const SHADE = 4;
// seconds a new species' creatures take to blend from the old colour to the new one
const SPLIT_FADE = 1.5;
const INK = '#151918'; // the ink colour used for outlines and text

/* ---- seasons and food ---- */
// per season, how quickly each kind of place regrows food: f fast, n normal, s slow
const SEASONS = [
  {
    name: 'Spring',
    col: '#009E73',
    grow: { plain: 'f', meadow: 'f', thicket: 's', island: 'n', water: 'n' },
    ev: { flood: 5, drought: 1, quake: 3 },
    msg: 'Spring. Meadows and plains regrow fast; the thaw brings floods.',
  },
  {
    name: 'Summer',
    col: '#F0E442',
    grow: { plain: 's', meadow: 'f', thicket: 'n', island: 'f', water: 'n' },
    ev: { flood: 1, drought: 5, quake: 3 },
    msg: 'Summer. Open plains turn dry and yellow; meadows and islands thrive. Droughts are likely.',
  },
  {
    name: 'Autumn',
    col: '#E69F00',
    grow: { plain: 's', meadow: 'n', thicket: 'f', island: 'f', water: 'n' },
    ev: { flood: 3, drought: 2, quake: 4 },
    msg: 'Autumn. Thickets and islands are fruiting; open land is going bare.',
  },
  {
    name: 'Winter',
    col: '#56B4E9',
    grow: { plain: 's', meadow: 's', thicket: 's', island: 's', water: 's' },
    ev: { flood: 4, drought: 1, quake: 3 },
    msg: 'Winter. Snow on the peaks; food is slow to return on land and in the water. Storms bring floods.',
  },
];
// fast forward: how much faster; the most real seconds it can store (it drains while on); real seconds to refill
// from empty to full while off
const FAST = { speed: 4, dur: 20, cool: 120 };
const CHART_SPAN = 1200; // most seconds of history an inspector chart shows at once (20 minutes); a slider moves back
const SEASON_LEN = 150; // seconds per season (2.5 minutes, so a year is 10 minutes)
// regrowth time in seconds for each speed: [minimum, random extra]; winter multiplies all land regrowth
const GROW = { f: [16, 5.5], n: [19, 7.5], s: [23.5, 7.5], winter: 1.1 }; // regrowth seconds [minimum, random extra] for fast, normal and slow regions; tuned in scenario tests

/* ---- world events ---- */
// first: when the first event comes, gap: time between events, both as [minimum, random extra] seconds
// (no random extra: one event every 7 minutes, like clockwork)
// meteor: chance an event is a meteor; major: chance an event is a major one
// each pair below is [normal, major]
// shift: how far floods and droughts move the land share of the map (0.12 = 12 percentage points)
// blast: meteor kill radius in px; crater: crater radius in cells
// splits: new splits per earthquake; seaSplit: chance each split is a sea channel rather than a river
// dry: rivers dried up and sea channels closed per drought (each) at least; dryShare: or this share of them if
// more, so the more splits there are, the more a drought undoes; they turn straight back into land
const EVENTS = {
  first: [420, 0],
  gap: [420, 0],
  meteor: 0.05,
  major: 0.1,
  shift: [0.12, 0.2],
  blast: [190, 280],
  crater: [7.5, 11],
  splits: [1, 2],
  seaSplit: 0.3,
  dry: [1, 2],
  dryShare: [0.25, 0.5],
  // floods widen every river and sea channel by widen (normal, major) and droughts narrow them again, never below
  // the width they started at nor wider than seaMax cells; a river toSea cells wide becomes a sea channel (and a
  // sea channel that began as a river turns back into one when it narrows below that)
  widen: [1.35, 1.6],
  toSea: 2.6,
  seaMax: 6,
  warn: 7, // seconds before an event that the world event sign starts flashing with its symbol
  show: 2, // real seconds the sign stays bright orange once the event happens
};

// screen shake, each [normal, major]: amp = how far the view jolts in screen px, dur = seconds until it settles,
// delay = seconds before it starts (the meteor's, to land with the boom of the impact; skipped when the device
// asks for reduced motion)
const SHAKE = {
  quake: { amp: [6, 10], dur: [1.6, 2.2], delay: 0 },
  meteor: { amp: [5, 8], dur: [0.5, 0.7], delay: 1 },
};

/* ---- behaviour ---- */
// home ranges: each creature has a home (where it was born) and prefers food within r px of it; food further out
// counts as pull extra seconds of travel for every r px beyond; below starving (share of full energy) creatures
// range wider, up to 1 + hunger times r when nearly empty; a newborn's home lands up to disperse px from its
// parent's home, which is how a population slowly spreads; the founders' homes are spread up to founders px
// around the release spot
const HOME = { r: 250, pull: 6, hunger: 3, starving: 0.5, disperse: 100, founders: 450 };
const MAXT = 22; // furthest a creature will plan, in seconds of travel
// crowding: r = radius that counts as neighbours (px); breeding chance = 1 / (1 + (neighbours/half)^pow)
const CRW = { r: 80, half: 2, pow: 2 }; // tuned with home ranges: local groups can be denser before breeding slows

/* ---- speciation ---- */
// geo: trait difference needed between groups on separate land; eco: between two clusters on the same land
// ratio: how clearly separated the clusters must be; streak: consecutive 5-second checks the split must hold
// age / cool: seconds a species must exist, and wait after a split, before it can split again
// extra: how much harder each additional living species makes the next split
// min: fewest creatures a new species can start with; same: a group this close (in trait difference) to a species
// already alive doesn't split off; size: how much size counts in the trait difference
const SPC = {
  geo: 0.22,
  eco: 0.4,
  ratio: 1.8,
  streak: 4,
  age: 90,
  cool: 110,
  extra: 0.9,
  min: 12,
  same: 0.2,
  size: 1.5,
};
