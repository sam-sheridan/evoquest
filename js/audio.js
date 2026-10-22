/* All sound, made live with the Web Audio API: ambient notes, small creature sounds, world-event effects and
   the beat that plays when zoomed in. */

/* ---------- sound (the original ambient set) ---------- */
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
  AC = OUT = outEl = beatBus = noiseBuf = null;
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
// every 1.2 s, a 60% chance of one soft note from A3 B3 D4 E4 G4 A4 B4, sometimes with a quiet octave echo
const NOTES = [220, 247, 294, 330, 392, 440, 494];
setInterval(() => {
  if (sound && S && !S.paused && !S.over && rand() < 0.6) {
    const f = NOTES[(rand() * NOTES.length) | 0];
    tone(f, 1.4, 'sine', AMB_VOL);
    if (rand() < 0.35) tone(f * 2, 0.9, 'sine', AMB_ECHO, 0.2);
  }
}, 1200);
// the Sound setting turns all sound on or off; turning it back on always starts a fresh engine, so it is a sure
// cure for silence
$('#sSound').onclick = () => {
  sound = !sound;
  if (sound) resetAudio();
  syncSettings();
  if (sound) SND.birth();
};
let beatBus = null,
  noiseBuf = null,
  beatNext = 0,
  beatStep = 0;
function beatInit() {
  if (beatBus || !AC) return;
  beatBus = AC.createGain();
  beatBus.gain.value = 0;
  beatBus.connect(OUT);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function noise(t, dur, type, freq, q, vol) {
  const s = AC.createBufferSource(),
    f = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = noiseBuf;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(beatBus);
  s.start(t);
  s.stop(t + dur + 0.02);
}
function kick(t) {
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g).connect(beatBus);
  o.start(t);
  o.stop(t + 0.26);
}
function snare(t) {
  noise(t, 0.13, 'bandpass', 1800, 0.9, 0.5);
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(330, t);
  o.frequency.exponentialRampToValueAtTime(190, t + 0.08);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g).connect(beatBus);
  o.start(t);
  o.stop(t + 0.12);
}
function hat(t, acc) {
  noise(t, acc ? 0.05 : 0.035, 'highpass', 7500, 0.7, acc ? 0.28 : 0.18);
}
// 50 bpm, semiquavers: one step every 0.3 s
setInterval(() => {
  if (!AC || !sound) return;
  beatInit();
  const on = S && !S.paused && !S.over && !S.replay,
    lvl = on ? clamp((cam.z - 1.6) / 1.6, 0, 1) * BEAT_VOL : 0;
  beatBus.gain.setTargetAtTime(lvl, AC.currentTime, 0.4);
  if (lvl <= 0.001 && beatBus.gain.value < 0.002) {
    beatNext = 0;
    return;
  }
  if (beatNext < AC.currentTime) beatNext = AC.currentTime + 0.05;
  while (beatNext < AC.currentTime + 0.3) {
    const s = beatStep % 8;
    if (s === 0) kick(beatNext);
    else if (s === 4) snare(beatNext);
    else hat(beatNext, s === 2 || s === 6);
    beatNext += 0.3;
    beatStep++;
  }
}, 60);
function sfxNoise(t, dur, type, f0, f1, q, vol) {
  beatInit();
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
  flood: m => {
    if (!AC || !sound) return;
    const t = AC.currentTime,
      k = m ? 1.6 : 1;
    sfxNoise(t, 2.4 * k, 'lowpass', 300, 1400, 0.7, 0.09 * k);
    sfxNoise(t + 0.3, 2 * k, 'bandpass', 600, 250, 1.2, 0.05 * k);
    [392, 330, 262].forEach((f, i) => sweep(t + i * 0.22, 0.7, 'sine', f, f * 0.92, 0.035));
  },
  drought: m => {
    if (!AC || !sound) return;
    const t = AC.currentTime,
      k = m ? 1.6 : 1;
    sfxNoise(t, 2.2 * k, 'highpass', 2500, 6000, 0.6, 0.04 * k);
    [523, 659, 784, 1046].forEach((f, i) => sweep(t + i * 0.16, 0.9, 'triangle', f, f * 1.02, 0.025));
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
function syncSettings() {
  $('#sSound').setAttribute('aria-pressed', String(sound));
}
