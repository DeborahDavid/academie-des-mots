import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { mergeSettings } from '../db/repo';
import type { Settings, Word } from '../domain/model';
import { playBlob, speakDictation } from '../speech/tts';

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => mergeSettings((await db.settings.get('settings'))?.value), []);
}

/** Dicte un mot : enregistrement du parent s'il existe, sinon synthèse vocale. */
export async function playWord(word: Word, settings: Settings): Promise<void> {
  if (word.audioId) {
    const clip = await db.audio.get(word.audioId);
    if (clip) return playBlob(clip.blob);
  }
  return speakDictation(word.text, word.context, { voiceURI: settings.voiceURI, rate: settings.speechRate });
}
