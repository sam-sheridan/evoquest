/* Camera, input (drag, pinch, wheel, tap), the render pass for each frame, and the main loop. */

/* ---------- camera & render ---------- */
const cv = $('#cv'),
  ctx = cv.getContext('2d');
let cw = 0,
  ch = 0,
  dpr = 1;
const cam = { x: W / 2, y: H / 2, z: 0.5 };
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cw = innerWidth;
  ch = innerHeight;
  cv.width = cw * dpr;
  cv.height = ch * dpr;
  placeScale();
}
function placeScale() {
  const b = $('#bar').getBoundingClientRect();
  $('#scale').style.top = b.bottom + 8 + 'px';
  $('#toast').style.top = b.bottom + 10 + 'px';
  document.documentElement.style.setProperty('--sheetTop', b.bottom + 8 + 'px');
}
addEventListener('resize', resize);
resize();
const fitZ = () => Math.min(cw / W, ch / H) * 0.95;
const toWorld = (sx, sy) => ({ x: (sx - cw / 2) / cam.z + cam.x, y: (sy - ch / 2) / cam.z + cam.y });
function zoomAt(sx, sy, f) {
  camMoved = performance.now();
  const p = toWorld(sx, sy);
  cam.z = clamp(cam.z * f, fitZ() * 0.8, 6);
  cam.x = p.x - (sx - cw / 2) / cam.z;
  cam.y = p.y - (sy - ch / 2) / cam.z;
}
let parts = [];
function onScreen(x, y, m = 30) {
  const sx = (x - cam.x) * cam.z + cw / 2,
    sy = (y - cam.y) * cam.z + ch / 2;
  return sx > -m && sy > -m && sx < cw + m && sy < ch + m;
}
function updScale() {
  const opts = [25, 50, 100, 200, 400];
  let L = 100;
  for (const o of opts) {
    L = o;
    if (o * cam.z >= 50) break;
  }
  $('#scaleL').textContent = L + ' px';
  $('#scaleI').style.width = L * cam.z + 'px';
}
// dried-up rivers and closed sea channels leave a faint sandy bed on the land that fades away (EVENTS.dryFade)
function drawBeds() {
  const beds = world.channels.filter(ch => ch.dry != null);
  if (!beds.length) return;
  ctx.save();
  ctx.clip(world.vec.land);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const ch of beds) {
    const a = 1 - (S.t - ch.dry) / EVENTS.dryFade;
    if (a <= 0 || !ch.bed) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(196,178,132,.42)';
    ctx.fill(ch.bed.fill);
    ctx.strokeStyle = 'rgba(120,104,72,.45)';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([5, 5]);
    ctx.stroke(ch.bed.line);
  }
  ctx.restore();
}
function drawDetail() {
  const z = cam.z;
  if (z * dpr <= TS * 1.05) return false;
  const d = detail,
    now = performance.now();
  const same = d.ok && Math.abs(d.z - z) / z < 0.002,
    ox = (d.x - cam.x) * z,
    oy = (d.y - cam.y) * z,
    covers = same && Math.abs(ox) <= cw / 2 && Math.abs(oy) <= ch / 2;
  if (!(covers && Math.abs(ox) < cw * 0.3 && Math.abs(oy) < ch * 0.3) && now - camMoved > 120) {
    const Wc = Math.ceil(cw * 2 * dpr),
      Hc = Math.ceil(ch * 2 * dpr);
    for (const cv2 of [d.can, d.can2])
      if (cv2.width !== Wc || cv2.height !== Hc) {
        cv2.width = Wc;
        cv2.height = Hc;
      }
    const g = d.can.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = BAND[3];
    g.fillRect(0, 0, Wc, Hc);
    g.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw - cam.x * z), dpr * (ch - cam.y * z));
    paintTerrain(g);
    const g2 = d.can2.getContext('2d');
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.clearRect(0, 0, Wc, Hc);
    g2.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw - cam.x * z), dpr * (ch - cam.y * z));
    paintStipple(g2);
    d.x = cam.x;
    d.y = cam.y;
    d.z = z;
    d.ok = true;
    return drawDetail();
  }
  if (!covers) return false;
  blitVisible(d.can, ox, oy);
  return [ox, oy];
}
function render(nowT) {
  const t = nowT / 1000;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BAND[3];
  ctx.fillRect(0, 0, cw, ch);
  if (!world) return;
  if (S && S.follow && S.sel && !S.sel.dead) {
    cam.x += (S.sel.x - cam.x) * 0.08;
    cam.y += (S.sel.y - cam.y) * 0.08;
  }
  const z = cam.z;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw / 2 - cam.x * z), dpr * (ch / 2 - cam.y * z));
  ctx.imageSmoothingEnabled = true;
  const loMode = z * dpr <= LO * 1.08,
    det = loMode ? null : drawDetail(),
    zoomedIn = z * dpr > TS * 1.05,
    // while zooming or panning, stretch the last sharp detail image instead of showing only the softer base map
    stale = zoomedIn && !det && detail.ok ? detailRect(detail) : null;
  if (loMode) ctx.drawImage(tlo, 0, 0, W, H);
  else if (!det) {
    ctx.drawImage(tcan, 0, 0, W, H);
    if (stale) ctx.drawImage(detail.can, ...stale);
  }
  if (S && S.fade) {
    const f = S.fade,
      r = zoomedIn && f.d ? detailRect(f.d) : null,
      hw = cw / 2 / z,
      hh = ch / 2 / z,
      covers =
        r &&
        r[0] <= cam.x - hw &&
        r[1] <= cam.y - hh &&
        r[0] + r[2] >= cam.x + hw &&
        r[1] + r[3] >= cam.y + hh;
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.dur);
    if (covers) ctx.drawImage(f.d.can, ...r);
    else ctx.drawImage(f.a, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  if (!S) return;
  drawBeds();
  const lw = clamp(1.5 / z, 0.45, 1.3);
  if (S.replay) {
    const a = S.frames[S.replay.i].a;
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    for (let i = 0; i < a.length; i += 6) {
      const bw = a[i + 4],
        bh = a[i + 5];
      ctx.fillStyle = `hsl(${a[i + 2]} 60% ${a[i + 3]}%)`;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(a[i] - bw / 2, a[i + 1] - bh / 2, bw, bh, Math.min(bw, bh) * 0.3)
        : ctx.rect(a[i] - bw / 2, a[i + 1] - bh / 2, bw, bh);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }
  const fine = z >= 1.1,
    bR = new Path2D(),
    bA = new Path2D(),
    bY = new Path2D();
  for (const f of S.sites) {
    if (!onScreen(f.x, f.y)) continue;
    const tt = world.type[f.i];
    if (f.kind === 'w' ? !isWater(tt) : !(tt === 1 || tt === 2)) continue;
    const p = f.active || f.vis > 0 ? 1 : 1 - clamp(f.t / (f.t0 || 20), 0, 1) < 0.5 ? 0 : 0.5;
    if (fine) (f.kind === 'w' ? drawAlgae : drawBerry)(ctx, f.x, f.y, p);
    else if (p >= 1) {
      const P = f.kind === 'w' ? bA : bR;
      P.moveTo(f.x + 3.4, f.y);
      P.arc(f.x, f.y, 3.4, 0, TAU);
    } else if (f.kind === 'w') {
      bY.moveTo(f.x + 1.6, f.y);
      bY.arc(f.x, f.y, 1.6, 0, TAU);
    }
  }
  if (!fine) {
    ctx.fillStyle = '#D55E00';
    ctx.fill(bR);
    ctx.fillStyle = '#009E73';
    ctx.fill(bA);
    ctx.fillStyle = '#D9C21E';
    ctx.fill(bY);
  }
  const lod = z * 17 > 12 ? z : 0, // creature detail level
    spMode = S.colorMode === 'species';
  const vis = S.creatures.filter(c => onScreen(c.x, c.y)).sort((a, b) => a.y - b.y);
  for (const c of vis) {
    const sc = Math.min(1, 0.4 + c.age * 2),
      hi = cellI(clamp(c.x, 0, W - 1), clamp(c.y, 0, GH * CS - 1)),
      tt = world.type[hi];
    drawCreature(
      ctx,
      c,
      c.x,
      c.y,
      sc,
      lod,
      spMode ? S.species[c.sp].tag : col(c),
      t,
      isWater(tt),
      lw / sc
    );
  }
  if (det) drawStipple(det);
  else if (stale) ctx.drawImage(detail.can2, ...stale);
  if (z > 2.2)
    for (const c of vis) {
      const bw = Math.max(c.bw, c.bh),
        y0 = c.y - bw / 2 - 7;
      ctx.fillStyle = 'rgba(21,25,24,.15)';
      ctx.fillRect(c.x - bw / 2, y0, bw, 1.4);
      ctx.fillStyle = c.E < c.cap * 0.25 ? '#b5651d' : INK;
      ctx.fillRect(c.x - bw / 2, y0, bw * clamp(c.E / c.cap, 0, 1), 1.4);
    }
  if (S.sel) {
    const c = S.sel;
    ctx.strokeStyle = c.dead ? '#636d69' : '#ff4f1a';
    ctx.lineWidth = 1.4 / z;
    const r = Math.max(c.bw, c.bh) / 2 + 10;
    ctx.beginPath();
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      ctx.moveTo(c.x + sx * r, c.y + sy * (r - 4));
      ctx.lineTo(c.x + sx * r, c.y + sy * r);
      ctx.lineTo(c.x + sx * (r - 4), c.y + sy * r);
    }
    ctx.stroke();
    if (!c.dead && c.target) {
      ctx.setLineDash([3 / z, 3 / z]);
      ctx.strokeStyle = 'rgba(21,25,24,.5)';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.target.x, c.target.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  for (const p of parts) {
    const dur = p.k === 'boom' ? 1.2 : 0.6,
      k = p.t / dur;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = p.k === 'pop' ? p.col : p.k === 'boom' ? '#ff4f1a' : '#636d69';
    ctx.lineWidth = p.k === 'boom' ? 3 : 1.2;
    const r = p.k === 'boom' ? 30 + k * 140 : 4 + k * (p.k === 'poof' ? 12 : 8);
    ctx.beginPath();
    if (p.k === 'poof') {
      ctx.moveTo(p.x - r * 0.5, p.y - r * 0.5);
      ctx.lineTo(p.x + r * 0.5, p.y + r * 0.5);
      ctx.moveTo(p.x + r * 0.5, p.y - r * 0.5);
      ctx.lineTo(p.x - r * 0.5, p.y + r * 0.5);
    } else ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/* input */
const ptrs = new Map();
let down = null,
  pinch = null;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) down = { x: e.clientX, y: e.clientY, moved: false };
  else {
    if (down) down.moved = true;
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
  }
});
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  if (ptrs.size === 1) {
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    cam.x -= dx / cam.z;
    cam.y -= dy / cam.z;
    camMoved = performance.now();
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
      down.moved = true;
      if (S) S.follow = false;
    }
  }
  p.x = e.clientX;
  p.y = e.clientY;
  if (ptrs.size === 2 && pinch) {
    const [a, b] = [...ptrs.values()],
      d = Math.hypot(a.x - b.x, a.y - b.y);
    zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.d);
    pinch.d = d;
  }
});
const up = e => {
  if (ptrs.size === 1 && down && !down.moved) tap(e.clientX, e.clientY);
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (!ptrs.size) down = null;
};
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', e => {
  ptrs.delete(e.pointerId);
  pinch = null;
  down = null;
});
cv.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
  },
  { passive: false }
);
function tap(sx, sy) {
  if (!S || S.replay || S.over) return;
  const p = toWorld(sx, sy);
  let best = null,
    bd = (24 / cam.z) ** 2;
  for (const c of S.creatures) {
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  S.sel = best;
  if (best) {
    selectTab('one');
    openSheet(true);
  }
  syncUI(true);
}

/* loop */
let last = performance.now(),
  uiAcc = 0;
function frame(nowT) {
  const dt = Math.min(0.1, (nowT - last) / 1000);
  last = nowT;
  if (S && !S.paused && !S.over && !S.replay) {
    let sim = dt * S.speed;
    while (sim > 1e-6 && !S.over) {
      const h = Math.min(sim, 0.05);
      step(h);
      sim -= h;
    }
  }
  if (S && S.replay) advanceReplay(dt);
  if (S && S.fade) {
    S.fade.t += dt;
    if (S.fade.t > S.fade.dur) S.fade = null;
  }
  for (const p of parts) p.t += dt;
  parts = parts.filter(p => p.t < (p.k === 'boom' ? 1.2 : 0.6));
  render(nowT);
  if (!$('#creator').hidden) drawPreview(nowT / 1000);
  uiAcc += dt;
  if (uiAcc > 0.3) {
    uiAcc = 0;
    syncUI();
    syncMeters();
    if (!$('#logPop').hidden && S && S.log.length !== +$('#logPop').dataset.n) {
      $('#logPop').dataset.n = S.log.length;
      renderLog();
    }
  }
  requestAnimationFrame(frame);
}
genWorld((Math.random() * 1e6) | 0);
cam.x = W / 2;
cam.y = H / 2;
cam.z = fitZ() * 1.25;
openCreator(null);
renderBadges();
requestAnimationFrame(frame);

// read-only window into the running game, used by the automated tests in tests/
window.EvoQuestDebug = {
  get state() {
    return S;
  },
  get world() {
    return world;
  },
  step: dt => step(dt),
  camera: cam,
  triggerEvent: (kind, major) => worldEvent(kind, major),
  setDesign: v => {
    Object.assign(D, v);
  },
  config: { GROW, SPC, CRW, EVENTS },
};
