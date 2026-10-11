import { type AcademieDB, db as defaultDb } from './db';
import { getSettings } from './repo';
import type { ErrorType, Item, ItemKind, Outcome, Word } from '../domain/model';
import { isAcquired, isNew, review } from '../domain/scheduler';
import { DEFAULT_PICK, type WordCandidate, pickWords } from '../domain/session';

function startOfDay(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface WordTask {
  item: Item;
  word: Word;
}

/** Prépare les mots de la séance du jour. */
export async function planWordTasks(now = new Date(), db: AcademieDB = defaultDb): Promise<WordTask[]> {
  const [items, words, weeks, settings] = await Promise.all([
    db.items.where('kind').equals('word').toArray(),
    db.words.toArray(),
    db.weeks.toArray(),
    getSettings(db),
  ]);
  const wordById = new Map(words.map((w) => [w.id, w]));
  const weekStart = new Map(weeks.map((w) => [w.id, w.startDate]));
  const cands: WordCandidate[] = [];
  for (const item of items) {
    const word = wordById.get(item.refId);
    if (word) cands.push({ item, weekStart: weekStart.get(word.weekId) ?? '', createdAt: word.createdAt });
  }
  const sod = startOfDay(now);
  const introducedToday = items.filter((i) => (i.introducedAt ?? 0) >= sod).length;
  const picked = pickWords(cands, now, { ...DEFAULT_PICK, newPerDay: settings.thresholds.newWordsPerDay, introducedToday });
  return picked.map((item) => ({ item, word: wordById.get(item.refId)! }));
}

export interface PresentationResult {
  sessionId: string;
  itemId: string;
  kind: ItemKind;
  presentation: number;
  outcome: Outcome;
  errorTypes: ErrorType[];
  notionIds?: string[];
}

export interface RecordEffect {
  /** L'item vient de passer « acquis » (→ une étoile s'allume). */
  newlyAcquired: boolean;
  /** Réussite sans indice sur un item déjà raté au moins 2 fois (→ Ada). */
  veryHard: boolean;
}

/**
 * Enregistre une présentation. Seule la 1re présentation de la séance replanifie l'item.
 */
export async function recordPresentation(r: PresentationResult, now = new Date(), db: AcademieDB = defaultDb): Promise<RecordEffect> {
  return db.transaction('rw', db.items, db.reviewLogs, db.settings, async () => {
    const settings = await getSettings(db);
    const item = await db.items.get(r.itemId);
    const scheduled = r.presentation === 1 && !!item;
    const effect: RecordEffect = { newlyAcquired: false, veryHard: false };
    if (r.outcome === 'success') {
      const pastFails = await db.reviewLogs.where('itemId').equals(r.itemId).filter((l) => l.outcome === 'fail').count();
      effect.veryHard = pastFails >= 2;
    }
    if (scheduled && item) {
      const threshold = settings.thresholds.acquiredStabilityDays;
      const wasAcquired = isAcquired(item.card, threshold);
      const card = review(item.card, r.outcome, now);
      effect.newlyAcquired = !wasAcquired && isAcquired(card, threshold);
      await db.items.put({ ...item, card, introducedAt: isNew(item.card) ? now.getTime() : item.introducedAt });
    }
    await db.reviewLogs.add({
      itemId: r.itemId,
      kind: r.kind,
      sessionId: r.sessionId,
      at: now.getTime(),
      presentation: r.presentation,
      scheduled,
      outcome: r.outcome,
      errorTypes: r.errorTypes,
      ...(r.notionIds ? { notionIds: r.notionIds } : {}),
    });
    return effect;
  });
}

/** Nombre de mots acquis (étoiles du ciel). */
export async function countAcquiredWords(db: AcademieDB = defaultDb): Promise<number> {
  const threshold = (await getSettings(db)).thresholds.acquiredStabilityDays;
  return (await db.items.where('kind').equals('word').toArray()).filter((i) => isAcquired(i.card, threshold)).length;
}
