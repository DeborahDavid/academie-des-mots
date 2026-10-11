import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';
import type { Item } from './model';
import { review } from './scheduler';
import { type WordCandidate, pickWords, requeue } from './session';
import { acceptHint, declineHint, shouldRequeue, startTyping, startWordRun, submitWord } from './wordRun';

const now = new Date(2026, 9, 12, 17, 0);
const past = new Date(2026, 9, 1, 17, 0);
const noShuffle = () => 0.999999;

function cand(id: string, weekStart: string, reviewed: boolean, createdAt = 0): WordCandidate {
  let card = createEmptyCard(past);
  if (reviewed) card = review(card, 'fail', past); // due le lendemain → en retard aujourd'hui
  const item: Item = { id, kind: 'word', refId: id, card, createdAt };
  return { item, weekStart, createdAt };
}

describe('pickWords', () => {
  const opts = { maxWords: 8, minNew: 2, newPerDay: 4, introducedToday: 0 };

  it('nouveaux mots : semaine la plus récente d’abord, limite quotidienne', () => {
    const cands = [
      ...Array.from({ length: 10 }, (_, i) => cand(`old${i}`, '2026-09-07', false, i)),
      ...Array.from({ length: 3 }, (_, i) => cand(`cur${i}`, '2026-10-05', false, i)),
    ];
    const ids = pickWords(cands, now, opts, noShuffle).map((i) => i.id).sort();
    expect(ids).toEqual(['cur0', 'cur1', 'cur2', 'old0']);
  });

  it('pas de nouveaux mots au-delà du quota du jour (pas de mode infini)', () => {
    const cands = Array.from({ length: 10 }, (_, i) => cand(`n${i}`, '2026-10-05', false, i));
    expect(pickWords(cands, now, { ...opts, introducedToday: 4 })).toHaveLength(0);
  });

  it('beaucoup de révisions dues : 8 max, dont au moins 2 nouveaux', () => {
    const cands = [
      ...Array.from({ length: 12 }, (_, i) => cand(`d${i}`, '2026-09-14', true)),
      ...Array.from({ length: 5 }, (_, i) => cand(`n${i}`, '2026-10-05', false, i)),
    ];
    const picked = pickWords(cands, now, opts);
    expect(picked).toHaveLength(8);
    expect(picked.filter((i) => i.id.startsWith('n'))).toHaveLength(2);
  });

  it('ne rajoute pas de mots non dus', () => {
    const notDue = cand('x', '2026-10-05', false);
    notDue.item.card = review(createEmptyCard(now), 'success', now);
    expect(pickWords([notDue], now, opts)).toHaveLength(0);
  });
});

describe('requeue', () => {
  it('3 exercices plus loin, ou en fin de file', () => {
    expect(requeue(['a', 'b', 'c', 'd', 'e', 'f'], 0, 'a2')).toEqual(['a', 'b', 'c', 'd', 'a2', 'e', 'f']);
    expect(requeue(['a', 'b'], 1, 'b2')).toEqual(['a', 'b', 'b2']);
  });
});

describe('wordRun', () => {
  it('réussite du premier coup', () => {
    const r = submitWord(startWordRun('i', 'forêt'), 'forêt');
    expect(r).toMatchObject({ phase: 'done', outcome: 'success' });
    expect(shouldRequeue(r)).toBe(false);
  });

  it('échec → correction : modèle visible, caché dès qu’on tape, à retaper juste', () => {
    let r = submitWord(startWordRun('i', 'forêt'), 'foret');
    expect(r).toMatchObject({ phase: 'correction', revealCorrect: true, outcome: 'fail', errorTypes: ['accent'] });
    r = startTyping(r);
    expect(r.revealCorrect).toBe(false);
    r = submitWord(r, 'forét');
    expect(r).toMatchObject({ phase: 'correction', revealCorrect: true });
    r = submitWord(startTyping(r), 'forêt');
    expect(r).toMatchObject({ phase: 'done', outcome: 'fail' });
    expect(shouldRequeue(r)).toBe(true);
  });

  it('2e échec dans la séance → indice proposé ; réussite avec indice', () => {
    let r = startWordRun('i', 'forêt', 2, 1);
    r = submitWord(r, 'forai');
    expect(r.phase).toBe('hintOffer');
    r = submitWord(acceptHint(r), 'forêt');
    expect(r).toMatchObject({ phase: 'done', outcome: 'success_hint' });
    expect(r.errorTypes).toEqual(['spelling']);
  });

  it('indice refusé → correction, pas de 3e présentation', () => {
    let r = declineHint(submitWord(startWordRun('i', 'forêt', 2, 1), 'forai'));
    expect(r).toMatchObject({ phase: 'correction', outcome: 'fail' });
    r = submitWord(r, 'forêt');
    expect(shouldRequeue(r)).toBe(false);
  });

  it('échec malgré l’indice → correction', () => {
    const r = submitWord(acceptHint(submitWord(startWordRun('i', 'forêt', 2, 1), 'forai')), 'foré');
    expect(r).toMatchObject({ phase: 'correction', outcome: 'fail' });
  });
});
