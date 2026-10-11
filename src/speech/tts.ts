/** Synthèse vocale fr-FR (Web Speech API). */

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Les voix arrivent de façon asynchrone sur Chrome : on attend `voiceschanged` (max 1,5 s). */
export async function listFrenchVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return [];
  const pick = () => speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('fr'));
  let voices = pick();
  if (voices.length) return sortVoices(voices);
  await new Promise<void>((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener('voiceschanged', done);
      resolve();
    };
    speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, 1500);
  });
  voices = pick();
  return sortVoices(voices);
}

/**
 * fr-FR d'abord, puis voix locales (les voix « en ligne » envoient le texte à un serveur),
 * puis voix « premium / améliorées ».
 */
function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase().replace('_', '-') === 'fr-fr' ? 0 : 10) +
    (v.localService ? 0 : 5) +
    (/premium|enhanced|amélior|natural/i.test(v.name) ? 0 : 2) +
    (/amélie|thomas|audrey|aurélie|marie/i.test(v.name) ? 0 : 1) +
    // Voix « fantaisie » de macOS : peu adaptées à une dictée.
    (/grandma|grandpa|rocko|bubbles|bahh|bells|boing|jester|organ|trinoids|whisper|zarvox/i.test(v.name) ? 4 : 0);
  return [...voices].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
}

export async function resolveVoice(voiceURI?: string): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await listFrenchVoices();
  return voices.find((v) => v.voiceURI === voiceURI) ?? voices[0];
}

export interface SpeakOptions {
  voiceURI?: string;
  rate?: number;
}

export const NO_FRENCH_VOICE = 'Aucune voix française dans ce navigateur. Ouvrez l’application dans Safari ou Chrome.';

export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!ttsSupported()) throw new Error('La synthèse vocale n’est pas disponible dans ce navigateur.');
  speechSynthesis.cancel();
  const voice = await resolveVoice(opts.voiceURI);
  // Sans voix française, le navigateur lirait le français avec une voix anglaise : on refuse.
  if (!voice) throw new Error(NO_FRENCH_VOICE);
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = opts.rate ?? 0.85;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error(e.error)));
    speechSynthesis.speak(u);
  });
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Dictée d'un mot : phrase de contexte, courte pause, puis le mot isolé. */
export async function speakDictation(word: string, context: string | undefined, opts: SpeakOptions = {}): Promise<void> {
  if (context) {
    await speak(context, opts);
    await pause(600);
  }
  await speak(word, opts);
}

export function stopSpeaking() {
  if (ttsSupported()) speechSynthesis.cancel();
}

/** Lecture d'un enregistrement audio (voix du parent). */
export function playBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Lecture audio impossible'));
    };
    audio.play().catch(reject);
  });
}
