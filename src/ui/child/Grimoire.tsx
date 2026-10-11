import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getProductions, getVocabProgress, type WordProgress } from '../../db/vocabRepo';
import { STAGES } from '../../domain/vocab';

const stageOf = (p: WordProgress) => STAGES.find((s) => s.id === p.info.stage)!;

/** Grimoire personnel : les mots rencontrés et leur état de maîtrise. Lisible, sans surcharge. */
export function Grimoire({ onBack }: { onBack: () => void }) {
  const progress = useLiveQuery(() => getVocabProgress(), []);
  const [open, setOpen] = useState<WordProgress | null>(null);
  if (!progress) return null;

  const known = progress.filter((p) => p.evidence.discovered).sort((a, b) => a.word.lemma.localeCompare(b.word.lemma, 'fr'));
  const mysteries = progress.filter((p) => !p.evidence.discovered && p.word.status === 'validated').length;

  if (open) return <WordPage p={open} onBack={() => setOpen(null)} />;

  return (
    <main className="wardrobe">
      <header className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <button className="ghost" onClick={onBack}>
          ← Retour
        </button>
        <h1 className="title-gold" style={{ fontSize: '2rem' }}>
          Mon grimoire
        </h1>
        <span style={{ width: 90 }} />
      </header>
      <div className="stage-legend">
        {STAGES.slice(1).map((s) => (
          <span key={s.id}>
            {s.icon} {s.label} · {known.filter((p) => p.info.stage === s.id).length}
          </span>
        ))}
      </div>
      {known.length === 0 && <p className="muted">Ton grimoire est encore vide. Chaque mot découvert y sera écrit en lettres d’or.</p>}
      <div className="spell-grid">
        {known.map((p) => (
          <button key={p.word.id} className="spell-card" onClick={() => setOpen(p)}>
            <span className="spell-icon">{stageOf(p).icon}</span>
            <span className="spell-name">{p.word.lemma}</span>
            <span className="small-text muted">{stageOf(p).label}</span>
            {p.info.toConsolidate && <span className="small-text consolidate">à consolider</span>}
          </button>
        ))}
        {mysteries > 0 && (
          <div className="spell-card mystery">
            <span className="spell-icon">🔮</span>
            <span className="spell-name">
              {mysteries} mot{mysteries > 1 ? 's' : ''} mystérieux
            </span>
            <span className="small-text muted">à découvrir dans tes quêtes</span>
          </div>
        )}
      </div>
    </main>
  );
}

function WordPage({ p, onBack }: { p: WordProgress; onBack: () => void }) {
  const w = p.word;
  const mine = useLiveQuery(async () => (await getProductions()).filter((x) => x.wordId === w.id), [w.id]);
  const st = stageOf(p);
  return (
    <main className="wardrobe">
      <header className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <button className="ghost" onClick={onBack}>
          ← Grimoire
        </button>
        <span />
      </header>
      <section className="grimoire-page">
        <p className="page-kicker">
          {st.icon} {st.label}
          {p.info.toConsolidate ? ' · à consolider' : ''}
        </p>
        <h2 className="spell-word">{w.lemma}</h2>
        <p className="muted">{w.pos}</p>
        <p className="definition">{w.definition}</p>
        <ul className="examples">
          {w.examples.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        {w.synonyms.length > 0 && (
          <p>
            <strong>Mots alliés :</strong> {w.synonyms.join(', ')}
          </p>
        )}
        {w.antonyms.length > 0 && (
          <p>
            <strong>Mots opposés :</strong> {w.antonyms.join(', ')}
          </p>
        )}
        {w.otherSenses?.map((o) => (
          <p key={o} className="muted">
            Autre sens : {o}
          </p>
        ))}
        {mine && mine.length > 0 && (
          <div className="my-spells">
            <strong>Mes sortilèges personnels</strong>
            {mine.map((x) => (
              <p key={x.id}>
                {x.status === 'validated' ? '✍️' : x.status === 'pending' ? '⏳' : '↺'} « {x.text} »{' '}
                <span className="small-text muted">{x.status === 'validated' ? '· validé' : x.status === 'pending' ? '· en lecture' : '· à retravailler'}</span>
              </p>
            ))}
          </div>
        )}
        <p className="small-text muted">
          Révisé {p.reviews} fois
          {p.nextReview ? ` · prochaine révision le ${p.nextReview.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}
        </p>
      </section>
    </main>
  );
}
