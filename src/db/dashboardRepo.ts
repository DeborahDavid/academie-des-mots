import { type AcademieDB, db as defaultDb } from './db';
import { getSettings } from './repo';
import { type Dashboard, computeDashboard } from '../domain/dashboard';

export async function getDashboard(now = new Date(), db: AcademieDB = defaultDb): Promise<Dashboard> {
  const [weeks, words, items, logs, notions, days, settings] = await Promise.all([
    db.weeks.toArray(),
    db.words.toArray(),
    db.items.toArray(),
    db.reviewLogs.toArray(),
    db.notions.toArray(),
    db.days.toArray(),
    getSettings(db),
  ]);
  return computeDashboard({ weeks, words, items, logs, notions, days, acquiredDays: settings.thresholds.acquiredStabilityDays, now });
}
