import { checkWord } from './compare';
import type { ErrorType, Outcome } from './model';

/**
 * Déroulé d'une présentation d'un mot (dictée).
 *
 * answer ──juste──────────────────────────────▶ done (success | success_hint)
 *   │ faux
 *   ├─ 2e échec sur l'item et pas encore d'indice ─▶ hintOffer ─oui─▶ answer
 *   │                                                   └─non─▶ correction
 *   └─ sinon ─────────────────────────────────▶ correction
 *
 * correction : la forme correcte est montrée, disparaît dès que l'enfant tape,
 * et doit être retapée juste de mémoire (réaffichée après chaque erreur).
 * La réponse fautive n'est jamais réaffichée.
 */
export type WordPhase = 'answer' | 'hintOffer' | 'correction' | 'done';

export interface WordRun {
  itemId: string;
  expected: string;
  /** 1 = première présentation dans la séance. */
  presentation: number;
  /** Échecs cumulés sur cet item pendant la séance. */
  failures: number;
  hintUsed: boolean;
  phase: WordPhase;
  /** En correction : la forme correcte est visible. */
  revealCorrect: boolean;
  errorTypes: ErrorType[];
  outcome?: Outcome;
}

/** Nombre maximal de présentations d'un même mot dans une séance. */
export const MAX_PRESENTATIONS = 2;

export function startWordRun(itemId: string, expected: string, presentation = 1, failures = 0): WordRun {
  return { itemId, expected, presentation, failures, hintUsed: false, phase: 'answer', revealCorrect: false, errorTypes: [] };
}

export function submitWord(run: WordRun, answer: string): WordRun {
  const check = checkWord(answer, run.expected);
  if (run.phase === 'answer') {
    if (check.correct) return { ...run, phase: 'done', outcome: run.hintUsed ? 'success_hint' : 'success' };
    const errorTypes = run.errorTypes.includes(check.errorType!) ? run.errorTypes : [...run.errorTypes, check.errorType!];
    const failures = run.failures + 1;
    if (failures >= 2 && !run.hintUsed) return { ...run, failures, errorTypes, phase: 'hintOffer' };
    return { ...run, failures, errorTypes, phase: 'correction', revealCorrect: true, outcome: 'fail' };
  }
  if (run.phase === 'correction') {
    if (check.correct) return { ...run, phase: 'done', revealCorrect: false };
    return { ...run, revealCorrect: true };
  }
  return run;
}

export function acceptHint(run: WordRun): WordRun {
  return run.phase === 'hintOffer' ? { ...run, hintUsed: true, phase: 'answer' } : run;
}

export function declineHint(run: WordRun): WordRun {
  return run.phase === 'hintOffer' ? { ...run, phase: 'correction', revealCorrect: true, outcome: 'fail' } : run;
}

/** L'enfant commence à retaper : on cache le modèle (rappel de mémoire, pas copie). */
export function startTyping(run: WordRun): WordRun {
  return run.phase === 'correction' && run.revealCorrect ? { ...run, revealCorrect: false } : run;
}

export function shouldRequeue(run: WordRun): boolean {
  return run.phase === 'done' && run.outcome === 'fail' && run.presentation < MAX_PRESENTATIONS;
}
