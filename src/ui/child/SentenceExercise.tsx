import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Settings } from '../../domain/model';
import { guidedQuestions, proofTwoPrompt, remainingErrorsText } from '../../domain/guidance';
import { OOPS_LINES, randomLine } from '../../domain/lines';
import {
  type SentenceRun,
  acceptSentenceHint,
  declineSentenceHint,
  finishProof1,
  finishWriting,
  showGuidedQuestions,
  startSentenceRun,
  startSentenceTyping,
  submitSentence,
} from '../../domain/sentenceRun';
import { frTypo } from '../../domain/typo';
import { playOopsSound } from '../../speech/sfx';
import { speak, speakSlowly, stopSpeaking } from '../../speech/tts';
import { AccentBar } from '../components/AccentBar';
import { Elsa } from '../components/Elsa';
import type { SentenceTask } from '../../db/sessionRepo';
import { Icon } from '../components/Icon';

/**
 * Dictée de phrase : écriture, puis deux relectures obligatoires (orthographe, puis accords),
 * puis validation. En cas d'erreur, seulement « Il reste X erreur(s) » : jamais l'endroit.
 */
export function SentenceExercise({ task, settings, onDone }: { task: SentenceTask; settings: Settings; onDone: (run: SentenceRun) => void }) {
  const { sentence, level } = task;
  const [run, setRun] = useState<SentenceRun>(() => startSentenceRun(sentence.text, sentence.notionIds, level));
  const [text, setText] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [oops, setOops] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const questions = useMemo(() => guidedQuestions(sentence.notionIds), [sentence]);
  const opts = { voiceURI: settings.voiceURI, rate: settings.speechRate };

  const listen = () => speak(sentence.text, opts).catch(() => {});
  const listenSlowly = () => speakSlowly(sentence.text, opts).catch(() => {});

  useEffect(() => {
    listen();
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (run.phase === 'done') onDone(run);
    if (run.phase !== 'hintOffer') ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.phase]);

  function validate(e?: FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    const next = submitSentence(run, text);
    if (next.phase === 'retry' || next.phase === 'hintOffer') {
      setOops(randomLine(OOPS_LINES));
      playOopsSound(settings.muted);
    }
    if (next.phase === 'correction' && run.phase !== 'correction') {
      // On efface sa phrase : la forme correcte va s'afficher, à retaper de mémoire.
      setText('');
      playOopsSound(settings.muted);
    }
    if (run.phase === 'correction' && next.phase === 'correction') setText('');
    setQIndex(0);
    setRun(next);
  }

  function onType(v: string) {
    if (run.phase === 'correction' && run.revealCorrect && v.length > 0) setRun(startSentenceTyping(run));
    if (v.length > text.length) setOops(null);
    setText(v);
  }

  const instruction = {
    write: 'Écris la phrase que tu entends.',
    proof1: 'Passe 1 : relis ton orthographe, mot par mot.',
    proof2: `Passe 2 : ${proofTwoPrompt(level)}`,
    retry: `${remainingErrorsText(run.remaining)} Relis encore ta phrase.`,
    hintOffer: '',
    correction: run.revealCorrect ? 'Pas encore. Regarde bien la phrase :' : 'Écris-la de mémoire.',
    done: '',
  }[run.phase];

  const guided = (run.phase === 'proof2' && level === 1) || (run.phase === 'retry' && showGuidedQuestions(run));

  return (
    <div className="exercise">
      <aside className="exercise-side">
        <Elsa expression={oops ? 'grimace' : 'concentree'} line={run.phase === 'hintOffer' ? 'Tu veux un indice ?' : oops ?? undefined} />
      </aside>
      <section className="exercise-main">
        <p className="instruction">{frTypo(instruction)}</p>

        {run.phase === 'correction' && (
          <div className="model-sentence" aria-live="polite">
            {run.revealCorrect ? sentence.text : <span className="model-hidden">✦ ✦ ✦</span>}
          </div>
        )}

        {guided && (
          <div className="hint-box guided">
            <strong>{frTypo(`Question ${qIndex + 1} / ${questions.length} :`)}</strong> {frTypo(questions[qIndex])}
            {qIndex < questions.length - 1 && (
              <div>
                <button type="button" className="small" onClick={() => setQIndex((i) => i + 1)}>
                  Question suivante
                </button>
              </div>
            )}
          </div>
        )}

        {run.phase === 'hintOffer' ? (
          <div className="row center">
            <button className="primary big" onClick={() => (setOops(null), setRun(acceptSentenceHint(run)))}>
              Oui
            </button>
            <button className="big" onClick={() => (setOops(null), setText(''), setRun(declineSentenceHint(run)))}>
              Non
            </button>
          </div>
        ) : (
          <form className="answer-form" onSubmit={validate}>
            <textarea
              ref={ref}
              className="answer-input sentence-input"
              rows={3}
              value={text}
              onChange={(e) => onType(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Ta phrase"
            />
            <AccentBar inputRef={ref} value={text} onChange={onType} />
            <div className="row center">
              {(run.phase === 'write' || run.phase === 'proof1' || run.phase === 'proof2' || run.phase === 'retry') && (
                <>
                  <button type="button" className="big" onClick={listen}>
                    <Icon name="speaker" size={22} className="icon-inline" />Réécouter
                  </button>
                  <button type="button" className="big" onClick={listenSlowly}>
                    <Icon name="turtle" size={22} className="icon-inline" />Lentement
                  </button>
                </>
              )}
              {run.phase === 'write' && (
                <button type="button" className="primary big" disabled={!text.trim()} onClick={() => setRun(finishWriting(run))}>
                  J’ai fini d’écrire
                </button>
              )}
              {run.phase === 'proof1' && (
                <button type="button" className="primary big" onClick={() => setRun(finishProof1(run))}>
                  J’ai relu l’orthographe
                </button>
              )}
              {(run.phase === 'proof2' || run.phase === 'retry' || run.phase === 'correction') && (
                <button type="submit" className="primary big" disabled={!text.trim()}>
                  Valider
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
