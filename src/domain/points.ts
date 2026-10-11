import type { Outcome } from './model';

/**
 * Points : jamais retirés (pas de pénalité). Ils ne débloquent rien :
 * tenues et titres restent liés à la maîtrise (mots acquis, notions maîtrisées).
 */
export const POINTS = {
  firstTry: 10,
  later: 5,
  withHint: 3,
  sentenceFirstTry: 15,
  sentenceLater: 8,
  vocabAnswer: 8,
  vocabQuestBonus: 15,
  dailyBonus: 20,
  extraSessionBonus: 10,
} as const;

export function pointsFor(outcome: Outcome, presentation: number): number {
  if (outcome === 'fail') return 0;
  if (outcome === 'success_hint') return POINTS.withHint;
  return presentation === 1 ? POINTS.firstTry : POINTS.later;
}

export function pointsForSentence(outcome: Outcome): number {
  return outcome === 'success' ? POINTS.sentenceFirstTry : outcome === 'success_hint' ? POINTS.sentenceLater : 0;
}

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
