import { describe, expect, it } from 'vitest';
import { SHAPES, constellationFor, moonLitPath, normalizeShapeIds } from './constellations';

describe('constellations', () => {
  it('formes valides : traits entre étoiles existantes, coordonnées dans la boîte', () => {
    for (const s of SHAPES) {
      for (const [a, b] of s.lines) expect(s.stars[a] && s.stars[b], `${s.id} ${a}-${b}`).toBeTruthy();
      for (const [x, y] of s.stars) expect(x >= 0 && x <= 100 && y >= 0 && y <= 100).toBe(true);
    }
  });

  it('les trois premières notions maîtrisées : poulet, chat, ballon (choix de Leyu)', () => {
    const order = normalizeShapeIds(['poulet', 'chat', 'ballon de foot']);
    expect([0, 1, 2, 3].map((i) => constellationFor(i, order).id)).toEqual(['poulet', 'chat', 'ballon', 'etoile']);
  });

  it('lune : nouvelle lune invisible, pleine lune complète, décroissante retournée', () => {
    expect(moonLitPath(0, 10).d).toBe('');
    expect(moonLitPath(4, 10).d).toContain('A 10 10');
    expect(moonLitPath(2, 10).mirror).toBe(false);
    expect(moonLitPath(6, 10).mirror).toBe(true);
  });
});
