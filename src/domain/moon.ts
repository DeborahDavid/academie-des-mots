export const MOON_PHASES = [
  'Nouvelle lune',
  'Premier croissant',
  'Premier quartier',
  'Gibbeuse croissante',
  'Pleine lune',
  'Gibbeuse décroissante',
  'Dernier quartier',
  'Dernier croissant',
] as const;

export function nextMoonPhase(phase: number, steps = 1): number {
  return (((phase + steps) % MOON_PHASES.length) + MOON_PHASES.length) % MOON_PHASES.length;
}
