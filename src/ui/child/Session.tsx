import { useEffect, useRef, useState } from 'react';
import { type SentenceTask, type SessionCompletion, type SessionKind, type WordTask, completeSession, planSession, recordPresentation, recordSentence, updateGuidance } from '../../db/sessionRepo';
import { type SentenceRun, notionOutcome } from '../../domain/sentenceRun';
import { SentenceExercise } from './SentenceExercise';
import { AFTER_FAIL_LINES, END_LINES, randomLine, successLine } from '../../domain/lines';
import { newId } from '../../domain/model';
import { interleave, requeue } from '../../domain/session';
import { frTypo } from '../../domain/typo';
import { db } from '../../db/db';
import { type WordRun, shouldRequeue } from '../../domain/wordRun';
import { Elsa, type ElsaExpression } from '../components/Elsa';
import { useSettings } from '../hooks';
import { syncUnlocks } from '../../db/rewardsRepo';
import type { Reward } from '../../domain/rewards';
import { RewardIcon } from '../components/Avatar';
import { usePortraitUrl } from '../components/Portrait';
import { ConstellationArt } from '../components/Sky';
import { shapeById } from '../../domain/constellations';
import { playStarChime, playSuccessChime } from '../../speech/sfx';
import { playConstellationJingle, playFanfare } from '../../speech/music';
import { WordExercise } from './WordExercise';

interface WordItem {
  kind: 'word';
  key: string;
  word: WordTask;
  presentation: number;
  failures: number;
}

interface SentenceItem {
  kind: 'sentence';
  key: string;
  task: SentenceTask;
}

type Task = WordItem | SentenceItem;

interface Transition {
  expression: ElsaExpression;
  line: string;
  star: boolean;
  ada: boolean;
  points: number;
}

interface Summary {
  firstTry: number;
  withHint: number;
  toReview: number;
  stars: number;
  points: number;
  sentencesOk: number;
  sentences: number;
}

/** Durée d'une transition entre deux exercices (passable d'un tap). */
const TRANSITION_MS = 1600;

export function Session({ onExit, onAgain }: { onExit: () => void; onAgain: () => void }) {
  const settings = useSettings();
  const grimaceUrl = usePortraitUrl('leyu-grimace');
  const sessionId = useRef(newId()).current;
  const [queue, setQueue] = useState<Task[] | null>(null);
  const [kind, setKind] = useState<SessionKind>('daily');
  const [completion, setCompletion] = useState<SessionCompletion | null>(null);
  const [newRewards, setNewRewards] = useState<Reward[]>([]);
  const [newConstellations, setNewConstellations] = useState<{ shapeId: string; notion: string }[]>([]);
  const [hasWords, setHasWords] = useState(true);
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [summary, setSummary] = useState<Summary>({ firstTry: 0, withHint: 0, toReview: 0, stars: 0, points: 0, sentencesOk: 0, sentences: 0 });

  useEffect(() => {
    db.words.count().then((n) => setHasWords(n > 0));
    planSession().then((plan) => {
      setKind(plan.kind);
      const words: Task[] = plan.tasks.map((t) => ({ kind: 'word', key: `${t.item.id}#1`, word: t, presentation: 1, failures: 0 }));
      const sentences: Task[] = plan.sentences.map((t) => ({ kind: 'sentence', key: `s:${t.sentence.id}`, task: t }));
      setQueue(interleave(words, sentences));
    });
  }, []);

  // Résultats d'accord par notion pendant la séance (pour le guidage dégressif).
  const notionResults = useRef(new Map<string, boolean>());
  const done = !!queue && queue.length > 0 && index >= queue.length && !transition;
  useEffect(() => {
    if (done && !completion)
      updateGuidance(notionResults.current)
        .then(async (mastered) => {
          const notions = await db.notions.bulkGet(mastered);
          setNewConstellations(notions.filter(Boolean).map((n) => ({ shapeId: n!.constellation!, notion: n!.label })));
          // Nouvelle constellation : son jingle d'abord, puis la fanfare de fin de séance.
          if (mastered.length) {
            playConstellationJingle(settings!.muted);
            setTimeout(() => playFanfare(settings!.muted), 3200);
          } else playFanfare(settings!.muted);
          return completeSession(kind);
        })
        .then(async (c) => {
          setNewRewards(await syncUnlocks());
          return c;
        })
        .then(setCompletion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    if (!transition) return;
    const t = setTimeout(next, TRANSITION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition]);

  if (!settings || !queue) return null;

  const finished = index >= queue.length;
  const task = queue[index];

  async function handleSentenceDone(run: SentenceRun) {
    const t = (task as SentenceItem).task;
    const nOutcome = notionOutcome(run);
    const { points } = await recordSentence({
      sessionId,
      sentence: t.sentence,
      scheduledNotionIds: t.scheduledNotionIds,
      outcome: run.outcome!,
      notionOutcome: nOutcome,
      errorTypes: run.errorTypes,
      hintUsed: run.hintUsed,
    });
    // Une notion « réussie » dans la séance = aucune erreur d'accord au premier essai.
    for (const n of t.sentence.notionIds) notionResults.current.set(n, (notionResults.current.get(n) ?? true) && nOutcome === 'success');
    const ok = run.outcome !== 'fail';
    setSummary((s) => ({ ...s, sentences: s.sentences + 1, sentencesOk: s.sentencesOk + (ok ? 1 : 0), points: s.points + points }));
    playSuccessChime(settings!.muted);
    setTransition(
      ok
        ? { expression: 'fiere', line: run.outcome === 'success' ? 'Phrase parfaite !' : 'Tu as trouvé tes erreurs toute seule !', star: false, ada: false, points }
        : { expression: 'contente', line: 'Cette phrase t’a appris quelque chose.', star: false, ada: false, points: 0 },
    );
  }

  async function handleDone(run: WordRun) {
    if (task.kind !== 'word') return;
    const outcome = run.outcome!;
    const effect = await recordPresentation({
      sessionId,
      itemId: task.word.item.id,
      kind: 'word',
      presentation: task.presentation,
      outcome,
      errorTypes: run.errorTypes,
      practice: task.word.practice,
    });
    let nextQueue = queue!;
    if (shouldRequeue(run)) {
      const again: WordItem = { ...task, key: `${task.word.item.id}#${task.presentation + 1}`, presentation: task.presentation + 1, failures: run.failures };
      nextQueue = requeue(queue!, index, again);
      setQueue(nextQueue);
    }
    const isLastPresentation = !shouldRequeue(run);
    setSummary((s) => ({
      ...s,
      firstTry: s.firstTry + (task.presentation === 1 && outcome === 'success' ? 1 : 0),
      withHint: s.withHint + (outcome === 'success_hint' ? 1 : 0),
      toReview: s.toReview + (isLastPresentation && outcome === 'fail' ? 1 : 0),
      stars: s.stars + (effect.newlyAcquired ? 1 : 0),
      points: s.points + effect.points,
    }));
    // Mot écrit juste (du premier coup, avec indice, ou recopié de mémoire après une erreur) : tintement.
    (effect.newlyAcquired ? playStarChime : playSuccessChime)(settings!.muted);
    setTransition(
      outcome === 'fail'
        ? { expression: 'contente', line: randomLine(AFTER_FAIL_LINES), star: false, ada: false, points: 0 }
        : {
            expression: 'fiere',
            line: effect.newlyAcquired ? 'Une nouvelle étoile !' : successLine(),
            star: effect.newlyAcquired,
            ada: effect.veryHard,
            points: effect.points,
          },
    );
  }

  function next() {
    setTransition(null);
    setIndex((i) => i + 1);
  }

  if (queue.length === 0) {
    return (
      <main className="session-screen center-col">
        <Elsa
          expression="contente"
          line={hasWords ? 'Rien à réviser pour l’instant.' : 'Il n’y a pas encore de mots. Demande à un parent d’ajouter la liste de la semaine.'}
        />
        <button className="primary big" onClick={onExit}>
          Retour à la tour
        </button>
      </main>
    );
  }

  if (finished && !transition) {
    if (!completion) return null;
    return (
      <main className="session-screen center-col">
        <h1 className="title-gold">{frTypo('Séance terminée !')}</h1>
        {completion.flameLit && (
          <div className="flame-lit">
            <div className="flame-big" aria-hidden>
              🔥
            </div>
            <p className="gold">
              {frTypo(`Flamme du jour allumée ! ${completion.flameDays} jour${completion.flameDays > 1 ? 's' : ''} de magie`)}
            </p>
          </div>
        )}
        {newConstellations.map((c) => {
          const shape = shapeById(c.shapeId);
          return shape ? (
            <div key={c.shapeId} className="new-reward">
              <svg viewBox="0 0 140 140" width="140" height="140" className="constellation-preview" aria-hidden>
                <ConstellationArt shape={shape} x={70} y={70} size={120} />
              </svg>
              <p className="gold">{frTypo(`Nouvelle constellation : ${shape.name} !`)}</p>
              <p className="muted small-text">
                Notion maîtrisée : {c.notion}. Ada ouvre un œil… puis se rendort.
              </p>
            </div>
          ) : null;
        })}
        {newRewards.map((r) => (
          <div key={r.id} className="new-reward">
            <div className="flame-big">
              <RewardIcon id={r.id} />
            </div>
            <p className="gold">{frTypo(`Nouvelle récompense : ${r.name} !`)}</p>
            <p className="muted small-text">Elle est dans ta garde-robe.</p>
          </div>
        ))}
        <Elsa expression="fiere" line={randomLine(END_LINES)} />
        <div className="card summary">
          <p className="gold">
            ✦ +{summary.points + completion.bonusPoints} points{' '}
            <span className="muted small-text">(dont {completion.bonusPoints} de bonus {kind === 'daily' ? 'de la séance du jour' : 'de séance en plus'})</span>
          </p>
          <p>✦ {summary.firstTry} sort{summary.firstTry > 1 ? 's' : ''} réussi{summary.firstTry > 1 ? 's' : ''} du premier coup</p>
          {summary.sentences > 0 && (
            <p>
              ✦ {summary.sentencesOk}/{summary.sentences} phrase{summary.sentences > 1 ? 's' : ''} réussie{summary.sentencesOk > 1 ? 's' : ''}
            </p>
          )}
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
        <div className="row center">
          <button className="primary big" onClick={onAgain}>
            {frTypo('Encore une séance !')}
          </button>
          <button className="big" onClick={onExit}>
            Retour à la tour
          </button>
        </div>
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
          <div className="row center" style={{ alignItems: 'flex-end' }}>
            {transition.line === 'Le POULET !' && grimaceUrl && (
              <div className="portrait" style={{ width: 110, height: 110 }} aria-hidden>
                <img src={grimaceUrl} alt="" />
              </div>
            )}
            <Elsa expression={transition.expression} line={transition.line} />
          </div>
          {transition.points > 0 && <p className="gold">+{transition.points} points</p>}
          {transition.ada && <p className="muted small-text">Ada s’est réveillée pour te voir !</p>}
        </button>
      ) : (
        task.kind === 'sentence' ? (
          <SentenceExercise key={task.key} task={task.task} settings={settings} onDone={handleSentenceDone} />
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
        )
      )}
    </main>
  );
}
