import { type FormEvent, useMemo, useRef, useState } from 'react';
import type { SentenceTask } from '../../db/sessionRepo';
import { guidedQuestions } from '../../domain/guidance';
import { type HuntResult, buildHunt, hintWindow, huntResult, isRightFix } from '../../domain/hunt';
import type { Settings } from '../../domain/model';
import { frTypo } from '../../domain/typo';
import { playOopsSound, playSuccessChime } from '../../speech/sfx';
import { AccentBar } from '../components/AccentBar';
import { Elsa } from '../components/Elsa';

/**
 * Chasse aux erreurs (spec 5.2 b) : 1 à 3 erreurs d'accord, on dit combien, jamais où.
 * Leyu touche le mot fautif puis écrit le mot bien accordé.
 * L'indice, après 2 essais infructueux, désigne un groupe de mots, jamais le mot exact.
 */
export function HuntExercise({ task, settings, onDone }: { task: SentenceTask; settings: Settings; onDone: (r: HuntResult) => void }) {
  const puzzle = useMemo(() => buildHunt(task.sentence.text, task.sentence.huntText ?? '').puzzle!, [task]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [value, setValue] = useState('');
  const [misses, setMisses] = useState(0);
  const [wrongFixes, setWrongFixes] = useState(0);
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [hintState, setHintState] = useState<'none' | 'offer' | 'used'>('none');
  const [line, setLine] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = puzzle.errors.length - found.size;
  const hinted = hintState === 'used' ? hintWindow(puzzle, found) : [];
  const questions = guidedQuestions(task.sentence.notionIds);

  function offerHintIfStuck(nextMisses: number, nextWrong: number) {
    if (hintState === 'none' && nextMisses + nextWrong >= 2) setHintState('offer');
  }

  function tap(i: number) {
    if (found.has(i) || !/\p{L}/u.test(puzzle.shown[i])) return;
    if (puzzle.errors.includes(i)) {
      setSelected(i);
      setValue('');
      setLine(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      const m = misses + 1;
      setMisses(m);
      setSelected(null);
      setLine('Ce mot est bien accordé. Cherche encore !');
      offerHintIfStuck(m, wrongFixes);
    }
  }

  function fix(e: FormEvent) {
    e.preventDefault();
    if (selected === null || !value.trim()) return;
    const i = selected;
    if (isRightFix(value, puzzle.correct[i], i)) {
      const nf = new Set(found).add(i);
      setFound(nf);
      setSelected(null);
      setValue('');
      playSuccessChime(settings.muted);
      setLine(nf.size === puzzle.errors.length ? 'Toutes les erreurs sont corrigées !' : 'Bien vu ! Une erreur de moins.');
      if (nf.size === puzzle.errors.length) setTimeout(() => onDone(huntResult(misses, wrongFixes, hintState === 'used', revealed.size)), 900);
      return;
    }
    const n = (attempts[i] ?? 0) + 1;
    setAttempts({ ...attempts, [i]: n });
    const w = wrongFixes + 1;
    setWrongFixes(w);
    setValue('');
    playOopsSound(settings.muted);
    // Après deux essais sur ce mot, on montre la bonne forme : elle la recopie.
    if (n >= 2) {
      setRevealed(new Set(revealed).add(i));
      setLine(`Le bon accord est « ${puzzle.correct[i]} ». Écris-le.`);
    } else {
      setLine('Pas tout à fait. Réfléchis à l’accord et réessaie.');
    }
    offerHintIfStuck(misses, w);
  }

  return (
    <div className="exercise">
      <aside className="exercise-side">
        <Elsa expression={line?.startsWith('Bien') || line?.startsWith('Toutes') ? 'fiere' : 'concentree'} line={hintState === 'offer' ? 'Tu veux un indice ?' : line ?? undefined} />
      </aside>
      <section className="exercise-main">
        <p className="instruction">🔍 Chasse aux erreurs</p>
        <p className="hunt-count">
          {remaining > 0
            ? frTypo(`Il reste ${remaining} erreur${remaining > 1 ? 's' : ''} d’accord. Touche un mot mal accordé.`)
            : frTypo('Bravo !')}
        </p>

        <div className="hunt-sentence" role="group" aria-label="Phrase à corriger">
          {puzzle.shown.map((tok, i) => {
            const isWord = /\p{L}/u.test(tok);
            // Point et virgule collés au mot ; « ? ! : ; » gardent l'espace comme en français.
            if (!isWord) return <span key={i} className={/[.,…]/.test(tok) ? 'hunt-punct tight' : 'hunt-punct'}>{tok}</span>;
            const cls = ['hunt-word', found.has(i) ? 'fixed' : '', selected === i ? 'selected' : '', hinted.includes(i) ? 'hinted' : ''].join(' ');
            return (
              <button key={i} type="button" className={cls} onClick={() => tap(i)} disabled={found.has(i)}>
                {found.has(i) ? puzzle.correct[i] : tok}
              </button>
            );
          })}
        </div>

        {hintState === 'offer' && (
          <div className="row center">
            <button className="primary big" onClick={() => (setHintState('used'), setLine(null))}>
              Oui
            </button>
            <button className="big" onClick={() => (setHintState('none'), setLine(null), setMisses(0), setWrongFixes(0))}>
              Non
            </button>
          </div>
        )}
        {hintState === 'used' && (
          <div className="hint-box">
            <strong>Indice :</strong> regarde bien le groupe de mots surligné.
            <br />
            {frTypo(questions[Math.min(2, questions.length - 1)])}
          </div>
        )}

        {selected !== null && (
          <form className="answer-form" onSubmit={fix}>
            <p className="muted" style={{ margin: 0 }}>
              {frTypo(`Écris « ${puzzle.shown[selected]} » bien accordé :`)}
            </p>
            <input
              ref={inputRef}
              className="answer-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Mot corrigé"
            />
            <AccentBar inputRef={inputRef} value={value} onChange={setValue} />
            <div className="row center">
              <button type="button" className="big" onClick={() => setSelected(null)}>
                Annuler
              </button>
              <button type="submit" className="primary big" disabled={!value.trim()}>
                Corriger
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
