import type { Card } from 'ts-fsrs';
import type { Item, Sentence } from './model';
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

export interface SentencePick {
  sentence: Sentence;
  /** Notions replanifiées par cette phrase (dues, pas encore vues dans la séance). */
  scheduledNotionIds: string[];
}

/**
 * Phrases de la séance (2 à 3) : uniquement des phrases validées dont TOUTES les notions sont « vues en classe ».
 * D'abord une phrase par notion due (ou nouvelle), puis les phrases les moins récemment vues (entraînement).
 */
export function pickSentences(
  sentences: Sentence[],
  notionCards: Map<string, Card>,
  lastShown: Map<string, number>,
  now: Date,
  count: number,
  rng: () => number = Math.random,
): SentencePick[] {
  const seen = new Set(notionCards.keys());
  const eligible = shuffle(
    sentences.filter((s) => s.status === 'validated' && s.notionIds.length > 0 && s.notionIds.every((n) => seen.has(n))),
    rng,
  ).sort((a, b) => (lastShown.get(a.id) ?? 0) - (lastShown.get(b.id) ?? 0));
  const isDueOrNew = (id: string) => {
    const c = notionCards.get(id);
    return !!c && (isNew(c) || isDue(c, now));
  };
  const dueNotions = [...seen]
    .filter(isDueOrNew)
    .sort((a, b) => +new Date(notionCards.get(a)!.due) - +new Date(notionCards.get(b)!.due));

  const picked: SentencePick[] = [];
  const scheduled = new Set<string>();
  const used = new Set<string>();
  for (const notion of dueNotions) {
    if (picked.length >= count) break;
    if (scheduled.has(notion)) continue;
    const s = eligible.find((x) => !used.has(x.id) && x.notionIds.includes(notion));
    if (!s) continue;
    const ids = s.notionIds.filter((n) => isDueOrNew(n) && !scheduled.has(n));
    ids.forEach((n) => scheduled.add(n));
    used.add(s.id);
    picked.push({ sentence: s, scheduledNotionIds: ids });
  }
  for (const s of eligible) {
    if (picked.length >= count) break;
    if (used.has(s.id)) continue;
    used.add(s.id);
    picked.push({ sentence: s, scheduledNotionIds: [] });
  }
  return picked;
}

/** Répartit les phrases régulièrement parmi les mots (jamais deux phrases d'affilée si possible). */
export function interleave<A, B>(words: A[], sentences: B[]): (A | B)[] {
  if (!sentences.length) return [...words];
  const out: (A | B)[] = [];
  const step = (words.length + 1) / (sentences.length + 1);
  let si = 0;
  words.forEach((w, i) => {
    out.push(w);
    while (si < sentences.length && i + 1 >= Math.floor(step * (si + 1))) out.push(sentences[si++]);
  });
  while (si < sentences.length) out.push(sentences[si++]);
  return out;
}
