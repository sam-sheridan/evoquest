/* End of run: the summary screen, saved past runs, the family tree drawing and the replay. */

/* end */
function endRun() {
  S.over = true;
  S.paused = true;
  S.species.forEach(s => {
    if (!s.died) s.died = S.t;
  });
  const run = {
    name: S.design.name,
    genus: S.genus,
    seed: S.seed,
    date: Date.now(),
    dur: Math.round(S.t),
    maxGen: S.maxGen,
    peak: S.peak,
    born: S.born,
    events: S.events,
    species: S.species.length,
    badges: S.badges.slice(),
    design: S.design,
  };
  saved.runs.unshift(run);
  saved.runs = saved.runs.slice(0, 30);
  save();
  SND.die();
  showEnd(run);
  syncUI(true);
}
function showEnd(run) {
  const DB = S.deathBy,
    tot = Object.values(DB).reduce((a, b) => a + b, 0) || 1;
  const dcol = { starvation: '#b5651d', 'old age': '#636d69', 'meteor strike': '#ff4f1a' };
  $('#endBody').innerHTML =
    `<div class="brand"><h1>Lineage extinct</h1><p class="latin">${esc(S.genus)} · world #${run.seed}</p></div>
  <p class="hint">The ${esc(run.name)} lasted ${fmtT(run.dur)} and produced ${run.species} species.</p>
  <div class="statgrid">
   <div class="stat"><span class="lbl">Time alive</span><b>${fmtT(run.dur)}</b></div><div class="stat"><span class="lbl">Generations</span><b>${run.maxGen}</b></div>
   <div class="stat"><span class="lbl">Peak pop.</span><b>${run.peak}</b></div><div class="stat"><span class="lbl">Ever born</span><b>${run.born}</b></div>
   <div class="stat"><span class="lbl">Species</span><b>${run.species}</b></div><div class="stat"><span class="lbl">Achievements</span><b>${run.badges.length}</b></div>
  </div>
  <span class="lbl">How they died</span>
  <div class="deaths">${Object.entries(DB)
    .filter(([, v]) => v)
    .map(([k, v]) => `<i style="width:${(v / tot) * 100}%;background:${dcol[k]}"></i>`)
    .join('')}</div>
  <p class="hint" style="margin-top:0">${Object.entries(DB)
    .filter(([, v]) => v)
    .map(([k, v]) => `<span style="color:${dcol[k]}">■</span> ${k} ${Math.round((v / tot) * 100)}%`)
    .join(' &nbsp; ')}</p>
  <span class="lbl">Species</span>
  <div class="tw">${speciesTable(false)}</div>
  <p class="hint">Highlighted: the traits that most set each species apart from the one it split from (primus from the starting design).</p>
  <p class="hint">Body traits change because the world rewards some values over others. Look traits change only through random variation between parent and offspring, which is why related groups slowly end up looking different.</p>
  <span class="lbl">Family tree</span><div class="treewrap" style="margin-top:6px">${treeSVG(Math.min(780, innerWidth - 70))}</div>
  <div class="row" style="margin-top:16px"><button class="btn primary" id="eReplay">Watch replay</button><button class="btn" id="eSame">New species, same world</button><button class="btn" id="eNew">New species, new world</button></div>
  <h3 class="sec" style="margin-top:20px">Past lineages</h3>${histHTML()}`;
  drawPics($('#endBody'));
  $('#end').hidden = false;
  $('#eReplay').onclick = () => {
    $('#end').hidden = true;
    startReplay();
  };
  $('#eSame').onclick = () => {
    $('#end').hidden = true;
    openCreator(S.seed);
  };
  $('#eNew').onclick = () => {
    $('#end').hidden = true;
    openCreator(null);
  };
  bindHist($('#endBody'));
}
function histHTML() {
  if (!saved.runs.length) return '<p class="hint">None yet.</p>';
  return (
    '<ul class="hist">' +
    saved.runs
      .slice(0, 10)
      .map(
        (
          r,
          i
        ) => `<li><i style="background:hsl(${r.design?.hue ?? 200} ${r.design?.sat ?? 60}% ${r.design?.lt ?? 70}%)"></i>
   <div><b>${esc(r.name)}</b> <small>world #${r.seed} · ${new Date(r.date).toLocaleDateString()}</small><br><small>${fmtT(r.dur)} · ${r.maxGen} gens · ${r.species || 1} species · peak ${r.peak}</small></div>
   <button class="btn" data-revisit="${i}">Revisit world</button></li>`
      )
      .join('') +
    '</ul>'
  );
}
function bindHist(root) {
  root.querySelectorAll('[data-revisit]').forEach(
    b =>
      (b.onclick = () => {
        const r = saved.runs[+b.dataset.revisit];
        $('#end').hidden = true;
        openCreator(r.seed, r.design);
      })
  );
}

function treeSVG(width) {
  const sps = S.species;
  const order = [];
  const kids = id => sps.filter(s => s.parent === id);
  const walk = s => {
    order.push(s);
    kids(s.id).forEach(walk);
  };
  sps.filter(s => s.parent === null).forEach(walk);
  const rowH = 34,
    top = 14,
    L = 10,
    R = width - 10,
    T = Math.max(30, S.t),
    X = t => L + ((R - L) * t) / T,
    h = top + order.length * rowH + 10;
  const Y = {};
  order.forEach((s, i) => (Y[s.id] = top + i * rowH + 18));
  let out = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Mono, monospace">`;
  // a marker every minute, or every few minutes on long runs so the labels don't overlap; from an hour on they
  // read hh:mm:ss
  const every = 60 * Math.max(1, Math.ceil(T / 60 / 15));
  for (let m = 0; m <= T; m += every) {
    const x = X(m);
    const lab = m < 3600 ? m / 60 + 'm' : fmtT(m);
    out += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="currentColor" stroke-opacity=".07"/>`;
    // a label is left off if it wouldn't fit before the right edge
    if (x + 2 + lab.length * 5 <= width)
      out += `<text x="${x + 2}" y="9" font-size="8" fill="#636d69">${lab}</text>`;
  }
  for (const s of order) {
    const x0 = X(s.born),
      x1 = X(s.died ?? S.t),
      y = Y[s.id],
      alive = !s.died;
    if (s.parent !== null)
      out += `<path d="M${x0} ${Y[s.parent]}V${y}" stroke="currentColor" stroke-width="1" fill="none"/>`;
    out += `<line x1="${x0}" y1="${y}" x2="${Math.max(x1, x0 + 2)}" y2="${y}" stroke="${s.tag}" stroke-width="${alive ? 4 : 2}" stroke-opacity="${alive ? 1 : 0.55}"/>`;
    if (!alive) out += `<line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="currentColor"/>`;
    const lx = Math.min(x0 + 3, width - 170);
    out += `<text x="${lx}" y="${y - 7}" font-size="10.5" fill="#151918" font-family="IBM Plex Sans, sans-serif"><tspan font-style="italic">${esc(S.genus)} ${s.epithet}</tspan><tspan font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#636d69"> ${alive ? s.n + ' alive' : '† ' + fmtT(s.died)}</tspan></text>`;
  }
  return out + '</svg>';
}

/* replay */
function startReplay() {
  if (!S.frames.length) return;
  S.replay = { i: 0, acc: 0 };
  $('#replayBar').hidden = false;
  $('#sheet').hidden = true;
  cam.z = fitZ();
  cam.x = W / 2;
  cam.y = H / 2;
}
function advanceReplay(dt) {
  const r = S.replay;
  r.acc += dt * 12;
  while (r.acc >= 1) {
    r.acc -= 1;
    r.i++;
  }
  if (r.i >= S.frames.length) r.i = 0;
  const f = S.frames[r.i];
  $('#rpLabel').textContent = `REPLAY ${fmtT(f.t)} / ${fmtT(S.t)} · ${f.a.length / 6} alive`;
}
$('#rpExit').onclick = () => {
  S.replay = null;
  $('#replayBar').hidden = true;
  showEnd(saved.runs[0]);
};
