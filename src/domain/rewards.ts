import type { Card } from 'ts-fsrs';
import { isAcquired, isNew } from './scheduler';

/** Ce qui fait avancer la garde-robe : uniquement la maîtrise, jamais le temps passé. */
export interface MasteryStats {
  /** Mots réussis au moins une fois, encore bien ancrés (stabilité ≥ 3 jours). */
  onTrackWords: number;
  /** Mots acquis (stabilité ≥ seuil, ~1 mois). */
  acquiredWords: number;
  /** Semaines dont tous les mots sont en bonne voie. */
  completedWeeks: number;
  masteredNotions: number;
  /** Toutes les notions CE2 activées sont maîtrisées (et au moins une activée). */
  allNotionsMastered: boolean;
}

export type RewardId = 'cape-star' | 'scarf' | 'ada-brooch' | 'cape-moon' | 'hat' | 'sneakers' | 'crown';

/** Emplacement sur l'avatar : un seul objet par emplacement « tête ». */
export type Slot = 'cape' | 'neck' | 'brooch' | 'head' | 'feet';

export interface Reward {
  id: RewardId;
  name: string;
  slot: Slot;
  /** Condition affichée à l'enfant. */
  goal: string;
  /** Avancement : valeur actuelle / cible (le meilleur des critères alternatifs). */
  progress: (s: MasteryStats) => { current: number; target: number; unit: string };
}

const words = (n: number, unit: string, get: (s: MasteryStats) => number) => (s: MasteryStats) => ({ current: Math.min(get(s), n), target: n, unit });

export const REWARDS: Reward[] = [
  { id: 'cape-star', name: 'Étoile brodée', slot: 'cape', goal: '5 mots en bonne voie', progress: words(5, 'mots en bonne voie', (s) => s.onTrackWords) },
  { id: 'scarf', name: 'Écharpe dorée', slot: 'neck', goal: '1 semaine de mots complétée', progress: words(1, 'semaine complétée', (s) => s.completedWeeks) },
  { id: 'ada-brooch', name: 'Broche Ada', slot: 'brooch', goal: '15 mots en bonne voie', progress: words(15, 'mots en bonne voie', (s) => s.onTrackWords) },
  { id: 'cape-moon', name: 'Lune brodée', slot: 'cape', goal: '5 mots acquis', progress: words(5, 'mots acquis', (s) => s.acquiredWords) },
  {
    id: 'hat',
    name: 'Chapeau de magicienne',
    slot: 'head',
    goal: '25 mots acquis, ou une notion maîtrisée',
    progress: (s) => (s.masteredNotions >= 1 ? { current: 1, target: 1, unit: 'notion maîtrisée' } : words(25, 'mots acquis', (x) => x.acquiredWords)(s)),
  },
  { id: 'sneakers', name: 'Baskets dorées', slot: 'feet', goal: '50 mots acquis', progress: words(50, 'mots acquis', (s) => s.acquiredWords) },
  {
    id: 'crown',
    name: 'Couronne d’étoiles',
    slot: 'head',
    goal: '100 mots acquis, ou toutes les notions maîtrisées',
    progress: (s) => (s.allNotionsMastered ? { current: 1, target: 1, unit: 'toutes les notions' } : words(100, 'mots acquis', (x) => x.acquiredWords)(s)),
  },
];

export function isReached(r: Reward, s: MasteryStats): boolean {
  const p = r.progress(s);
  return p.current >= p.target;
}

/** Stabilité (jours) à partir de laquelle un mot est « en bonne voie ». */
export const ON_TRACK_DAYS = 3;

export function isOnTrack(card: Card): boolean {
  return !isNew(card) && card.stability >= ON_TRACK_DAYS;
}

export function wordStats(cards: { card: Card; weekId: string }[], acquiredDays: number) {
  const byWeek = new Map<string, boolean>();
  let onTrack = 0, acquired = 0;
  for (const { card, weekId } of cards) {
    const ok = isOnTrack(card);
    if (ok) onTrack++;
    if (isAcquired(card, acquiredDays)) acquired++;
    byWeek.set(weekId, (byWeek.get(weekId) ?? true) && ok);
  }
  return { onTrackWords: onTrack, acquiredWords: acquired, completedWeeks: [...byWeek.values()].filter(Boolean).length };
}

/** Prochaine récompense pas encore gagnée (pour la barre de progression de l'accueil). */
export function nextReward(unlocked: Set<string>, s: MasteryStats): Reward | undefined {
  return REWARDS.find((r) => !unlocked.has(r.id) && !isReached(r, s));
}

/**
 * Tenue portée par défaut quand une récompense arrive : on la met,
 * en retirant ce qui occupait le même emplacement « tête » (chapeau ou couronne).
 */
export function wearNew(worn: RewardId[], id: RewardId): RewardId[] {
  const slot = REWARDS.find((r) => r.id === id)!.slot;
  const keep = slot === 'head' ? worn.filter((w) => REWARDS.find((r) => r.id === w)!.slot !== 'head') : worn;
  return keep.includes(id) ? keep : [...keep, id];
}
