import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { type AddWeekResult, addWeek, addWordToWeek, deleteWeek, suggestNextStartDate, updateWeek } from '../../db/repo';
import { LEVELS, type Level, type Week, type Word } from '../../domain/model';
import { parseWordList } from '../../domain/parseList';
import { WordRow } from './WordRow';

const LEVEL_LABEL: Record<Level, string> = { jaune: 'Jaune', vert: 'Vert', violet: 'Violet' };

export function WeeksPanel() {
  const weeks = useLiveQuery(() => db.weeks.orderBy('startDate').reverse().toArray(), []);
  const words = useLiveQuery(() => db.words.toArray(), []);
  if (!weeks || !words) return null;

  return (
    <div className="stack">
      <AddWeekForm weeks={weeks} />
      <h2 style={{ marginTop: '1rem' }}>
        Semaines saisies <span className="muted small-text">({weeks.length} semaines, {words.length} mots)</span>
      </h2>
      {weeks.length === 0 && <p className="muted">Aucune liste pour l’instant.</p>}
      {weeks.map((w, i) => (
        <WeekCard key={w.id} week={w} words={words.filter((x) => x.weekId === w.id)} defaultOpen={i === 0} />
      ))}
    </div>
  );
}

function AddWeekForm({ weeks }: { weeks: Week[] }) {
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [texts, setTexts] = useState<Record<Level, string>>({ jaune: '', vert: '', violet: '' });
  const [result, setResult] = useState<AddWeekResult | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveLabel = label.trim() || `Semaine ${weeks.length + 1}`;
  const effectiveDate = date || suggestNextStartDate(weeks);
  const parsed = LEVELS.flatMap((level) => parseWordList(texts[level]).map((entry) => ({ level, entry })));

  async function submit() {
    setBusy(true);
    try {
      const r = await addWeek({ label: effectiveLabel, startDate: effectiveDate, entries: parsed });
      setResult(r);
      setLabel('');
      setDate('');
      setTexts({ jaune: '', vert: '', violet: '' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <h2>Ajouter une liste</h2>
      {weeks.length === 0 && (
        <div className="row">
          <button
            className="ghost"
            onClick={() =>
              setTexts({
                jaune: 'la forêt | Le loup se cache dans la forêt.\nun château | Le roi habite dans un grand château.\ngrand | Mon frère est très grand. | Pense à « grande » pour la lettre muette.',
                vert: 'soudain | Soudain, le chat a sauté sur la table.\naujourd’hui | Aujourd’hui, il fait beau.',
                violet: 'la lumière | La lumière de la bougie éclaire la pièce.',
              })
            }
          >
            Essayer avec une liste d’exemple
          </button>
          <span className="muted small-text">Remplit les zones ci-dessous ; cliquez ensuite sur « Ajouter ». Vous pourrez supprimer cette semaine après.</span>
        </div>
      )}
      {weeks.length === 0 && (
        <p className="notice small-text">
          Pour rattraper les semaines depuis la rentrée : ajoutez-les une par une, <strong>de la plus ancienne à la plus récente</strong>.
          L’application introduira ces mots progressivement (quelques nouveaux par séance, la semaine en cours en priorité).
        </p>
      )}
      <div className="row">
        <div>
          <label htmlFor="wk-label">Nom</label>
          <input id="wk-label" value={label} placeholder={effectiveLabel} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label htmlFor="wk-date">Semaine du</label>
          <input id="wk-date" type="date" value={effectiveDate} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="level-grid">
        {LEVELS.map((level) => (
          <div key={level}>
            <label htmlFor={`wk-${level}`}>
              <span className={`level-pill level-${level}`} />
              {LEVEL_LABEL[level]} — un mot par ligne
            </label>
            <textarea
              id={`wk-${level}`}
              rows={7}
              value={texts[level]}
              onChange={(e) => setTexts({ ...texts, [level]: e.target.value })}
              spellCheck={false}
            />
          </div>
        ))}
      </div>
      <p className="muted small-text">
        Format optionnel par ligne : <code>mot | phrase de contexte | indice</code> — ex.{' '}
        <code>grand | Le chêne est très grand. | Pense à « grande » pour la lettre muette.</code> Vous pourrez compléter phrases,
        indices et enregistrements après.
      </p>
      <div className="row">
        <button className="primary" disabled={busy || parsed.length === 0} onClick={submit}>
          Ajouter {parsed.length > 0 ? `${parsed.length} mot${parsed.length > 1 ? 's' : ''}` : ''} — {effectiveLabel}
        </button>
        <span className="muted small-text">La lune avancera d’une phase.</span>
      </div>
      {result && (
        <p className="ok small-text">
          « {result.week.label} » ajoutée : {result.added} mot(s).
          {result.duplicates.length > 0 && (
            <span className="warn"> Déjà présents dans une semaine précédente (non ajoutés) : {result.duplicates.join(', ')}.</span>
          )}
        </p>
      )}
    </section>
  );
}

function WeekCard({ week, words, defaultOpen }: { week: Week; words: Word[]; defaultOpen: boolean }) {
  const [newWord, setNewWord] = useState('');
  const [newLevel, setNewLevel] = useState<Level>('jaune');
  const missingContext = words.filter((w) => !w.context && !w.audioId).length;

  async function add() {
    const [entry] = parseWordList(newWord);
    if (!entry) return;
    const ok = await addWordToWeek(week.id, newLevel, entry);
    if (!ok) alert(`« ${entry.text} » existe déjà dans une liste.`);
    else setNewWord('');
  }

  async function remove() {
    if (confirm(`Supprimer « ${week.label} » et ses ${words.length} mots, avec leur historique de révision ?`)) await deleteWeek(week.id);
  }

  return (
    <details className="card week" open={defaultOpen}>
      <summary>
        <span>
          <strong>{week.label}</strong> <span className="muted small-text">· semaine du {formatDate(week.startDate)} · {words.length} mots</span>
        </span>
        {missingContext > 0 && <span className="muted small-text">{missingContext} sans phrase de contexte</span>}
      </summary>
      <div className="stack" style={{ marginTop: '1rem' }}>
        <div className="row">
          <input defaultValue={week.label} aria-label="Nom de la semaine" onBlur={(e) => updateWeek(week.id, { label: e.target.value.trim() || week.label })} />
          <input type="date" defaultValue={week.startDate} aria-label="Date" onBlur={(e) => e.target.value && updateWeek(week.id, { startDate: e.target.value })} />
        </div>
        {LEVELS.map((level) => {
          const ws = words.filter((w) => w.level === level).sort((a, b) => a.createdAt - b.createdAt || a.text.localeCompare(b.text));
          if (!ws.length) return null;
          return (
            <div key={level}>
              <h3>
                <span className={`level-pill level-${level}`} />
                {LEVEL_LABEL[level]}
              </h3>
              <div className="muted small-text word-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <span>Mot</span>
                <span>Phrase de contexte (lue avant le mot)</span>
                <span>Indice personnalisé</span>
                <span />
              </div>
              {ws.map((w) => (
                <WordRow key={w.id} word={w} />
              ))}
            </div>
          );
        })}
        <div className="row">
          <input value={newWord} placeholder="Ajouter un mot" onChange={(e) => setNewWord(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <select value={newLevel} onChange={(e) => setNewLevel(e.target.value as Level)} aria-label="Niveau">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
          <button className="small" onClick={add} disabled={!newWord.trim()}>
            Ajouter
          </button>
          <span style={{ flex: 1 }} />
          <button className="danger small" onClick={remove}>
            Supprimer la semaine
          </button>
        </div>
      </div>
    </details>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
