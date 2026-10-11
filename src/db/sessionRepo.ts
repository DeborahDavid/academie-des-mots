import { type AcademieDB, db as defaultDb } from './db';
import { getSettings } from './repo';
import type { Card } from 'ts-fsrs';
import type { ErrorType, GuidanceLevel, Item, ItemKind, Outcome, Sentence, Word } from '../domain/model';
import { itemId } from '../domain/model';
import { isAcquired, isNew, review } from '../domain/scheduler';
import { localDate, POINTS, pointsFor, pointsForSentence } from '../domain/points';
import { DEFAULT_PICK, type WordCandidate, pickBonusWords, pickSentences, pickWords } from '../domain/session';
import { constellationFor, normalizeShapeIds } from '../domain/constellations';

function startOfDay(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface WordTask {
  item: Item;
  word: Word;
  /** Entraînement : l'item n'était pas dû, il n'est pas replanifié. */
  practice: boolean;
}

export type SessionKind = 'daily' | 'bonus' | 'vocab';

export interface SentenceTask {
  sentence: Sentence;
  scheduledNotionIds: string[];
  /** Niveau de guidage : le plus bas (le plus aidé) parmi les notions de la phrase. */
  level: GuidanceLevel;
}

export interface SessionPlan {
  kind: SessionKind;
  tasks: WordTask[];
  sentences: SentenceTask[];
}

/** Nouveaux mots ajoutés à chaque séance en plus. */
export const NEW_PER_BONUS = 4;
/** Fenêtre des « mots ratés récemment » pour l'entraînement. */
const RECENT_FAIL_DAYS = 14;

/**
 * Séance du jour : révisions dues + nouveaux mots (limite quotidienne).
 * Séances en plus (ou séance du jour sans rien de dû) : arriéré + entraînement.
 */
export async function planSession(now = new Date(), db: AcademieDB = defaultDb): Promise<SessionPlan> {
  const { kind, tasks } = await planWords(now, db);
  const sentences = await planSentences(now, kind === 'daily' ? 3 : 2, db);
  return { kind, tasks, sentences };
}

async function planSentences(now: Date, max: number, db: AcademieDB): Promise<SentenceTask[]> {
  const [notions, items, sentences, logs] = await Promise.all([
    db.notions.toArray(),
    db.items.where('kind').equals('notion').toArray(),
    db.sentences.where('status').equals('validated').toArray(),
    db.reviewLogs.where('kind').equals('notion').toArray(),
  ]);
  const seen = notions.filter((n) => n.status === 'seen');
  const itemByNotion = new Map(items.map((i) => [i.refId, i.card]));
  const cards = new Map<string, Card>();
  for (const n of seen) {
    const c = itemByNotion.get(n.id);
    if (c) cards.set(n.id, c);
  }
  const lastShown = new Map<string, number>();
  for (const l of logs) if (l.sentenceId) lastShown.set(l.sentenceId, Math.max(l.at, lastShown.get(l.sentenceId) ?? 0));
  const dueCount = [...cards.values()].filter((c) => isNew(c) || +new Date(c.due) <= now.getTime() + 86_400_000).length;
  const count = max === 3 && dueCount < 3 ? 2 : max;
  const levelOf = new Map(seen.map((n) => [n.id, n.guidanceLevel]));
  return pickSentences(sentences, cards, lastShown, now, count).map((p) => ({
    ...p,
    level: Math.min(...p.sentence.notionIds.map((n) => levelOf.get(n) ?? 1)) as GuidanceLevel,
  }));
}

async function planWords(now: Date, db: AcademieDB): Promise<{ kind: SessionKind; tasks: WordTask[] }> {
  const [items, words, weeks, settings, today] = await Promise.all([
    db.items.where('kind').equals('word').toArray(),
    db.words.toArray(),
    db.weeks.toArray(),
    getSettings(db),
    db.days.get(localDate(now)),
  ]);
  const wordById = new Map(words.map((w) => [w.id, w]));
  const weekStart = new Map(weeks.map((w) => [w.id, w.startDate]));
  const cands: WordCandidate[] = [];
  for (const item of items) {
    const word = wordById.get(item.refId);
    if (word) cands.push({ item, weekStart: weekStart.get(word.weekId) ?? '', createdAt: word.createdAt });
  }
  const sod = startOfDay(now);
  const kind: SessionKind = today?.dailyDoneAt ? 'bonus' : 'daily';
  const toTasks = (picked: { item: Item; practice: boolean }[]) => picked.map((p) => ({ ...p, word: wordById.get(p.item.refId)! }));

  if (kind === 'daily') {
    const introducedToday = items.filter((i) => (i.introducedAt ?? 0) >= sod).length;
    const picked = pickWords(cands, now, { ...DEFAULT_PICK, newPerDay: settings.thresholds.newWordsPerDay, introducedToday });
    if (picked.length) return { kind, tasks: toTasks(picked.map((item) => ({ item, practice: false }))) };
  }

  const since = now.getTime() - RECENT_FAIL_DAYS * 86_400_000;
  const logs = await db.reviewLogs.where('at').aboveOrEqual(Math.min(since, sod)).toArray();
  const lastFailAt = new Map<string, number>();
  const seenToday = new Set<string>();
  for (const l of logs) {
    if (l.outcome === 'fail' && l.at >= since) lastFailAt.set(l.itemId, Math.max(l.at, lastFailAt.get(l.itemId) ?? 0));
    if (l.at >= sod) seenToday.add(l.itemId);
  }
  return { kind, tasks: toTasks(pickBonusWords(cands, now, { lastFailAt, seenToday, newPerBonus: NEW_PER_BONUS })) };
}

export interface PresentationResult {
  sessionId: string;
  itemId: string;
  kind: ItemKind;
  presentation: number;
  outcome: Outcome;
  errorTypes: ErrorType[];
  notionIds?: string[];
  practice?: boolean;
}

export interface RecordEffect {
  points: number;
  /** L'item vient de passer « acquis » (→ une étoile s'allume). */
  newlyAcquired: boolean;
  /** Réussite sans indice sur un item déjà raté au moins 2 fois (→ Ada). */
  veryHard: boolean;
}

/**
 * Enregistre une présentation. Seule la 1re présentation de la séance replanifie l'item.
 */
export async function recordPresentation(r: PresentationResult, now = new Date(), db: AcademieDB = defaultDb): Promise<RecordEffect> {
  return db.transaction('rw', [db.items, db.reviewLogs, db.settings, db.days], async () => {
    const settings = await getSettings(db);
    const item = await db.items.get(r.itemId);
    const scheduled = r.presentation === 1 && !r.practice && !!item;
    const effect: RecordEffect = { points: pointsFor(r.outcome, r.presentation), newlyAcquired: false, veryHard: false };
    if (effect.points) await addToDay(db, now, { points: effect.points });
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

async function addToDay(db: AcademieDB, now: Date, add: { points?: number; sessions?: number; dailyDone?: boolean }) {
  const date = localDate(now);
  const day = (await db.days.get(date)) ?? { date, sessions: 0, points: 0 };
  await db.days.put({
    ...day,
    points: day.points + (add.points ?? 0),
    sessions: day.sessions + (add.sessions ?? 0),
    dailyDoneAt: day.dailyDoneAt ?? (add.dailyDone ? now.getTime() : undefined),
  });
}

export interface SessionCompletion {
  bonusPoints: number;
  /** La flamme du jour vient de s'allumer. */
  flameLit: boolean;
  flameDays: number;
}

/** Fin de séance : bonus de séance, flamme du jour. */
export async function completeSession(kind: SessionKind, now = new Date(), db: AcademieDB = defaultDb): Promise<SessionCompletion> {
  return db.transaction('rw', db.days, async () => {
    const wasLit = !!(await db.days.get(localDate(now)))?.dailyDoneAt;
    const bonusPoints = kind === 'daily' ? POINTS.dailyBonus : kind === 'vocab' ? POINTS.vocabQuestBonus : POINTS.extraSessionBonus;
    await addToDay(db, now, { points: bonusPoints, sessions: 1, dailyDone: true });
    const flameDays = await db.days.filter((d) => !!d.dailyDoneAt).count();
    return { bonusPoints, flameLit: !wasLit, flameDays };
  });
}

export interface Progress {
  /** Jours où la flamme a été allumée (ne se remet jamais à zéro). */
  flameDays: number;
  litToday: boolean;
  totalPoints: number;
  todayPoints: number;
}

export async function getProgress(now = new Date(), db: AcademieDB = defaultDb): Promise<Progress> {
  const days = await db.days.toArray();
  const today = days.find((d) => d.date === localDate(now));
  return {
    flameDays: days.filter((d) => d.dailyDoneAt).length,
    litToday: !!today?.dailyDoneAt,
    totalPoints: days.reduce((s, d) => s + d.points, 0),
    todayPoints: today?.points ?? 0,
  };
}

export interface SentenceResult {
  sessionId: string;
  sentence: Sentence;
  scheduledNotionIds: string[];
  /** Résultat global de la phrase (points, statistiques). */
  outcome: Outcome;
  /** Résultat pour les notions (seules les erreurs d'accord comptent). */
  notionOutcome: Outcome;
  errorTypes: ErrorType[];
  hintUsed: boolean;
}

/** Enregistre une phrase : un journal par notion, replanification des notions dues. */
export async function recordSentence(r: SentenceResult, now = new Date(), db: AcademieDB = defaultDb): Promise<{ points: number }> {
  return db.transaction('rw', [db.items, db.reviewLogs, db.days], async () => {
    const points = pointsForSentence(r.outcome);
    if (points) await addToDay(db, now, { points });
    for (const notionId of r.sentence.notionIds) {
      const id = itemId('notion', notionId);
      const scheduled = r.scheduledNotionIds.includes(notionId);
      if (scheduled) {
        const item = await db.items.get(id);
        if (item) await db.items.put({ ...item, card: review(item.card, r.notionOutcome, now), introducedAt: item.introducedAt ?? now.getTime() });
      }
      await db.reviewLogs.add({
        itemId: id,
        kind: 'notion',
        sessionId: r.sessionId,
        at: now.getTime(),
        presentation: 1,
        scheduled,
        outcome: r.notionOutcome,
        errorTypes: r.errorTypes,
        notionIds: r.sentence.notionIds,
        sentenceId: r.sentence.id,
      });
    }
    return { points };
  });
}

/**
 * Guidage dégressif (spec 5.3), à la fin de chaque séance, pour chaque notion travaillée :
 * 2 séances de suite sans erreur d'accord → niveau suivant ; 2 échecs de suite → niveau précédent.
 * Niveau 3 atteint et réussi → notion « maîtrisée » (constellation).
 */
export async function updateGuidance(results: Map<string, boolean>, now = new Date(), db: AcademieDB = defaultDb): Promise<string[]> {
  const mastered: string[] = [];
  const order = normalizeShapeIds((await getSettings(db)).constellations);
  await db.transaction('rw', db.notions, async () => {
    let alreadyMastered = (await db.notions.toArray()).filter((n) => n.masteredAt).length;
    for (const [id, ok] of results) {
      const n = await db.notions.get(id);
      if (!n) continue;
      let { guidanceLevel, streakOk, streakFail } = n;
      if (ok) {
        streakOk += 1;
        streakFail = 0;
        if (streakOk >= 2 && guidanceLevel < 3) {
          guidanceLevel = (guidanceLevel + 1) as GuidanceLevel;
          streakOk = 0;
        }
      } else {
        streakFail += 1;
        streakOk = 0;
        if (streakFail >= 2 && guidanceLevel > 1) {
          guidanceLevel = (guidanceLevel - 1) as GuidanceLevel;
          streakFail = 0;
        }
      }
      const becomesMastered = !n.masteredAt && guidanceLevel === 3 && ok && streakOk >= 1;
      if (becomesMastered) mastered.push(id);
      // Chaque notion maîtrisée dessine une constellation : poulet, chat, ballon de foot, puis l'ordre du mode parent.
      const constellation = becomesMastered ? constellationFor(alreadyMastered++, order).id : undefined;
      await db.notions.update(id, { guidanceLevel, streakOk, streakFail, ...(becomesMastered ? { masteredAt: now.getTime(), constellation } : {}) });
    }
  });
  return mastered;
}
