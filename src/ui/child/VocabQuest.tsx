import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { completeSession, type SessionCompletion } from '../../db/sessionRepo';
import { syncUnlocks } from '../../db/rewardsRepo';
import { discoverWord, newSessionId, planVocabQuest, recordVocabAnswer, submitProduction } from '../../db/vocabRepo';
import { randomLine, successLine } from '../../domain/lines';
import type { Reward } from '../../domain/rewards';
import { shuffle } from '../../domain/session';
import { frTypo } from '../../domain/typo';
import { QUESTION_TITLES, type QuestStep, type VocabWord, checkProduction } from '../../domain/vocab';
import { AccentBar } from '../components/AccentBar';
import { playOopsSound, playSuccessChime } from '../../speech/sfx';
import { playFanfare } from '../../speech/music';
import { speak } from '../../speech/tts';
import { RewardIcon } from '../components/Avatar';
import { Elsa } from '../components/Elsa';
import { Fireworks } from '../components/Fireworks';
import { useSettings } from '../hooks';
import { Icon } from '../components/Icon';

const ROLE_LABEL = { learn: 'Nouvelle découverte', review: 'Sortilège à renforcer', challenge: 'Défi final' } as const;

/** Quête du jour de l'Exploratrice des mots : courte, avec une fin claire. */
export function VocabQuest({ onExit, onGrimoire }: { onExit: () => void; onGrimoire: () => void }) {
  const settings = useSettings();
  const sessionId = useRef(newSessionId()).current;
  const [steps, setSteps] = useState<QuestStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ correct: 0, points: 0, discovered: [] as string[], written: [] as string[] });
  const [completion, setCompletion] = useState<SessionCompletion | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    planVocabQuest().then(setSteps);
  }, []);

  const done = !!steps && steps.length > 0 && index >= steps.length;
  useEffect(() => {
    if (!done || completion) return;
    playFanfare(settings?.muted ?? false);
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
            <Icon name="book" size={22} className="icon-inline" />Mon grimoire
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
      <main className={`session-screen center-col ${settings.animations === false ? 'no-motion' : ''}`}>
        <Fireworks />
        <h1 className="title-gold">{frTypo('Quête accomplie !')}</h1>
        {completion.flameLit && (
          <div className="flame-lit">
            <div className="flame-big" aria-hidden>
              <Icon name="flame" size={72} />
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
          {stats.discovered.length > 0 && <p className="gold"><Icon name="sparkles" size={22} className="icon-inline" />Découverte magique : {stats.discovered.join(', ')}</p>}
          {stats.written.length > 0 && <p><Icon name="quill" size={22} className="icon-inline" />Sortilège personnel écrit : {stats.written.join(', ')} (un parent va le lire)</p>}
          <p>
            ✦ {stats.correct} bonne{stats.correct > 1 ? 's' : ''} réponse{stats.correct > 1 ? 's' : ''}
          </p>
          <p className="gold">✦ +{stats.points + completion.bonusPoints} points</p>
        </div>
        <div className="row center">
          <button className="primary big" onClick={onGrimoire}>
            <Icon name="book" size={22} className="icon-inline" />Mon grimoire
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
      ) : step.kind === 'produce' ? (
        <ProduceCard
          key={`p-${step.word.id}`}
          word={step.word}
          muted={settings.muted}
          onSubmit={async (text) => {
            const { points } = await submitProduction(step.word.id, text);
            setStats((s) => ({ ...s, points: s.points + points, written: [...s.written, step.word.lemma] }));
          }}
          onNext={next}
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
      <p className="page-kicker"><Icon name="sparkles" size={22} className="icon-inline" />Découverte magique</p>
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
          <Icon name="speaker" size={22} className="icon-inline" />Écouter
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

/** Le sortilège personnel : production libre, lue ensuite par le parent (pas de correction automatique du sens). */
function ProduceCard({ word, muted, onSubmit, onNext }: { word: VocabWord; muted: boolean; onSubmit: (text: string) => Promise<void>; onNext: () => void }) {
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const c = checkProduction(text, word);
    if (!c.ok) return setHint(c.message);
    playSuccessChime(muted);
    await onSubmit(text);
    setSent(true);
  }

  return (
    <section className="grimoire-page">
      <p className="page-kicker"><Icon name="quill" size={22} className="icon-inline" />Le sortilège personnel</p>
      <h2 className="spell-word">{word.lemma}</h2>
      <p className="muted">{word.definition}</p>
      {sent ? (
        <div className="explanation">
          <Elsa expression="fiere" line="Ton sortilège est écrit dans le grimoire !" />
          <p>Un parent va le lire. S’il est juste, ton mot deviendra un « mot utilisé ».</p>
          <button className="primary big" onClick={onNext} autoFocus>
            Continuer
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <p className="question-prompt">Invente une phrase à toi avec le mot « {word.lemma} ».</p>
          <textarea
            ref={ref}
            className="production-input"
            rows={3}
            value={text}
            onChange={(e) => (setText(e.target.value), setHint(''))}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            aria-label="Ta phrase"
            autoFocus
          />
          <AccentBar inputRef={ref} value={text} onChange={(v) => (setText(v), setHint(''))} />
          {hint && <p className="hint-text">{hint}</p>}
          <div className="row center">
            <button type="submit" className="primary big" disabled={!text.trim()}>
              Lancer mon sortilège
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
