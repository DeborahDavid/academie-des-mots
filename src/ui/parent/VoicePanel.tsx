import { useEffect, useState } from 'react';
import { updateSettings } from '../../db/repo';
import { listFrenchVoices, speakDictation, ttsSupported } from '../../speech/tts';
import { useSettings } from '../hooks';

/** Étape 0 : vérifier la voix fr-FR sur l'appareil de Leyu. */
export function VoicePanel() {
  const settings = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);
  const [word, setWord] = useState('forêt');
  const [error, setError] = useState('');

  useEffect(() => {
    listFrenchVoices().then(setVoices);
  }, []);

  if (!settings) return null;
  if (!ttsSupported()) return <p className="warn">Ce navigateur ne propose pas de synthèse vocale. Utilisez Safari ou Chrome.</p>;

  const selected = voices?.find((v) => v.voiceURI === settings.voiceURI) ?? voices?.[0];

  async function test() {
    setError('');
    try {
      await speakDictation(word, { voiceURI: selected?.voiceURI, rate: settings!.speechRate });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Tester la dictée</h2>
        {voices && (
          <p className={selected ? 'ok' : 'warn'}>
            {selected ? `Voix utilisée : ${selected.name} (${selected.lang})` : 'Aucune voix française dans ce navigateur : ouvrez l’application dans Safari ou Chrome.'}
          </p>
        )}
        <div className="row">
          <div style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="v-word">Mot</label>
            <input id="v-word" style={{ width: '100%' }} value={word} onChange={(e) => setWord(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <button className="primary" onClick={test}>
            🔊 Écouter
          </button>
          <label htmlFor="v-rate" style={{ margin: 0 }}>
            Vitesse : {settings.speechRate.toFixed(2)}
          </label>
          <input
            id="v-rate"
            type="range"
            min={0.6}
            max={1.1}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })}
            style={{ background: 'transparent' }}
          />
        </div>
        {error && <p className="warn">Erreur : {error}</p>}
      </section>

      <section className="card stack">
        <h2>Voix françaises disponibles</h2>
        {voices === null && <p className="muted">Recherche des voix…</p>}
        {voices?.length === 0 && <p className="warn">Aucune voix française trouvée sur cet appareil.</p>}
        <div className="voice-list">
          {voices?.map((v) => (
            <label key={v.voiceURI}>
              <input
                type="radio"
                name="voice"
                checked={selected?.voiceURI === v.voiceURI}
                onChange={() => updateSettings({ voiceURI: v.voiceURI })}
                style={{ minHeight: 0, width: 20, height: 20 }}
              />
              {v.name} <span className="muted small-text">({v.lang}{v.localService ? '' : ' · en ligne'})</span>
            </label>
          ))}
        </div>
        <div className="notice small-text">
          <strong>Recommandé : Chrome avec la voix « Google français ».</strong> C’est la voix la plus naturelle sur Mac ; les voix
          intégrées à macOS ont souvent un accent étranger. Safari ne propose pas cette voix.
          <br />
          Les voix « en ligne » envoient seulement le texte lu (mots et phrases de la dictée) à Google, aucune donnée sur Leyu.
          <br />
          Vous pouvez aussi enregistrer votre propre voix pour chaque mot (bouton ⏺ dans les listes) : elle est alors utilisée à la place.
        </div>
      </section>
    </div>
  );
}
