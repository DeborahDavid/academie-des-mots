import { createEmptyCard } from 'ts-fsrs';
import { type AcademieDB, db as defaultDb } from './db';
import {
  DEFAULT_SETTINGS,
  type Item,
  type Level,
  type Settings,
  type Week,
  type Word,
  itemId,
  newId,
} from '../domain/model';
import { nextMoonPhase } from '../domain/moon';
import { seedNotions } from '../domain/notions';
import { type ParsedEntry, wordKey } from '../domain/parseList';
import { SEED_SENTENCES, SEED_SENTENCES_VERSION } from '../content/seedSentences';
import type { ArtSlot, Sentence, ValidationStatus } from '../domain/model';

/** Crée les notions et réglages par défaut au premier lancement. */
export async function ensureSeeded(db: AcademieDB = defaultDb): Promise<void> {
  await db.transaction('rw', [db.notions, db.settings, db.sentences, db.words], async () => {
    // Les phrases de contexte ne sont plus utilisées : on les efface des mots déjà saisis.
    await db.words.filter((w) => !!w.context).modify((w) => void delete w.context);
    if ((await db.notions.count()) === 0) await db.notions.bulkAdd(seedNotions());
    if (!(await db.settings.get('settings'))) await db.settings.add({ key: 'settings', value: DEFAULT_SETTINGS });
    const s = await getSettings(db);
    if ((s.seedSentencesVersion ?? 0) < SEED_SENTENCES_VERSION) {
      // Proposées au parent (« à valider ») ; une phrase déjà modifiée ou supprimée n'est pas recréée.
      const now = Date.now();
      const existing = new Set(await db.sentences.toCollection().primaryKeys());
      // Identifiants stables (seed-v1-i) : une nouvelle version complète les phrases existantes sans les dupliquer.
      const fresh: Sentence[] = SEED_SENTENCES.map((x, i) => ({
        id: `seed-v1-${i}`,
        text: x.text,
        notionIds: x.notionIds,
        huntText: x.hunt,
        why: x.why,
        transform: x.transform,
        source: 'seed',
        status: 'pending',
        createdAt: now + i,
      }));
      // Les phrases de départ ne sont jamais supprimées (seulement écartées) : un identifiant absent = jamais proposée.
      await db.sentences.bulkAdd(fresh.filter((x) => !existing.has(x.id)));
      // v2 : ajoute la version « chasse aux erreurs » aux phrases de départ que le parent n'a pas modifiées.
      for (const f of fresh) {
        const cur = await db.sentences.get(f.id);
        if (!cur || cur.text !== f.text) continue;
        // v2 : chasse aux erreurs ; v4 : justification et transformation.
        const patch: Partial<Sentence> = {};
        if (!cur.huntText && f.huntText) patch.huntText = f.huntText;
        if (!cur.why && f.why) patch.why = f.why;
        if (!cur.transform && f.transform) patch.transform = f.transform;
        if (Object.keys(patch).length) await db.sentences.update(f.id, patch);
      }
      await db.settings.put({ key: 'settings', value: { ...s, seedSentencesVersion: SEED_SENTENCES_VERSION } });
    }
    // Préférences de son v1 : la musique devient facultative (coupée), les petits sons de réussite reviennent.
    const cur = await getSettings(db);
    if ((cur.audioPrefsVersion ?? 0) < 1) await db.settings.put({ key: 'settings', value: { ...cur, muted: false, musicOn: false, audioPrefsVersion: 1 } });
  });
}

export async function getSettings(db: AcademieDB = defaultDb): Promise<Settings> {
  const row = await db.settings.get('settings');
  return mergeSettings(row?.value);
}

export function mergeSettings(s?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    jersey: { ...DEFAULT_SETTINGS.jersey, ...s?.jersey },
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...s?.thresholds },
  };
}

export async function updateSettings(patch: Partial<Settings>, db: AcademieDB = defaultDb): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const next = mergeSettings({ ...(await getSettings(db)), ...patch });
    await db.settings.put({ key: 'settings', value: next });
    return next;
  });
}

export interface AddWeekInput {
  label: string;
  startDate: string;
  entries: { level: Level; entry: ParsedEntry }[];
}

export interface AddWeekResult {
  week: Week;
  added: number;
  /** Mots déjà présents dans une semaine précédente (non dupliqués). */
  duplicates: string[];
}

/** Ajoute une liste hebdomadaire, crée les items planifiés, avance la lune. */
export async function addWeek(input: AddWeekInput, db: AcademieDB = defaultDb): Promise<AddWeekResult> {
  return db.transaction('rw', [db.weeks, db.words, db.items, db.settings], async () => {
    const now = Date.now();
    const week: Week = { id: newId(), label: input.label.trim(), startDate: input.startDate, createdAt: now };
    const existing = new Set((await db.words.toArray()).map((w) => wordKey(w.text)));
    const duplicates: string[] = [];
    const words: Word[] = [];
    for (const { level, entry } of input.entries) {
      const key = wordKey(entry.text);
      if (existing.has(key)) {
        duplicates.push(entry.text);
        continue;
      }
      existing.add(key);
      // createdAt croissant = ordre de saisie conservé à l'affichage.
      words.push({ id: newId(), weekId: week.id, level, createdAt: now + words.length, ...entry });
    }
    const items: Item[] = words.map((w) => ({
      id: itemId('word', w.id),
      kind: 'word',
      refId: w.id,
      card: createEmptyCard(new Date(now)),
      createdAt: now,
    }));
    await db.weeks.add(week);
    await db.words.bulkAdd(words);
    await db.items.bulkAdd(items);
    const s = await getSettings(db);
    await db.settings.put({ key: 'settings', value: { ...s, moonPhase: nextMoonPhase(s.moonPhase) } });
    return { week, added: words.length, duplicates };
  });
}

export async function updateWeek(id: string, patch: Partial<Pick<Week, 'label' | 'startDate'>>, db: AcademieDB = defaultDb) {
  await db.weeks.update(id, patch);
}

export async function addWordToWeek(weekId: string, level: Level, entry: ParsedEntry, db: AcademieDB = defaultDb) {
  return db.transaction('rw', db.words, db.items, async () => {
    const key = wordKey(entry.text);
    if ((await db.words.toArray()).some((w) => wordKey(w.text) === key)) return false;
    const now = Date.now();
    const word: Word = { id: newId(), weekId, level, createdAt: now, ...entry };
    await db.words.add(word);
    await db.items.add({ id: itemId('word', word.id), kind: 'word', refId: word.id, card: createEmptyCard(new Date(now)), createdAt: now });
    return true;
  });
}

export async function updateWord(id: string, patch: Partial<Pick<Word, 'text' | 'level' | 'hint'>>, db: AcademieDB = defaultDb) {
  await db.words.update(id, patch);
}

export async function deleteWord(id: string, db: AcademieDB = defaultDb) {
  await db.transaction('rw', [db.words, db.items, db.audio, db.reviewLogs], async () => {
    const word = await db.words.get(id);
    if (!word) return;
    const iid = itemId('word', id);
    if (word.audioId) await db.audio.delete(word.audioId);
    await db.reviewLogs.where('itemId').equals(iid).delete();
    await db.items.delete(iid);
    await db.words.delete(id);
  });
}

export async function deleteWeek(id: string, db: AcademieDB = defaultDb) {
  const words = await db.words.where('weekId').equals(id).toArray();
  for (const w of words) await deleteWord(w.id, db);
  await db.weeks.delete(id);
}

export async function setWordAudio(wordId: string, blob: Blob | null, db: AcademieDB = defaultDb) {
  await db.transaction('rw', db.words, db.audio, async () => {
    const word = await db.words.get(wordId);
    if (!word) return;
    if (word.audioId) await db.audio.delete(word.audioId);
    if (!blob) {
      await db.words.update(wordId, { audioId: undefined });
      return;
    }
    const id = newId();
    await db.audio.add({ id, blob, mime: blob.type || 'audio/webm' });
    await db.words.update(wordId, { audioId: id });
  });
}

/** Activer une notion crée son item planifié (une seule fois). */
export async function setNotionStatus(id: string, seen: boolean, db: AcademieDB = defaultDb) {
  await db.transaction('rw', db.notions, db.items, async () => {
    await db.notions.update(id, { status: seen ? 'seen' : 'not_yet' });
    const iid = itemId('notion', id);
    if (seen && !(await db.items.get(iid))) {
      const now = Date.now();
      await db.items.add({ id: iid, kind: 'notion', refId: id, card: createEmptyCard(new Date(now)), createdAt: now });
    }
  });
}

/** Lundi suivant la dernière semaine saisie, sinon lundi de la semaine courante. */
export function suggestNextStartDate(weeks: Week[], today = new Date()): string {
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (weeks.length) {
    const last = weeks.map((w) => w.startDate).sort().at(-1)!;
    const [y, m, d] = last.split('-').map(Number);
    return toIso(new Date(y, m - 1, d + 7));
  }
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return toIso(monday);
}

/** Phrase écrite par le parent : validée d'office. */
export async function addSentence(text: string, notionIds: string[], db: AcademieDB = defaultDb): Promise<void> {
  await db.sentences.add({ id: newId(), text: text.trim().replace(/'/g, '’'), notionIds, source: 'parent', status: 'validated', createdAt: Date.now() });
}

export async function updateSentence(id: string, patch: Partial<Pick<Sentence, 'text' | 'notionIds' | 'huntText'>>, db: AcademieDB = defaultDb) {
  const clean = (t?: string) => (t === undefined ? undefined : t.trim().replace(/'/g, '’') || undefined);
  await db.sentences.update(id, { ...patch, ...('text' in patch ? { text: clean(patch.text) } : {}), ...('huntText' in patch ? { huntText: clean(patch.huntText) } : {}) });
}

export async function setSentenceStatus(id: string, status: ValidationStatus, db: AcademieDB = defaultDb) {
  await db.sentences.update(id, { status });
}

export async function deleteSentence(id: string, db: AcademieDB = defaultDb) {
  await db.sentences.delete(id);
}

/** Enregistre (ou retire) le portrait d'un personnage. */
export async function setPortrait(who: ArtSlot, blob: Blob | null, db: AcademieDB = defaultDb) {
  await db.transaction('rw', db.images, db.settings, async () => {
    const s = await getSettings(db);
    const old = s.portraits?.[who];
    if (old) await db.images.delete(old);
    const portraits = { ...s.portraits };
    if (blob) {
      const id = newId();
      await db.images.add({ id, blob, mime: blob.type || 'image/png' });
      portraits[who] = id;
    } else delete portraits[who];
    await db.settings.put({ key: 'settings', value: { ...s, portraits } });
  });
}
