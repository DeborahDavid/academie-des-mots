import { describe, expect, it } from 'vitest';
import { parseWordList, wordKey } from './parseList';

describe('parseWordList', () => {
  it('lit un mot par ligne et ignore les lignes vides', () => {
    expect(parseWordList('forêt\n\n  château  \n')).toEqual([{ text: 'forêt' }, { text: 'château' }]);
  });

  it('retire puces et numéros', () => {
    expect(parseWordList('- un cheval\n• la forêt\n3. soudain\n4) hier').map((e) => e.text)).toEqual([
      'un cheval',
      'la forêt',
      'soudain',
      'hier',
    ]);
  });

  it('lit la phrase de contexte et l’indice', () => {
    expect(parseWordList("grand | Le chêne est très grand. | Pense à 'grande'")).toEqual([
      { text: 'grand', context: 'Le chêne est très grand.', hint: 'Pense à ’grande’' },
    ]);
  });

  it('ignore les doublons (casse et apostrophes)', () => {
    expect(parseWordList("aujourd'hui\nAujourd’hui")).toEqual([{ text: 'aujourd’hui' }]);
  });

  it('conserve les accents', () => {
    expect(wordKey('Élève')).toBe('élève');
  });
});
