import { useMemo, useState } from 'react';
import type { Sentence, Settings } from '../../domain/model';
import { shuffle } from '../../domain/session';
import { tokenize } from '../../domain/sentenceCheck';
import { frTypo } from '../../domain/typo';
import { playOopsSound, playSuccessChime } from '../../speech/sfx';
import { Elsa } from '../components/Elsa';
import { Icon } from '../components/Icon';

/** Justification (spec 5.2 c) : après une phrase, Leyu choisit pourquoi un mot s'écrit ainsi. */
export function JustifyExercise({ sentence, settings, onDone }: { sentence: Sentence; settings: Settings; onDone: (answer: string, correct: boolean) => void }) {
  const why = sentence.why!;
  const choices = useMemo(() => shuffle(why.choices.map((text, i) => ({ text, correct: i === 0 }))), [why]);
  const [picked, setPicked] = useState<number | null>(null);
  const tokens = tokenize(sentence.text);
  const target = tokens.indexOf(why.word);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    (choices[i].correct ? playSuccessChime : playOopsSound)(settings.muted);
  }

  return (
    <div className="exercise">
      <aside className="exercise-side">
        {picked !== null && <Elsa expression={choices[picked].correct ? 'fiere' : 'contente'} line={choices[picked].correct ? 'Exactement !' : 'Regarde la bonne raison.'} />}
      </aside>
      <section className="exercise-main">
        <p className="instruction"><Icon name="bulb" size={22} className="icon-inline" />Pourquoi ?</p>
        <p className="why-sentence">
          {tokens.map((t, i) => (
            <span key={i} className={i === target ? 'why-word' : /\p{L}/u.test(t) ? '' : 'tight-punct'}>
              {t}{' '}
            </span>
          ))}
        </p>
        <p className="question-prompt" style={{ textAlign: 'center' }}>
          {frTypo(`Pourquoi écrit-on « ${why.word} » comme ça ?`)}
        </p>
        <div className="choices long" style={{ width: 'min(720px, 100%)' }}>
          {choices.map((c, i) => {
            const state = picked === null ? '' : c.correct ? 'right' : picked === i ? 'wrong' : 'dim';
            return (
              <button key={c.text} className={`choice ${state}`} onClick={() => pick(i)} disabled={picked !== null}>
                {c.text}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <button className="primary big" onClick={() => onDone(choices[picked].text, choices[picked].correct)} autoFocus>
            Continuer
          </button>
        )}
      </section>
    </div>
  );
}
