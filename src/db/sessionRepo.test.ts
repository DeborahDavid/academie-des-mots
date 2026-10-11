import { beforeEach, describe, expect, it } from 'vitest';
import { AcademieDB } from './db';
import { addWeek, ensureSeeded } from './repo';
import { planWordTasks, recordPresentation } from './sessionRepo';

let db: AcademieDB;
let n = 0;
const now = new Date(2026, 9, 12, 17, 0);

beforeEach(async () => {
  db = new AcademieDB(`sess-${n++}`);
  await ensureSeeded(db);
});

const words = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({ level: 'jaune' as const, entry: { text: `${prefix}${i}` } }));

describe('planWordTasks', () => {
  it('arriéré de 5 semaines : 4 nouveaux mots, semaine courante d’abord', async () => {
    for (let w = 0; w < 5; w++) await addWeek({ label: `S${w}`, startDate: `2026-09-${String(7 + 7 * w).padStart(2, '0')}`, entries: words(`w${w}-`, 12) }, db);
    const tasks = await planWordTasks(now, db);
    expect(tasks).toHaveLength(4);
    expect(tasks.every((t) => t.word.text.startsWith('w4-'))).toBe(true);
  });

  it('une 2e séance le même jour n’introduit pas plus de nouveaux mots', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 10) }, db);
    for (const t of await planWordTasks(now, db)) {
      await recordPresentation({ sessionId: 's1', itemId: t.item.id, kind: 'word', presentation: 1, outcome: 'success', errorTypes: [] }, now, db);
    }
    expect(await planWordTasks(now, db)).toHaveLength(0);
  });
});

describe('recordPresentation', () => {
  it('seule la 1re présentation replanifie', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 1) }, db);
    const [t] = await planWordTasks(now, db);
    await recordPresentation({ sessionId: 's', itemId: t.item.id, kind: 'word', presentation: 1, outcome: 'fail', errorTypes: ['accent'] }, now, db);
    const after1 = (await db.items.get(t.item.id))!.card;
    await recordPresentation({ sessionId: 's', itemId: t.item.id, kind: 'word', presentation: 2, outcome: 'success', errorTypes: [] }, now, db);
    const after2 = (await db.items.get(t.item.id))!.card;
    expect(after2).toEqual(after1);
    const logs = await db.reviewLogs.toArray();
    expect(logs.map((l) => [l.presentation, l.scheduled, l.outcome])).toEqual([
      [1, true, 'fail'],
      [2, false, 'success'],
    ]);
  });

  it('réussite sans indice après 2 échecs passés → « très difficile »', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 1) }, db);
    const [t] = await planWordTasks(now, db);
    const base = { sessionId: 's', itemId: t.item.id, kind: 'word' as const, errorTypes: [] };
    await recordPresentation({ ...base, presentation: 1, outcome: 'fail' }, now, db);
    await recordPresentation({ ...base, presentation: 2, outcome: 'fail' }, now, db);
    const e = await recordPresentation({ ...base, sessionId: 's2', presentation: 1, outcome: 'success' }, new Date(2026, 9, 13), db);
    expect(e.veryHard).toBe(true);
  });
});
