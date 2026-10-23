/* Small shared helpers: random numbers, maths, DOM shortcuts, saved runs and value-noise fields. */

const rand = Math.random,
  clamp = (v, a, b) => (v < a ? a : v > b ? b : v),
  TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
// a time as m:ss, or hh:mm:ss from an hour on
const fmtT = s => {
  s = Math.max(0, Math.floor(s));
  const p = n => String(n).padStart(2, '0');
  if (s >= 3600) return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60);
  return Math.floor(s / 60) + ':' + p(s % 60);
};
const esc = s =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const col = c => `hsl(${c.hue} ${c.sat ?? 60}% ${c.lt}%)`;
// an HSL colour as [r, g, b] (0-255), for mixing and comparing colours
function hslRgb(h, s, l) {
  ((s /= 100), (l /= 100));
  const a = s * Math.min(l, 1 - l),
    f = n => {
      const k = (n + h / 30) % 12;
      return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };
  return [f(0), f(8), f(4)];
}
// how different two colours look (a weighted RGB distance, close enough to the eye for picking species colours)
function colDist(a, b) {
  const r = (a[0] + b[0]) / 2,
    d = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return Math.sqrt((2 + r / 256) * d[0] ** 2 + 4 * d[1] ** 2 + (2 + (255 - r) / 256) * d[2] ** 2);
}
// the tail: none means a land creature, full a water creature
const tailTxt = h => {
  const w = Math.round(h * 100);
  return h < TAIL.min ? 'None · land only' : w >= 100 ? 'Full · water only' : `${w}%`;
};
// leg length in words
const legTxt = l =>
  l < 0.2 ? 'Short' : l < 0.4 ? 'Fairly short' : l < 0.6 ? 'Medium' : l < 0.8 ? 'Fairly long' : 'Long';
// how far into thickets a creature can go (past 200 px it reaches every thicket's middle)
const thickTxt = c => (c.dT >= 200 ? 'anywhere in thickets' : `${Math.round(c.dT)} px into thickets`);
// roundness in words
const roundTxt = r => (r < 0.25 ? 'Blocky' : r < 0.5 ? 'Squarish' : r < 0.75 ? 'Rounded' : 'Round');
// the mouth's name along the way from beak (0) to straw (1)
const mouthTxt = m =>
  m < 0.2 ? 'Beak' : m < 0.4 ? 'Slim beak' : m < 0.62 ? 'Tweezers' : m < 0.88 ? 'Prongs' : 'Straw';

/* storage */
const KEY = 'evoquest.v4';
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { runs: [] };
  } catch (e) {
    return { runs: [] };
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch (e) {}
}
let saved = load();
saved.runs = saved.runs || [];

/* noise */
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function grid(rng, gw, gh) {
  const r = gw + 2,
    g = new Float32Array(r * (gh + 2));
  for (let i = 0; i < g.length; i++) g[i] = rng();
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = x | 0,
      yi = y | 0,
      u = s(x - xi),
      v = s(y - yi);
    const a = g[yi * r + xi],
      b = g[yi * r + xi + 1],
      c = g[(yi + 1) * r + xi],
      d = g[(yi + 1) * r + xi + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function field(rng, octs) {
  const L = octs.map(([f, w]) => {
    const fh = Math.ceil((f * H) / W);
    return { n: grid(rng, f, fh), f, fh, w };
  });
  const tw = octs.reduce((s, o) => s + o[1], 0);
  return (u, v) => {
    let s = 0;
    for (const o of L) s += o.n(u * o.f, v * o.fh) * o.w;
    return s / tw;
  };
}
const quant = (arr, q) => {
  const s = Float32Array.from(arr).sort();
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
