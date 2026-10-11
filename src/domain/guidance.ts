import type { GuidanceLevel } from './model';

/**
 * Questions de relecture (guidage niveau 1, spec 5.3). Elles sont générales :
 * elles ne désignent jamais un mot précis de la phrase.
 */
export function guidedQuestions(notionIds: string[]): string[] {
  const has = (prefix: string) => notionIds.some((n) => n.startsWith(prefix));
  const q = ['Y a-t-il des mots au féminin ? Vérifie les mots qui vont avec.', 'Y a-t-il des mots au pluriel ? Vérifie les mots qui vont avec.'];
  q.push('Pour chaque verbe : qui fait l’action ? Est-ce singulier ou pluriel ?');
  if (has('inf-pp')) q.push('Un mot finit par le son « é » ? Remplace-le par « vendre » ou « vendu » pour choisir -er ou -é.');
  if (has('homo-')) q.push('Les petits mots qui se prononcent pareil (a/à, et/est, son/sont…) : essaie de les remplacer pour vérifier.');
  if (has('conj-')) q.push('À quel temps est la phrase ? Vérifie la terminaison des verbes.');
  return q;
}

/** Consigne de la passe 2 selon le niveau de guidage de la notion. */
export function proofTwoPrompt(level: GuidanceLevel): string {
  return level === 1 ? 'Relis tes accords. Réponds à chaque question.' : 'Relis tes accords.';
}

/** Retour après une validation avec des erreurs : jamais d'indication de l'endroit. */
export function remainingErrorsText(count: number): string {
  return count === 1 ? 'Il reste 1 erreur.' : `Il reste ${count} erreurs.`;
}
