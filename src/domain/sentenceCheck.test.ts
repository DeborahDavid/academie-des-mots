import { describe, expect, it } from 'vitest';
import { checkSentence, isAgreementVariant, tokenize } from './sentenceCheck';

const E = 'Les chats de ma voisine dorment sur le canapé.';

describe('tokenize', () => {
  it('sépare mots et ponctuation, garde apostrophes et traits d’union', () => {
    expect(tokenize("Où as-tu mis l'eau ?")).toEqual(['Où', 'as-tu', 'mis', 'l’eau', '?']);
  });
});

describe('checkSentence', () => {
  it('phrase juste (espaces et apostrophes tolérés)', () => {
    expect(checkSentence('  Les chats de ma voisine  dorment sur le canapé. ', E)).toMatchObject({ correct: true, errorCount: 0 });
  });

  it('erreur d’accord sujet-verbe éloigné', () => {
    expect(checkSentence('Les chats de ma voisine dort sur le canapé.', E)).toEqual({
      correct: false,
      errorCount: 1,
      agreementErrors: 1,
      errorTypes: ['agreement'],
    });
  });

  it('plusieurs erreurs de nature différente', () => {
    const c = checkSentence('Les chat de ma voisine dorment sur le canape', E);
    expect(c.errorCount).toBe(3); // chat, canape, point final
    expect(c.agreementErrors).toBe(1);
    expect(c.errorTypes.sort()).toEqual(['accent', 'agreement', 'spelling']);
  });

  it('majuscule initiale et point final comptent', () => {
    expect(checkSentence('les chats de ma voisine dorment sur le canapé', E).errorCount).toBe(2);
  });

  it('mot oublié', () => {
    expect(checkSentence('Les chats de voisine dorment sur le canapé.', E).errorCount).toBe(1);
  });
});

describe('isAgreementVariant', () => {
  it.each([
    ['chat', 'chats'],
    ['grand', 'grande'],
    ['mangé', 'manger'],
    ['dort', 'dorment'],
    ['joue', 'jouent'],
    ['cheval', 'chevaux'],
    ['a', 'à'],
    ['est', 'et'],
    ['son', 'sont'],
    ['ses', 'ces'],
    ['ou', 'où'],
  ])('%s / %s → accord', (a, e) => expect(isAgreementVariant(a, e)).toBe(true));

  it.each([
    ['maizon', 'maison'],
    ['chato', 'château'],
    ['fame', 'femme'],
  ])('%s / %s → orthographe', (a, e) => expect(isAgreementVariant(a, e)).toBe(false));
});

describe('futur', () => {
  it('chantera / chanteront, arrivera / arriveront → accord', () => {
    expect(isAgreementVariant('chantera', 'chanteront')).toBe(true);
    expect(isAgreementVariant('arrivera', 'arriveront')).toBe(true);
  });
});

describe('exemples du parent', () => {
  it('« Les ligne noir » et « ont été découvert » : erreurs d’accord', () => {
    const c = checkSentence('Les ligne noir du cahier sont bien droites.', 'Les lignes noires du cahier sont bien droites.');
    expect(c).toMatchObject({ errorCount: 2, agreementErrors: 2, errorTypes: ['agreement'] });
    expect(isAgreementVariant('découvert', 'découvertes')).toBe(true);
  });
});
