import { type Card, type Grade, Rating, State, fsrs, generatorParameters } from 'ts-fsrs';
import type { Outcome } from './model';

/** Séances quotidiennes : pas d'étapes en minutes, intervalles en jours. */
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }));

/**
 * Note FSRS à partir du résultat de la 1re présentation de la séance.
 * - réussite du premier coup → Good
 * - réussite avec indice → Hard
 * - échec → Again
 */
export function outcomeToRating(outcome: Outcome): Grade {
  switch (outcome) {
    case 'success':
      return Rating.Good;
    case 'success_hint':
      return Rating.Hard;
    case 'fail':
      return Rating.Again;
  }
}

export function review(card: Card, outcome: Outcome, now = new Date()): Card {
  return scheduler.next(card, now, outcomeToRating(outcome)).card;
}

/** Fin de la journée locale : un item est dû s'il l'est avant minuit. */
export function endOfDay(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isNew(card: Card): boolean {
  return card.state === State.New;
}

export function isDue(card: Card, now = new Date()): boolean {
  return !isNew(card) && new Date(card.due).getTime() <= endOfDay(now).getTime();
}

/** « Acquis » : en révision, stabilité au-dessus du seuil (en jours). */
export function isAcquired(card: Card, stabilityDays: number): boolean {
  return card.state === State.Review && card.stability >= stabilityDays;
}
