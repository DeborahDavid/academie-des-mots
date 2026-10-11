import { describe, expect, it } from 'vitest';
import { checkWord } from './compare';

describe('checkWord', () => {
  it('accepte la bonne réponse, espaces et casse ignorés', () => {
    expect(checkWord('  La  Forêt ', 'la forêt')).toEqual({ correct: true });
  });

  it('apostrophe droite = typographique', () => {
    expect(checkWord("aujourd'hui", 'aujourd’hui').correct).toBe(true);
  });

  it('erreur d’accent seule', () => {
    expect(checkWord('foret', 'forêt')).toEqual({ correct: false, errorType: 'accent' });
    expect(checkWord('forèt', 'forêt').errorType).toBe('accent');
    expect(checkWord('garcon', 'garçon').errorType).toBe('accent');
    expect(checkWord('coeur', 'cœur').errorType).toBe('accent');
  });

  it('autre erreur d’orthographe', () => {
    expect(checkWord('foré', 'forêt')).toEqual({ correct: false, errorType: 'spelling' });
    expect(checkWord('gran', 'grand').errorType).toBe('spelling');
  });

  it('NFD et NFC équivalents', () => {
    expect(checkWord('forêt', 'forêt').correct).toBe(true);
  });

  it('nom propre : la majuscule compte', () => {
    expect(checkWord('paris', 'Paris').correct).toBe(false);
    expect(checkWord('Paris', 'Paris').correct).toBe(true);
  });
});
