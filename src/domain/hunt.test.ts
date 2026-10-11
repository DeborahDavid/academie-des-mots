import { describe, expect, it } from 'vitest';
import { SEED_SENTENCES } from '../content/seedSentences';
import { buildHunt, hintWindow, huntResult, isRightFix } from './hunt';

describe('chasse aux erreurs', () => {
  it.each(SEED_SENTENCES.map((s) => [s.text, s.hunt!]))('« %s » : version valide (1 à 3 erreurs d’accord)', (text, hunt) => {
    const r = buildHunt(text, hunt);
    expect(r.problem).toBeUndefined();
  });

  it('refuse une erreur d’orthographe lexicale ou un mot en plus', () => {
    expect(buildHunt('Le chat dort.', 'Le chat dore.').problem).toBeUndefined(); // dort / dore : terminaison
    expect(buildHunt('La maison est grande.', 'La maizon est grande.').problem).toContain('pas une erreur d’accord');
    expect(buildHunt('Le chat dort.', 'Le gros chat dort.').problem).toContain('mêmes mots');
    expect(buildHunt('Le chat dort.', 'Le chat dort.').problem).toContain('1 à 3');
  });

  it('indice : un groupe de 3 mots autour de l’erreur, jamais le mot seul', () => {
    const { puzzle } = buildHunt('Les chats de ma voisine dorment sur le canapé.', 'Les chats de ma voisine dort sur le canapé.');
    const w = hintWindow(puzzle!, new Set());
    expect(w).toHaveLength(3);
    expect(w).toContain(5);
  });

  it('correction : majuscule tolérée en début de phrase seulement', () => {
    expect(isRightFix('ses', 'Ses', 0)).toBe(true);
    expect(isRightFix('dorment', 'dorment', 5)).toBe(true);
    expect(isRightFix('Dorment', 'dorment', 5)).toBe(false);
  });

  it('résultat', () => {
    expect(huntResult(0, 0, false, 0).outcome).toBe('success');
    expect(huntResult(1, 0, false, 0).outcome).toBe('success_hint');
    expect(huntResult(0, 0, true, 0).outcome).toBe('success_hint');
    expect(huntResult(0, 2, false, 1).outcome).toBe('fail');
  });
});
