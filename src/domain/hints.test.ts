import { describe, expect, it } from 'vitest';
import { autoHint } from './hints';

describe('autoHint', () => {
  it('décrit la structure sans montrer le mot', () => {
    const h = autoHint('la forêt');
    expect(h).toBe('Ce mot a 5 lettres, il y a un accent circonflexe.');
    expect(h).not.toMatch(/for/);
  });

  it('consonnes doubles', () => {
    expect(autoHint('un accessoire')).toContain('2 consonnes doubles');
    expect(autoHint('la terre')).toContain('une consonne double');
  });

  it('plusieurs accents, cédille', () => {
    expect(autoHint('le garçon')).toContain('une cédille');
    expect(autoHint('un élève')).toContain('un accent aigu et un accent grave');
  });

  it('sans accent', () => {
    expect(autoHint('grand')).toContain('pas d’accent');
  });
});
