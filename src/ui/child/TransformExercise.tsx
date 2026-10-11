import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { SentenceTask } from '../../db/sessionRepo';
import { guidedQuestions, remainingErrorsText } from '../../domain/guidance';
import type { Settings } from '../../domain/model';
import {
  type SentenceRun,
  acceptSentenceHint,
  declineSentenceHint,
  showGuidedQuestions,
  startSentenceRun,
  startSentenceTyping,
  submitSentence,
} from '../../domain/sentenceRun';
import { frTypo } from '../../domain/typo';
import { playOopsSound } from '../../speech/sfx';
import { AccentBar } from '../components/AccentBar';
import { Elsa } from '../components/Elsa';

/**
 * Transformation (spec 5.2 d) : réécrire une phrase au pluriel, au féminin ou à un autre temps.
 * Même déroulé que la dictée après la relecture : « il reste X erreurs », indice, puis correction de mémoire.
 */
export function TransformExercise({ task, settings, onDone }: { task: SentenceTask; settings: Settings; onDone: (run: SentenceRun) => void }) {
  const t = task.sentence.transform!;
  const [run, setRun] = useState<SentenceRun>(() => ({ ...startSentenceRun(t.target, t.notionIds, task.level), phase: 'proof2' }));
  const [text, setText] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [oops, setOops] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const questions = useMemo(() => guidedQuestions(t.notionIds), [t]);

  useEffect(() => {
    if (run.phase === 'done') onDone(run);
    if (run.phase !== 'hintOffer') ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.phase]);

  function validate(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const next = submitSentence(run, text);
    if (next.phase !== 'done') playOopsSound(settings.muted);
    if (next.phase === 'retry' || next.phase === 'hintOffer') setOops(true);
    if (next.phase === 'correction') setText('');
    setQIndex(0);
    setRun(next);
  }

  function onType(v: string) {
    if (run.phase === 'correction' && run.revealCorrect && v.length > 0) setRun(startSentenceTyping(run));
    if (v.length > text.length) setOops(false);
    setText(v);
  }

  const guided = run.phase === 'retry' && showGuidedQuestions(run);

  return (
    <div className="exercise">
      <aside className="exercise-side">
        <Elsa expression={oops ? 'grimace' : 'concentree'} line={run.phase === 'hintOffer' ? 'Tu veux un indice ?' : undefined} />
      </aside>
      <section className="exercise-main">
        <p className="instruction">🪄 Transformation</p>
        <div className="source-sentence">{task.sentence.text}</div>
        <p className="question-prompt" style={{ textAlign: 'center' }}>
          {frTypo(t.instruction)}
        </p>
        {run.phase === 'retry' && <p className="hunt-count">{frTypo(`${remainingErrorsText(run.remaining)} Relis ta phrase.`)}</p>}
        {run.phase === 'correction' && (
          <div className="model-sentence" aria-live="polite">
            {run.revealCorrect ? t.target : <span className="model-hidden">✦ ✦ ✦</span>}
          </div>
        )}
        {run.phase === 'correction' && <p className="instruction">{run.revealCorrect ? 'Regarde bien :' : 'Écris-la de mémoire.'}</p>}
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
            <button className="primary big" onClick={() => (setOops(false), setRun(acceptSentenceHint(run)))}>
              Oui
            </button>
            <button className="big" onClick={() => (setOops(false), setText(''), setRun(declineSentenceHint(run)))}>
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
              aria-label="Ta phrase transformée"
            />
            <AccentBar inputRef={ref} value={text} onChange={onType} />
            <button type="submit" className="primary big" disabled={!text.trim()}>
              Valider
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
