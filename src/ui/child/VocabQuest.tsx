import { useEffect, useMemo, useRef, useState } from 'react';
import { completeSession, type SessionCompletion } from '../../db/sessionRepo';
import { syncUnlocks } from '../../db/rewardsRepo';
import { discoverWord, newSessionId, planVocabQuest, recordVocabAnswer } from '../../db/vocabRepo';
import { randomLine, successLine } from '../../domain/lines';
import type { Reward } from '../../domain/rewards';
import { shuffle } from '../../domain/session';
import { frTypo } from '../../domain/typo';
import { QUESTION_TITLES, type QuestStep, type VocabWord } from '../../domain/vocab';
import { playOopsSound, playSuccessChime } from '../../speech/sfx';
import { speak } from '../../speech/tts';
import { RewardIcon } from '../components/Avatar';
import { Elsa } from '../components/Elsa';
import { useSettings } from '../hooks';

const ROLE_LABEL = { learn: 'Nouvelle découverte', review: 'Sortilège à renforcer', challenge: 'Défi final' } as const;

/** Quête du jour de l'Exploratrice des mots : courte, avec une fin claire. */
export function VocabQuest({ onExit, onGrimoire }: { onExit: () => void; onGrimoire: () => void }) {
  const settings = useSettings();
  const sessionId = useRef(newSessionId()).current;
  const [steps, setSteps] = useState<QuestStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ correct: 0, points: 0, discovered: [] as string[] });
  const [completion, setCompletion] = useState<SessionCompletion | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    planVocabQuest().then(setSteps);
  }, []);

  const done = !!steps && steps.length > 0 && index >= steps.length;
  useEffect(() => {
    if (!done || completion) return;
    completeSession('vocab').then(async (c) => {
      setRewards(await syncUnlocks());
      setCompletion(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!settings || !steps) return null;

  if (steps.length === 0)
    return (
      <main className="session-screen center-col">
        <h1 className="title-gold">L’Exploratrice des mots</h1>
        <Elsa expression="contente" line="Ta quête du jour est terminée. De nouveaux mots t’attendent demain !" />
        <div className="row center">
          <button className="primary big" onClick={onGrimoire}>
            📖 Mon grimoire
          </button>
          <button className="big" onClick={onExit}>
            Retour à la tour
          </button>
        </div>
      </main>
    );

  if (done) {
    if (!completion) return null;
    return (
      <main className="session-screen center-col">
        <h1 className="title-gold">{frTypo('Quête accomplie !')}</h1>
        {completion.flameLit && (
          <div className="flame-lit">
            <div className="flame-big" aria-hidden>
              🔥
            </div>
            <p className="gold">{frTypo(`Flamme du jour allumée ! ${completion.flameDays} jour${completion.flameDays > 1 ? 's' : ''} de magie`)}</p>
          </div>
        )}
        {rewards.map((r) => (
          <div key={r.id} className="new-reward">
            <div className="flame-big">
              <RewardIcon id={r.id} />
            </div>
            <p className="gold">{frTypo(`Nouvelle récompense : ${r.name} !`)}</p>
          </div>
        ))}
        <div className="card summary">
          {stats.discovered.length > 0 && <p className="gold">✨ Découverte magique : {stats.discovered.join(', ')}</p>}
          <p>
            ✦ {stats.correct} bonne{stats.correct > 1 ? 's' : ''} réponse{stats.correct > 1 ? 's' : ''}
          </p>
          <p className="gold">✦ +{stats.points + completion.bonusPoints} points</p>
        </div>
        <div className="row center">
          <button className="primary big" onClick={onGrimoire}>
            📖 Mon grimoire
          </button>
          <button className="big" onClick={onExit}>
            Retour à la tour
          </button>
        </div>
      </main>
    );
  }

  const step = steps[index];
  const next = () => setIndex((i) => i + 1);

  return (
    <main className="session-screen">
      <div className="progress" aria-label={`Étape ${index + 1} sur ${steps.length}`}>
        {steps.map((_, i) => (
          <span key={i} className={i < index ? 'dot done' : i === index ? 'dot current' : 'dot'} />
        ))}
      </div>
      {step.kind === 'discover' ? (
        <DiscoverCard
          key={`d-${step.word.id}`}
          word={step.word}
          settings={settings}
          onDone={async () => {
            await discoverWord(step.word.id);
            setStats((s) => ({ ...s, discovered: [...s.discovered, step.word.lemma] }));
            next();
          }}
        />
      ) : (
        <QuestionCard
          key={`q-${index}`}
          step={step}
          muted={settings.muted}
          onAnswer={async (answer, correct) => {
            const { points } = await recordVocabAnswer({ sessionId, word: step.word, question: step.question, role: step.role, answerGiven: answer, correct });
            setStats((s) => ({ ...s, correct: s.correct + (correct ? 1 : 0), points: s.points + points }));
          }}
          onNext={next}
        />
      )}
    </main>
  );
}

function DiscoverCard({ word, settings, onDone }: { word: VocabWord; settings: NonNullable<ReturnType<typeof useSettings>>; onDone: () => void }) {
  const listen = () => speak(`${word.lemma}. ${word.definition}`, { voiceURI: settings.voiceURI, rate: settings.speechRate }).catch(() => {});
  return (
    <section className="grimoire-page">
      <p className="page-kicker">✨ Découverte magique</p>
      <h2 className="spell-word">{word.lemma}</h2>
      <p className="muted">{word.pos}</p>
      <p className="definition">{word.definition}</p>
      <ul className="examples">
        {word.examples.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
        <div className="relations">
          {word.synonyms.length > 0 && (
            <p>
              <strong>Mots alliés :</strong> {word.synonyms.join(', ')}
            </p>
          )}
          {word.antonyms.length > 0 && (
            <p>
              <strong>Mots opposés :</strong> {word.antonyms.join(', ')}
            </p>
          )}
        </div>
      )}
      <div className="row center">
        <button className="big" onClick={listen}>
          🔊 Écouter
        </button>
        <button className="primary big" onClick={onDone}>
          J’ai compris !
        </button>
      </div>
    </section>
  );
}

function QuestionCard({
  step,
  muted,
  onAnswer,
  onNext,
}: {
  step: Extract<QuestStep, { kind: 'question' }>;
  muted: boolean;
  onAnswer: (answer: string, correct: boolean) => Promise<void>;
  onNext: () => void;
}) {
  const { question, role } = step;
  // Bonne réponse = première proposition ; l'ordre est mélangé une fois pour toutes.
  const choices = useMemo(() => shuffle(question.choices.map((text, i) => ({ text, correct: i === 0 }))), [question]);
  const [picked, setPicked] = useState<number | null>(null);
  const [line, setLine] = useState('');

  async function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const ok = choices[i].correct;
    if (ok) {
      playSuccessChime(muted);
      setLine(successLine());
    } else {
      playOopsSound(muted);
      setLine(randomLine(['Pas encore. Regarde la bonne réponse.', 'Presque ! Lis l’explication.', 'On apprend en se trompant.']));
    }
    await onAnswer(choices[i].text, ok);
  }

  return (
    <section className="grimoire-page">
      <p className="page-kicker">
        {QUESTION_TITLES[question.type]} · {ROLE_LABEL[role]}
      </p>
      <p className="question-prompt">{frTypo(question.prompt)}</p>
      <div className={`choices ${question.type === 'phrase' ? 'long' : ''}`}>
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
        <div className="explanation">
          <Elsa expression={choices[picked].correct ? 'fiere' : 'contente'} line={line} />
          <p>{question.explanation}</p>
          <button className="primary big" onClick={onNext} autoFocus>
            Continuer
          </button>
        </div>
      )}
    </section>
  );
}
