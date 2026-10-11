import { createEmptyCard } from 'ts-fsrs';
import { type AcademieDB, db as defaultDb } from './db';
import { getSettings } from './repo';
import { type Outcome, type VocabProduction, itemId, newId } from '../domain/model';
import { POINTS, localDate } from '../domain/points';
import { review } from '../domain/scheduler';
import {
  DEFAULT_QUEST,
  EXPLORER_RANKS,
  countStages,
  explorerRank,
  type QuestStep,
  type StageInfo,
  type VocabCandidate,
  type VocabCorpusFile,
  type VocabEvidence,
  type VocabQuestion,
  type VocabQuestionType,
  type VocabWord,
  planQuest,
  startOfWeek,
  validateCorpus,
  vocabStage,
} from '../domain/vocab';

export const DEFAULT_NEW_PER_WEEK = 5;

/** Lots d'enrichissement livrés avec l'application (src/content/vocab/lot-XXX.json). */
const LOTS = Object.values(import.meta.glob('../content/vocab/lot-*.json', { eager: true, import: 'default' })) as (VocabCorpusFile & { batch: number })[];

/** Anciens mots d'exemple, probablement déjà connus à 8 ans : retirés s'ils n'ont jamais servi. */
const OLD_EXAMPLE_IDS = ['minuscule', 'prudent', 'curieux'];

/**
 * Chaque lot livré est importé une seule fois, « à valider » (le parent vérifie avant que l'enfant le voie).
 * Un mot déjà présent n'est pas écrasé : les corrections du parent sont conservées.
 */
export async function ensureVocabSeeded(db: AcademieDB = defaultDb, lots = LOTS): Promise<void> {
  const s = await getSettings(db);
  const seeded = new Set(s.vocab?.seededBatches ?? []);
  for (const lot of [...lots].sort((a, b) => a.batch - b.batch)) {
    if (seeded.has(lot.batch)) continue;
    const fresh = { ...lot, words: [] as VocabCorpusFile['words'] };
    for (const w of lot.words) if (!(await db.vocabWords.get(w.id))) fresh.words.push(w);
    if (fresh.words.length) await importCorpus(fresh, db);
    seeded.add(lot.batch);
  }
  if (s.vocab?.exampleSeeded) {
    for (const id of OLD_EXAMPLE_IDS) {
      const w = await db.vocabWords.get(id);
      if (w?.status === 'pending' && !(await db.items.get(itemId('vocab', id)))) await db.vocabWords.delete(id);
    }
  }
  const latest = await getSettings(db);
  await db.settings.put({
    key: 'settings',
    value: { ...latest, vocab: { newPerWeek: latest.vocab?.newPerWeek ?? DEFAULT_NEW_PER_WEEK, seededBatches: [...seeded].sort((a, b) => a - b) } },
  });
}

export interface ImportResult {
  added: number;
  updated: number;
  errors: string[];
}

/**
 * Importe un corpus. Fusion par identifiant : un mot déjà présent est mis à jour (ses sources s'ajoutent),
 * sans créer de doublon ni toucher à la progression de l'enfant. Les nouveaux mots arrivent « à valider ».
 */
export async function importCorpus(file: unknown, db: AcademieDB = defaultDb): Promise<ImportResult> {
  const errors = validateCorpus(file);
  if (errors.length) return { added: 0, updated: 0, errors };
  const words = (file as VocabCorpusFile).words;
  return db.transaction('rw', db.vocabWords, async () => {
    let added = 0, updated = 0;
    const now = Date.now();
    for (const [i, w] of words.entries()) {
      const existing = await db.vocabWords.get(w.id);
      if (existing) {
        await db.vocabWords.put({ ...existing, ...w, sources: [...new Set([...existing.sources, ...w.sources])], status: existing.status, createdAt: existing.createdAt });
        updated++;
      } else {
        await db.vocabWords.add({ ...w, status: 'pending', createdAt: now + i });
        added++;
      }
    }
    return { added, updated, errors: [] };
  });
}

export async function exportCorpus(db: AcademieDB = defaultDb): Promise<VocabCorpusFile> {
  const words = await db.vocabWords.orderBy('week').toArray();
  return { format: 'academie-vocab', version: 1, words: words.map(({ status: _s, createdAt: _c, ...w }) => w) };
}

export async function setVocabStatus(ids: string[], status: VocabWord['status'], db: AcademieDB = defaultDb) {
  await db.vocabWords.where('id').anyOf(ids).modify({ status });
}

export async function updateVocabWord(id: string, patch: Partial<Omit<VocabWord, 'id'>>, db: AcademieDB = defaultDb) {
  await db.vocabWords.update(id, patch);
}

/* ------------------------------ quête ------------------------------ */

export async function planVocabQuest(now = new Date(), db: AcademieDB = defaultDb): Promise<QuestStep[]> {
  const [words, items, logs, settings, progress, productions] = await Promise.all([
    db.vocabWords.toArray(),
    db.items.where('kind').equals('vocab').toArray(),
    db.reviewLogs.where('kind').equals('vocab').toArray(),
    getSettings(db),
    getVocabProgress(db),
    db.productions.toArray(),
  ]);
  // Prêt pour le sortilège personnel : compris, sans phrase validée, sans phrase en attente de lecture.
  const busy = new Set(productions.filter((p) => p.status !== 'rejected').map((p) => p.wordId));
  const ready = new Set(progress.filter((p) => p.info.stage === 'compris' && !busy.has(p.word.id)).map((p) => p.word.id));
  const cardOf = new Map(items.map((i) => [i.refId, i]));
  const lastQ = new Map<string, string>();
  for (const l of logs.sort((a, b) => a.at - b.at)) if (l.questionId) lastQ.set(l.itemId, l.questionId);
  const cands: VocabCandidate[] = words.map((w) => ({ word: w, card: cardOf.get(w.id)?.card, lastQuestionId: lastQ.get(itemId('vocab', w.id)), canProduce: ready.has(w.id) }));
  const sow = startOfWeek(now);
  const discoveredThisWeek = items.filter((i) => (i.introducedAt ?? 0) >= sow).length;
  const sod = new Date(now).setHours(0, 0, 0, 0);
  const discoveredToday = items.filter((i) => (i.introducedAt ?? 0) >= sod).length;
  return planQuest(cands, now, { ...DEFAULT_QUEST, newPerWeek: settings.vocab?.newPerWeek ?? DEFAULT_NEW_PER_WEEK, discoveredThisWeek, discoveredToday });
}

/** L'enfant a vu l'explication et les exemples : le mot est « découvert ». */
export async function discoverWord(wordId: string, now = new Date(), db: AcademieDB = defaultDb) {
  const id = itemId('vocab', wordId);
  if (await db.items.get(id)) return;
  await db.items.add({ id, kind: 'vocab', refId: wordId, card: createEmptyCard(now), createdAt: now.getTime(), introducedAt: now.getTime() });
}

export interface VocabAnswer {
  sessionId: string;
  word: VocabWord;
  question: VocabQuestion;
  role: 'learn' | 'review' | 'challenge';
  answerGiven: string;
  correct: boolean;
}

/**
 * Enregistre une réponse.
 * - Juste après la découverte : réussite → « difficile » (revient le lendemain), échec → « à revoir ».
 * - Révision due : replanifie selon la réponse.
 * - Défi final sur un mot non dû : entraînement, ne replanifie pas.
 */
export async function recordVocabAnswer(a: VocabAnswer, now = new Date(), db: AcademieDB = defaultDb): Promise<{ points: number }> {
  return db.transaction('rw', [db.items, db.reviewLogs, db.days], async () => {
    const id = itemId('vocab', a.word.id);
    const item = await db.items.get(id);
    const outcome: Outcome = a.correct ? (a.role === 'learn' ? 'success_hint' : 'success') : 'fail';
    const scheduled = !!item && a.role !== 'challenge';
    if (scheduled) {
      const card = review(item!.card, outcome, now);
      // Premier rappel le lendemain du jour de la découverte (spec : « premier rappel le lendemain »).
      if (a.role === 'learn') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (+new Date(card.due) > +tomorrow) card.due = tomorrow;
      }
      await db.items.put({ ...item!, card });
    }
    await db.reviewLogs.add({
      itemId: id,
      kind: 'vocab',
      sessionId: a.sessionId,
      at: now.getTime(),
      presentation: 1,
      scheduled,
      outcome: a.correct ? 'success' : 'fail',
      errorTypes: [],
      questionId: a.question.id,
      questionType: a.question.type,
      answerGiven: a.answerGiven,
      stabilityBefore: item?.card.stability ?? 0,
    });
    const points = a.correct ? POINTS.vocabAnswer : 0;
    if (points) {
      const date = localDate(now);
      const day = (await db.days.get(date)) ?? { date, sessions: 0, points: 0 };
      await db.days.put({ ...day, points: day.points + points });
    }
    return { points };
  });
}

/* --------------------------- grimoire & suivi --------------------------- */

export interface WordProgress {
  word: VocabWord;
  info: StageInfo;
  evidence: VocabEvidence;
  nextReview?: Date;
  reviews: number;
}

export async function getVocabProgress(db: AcademieDB = defaultDb): Promise<WordProgress[]> {
  const [words, items, logs, productions, settings] = await Promise.all([
    db.vocabWords.toArray(),
    db.items.where('kind').equals('vocab').toArray(),
    db.reviewLogs.where('kind').equals('vocab').toArray(),
    db.productions.where('status').equals('validated').toArray(),
    getSettings(db),
  ]);
  const cardOf = new Map(items.map((i) => [i.refId, i.card]));
  const logsOf = new Map<string, typeof logs>();
  for (const l of logs.sort((a, b) => a.at - b.at)) logsOf.set(l.itemId, [...(logsOf.get(l.itemId) ?? []), l]);
  const usesOf = new Map<string, number>();
  for (const p of productions) usesOf.set(p.wordId, (usesOf.get(p.wordId) ?? 0) + 1);
  return words.map((word) => {
    const card = cardOf.get(word.id);
    const wl = logsOf.get(itemId('vocab', word.id)) ?? [];
    const evidence: VocabEvidence = {
      discovered: !!card,
      answers: wl.map((l) => ({ type: l.questionType as VocabQuestionType, outcome: l.outcome, at: l.at, stabilityBefore: l.stabilityBefore })),
      validatedUses: usesOf.get(word.id) ?? 0,
      card,
    };
    return {
      word,
      evidence,
      info: vocabStage(evidence, settings.thresholds.acquiredStabilityDays),
      nextReview: card && card.reps > 0 ? new Date(card.due) : undefined,
      reviews: wl.length,
    };
  });
}

/** Mots souvent confondus : réponses fausses les plus fréquentes, par mot. */
export async function getConfusions(db: AcademieDB = defaultDb): Promise<{ wordId: string; answer: string; count: number }[]> {
  const logs = await db.reviewLogs.where('kind').equals('vocab').filter((l) => l.outcome === 'fail' && !!l.answerGiven).toArray();
  const counts = new Map<string, { wordId: string; answer: string; count: number }>();
  for (const l of logs) {
    const wordId = l.itemId.slice('vocab:'.length);
    const k = `${wordId}|${l.answerGiven}`;
    counts.set(k, { wordId, answer: l.answerGiven!, count: (counts.get(k)?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export async function setNewPerWeek(n: number, db: AcademieDB = defaultDb) {
  const s = await getSettings(db);
  await db.settings.put({ key: 'settings', value: { ...s, vocab: { ...s.vocab, newPerWeek: Math.max(0, Math.min(15, Math.round(n))) } } });
}

export function newSessionId() {
  return newId();
}

/* --------------------------- sortilège personnel --------------------------- */

/** L'enfant envoie sa phrase : elle attend la lecture du parent (aucune correction automatique). */
export async function submitProduction(wordId: string, text: string, now = new Date(), db: AcademieDB = defaultDb): Promise<{ points: number }> {
  return db.transaction('rw', [db.productions, db.days], async () => {
    await db.productions.add({ id: newId(), wordId, text: text.trim().replace(/'/g, '’'), status: 'pending', createdAt: now.getTime() });
    const date = localDate(now);
    const day = (await db.days.get(date)) ?? { date, sessions: 0, points: 0 };
    await db.days.put({ ...day, points: day.points + POINTS.vocabProduction });
    return { points: POINTS.vocabProduction };
  });
}

/**
 * Le parent lit la phrase : validée (éventuellement corrigée) → le mot devient « utilisé » ;
 * « à retravailler » → le mot pourra être reproposé plus tard, sans pénalité.
 */
export async function reviewProduction(id: string, decision: 'validated' | 'rejected', correctedText?: string, now = new Date(), db: AcademieDB = defaultDb) {
  const patch: Partial<VocabProduction> = { status: decision, reviewedAt: now.getTime() };
  if (correctedText?.trim()) patch.text = correctedText.trim().replace(/'/g, '’');
  await db.productions.update(id, patch);
}

export async function getProductions(db: AcademieDB = defaultDb): Promise<VocabProduction[]> {
  return (await db.productions.toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

/** Rang d'exploratrice : calculé sur la progression réelle, mémorisé pour ne jamais redescendre. */
export async function syncExplorerRank(db: AcademieDB = defaultDb) {
  const counts = countStages(await getVocabProgress(db));
  const current = explorerRank(counts);
  const s = await getSettings(db);
  const idx = EXPLORER_RANKS.indexOf(current.rank);
  const best = Math.max(idx, s.vocab?.bestRank ?? 0);
  if (best !== s.vocab?.bestRank) {
    await db.settings.put({ key: 'settings', value: { ...s, vocab: { newPerWeek: s.vocab?.newPerWeek ?? DEFAULT_NEW_PER_WEEK, ...s.vocab, bestRank: best } } });
  }
  const rank = EXPLORER_RANKS[best];
  // Ce qui manque pour le rang suivant celui déjà atteint.
  const next = EXPLORER_RANKS[best + 1];
  const missing = next
    ? Object.fromEntries((['understood', 'used', 'mastered'] as const).filter((k) => counts[k] < next.needs[k]).map((k) => [k, next.needs[k] - counts[k]]))
    : undefined;
  return { rank, next, missing: missing as Partial<typeof counts> | undefined, counts };
}
