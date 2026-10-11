import { normalizeAnswer, stripAccents } from './compare';
import type { ErrorType } from './model';

/** Mots, nombres (avec apostrophes et traits d'union), et ponctuation comme jetons séparés. */
export function tokenize(s: string): string[] {
  return normalizeAnswer(s).match(/[\p{L}\p{N}’-]+|[.,!?;:«»"…]/gu) ?? [];
}

/** Petits mots qui se prononcent pareil : une confusion est une erreur grammaticale. */
const HOMOPHONES: string[][] = [
  ['a', 'à', 'as'],
  ['et', 'est', 'es'],
  ['son', 'sont'],
  ['on', 'ont', 'on’'],
  ['ces', 'ses', 'c’est', 's’est', 'sait'],
  ['ou', 'où'],
  ['ce', 'se'],
  ['la', 'là', 'l’a'],
  ['mes', 'mais', 'met', 'mets'],
  ['peu', 'peut', 'peux'],
];

/** Terminaisons d'accord et de conjugaison, les plus longues d'abord. */
const ENDINGS = ['aient', 'erons', 'eront', 'erez', 'ions', 'iez', 'ais', 'ait', 'ant', 'ent', 'ons', 'ont', 'ées', 'és', 'ée', 'ez', 'er', 'é', 'es', 'e', 's', 'x', 't'];

function stem(w: string): string {
  for (const e of ENDINGS) if (w.length - e.length >= 2 && w.endsWith(e)) return w.slice(0, -e.length);
  return w;
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Heuristique : la réponse et l'attendu ne diffèrent que par une marque d'accord
 * (pluriel, féminin, terminaison verbale) ou sont des homophones grammaticaux.
 * Sert aux statistiques ; ne s'affiche jamais à l'enfant.
 */
export function isAgreementVariant(answer: string, expected: string): boolean {
  const a = answer.toLocaleLowerCase('fr-FR');
  const e = expected.toLocaleLowerCase('fr-FR');
  if (a === e) return false;
  if (HOMOPHONES.some((g) => g.includes(a) && g.includes(e))) return true;
  const sa = stem(a), se = stem(e);
  if (sa === se) return true;
  if ((sa.startsWith(se) || se.startsWith(sa)) && Math.abs(sa.length - se.length) <= 2 && Math.min(sa.length, se.length) >= 3) return true;
  // pluriels irréguliers : cheval / chevaux, travail / travaux
  const p = commonPrefix(a, e);
  return Math.min(a.length, e.length) >= 5 && p >= Math.min(a.length, e.length) - 2 && /(aux|eux|oux|al|ail)$/.test(a + ' ' + e);
}

export type TokenOp =
  | { op: 'match'; expected: string }
  | { op: 'sub'; expected: string; answer: string; type: ErrorType }
  | { op: 'del'; expected: string; type: ErrorType } // mot oublié
  | { op: 'ins'; answer: string; type: ErrorType }; // mot en trop

function classify(answer: string, expected: string): ErrorType {
  if (stripAccents(answer) === stripAccents(expected)) return 'accent';
  if (isAgreementVariant(answer, expected)) return 'agreement';
  return 'spelling';
}

function charDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const isWord = (t: string) => /\p{L}|\p{N}/u.test(t);

/** Coût de substitution : 0 identique, 0,5 mots proches (même mot mal écrit), 1 sinon. */
function subCost(a: string, e: string): number {
  if (a === e) return 0;
  if (!isWord(a) || !isWord(e)) return 1;
  const la = stripAccents(a.toLowerCase()), le = stripAccents(e.toLowerCase());
  if (la === le || isAgreementVariant(a, e) || charDistance(la, le) <= Math.max(1, Math.floor(le.length / 3))) return 0.5;
  return 1;
}

/** Alignement par distance d'édition sur les jetons. */
export function alignTokens(answer: string[], expected: string[]): TokenOp[] {
  const n = answer.length, m = expected.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + subCost(answer[i - 1], expected[j - 1]));
  const ops: TokenOp[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + subCost(answer[i - 1], expected[j - 1])) {
      const a = answer[i - 1], e = expected[j - 1];
      ops.push(a === e ? { op: 'match', expected: e } : { op: 'sub', expected: e, answer: a, type: classify(a, e) });
      i--, j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      const e = expected[j - 1];
      ops.push({ op: 'del', expected: e, type: HOMOPHONES.flat().includes(e.toLowerCase()) ? 'agreement' : 'spelling' });
      j--;
    } else {
      ops.push({ op: 'ins', answer: answer[i - 1], type: 'spelling' });
      i--;
    }
  }
  return ops.reverse();
}

export interface SentenceCheck {
  correct: boolean;
  errorCount: number;
  agreementErrors: number;
  errorTypes: ErrorType[];
}

export function checkSentence(answer: string, expected: string): SentenceCheck {
  const ops = alignTokens(tokenize(answer), tokenize(expected)).filter((o) => o.op !== 'match');
  const types = ops.map((o) => (o as { type: ErrorType }).type);
  return {
    correct: ops.length === 0,
    errorCount: ops.length,
    agreementErrors: types.filter((t) => t === 'agreement').length,
    errorTypes: [...new Set(types)],
  };
}
