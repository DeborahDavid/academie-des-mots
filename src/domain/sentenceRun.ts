import type { ErrorType, GuidanceLevel, Outcome } from './model';
import { checkSentence } from './sentenceCheck';

/**
 * Dictée de phrase (spec 5.2 a) :
 *
 * write ─▶ proof1 « Relis ton orthographe » ─▶ proof2 « Relis tes accords » ─valider─┐
 *                                                                                   ▼
 *   juste ─▶ done ; sinon « Il reste X erreur(s) » ─▶ retry ─valider─▶ juste ─▶ done
 *                                                      │ faux (2e échec)
 *                                                      ▼
 *                                   hintOffer ─oui─▶ retry (questions guidées) ─▶ done | correction
 *                                        └─non─▶ correction
 *
 * correction : la phrase correcte est montrée, cachée dès que l'enfant tape, à retaper de mémoire.
 */
export type SentencePhase = 'write' | 'proof1' | 'proof2' | 'retry' | 'hintOffer' | 'correction' | 'done';

export interface SentenceRun {
  expected: string;
  notionIds: string[];
  level: GuidanceLevel;
  phase: SentencePhase;
  failures: number;
  hintUsed: boolean;
  /** Erreurs restantes après la dernière validation. */
  remaining: number;
  /** Erreurs d'accord à chaque validation (avant la correction). */
  agreementHistory: number[];
  errorTypes: ErrorType[];
  revealCorrect: boolean;
  outcome?: Outcome;
}

export function startSentenceRun(expected: string, notionIds: string[], level: GuidanceLevel): SentenceRun {
  return { expected, notionIds, level, phase: 'write', failures: 0, hintUsed: false, remaining: 0, agreementHistory: [], errorTypes: [], revealCorrect: false };
}

export function finishWriting(run: SentenceRun): SentenceRun {
  return run.phase === 'write' ? { ...run, phase: 'proof1' } : run;
}

export function finishProof1(run: SentenceRun): SentenceRun {
  return run.phase === 'proof1' ? { ...run, phase: 'proof2' } : run;
}

export function submitSentence(run: SentenceRun, answer: string): SentenceRun {
  const c = checkSentence(answer, run.expected);
  if (run.phase === 'correction') return c.correct ? { ...run, phase: 'done', revealCorrect: false } : { ...run, revealCorrect: true };
  if (run.phase !== 'proof2' && run.phase !== 'retry') return run;

  const agreementHistory = [...run.agreementHistory, c.agreementErrors];
  if (c.correct) return { ...run, agreementHistory, remaining: 0, phase: 'done', outcome: run.failures === 0 ? 'success' : 'success_hint' };

  const errorTypes = [...new Set([...run.errorTypes, ...c.errorTypes])];
  const failures = run.failures + 1;
  const next = { ...run, agreementHistory, errorTypes, failures, remaining: c.errorCount };
  if (failures === 1) return { ...next, phase: 'retry' };
  if (failures === 2 && !run.hintUsed) return { ...next, phase: 'hintOffer' };
  return { ...next, phase: 'correction', revealCorrect: true, outcome: 'fail' };
}

export function acceptSentenceHint(run: SentenceRun): SentenceRun {
  return run.phase === 'hintOffer' ? { ...run, hintUsed: true, phase: 'retry' } : run;
}

export function declineSentenceHint(run: SentenceRun): SentenceRun {
  return run.phase === 'hintOffer' ? { ...run, phase: 'correction', revealCorrect: true, outcome: 'fail' } : run;
}

export function startSentenceTyping(run: SentenceRun): SentenceRun {
  return run.phase === 'correction' && run.revealCorrect ? { ...run, revealCorrect: false } : run;
}

/**
 * Résultat pour les notions (répétition espacée) : seules les erreurs d'accord comptent.
 * Aucune au 1er essai → réussite ; corrigées ensuite par l'enfant → réussite difficile ; sinon échec.
 */
export function notionOutcome(run: SentenceRun): Outcome {
  const [first, ...later] = run.agreementHistory;
  if (first === 0) return 'success';
  if (later.includes(0)) return 'success_hint';
  return 'fail';
}

/** Afficher les questions guidées pendant la relecture / le nouvel essai. */
export function showGuidedQuestions(run: SentenceRun): boolean {
  return run.hintUsed || run.level === 1;
}
