import { useEffect, useRef, useState } from 'react';
import { type WordTask, planWordTasks, recordPresentation } from '../../db/sessionRepo';
import { AFTER_FAIL_LINES, END_LINES, randomLine, successLine } from '../../domain/lines';
import { newId } from '../../domain/model';
import { requeue } from '../../domain/session';
import { type WordRun, shouldRequeue } from '../../domain/wordRun';
import { Elsa, type ElsaExpression } from '../components/Elsa';
import { useSettings } from '../hooks';
import { WordExercise } from './WordExercise';

interface Task {
  key: string;
  word: WordTask;
  presentation: number;
  failures: number;
}

interface Transition {
  expression: ElsaExpression;
  line: string;
  star: boolean;
  ada: boolean;
}

interface Summary {
  firstTry: number;
  withHint: number;
  toReview: number;
  stars: number;
}

/** Durée d'une transition entre deux exercices (passable d'un tap). */
const TRANSITION_MS = 1600;

export function Session({ onExit }: { onExit: () => void }) {
  const settings = useSettings();
  const sessionId = useRef(newId()).current;
  const [queue, setQueue] = useState<Task[] | null>(null);
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [summary, setSummary] = useState<Summary>({ firstTry: 0, withHint: 0, toReview: 0, stars: 0 });

  useEffect(() => {
    planWordTasks().then((tasks) => setQueue(tasks.map((t) => ({ key: `${t.item.id}#1`, word: t, presentation: 1, failures: 0 }))));
  }, []);

  useEffect(() => {
    if (!transition) return;
    const t = setTimeout(next, TRANSITION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition]);

  if (!settings || !queue) return null;

  const finished = index >= queue.length;
  const task = queue[index];

  async function handleDone(run: WordRun) {
    const outcome = run.outcome!;
    const effect = await recordPresentation({
      sessionId,
      itemId: task.word.item.id,
      kind: 'word',
      presentation: task.presentation,
      outcome,
      errorTypes: run.errorTypes,
    });
    let nextQueue = queue!;
    if (shouldRequeue(run)) {
      const again: Task = { ...task, key: `${task.word.item.id}#${task.presentation + 1}`, presentation: task.presentation + 1, failures: run.failures };
      nextQueue = requeue(queue!, index, again);
      setQueue(nextQueue);
    }
    const isLastPresentation = !shouldRequeue(run);
    setSummary((s) => ({
      firstTry: s.firstTry + (task.presentation === 1 && outcome === 'success' ? 1 : 0),
      withHint: s.withHint + (outcome === 'success_hint' ? 1 : 0),
      toReview: s.toReview + (isLastPresentation && outcome === 'fail' ? 1 : 0),
      stars: s.stars + (effect.newlyAcquired ? 1 : 0),
    }));
    setTransition(
      outcome === 'fail'
        ? { expression: 'contente', line: randomLine(AFTER_FAIL_LINES), star: false, ada: false }
        : { expression: 'fiere', line: effect.newlyAcquired ? 'Une nouvelle étoile !' : successLine(), star: effect.newlyAcquired, ada: effect.veryHard },
    );
  }

  function next() {
    setTransition(null);
    setIndex((i) => i + 1);
  }

  if (queue.length === 0) {
    return (
      <main className="session-screen center-col">
        <Elsa expression="contente" line="Tout est fait pour aujourd’hui ! Reviens demain." />
        <button className="primary big" onClick={onExit}>
          Retour à la tour
        </button>
      </main>
    );
  }

  if (finished && !transition) {
    return (
      <main className="session-screen center-col">
        <h1 className="title-gold">Séance terminée !</h1>
        <Elsa expression="fiere" line={randomLine(END_LINES)} />
        <div className="card summary">
          <p>✦ {summary.firstTry} sort{summary.firstTry > 1 ? 's' : ''} réussi{summary.firstTry > 1 ? 's' : ''} du premier coup</p>
          {summary.withHint > 0 && (
            <p>
              ✦ {summary.withHint} mot{summary.withHint > 1 ? 's' : ''} réussi{summary.withHint > 1 ? 's' : ''} avec un indice
            </p>
          )}
          {summary.stars > 0 && (
            <p className="gold">
              ★ {summary.stars} nouvelle{summary.stars > 1 ? 's' : ''} étoile{summary.stars > 1 ? 's' : ''} dans le ciel
            </p>
          )}
          {summary.toReview > 0 && <p className="muted">{summary.toReview} mot{summary.toReview > 1 ? 's' : ''} reviendr{summary.toReview > 1 ? 'ont' : 'a'} bientôt</p>}
        </div>
        <button className="primary big" onClick={onExit}>
          Retour à la tour
        </button>
      </main>
    );
  }

  return (
    <main className="session-screen">
      <div className="progress" aria-label={`Exercice ${Math.min(index + 1, queue.length)} sur ${queue.length}`}>
        {queue.map((t, i) => (
          <span key={t.key} className={i < index || (i === index && transition) ? 'dot done' : i === index ? 'dot current' : 'dot'} />
        ))}
      </div>
      {transition ? (
        <button className="transition" onClick={next} aria-label="Continuer">
          {transition.star && <div className="transition-star">★</div>}
          <Elsa expression={transition.expression} line={transition.line} />
          {transition.ada && <p className="muted small-text">Ada s’est réveillée pour te voir !</p>}
        </button>
      ) : (
        <WordExercise
          key={task.key}
          word={task.word.word}
          itemId={task.word.item.id}
          presentation={task.presentation}
          failures={task.failures}
          settings={settings}
          onDone={handleDone}
        />
      )}
    </main>
  );
}
