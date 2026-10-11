import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getProductions, getVocabProgress, syncExplorerRank, type WordProgress } from '../../db/vocabRepo';
import { STAGES } from '../../domain/vocab';
import { Icon } from '../components/Icon';

const stageOf = (p: WordProgress) => STAGES.find((s) => s.id === p.info.stage)!;

/** Grimoire personnel : les mots rencontrés et leur état de maîtrise. Lisible, sans surcharge. */
export function Grimoire({ onBack }: { onBack: () => void }) {
  const progress = useLiveQuery(() => getVocabProgress(), []);
  const [open, setOpen] = useState<WordProgress | null>(null);
  const [rank, setRank] = useState<Awaited<ReturnType<typeof syncExplorerRank>> | null>(null);
  useEffect(() => {
    syncExplorerRank().then(setRank);
  }, [progress]);
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
      {rank && (
        <div className="rank-card">
          <span className="rank-name"><Icon name="medal" size={22} className="icon-inline" />{rank.rank.name}</span>
          {rank.next && rank.missing && (
            <span className="small-text muted">
              Pour devenir {rank.next.name} : encore{' '}
              {[
                rank.missing.understood && `${rank.missing.understood} mot${rank.missing.understood > 1 ? 's' : ''} compris`,
                rank.missing.used && `${rank.missing.used} mot${rank.missing.used > 1 ? 's' : ''} utilisé${rank.missing.used > 1 ? 's' : ''}`,
                rank.missing.mastered && `${rank.missing.mastered} mot${rank.missing.mastered > 1 ? 's' : ''} maîtrisé${rank.missing.mastered > 1 ? 's' : ''}`,
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          )}
        </div>
      )}
      <div className="stage-legend">
        {STAGES.slice(1).map((s) => (
          <span key={s.id}>
            <Icon name={s.icon} size={20} className="icon-inline" />{s.label} · {known.filter((p) => p.info.stage === s.id).length}
          </span>
        ))}
      </div>
      {known.length === 0 && <p className="muted">Ton grimoire est encore vide. Chaque mot découvert y sera écrit en lettres d’or.</p>}
      <div className="spell-grid">
        {known.map((p) => (
          <button key={p.word.id} className="spell-card" onClick={() => setOpen(p)}>
            <span className="spell-icon">
              <Icon name={stageOf(p).icon} size={34} />
            </span>
            <span className="spell-name">{p.word.lemma}</span>
            <span className="small-text muted">{stageOf(p).label}</span>
            {p.info.toConsolidate && <span className="small-text consolidate">à consolider</span>}
          </button>
        ))}
        {mysteries > 0 && (
          <div className="spell-card mystery">
            <span className="spell-icon">
              <Icon name="crystal" size={34} />
            </span>
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
          <Icon name={st.icon} size={22} className="icon-inline" />{st.label}
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
                <Icon name={x.status === 'validated' ? 'quill' : x.status === 'pending' ? 'hourglass' : 'redo'} size={20} className="icon-inline" />« {x.text} »{' '}
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
