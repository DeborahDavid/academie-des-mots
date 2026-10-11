import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { exportCorpus, getConfusions, getProductions, getVocabProgress, importCorpus, reviewProduction, setNewPerWeek, setVocabStatus, updateVocabWord, type WordProgress } from '../../db/vocabRepo';
import type { VocabProduction } from '../../domain/model';
import { QUESTION_TITLES, STAGES, type VocabStage } from '../../domain/vocab';
import { useSettings } from '../hooks';

const ORDER: VocabStage[] = ['mysterieux', 'decouvert', 'compris', 'utilise', 'maitrise'];
const atLeast = (p: WordProgress, s: VocabStage) => ORDER.indexOf(p.info.stage) >= ORDER.indexOf(s);

export function VocabPanel() {
  const progress = useLiveQuery(() => getVocabProgress(), []);
  const confusions = useLiveQuery(() => getConfusions(), []);
  const productions = useLiveQuery(() => getProductions(), []);
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [chosen, setChosen] = useState<'pending' | 'validated' | 'all' | null>(null);
  if (!progress || !settings) return null;

  const pending = progress.filter((p) => p.word.status === 'pending');
  // Par défaut : les mots à valider s'il y en a, sinon les mots validés.
  const filter = chosen ?? (pending.length ? 'pending' : 'validated');
  const setFilter = setChosen;
  const rows = progress
    .filter((p) => filter === 'all' || p.word.status === filter)
    .sort((a, b) => (a.word.priorityRank ?? a.word.week * 1000) - (b.word.priorityRank ?? b.word.week * 1000));

  async function doImport(file: File) {
    try {
      const r = await importCorpus(JSON.parse(await file.text()));
      setMessage(r.errors.length ? `Import refusé :\n${r.errors.slice(0, 8).join('\n')}` : `${r.added} mot(s) ajouté(s) « à valider », ${r.updated} mis à jour.`);
    } catch (e) {
      setMessage(`Fichier illisible : ${(e as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function doExport() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(await exportCorpus(), null, 1)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulaire-academie-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>Progression réelle</h2>
        <div className="metrics">
          <Metric n={progress.filter((p) => atLeast(p, 'decouvert')).length} label="mots rencontrés" help="explication et exemples vus" />
          <Metric n={progress.filter((p) => atLeast(p, 'compris')).length} label="mots compris" help="sens retrouvé dans 2 types d’épreuves" />
          <Metric n={progress.filter((p) => atLeast(p, 'utilise')).length} label="mots utilisés" help="phrase personnelle validée" />
          <Metric n={progress.filter((p) => p.info.stage === 'maitrise').length} label="mots maîtrisés" help="résistent aux révisions espacées" />
          <Metric n={progress.filter((p) => p.info.toConsolidate).length} label="à consolider" help="oubliés lors d’une révision différée" />
        </div>
        <p className="muted small-text">
          Une réussite à un QCM ne compte jamais comme « utilisé » : il faut une phrase écrite par Leyu (« sortilège personnel ») et validée par vous.
        </p>
      </section>

      {productions && (
        <section className="card stack">
          <h2>Sortilèges personnels à lire ({productions.filter((x) => x.status === 'pending').length})</h2>
          <p className="muted small-text">
            Phrases écrites par Leyu. Validez si le mot est bien utilisé (vous pouvez corriger l’orthographe au passage) ; sinon « à retravailler » : le mot lui
            sera reproposé plus tard, sans pénalité.
          </p>
          {productions.filter((x) => x.status === 'pending').length === 0 && <p className="muted">Rien à lire pour l’instant.</p>}
          {productions
            .filter((x) => x.status === 'pending')
            .map((x) => (
              <ProductionReview key={x.id} prod={x} lemma={progress.find((p) => p.word.id === x.wordId)?.word.lemma ?? x.wordId} />
            ))}
          {productions.some((x) => x.status !== 'pending') && (
            <details>
              <summary className="muted small-text">Historique ({productions.filter((x) => x.status !== 'pending').length})</summary>
              <ul className="small-text">
                {productions
                  .filter((x) => x.status !== 'pending')
                  .map((x) => (
                    <li key={x.id}>
                      {x.status === 'validated' ? '✓' : '↺'} <strong>{progress.find((p) => p.word.id === x.wordId)?.word.lemma}</strong> — {x.text}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section className="card stack">
        <h2>Rythme</h2>
        <div className="row">
          <label htmlFor="npw" style={{ margin: 0 }}>
            Nouveaux mots par semaine
          </label>
          <input id="npw" type="number" min={0} max={15} value={settings.vocab?.newPerWeek ?? 5} onChange={(e) => setNewPerWeek(Number(e.target.value))} style={{ width: 80 }} />
          <span className="muted small-text">Au plus un par jour ; aucun si trop de révisions attendent (consolidation d’abord).</span>
        </div>
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Mots</h2>
          <div className="row">
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filtre">
              <option value="pending">À valider ({pending.length})</option>
              <option value="validated">Validés ({progress.length - pending.length})</option>
              <option value="all">Tous ({progress.length})</option>
            </select>
            {filter === 'pending' && pending.length > 0 && (
              <button className="primary" onClick={() => confirm(`Valider les ${pending.length} mots après les avoir relus ?`) && setVocabStatus(pending.map((p) => p.word.id), 'validated')}>
                Tout valider
              </button>
            )}
          </div>
        </div>
        {rows.length === 0 && <p className="muted">Aucun mot.</p>}
        {rows.map((p) => (
          <WordEditor key={p.word.id} p={p} />
        ))}
      </section>

      {confusions && confusions.length > 0 && (
        <section className="card">
          <h2>Souvent confondus</h2>
          <ul>
            {confusions.slice(0, 10).map((c) => (
              <li key={`${c.wordId}|${c.answer}`}>
                <strong>{progress.find((p) => p.word.id === c.wordId)?.word.lemma ?? c.wordId}</strong> → « {c.answer} » ({c.count} fois)
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card stack">
        <h2>Corpus</h2>
        <p className="muted small-text">
          Format « academie-vocab » (voir scripts/vocab/README.md). Fusion par identifiant : pas de doublon, la progression de Leyu est conservée ; les nouveaux mots
          arrivent « à valider ».
        </p>
        <div className="row">
          <button onClick={() => fileRef.current?.click()}>Importer un corpus…</button>
          <button className="ghost" onClick={doExport}>
            Exporter (pour modifier les exercices)
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
        {message && <pre className="notice small-text" style={{ whiteSpace: 'pre-wrap' }}>{message}</pre>}
      </section>
    </div>
  );
}

function Metric({ n, label, help }: { n: number; label: string; help: string }) {
  return (
    <div className="metric">
      <strong>{n}</strong>
      <span>{label}</span>
      <span className="muted small-text">{help}</span>
    </div>
  );
}

function WordEditor({ p }: { p: WordProgress }) {
  const w = p.word;
  const stage = STAGES.find((s) => s.id === p.info.stage)!;
  return (
    <details className="vocab-row">
      <summary>
        <span>
          <strong>{w.lemma}</strong> <span className="muted small-text">· {w.pos}{w.priorityRank ? ` · rang ${w.priorityRank}` : ''} · difficulté {w.level}</span>
        </span>
        <span className="small-text">
          {w.status === 'pending' ? <span className="warn">à valider</span> : <>{stage.icon} {stage.label}</>}
          {p.info.toConsolidate ? ' · à consolider' : ''}
          {p.nextReview ? ` · révision ${p.nextReview.toLocaleDateString('fr-FR')}` : ''}
        </span>
      </summary>
      <div className="stack" style={{ marginTop: '0.75rem' }}>
        <label>
          Définition (mots d’enfant)
          <textarea rows={2} defaultValue={w.definition} onBlur={(e) => e.target.value.trim() && updateVocabWord(w.id, { definition: e.target.value.trim().replace(/'/g, '’') })} />
        </label>
        <label>
          Exemples (un par ligne)
          <textarea
            rows={3}
            defaultValue={w.examples.join('\n')}
            onBlur={(e) => updateVocabWord(w.id, { examples: e.target.value.split('\n').map((x) => x.trim().replace(/'/g, '’')).filter(Boolean) })}
          />
        </label>
        <p className="small-text">
          <strong>Alliés :</strong> {w.synonyms.join(', ') || '—'} · <strong>Opposés :</strong> {w.antonyms.join(', ') || '—'}
        </p>
        {w.questions.map((q) => (
          <div key={q.id} className="notice small-text">
            <strong>{QUESTION_TITLES[q.type]}</strong> — {q.prompt}
            <br />✓ {q.choices[0]} · ✗ {q.choices.slice(1).join(' · ✗ ')}
            <br />
            <span className="muted">{q.explanation}</span>
          </div>
        ))}
        <div className="row">
          {w.status === 'pending' ? (
            <button className="primary small" onClick={() => setVocabStatus([w.id], 'validated')}>
              Valider ce mot
            </button>
          ) : (
            <button className="ghost small" onClick={() => setVocabStatus([w.id], 'pending')}>
              Remettre « à valider »
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

function ProductionReview({ prod, lemma }: { prod: VocabProduction; lemma: string }) {
  const [text, setText] = useState(prod.text);
  return (
    <div className="notice stack" style={{ gap: '0.5rem' }}>
      <span>
        <strong>{lemma}</strong> <span className="muted small-text">· {new Date(prod.createdAt).toLocaleDateString('fr-FR')}</span>
      </span>
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="Phrase de Leyu (modifiable)" />
      <div className="row">
        <button className="primary small" onClick={() => reviewProduction(prod.id, 'validated', text !== prod.text ? text : undefined)}>
          {text !== prod.text ? 'Valider la version corrigée' : 'Valider'}
        </button>
        <button className="ghost small" onClick={() => reviewProduction(prod.id, 'rejected')}>
          À retravailler
        </button>
      </div>
    </div>
  );
}
