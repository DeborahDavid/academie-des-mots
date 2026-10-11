import { beforeEach, describe, expect, it } from 'vitest';
import { AcademieDB } from './db';
import { addWeek, ensureSeeded, setNotionStatus } from './repo';
import { completeSession, planSession, recordPresentation, recordSentence } from './sessionRepo';
import { getDashboard } from './dashboardRepo';

let db: AcademieDB;
let n = 0;
const now = new Date(2026, 9, 12, 17, 0);

beforeEach(async () => {
  db = new AcademieDB(`dash-${n++}`);
  await ensureSeeded(db);
});

describe('tableau de bord', () => {
  it('sépare erreurs d’orthographe, d’accent et d’accord ; réussites seule / aide / échec', async () => {
    await addWeek({ label: 'S1', startDate: '2026-10-05', entries: ['forêt', 'grand', 'soudain'].map((text) => ({ level: 'jaune' as const, entry: { text } })) }, db);
    const { tasks } = await planSession(now, db);
    const [a, b, c] = tasks;
    await recordPresentation({ sessionId: 's', itemId: a.item.id, kind: 'word', presentation: 1, outcome: 'success', errorTypes: [] }, now, db);
    await recordPresentation({ sessionId: 's', itemId: b.item.id, kind: 'word', presentation: 1, outcome: 'fail', errorTypes: ['accent'] }, now, db);
    await recordPresentation({ sessionId: 's', itemId: c.item.id, kind: 'word', presentation: 1, outcome: 'fail', errorTypes: ['spelling'] }, now, db);
    await recordPresentation({ sessionId: 's', itemId: c.item.id, kind: 'word', presentation: 2, outcome: 'success_hint', errorTypes: ['spelling'] }, now, db);

    await setNotionStatus('gn-nombre', true, db);
    await setNotionStatus('sv-eloigne', true, db);
    const sentence = (await db.sentences.toArray()).find((s) => s.text.startsWith('Les chats de ma voisine'))!;
    await recordSentence({ sessionId: 's', sentence, scheduledNotionIds: [], outcome: 'success_hint', notionOutcome: 'success_hint', errorTypes: ['agreement'], hintUsed: false }, now, db);
    await completeSession('daily', now, db);

    const d = await getDashboard(now, db);
    expect(d.errors).toMatchObject({ spelling: 2, accent: 1 });
    expect(d.errors.agreementByNotion.map((x) => x.notionId).sort()).toEqual(sentence.notionIds.slice().sort());
    expect(d.success.words).toEqual({ alone: 1, withHint: 0, fail: 2 }); // 1re présentation seulement
    expect(d.success.sentences).toEqual({ alone: 0, withHint: 1, fail: 0 }); // une phrase = un résultat
    expect(d.overview).toMatchObject({ words: 3, flameDays: 1, activeDays7: 1 });
    expect(d.weeks[0]).toMatchObject({ label: 'S1', spelling: 2, accent: 1 });
    expect(d.hardestWords[0]).toMatchObject({ fails: 1 });
    expect(d.notions.map((x) => x.id)).toEqual(['gn-nombre', 'sv-eloigne']);
  });

  it('mots en retard', async () => {
    await addWeek({ label: 'S1', startDate: '2026-09-07', entries: [{ level: 'jaune' as const, entry: { text: 'forêt' } }] }, db);
    const [t] = (await planSession(new Date(2026, 8, 7), db)).tasks;
    await recordPresentation({ sessionId: 's', itemId: t.item.id, kind: 'word', presentation: 1, outcome: 'fail', errorTypes: [] }, new Date(2026, 8, 7), db);
    const d = await getDashboard(now, db);
    expect(d.overview.overdue).toBe(1);
    expect(d.overdueWords[0].daysLate).toBeGreaterThan(20);
  });
});
