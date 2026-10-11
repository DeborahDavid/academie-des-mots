/**
 * Musique originale, style synthwave années 80, synthétisée en direct (Web Audio) :
 * basse analogique pulsée, arpèges, nappe, mélodie, batterie électronique, réverbération et écho.
 * Mélodie et arrangement composés pour l'Académie des Mots : aucun morceau existant.
 *
 * Jamais pendant les exercices : le thème ne joue que sur l'écran principal.
 */
import { audio } from './sfx';

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* ------------------------------ chaîne audio ------------------------------ */

interface Bus {
  ac: AudioContext;
  input: GainNode; // son sec
  send: GainNode; // vers réverbération + écho
  master: GainNode;
}

let bus: Bus | null = null;

function impulse(ac: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function getBus(): Bus | null {
  const ac = audio();
  if (!ac) return null;
  if (bus && bus.ac === ac) return bus;
  const master = ac.createGain();
  master.gain.value = 0;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master.connect(comp).connect(ac.destination);

  const input = ac.createGain();
  input.connect(master);

  // Réverbération large (« salle d'observatoire ») + écho en croche pointée.
  const send = ac.createGain();
  const reverb = ac.createConvolver();
  reverb.buffer = impulse(ac, 2.8, 2.2);
  const rvGain = ac.createGain();
  rvGain.gain.value = 0.5;
  send.connect(reverb).connect(rvGain).connect(master);
  const delay = ac.createDelay(1);
  delay.delayTime.value = (60 / BPM) * 0.75;
  const fb = ac.createGain();
  fb.gain.value = 0.32;
  const dlFilter = ac.createBiquadFilter();
  dlFilter.type = 'lowpass';
  dlFilter.frequency.value = 2200;
  send.connect(delay).connect(dlFilter).connect(fb).connect(delay);
  dlFilter.connect(master);

  bus = { ac, input, send, master };
  return bus;
}

/* ------------------------------ instruments ------------------------------ */

type Voice = (b: Bus, t: number, note: number, dur: number, vel?: number) => void;

function env(g: GainNode, t: number, peak: number, attack: number, dur: number, release: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + Math.max(attack, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, dur) + release);
}

function osc(b: Bus, type: OscillatorType, freq: number, detune = 0) {
  const o = b.ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  return o;
}

/** Basse : dent de scie filtrée, enveloppe de filtre « pluck ». */
const bass: Voice = (b, t, note, dur, vel = 1) => {
  const o = osc(b, 'sawtooth', midi(note));
  const f = b.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 6;
  f.frequency.setValueAtTime(1400, t);
  f.frequency.exponentialRampToValueAtTime(180, t + 0.22);
  const g = b.ac.createGain();
  env(g, t, 0.32 * vel, 0.005, dur * 0.7, 0.08);
  o.connect(f).connect(g).connect(b.input);
  o.start(t);
  o.stop(t + dur + 0.2);
};

/** Arpège : deux carrés désaccordés, courts, avec écho. */
const arp: Voice = (b, t, note, dur, vel = 1) => {
  const g = b.ac.createGain();
  env(g, t, 0.07 * vel, 0.004, dur * 0.5, 0.12);
  const f = b.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2600;
  g.connect(f);
  f.connect(b.input);
  f.connect(b.send);
  for (const d of [-7, 7]) {
    const o = osc(b, 'square', midi(note), d);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.2);
  }
};

/** Nappe : trois dents de scie désaccordées, attaque lente. */
const pad: Voice = (b, t, note, dur, vel = 1) => {
  const g = b.ac.createGain();
  env(g, t, 0.05 * vel, 0.6, dur, 1.2);
  const f = b.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1500;
  g.connect(f);
  f.connect(b.input);
  f.connect(b.send);
  for (const d of [-12, 0, 12]) {
    const o = osc(b, 'sawtooth', midi(note), d);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 1.4);
  }
};

/** Mélodie : dent de scie + triangle à l'octave, léger vibrato, beaucoup d'écho. */
const lead: Voice = (b, t, note, dur, vel = 1) => {
  const g = b.ac.createGain();
  env(g, t, 0.075 * vel, 0.02, dur * 0.85, 0.25);
  const f = b.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 3200;
  g.connect(f);
  f.connect(b.input);
  f.connect(b.send);
  const lfo = b.ac.createOscillator();
  lfo.frequency.value = 5.5;
  const depth = b.ac.createGain();
  depth.gain.value = 9;
  lfo.connect(depth);
  for (const [type, oct] of [['sawtooth', 0], ['triangle', 12]] as const) {
    const o = osc(b, type, midi(note + oct));
    depth.connect(o.detune);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.4);
  }
  lfo.start(t);
  lfo.stop(t + dur + 0.4);
};

/** Cloche cristalline (jingles). */
const bell: Voice = (b, t, note, dur, vel = 1) => {
  const g = b.ac.createGain();
  env(g, t, 0.09 * vel, 0.005, 0.02, dur);
  g.connect(b.input);
  g.connect(b.send);
  for (const [mult, amp] of [[1, 1], [3.01, 0.25]] as const) {
    const o = osc(b, 'sine', midi(note) * mult);
    const a = b.ac.createGain();
    a.gain.value = amp;
    o.connect(a).connect(g);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
};

function noiseBuffer(ac: AudioContext) {
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
let noise: AudioBuffer | null = null;

function drum(b: Bus, t: number, kind: 'kick' | 'snare' | 'hat' | 'crash', vel = 1) {
  const { ac } = b;
  if (kind === 'kick') {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ac.createGain();
    env(g, t, 0.5 * vel, 0.002, 0.02, 0.22);
    o.connect(g).connect(b.input);
    o.start(t);
    o.stop(t + 0.3);
    return;
  }
  noise ??= noiseBuffer(ac);
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  if (kind === 'snare') {
    f.type = 'bandpass';
    f.frequency.value = 1800;
    env(g, t, 0.22 * vel, 0.002, 0.02, 0.18);
    g.connect(b.send); // caisse claire « gated » réverbérée, typique des années 80
  } else if (kind === 'hat') {
    f.type = 'highpass';
    f.frequency.value = 8000;
    env(g, t, 0.05 * vel, 0.001, 0.01, 0.05);
  } else {
    f.type = 'highpass';
    f.frequency.value = 4000;
    env(g, t, 0.12 * vel, 0.002, 0.05, 2.5);
    g.connect(b.send);
  }
  src.connect(f).connect(g).connect(b.input);
  src.start(t);
  src.stop(t + 3);
}

/* ------------------------------ composition ------------------------------ */

const BPM = 100;
const STEP = 60 / BPM / 4; // double croche

/** Grille d'accords (8 mesures) : la mineur — fa — do — sol | fa — sol — la mineur — la mineur. */
const CHORDS: { root: number; tones: number[] }[] = [
  { root: 45, tones: [57, 60, 64] },
  { root: 41, tones: [53, 57, 60] },
  { root: 48, tones: [55, 60, 64] },
  { root: 43, tones: [55, 59, 62] },
  { root: 41, tones: [53, 57, 60] },
  { root: 43, tones: [55, 59, 62] },
  { root: 45, tones: [57, 60, 64] },
  { root: 45, tones: [57, 60, 64] },
];

/** Mélodie originale : [pas de double croche, note MIDI, durée en pas], par mesure. */
const MELODY: [number, number, number][][] = [
  [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 69, 6]],
  [[0, 72, 3], [3, 74, 1], [4, 76, 2], [6, 79, 6]],
  [[0, 79, 3], [3, 76, 1], [4, 74, 2], [6, 72, 6]],
  [[0, 74, 3], [3, 76, 1], [4, 74, 2], [6, 71, 8]],
  [[0, 81, 3], [3, 79, 1], [4, 77, 2], [6, 76, 6]],
  [[0, 74, 2], [2, 76, 2], [4, 79, 8]],
  [[0, 81, 12]],
  [[0, 76, 2], [2, 74, 2], [4, 72, 4], [8, 69, 8]],
];

const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];

/** Programme une mesure du thème. `layer` : 0 = intro douce, 1 = avec batterie, 2 = avec mélodie. */
function scheduleBar(b: Bus, t: number, bar: number, layer: number) {
  const c = CHORDS[bar % 8];
  const tones = [...c.tones.map((n) => n + 12), c.tones[0] + 24];
  if (bar % 2 === 0) for (const n of c.tones) pad(b, t, n, STEP * 32 - 0.3, 0.9);
  for (let s = 0; s < 16; s++) {
    const ts = t + s * STEP;
    arp(b, ts, tones[ARP_PATTERN[s]], STEP, s % 4 === 0 ? 1 : 0.7);
    if (s % 2 === 0) bass(b, ts, c.root + (s % 4 === 2 ? 12 : 0), STEP * 2, 0.9);
    if (layer >= 1) {
      if (s === 0 || s === 8) drum(b, ts, 'kick');
      if (s === 4 || s === 12) drum(b, ts, 'snare');
      if (s % 2 === 1) drum(b, ts, 'hat', s % 4 === 3 ? 1 : 0.6);
    }
  }
  if (layer >= 2) for (const [s, n, len] of MELODY[bar % 8]) lead(b, t + s * STEP, n, len * STEP);
}

/* ------------------------------ lecture ------------------------------ */

let timer: ReturnType<typeof setInterval> | null = null;
let nextBarTime = 0;
let barIndex = 0;

const THEME_VOLUME = 0.4;

/** Démarre le thème de l'écran principal (boucle de 8 mesures, qui s'étoffe progressivement). */
export function startTheme() {
  const b = getBus();
  if (!b || timer) return;
  b.master.gain.cancelScheduledValues(b.ac.currentTime);
  b.master.gain.setValueAtTime(b.master.gain.value, b.ac.currentTime);
  b.master.gain.linearRampToValueAtTime(THEME_VOLUME, b.ac.currentTime + 1.5);
  nextBarTime = b.ac.currentTime + 0.1;
  barIndex = 0;
  const barDur = STEP * 16;
  const tick = () => {
    while (nextBarTime < b.ac.currentTime + 0.4) {
      const layer = barIndex < 4 ? 0 : barIndex < 8 ? 1 : 2;
      scheduleBar(b, nextBarTime, barIndex, layer);
      nextBarTime += barDur;
      barIndex++;
    }
  };
  tick();
  timer = setInterval(tick, 100);
}

/** Arrête le thème en fondu (avant une séance : silence pendant le travail). */
export function stopTheme() {
  if (timer) clearInterval(timer);
  timer = null;
  const b = bus;
  if (!b) return;
  const now = b.ac.currentTime;
  b.master.gain.cancelScheduledValues(now);
  b.master.gain.setValueAtTime(b.master.gain.value, now);
  b.master.gain.linearRampToValueAtTime(0, now + 0.6);
}

export function isThemePlaying() {
  return timer !== null;
}

/** Joue un court motif hors thème (jingles). */
function withBus(fn: (b: Bus, t: number) => number) {
  const b = getBus();
  if (!b) return;
  stopTheme();
  const t = b.ac.currentTime + 0.12;
  b.master.gain.cancelScheduledValues(b.ac.currentTime);
  b.master.gain.setValueAtTime(0.8, t - 0.05);
  const end = fn(b, t);
  b.master.gain.setValueAtTime(0.8, end);
  b.master.gain.linearRampToValueAtTime(0, end + 1.5);
}

/** Notion maîtrisée / nouvelle constellation (~3 s) : étoiles qui montent, nappe lumineuse. */
export function playConstellationJingle(muted: boolean) {
  if (muted) return;
  withBus((b, t) => {
    const notes = [72, 76, 79, 83, 84, 88, 91, 96];
    notes.forEach((n, i) => bell(b, t + i * 0.11, n, 1.6, 0.9));
    for (const n of [60, 64, 67, 71]) pad(b, t, n, 1.6, 1.1);
    return t + 2.2;
  });
}

/** Fin de séance (~8 s) : montée d'arpèges, batterie, accord final triomphant avec cymbale. */
export function playFanfare(muted: boolean) {
  if (muted) return;
  withBus((b, t) => {
    const s = 60 / 116 / 4;
    const run: { root: number; tones: number[] }[] = [CHORDS[1], CHORDS[3], CHORDS[0], { root: 48, tones: [60, 64, 67] }];
    run.forEach((c, beatGroup) => {
      for (let i = 0; i < 8; i++) {
        const ts = t + (beatGroup * 8 + i) * s;
        const tones = [...c.tones.map((n) => n + 12), c.tones[0] + 24];
        arp(b, ts, tones[ARP_PATTERN[i]], s, 1);
        if (i % 2 === 0) bass(b, ts, c.root, s * 2);
        if (i === 0 || i === 4) drum(b, ts, 'kick');
        if (i === 4) drum(b, ts, 'snare');
      }
    });
    // montée de la mélodie puis accord final en do majeur
    const climb = t + 32 * s;
    [72, 74, 76, 79].forEach((n, i) => lead(b, t + (i * 8 + 4) * s, n, s * 4));
    drum(b, climb, 'crash');
    drum(b, climb, 'kick');
    for (const n of [48, 55, 60, 64, 67, 72]) pad(b, climb, n, 3.2, 1.3);
    lead(b, climb, 84, 3);
    [84, 88, 91, 96].forEach((n, i) => bell(b, climb + 0.3 + i * 0.15, n, 2.4, 0.7));
    return climb + 3.6;
  });
}
