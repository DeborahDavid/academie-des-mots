import { type AcademieDB, db as defaultDb } from './db';
import { getSettings } from './repo';
import { type MasteryStats, REWARDS, type Reward, type RewardId, isReached, wearNew, wordStats } from '../domain/rewards';

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
