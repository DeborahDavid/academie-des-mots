/** Répliques d'Elsa. Jamais de moquerie ; jamais « Le POULET ! » après une erreur. */

const pick = <T,>(arr: readonly T[], rng: () => number) => arr[Math.floor(rng() * arr.length)];

export const HELLO_LINES = ['Salut Leyu !', 'Coucou Leyu !', 'Te revoilà, Leyu !', 'Prête pour la magie, Leyu ?'] as const;

// « Une nouvelle étoile ! » est réservée aux vraies étoiles (mot acquis).
const SUCCESS_LINES = [
  'Sort réussi !',
  'Trop forte !',
  'Bien joué !',
  'Parfait !',
  'Magique !',
  'Waouh !',
  'Incroyable !',
  'Tu es une championne !',
  'Exactement !',
  'Bravo, magicienne !',
  'Ça, c’est de la magie !',
  'Impeccable !',
  'Tu assures !',
  'Et hop, un sort de plus !',
  'Pile poil !',
  'Génial !',
  'Ada serait fière de toi !',
  'Super sort !',
  'Tu deviens imbattable !',
  'Quelle magicienne !',
] as const;

export const OOPS_LINES = ['Oups ! On réessaie ?', 'Presque ! Regarde bien.', 'Pas grave, on regarde ensemble.', 'Ça arrive ! Regarde.'] as const;

export const AFTER_FAIL_LINES = ['Ce mot reviendra, tu l’auras !', 'On le revoit bientôt.', 'Tu progresses à chaque essai.'] as const;

export const END_LINES = ['Quelle séance !', 'Le ciel brille grâce à toi !', 'Tu es une vraie magicienne des mots !'] as const;

/** « Le POULET ! » environ une réussite sur cinq ; jamais deux fois la même réplique d'affilée. */
let lastSuccess = '';
export function successLine(rng: () => number = Math.random): string {
  let line = lastSuccess;
  while (line === lastSuccess) line = rng() < 0.2 ? 'Le POULET !' : pick(SUCCESS_LINES, rng);
  lastSuccess = line;
  return line;
}

export function randomLine(lines: readonly string[], rng: () => number = Math.random): string {
  return pick(lines, rng);
}
