import type { Card } from 'ts-fsrs';
import type { Outcome } from './model';
import { isAcquired, isDue, isNew } from './scheduler';

/* ------------------------------------------------------------------ */
/* Corpus : format d'import (JSON) et modèle                           */
/* ------------------------------------------------------------------ */

export type VocabSource = 'corpus' | 'lecture' | 'dictee' | 'parent' | 'enfant';

/**
 * Types d'épreuves de reconnaissance (QCM). Le « sortilège personnel » (production libre)
 * n'est pas un QCM : il est validé par le parent.
 * sens = Le sens caché · situation = Le sortilège approprié · synonyme = Les mots alliés
 * antonyme = Le mot opposé · phrase = Le grimoire des phrases
 */
export type VocabQuestionType = 'sens' | 'situation' | 'synonyme' | 'antonyme' | 'phrase';

export const QUESTION_TITLES: Record<VocabQuestionType, string> = {
  sens: 'Le sens caché',
  situation: 'Le sortilège approprié',
  synonyme: 'Les mots alliés',
  antonyme: 'Le mot opposé',
  phrase: 'Le grimoire des phrases',
};

export interface VocabQuestion {
  /** Identifiant stable (unique dans le mot). */
  id: string;
  type: VocabQuestionType;
  prompt: string;
  /** La bonne réponse est TOUJOURS la première ; l'ordre est mélangé à l'affichage. */
  choices: string[];
  /** Courte explication montrée après la réponse. */
  explanation: string;
}

export interface VocabWord {
  /** Identifiant stable, ex. « perseverant ». */
  id: string;
  lemma: string;
  /** Catégorie grammaticale : nom, adjectif, verbe, adverbe… */
  pos: string;
  /** Définition en mots d'enfant de 8 ans. */
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  otherSenses?: string[];
  /** 1 facile · 2 moyen · 3 difficile */
  level: 1 | 2 | 3;
  /** Semaine du corpus (1 à 12). */
  week: number;
  /** Rang dans le corpus prioritaire (pipeline Manulex + Éduscol) : ordre d'introduction. */
  priorityRank?: number;
  sources: VocabSource[];
  questions: VocabQuestion[];
  /** Contenu vérifié par le parent : rien n'est montré à l'enfant avant. */
  status: 'pending' | 'validated';
  createdAt: number;
}

/** Fichier d'import : `{ "format": "academie-vocab", "version": 1, "words": [...] }`. */
export interface VocabCorpusFile {
  format: 'academie-vocab';
  version: 1;
  words: Omit<VocabWord, 'status' | 'createdAt'>[];
}

const QUESTION_TYPES: VocabQuestionType[] = ['sens', 'situation', 'synonyme', 'antonyme', 'phrase'];

/** Vérifie un fichier de corpus ; renvoie la liste des problèmes (vide si tout va bien). */
export function validateCorpus(data: unknown): string[] {
  const errors: string[] = [];
  const f = data as VocabCorpusFile;
  if (!f || f.format !== 'academie-vocab' || !Array.isArray(f.words)) return ['Ce fichier n’est pas un corpus de vocabulaire (format « academie-vocab »).'];
  const ids = new Set<string>();
  f.words.forEach((w, i) => {
    const at = `Mot ${i + 1}${w?.lemma ? ` (« ${w.lemma} »)` : ''}`;
    if (!w.id || !/^[a-z0-9-]+$/.test(w.id)) errors.push(`${at} : identifiant manquant ou invalide (lettres minuscules sans accent, chiffres, tirets).`);
    if (ids.has(w.id)) errors.push(`${at} : identifiant en double « ${w.id} ».`);
    ids.add(w.id);
    for (const k of ['lemma', 'pos', 'definition'] as const) if (!w[k]?.trim()) errors.push(`${at} : champ « ${k} » manquant.`);
    if (!Array.isArray(w.examples) || w.examples.length < 1) errors.push(`${at} : au moins un exemple.`);
    if (![1, 2, 3].includes(w.level)) errors.push(`${at} : niveau 1, 2 ou 3.`);
    if (!Number.isInteger(w.week) || w.week < 1) errors.push(`${at} : semaine invalide.`);
    if (!Array.isArray(w.questions) || w.questions.length < 2) errors.push(`${at} : au moins 2 questions.`);
    const qids = new Set<string>();
    (w.questions ?? []).forEach((q, j) => {
      const qat = `${at}, question ${j + 1}`;
      if (!q.id || qids.has(q.id)) errors.push(`${qat} : identifiant manquant ou en double.`);
      qids.add(q.id);
      if (!QUESTION_TYPES.includes(q.type)) errors.push(`${qat} : type inconnu « ${q.type} ».`);
      if (!q.prompt?.trim()) errors.push(`${qat} : énoncé manquant.`);
      if (!Array.isArray(q.choices) || q.choices.length !== 3) errors.push(`${qat} : exactement 3 propositions (la bonne en premier).`);
      else if (new Set(q.choices.map((c) => c.trim().toLowerCase())).size !== 3) errors.push(`${qat} : propositions en double.`);
      if (!q.explanation?.trim()) errors.push(`${qat} : explication manquante.`);
    });
  });
  return errors;
}

/* ------------------------------------------------------------------ */
/* Progression magique                                                 */
/* ------------------------------------------------------------------ */

export type VocabStage = 'mysterieux' | 'decouvert' | 'compris' | 'utilise' | 'maitrise';

export const STAGES: { id: VocabStage; label: string; icon: string }[] = [
  { id: 'mysterieux', label: 'Mot mystérieux', icon: '🔮' },
  { id: 'decouvert', label: 'Mot découvert', icon: '✨' },
  { id: 'compris', label: 'Mot compris', icon: '💡' },
  { id: 'utilise', label: 'Mot utilisé', icon: '✍️' },
  { id: 'maitrise', label: 'Mot maîtrisé', icon: '👑' },
];

/** Ce qu'on sait d'un mot pour l'enfant (calculé depuis les journaux, jamais saisi à la main). */
export interface VocabEvidence {
  discovered: boolean;
  /** Réponses de compréhension, dans l'ordre chronologique. */
  answers: { type: VocabQuestionType; outcome: Outcome; at: number; /** Stabilité de la carte juste avant la réponse. */ stabilityBefore?: number }[];
  /** Phrases personnelles validées par le parent (utilisation active). */
  validatedUses: number;
  /** Carte de compréhension (répétition espacée). */
  card?: Card;
}

/** Stabilité (jours) au-delà de laquelle un échec est un « échec différé ». */
const DELAYED_DAYS = 3;

export interface StageInfo {
  stage: VocabStage;
  /** Échec lors d'une révision différée : à consolider (sans punition). */
  toConsolidate: boolean;
}

/**
 * Étapes = progression pédagogique réelle :
 * - découvert : explication et exemple vus ;
 * - compris : sens retrouvé dans au moins 2 types d'épreuves différents, dernière réponse juste ;
 * - utilisé : au moins une phrase personnelle correcte (validée par le parent) ;
 * - maîtrisé : utilisé ET compréhension stable sur la durée (révisions espacées réussies).
 * Un QCM réussi ne suffit jamais pour « utilisé » ni « maîtrisé ».
 */
export function vocabStage(e: VocabEvidence, masteryDays: number): StageInfo {
  if (!e.discovered) return { stage: 'mysterieux', toConsolidate: false };
  const last = e.answers.at(-1);
  // Échec différé : le mot semblait ancré (plusieurs jours de stabilité) et a été oublié.
  const toConsolidate = !!last && last.outcome === 'fail' && (last.stabilityBefore ?? 0) >= DELAYED_DAYS;
  const okTypes = new Set(e.answers.filter((a) => a.outcome !== 'fail').map((a) => a.type));
  const understood = okTypes.size >= 2 && last?.outcome !== 'fail';
  if (!understood) return { stage: 'decouvert', toConsolidate };
  if (e.validatedUses < 1) return { stage: 'compris', toConsolidate };
  if (e.card && isAcquired(e.card, masteryDays)) return { stage: 'maitrise', toConsolidate };
  return { stage: 'utilise', toConsolidate };
}

/* ------------------------------------------------------------------ */
/* Quête du jour                                                        */
/* ------------------------------------------------------------------ */

export interface VocabCandidate {
  word: VocabWord;
  card?: Card;
  /** Dernière question posée pour ce mot (pour ne pas reposer la même). */
  lastQuestionId?: string;
  /** Mot compris, sans phrase personnelle validée ni en attente : prêt pour le « sortilège personnel ». */
  canProduce?: boolean;
}

export type QuestStep =
  | { kind: 'discover'; word: VocabWord }
  | { kind: 'question'; word: VocabWord; question: VocabQuestion; role: 'learn' | 'review' | 'challenge' }
  /** Le sortilège personnel : l'enfant écrit sa propre phrase avec le mot (validée ensuite par le parent). */
  | { kind: 'produce'; word: VocabWord };

export interface QuestOptions {
  newPerWeek: number;
  discoveredThisWeek: number;
  /** Au plus un nouveau mot par jour (5 par semaine, pas forcément un chaque jour). */
  discoveredToday?: number;
  /** Au-delà de ce nombre de révisions dues, pas de nouveau mot (consolidation d'abord). */
  maxDueForNew: number;
  maxReviews: number;
}

export const DEFAULT_QUEST: Omit<QuestOptions, 'newPerWeek' | 'discoveredThisWeek' | 'discoveredToday'> = { maxDueForNew: 4, maxReviews: 5 };

/** Choisit une question du mot, en évitant la précédente et en préférant certains types. */
export function chooseQuestion(word: VocabWord, prefer: VocabQuestionType[], lastId?: string, rng: () => number = Math.random): VocabQuestion | undefined {
  const pool = word.questions.filter((q) => q.id !== lastId);
  const candidates = pool.length ? pool : word.questions;
  const preferred = candidates.filter((q) => prefer.includes(q.type));
  const from = preferred.length ? preferred : candidates;
  return from[Math.floor(rng() * from.length)];
}

/**
 * Quête courte (3 à 5 minutes) avec une fin claire :
 * 1. révisions dues, les mots en cours d'apprentissage d'abord ;
 * 2. puis consolidation ;
 * 3. un nouveau mot au plus, si le quota hebdomadaire le permet et s'il n'y a pas trop de révisions ;
 * 4. un petit défi final sur un autre mot connu, si pertinent.
 * Jamais d'exercice ajouté artificiellement : si rien n'est dû, la quête peut être vide.
 */
export function planQuest(cands: VocabCandidate[], now: Date, opts: QuestOptions, rng: () => number = Math.random): QuestStep[] {
  const validated = cands.filter((c) => c.word.status === 'validated');
  const due = validated
    .filter((c) => c.card && !isNew(c.card) && isDue(c.card, now))
    // en apprentissage (faible stabilité) d'abord, puis les plus en retard
    .sort((a, b) => a.card!.stability - b.card!.stability || +new Date(a.card!.due) - +new Date(b.card!.due));

  const steps: QuestStep[] = [];
  for (const c of due.slice(0, opts.maxReviews)) {
    const learning = c.card!.stability < 7;
    const q = chooseQuestion(c.word, learning ? ['sens', 'situation'] : ['phrase', 'situation', 'synonyme', 'antonyme'], c.lastQuestionId, rng);
    if (q) steps.push({ kind: 'question', word: c.word, question: q, role: 'review' });
  }

  const canIntroduce = opts.discoveredThisWeek < opts.newPerWeek && (opts.discoveredToday ?? 0) === 0 && due.length <= opts.maxDueForNew;
  const order = (w: VocabWord) => w.priorityRank ?? w.week * 1000;
  const fresh = validated.filter((c) => !c.card).sort((a, b) => order(a.word) - order(b.word) || a.word.createdAt - b.word.createdAt)[0];
  if (canIntroduce && fresh) {
    const q = chooseQuestion(fresh.word, ['sens'], undefined, rng);
    steps.push({ kind: 'discover', word: fresh.word });
    if (q) steps.push({ kind: 'question', word: fresh.word, question: q, role: 'learn' });
  }

  // Sortilège personnel : un mot compris, au plus un par quête (production active, pas de la reconnaissance).
  const producer = validated.find((c) => c.canProduce && !steps.some((s) => s.word.id === c.word.id));
  if (producer) steps.push({ kind: 'produce', word: producer.word });

  // Défi final : un mot déjà découvert, pas encore vu dans cette quête, avec une épreuve en contexte.
  const used = new Set(steps.map((s) => s.word.id));
  const known = validated.filter((c) => c.card && !isNew(c.card) && !used.has(c.word.id));
  if (steps.length > 0 && steps.length < 6 && known.length) {
    const c = known[Math.floor(rng() * known.length)];
    const q = chooseQuestion(c.word, ['phrase', 'situation'], c.lastQuestionId, rng);
    if (q && (q.type === 'phrase' || q.type === 'situation')) steps.push({ kind: 'question', word: c.word, question: q, role: 'challenge' });
  }
  return steps;
}

/** Lundi 0 h de la semaine de `now`. */
export function startOfWeek(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/* ------------------------------------------------------------------ */
/* Sortilège personnel                                                 */
/* ------------------------------------------------------------------ */

function plainText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').toLowerCase();
}

/** Radical tolérant aux accords et conjugaisons (« anxieux » → « anxieu », « exaspérer » → « exasper »). */
export function wordStem(lemma: string): string {
  const p = plainText(lemma);
  for (const end of ['er', 'ir', 're', 'eux', 'if', 'al', 'e', 's', 'x']) if (p.endsWith(end) && p.length - end.length >= 4) return p.slice(0, -end.length);
  return p;
}

export type ProductionCheck = { ok: true } | { ok: false; message: string };

/**
 * Vérifications simples AVANT l'envoi au parent (aucune correction automatique du sens :
 * c'est le parent qui juge si le mot est bien utilisé).
 */
export function checkProduction(text: string, word: VocabWord): ProductionCheck {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 4) return { ok: false, message: 'Écris une vraie phrase, avec au moins quatre mots.' };
  if (!plainText(t).includes(wordStem(word.lemma))) return { ok: false, message: `N’oublie pas d’utiliser le mot « ${word.lemma} » dans ta phrase.` };
  const norm = (s: string) => plainText(s).replace(/[^a-z0-9]+/g, ' ').trim();
  if (word.examples.some((e) => norm(e) === norm(t))) return { ok: false, message: 'Invente ta propre phrase, différente des exemples !' };
  return { ok: true };
}
