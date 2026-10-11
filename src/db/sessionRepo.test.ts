import { beforeEach, describe, expect, it } from 'vitest';
import { AcademieDB } from './db';
import { addWeek, ensureSeeded } from './repo';
import { type WordTask, completeSession, getProgress, planSession, recordPresentation } from './sessionRepo';
import type { Outcome } from '../domain/model';

let db: AcademieDB;
let n = 0;
const now = new Date(2026, 9, 12, 17, 0);

beforeEach(async () => {
  db = new AcademieDB(`sess-${n++}`);
  await ensureSeeded(db);
});

const words = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({ level: 'jaune' as const, entry: { text: `${prefix}${i}` } }));

async function play(tasks: WordTask[], at: Date, outcome: Outcome = 'success', sessionId = 's') {
  for (const t of tasks) {
    await recordPresentation({ sessionId, itemId: t.item.id, kind: 'word', presentation: 1, outcome, errorTypes: [], practice: t.practice }, at, db);
  }
}

describe('planSession', () => {
  it('séance du jour, arriéré de 5 semaines : 4 nouveaux mots, semaine courante d’abord', async () => {
    for (let w = 0; w < 5; w++) await addWeek({ label: `S${w}`, startDate: `2026-09-${String(7 + 7 * w).padStart(2, '0')}`, entries: words(`w${w}-`, 12) }, db);
    const plan = await planSession(now, db);
    expect(plan.kind).toBe('daily');
    expect(plan.tasks).toHaveLength(4);
    expect(plan.tasks.every((t) => t.word.text.startsWith('w4-') && !t.practice)).toBe(true);
  });

  it('séances en plus sans limite : 4 nouveaux mots de plus à chaque fois', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 20) }, db);
    await play((await planSession(now, db)).tasks, now);
    await completeSession('daily', now, db);
    for (let i = 0; i < 3; i++) {
      const plan = await planSession(now, db);
      expect(plan.kind).toBe('bonus');
      expect(plan.tasks.filter((t) => !t.practice)).toHaveLength(4);
      await play(plan.tasks, now);
      await completeSession('bonus', now, db);
    }
  });

  it('séance en plus quand tout est introduit : entraînement sur les mots ratés, sans replanifier', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 3) }, db);
    await play((await planSession(now, db)).tasks, now, 'fail');
    await completeSession('daily', now, db);
    const plan = await planSession(now, db);
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks.every((t) => t.practice)).toBe(true);
    const before = (await db.items.toArray()).map((i) => i.card.due);
    await play(plan.tasks, now);
    expect((await db.items.toArray()).map((i) => i.card.due)).toEqual(before);
  });
});

describe('points et flamme', () => {
  it('points par réussite, bonus de séance, flamme allumée une fois par jour', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 4) }, db);
    await play((await planSession(now, db)).tasks, now);
    const c1 = await completeSession('daily', now, db);
    expect(c1).toEqual({ bonusPoints: 20, flameLit: true, flameDays: 1 });
    const c2 = await completeSession('bonus', now, db);
    expect(c2.flameLit).toBe(false);
    expect(await getProgress(now, db)).toEqual({ flameDays: 1, litToday: true, totalPoints: 4 * 10 + 20 + 10, todayPoints: 70 });
  });

  it('la flamme ne se remet jamais à zéro', async () => {
    await completeSession('daily', new Date(2026, 9, 1), db);
    await completeSession('daily', new Date(2026, 9, 10), db);
    const p = await getProgress(new Date(2026, 9, 12), db);
    expect(p.flameDays).toBe(2);
    expect(p.litToday).toBe(false);
  });
});

describe('recordPresentation', () => {
  it('seule la 1re présentation replanifie', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 1) }, db);
    const [t] = (await planSession(now, db)).tasks;
    await recordPresentation({ sessionId: 's', itemId: t.item.id, kind: 'word', presentation: 1, outcome: 'fail', errorTypes: ['accent'] }, now, db);
    const after1 = (await db.items.get(t.item.id))!.card;
    await recordPresentation({ sessionId: 's', itemId: t.item.id, kind: 'word', presentation: 2, outcome: 'success', errorTypes: [] }, now, db);
    expect((await db.items.get(t.item.id))!.card).toEqual(after1);
    expect((await db.reviewLogs.toArray()).map((l) => [l.presentation, l.scheduled, l.outcome])).toEqual([
      [1, true, 'fail'],
      [2, false, 'success'],
    ]);
  });

  it('réussite sans indice après 2 échecs passés → « très difficile »', async () => {
    await addWeek({ label: 'S', startDate: '2026-10-05', entries: words('m', 1) }, db);
    const [t] = (await planSession(now, db)).tasks;
    const base = { sessionId: 's', itemId: t.item.id, kind: 'word' as const, errorTypes: [] };
    await recordPresentation({ ...base, presentation: 1, outcome: 'fail' }, now, db);
    await recordPresentation({ ...base, presentation: 2, outcome: 'fail' }, now, db);
    const e = await recordPresentation({ ...base, sessionId: 's2', presentation: 1, outcome: 'success' }, new Date(2026, 9, 13), db);
    expect(e.veryHard).toBe(true);
  });
});

describe('phrases', () => {
  it('rien tant que les phrases ne sont pas validées ni les notions activées', async () => {
    expect((await planSession(now, db)).sentences).toHaveLength(0);
    const { setNotionStatus } = await import('./repo');
    await setNotionStatus('gn-nombre', true, db);
    expect((await planSession(now, db)).sentences).toHaveLength(0); // banque encore « à valider »
  });

  it('phrases validées sur notions vues : 2 par séance, notions replanifiées une fois', async () => {
    const { setNotionStatus, setSentenceStatus } = await import('./repo');
    for (const n of ['gn-nombre', 'sv-eloigne', 'conj-present']) await setNotionStatus(n, true, db);
    for (const s of await db.sentences.toArray()) await setSentenceStatus(s.id, 'validated', db);
    const plan = await planSession(now, db);
    expect(plan.sentences.length).toBe(3);
    expect(plan.sentences.every((t) => t.sentence.notionIds.every((n) => ['gn-nombre', 'sv-eloigne', 'conj-present'].includes(n)))).toBe(true);
    const scheduled = plan.sentences.flatMap((t) => t.scheduledNotionIds);
    expect(new Set(scheduled).size).toBe(scheduled.length);

    const { recordSentence } = await import('./sessionRepo');
    const t = plan.sentences[0];
    const res = await recordSentence({ sessionId: 's', sentence: t.sentence, scheduledNotionIds: t.scheduledNotionIds, outcome: 'success', notionOutcome: 'success', errorTypes: [], hintUsed: false }, now, db);
    expect(res.points).toBe(15);
    const notionItem = await db.items.get(`notion:${t.scheduledNotionIds[0]}`);
    expect(notionItem!.card.reps).toBe(1);
  });
});

describe('guidage dégressif', () => {
  it('monte après 2 séances sans erreur d’accord, descend après 2 échecs, maîtrise au niveau 3', async () => {
    const { updateGuidance } = await import('./sessionRepo');
    const ok = new Map([['gn-nombre', true]]);
    const ko = new Map([['gn-nombre', false]]);
    await updateGuidance(ok, now, db);
    expect((await db.notions.get('gn-nombre'))!.guidanceLevel).toBe(1);
    await updateGuidance(ok, now, db);
    expect((await db.notions.get('gn-nombre'))!.guidanceLevel).toBe(2);
    await updateGuidance(ko, now, db);
    await updateGuidance(ko, now, db);
    expect((await db.notions.get('gn-nombre'))!.guidanceLevel).toBe(1);
    for (let i = 0; i < 4; i++) await updateGuidance(ok, now, db);
    expect((await db.notions.get('gn-nombre'))!.guidanceLevel).toBe(3);
    const mastered = await updateGuidance(ok, now, db);
    expect(mastered).toEqual(['gn-nombre']);
    expect((await db.notions.get('gn-nombre'))!.masteredAt).toBeDefined();
    expect((await db.notions.get('gn-nombre'))!.constellation).toBe('poulet'); // première notion maîtrisée
  });
});
