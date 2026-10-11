import { stripAccents } from './compare';

/**
 * Indice automatique sur la structure du mot attendu.
 * Ne montre JAMAIS de forme incorrecte ni de lettre isolée du mot : seulement des faits.
 */
export function autoHint(expected: string): string {
  const facts: string[] = [];
  // Le mot cible est le dernier mot (ex. « la forêt » → « forêt »).
  const target = expected.split(/\s+/).at(-1) ?? expected;
  const letters = [...target].filter((c) => /\p{L}/u.test(c)).length;
  facts.push(`Ce mot a ${letters} lettres`);

  const plain = stripAccents(target.toLowerCase());
  const doubles = plain.match(/([bcdfghjklmnpqrstvwxz])\1/g) ?? [];
  if (doubles.length === 1) facts.push('il y a une consonne double');
  if (doubles.length > 1) facts.push(`il y a ${doubles.length} consonnes doubles`);

  const accents = new Set<string>();
  for (const c of target.normalize('NFD')) {
    if (c === '́') accents.add('un accent aigu');
    if (c === '̀') accents.add('un accent grave');
    if (c === '̂') accents.add('un accent circonflexe');
    if (c === '̈') accents.add('un tréma');
    if (c === '̧') accents.add('une cédille');
  }
  if (/[œæ]/i.test(target)) accents.add('une lettre collée (œ)');
  if (accents.size) facts.push(`il y a ${[...accents].join(' et ')}`);
  else facts.push('il n’y a pas d’accent');

  if (target.includes('’')) facts.push('il y a une apostrophe');
  if (target.includes('-')) facts.push('il y a un trait d’union');

  return `${facts.join(', ')}.`;
}
