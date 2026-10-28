/* All sound: Sam's music (the title music, and the music that plays when zoomed in), and, made live with the
   Web Audio API, ambient notes, small creature sounds and world-event effects. */

/* ---------- sound ---------- */
let AC = null,
  sound = true,
  lastSnd = 0;
// Safari can keep sound sent straight to the speakers silent even though the tab shows it playing, while sound
// played through an <audio> element (as YouTube does) is heard, so all the game's sound goes to OUT, which feeds
// a hidden <audio> element; browsers without that route send OUT straight to the speakers
let OUT = null,
  outEl = null;
function ensureAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
    if (AC) {
      OUT = AC.createGain();
      try {
        const dest = AC.createMediaStreamDestination();
        OUT.connect(dest);
        outEl = new Audio();
        outEl.srcObject = dest.stream;
      } catch (e) {
        OUT.connect(AC.destination);
        outEl = null;
      }
    }
    clockT = AC ? AC.currentTime : 0;
    clockWall = performance.now();
    stale = false;
  }
  if (AC && AC.state === 'suspended') AC.resume();
  playOut();
}
// the <audio> element may only start during a click or key press, and the browser may pause it while hidden
function playOut() {
  if (!outEl || !outEl.paused) return;
  const p = outEl.play();
  if (p && p.catch) p.catch(() => {});
}
// throw the sound engine away and start a fresh one; Safari can leave an engine "playing" (the tab shows the
// speaker) while nothing reaches the speakers, often after the Mac sleeps or the audio device changes
function resetAudio() {
  if (outEl) outEl.pause();
  if (AC && AC.close) AC.close().catch(() => {});
  AC = OUT = outEl = noiseBuf = null;
  ensureAudio();
}
// browsers pause a page's sound while it is hidden or the device sleeps (Safari calls this "interrupted"), so wake
// it when the page comes back into view, or on the next click or key press if the browser wants a gesture first;
// an engine found stuck is replaced on that click or key press, since browsers only start sound from one
function wakeAudio() {
  if (!AC) return;
  if (stale) return resetAudio();
  playOut();
  if (AC.state !== 'suspended' && AC.state !== 'interrupted') return;
  const p = AC.resume();
  if (p && p.catch) p.catch(() => (stale = true));
}
document.addEventListener('visibilitychange', () => {
  clockWall = performance.now();
  if (AC) clockT = AC.currentTime;
  if (!document.hidden) playOut();
  if (!document.hidden && AC && AC.state !== 'running') {
    const p = AC.resume();
    if (p && p.catch) p.catch(() => (stale = true));
  }
});
addEventListener('click', wakeAudio, true);
addEventListener('keydown', wakeAudio, true);
// watchdog: while the page is visible, an engine that says it is running must have its clock moving; one that
// is frozen, or still paused after a resume, is marked stuck and replaced on the next click or key press
let clockT = 0,
  clockWall = 0,
  stale = false;
setInterval(() => {
  if (!AC || !sound || document.hidden) return;
  const now = performance.now(),
    wall = (now - clockWall) / 1000,
    moved = AC.currentTime - clockT;
  if (wall >= AUDIO_CHECK) {
    if (AC.state === 'running' ? moved < wall * 0.5 : AC.state !== 'closed') stale = true;
    clockT = AC.currentTime;
    clockWall = now;
  }
}, 500);
function tone(f, d, type, vol, when = 0) {
  if (!AC || !sound) return;
  const t = AC.currentTime + when,
    o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(OUT);
  o.start(t);
  o.stop(t + d + 0.05);
}
const SND = {
  eat: () => tone(620, 0.07, 'triangle', 0.009),
  birth: () => {
    tone(392, 0.08, 'triangle', 0.014);
    tone(523, 0.09, 'triangle', 0.012, 0.07);
  },
  die: () => tone(180, 0.18, 'triangle', 0.05),
  badge: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.25, 'sine', 0.05, i * 0.08)),
};
function audible(c) {
  if (!sound || !S) return false;
  const n = performance.now();
  if (n - lastSnd < 70) return false;
  const ok = S.sel === c || (cam.z >= 1.8 && onScreen(c.x, c.y, 0));
  if (ok) lastSnd = n;
  return ok;
}
// the Sound setting turns all sound on or off; turning it back on always starts a fresh engine, so it is a sure
// cure for silence
$('#sSound').onclick = () => {
  sound = !sound;
  if (sound) resetAudio();
  syncSettings();
  if (sound) SND.birth();
};
// a half-second of white noise, the raw material of the world event effects
let noiseBuf = null;
function noiseInit() {
  if (noiseBuf || !AC) return;
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function sfxNoise(t, dur, type, f0, f1, q, vol) {
  noiseInit();
  const s = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = noiseBuf;
  s.loop = true;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(OUT);
  s.start(t);
  s.stop(t + dur + 0.05);
  return g;
}
function sweep(t, dur, type, f0, f1, vol) {
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(OUT);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const SFX = {
  // one of Extinction's small meteors: a short low thud
  thud: () => {
    if (!AC || !sound) return;
    sweep(AC.currentTime, 0.45, 'sine', 110, 32, 0.22);
  },
  flood: m => {
    if (!AC || !sound) return;
    const t = AC.currentTime,
      k = m ? 1.6 : 1;
    sfxNoise(t, 2.4 * k, 'lowpass', 300, 1400, 0.7, 0.09 * k);
    sfxNoise(t + 0.3, 2 * k, 'bandpass', 600, 250, 1.2, 0.05 * k);
  },
  drought: m => {
    if (!AC || !sound) return;
    const t = AC.currentTime,
      k = m ? 1.6 : 1;
    sfxNoise(t, 2.2 * k, 'highpass', 2500, 6000, 0.6, 0.04 * k);
  },
  quake: m => {
    if (!AC || !sound) return;
    const t = AC.currentTime,
      k = m ? 1.7 : 1;
    const g = sfxNoise(t, 2.6 * k, 'lowpass', 160, 80, 1, 0.22 * k);
    const lfo = AC.createOscillator(),
      lg = AC.createGain();
    lfo.frequency.value = 9;
    lg.gain.value = 0.08 * k;
    lfo.connect(lg).connect(g.gain);
    lfo.start(t);
    lfo.stop(t + 2.6 * k);
    sweep(t, 0.5, 'sine', 90, 38, 0.25 * k);
    sweep(t + 0.9, 0.5, 'sine', 80, 35, 0.18 * k);
  },
  meteor: m => {
    if (!AC || !sound) return;
    const t = AC.currentTime,
      k = m ? 1.5 : 1;
    sfxNoise(t, 1.1, 'bandpass', 6000, 400, 2, 0.06 * k);
    sweep(t + 1, 0.7, 'sine', 120, 30, 0.4 * k);
    sfxNoise(t + 1, 1.6 * k, 'lowpass', 1200, 90, 0.7, 0.2 * k);
  },
};
// while the world event sign flashes its warning, a soft beep once a second, on every other flash
let warnFrom = 0,
  warnBeeps = 0;
setInterval(() => {
  const on = S && !S.paused && !S.over && $('#evSq').classList.contains('warn');
  if (!on) return void (warnFrom = 0);
  const now = performance.now();
  if (!warnFrom) [warnFrom, warnBeeps] = [now, 0];
  if (now - warnFrom >= warnBeeps * 1000) {
    warnBeeps++;
    // only in the run-up: no beep in the moment the event itself happens
    if (S.nextEvent - S.t > 0.5) tone(WARN_BEEP.f, WARN_BEEP.dur, 'sine', WARN_BEEP.vol);
  }
}, 50);
/* ---------- music ---------- */
// Sam's music, made in GarageBand: the title music loops while the title screen, the intro panes or the creator
// is showing; the zoom music plays through a run and is heard when zoomed in. Browsers only start sound after a
// click or key press, so on first load the title music begins with the first one. Each file is the loop plus its
// first second again (tools/music.py): looping between 0.5 s and 0.5 s + the loop's length stays inside real
// music, whatever silence a browser's decoder adds at the start.
function track(cfg) {
  const m = { cfg, buf: null, bytes: null, src: null, gain: null, ctx: null, started: 0 };
  // the single-file build carries the files inside the page (AUDIO_DATA, added by tools/build.py)
  if (typeof AUDIO_DATA !== 'undefined' && AUDIO_DATA[cfg.src]) {
    const s = atob(AUDIO_DATA[cfg.src]),
      b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    m.bytes = b.buffer;
  } else
    fetch(cfg.src)
      .then(r => (r.ok ? r.arrayBuffer() : null))
      .then(b => (m.bytes = b))
      .catch(() => {});
  return m;
}
const titleMusic = track(TITLE_MUSIC),
  zoomMusic = track(ZOOM_MUSIC),
  ambientNotes = track(AMBIENT);
// the decoded sound, or null while it is still loading; decoded once, it also plays on a later fresh engine (see
// resetAudio)
function decoded(m) {
  if (!m.buf && m.bytes && AC) {
    AC.decodeAudioData(
      m.bytes,
      b => (m.buf = b),
      () => {}
    );
    m.bytes = null;
  }
  return m.buf;
}
// start the track from the beginning, fading in to vol
function musicStart(m, vol) {
  if (!decoded(m)) return;
  m.ctx = AC;
  m.src = AC.createBufferSource();
  m.gain = AC.createGain();
  m.src.buffer = m.buf;
  m.src.loop = true;
  m.src.loopStart = 0.5;
  m.src.loopEnd = 0.5 + m.cfg.loop;
  const t = (m.started = AC.currentTime);
  m.gain.gain.setValueAtTime(0, t);
  m.gain.gain.linearRampToValueAtTime(vol, t + m.cfg.fadeIn);
  m.src.connect(m.gain).connect(OUT);
  m.src.start(t);
}
// fade the track out and stop it
function musicStop(m) {
  if (!m.src) return;
  const t = m.ctx.currentTime;
  m.gain.gain.cancelScheduledValues(t);
  m.gain.gain.setValueAtTime(m.gain.gain.value, t);
  m.gain.gain.linearRampToValueAtTime(0, t + m.cfg.fadeOut);
  try {
    m.src.stop(t + m.cfg.fadeOut + 0.05);
  } catch (e) {}
  m.src = m.gain = null;
}
// play the track while on is true, at vol; a fresh sound engine (see resetAudio) needs it started again on it
function musicKeep(m, on, vol) {
  if (m.src && m.ctx !== AC) m.src = m.gain = null;
  if (!on || !AC) return musicStop(m);
  if (!m.src) return musicStart(m, vol);
  // already playing: follow vol smoothly once the fade-in is done
  if (AC.currentTime > m.started + m.cfg.fadeIn) m.gain.gain.setTargetAtTime(vol, AC.currentTime, 0.4);
}
function menusShowing() {
  return !$('#intro').hidden || !$('#creator').hidden;
}
// the first click or key press on the title screen starts the sound engine, so the title music can begin
addEventListener('click', () => !AC && sound && menusShowing() && ensureAudio(), true);
addEventListener('keydown', () => !AC && sound && menusShowing() && ensureAudio(), true);
setInterval(() => {
  const menus = menusShowing();
  musicKeep(titleMusic, sound && menus, TITLE_MUSIC.vol);
  // the zoom music runs for the whole run, so zooming in and out doesn't restart it: silent when zoomed out, and
  // fading in from ZOOM_MUSIC.from to full loudness at ZOOM_MUSIC.full (silent while paused)
  const run = sound && !menus && S && !S.over && !S.replay,
    zoomed = clamp((cam.z - ZOOM_MUSIC.from) / (ZOOM_MUSIC.full - ZOOM_MUSIC.from), 0, 1);
  musicKeep(zoomMusic, run, run && !S.paused ? zoomed * ZOOM_MUSIC.vol : 0);
  // the ambient notes fade out as the zoom music fades in, gone by AMB_GONE, notes still ringing included
  const amb = 1 - clamp((cam.z - ZOOM_MUSIC.from) / (AMB_GONE - ZOOM_MUSIC.from), 0, 1);
  if (ambBus && ambBus.context === AC) ambBus.gain.setTargetAtTime(amb, AC.currentTime, 0.4);
}, 100);
// Sam's ambient notes (D4 F4 G4 C5 D5 F5 G5 C6, one every 2 bars in one file): every 1.2 s, a 60% chance of one
// at random, sometimes with a quieter echo an octave up (the same note at double speed, so also half as long)
let ambBus = null;
function ambientNote(k, when, rate, vol) {
  // all the notes go through one loudness control, which follows the zoom (see the music loop above)
  if (!ambBus || ambBus.context !== AC) {
    ambBus = AC.createGain();
    ambBus.connect(OUT);
  }
  const s = AC.createBufferSource(),
    g = AC.createGain(),
    // each slice starts just before its note, in the silence after the one before
    from = Math.max(0, k * AMBIENT.spacing - 0.05);
  s.buffer = ambientNotes.buf;
  s.playbackRate.value = rate;
  g.gain.value = vol;
  s.connect(g).connect(ambBus);
  s.start(AC.currentTime + when, from, AMBIENT.spacing);
}
setInterval(() => {
  if (!AC || !decoded(ambientNotes)) return;
  if (sound && S && !S.paused && !S.over && rand() < 0.6) {
    const k = (rand() * AMBIENT.notes) | 0;
    ambientNote(k, 0, 1, AMB_VOL);
    if (rand() < 0.35) ambientNote(k, 0.2, 2, AMB_ECHO);
  }
}, 1200);
