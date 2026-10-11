import { describe, expect, it } from 'vitest';
import {
  acceptSentenceHint,
  declineSentenceHint,
  finishProof1,
  finishWriting,
  notionOutcome,
  startSentenceRun,
  startSentenceTyping,
  submitSentence,
} from './sentenceRun';

const E = 'Les chats de ma voisine dorment sur le canapé.';
const ready = () => finishProof1(finishWriting(startSentenceRun(E, ['sv-eloigne'], 1)));

describe('sentenceRun', () => {
  it('deux passes de relecture obligatoires avant de valider', () => {
    let r = startSentenceRun(E, [], 1);
    expect(submitSentence(r, E).phase).toBe('write'); // validation impossible avant les relectures
    r = finishWriting(r);
    expect(submitSentence(r, E).phase).toBe('proof1');
    r = finishProof1(r);
    expect(submitSentence(r, E)).toMatchObject({ phase: 'done', outcome: 'success' });
  });

  it('erreur → « il reste X erreurs » sans dire où ; corrigée seule → réussite difficile', () => {
    let r = submitSentence(ready(), 'Les chats de ma voisine dort sur le canapé.');
    expect(r).toMatchObject({ phase: 'retry', remaining: 1 });
    r = submitSentence(r, E);
    expect(r).toMatchObject({ phase: 'done', outcome: 'success_hint' });
    expect(notionOutcome(r)).toBe('success_hint');
  });

  it('2e échec → indice proposé ; refus → correction de mémoire', () => {
    let r = submitSentence(ready(), 'Les chats de ma voisine dort sur le canapé.');
    r = submitSentence(r, 'Les chats de ma voisine dort sur le canapé.');
    expect(r.phase).toBe('hintOffer');
    r = declineSentenceHint(r);
    expect(r).toMatchObject({ phase: 'correction', revealCorrect: true, outcome: 'fail' });
    r = startSentenceTyping(r);
    expect(r.revealCorrect).toBe(false);
    r = submitSentence(r, E);
    expect(r).toMatchObject({ phase: 'done', outcome: 'fail' });
    expect(notionOutcome(r)).toBe('fail');
  });

  it('indice accepté puis réussite', () => {
    let r = submitSentence(ready(), 'Les chat de ma voisine dort sur le canapé.');
    r = acceptSentenceHint(submitSentence(r, 'Les chats de ma voisine dort sur le canapé.'));
    expect(r).toMatchObject({ phase: 'retry', hintUsed: true });
    r = submitSentence(r, E);
    expect(r).toMatchObject({ phase: 'done', outcome: 'success_hint' });
  });

  it('notion réussie si seules des fautes d’orthographe (pas d’accord) au 1er essai', () => {
    let r = submitSentence(ready(), 'Les chats de ma voisine dorment sur le canape.');
    r = submitSentence(r, E);
    expect(notionOutcome(r)).toBe('success');
  });
});
