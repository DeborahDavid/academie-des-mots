import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';
import corpus from '../content/vocab-exemple.json';
import { review } from './scheduler';
import { type VocabCandidate, type VocabEvidence, type VocabWord, chooseQuestion, planQuest, validateCorpus, vocabStage } from './vocab';

const now = new Date(2026, 9, 12, 17, 0);
const past = new Date(2026, 9, 1, 17, 0);
const words: VocabWord[] = (corpus as { words: Omit<VocabWord, 'status' | 'createdAt'>[] }).words.map((w, i) => ({ ...w, status: 'validated', createdAt: i }));
const opts = { newPerWeek: 5, discoveredThisWeek: 0, maxDueForNew: 4, maxReviews: 5 };

describe('validateCorpus', () => {
  it('le corpus d’exemple est valide', () => {
    expect(validateCorpus(corpus)).toEqual([]);
  });

  it('signale les problèmes', () => {
    const bad = { format: 'academie-vocab', version: 1, words: [{ ...words[0], id: 'A B', questions: [{ ...words[0].questions[0], choices: ['x', 'x', 'y'] }] }] };
    const errs = validateCorpus(bad);
    expect(errs.some((e) => e.includes('identifiant'))).toBe(true);
    expect(errs.some((e) => e.includes('au moins 2 questions'))).toBe(true);
    expect(errs.some((e) => e.includes('en double'))).toBe(true);
  });

  it('refuse un fichier étranger', () => {
    expect(validateCorpus({ foo: 1 })).toHaveLength(1);
  });
});

describe('vocabStage', () => {
  const base: VocabEvidence = { discovered: true, answers: [], validatedUses: 0 };

  it('mystérieux → découvert → compris (2 types d’épreuves réussis)', () => {
    expect(vocabStage({ ...base, discovered: false }, 21).stage).toBe('mysterieux');
    expect(vocabStage(base, 21).stage).toBe('decouvert');
    const one = [{ type: 'sens' as const, outcome: 'success' as const, at: 1 }];
    expect(vocabStage({ ...base, answers: one }, 21).stage).toBe('decouvert');
    const two = [...one, { type: 'situation' as const, outcome: 'success' as const, at: 2 }];
    expect(vocabStage({ ...base, answers: two }, 21).stage).toBe('compris');
  });

  it('un QCM ne suffit jamais pour « utilisé » : il faut une phrase validée', () => {
    const answers = [
      { type: 'sens' as const, outcome: 'success' as const, at: 1 },
      { type: 'phrase' as const, outcome: 'success' as const, at: 2 },
      { type: 'situation' as const, outcome: 'success' as const, at: 3 },
    ];
    expect(vocabStage({ ...base, answers }, 21).stage).toBe('compris');
    expect(vocabStage({ ...base, answers, validatedUses: 1 }, 21).stage).toBe('utilise');
  });

  it('maîtrisé : utilisé + compréhension stable sur la durée', () => {
    let card = createEmptyCard(past);
    let t = past;
    for (let i = 0; i < 6; i++) {
      card = review(card, 'success', t);
      t = new Date(card.due);
    }
    const answers = [
      { type: 'sens' as const, outcome: 'success' as const, at: 1 },
      { type: 'phrase' as const, outcome: 'success' as const, at: 2 },
    ];
    expect(vocabStage({ ...base, answers, validatedUses: 1, card }, 21).stage).toBe('maitrise');
  });

  it('échec différé → « à consolider », sans faire disparaître le mot', () => {
    const answers = [
      { type: 'sens' as const, outcome: 'success' as const, at: 1 },
      { type: 'phrase' as const, outcome: 'success' as const, at: 2 },
      { type: 'situation' as const, outcome: 'fail' as const, at: 3, stabilityBefore: 9 },
    ];
    expect(vocabStage({ ...base, answers }, 21)).toEqual({ stage: 'decouvert', toConsolidate: true });
    // échec le jour même de la découverte : pas « à consolider »
    expect(vocabStage({ ...base, answers: [{ type: 'sens', outcome: 'fail', at: 1, stabilityBefore: 0 }] }, 21).toConsolidate).toBe(false);
  });
});

describe('planQuest', () => {
  const fresh = (w: VocabWord): VocabCandidate => ({ word: w });
  const dueCand = (w: VocabWord, last?: string): VocabCandidate => ({ word: w, card: review(createEmptyCard(past), 'fail', past), lastQuestionId: last });

  it('premier jour : découverte d’un mot + son épreuve « sens caché »', () => {
    const steps = planQuest(words.map(fresh), now, opts);
    expect(steps.map((s) => s.kind)).toEqual(['discover', 'question']);
    expect(steps[1].kind === 'question' && steps[1].question.type).toBe('sens');
  });

  it('pas de nouveau mot si le quota de la semaine est atteint', () => {
    expect(planQuest(words.map(fresh), now, { ...opts, discoveredThisWeek: 5 })).toEqual([]);
  });

  it('trop de révisions dues : consolidation d’abord, pas de nouveau mot', () => {
    const many = [...words.map((w) => dueCand(w)), ...words.map((w) => fresh({ ...w, id: `${w.id}-2` }))];
    const steps = planQuest(many, now, opts);
    expect(steps.some((s) => s.kind === 'discover')).toBe(false);
    expect(steps.filter((s) => s.kind === 'question' && s.role === 'review')).toHaveLength(5);
  });

  it('les mots « à valider » ne sont jamais proposés', () => {
    expect(planQuest(words.map((w) => fresh({ ...w, status: 'pending' })), now, opts)).toEqual([]);
  });

  it('ne repose pas la même question que la dernière fois', () => {
    const w = words[0];
    for (let i = 0; i < 20; i++) expect(chooseQuestion(w, ['sens', 'situation', 'phrase'], 'sens-1')?.id).not.toBe('sens-1');
  });
});

describe('checkProduction', () => {
  const w = words.find((x) => x.id === 'perplexe')!;
  it('refuse une phrase trop courte, sans le mot, ou copiée d’un exemple', async () => {
    const { checkProduction } = await import('./vocab');
    expect(checkProduction('Perplexe.', w).ok).toBe(false);
    expect(checkProduction('Je ne sais pas quoi penser du tout.', w).ok).toBe(false);
    expect(checkProduction(w.examples[0], w).ok).toBe(false);
    expect(checkProduction('Mon frère est resté perplexe devant la devinette.', w).ok).toBe(true);
    expect(checkProduction('Les élèves sont perplexes devant ce problème.', w).ok).toBe(true);
  });
});

describe('containsWord', () => {
  it('reconnaît les formes accordées et conjuguées', async () => {
    const { containsWord } = await import('./vocab');
    expect(containsWord('Elle est rêveuse.', 'rêveur')).toBe(true);
    expect(containsWord('Des amis loyaux.', 'loyal')).toBe(true);
    expect(containsWord('Il exaspère tout le monde.', 'exaspérer')).toBe(true);
    expect(containsWord('Elle est anxieuse.', 'anxieux')).toBe(true);
    expect(containsWord('Une marche furtive.', 'furtif')).toBe(true);
    expect(containsWord('Il fait beau.', 'rêveur')).toBe(false);
  });
});

describe('explorerRank', () => {
  it('rangs gagnés par la compréhension, l’utilisation et la maîtrise réelles', async () => {
    const { explorerRank } = await import('./vocab');
    expect(explorerRank({ understood: 0, used: 0, mastered: 0 }).rank.name).toBe('Apprentie des mots');
    expect(explorerRank({ understood: 5, used: 0, mastered: 0 }).rank.name).toBe('Chercheuse de sortilèges');
    // beaucoup de mots compris mais aucun utilisé : pas d'« Exploratrice »
    const r = explorerRank({ understood: 40, used: 0, mastered: 0 });
    expect(r.rank.name).toBe('Chercheuse de sortilèges');
    expect(r.missing).toEqual({ used: 3 });
    expect(explorerRank({ understood: 60, used: 25, mastered: 20 }).next).toBeUndefined();
  });
});
