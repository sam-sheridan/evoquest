/* EvoQuest configuration: every number worth tuning lives here. */

/* ---- world size and creatures ---- */
const MATURE = 15; // seconds old before a creature can breed
const LIFE = 90; // maximum lifespan in seconds
// ageing: from this age creatures slow down steadily, reaching this fraction of their speed at LIFE (0 = a halt)
const OLD = { from: 85, slowest: 0 };
const BG_MAX = 15; // in a hidden tab, the most real seconds of play caught up in one background tick
const W = 4512; // world width in px (GW cells of CS px)
const H = 3152; // world height in px (GH cells of CS px)
const CS = 16; // size of one terrain cell in px
const GW = 282; // terrain grid width in cells
const GH = 197; // terrain grid height in cells
const MAXPOP = 400; // safety limit only, far above normal numbers (crowding keeps populations near 100)
const RIVER = 14; // water speed (px/s) needed to swim across a river current
const FOOD = 8; // energy gained from one piece of food
const START = 30; // number of creatures released at the start
const EDGE = 10; // width in cells of the guaranteed sea margin inside the oval edge of the map
// land as a share of the whole (rectangular) map: start = [minimum, random extra]; floods and droughts stay
// between min and max, and aren't picked once land is below noFlood or above noDrought
const LAND = { start: [0.31, 0.04], min: 0.2, max: 0.46, noFlood: 0.25, noDrought: 0.42 };
// regions: broad areas with their own character (thicket country, rocky uplands, low wetlands with lakes);
// strength 0 spreads thicket and rock evenly everywhere, 1 is the normal amount, higher is more extreme
const REGIONS = { strength: 1.3 };
const VAR = 1.6; // how much offspring traits vary from their parent (1 = base amount)

/* ---- map rendering ---- */
const TS = 0.8; // resolution of the pre-drawn map image (pixels per world px)
const LO = 0.4; // resolution of the low-detail copy used when zoomed far out
const BAND = ['#d2e0e5', '#c6d8de', '#b9cfd7', '#adc6cf']; // sea depth bands, shallow to deep

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
// colours used to tag species in charts and the family tree
const TAGS = ['#D55E00', '#0072B2', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#F0E442', '#151918'];
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
const SEASON_LEN = 150; // seconds per season (2.5 minutes, so a year is 10 minutes)
// regrowth time in seconds for each speed: [minimum, random extra]; winter multiplies all land regrowth
const GROW = { f: [17, 6], n: [20, 8], s: [25, 8], winter: 1.1 }; // tuned in scenario tests: milder seasons

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
  warn: 10, // seconds before an event that its warning symbol appears in the event bar
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
// food sites placed when a world is made: berries on land, algae in water
const SITES = { land: 375, water: 125 };
const MAXT = 22; // furthest a creature will plan, in seconds of travel
// crowding: r = radius that counts as neighbours (px); breeding chance = 1 / (1 + (neighbours/half)^pow)
const CRW = { r: 80, half: 2, pow: 2 }; // tuned with home ranges: local groups can be denser before breeding slows

/* ---- speciation ---- */
// geo: trait difference needed between groups on separate land; eco: between two clusters on the same land
// ratio: how clearly separated the clusters must be; streak: consecutive 5-second checks the split must hold
// age / cool: seconds a species must exist, and wait after a split, before it can split again
// extra: how much harder each additional living species makes the next split
const SPC = { geo: 0.22, eco: 0.4, ratio: 3.1, streak: 4, age: 90, cool: 110, extra: 0.55 }; // tuned with home ranges: about 0-2 new species per 15 minutes
