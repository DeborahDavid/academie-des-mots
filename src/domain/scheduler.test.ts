import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';
import { isAcquired, isDue, isNew, review } from './scheduler';

const day = 86_400_000;

describe('scheduler', () => {
  const t0 = new Date(2026, 9, 12, 17, 0);

  it('nouvelle carte : ni due ni acquise', () => {
    const c = createEmptyCard(t0);
    expect(isNew(c)).toBe(true);
    expect(isDue(c, t0)).toBe(false);
  });

  it('échec → revient au plus tard le lendemain', () => {
    const c = review(createEmptyCard(t0), 'fail', t0);
    expect(new Date(c.due).getTime() - t0.getTime()).toBeLessThanOrEqual(1.5 * day);
  });

  it('réussite → intervalle plus long qu’avec indice, lui-même plus long qu’un échec', () => {
    const base = review(createEmptyCard(t0), 'success', t0);
    const t1 = new Date(base.due);
    const ok = review(base, 'success', t1);
    const hint = review(base, 'success_hint', t1);
    const fail = review(base, 'fail', t1);
    expect(+new Date(ok.due)).toBeGreaterThan(+new Date(hint.due));
    expect(+new Date(hint.due)).toBeGreaterThan(+new Date(fail.due));
  });

  it('plusieurs réussites espacées → acquis', () => {
    let c = createEmptyCard(t0);
    let t = t0;
    for (let i = 0; i < 6; i++) {
      c = review(c, 'success', t);
      t = new Date(c.due);
    }
    expect(isAcquired(c, 21)).toBe(true);
  });
});
