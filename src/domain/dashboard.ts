import type { Card } from 'ts-fsrs';
import type { DayRecord, Item, Notion, ReviewLog, Week, Word } from './model';
import { localDate } from './points';
import { type WeekStop, weekStop } from './path';
import { isOnTrack } from './rewards';
import { isAcquired, isNew } from './scheduler';

export interface DashboardInput {
  weeks: Week[];
  words: Word[];
  items: Item[];
  logs: ReviewLog[];
  notions: Notion[];
  days: DayRecord[];
  acquiredDays: number;
  now: Date;
}

export interface OutcomeSplit {
  alone: number; // réussi seule du premier coup
  withHint: number; // réussi avec aide (indice, correction trouvée seule après « il reste X erreurs »)
  fail: number;
}

export interface Dashboard {
  overview: { words: number; onTrack: number; acquired: number; overdue: number; flameDays: number; activeDays7: number; points7: number };
  activity: { date: string; label: string; sessions: number; points: number }[];
  weeks: (WeekStop & { spelling: number; accent: number })[];
  /** Erreurs des 30 derniers jours, séparées comme le demande la spec. */
  errors: { spelling: number; accent: number; agreementByNotion: { notionId: string; label: string; count: number }[] };
  success: { words: OutcomeSplit; sentences: OutcomeSplit };
  justifications: { right: number; total: number };
  notions: { id: string; label: string; level: number; mastered: boolean; constellation?: string; lastOutcome?: string; nextReview?: Date; reviews: number }[];
  hardestWords: { text: string; fails: number; accent: number; spelling: number }[];
  overdueWords: { text: string; daysLate: number }[];
}

const DAY = 86_400_000;

function split(outcomes: string[]): OutcomeSplit {
  return {
    alone: outcomes.filter((o) => o === 'success').length,
    withHint: outcomes.filter((o) => o === 'success_hint').length,
    fail: outcomes.filter((o) => o === 'fail').length,
  };
}

/** Tableau de bord parent : uniquement des mesures réelles, jamais un chiffre global trompeur. */
export function computeDashboard(i: DashboardInput): Dashboard {
  const now = i.now.getTime();
  const sod = new Date(i.now).setHours(0, 0, 0, 0);
  const since30 = now - 30 * DAY;
  const wordItems = i.items.filter((x) => x.kind === 'word');
  const cardOf = new Map<string, Card>(wordItems.map((x) => [x.refId, x.card]));
  const wordOfItem = new Map(i.words.map((w) => [`word:${w.id}`, w]));
  const cards = i.words.filter((w) => cardOf.has(w.id)).map((w) => cardOf.get(w.id)!);

  const overdueWords = i.words
    .filter((w) => cardOf.has(w.id) && !isNew(cardOf.get(w.id)!) && +new Date(cardOf.get(w.id)!.due) < sod)
    .map((w) => ({ text: w.text, daysLate: Math.floor((sod - +new Date(cardOf.get(w.id)!.due)) / DAY) + 1 }))
    .sort((a, b) => b.daysLate - a.daysLate);

  // Activité des 7 derniers jours (flamme et points).
  const dayOf = new Map(i.days.map((d) => [d.date, d]));
  const activity = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(sod - (6 - k) * DAY);
    const rec = dayOf.get(localDate(d));
    return { date: localDate(d), label: d.toLocaleDateString('fr-FR', { weekday: 'short' }), sessions: rec?.sessions ?? 0, points: rec?.points ?? 0 };
  });

  const wordLogs = i.logs.filter((l) => l.kind === 'word');
  const recentWordLogs = wordLogs.filter((l) => l.at >= since30);
  const notionLogs = i.logs.filter((l) => l.kind === 'notion');
  const justifications = i.logs.filter((l) => l.questionType === 'justification' && l.at >= since30);
  // Les justifications sont comptées à part : ce ne sont ni des révisions ni des erreurs d'accord.
  const recentNotionLogs = notionLogs.filter((l) => l.at >= since30 && l.questionType !== 'justification');

  // Erreurs par semaine de liste (orthographe / accent), toutes périodes.
  const weekOfWord = new Map(i.words.map((w) => [w.id, w.weekId]));
  const weekErrors = new Map<string, { spelling: number; accent: number }>();
  for (const l of wordLogs) {
    const weekId = weekOfWord.get(l.itemId.slice('word:'.length));
    if (!weekId) continue;
    const e = weekErrors.get(weekId) ?? { spelling: 0, accent: 0 };
    if (l.errorTypes.includes('spelling')) e.spelling++;
    if (l.errorTypes.includes('accent')) e.accent++;
    weekErrors.set(weekId, e);
  }
  const weeks = [...i.weeks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((w) => ({
      ...weekStop(w.id, w.label, w.startDate, i.words.filter((x) => x.weekId === w.id && cardOf.has(x.id)).map((x) => cardOf.get(x.id)!), i.acquiredDays),
      ...(weekErrors.get(w.id) ?? { spelling: 0, accent: 0 }),
    }));

  // Accords : une phrase compte une erreur pour chacune de ses notions si l'accord n'a pas été réussi du premier coup.
  const label = new Map(i.notions.map((n) => [n.id, n.label]));
  const agreement = new Map<string, number>();
  for (const l of recentNotionLogs) {
    if (l.outcome === 'success') continue;
    const id = l.itemId.slice('notion:'.length);
    agreement.set(id, (agreement.get(id) ?? 0) + 1);
  }

  // Réussites : 1re présentation des mots ; une phrase = un résultat (et non un par notion).
  const sentenceOutcomes = new Map<string, string>();
  for (const l of recentNotionLogs) if (l.sentenceId) sentenceOutcomes.set(`${l.sessionId}|${l.sentenceId}`, l.outcome);

  const failsByWord = new Map<string, { fails: number; accent: number; spelling: number }>();
  for (const l of wordLogs) {
    if (l.outcome !== 'fail') continue;
    const f = failsByWord.get(l.itemId) ?? { fails: 0, accent: 0, spelling: 0 };
    f.fails++;
    if (l.errorTypes.includes('accent')) f.accent++;
    if (l.errorTypes.includes('spelling')) f.spelling++;
    failsByWord.set(l.itemId, f);
  }

  const notionItem = new Map(i.items.filter((x) => x.kind === 'notion').map((x) => [x.refId, x]));
  const lastOutcome = new Map<string, string>();
  const reviewsOf = new Map<string, number>();
  for (const l of [...notionLogs].filter((x) => x.questionType !== 'justification').sort((a, b) => a.at - b.at)) {
    const id = l.itemId.slice('notion:'.length);
    lastOutcome.set(id, l.outcome);
    reviewsOf.set(id, (reviewsOf.get(id) ?? 0) + 1);
  }

  return {
    overview: {
      words: i.words.length,
      onTrack: cards.filter(isOnTrack).length,
      acquired: cards.filter((c) => isAcquired(c, i.acquiredDays)).length,
      overdue: overdueWords.length,
      flameDays: i.days.filter((d) => d.dailyDoneAt).length,
      activeDays7: activity.filter((d) => d.sessions > 0).length,
      points7: activity.reduce((s, d) => s + d.points, 0),
    },
    activity,
    weeks,
    errors: {
      spelling: recentWordLogs.filter((l) => l.errorTypes.includes('spelling')).length,
      accent: recentWordLogs.filter((l) => l.errorTypes.includes('accent')).length,
      agreementByNotion: [...agreement].map(([notionId, count]) => ({ notionId, label: label.get(notionId) ?? notionId, count })).sort((a, b) => b.count - a.count),
    },
    success: {
      words: split(recentWordLogs.filter((l) => l.presentation === 1).map((l) => l.outcome)),
      sentences: split([...sentenceOutcomes.values()]),
    },
    justifications: (() => {
      const bySentence = new Map<string, string>();
      for (const l of justifications) bySentence.set(`${l.sessionId}|${l.sentenceId}`, l.outcome);
      const v = [...bySentence.values()];
      return { right: v.filter((o) => o === 'success').length, total: v.length };
    })(),
    notions: i.notions
      .filter((n) => n.status === 'seen')
      .sort((a, b) => a.order - b.order)
      .map((n) => ({
        id: n.id,
        label: n.label,
        level: n.guidanceLevel,
        mastered: !!n.masteredAt,
        constellation: n.constellation,
        lastOutcome: lastOutcome.get(n.id),
        nextReview: notionItem.get(n.id)?.card.reps ? new Date(notionItem.get(n.id)!.card.due) : undefined,
        reviews: reviewsOf.get(n.id) ?? 0,
      })),
    hardestWords: [...failsByWord]
      .map(([itemId, f]) => ({ text: wordOfItem.get(itemId)?.text ?? '?', ...f }))
      .sort((a, b) => b.fails - a.fails)
      .slice(0, 8),
    overdueWords: overdueWords.slice(0, 10),
  };
}
