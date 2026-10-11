import Dexie, { type Table } from 'dexie';
import type { AudioClip, Item, Notion, ReviewLog, Sentence, Settings, Week, Word } from '../domain/model';

export interface SettingsRow {
  key: 'settings';
  value: Settings;
}

export class AcademieDB extends Dexie {
  weeks!: Table<Week, string>;
  words!: Table<Word, string>;
  items!: Table<Item, string>;
  reviewLogs!: Table<ReviewLog, number>;
  notions!: Table<Notion, string>;
  sentences!: Table<Sentence, string>;
  settings!: Table<SettingsRow, string>;
  audio!: Table<AudioClip, string>;

  constructor(name = 'academie-des-mots') {
    super(name);
    this.version(1).stores({
      weeks: 'id, startDate',
      words: 'id, weekId',
      items: 'id, kind, refId, card.due',
      reviewLogs: '++id, itemId, sessionId, at',
      notions: 'id, order',
      sentences: 'id, status',
      settings: 'key',
      audio: 'id',
    });
  }
}

export const db = new AcademieDB();

export const ALL_TABLES = ['weeks', 'words', 'items', 'reviewLogs', 'notions', 'sentences', 'settings', 'audio'] as const;
export type TableName = (typeof ALL_TABLES)[number];
