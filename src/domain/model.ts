import type { Card } from 'ts-fsrs';

/** Niveaux de couleur de la méthode Retz. */
export type Level = 'jaune' | 'vert' | 'violet';
export const LEVELS: Level[] = ['jaune', 'vert', 'violet'];

/** Une liste de dictée hebdomadaire. */
export interface Week {
  id: string;
  label: string;
  /** Date de début de semaine, AAAA-MM-JJ. */
  startDate: string;
  createdAt: number;
}

/** Un mot de la dictée. */
export interface Word {
  id: string;
  weekId: string;
  text: string;
  level: Level;
  /** Ancien champ (phrase de contexte) : n’est plus lu. */
  context?: string;
  /** Indice personnalisé du parent (jamais de forme incorrecte). */
  hint?: string;
  /** Enregistrement de la voix du parent (table `audio`). */
  audioId?: string;
  createdAt: number;
}

export type ItemKind = 'word' | 'notion' | 'vocab';

/** Tout ce qui est planifié par la répétition espacée. */
export interface Item {
  /** `${kind}:${refId}` */
  id: string;
  kind: ItemKind;
  refId: string;
  card: Card;
  createdAt: number;
  /** Date de la 1re révision (limite de nouveaux mots par jour). */
  introducedAt?: number;
}

export type Outcome = 'success' | 'success_hint' | 'fail';
export type ErrorType = 'accent' | 'spelling' | 'agreement';

/** Une présentation d'un item. Seule la 1re présentation de la séance compte pour FSRS. */
export interface ReviewLog {
  id?: number;
  itemId: string;
  kind: ItemKind;
  sessionId: string;
  at: number;
  /** 1 = première présentation dans la séance. */
  presentation: number;
  /** Cette présentation a replanifié l'item (FSRS). */
  scheduled: boolean;
  outcome: Outcome;
  errorTypes: ErrorType[];
  /** Notions concernées par une erreur d'accord. */
  notionIds?: string[];
  /** Phrase dictée (items de type notion). */
  sentenceId?: string;
  /** Vocabulaire : question posée, type d'épreuve, réponse choisie, stabilité avant la réponse. */
  questionId?: string;
  questionType?: string;
  answerGiven?: string;
  stabilityBefore?: number;
}

/** Phrase personnelle écrite par l'enfant avec un mot (« sortilège personnel »), validée par le parent. */
export interface VocabProduction {
  id: string;
  wordId: string;
  text: string;
  status: ValidationStatus;
  createdAt: number;
  reviewedAt?: number;
}

export type NotionStatus = 'seen' | 'not_yet';
export type GuidanceLevel = 1 | 2 | 3;

export interface Notion {
  id: string;
  group: string;
  label: string;
  status: NotionStatus;
  guidanceLevel: GuidanceLevel;
  /** Séances consécutives sans erreur d'accord sur la notion. */
  streakOk: number;
  /** Séances consécutives avec échec. */
  streakFail: number;
  masteredAt?: number;
  /** Forme de constellation attribuée à la maîtrise. */
  constellation?: string;
  order: number;
}

export type ValidationStatus = 'pending' | 'validated' | 'rejected';

/** Phrase pour la dictée de phrase / chasse aux erreurs. Jamais montrée sans validation. */
export interface Sentence {
  id: string;
  text: string;
  notionIds: string[];
  source: 'seed' | 'parent' | 'llm';
  status: ValidationStatus;
  createdAt: number;
}

/** Une journée de jeu : flamme et points. */
export interface DayRecord {
  /** AAAA-MM-JJ (date locale). */
  date: string;
  /** Séance du jour terminée → la flamme du jour est allumée. */
  dailyDoneAt?: number;
  sessions: number;
  points: number;
}

/** Image importée par le parent (portraits). Reste dans le navigateur, jamais dans le code. */
export interface ImageAsset {
  id: string;
  blob: Blob;
  mime: string;
}

export type CharacterId = 'leyu' | 'elsa';

/** Emplacements d'illustration : visages (ronds) et grandes cases (format libre). */
export type ArtSlot = 'leyu' | 'leyu-grimace' | 'leyu-pied' | 'elsa' | 'elsa-buste';

export interface AudioClip {
  id: string;
  blob: Blob;
  mime: string;
}

export interface Jersey {
  shirt: string;
  shorts: string;
  text: string;
  name: string;
  number: number;
}

export interface Thresholds {
  /** Stabilité FSRS (jours) à partir de laquelle un mot est « acquis ». */
  acquiredStabilityDays: number;
  /** Nouveaux mots introduits au maximum par jour. */
  newWordsPerDay: number;
  hatWords: number;
  sneakersWords: number;
  crownWords: number;
  title2Words: number;
  title2Notions: number;
}

export interface Settings {
  pinHash?: string;
  pinSalt?: string;
  /** 0 = nouvelle lune … 4 = pleine lune … 7 = dernier croissant. */
  moonPhase: number;
  voiceURI?: string;
  speechRate: number;
  muted: boolean;
  jersey: Jersey;
  titles: [string, string, string];
  thresholds: Thresholds;
  /** Formes des constellations, dans l'ordre d'attribution. */
  constellations: string[];
  /** Garde-robe : récompenses gagnées (définitivement) et tenue portée. */
  wardrobe?: { unlocked: Record<string, number>; worn: string[] };
  /** Portraits importés (id d'image), à la place des dessins par défaut. */
  portraits?: Partial<Record<ArtSlot, string>>;
  /** L'Exploratrice des mots. */
  vocab?: { newPerWeek: number; exampleSeeded?: boolean; seededBatches?: number[] };
  /** Version de la banque de phrases déjà proposée au parent. */
  seedSentencesVersion?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  moonPhase: 0,
  speechRate: 0.85,
  muted: false,
  jersey: { shirt: '#2ec4d6', shorts: '#1b2a5c', text: '#ffffff', name: 'LEYU', number: 11 },
  titles: ['Titre 1', 'Titre 2', 'Titre 3'],
  thresholds: {
    acquiredStabilityDays: 21,
    newWordsPerDay: 4,
    hatWords: 25,
    sneakersWords: 50,
    crownWords: 100,
    title2Words: 50,
    title2Notions: 2,
  },
  constellations: ['poulet', 'chat', 'ballon de foot'],
};

export function itemId(kind: ItemKind, refId: string): string {
  return `${kind}:${refId}`;
}

export function newId(): string {
  return crypto.randomUUID();
}
