/** Petits sons originaux générés en direct (Web Audio). */

let ctx: AudioContext | null = null;

export function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function bell(ac: AudioContext, freq: number, start: number, gain: number, dur = 1.1) {
  // Cloche douce : fondamentale + harmonique légère, attaque rapide, longue extinction.
  for (const [mult, g] of [[1, 1], [2.76, 0.18], [5.4, 0.06]] as const) {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(gain * g, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }
}

/** Tintement de réussite (~1 s) : deux notes cristallines montantes. */
export function playSuccessChime(muted: boolean) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  bell(ac, 1318.5, t, 0.16); // mi
  bell(ac, 1975.5, t + 0.11, 0.12); // si
}

/** Variante plus riche quand une étoile s'allume (mot acquis). */
export function playStarChime(muted: boolean) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(ac, f, t + i * 0.09, 0.12, 1.4));
}

/** Après une erreur : deux notes graves et feutrées qui descendent (~0,4 s), jamais un buzzer. */
export function playOopsSound(muted: boolean) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  [[392, 0], [311, 0.13]].forEach(([f, dt]) => {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    const lp = ac.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = f;
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    amp.gain.setValueAtTime(0, t + dt);
    amp.gain.linearRampToValueAtTime(0.09, t + dt + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.28);
    osc.connect(lp).connect(amp).connect(ac.destination);
    osc.start(t + dt);
    osc.stop(t + dt + 0.32);
  });
}
