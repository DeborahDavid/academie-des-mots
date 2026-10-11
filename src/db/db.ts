import Dexie, { type Table } from 'dexie';
import type { AudioClip, DayRecord, ImageAsset, Item, Notion, ReviewLog, Sentence, Settings, Week, Word } from '../domain/model';

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
  days!: Table<DayRecord, string>;
  images!: Table<ImageAsset, string>;

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
    this.version(2).stores({ days: 'date' });
    this.version(3).stores({ reviewLogs: '++id, itemId, sessionId, at, kind' });
    this.version(4).stores({ images: 'id' });
  }
}

export const db = new AcademieDB();

export const ALL_TABLES = ['weeks', 'words', 'items', 'reviewLogs', 'notions', 'sentences', 'settings', 'audio', 'days', 'images'] as const;
export type TableName = (typeof ALL_TABLES)[number];
