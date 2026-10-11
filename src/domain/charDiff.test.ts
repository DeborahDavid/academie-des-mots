import { describe, expect, it } from 'vitest';
import { markMistakes } from './charDiff';

const marked = (a: string, e: string) => [...e].filter((_, i) => markMistakes(a, e)[i]).join('');

describe('markMistakes', () => {
  it('accent oublié', () => expect(marked('foret', 'forêt')).toBe('ê'));
  it('lettre muette oubliée', () => expect(marked('gran', 'grand')).toBe('d'));
  it('consonne double', () => expect(marked('terre', 'terre')).toBe(''));
  it('lettre manquante dans une double', () => expect(marked('tere', 'terre')).toBe('r'));
  it('lettre en trop', () => expect(marked('chatt', 'chat')).toBe('t'));
  it('casse ignorée', () => expect(marked('Forêt', 'forêt')).toBe(''));
});
