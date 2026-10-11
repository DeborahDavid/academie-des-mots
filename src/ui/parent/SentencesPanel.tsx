import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/db';
import { addSentence, deleteSentence, setSentenceStatus, updateSentence } from '../../db/repo';
import type { Notion, Sentence, ValidationStatus } from '../../domain/model';

/** Phrases pour la dictée de phrase : rien n'est dicté à Leyu sans validation. */
export function SentencesPanel() {
  const sentences = useLiveQuery(() => db.sentences.orderBy('status').toArray(), []);
  const notions = useLiveQuery(() => db.notions.orderBy('order').toArray(), []);
  const [chosen, setChosen] = useState<ValidationStatus | null>(null);
  if (!sentences || !notions) return null;

  const pending = sentences.filter((s) => s.status === 'pending');
  const filter = chosen ?? (pending.length ? 'pending' : 'validated');
  const seen = new Set(notions.filter((n) => n.status === 'seen').map((n) => n.id));
  const label = new Map(notions.map((n) => [n.id, n.label]));
  const rows = sentences.filter((s) => s.status === filter).sort((a, b) => a.createdAt - b.createdAt);
  const usable = sentences.filter((s) => s.status === 'validated' && s.notionIds.every((n) => seen.has(n))).length;

  return (
    <div className="stack">
      <p className="notice small-text">
        Une phrase est dictée seulement si elle est <strong>validée</strong> et si <strong>toutes ses notions</strong> sont cochées « vue en classe » (onglet
        Notions). Actuellement : <strong>{usable}</strong> phrase{usable > 1 ? 's' : ''} utilisable{usable > 1 ? 's' : ''}.
      </p>
      <AddSentence notions={notions} />
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Phrases</h2>
          <div className="row">
            <select value={filter} onChange={(e) => setChosen(e.target.value as ValidationStatus)} aria-label="Filtre">
              <option value="pending">À valider ({pending.length})</option>
              <option value="validated">Validées ({sentences.filter((s) => s.status === 'validated').length})</option>
              <option value="rejected">Écartées ({sentences.filter((s) => s.status === 'rejected').length})</option>
            </select>
            {filter === 'pending' && pending.length > 0 && (
              <button className="primary" onClick={() => confirm(`Valider les ${pending.length} phrases après les avoir relues ?`) && pending.forEach((s) => setSentenceStatus(s.id, 'validated'))}>
                Tout valider
              </button>
            )}
          </div>
        </div>
        {rows.length === 0 && <p className="muted">Aucune phrase.</p>}
        {rows.map((s) => (
          <SentenceRow key={s.id} s={s} label={label} seen={seen} />
        ))}
      </section>
    </div>
  );
}

function SentenceRow({ s, label, seen }: { s: Sentence; label: Map<string, string>; seen: Set<string> }) {
  const missing = s.notionIds.filter((n) => !seen.has(n));
  return (
    <div className="vocab-row stack" style={{ gap: '0.4rem' }}>
      <input
        defaultValue={s.text}
        aria-label="Phrase"
        style={{ width: '100%' }}
        onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== s.text && updateSentence(s.id, { text: e.target.value })}
      />
      <span className="small-text muted">
        {s.notionIds.map((n) => (
          <span key={n} className={seen.has(n) ? '' : 'warn'}>
            {label.get(n) ?? n}
            {' · '}
          </span>
        ))}
        {missing.length > 0 && <span className="warn">notion(s) pas encore vue(s)</span>}
      </span>
      <div className="row">
        {s.status !== 'validated' && (
          <button className="primary small" onClick={() => setSentenceStatus(s.id, 'validated')}>
            Valider
          </button>
        )}
        {s.status !== 'rejected' && (
          <button className="ghost small" onClick={() => setSentenceStatus(s.id, 'rejected')}>
            Écarter
          </button>
        )}
        {s.source === 'parent' && (
          <button className="danger small" onClick={() => confirm('Supprimer cette phrase ?') && deleteSentence(s.id)}>
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function AddSentence({ notions }: { notions: Notion[] }) {
  const [text, setText] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const ok = text.trim().split(/\s+/).length >= 3 && ids.length > 0;
  return (
    <section className="card stack">
      <h2>Ajouter une phrase</h2>
      <p className="muted small-text">Idéalement 6 à 12 mots, avec des mots de la liste de la semaine. Cochez les notions travaillées.</p>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex. Les petits chats de la voisine dorment au soleil." style={{ width: '100%' }} />
      <div className="notion-picks">
        {notions.map((n) => (
          <label key={n.id} className={ids.includes(n.id) ? 'picked' : ''}>
            <input type="checkbox" checked={ids.includes(n.id)} onChange={(e) => setIds(e.target.checked ? [...ids, n.id] : ids.filter((x) => x !== n.id))} />
            {n.label}
          </label>
        ))}
      </div>
      <div className="row">
        <button className="primary" disabled={!ok} onClick={async () => (await addSentence(text, ids), setText(''), setIds([]))}>
          Ajouter (validée)
        </button>
      </div>
    </section>
  );
}
