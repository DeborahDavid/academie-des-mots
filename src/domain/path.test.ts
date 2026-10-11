import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';
import { weekStop } from './path';
import { review } from './scheduler';

const t0 = new Date(2026, 8, 7);
const fresh = () => createEmptyCard(t0);
const ok = () => review(createEmptyCard(t0), 'success', t0);
const acquired = () => {
  let c = createEmptyCard(t0);
  let t = t0;
  for (let i = 0; i < 6; i++) (c = review(c, 'success', t)), (t = new Date(c.due));
  return c;
};

describe('weekStop', () => {
  it('états de l’étape', () => {
    expect(weekStop('w', 'S1', '2026-09-07', [fresh(), fresh()], 21).state).toBe('avenir');
    expect(weekStop('w', 'S1', '2026-09-07', [ok(), fresh()], 21).state).toBe('encours');
    expect(weekStop('w', 'S1', '2026-09-07', [ok(), ok()], 21).state).toBe('completee');
    expect(weekStop('w', 'S1', '2026-09-07', [acquired(), acquired()], 21)).toMatchObject({ state: 'maitrisee', acquired: 2, onTrack: 2 });
  });
});
