import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Settings, Word } from '../../domain/model';
import { autoHint } from '../../domain/hints';
import { OOPS_LINES, randomLine } from '../../domain/lines';
import { type WordRun, acceptHint, declineHint, startTyping, startWordRun, submitWord } from '../../domain/wordRun';
import { stopSpeaking } from '../../speech/tts';
import { AccentBar } from '../components/AccentBar';
import { Elsa } from '../components/Elsa';
import { playWord } from '../hooks';

interface Props {
  word: Word;
  itemId: string;
  presentation: number;
  failures: number;
  settings: Settings;
  onDone: (run: WordRun) => void;
}

/** Dictée d'un mot. Écran sobre, aucun mouvement. La réponse fautive n'est jamais réaffichée. */
export function WordExercise({ word, itemId, presentation, failures, settings, onDone }: Props) {
  const [run, setRun] = useState<WordRun>(() => startWordRun(itemId, word.text, presentation, failures));
  const [value, setValue] = useState('');
  const [oops, setOops] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hint = useMemo(() => word.hint || autoHint(word.text), [word]);

  const [voiceError, setVoiceError] = useState('');
  const listen = () =>
    playWord(word, settings)
      .then(() => setVoiceError(''))
      .catch((e: Error) => setVoiceError(e.message));

  useEffect(() => {
    listen();
    inputRef.current?.focus();
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (run.phase === 'done') onDone(run);
    if (run.phase === 'answer' || run.phase === 'correction') inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.phase]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!value.trim()) return;
    const next = submitWord(run, value);
    // On efface toujours la saisie : une forme fautive ne reste jamais à l'écran.
    setValue('');
    if (run.phase === 'answer' && next.phase !== 'done') setOops(randomLine(OOPS_LINES));
    if (run.phase === 'correction' && next.phase === 'correction') setOops('Regarde encore une fois.');
    setRun(next);
  }

  function onType(v: string) {
    if (run.phase === 'correction' && run.revealCorrect && v.length > 0) setRun(startTyping(run));
    // Elsa se tait dès que Leyu écrit.
    if (v.length > 0) setOops(null);
    setValue(v);
  }

  function takeHint() {
    setOops(null);
    setRun(acceptHint(run));
    listen();
  }

  const showInput = run.phase === 'answer' || run.phase === 'correction';

  return (
    <div className="exercise">
      <aside className="exercise-side">
        <Elsa expression={oops ? 'grimace' : 'concentree'} line={run.phase === 'hintOffer' ? 'Tu veux un indice ?' : oops ?? undefined} />
      </aside>

      <section className="exercise-main">
        <p className="instruction">{run.phase === 'correction' ? (run.revealCorrect ? 'Pas encore. Regarde :' : 'Écris-le de mémoire.') : 'Écris le mot que tu entends.'}</p>

        {voiceError && <div className="hint-box">La voix ne marche pas : demande à un parent. ({voiceError})</div>}

        {run.phase === 'correction' && (
          <div className="model-word" aria-live="polite">
            {run.revealCorrect ? word.text : <span className="model-hidden">✦ ✦ ✦</span>}
          </div>
        )}

        {run.phase === 'answer' && run.hintUsed && (
          <div className="hint-box">
            <strong>Indice :</strong> {hint}
          </div>
        )}

        {run.phase === 'hintOffer' && (
          <div className="row center">
            <button className="primary big" onClick={takeHint}>
              Oui
            </button>
            <button className="big" onClick={() => (setOops(null), setRun(declineHint(run)))}>
              Non
            </button>
          </div>
        )}

        {showInput && (
          <form onSubmit={submit} className="answer-form">
            <input
              ref={inputRef}
              autoFocus
              className="answer-input"
              value={value}
              onChange={(e) => onType(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Ta réponse"
            />
            <AccentBar inputRef={inputRef} value={value} onChange={onType} />
            <div className="row center">
              {run.phase === 'answer' && (
                <button type="button" className="big" onClick={listen}>
                  🔊 Réécouter
                </button>
              )}
              <button type="submit" className="primary big" disabled={!value.trim()}>
                Valider
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
