import type { Card } from 'ts-fsrs';
import { isOnTrack } from './rewards';
import { isAcquired, isNew } from './scheduler';

export type StopState = 'avenir' | 'encours' | 'completee' | 'maitrisee';

export interface WeekStop {
  weekId: string;
  label: string;
  startDate: string;
  total: number;
  /** Jamais encore dictés. */
  fresh: number;
  onTrack: number;
  acquired: number;
  state: StopState;
}

/**
 * Une étape du parcours par liste hebdomadaire.
 * complétée = tous les mots en bonne voie ; maîtrisée = tous les mots acquis (≈ un mois de mémoire).
 */
export function weekStop(weekId: string, label: string, startDate: string, cards: Card[], acquiredDays: number): WeekStop {
  const total = cards.length;
  const fresh = cards.filter(isNew).length;
  const onTrack = cards.filter(isOnTrack).length;
  const acquired = cards.filter((c) => isAcquired(c, acquiredDays)).length;
  const state: StopState =
    total > 0 && acquired === total ? 'maitrisee' : total > 0 && onTrack === total ? 'completee' : fresh === total ? 'avenir' : 'encours';
  return { weekId, label, startDate, total, fresh, onTrack, acquired, state };
}
