import type { ErrorType, Outcome } from './model';
import { normalizeAnswer } from './compare';
import { isAgreementVariant, tokenize } from './sentenceCheck';

export interface HuntPuzzle {
  /** Jetons de la phrase affichée (avec erreurs). */
  shown: string[];
  /** Jetons de la phrase correcte, alignés un à un. */
  correct: string[];
  /** Positions des erreurs d'accord. */
  errors: number[];
}

/**
 * Prépare une chasse aux erreurs. Règles (spec 5.2 b) : même nombre de mots que la phrase correcte,
 * 1 à 3 différences, et uniquement des erreurs d'accord (jamais d'orthographe lexicale).
 */
export function buildHunt(correctText: string, huntText: string): { puzzle?: HuntPuzzle; problem?: string } {
  const correct = tokenize(correctText);
  const shown = tokenize(huntText);
  if (correct.length !== shown.length) return { problem: 'la phrase à corriger doit avoir les mêmes mots que la phrase correcte' };
  const errors = shown.map((t, i) => (t === correct[i] ? -1 : i)).filter((i) => i >= 0);
  if (errors.length < 1 || errors.length > 3) return { problem: `il faut 1 à 3 erreurs (trouvé : ${errors.length})` };
  const bad = errors.find((i) => !isAgreementVariant(shown[i], correct[i]));
  if (bad !== undefined) return { problem: `« ${shown[bad]} » → « ${correct[bad]} » n’est pas une erreur d’accord` };
  return { puzzle: { shown, correct, errors } };
}

/** Correction proposée par l'enfant pour un mot (majuscule tolérée en début de phrase). */
export function isRightFix(answer: string, expected: string, index: number): boolean {
  const a = normalizeAnswer(answer);
  const e = normalizeAnswer(expected);
  return a === e || (index === 0 && a.toLocaleLowerCase('fr-FR') === e.toLocaleLowerCase('fr-FR'));
}

/** Groupe de mots à désigner en indice : la fenêtre de 3 mots autour d'une erreur non trouvée (jamais le mot seul). */
export function hintWindow(p: HuntPuzzle, found: Set<number>): number[] {
  const target = p.errors.find((i) => !found.has(i));
  if (target === undefined) return [];
  const isWord = (i: number) => i >= 0 && i < p.shown.length && /\p{L}/u.test(p.shown[i]);
  const start = Math.max(0, Math.min(target - 1, p.shown.length - 3));
  return [start, start + 1, start + 2].filter(isWord);
}

export interface HuntResult {
  outcome: Outcome;
  notionOutcome: Outcome;
  errorTypes: ErrorType[];
  hintUsed: boolean;
}

/** Tout trouvé seule du premier coup → réussite ; avec tâtonnements ou indice → réussite difficile ; correction montrée → échec. */
export function huntResult(misses: number, wrongFixes: number, hintUsed: boolean, revealed: number): HuntResult {
  const outcome: Outcome = revealed > 0 ? 'fail' : misses === 0 && wrongFixes === 0 && !hintUsed ? 'success' : 'success_hint';
  return { outcome, notionOutcome: outcome, errorTypes: misses + wrongFixes + revealed > 0 ? ['agreement'] : [], hintUsed };
}
