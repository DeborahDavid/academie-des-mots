import { beforeEach, describe, expect, it } from 'vitest';
import { AcademieDB } from './db';
import { ensureSeeded } from './repo';
import { discoverWord, ensureVocabSeeded, getConfusions, getVocabProgress, importCorpus, planVocabQuest, recordVocabAnswer, setVocabStatus } from './vocabRepo';
import exemple from '../content/vocab-exemple.json';

let db: AcademieDB;
let n = 0;
const day1 = new Date(2026, 9, 12, 17, 0);
const day2 = new Date(2026, 9, 13, 17, 0);

beforeEach(async () => {
  db = new AcademieDB(`voc-${n++}`);
  await ensureSeeded(db);
  await ensureVocabSeeded(db);
});

describe('import', () => {
  it('lots 1 à 3 proposés « à valider » ; rien dans la quête avant validation ; importé une seule fois', async () => {
    expect(await db.vocabWords.count()).toBe(60);
    expect((await db.vocabWords.toArray()).every((w) => w.status === 'pending')).toBe(true);
    expect(await planVocabQuest(day1, db)).toEqual([]);
    await db.vocabWords.update('anxieux', { definition: 'Corrigé par le parent.' });
    await ensureVocabSeeded(db);
    expect((await db.vocabWords.get('anxieux'))!.definition).toBe('Corrigé par le parent.');
    expect(await db.vocabWords.count()).toBe(60);
  });

  it('réimport : fusion par identifiant, sources ajoutées, statut conservé, pas de doublon', async () => {
    await setVocabStatus(['perplexe'], 'validated', db);
    const src = exemple.words.find((w) => w.id === 'perplexe')!;
    const r = await importCorpus({ ...exemple, words: [{ ...src, definition: 'Qui hésite.', sources: ['dictee'] }] }, db);
    expect(r).toEqual({ added: 0, updated: 1, errors: [] });
    const w = (await db.vocabWords.get('perplexe'))!;
    expect(w.definition).toBe('Qui hésite.');
    expect(w.sources.sort()).toEqual(['corpus', 'dictee']);
    expect(w.status).toBe('validated');
    expect(await db.vocabWords.count()).toBe(60);
  });

  it('fichier invalide : erreurs, rien n’est importé', async () => {
    const r = await importCorpus({ format: 'academie-vocab', version: 1, words: [{ id: 'x' }] }, db);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(await db.vocabWords.count()).toBe(60);
  });
});

describe('quête', () => {
  beforeEach(async () => setVocabStatus((await db.vocabWords.toArray()).map((w) => w.id), 'validated', db));

  it('jour 1 : découverte + épreuve ; jour 2 : révision du mot découvert + nouveau mot', async () => {
    const q1 = await planVocabQuest(day1, db);
    expect(q1.map((s) => s.kind)).toEqual(['discover', 'question']);
    expect(q1[0].word.id).toBe('anxieux'); // ordre de priorité du corpus
    const word = q1[0].word;
    await discoverWord(word.id, day1, db);
    const step = q1[1];
    if (step.kind !== 'question') throw new Error();
    await recordVocabAnswer({ sessionId: 's1', word, question: step.question, role: 'learn', answerGiven: step.question.choices[0], correct: true }, day1, db);

    // même jour : plus rien (pas de remplissage artificiel)
    expect(await planVocabQuest(day1, db)).toEqual([]);

    const q2 = await planVocabQuest(day2, db);
    const review = q2.find((s) => s.kind === 'question' && s.role === 'review');
    expect(review?.word.id).toBe(word.id);
    expect(review?.kind === 'question' && review.question.id).not.toBe(step.question.id); // pas la même question
    expect(q2.some((s) => s.kind === 'discover' && s.word.id !== word.id)).toBe(true);
  });

  it('les anciens mots d’exemple jamais utilisés sont retirés', async () => {
    const db2 = new AcademieDB(`voc-${n++}`);
    await ensureSeeded(db2);
    await importCorpus(exemple, db2);
    await db2.settings.toCollection().modify((r) => void (r.value.vocab = { newPerWeek: 5, exampleSeeded: true }));
    await ensureVocabSeeded(db2);
    expect(await db2.vocabWords.get('minuscule')).toBeUndefined();
    expect(await db2.vocabWords.get('perplexe')).toBeDefined();
  });

  it('progression et confusions', async () => {
    const [step0, step1] = await planVocabQuest(day1, db);
    await discoverWord(step0.word.id, day1, db);
    if (step1.kind !== 'question') throw new Error();
    await recordVocabAnswer({ sessionId: 's', word: step1.word, question: step1.question, role: 'learn', answerGiven: step1.question.choices[2], correct: false }, day1, db);
    const p = (await getVocabProgress(db)).find((x) => x.word.id === step0.word.id)!;
    expect(p.info.stage).toBe('decouvert');
    expect(p.reviews).toBe(1);
    expect(await getConfusions(db)).toEqual([{ wordId: step0.word.id, answer: step1.question.choices[2], count: 1 }]);
  });
});

describe('sortilège personnel', () => {
  beforeEach(async () => setVocabStatus((await db.vocabWords.toArray()).map((w) => w.id), 'validated', db));

  /** Amène « anxieux » à l'étape « compris » : découverte + deux types d'épreuves réussis. */
  async function understand(at: Date) {
    const { getVocabProgress: gp } = await import('./vocabRepo');
    const w = (await db.vocabWords.get('anxieux'))!;
    await discoverWord(w.id, at, db);
    for (const q of w.questions.slice(0, 2)) {
      await recordVocabAnswer({ sessionId: 's', word: w, question: q, role: 'review', answerGiven: q.choices[0], correct: true }, at, db);
    }
    return (await gp(db)).find((p) => p.word.id === 'anxieux')!;
  }

  it('mot compris → sortilège personnel proposé ; phrase validée → « utilisé »', async () => {
    const { submitProduction, reviewProduction, getProductions } = await import('./vocabRepo');
    expect((await understand(day1)).info.stage).toBe('compris');
    const quest = await planVocabQuest(day2, db);
    expect(quest.some((s) => s.kind === 'produce' && s.word.id === 'anxieux')).toBe(true);

    await submitProduction('anxieux', "Ma petite sœur est anxieuse avant d'aller chez le dentiste.", day2, db);
    // en attente : plus proposé
    expect((await planVocabQuest(day2, db)).some((s) => s.kind === 'produce')).toBe(false);

    const [p] = await getProductions(db);
    expect(p.text).toContain('d’aller'); // apostrophe typographique
    await reviewProduction(p.id, 'validated', undefined, day2, db);
    const prog = (await getVocabProgress(db)).find((x) => x.word.id === 'anxieux')!;
    expect(prog.info.stage).toBe('utilise');
  });

  it('phrase « à retravailler » : le mot redevient disponible, sans pénalité', async () => {
    const { submitProduction, reviewProduction, getProductions } = await import('./vocabRepo');
    await understand(day1);
    await submitProduction('anxieux', 'Le chat anxieux mange.', day2, db);
    const [p] = await getProductions(db);
    await reviewProduction(p.id, 'rejected', undefined, day2, db);
    expect((await getVocabProgress(db)).find((x) => x.word.id === 'anxieux')!.info.stage).toBe('compris');
    expect((await planVocabQuest(day2, db)).some((s) => s.kind === 'produce')).toBe(true);
  });
});
