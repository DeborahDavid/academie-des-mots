import { type AcademieDB, db as defaultDb } from './db';
import { getSettings } from './repo';
import { type MasteryStats, REWARDS, type Reward, type RewardId, isReached, wearNew, wordStats } from '../domain/rewards';
import { weekStop } from '../domain/path';

export async function getMasteryStats(db: AcademieDB = defaultDb): Promise<MasteryStats> {
  const [settings, items, words, notions] = await Promise.all([
    getSettings(db),
    db.items.where('kind').equals('word').toArray(),
    db.words.toArray(),
    db.notions.toArray(),
  ]);
  const weekOf = new Map(words.map((w) => [w.id, w.weekId]));
  const cards = items.filter((i) => weekOf.has(i.refId)).map((i) => ({ card: i.card, weekId: weekOf.get(i.refId)! }));
  const seen = notions.filter((n) => n.status === 'seen');
  const mastered = seen.filter((n) => n.masteredAt).length;
  return {
    ...wordStats(cards, settings.thresholds.acquiredStabilityDays),
    masteredNotions: mastered,
    allNotionsMastered: seen.length > 0 && mastered === seen.length,
  };
}

export interface Wardrobe {
  unlocked: Set<RewardId>;
  worn: RewardId[];
  stats: MasteryStats;
}

export async function getWardrobe(db: AcademieDB = defaultDb): Promise<Wardrobe> {
  const [s, stats] = await Promise.all([getSettings(db), getMasteryStats(db)]);
  return { unlocked: new Set(Object.keys(s.wardrobe?.unlocked ?? {}) as RewardId[]), worn: (s.wardrobe?.worn ?? []) as RewardId[], stats };
}

/** Enregistre les récompenses nouvellement atteintes (jamais retirées) et les fait porter. */
export async function syncUnlocks(now = new Date(), db: AcademieDB = defaultDb): Promise<Reward[]> {
  const stats = await getMasteryStats(db);
  return db.transaction('rw', db.settings, async () => {
    const s = await getSettings(db);
    const unlocked = { ...(s.wardrobe?.unlocked ?? {}) };
    let worn = (s.wardrobe?.worn ?? []) as RewardId[];
    const fresh = REWARDS.filter((r) => !unlocked[r.id] && isReached(r, stats));
    if (!fresh.length) return [];
    for (const r of fresh) {
      unlocked[r.id] = now.getTime();
      worn = wearNew(worn, r.id);
    }
    await db.settings.put({ key: 'settings', value: { ...s, wardrobe: { unlocked, worn } } });
    return fresh;
  });
}

export async function setWorn(worn: RewardId[], db: AcademieDB = defaultDb) {
  await db.transaction('rw', db.settings, async () => {
    const s = await getSettings(db);
    await db.settings.put({ key: 'settings', value: { ...s, wardrobe: { unlocked: s.wardrobe?.unlocked ?? {}, worn } } });
  });
}

/** Parcours de la dictée : une étape par liste, de la plus ancienne à la plus récente. */
export async function getWeekPath(db: AcademieDB = defaultDb) {
  const [settings, weeks, words, items] = await Promise.all([getSettings(db), db.weeks.orderBy('startDate').toArray(), db.words.toArray(), db.items.where('kind').equals('word').toArray()]);
  const cardOf = new Map(items.map((i) => [i.refId, i.card]));
  return weeks.map((w) =>
    weekStop(
      w.id,
      w.label,
      w.startDate,
      words.filter((x) => x.weekId === w.id && cardOf.has(x.id)).map((x) => cardOf.get(x.id)!),
      settings.thresholds.acquiredStabilityDays,
    ),
  );
}

/** Le ciel de la tour : une étoile par mot acquis, une constellation par notion maîtrisée, la lune de la semaine. */
export async function getSky(db: AcademieDB = defaultDb) {
  const [stats, settings, notions] = await Promise.all([getMasteryStats(db), getSettings(db), db.notions.toArray()]);
  return {
    stars: stats.acquiredWords,
    onTrack: stats.onTrackWords,
    moonPhase: settings.moonPhase,
    constellations: notions
      .filter((n) => n.masteredAt && n.constellation)
      .sort((a, b) => a.masteredAt! - b.masteredAt!)
      .map((n) => ({ shapeId: n.constellation!, notion: n.label })),
  };
}
