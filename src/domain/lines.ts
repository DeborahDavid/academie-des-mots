/** Répliques d'Elsa. Jamais de moquerie ; jamais « Le POULET ! » après une erreur. */

const pick = <T,>(arr: readonly T[], rng: () => number) => arr[Math.floor(rng() * arr.length)];

export const HELLO_LINES = ['Salut Leyu !', 'Coucou Leyu !', 'Te revoilà, Leyu !', 'Prête pour la magie, Leyu ?'] as const;

const SUCCESS_LINES = ['Sort réussi !', 'Une nouvelle étoile !', 'Trop forte !', 'Bien joué !', 'Parfait !', 'Magique !'] as const;

export const OOPS_LINES = ['Oups ! On réessaie ?', 'Presque ! Regarde bien.', 'Pas grave, on regarde ensemble.', 'Ça arrive ! Regarde.'] as const;

export const AFTER_FAIL_LINES = ['Ce mot reviendra, tu l’auras !', 'On le revoit bientôt.', 'Tu progresses à chaque essai.'] as const;

export const END_LINES = ['Quelle séance !', 'Le ciel brille grâce à toi !', 'Tu es une vraie magicienne des mots !'] as const;

/** « Le POULET ! » environ une réussite sur deux. */
export function successLine(rng: () => number = Math.random): string {
  return rng() < 0.5 ? 'Le POULET !' : pick(SUCCESS_LINES, rng);
}

export function randomLine(lines: readonly string[], rng: () => number = Math.random): string {
  return pick(lines, rng);
}
