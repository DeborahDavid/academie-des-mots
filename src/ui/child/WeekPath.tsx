import { useLiveQuery } from 'dexie-react-hooks';
import { getWeekPath } from '../../db/rewardsRepo';
import type { StopState, WeekStop } from '../../domain/path';
import { Icon, type IconName } from '../components/Icon';

const STATE: Record<StopState, { icon: IconName; label: string }> = {
  avenir: { icon: 'lock', label: 'À venir' },
  encours: { icon: 'sparkles', label: 'En cours' },
  completee: { icon: 'star', label: 'Tous les mots en bonne voie' },
  maitrisee: { icon: 'crown', label: 'Maîtrisée !' },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** Parcours de la dictée : chaque liste hebdomadaire est une étape du chemin vers la tour. */
export function WeekPath({ onBack }: { onBack: () => void }) {
  const stops = useLiveQuery(() => getWeekPath(), []);
  if (!stops) return null;
  const totals = stops.reduce((t, s) => ({ total: t.total + s.total, onTrack: t.onTrack + s.onTrack, acquired: t.acquired + s.acquired }), { total: 0, onTrack: 0, acquired: 0 });

  return (
    <main className="wardrobe">
      <header className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <button className="ghost" onClick={onBack}>
          ← Retour
        </button>
        <h1 className="title-gold" style={{ fontSize: '2rem' }}>
          Mon parcours
        </h1>
        <span style={{ width: 90 }} />
      </header>
      {stops.length === 0 ? (
        <p className="muted">Le chemin commencera avec la première liste de mots.</p>
      ) : (
        <>
          <p className="muted">
            {totals.onTrack} mot{totals.onTrack > 1 ? 's' : ''} en bonne voie · {totals.acquired} acquis · sur {totals.total}
          </p>
          <ol className="path">
            {/* Le plus récent en haut, près de la tour : on monte vers elle semaine après semaine. */}
            {[...stops].reverse().map((s, i) => (
              <Stop key={s.weekId} stop={s} side={i % 2 === 0 ? 'left' : 'right'} current={i === 0} />
            ))}
            <li className="path-start"><Icon name="flag" size={20} className="icon-inline" />Rentrée</li>
          </ol>
        </>
      )}
    </main>
  );
}

function Stop({ stop, side, current }: { stop: WeekStop; side: 'left' | 'right'; current: boolean }) {
  const st = STATE[stop.state];
  const pct = stop.total ? Math.round((100 * stop.onTrack) / stop.total) : 0;
  return (
    <li className={`path-stop ${side} ${stop.state} ${current ? 'current' : ''}`}>
      <div className="stop-node" aria-hidden>
        <Icon name={st.icon} size={30} />
      </div>
      <div className="stop-card">
        <strong>{stop.label}</strong>
        <span className="small-text muted">
          semaine du {formatDate(stop.startDate)}
          {current ? ' · cette semaine' : ''}
        </span>
        <span className="small-text">{st.label}</span>
        <span className="bar" aria-label={`${pct} % en bonne voie`}>
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className="small-text muted">
          {stop.onTrack}/{stop.total} en bonne voie · {stop.acquired} acquis
        </span>
      </div>
    </li>
  );
}
