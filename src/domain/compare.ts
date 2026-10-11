import type { ErrorType } from './model';

/** NFC, espaces normalisés, apostrophe droite → typographique, « oe » non touché. */
export function normalizeAnswer(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').replace(/'/g, '’').trim();
}

/** Retire les diacritiques (é → e, ç → c) et les ligatures (œ → oe, æ → ae). */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE');
}

export interface WordCheck {
  correct: boolean;
  /** `accent` : seul un accent / une cédille / une ligature diffère. */
  errorType?: Extract<ErrorType, 'accent' | 'spelling'>;
}

/**
 * Compare la réponse au mot attendu.
 * La casse est ignorée, sauf si le mot attendu contient une majuscule (nom propre).
 */
export function checkWord(answer: string, expected: string): WordCheck {
  const a = normalizeAnswer(answer);
  const e = normalizeAnswer(expected);
  const caseMatters = e !== e.toLocaleLowerCase('fr-FR');
  const fold = (s: string) => (caseMatters ? s : s.toLocaleLowerCase('fr-FR'));
  if (fold(a) === fold(e)) return { correct: true };
  if (fold(stripAccents(a)) === fold(stripAccents(e))) return { correct: false, errorType: 'accent' };
  return { correct: false, errorType: 'spelling' };
}
