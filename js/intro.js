/* The intro: a title screen with creatures wandering round the game's name, then five panes that explain the
   game, each with a small moving picture. It opens every time the game is loaded, and again whenever the EvoQuest
   title at the top of the creator is clicked. */

/* ---------- intro ---------- */
const intro = { pane: -1, crowd: [], last: 0, raf: 0, pics: {}, shift: (rand() * 7) | 0 };
const smooth = u => u * u * (3 - 2 * u);
// a creature ready to draw from a set of traits
function introCreature(traits, id) {
  const c = { id, dir: 0, walk: rand() * 10, rest: 0, ...traits };
  enforce(c);
  compute(c);
  return c;
}

/* the title screen's creatures */
function introCrowd() {
  const Wd = innerWidth,
    Hd = innerHeight,
    n = Wd < 640 ? INTRO.phone : INTRO.creatures,
    box = introBox();
  intro.crowd = [];
  for (let i = 0; i < n; i++) {
    // every palette colour gets a turn, so the title shows the full range
    const c = introCreature({ ...randomBody(), ...okabe((i + intro.shift) % OKABE.length) }, i * 7.3 + 1),
      m = { c, rest: 0, f: 0.2 + rand() * 0.3, ph: rand() * TAU };
    // how much room it takes up on screen, legs and tail included
    const room = k => (Math.max(c.bw, c.bh) / 2 + tailLen(c) * 0.6 + 4) * k;
    m.k = INTRO.zoom[0] + rand() * (INTRO.zoom[1] - INTRO.zoom[0]);
    m.r = room(m.k);
    // walking speed on screen follows the creature's real land speed
    m.v = clamp(c.vL, 12, 50) * m.k * 0.45;
    c.dir = rand() * TAU;
    for (let tries = 0; tries < 60; tries++) {
      m.x = 30 + rand() * (Wd - 60);
      m.y = 30 + rand() * (Hd - 60);
      if (
        !inBox(m.x, m.y, box, 40) &&
        intro.crowd.every(o => Math.hypot(o.x - m.x, o.y - m.y) > o.r + m.r + 20)
      )
        break;
    }
    intro.crowd.push(m);
  }
}
// the part of the screen the creatures keep out of: the title, or the pane's card
function introBox() {
  const el = intro.pane < 0 ? $('#inTitle') : $('#inCard');
  return el.getBoundingClientRect();
}
const inBox = (x, y, b, pad) =>
  x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad;
// turn towards angle a at up to rate radians a second
function turnTo(c, a, rate, dt) {
  const d = ((((a - c.dir) % TAU) + TAU * 1.5) % TAU) - Math.PI;
  c.dir += clamp(d, -rate * dt, rate * dt);
}
function moveCrowd(dt, t) {
  const box = introBox(),
    Wd = innerWidth,
    Hd = innerHeight;
  for (const m of intro.crowd) {
    const c = m.c;
    // now and then a creature stops for a moment, as if eating, and its mouth snaps
    if (m.rest > 0) {
      m.rest -= dt;
      c.rest = 1;
      continue;
    }
    c.rest = 0;
    if (rand() < dt / 12) m.rest = 1 + rand();
    const pad = 30 + 8 * m.k;
    if (m.x < pad || m.x > Wd - pad || m.y < pad || m.y > Hd - pad)
      turnTo(c, Math.atan2(Hd / 2 - m.y, Wd / 2 - m.x), 2.2, dt);
    else if (inBox(m.x, m.y, box, 30 + 10 * m.k))
      turnTo(c, Math.atan2(m.y - (box.top + box.bottom) / 2, m.x - (box.left + box.right) / 2), 2.6, dt);
    else c.dir += Math.sin(t * m.f + m.ph) * 0.8 * dt;
    // no two creatures walk over each other: one heading into another turns aside, and if they still touch they
    // are eased apart
    for (const o of intro.crowd) {
      if (o === m) continue;
      const dx = o.x - m.x,
        dy = o.y - m.y,
        d = Math.hypot(dx, dy) || 1,
        gap = d - m.r - o.r;
      if (gap < 30 && Math.cos(Math.atan2(dy, dx) - c.dir) > 0.2) c.dir += 2 * dt;
      if (gap < 0) {
        m.x += (dx / d) * gap * 0.5;
        m.y += (dy / d) * gap * 0.5;
      }
    }
    m.x += Math.cos(c.dir) * m.v * dt;
    m.y += Math.sin(c.dir) * m.v * dt;
    c.walk += dt * (m.v / m.k) * 0.2;
  }
}
// squared paper, like the creator's preview
function paper(g, w, h, step = 16) {
  g.fillStyle = '#fcfcfb';
  g.fillRect(0, 0, w, h);
  g.lineWidth = 1;
  for (const [s, c] of [
    [step, '#eaeeeb'],
    [step * 5, '#dfe5e1'],
  ]) {
    g.strokeStyle = c;
    g.beginPath();
    for (let x = 0.5; x < w; x += s) {
      g.moveTo(x, 0);
      g.lineTo(x, h);
    }
    for (let y = 0.5; y < h; y += s) {
      g.moveTo(0, y);
      g.lineTo(w, y);
    }
    g.stroke();
  }
}
function drawCrowd(t) {
  const cvs = $('#inCv'),
    r = Math.min(2, devicePixelRatio || 1),
    Wd = innerWidth,
    Hd = innerHeight;
  if (cvs.width !== Math.round(Wd * r) || cvs.height !== Math.round(Hd * r)) {
    cvs.width = Math.round(Wd * r);
    cvs.height = Math.round(Hd * r);
  }
  const g = cvs.getContext('2d');
  g.setTransform(r, 0, 0, r, 0, 0);
  paper(g, Wd, Hd);
  if (intro.pane >= 0) g.globalAlpha = 0.35; // behind a pane, the creatures fade back
  for (const m of [...intro.crowd].sort((a, b) => a.y - b.y)) {
    drawCreature(g, m.c, m.x, m.y, m.k, 7, col(m.c), t, false, true);
  }
  g.globalAlpha = 1;
}

/* the panes, each with a picture drawn in a 560 × 245 box */
const PIC_W = 560,
  PIC_H = 245;
// a small mono label
function note(g, s, x, y, colr = '#636d69', align = 'left') {
  g.fillStyle = colr;
  g.font = '500 11px "IBM Plex Mono", monospace';
  g.textAlign = align;
  g.fillText(s, x, y);
  g.textAlign = 'left';
}
// a creature's energy bar, as drawn on the map when zoomed in
function energyBar(g, c, x, y, k, e) {
  const bw = Math.max(c.bw, c.bh) * k,
    y0 = y - (Math.max(c.bw, c.bh) / 2 + legLen(c)) * k - 8;
  g.fillStyle = 'rgba(21,25,24,.15)';
  g.fillRect(x - bw / 2, y0, bw, 4);
  g.fillStyle = e < 0.25 ? '#b5651d' : INK;
  g.fillRect(x - bw / 2, y0, bw * clamp(e, 0, 1), 4);
}
// mixes two designs, part u of the way from a to b (colour round the wheel the short way)
function mixBody(a, b, u) {
  const o = {};
  for (const k of ['w', 'h', 'leg', 'hab', 'mth', 'round', 'sat', 'lt']) o[k] = a[k] + (b[k] - a[k]) * u;
  o.hue = (a.hue + (((b.hue - a.hue + 540) % 360) - 180) * u + 360) % 360;
  return o;
}
const PANES = [
  {
    h: 'Design a species',
    p: [
      'Give it a name, a colour and a body. Its size, legs, tail, mouth and roundness decide how fast it walks and swims, how much energy it burns and which food suits it best.',
      'Every strength has a cost: long legs walk fast but burn energy, a tail swims well but walks badly, and a big body is thrifty but slow. The tags under the preview show what your design can do.',
    ],
    // one creature changing smoothly from one random design to the next
    draw(g, t, s) {
      if (!s.a) {
        s.a = randomBody();
        s.b = randomBody();
        s.t0 = t;
      }
      let u = (t - s.t0) / 3.4;
      if (u >= 1) {
        s.a = s.b;
        s.b = randomBody();
        s.t0 = t;
        u = 0;
      }
      const c = introCreature(mixBody(s.a, s.b, smooth(clamp((u - 0.55) / 0.45, 0, 1))), 3),
        k = 4.6;
      c.walk = t * 3;
      c.rest = t % 5 < 1.6 ? 1 : 0;
      c.dir = -0.3 + Math.sin(t * 0.6) * 0.25;
      drawCreature(g, c, 280, 112, k, 7, col(c), t, false, true);
      note(
        g,
        `Size ${c.size.toFixed(2)} · ${legTxt(c.leg)} legs · Tail ${tailTxt(c.hab).split(' ·')[0]} · ${mouthTxt(c.mth)}`,
        280,
        228,
        INK,
        'center'
      );
    },
  },
  {
    h: 'Release it into the world',
    p: [
      'Twenty of your creatures are released onto a random island world. Some worlds are scattered islands, some one big continent, some rocky or thick with forest, and you never find out which.',
      'They eat berries on open land, nuts in thickets (best for a beak) and algae in shallow water (best for a straw). Eaten food regrows after a while.',
    ],
    // a stretch of coast: berries and a thicket's nuts on land, algae on the shallow shelf, a walker and a swimmer
    draw(g, t, s) {
      if (!s.walker) {
        s.walker = introCreature({ w: 3, h: 4, leg: 0.7, hab: 0.05, mth: 0.15, round: 0.4, ...okabe(0) }, 4);
        s.swimmer = introCreature(
          { w: 3.5, h: 4.5, leg: 0.1, hab: 0.9, mth: 0.95, round: 0.9, ...okabe(1) },
          5
        );
      }
      const coast = y => 318 + 16 * Math.sin(y / 38) + 8 * Math.sin(y / 15 + 1);
      introCoast(g, coast, PIC_W, PIC_H);
      // food (drawn at three times life size)
      g.save();
      g.scale(3, 3);
      for (const [x, y] of [
        [150, 150],
        [205, 120],
        [250, 175],
        [120, 200],
        [215, 212],
      ])
        drawBerry(g, x / 3, y / 3, 1);
      for (const [x, y] of [
        [52, 92],
        [92, 60],
        [128, 96],
      ])
        drawNut(g, x / 3, y / 3, 1);
      for (const [x, y] of [
        [372, 60],
        [398, 140],
        [360, 205],
        [430, 92],
        [412, 196],
      ])
        drawAlgae(g, x / 3, y / 3, 1);
      g.restore();
      // a little thicket at the top left, see-through so the nuts show
      introTrees(
        g,
        [
          [30, 52, 21],
          [80, 34, 18],
          [120, 64, 19],
          [62, 86, 16],
          [12, 110, 18],
        ],
        0.82
      );
      note(g, 'nuts', 150, 40, INK);
      note(g, 'berries', 34, 160, INK);
      note(g, 'algae', 448, 120, INK);
      // the walker loops round the meadow, the swimmer round the shallows
      const k = 3,
        a = t * 0.45,
        b = -t * 0.35 + 1;
      const w = s.walker,
        sw = s.swimmer;
      w.dir = a + Math.PI / 2;
      w.walk = t * 4;
      drawCreature(g, w, 185 + Math.cos(a) * 85, 165 + Math.sin(a) * 42, k, 7, col(w), t, false);
      sw.dir = b - Math.PI / 2;
      drawCreature(g, sw, 420 + Math.cos(b) * 55, 135 + Math.sin(b) * 70, k, 7, col(sw), t, true);
    },
  },
  {
    h: 'Eat, breed, survive',
    p: [
      'Food fills a creature’s energy bar and moving drains it. Once it’s 15 seconds old, a meal that leaves it nearly full gives it one offspring, a little different from itself. Crowded creatures breed less.',
      'Nobody lives longer than 90 seconds, so your species lasts only as long as it keeps finding food and breeding. It can die out, especially early on.',
    ],
    // one creature walks to a berry, eats, and has an offspring, then both walk on
    draw(g, t, s) {
      const k = 3.6,
        T = INTRO.loop,
        u = t % T,
        cyc = Math.floor(t / T);
      if (s.cyc !== cyc) {
        s.cyc = cyc;
        const body = { w: 3.4, h: 4.2, leg: 0.55, hab: 0.05, mth: 0.4, round: 0.6, ...okabe(2) };
        s.p = introCreature(body, 6);
        s.k = introCreature(
          {
            ...body,
            w: body.w + 0.6 * (rand() - 0.5),
            leg: body.leg + 0.1 * (rand() - 0.5),
            lt: body.lt + 3,
          },
          7
        );
      }
      introMeadow(g, PIC_W, PIC_H);
      const p = s.p,
        ch = s.k,
        bx = 300,
        by = 86;
      let px = 300,
        e = 0.95,
        cap = '';
      p.rest = 0;
      p.dir = 0;
      if (u < 3) {
        px = 90 + (bx - 34 - 90) * smooth(u / 3);
        e = 0.66 - 0.06 * (u / 3);
        p.walk = u * 4;
        cap = 'It walks to the nearest food it can reach…';
      } else if (u < 4.6) {
        px = bx - 34;
        p.rest = 1;
        e = 0.6 + 0.35 * smooth((u - 3) / 1.6);
        cap = '…eats, and its energy bar fills…';
      } else {
        px = bx - 34 + Math.max(0, u - 5.4) * 30;
        e = u < 4.8 ? 0.95 : 0.5;
        p.walk = u * 4;
        cap =
          u < 4.8
            ? '…eats, and its energy bar fills…'
            : u < 6
              ? '…and nearly full, it has one offspring.'
              : 'Both carry on, looking for their next meal.';
      }
      if (u < 4.6) {
        g.save();
        g.scale(k, k);
        drawBerry(g, bx / k, by / k, u < 3.8 ? 1 : 1 - (u - 3.8) / 0.8);
        g.restore();
      }
      if (u >= 4.8) {
        const v = u - 4.8,
          grow = Math.min(1, 0.4 + v * 1.2),
          cx = px - 6 + Math.max(0, v - 0.6) * 24,
          cy = by + 92 + Math.max(0, v - 0.6) * 6;
        ch.dir = 0.2;
        ch.walk = v * 5;
        if (v < 0.6) {
          g.strokeStyle = col(p);
          g.globalAlpha = 1 - v / 0.6;
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(cx, cy, 10 + v * 40, 0, TAU);
          g.stroke();
          g.globalAlpha = 1;
        }
        drawCreature(g, ch, cx, cy, k * grow, 7, col(ch), t, false);
        energyBar(g, ch, cx, cy, k * grow, 0.5);
      }
      drawCreature(g, p, px, by, k, 7, col(p), t, false);
      energyBar(g, p, px, by, k, e);
      note(g, cap, 280, 228, INK, 'center');
      // fade at the end of each loop
      if (u > T - 0.6) {
        g.fillStyle = `rgba(252,252,251,${((u - (T - 0.6)) / 0.6).toFixed(2)})`;
        g.fillRect(0, 0, PIC_W, PIC_H);
      }
    },
  },
  {
    h: 'The world keeps changing',
    p: [
      'Seasons turn every 2½ minutes, changing where food grows back fastest and how cold the hills get. Every 12 minutes a world event strikes, and the sign in the bottom left flashes just before one.',
      'No world stays the same for long: islands join and split, rivers come and go, and what worked last year may not work now.',
    ],
    html() {
      const tri =
          '<path d="M14.22 5.26Q15.5 3 16.78 5.26L27.22 23.74Q28.5 26 25.90 26.00L5.10 26.00Q2.5 26 3.78 23.74Z" stroke-width="1.6" stroke-linejoin="round" fill="var(--panel)" stroke="var(--ink)"/>',
        ev = [
          ['flood', 'Flood', 'The sea rises'],
          ['drought', 'Drought', 'The sea falls'],
          ['quake', 'Earthquake', 'A new river'],
          ['meteor', 'Meteor', 'Rare, and deadly'],
        ];
      return (
        `<div class="inRow">${SEASONS.map(
          (s, k) =>
            `<div class="inItem"><svg width="38" height="38" viewBox="-19 -19 38 38" aria-hidden="true"><circle r="17" fill="${s.col}" stroke="${INK}" stroke-width="1.2"/><g style="color:${INK}">${SEASON_ICON[k]}</g></svg><b>${s.name}</b></div>`
        ).join('')}</div>` +
        `<div class="inRow">${ev
          .map(
            ([k, n, d]) =>
              `<div class="inItem"><svg width="38" height="36" viewBox="0 0 31 29" aria-hidden="true">${tri}<g transform="translate(9.2 13.8) scale(0.63)" style="color:${INK}">${OMEN[k].replace(/<\/?svg[^>]*>/g, '')}</g></svg><b>${n}</b><small>${d}</small></div>`
          )
          .join('')}</div>`
      );
    },
  },
  {
    h: 'Evolve into new species',
    p: [
      'Traits that help in this world spread, and ones that don’t fade away. Every species lives one of four ways: in the water, in the thickets, out on the plains, or somewhere in between. When a group takes up a different way of life, it becomes that species, with its own colour and Latin name.',
      'There’s nothing to win: the run lasts until the last creature dies. Drag to look around, scroll or pinch to zoom, and tap a creature to follow it.',
    ],
    // a small family tree: the released species carries on, and two others branch off it
    draw(g, t, s) {
      if (!s.sp) {
        const G = genus(D.name || 'Blorbs');
        s.sp = [
          [
            introCreature({ w: 3.5, h: 4, leg: 0.5, hab: 0.08, mth: 0.5, round: 0.5, ...okabe(0) }, 8),
            `${G} vulgaris`,
            120,
          ],
          [
            introCreature({ w: 3.4, h: 4.6, leg: 0.1, hab: 0.85, mth: 0.85, round: 0.9, ...okabe(1) }, 9),
            `${G} natans`,
            44,
          ],
          [
            introCreature({ w: 6.2, h: 6.6, leg: 0.85, hab: 0.05, mth: 0.1, round: 0.15, ...okabe(5) }, 10),
            `${G} campestris`,
            198,
          ],
        ];
      }
      const [pr, na, ma] = s.sp,
        line = (c, x0, y0, x1, y1, w) => {
          g.strokeStyle = col(c);
          g.lineWidth = w;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
          g.stroke();
        };
      // grows from left to right over each loop, like time passing
      const u = clamp((t % INTRO.loop) / (INTRO.loop * 0.75), 0, 1),
        xe = 40 + 390 * u;
      line(pr[0], 40, pr[2], xe, pr[2], 4);
      if (xe > 160) {
        line(na[0], 160, pr[2], 160, na[2], 2);
        line(na[0], 160, na[2], xe, na[2], 4);
      }
      if (xe > 260) {
        line(ma[0], 260, pr[2], 260, ma[2], 2);
        line(ma[0], 260, ma[2], xe, ma[2], 4);
      }
      // each species' name sits at the start of its line, and its creature walks along at the line's growing end
      g.font = 'italic 13px "IBM Plex Sans", sans-serif';
      for (const [c, nm, y] of s.sp) {
        const x0 = c === pr[0] ? 40 : c === na[0] ? 160 : 260,
          k = 2.6,
          cx = xe + 14 + (c.bh / 2) * k;
        if (xe < x0) continue;
        g.fillStyle = INK;
        g.fillText(nm, x0 + 2, y - 10);
        if (xe < x0 + g.measureText(nm).width + 10) continue;
        c.dir = 0;
        c.walk = t * 3;
        c.rest = (t + y) % 6 < 1.2 ? 1 : 0;
        drawCreature(g, c, cx, y, k, 7, col(c), t, false, true);
      }
      note(g, 'time →', 40, 236);
    },
  },
];
// the colour of Okabe–Ito palette entry k, as a creature's hue, saturation and lightness
const okabe = k => ({ hue: OKABE[k][2], sat: OKABE[k][3], lt: OKABE[k][4] });
function drawPic(t) {
  const P = PANES[intro.pane],
    cvs = $('#inPic');
  if (!P.draw) return;
  const r = Math.min(2, devicePixelRatio || 1),
    w = cvs.clientWidth;
  if (cvs.width !== Math.round(w * r)) {
    cvs.width = Math.round(w * r);
    cvs.height = Math.round(((w * PIC_H) / PIC_W) * r);
  }
  const g = cvs.getContext('2d'),
    s = cvs.width / PIC_W;
  g.setTransform(s, 0, 0, s, 0, 0);
  g.lineJoin = 'round';
  paper(g, PIC_W, PIC_H, 13);
  P.draw(g, t, (intro.pics[intro.pane] ||= {}));
}
function showPane(i) {
  intro.pane = i;
  $('#inTitle').hidden = i >= 0;
  $('#inPanes').hidden = i < 0;
  if (i < 0) return;
  const P = PANES[i];
  $('#inStep').textContent = `${i + 1} / ${PANES.length}`;
  $('#inH').textContent = P.h;
  $('#inTxt').innerHTML = P.p.map(x => `<p>${x}</p>`).join('');
  $('#inPic').hidden = !P.draw;
  $('#inArt').hidden = !P.html;
  if (P.html) $('#inArt').innerHTML = P.html();
  $('#inBack').textContent = i ? 'Back' : 'Title';
  $('#inNext').textContent = i === PANES.length - 1 ? 'Get Started' : 'Next';
  $('#inDots').innerHTML = PANES.map(
    (_, k) =>
      `<button data-k="${k}" aria-label="Page ${k + 1}"${k === i ? ' aria-current="step"' : ''}></button>`
  ).join('');
}
function introFrame(now) {
  if ($('#intro').hidden) return void (intro.raf = 0);
  const t = now / 1000,
    dt = Math.min(0.1, (now - (intro.last || now)) / 1000);
  intro.last = now;
  moveCrowd(dt, t);
  drawCrowd(t);
  if (intro.pane >= 0) drawPic(t);
  intro.raf = requestAnimationFrame(introFrame);
}
function openIntro() {
  $('#intro').hidden = false;
  intro.pics = {};
  showPane(-1);
  introCrowd();
  intro.last = 0;
  if (!intro.raf) intro.raf = requestAnimationFrame(introFrame);
  $('#inStart').focus();
}
function closeIntro() {
  $('#intro').hidden = true;
}
$('#inStart').onclick = () => showPane(0);
$('#inSkip').onclick = closeIntro;
$('#inClose').onclick = closeIntro;
$('#inBack').onclick = () => showPane(intro.pane - 1);
$('#inNext').onclick = () => (intro.pane === PANES.length - 1 ? closeIntro() : showPane(intro.pane + 1));
$('#inDots').onclick = e => {
  const b = e.target.closest('button');
  if (b) showPane(+b.dataset.k);
};
$('#crLogo').onclick = openIntro;
addEventListener('keydown', e => {
  if ($('#intro').hidden) return;
  if (e.key === 'Escape') closeIntro();
  else if (e.key === 'ArrowRight' && intro.pane < PANES.length - 1) showPane(intro.pane + 1);
  else if (e.key === 'ArrowLeft' && intro.pane >= 0) showPane(intro.pane - 1);
});
