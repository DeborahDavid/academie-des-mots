import { beforeEach, describe, expect, it } from 'vitest';
import { AcademieDB } from './db';
import { addWeek, ensureSeeded } from './repo';
import { planSession, recordPresentation } from './sessionRepo';
import { getWardrobe, syncUnlocks } from './rewardsRepo';

let db: AcademieDB;
let n = 0;
const now = new Date(2026, 9, 12, 17, 0);

beforeEach(async () => {
  db = new AcademieDB(`rw-${n++}`);
  await ensureSeeded(db);
});

describe('garde-robe', () => {
  it('étoile brodée après 5 mots réussis, portée automatiquement, jamais retirée', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: Array.from({ length: 6 }, (_, i) => ({ level: 'jaune' as const, entry: { text: `m${i}` } })) }, db);
    await db.settings.toCollection().modify((r) => void (r.value.thresholds.newWordsPerDay = 10));
    const { tasks } = await planSession(now, db);
    for (const t of tasks.slice(0, 5)) await recordPresentation({ sessionId: 's', itemId: t.item.id, kind: 'word', presentation: 1, outcome: 'success', errorTypes: [] }, now, db);

    const fresh = await syncUnlocks(now, db);
    expect(fresh.map((r) => r.id)).toEqual(['cape-star']);
    expect(await syncUnlocks(now, db)).toEqual([]);

    // Même si les mots retombent (échec), la récompense reste.
    for (const t of tasks.slice(0, 5)) await recordPresentation({ sessionId: 's2', itemId: t.item.id, kind: 'word', presentation: 1, outcome: 'fail', errorTypes: [] }, new Date(2026, 9, 16), db);
    const w = await getWardrobe(db);
    expect([...w.unlocked]).toEqual(['cape-star']);
    expect(w.worn).toEqual(['cape-star']);
  });
});
