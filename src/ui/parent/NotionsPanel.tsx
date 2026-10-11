import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { setNotionStatus } from '../../db/repo';
import type { Notion } from '../../domain/model';

export function NotionsPanel() {
  const notions = useLiveQuery(() => db.notions.orderBy('order').toArray(), []);
  if (!notions) return null;

  const groups = new Map<string, Notion[]>();
  for (const n of notions) groups.set(n.group, [...(groups.get(n.group) ?? []), n]);

  return (
    <div className="stack">
      <p className="muted">Cochez les notions vues en classe. Seules celles-ci apparaîtront dans les exercices de Leyu.</p>
      {[...groups].map(([group, ns]) => (
        <section key={group} className="card">
          <h3>{group}</h3>
          <div className="voice-list">
            {ns.map((n) => (
              <label key={n.id}>
                <input type="checkbox" checked={n.status === 'seen'} onChange={(e) => setNotionStatus(n.id, e.target.checked)} style={{ minHeight: 0, width: 22, height: 22 }} />
                {n.label}
                {n.status === 'seen' && <span className="muted small-text">· guidage niveau {n.guidanceLevel}</span>}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
