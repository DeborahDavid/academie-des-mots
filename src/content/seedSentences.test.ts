import { describe, expect, it } from 'vitest';
import { SEED_SENTENCES } from './seedSentences';
import { NOTION_CATALOG } from '../domain/notions';
import { checkSentence, tokenize } from '../domain/sentenceCheck';

const notionIds = new Set(NOTION_CATALOG.map((n) => n.id));

describe('banque de phrases', () => {
  it.each(SEED_SENTENCES.map((s) => [s.text, s]))('« %s » : justification et transformation valides', (_, s) => {
    expect(s.notionIds.every((n) => notionIds.has(n))).toBe(true);
    // justification : le mot est dans la phrase, 3 raisons différentes
    expect(tokenize(s.text)).toContain(s.why!.word);
    expect(new Set(s.why!.choices).size).toBe(3);
    if (s.transform) {
      expect(s.transform.notionIds.every((n) => notionIds.has(n))).toBe(true);
      expect(s.transform.target).not.toBe(s.text);
      expect(checkSentence(s.transform.target, s.transform.target).correct).toBe(true);
      expect(s.transform.instruction).toMatch(/^[A-ZÀ-Ý]/);
    }
  });
});
