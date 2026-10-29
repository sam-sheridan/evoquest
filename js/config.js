/* EvoQuest configuration: every number worth tuning lives here. */

/* ---- sound ---- */
// Sam's ambient notes: the file, how many notes it holds and the seconds between their starts (2 bars at 88 bpm)
const AMBIENT = { src: 'audio/ambient.mp3', notes: 8, spacing: 5.454545 };
const AMB_VOL = 0.2; // loudness of an ambient note (1 = as recorded), when zoomed out (see ZOOM_MUSIC)
const AMB_ECHO = 0.08; // loudness of an ambient note's quieter octave echo (40% of the note)
// the zoom where the ambient notes have faded out: they fade from ZOOM_MUSIC.from (full) to here (silent), so they
// are gone while the zoom music is still rising
const AMB_GONE = 2;
// Sam's creature sounds (eating, birth, death), heard only for creatures on screen when zoomed in to 1.8x or more,
// or the selected one: files, loudness, and how far each one's loudness varies at random (0.25 = up to 25% either way)
const CRT_SOUNDS = {
  eat: { src: 'audio/eat.mp3' },
  birth: { src: 'audio/birth.mp3' },
  die: { src: 'audio/death.mp3' },
  vol: 0.15,
  vary: 0.25,
};
// the blip, once a second, while the world event sign flashes before an event (not at the event itself): pitch (Hz),
// length (s), loudness
const WARN_BEEP = { f: 880, dur: 0.09, vol: 0.06 };
// seconds between checks that the sound engine's clock is moving (a frozen one is replaced on the next click)
const AUDIO_CHECK = 2;
// Sam's title music, played on repeat on the title screen, the intro panes and the creator (made with
// tools/music.py): file, loop length (s, printed by tools/music.py), loudness, and seconds to fade in and out
const TITLE_MUSIC = { src: 'audio/title.mp3', loop: 43.636349, vol: 0.35, fadeIn: 1.5, fadeOut: 1.5 };
// Sam's zoom music, heard during a run when zoomed in: as TITLE_MUSIC, plus the zoom where it starts to fade in
// (from) and where it reaches full loudness (full); the ambient notes fade out as it fades in (see AMB_GONE)
const ZOOM_MUSIC = {
  src: 'audio/zoom.mp3',
  loop: 10.909093,
  vol: 0.9,
  fadeIn: 1.5,
  fadeOut: 1.5,
  from: 1,
  full: 3,
};

/* ---- settings and background play ---- */
// the password for the testing tools in Settings (change it here; it can't be changed in the game)
const TEST_PASSWORD = '1234';
// Extinction (Settings): impact = seconds until one huge meteor lands among the creatures, killing all within blast
// px; then small ones strike survivors every gap seconds; at end seconds every creature left dies (all game time)
const DOOM = { impact: 1, blast: 900, small: 5, gap: 0.35, end: 3.2 };
const BG_MAX = 15; // in a hidden tab, the most real seconds of play caught up in one background tick

/* ---- world size and creatures ---- */
const MATURE = 15; // seconds old before a creature can breed
const LIFE = 90; // maximum lifespan in seconds
// ageing: from this age creatures slow down steadily, reaching this fraction of their speed at LIFE (0 = a halt)
const OLD = { from: 85, slowest: 0 };
const W = 4512; // world width in px (GW cells of CS px)
const H = 3152; // world height in px (GH cells of CS px)
const START_ZOOM = 1; // zoom when a species is released, centred on it (more if the whole world fits wider)
const CS = 16; // size of one terrain cell in px
const GW = 282; // terrain grid width in cells
const GH = 197; // terrain grid height in cells
const MAXPOP = 400; // safety limit only, far above normal numbers (crowding keeps populations at about 40-100)
const RIVER = 14; // water speed (px/s) needed to swim across a river current
const FOOD = 8; // energy from a berry (nuts and algae give a multiple of it, depending on the mouth: see MOUTH)
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
// overall shape of the land, rolled separately from the type (relative weights): oval, lagoon (land in a
// ring around a central sea) or crescent (land curving round a big bay)
const SHAPES = { oval: 4, lagoon: 1.5, crescent: 1.5 };
// regions: broad areas with their own character (thicket country, rocky uplands, low wetlands with lakes);
// strength 0 spreads thicket and rock evenly everywhere, 1 is the normal amount, higher is more extreme
const REGIONS = { strength: 1.3 };
// sea depth is measured in shelf widths: 1 is where the shallow shelf ends and deep water starts on a plain coast.
// Each world's plain shelf is as wide as the nearest shelf share of its open sea at the start, but never under
// minWidth px. Every coast has at least that tapering shelf; along some
// stretches the shallows reach further out, up to 1 + widen times as far, where a broad pattern is between wide[0]
// and wide[1] and above. Shallow banks rise out at sea where another pattern goes over bank[0], tapering bank[1]
// shelf widths of depth per unit of the pattern. Neither gets shallower than top, set by a third pattern: top[0] (the
// middle of the outer band) where it is below topAt[0], top[1] (the middle band) up to topAt[1], and top[2] (the
// shallowest band) above. smooth: how many times depth is softened, which rounds its shapes off. Wider stretches
// and banks fade out over edgeFade cells inside the map's sea margin, so the open ocean round the map is always
// deep. Lakes are always shallow. Algae grows only on the shelf, thinning out with distance from shore (algaeFade
// px). In deep water, creatures burn up to deepCost more energy (none for fully aquatic ones). drought: share of
// the world type's algae that waits, dormant, in the deep water just beyond the shelf (up to beyond shelf widths
// past its edge), growing once a drought pulls the shallows out to it. open: algae beds out in open water, as a share of
// the world type's algae, at least openFrom px from any land: food only strong swimmers reach, as fish have the open sea
const SEA = {
  shelf: 0.3,
  minWidth: 110,
  widen: 1.2,
  wide: [0.52, 0.72],
  bank: [0.77, 10],
  top: [0.8, 0.42, 0.12],
  topAt: [0.55, 0.68],
  smooth: 5,
  edgeFade: 14,
  algaeFade: 80,
  deepCost: 0.8,
  drought: 0.4,
  beyond: 0.5,
  open: 0.5,
  openFrom: 200,
};
// temperature comes from height: the highest land is coldest (0), the lowest warmest (1), water is mild (water);
// each season shifts it (spring, summer, autumn, winter). Below cold, creatures burn extra energy keeping warm,
// which hurts small bodies most; above hot they burn extra cooling down, which hurts big bodies most.
//   coldCost: extra energy per second at the coldest, for a mid-sized creature; heatCost: the same at the hottest
const TEMP = {
  cold: 0.3,
  hot: 0.8,
  water: 0.55,
  season: [0, 0.12, 0, -0.15],
  coldCost: 0.18,
  heatCost: 0.15,
};
const RELIEF = 1.5; // height of the ridges and hills added to land (0 = smooth land); high ground is cold
// tail (once called habitat): range = how far (px) a 50% tail goes from shore into water; inland: the same for how
// far it walks from water onto land (amphibious animals stay near the water's edge); both limits grow quickly towards
// either end. first: every visible tail swims at least this far from shore (one cell, so into the first band of
// water), on top of the curve
const HAB = { range: 200, inland: 70, first: 16 };
// wading: a creature too weak a swimmer to cross a river's current (RIVER) can still wade across one at this share of
// its walking speed, as land animals ford streams (0: it can't)
const WADE = { speed: 0.35 };
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
// speed comes from the body. A creature of size 0.9 with legs at 50%, no tail and roundness 0.5 walks at about
// base px/s; bigger bodies are slower, smaller ones faster.
//   land: how much leg length scales land speed [shortest legs, longest legs]; water: the shortest legs swim this
//   share faster and the longest this share slower (medium legs make no difference)
//   sixFrom: the size from which a creature is drawn with 6 legs rather than 4 (only a look: it changes nothing)
const LEGS = { base: 32, land: [0.4, 1.6], water: 0.15, sixFrom: 1.0 };
// energy burnt per second: rest standing still, plus move x (speed / 30)^2 while moving, for a middling creature
// (size 0.9); size: the whole burn is multiplied by 1 + size x (0.9 - the creature's size), so bigger bodies burn less;
// stride: moving costs a further 1 + stride x (0.9 - size) times as much, so big bodies cover ground cheaply (long strides)
const BURN = { rest: 0.32, move: 0.81, size: 0.5, stride: 1 };
// thickets: size sets how far into a thicket a creature can go, measured from the thicket's edge (an edge cell is
// 16 px in). The biggest body (size 1.26) gets edge px in, a middling one (0.9) about 40, and the smallest (0.48)
// anywhere: edge + depth x ((1.26 - size) / (size - 0.48))^2.
//   deep: how far in (px) the middle of a thicket starts: from the edge to there, food grows more thickly, more of it
//   is nuts (nuts: [share at the edge, share from deep in]) and the trees on the map get bigger and closer together
//   slow: moving through a thicket is slow.by slower for bodies of size slow.big or more, easing to no slower at all
//   for size slow.small or less, since small creatures slip through the undergrowth
const THICKET = {
  edge: 16,
  depth: 33,
  deep: 48,
  nuts: [0.2, 0.8],
  slow: { by: 0.15, small: 0.75, big: 1.0 },
};
const VAR = 1.6; // how much offspring traits vary from their parent (1 = base amount)

/* ---- map rendering ---- */
const TS = 0.8; // resolution of the pre-drawn map image (pixels per world px)
const LO = 0.4; // resolution of the low-detail copy used when zoomed far out
// zoom (screen pixels per world px) above which the visible part of the map is redrawn sharply, with the thicket
// trees drawn over creatures; below it the pre-drawn map is used and creatures show on top of the trees
const DETAIL = 0.65;
// sea depth bands, shallowest to deepest, and the depths (in shelf widths, see SEA) where each deeper band starts;
// the last is the shelf's edge, where deep water starts. The deepest colour is also the background beyond the map
// map style: 'diorama' (stepped low-poly terraces, js/diorama.js) or 'notebook' (the inked field-notebook map).
// Adding ?map=notebook to the address shows the notebook map
const MAP_STYLE =
  typeof location !== 'undefined' && /[?&]map=notebook/.test(location.search) ? 'notebook' : 'diorama';
const BAND =
  MAP_STYLE === 'diorama'
    ? ['#bcddd2', '#9cc7c4', '#7eaab3', '#5f879b']
    : ['#d2e0e5', '#c6d8de', '#b9cfd7', '#adc6cf'];
const BAND_AT = [0.27, 0.58, 1];
// open land: wash, per season (spring, summer, autumn, winter), [meadow, dry ground] colours as [red, green, blue,
// strength], blended as a soft image so they fade into each other. hill: strength of the hill shading. lone: chance
// per open cell of a lone tree or small clump, [base, extra on the most fertile ground]
const OPENLAND = {
  wash: [
    [
      [150, 190, 110, 0.36],
      [222, 200, 140, 0.32],
    ],
    [
      [160, 190, 110, 0.26],
      [228, 196, 110, 0.36],
    ],
    [
      [185, 175, 110, 0.3],
      [220, 190, 130, 0.32],
    ],
    [
      [160, 180, 150, 0.22],
      [215, 210, 195, 0.28],
    ],
  ],
  hill: 0.13,
  lone: [0.02, 0.06],
};
// contour lines: [colour, width px] for ordinary lines and for the bold index lines (every third). halo: a soft
// band [colour, width px] drawn round each rock before it, so contours fade out just before reaching it (null: none)
const CONTOURS = {
  line: ['rgba(70,62,50,.26)', 0.8],
  bold: ['rgba(70,62,50,.34)', 1.1],
  halo: ['rgba(233,236,222,.7)', 12],
};
// rock is drawn as angular crags. minCells: pieces of rock smaller than this many cells are turned into open
// ground whenever the world is built or reshaped, so there is no tiny rock. straight: how far (px) an outline may wiggle before it gets a corner (bigger = longer straight
// edges). mesh: size (px) of the flat faces the slopes are split into. relief: how tall the rock is drawn, which
// sets how steep its faces are. minPeak: every rock's peak is lifted to at least this height (on the tiers' scale),
// rising towards 1 for the tallest, so even low rocks get faces and a tier. shore: over how many cells rock lowers
// towards water, ending in sea cliffs. flat: faces rising less than this share of relief count as flat and stay
// plain.
// shade: the plain fill of shaded faces, at every zoom. tiers: heights (0 at the rock's edge, 1 at the highest point on the map) of the paler inner
// outlines, each lightened by tier. tick: gap (px) between the strokes round the inside of the edge. face:
// colours of lit, half-lit and shaded faces, dark enough that the rock's base stands apart from the plains
const ROCKS = {
  minCells: 6,
  straight: 5,
  mesh: 44,
  relief: 160,
  minPeak: 0.5,
  shore: 3,
  flat: 0.14,
  tiers: [0.33, 0.62],
  shade: '#b0a693',
  tier: 'rgba(255,252,245,.3)',
  tick: 5,
  face: ['#d2c9b8', '#c6bdab', '#b9af9c'],
};
// thicket trees: crown radius in px [at the edge, from THICKET.deep in], plus up to jitter px more. Trees per cell
// [at the edge, in the middle of the patch] (on average): they grow closer together all the way to the middle of
// each patch, or to mid px in for a big patch, so the edge has a few small bushes and the middle big, packed trees.
// plain: share of crowns with no shading stroke. alpha: how solid the crowns are (they are drawn over creatures), as
// [solidity, share of trees]: 40% are as see-through as the first three, 35% more solid, 20% more solid again and
// 5% almost fully solid
// colour: crown shades [light, middle, dark] per season (spring, summer, autumn, winter); each tree takes one
// of the three
const TREES = {
  r: [5.5, 10.5],
  jitter: 2.5,
  per: [0.3, 1],
  mid: 112,
  plain: 0.3,
  alpha: [
    [0.6, 0.13],
    [0.7, 0.14],
    [0.8, 0.13],
    [0.86, 0.35],
    [0.92, 0.2],
    [0.97, 0.05],
  ],
  colour: [
    ['#bcd3a0', '#b0ca92', '#a3bf86'],
    ['#b6cf96', '#a9c488', '#9cb97b'],
    ['#c9c58e', '#bdb27a', '#a9a868'],
    ['#bccab0', '#afbea3', '#a2b296'],
  ],
};

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
// each species is one colour: the released species keeps the creator's colour, and each new one takes the palette
// colour most unlike every species so far. Individuals differ only in shade, up to SHADE lightness points either way
const SHADE = 4;
// seconds a creature that moves to another species takes to blend from the old colour to the new one
const SPLIT_FADE = 1.5;
const INK = '#151918'; // the ink colour used for outlines and text
// eyes are white on a species whose starting body is darker than this lightness, black otherwise
const EYE_WHITE = 40;

// the diorama map (MAP_STYLE 'diorama'): land as stacked terraces seen slightly from the south, like a painted
// relief model. Every step is a flat plateau with a shaded side showing below its edge.
//   levels: how many steps the land's height is split into (each holds about the same share of the land)
//   rise: height (px) of each land step's side; foot: soft shadow just below each side [colour, extra px]
//   lip: light line along each step's edge [colour, width]; straight: how far (px) an edge may wiggle before it gets
//   a corner (bigger = more angular, low-poly edges); grass: per season (spring, summer, autumn, winter) the
//   colour of the lowest and highest steps, blended in between; alt: how much every other step is lightened, so
//   neighbouring steps stand apart; side: colour the sides are mixed towards, and how much; snow: in winter, steps
//   from this one up are snow [from, colour]
//   sand: the beach colour per season; beach: how far (px) from water the beach reaches
//   coast: the land's edge drops into the water as a sandy cliff: rise px tall, wall colour, a shadow in the water
//   [colour, extra px] and a line of foam at its foot [colour, width]
//   sea: the seabed's steps, each rise px tall with sides mixed towards side, and a lip
//   wash: meadow and dry-ground tints per season [red, green, blue, strength], over the steps
//   thicket: the woodland floor's tint per season
//   trees: per season, the colours of a tree's lit, middle and shaded faces; trunk: lone trees' trunk colour;
//   shadow: trees' shadows on the ground; temp: strength of the frosty and warm temperature washes
//   rock: rise and wall colour of the rock's sides, its face colours (lit, half-lit, shaded), and its tiers' rise and
//   colours
const DIO = {
  levels: 9,
  rise: 6,
  foot: ['rgba(38,52,18,.13)', 3],
  lip: ['rgba(251,251,234,.4)', 1.1],
  straight: 2.2,
  grass: [
    ['#cad28e', '#4b7f47'],
    ['#d1cd87', '#608345'],
    ['#d4c98e', '#697d47'],
    ['#dbdfd1', '#92a48c'],
  ],
  alt: 0.05,
  side: ['#24400c', 0.3],
  snow: [6, '#f3f6f7'],
  sand: ['#e6d7ad', '#e5d3a2', '#e1cea7', '#e3decf'],
  beach: 20,
  coast: {
    rise: 8,
    wall: '#cfa868',
    shadow: ['rgba(47,68,78,.18)', 5],
    foam: ['rgba(255,255,255,.75)', 2.4],
  },
  sea: { rise: 4, side: ['#415761', 0.25], lip: ['rgba(255,255,255,.25)', 1] },
  wash: [
    [
      [84, 152, 78, 0.22],
      [215, 195, 130, 0.3],
    ],
    [
      [96, 147, 73, 0.16],
      [217, 190, 118, 0.4],
    ],
    [
      [134, 134, 66, 0.2],
      [208, 170, 112, 0.34],
    ],
    [
      [154, 171, 154, 0.15],
      [209, 203, 186, 0.2],
    ],
  ],
  thicket: ['rgba(72,133,62,.2)', 'rgba(81,128,57,.2)', 'rgba(131,110,49,.18)', 'rgba(100,120,100,.16)'],
  trees: [
    ['#87b361', '#64944c', '#457039'],
    ['#8fb05a', '#6a8e44', '#4a6d34'],
    ['#c6a658', '#ac7d46', '#7d5734'],
    ['#b3baa5', '#8e9783', '#677260'],
  ],
  trunk: '#6f563f',
  shadow: 'rgba(25,49,21,.08)',
  temp: 0.55,
  // creatures (low-poly, thin outline): a shadow on the ground [colour, px towards the south-east]; a raised side
  // [px, lightness change]; the body split into four flat faces, lightened by how much each faces the light [lit,
  // middle, shaded lightness change]; legs and outline in a dark shade of the creature's own colour [share of its
  // lightness taken off, saturation change, width]; the mouth's colour; how strongly the water tints a swimmer's
  // back half
  creature: {
    shadow: ['rgba(30,50,20,.2)', 2.2],
    side: [1.3, -20],
    faces: [9, 2, -7],
    legs: [0.62, -15, 0.9],
    line: [0.68, -10, 0.6],
    mouth: '#2e2a27',
    water: 0.62,
  },
  // food: faceted gems. Each is [lit, middle, shaded] faces, ripe then regrowing; berry and algae are also the colours
  // of the dots shown when zoomed out. berry: a red gem with a leaf; nut: an acorn with a cap [ripe, regrowing];
  // algae: a lily pad, with a flower [petals, middle] when ripe
  food: {
    berry: '#e0452b',
    berryFaces: [
      ['#ff7a55', '#e0452b', '#a92a1c'],
      ['#f2b6a6', '#e8a090', '#cf8a7c'],
    ],
    leaf: '#4f9a3a',
    nutFaces: [
      ['#d29a55', '#b07a3c', '#7d5426'],
      ['#ecd2ac', '#d8b98e', '#bfa07a'],
    ],
    cap: [
      ['#5b3a1a', '#7a5230'],
      ['#9a7a58', '#b89a78'],
    ],
    algae: '#4f9a3a',
    padFaces: [
      ['#7cc24e', '#4f9a3a', '#3a7a2c'],
      ['#d9d27a', '#c7bd5a', '#a99f44'],
    ],
    flower: ['#f6a5c0', '#ffe27a'],
    shadow: 'rgba(30,50,20,.2)',
  },
  // rivers: the deeper middle [colour, width as a share of the river's half-width]; the moving surface's streaks
  // [colour, width px], drifting downstream in lanes (offsets across the river, as shares of its half-width), each
  // with its own dash pattern [streak, gap, ...] (px) and speed (px/s: speed, plus spread more for each lane)
  river: {
    deep: ['rgba(60,110,120,.16)', 0.95],
    streak: ['rgba(255,255,255,.6)', 1.3],
    lanes: [-0.5, 0.05, 0.5],
    dash: [
      [7, 26, 3, 34, 12, 41],
      [4, 31, 9, 22, 2, 37],
      [10, 38, 5, 27, 3, 30],
    ],
    speed: 20,
    spread: 4,
  },
  // the sea's moving surface: wave lines lie on the water (sea and lakes) from waves[0] to waves[1] px from land,
  // every waves[2] px, [strength, width px], and roll in towards the shore, waveSpeed waves a second per line
  seaMotion: {
    waves: [14, 104, 9],
    waveLine: [0.45, 1.3],
    waveSpeed: 0.22,
  },
  rock: {
    rise: 10,
    wall: '#5d4f63',
    face: ['#b3a3ae', '#9d8d9c', '#837386'],
    tierRise: 6,
    tier: ['#c4b6bf', '#d3c7cf'],
  },
};

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
const FAST = { speed: 8, dur: 40, cool: 120 };
// chart history: one point every step seconds for the whole run, so a chart looks the same at the start of a long
// run as at the end. Only past max points (12 hours) is every other point dropped and the step doubled, keeping it
// even throughout
const HIST = { step: 6, max: 7200 };
const CHART_SPAN = 1200; // most seconds of history an inspector chart shows at once (20 minutes); a slider moves back
const SEASON_LEN = 150; // seconds per season (2.5 minutes, so a year is 10 minutes)
// regrowth time in seconds for fast, normal and slow regions: [minimum, random extra]; in winter every regrowth
// time (land and water) is multiplied by winter
const GROW = { f: [16, 5.5], n: [19, 7.5], s: [23.5, 7.5], winter: 1.1 };

/* ---- world events ---- */
// first: when the first event comes, gap: time between events, both as [minimum, random extra] seconds
// (no random extra: one event every 12 minutes, like clockwork)
// meteor: chance an event is a meteor; major: chance an event is a major one; streak: at most this many floods in a
// row, and at most this many droughts in a row
// each pair below is [normal, major]
// shift: how far floods and droughts move the land share of the map (0.12 = 12 percentage points)
// near: meteors land within this many px of a random living creature, so they tend to hit populations
// blast: meteor kill radius in px; crater: crater radius in cells
// splits: new splits per earthquake; seaSplit: chance each split is a sea channel rather than a river
// dry: rivers dried up and sea channels closed per drought (each) at least; dryShare: or this share of them if
// more, so the more splits there are, the more a drought undoes; they turn straight back into land
const EVENTS = {
  first: [720, 0],
  gap: [720, 0],
  meteor: 1 / 7,
  near: 250,
  major: 0.1,
  streak: 2,
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
// with no food free, a creature heads for the nearest regrowing or busy food and, once within r px of it, ambles
// round it at pace (share of full speed) until something frees up, rather than standing still
const AMBLE = { r: 60, pace: 0.5 };
const MAXT = 22; // furthest a creature will plan, in seconds of travel
// breeding: a creature may breed after a meal that leaves its energy at least this share of its store full
const BREED = { full: 0.75 };
// crowding: r = radius that counts as neighbours (px); breeding chance = 1 / (1 + (neighbours/half)^pow)
const CRW = { r: 80, half: 2, pow: 2 };

/* ---- species: four ways of life ---- */
// every species is one of four types, named by its epithet: water (natans) has at least water.tail of tail (0 none,
// 1 full); thicket (silvicola) is no bigger than thicket.size with a mouth no more than thicket.mouth (0 beak,
// 1 straw), and isn't water; plains (campestris) is at least plains.size, and isn't water; everything else is the
// middle type (vulgaris). A creature leans towards another type once it is clearly outside its species' type: margin
// is how far past the border that is (in each trait). It moves when at least join other creatures within radius px
// lean the same way (or already belong there), and that species is alive. Founding a species (or bringing back one
// that died out) needs found creatures leaning that way within radius px of each other, whose average is deep
// margins inside the new type, so a new species starts clearly different
const TYPES = {
  water: { tail: 0.5 },
  thicket: { size: 0.8, mouth: 0.4 },
  plains: { size: 1.0 },
  margin: { tail: 0.08, size: 0.04, mouth: 0.08 },
  radius: 200,
  join: 3,
  found: 6,
  deep: 2,
};

/* ---- intro ---- */
// the title screen's creatures: how many wander round the name (fewer on a phone-sized screen), how much bigger
// than life they're drawn [smallest, biggest], and how long the pane pictures take to loop, in seconds
const INTRO = {
  creatures: 7,
  phone: 5,
  zoom: [2.6, 4],
  loop: 9,
};
