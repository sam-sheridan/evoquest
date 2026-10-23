/* Small shared helpers: random numbers, maths, DOM shortcuts, saved runs and value-noise fields. */

const rand = Math.random,
  clamp = (v, a, b) => (v < a ? a : v > b ? b : v),
  TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
const fmtT = s => {
  s = Math.max(0, Math.floor(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const esc = s =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const col = c => `hsl(${c.hue} ${c.sat ?? 60}% ${c.lt}%)`;
// the tail: none means a land creature, full a water creature
const tailTxt = h => {
  const w = Math.round(h * 100);
  return h < TAIL.min ? 'None · land only' : w >= 100 ? 'Full · water only' : `${w}%`;
};
// leg length in words
const legTxt = l =>
  l < 0.2 ? 'Short' : l < 0.4 ? 'Fairly short' : l < 0.6 ? 'Medium' : l < 0.8 ? 'Fairly long' : 'Long';
// roundness in words
const roundTxt = r => (r < 0.25 ? 'Blocky' : r < 0.5 ? 'Squarish' : r < 0.75 ? 'Rounded' : 'Round');
// the mouth's name along the way from claw (0) to straw (1)
const mouthTxt = m =>
  m < 0.2 ? 'Claw' : m < 0.4 ? 'Slim claw' : m < 0.62 ? 'Tweezers' : m < 0.88 ? 'Prongs' : 'Straw';

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
