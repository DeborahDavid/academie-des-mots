import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';
import { type MasteryStats, REWARDS, isReached, nextReward, wearNew, wordStats } from './rewards';
import { review } from './scheduler';

const zero: MasteryStats = { onTrackWords: 0, acquiredWords: 0, completedWeeks: 0, masteredNotions: 0, allNotionsMastered: false };
const t0 = new Date(2026, 9, 1);

describe('rewards', () => {
  it('première récompense dès 5 mots en bonne voie', () => {
    const first = REWARDS[0];
    expect(isReached(first, { ...zero, onTrackWords: 4 })).toBe(false);
    expect(isReached(first, { ...zero, onTrackWords: 5 })).toBe(true);
  });

  it('chapeau : 25 mots acquis OU une notion maîtrisée', () => {
    const hat = REWARDS.find((r) => r.id === 'hat')!;
    expect(isReached(hat, { ...zero, acquiredWords: 24 })).toBe(false);
    expect(isReached(hat, { ...zero, acquiredWords: 25 })).toBe(true);
    expect(isReached(hat, { ...zero, masteredNotions: 1 })).toBe(true);
  });

  it('prochaine récompense = la première non gagnée', () => {
    expect(nextReward(new Set(), zero)?.id).toBe('cape-star');
    expect(nextReward(new Set(['cape-star']), { ...zero, onTrackWords: 5 })?.id).toBe('scarf');
  });

  it('chapeau et couronne ne se portent pas ensemble', () => {
    expect(wearNew(['cape-star', 'hat'], 'crown')).toEqual(['cape-star', 'crown']);
    expect(wearNew(['crown'], 'scarf')).toEqual(['crown', 'scarf']);
  });

  it('statistiques : bonne voie après une réussite, semaine complétée', () => {
    const ok = review(createEmptyCard(t0), 'success', t0);
    const ko = review(createEmptyCard(t0), 'fail', t0);
    const s = wordStats(
      [
        { card: ok, weekId: 'a' },
        { card: ok, weekId: 'a' },
        { card: ok, weekId: 'b' },
        { card: ko, weekId: 'b' },
      ],
      21,
    );
    expect(s).toEqual({ onTrackWords: 3, acquiredWords: 0, completedWeeks: 1 });
  });
});
