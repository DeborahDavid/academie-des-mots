import type { Item } from './model';
import { isDue, isNew } from './scheduler';

export interface WordCandidate {
  item: Item;
  /** Date de début de la semaine du mot (AAAA-MM-JJ) : la plus récente passe en premier. */
  weekStart: string;
  createdAt: number;
}

export interface PickOptions {
  maxWords: number;
  newPerDay: number;
  /** Même si beaucoup de révisions sont dues, introduire au moins ce nombre de nouveaux mots. */
  minNew: number;
  introducedToday: number;
}

export const DEFAULT_PICK: Omit<PickOptions, 'newPerDay' | 'introducedToday'> = { maxWords: 8, minNew: 2 };

/**
 * Choisit les mots de la séance :
 * - révisions dues, les plus en retard d'abord ;
 * - nouveaux mots (semaine la plus récente d'abord), dans la limite quotidienne.
 * Aucun mot non dû n'est ajouté : quand tout est fait, la séance est courte ou vide.
 */
export function pickWords(cands: WordCandidate[], now: Date, opts: PickOptions, rng: () => number = Math.random): Item[] {
  const due = cands.filter((c) => isDue(c.item.card, now)).sort((a, b) => +new Date(a.item.card.due) - +new Date(b.item.card.due));
  const fresh = cands
    .filter((c) => isNew(c.item.card))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.createdAt - b.createdAt);

  const newBudget = Math.max(0, opts.newPerDay - opts.introducedToday);
  const newSlots = Math.min(newBudget, fresh.length, Math.max(opts.minNew, opts.maxWords - due.length));
  const dueSlots = Math.min(due.length, opts.maxWords - newSlots);

  return shuffle([...due.slice(0, dueSlots), ...fresh.slice(0, newSlots)].map((c) => c.item), rng);
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Repropose un exercice plus tard : 3 exercices plus loin, ou en fin de file. */
export function requeue<T>(queue: T[], currentIndex: number, task: T, gap = 3): T[] {
  const at = Math.min(queue.length, currentIndex + 1 + gap);
  return [...queue.slice(0, at), task, ...queue.slice(at)];
}
