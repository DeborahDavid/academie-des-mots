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

export interface PickedWord {
  item: Item;
  /** Entraînement : ne replanifie pas l'item (il n'était pas dû). */
  practice: boolean;
}

export interface BonusContext {
  /** Dernier échec par item (ms). */
  lastFailAt: Map<string, number>;
  /** Items déjà vus aujourd'hui. */
  seenToday: Set<string>;
  newPerBonus: number;
}

/**
 * Séance en plus : toujours du contenu utile, jamais vide s'il existe des mots.
 * 1. révisions dues restantes ; 2. nouveaux mots (arriéré) ;
 * 3. entraînement : mots ratés récemment, puis mots les plus fragiles (stabilité faible),
 *    en évitant ceux déjà vus aujourd'hui tant que possible.
 */
export function pickBonusWords(cands: WordCandidate[], now: Date, ctx: BonusContext, maxWords = DEFAULT_PICK.maxWords, rng: () => number = Math.random): PickedWord[] {
  const due = cands.filter((c) => isDue(c.item.card, now)).sort((a, b) => +new Date(a.item.card.due) - +new Date(b.item.card.due));
  const fresh = cands
    .filter((c) => isNew(c.item.card))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.createdAt - b.createdAt);

  const picked: PickedWord[] = [];
  const taken = new Set<string>();
  const take = (c: WordCandidate, practice: boolean) => {
    if (picked.length >= maxWords || taken.has(c.item.id)) return;
    taken.add(c.item.id);
    picked.push({ item: c.item, practice });
  };

  const newSlots = Math.min(ctx.newPerBonus, fresh.length);
  due.slice(0, maxWords - newSlots).forEach((c) => take(c, false));
  fresh.slice(0, newSlots).forEach((c) => take(c, false));

  const reviewed = cands.filter((c) => !isNew(c.item.card) && !isDue(c.item.card, now));
  const recentFails = reviewed
    .filter((c) => ctx.lastFailAt.has(c.item.id) && !ctx.seenToday.has(c.item.id))
    .sort((a, b) => ctx.lastFailAt.get(b.item.id)! - ctx.lastFailAt.get(a.item.id)!);
  recentFails.forEach((c) => take(c, true));

  const fragile = [...reviewed].sort((a, b) => a.item.card.stability - b.item.card.stability);
  fragile.filter((c) => !ctx.seenToday.has(c.item.id)).forEach((c) => take(c, true));
  fragile.forEach((c) => take(c, true));

  return shuffle(picked, rng);
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
