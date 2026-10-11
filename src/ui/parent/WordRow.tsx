import { type FocusEvent, useState } from 'react';
import { deleteWord, setWordAudio, updateWord } from '../../db/repo';
import type { Word } from '../../domain/model';
import { cleanWord } from '../../domain/parseList';
import { playWord, useSettings } from '../hooks';
import { Recorder } from './Recorder';

export function WordRow({ word }: { word: Word }) {
  const settings = useSettings();
  const [playing, setPlaying] = useState(false);

  async function listen() {
    if (!settings) return;
    setPlaying(true);
    try {
      await playWord(word, settings);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPlaying(false);
    }
  }

  const save = (field: 'hint') => (e: FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim().replace(/'/g, '’');
    if (v !== (word[field] ?? '')) updateWord(word.id, { [field]: v || undefined });
  };

  return (
    <div className="word-row">
      <input
        defaultValue={word.text}
        aria-label="Mot"
        style={{ fontWeight: 700 }}
        onBlur={(e) => {
          const v = cleanWord(e.target.value);
          if (v && v !== word.text) updateWord(word.id, { text: v });
          else e.target.value = word.text;
        }}
      />
      <input defaultValue={word.hint ?? ''} placeholder="(optionnel)" aria-label="Indice" onBlur={save('hint')} />
      <div className="row" style={{ gap: '0.35rem', flexWrap: 'nowrap' }}>
        <button className="small" onClick={listen} disabled={playing} title={word.audioId ? 'Écouter (votre voix)' : 'Écouter (synthèse)'}>
          {word.audioId ? '🎙️' : '🔊'}
        </button>
        <Recorder hasAudio={!!word.audioId} onSave={(blob) => setWordAudio(word.id, blob)} onClear={() => setWordAudio(word.id, null)} />
        <button
          className="small danger"
          title="Supprimer"
          aria-label={`Supprimer ${word.text}`}
          onClick={() => confirm(`Supprimer « ${word.text} » ?`) && deleteWord(word.id)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
