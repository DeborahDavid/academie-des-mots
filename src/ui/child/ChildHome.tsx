import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getProgress } from '../../db/sessionRepo';
import { frTypo } from '../../domain/typo';
import { navigate } from '../../router';
import { Session } from './Session';

/** Écran provisoire : la tour, le ciel et les personnages arrivent avec la direction artistique. */
export function ChildHome() {
  const [session, setSession] = useState(0);
  const progress = useLiveQuery(() => getProgress(), [session]);

  if (session > 0)
    return <Session key={session} onExit={() => setSession(0)} onAgain={() => setSession((k) => k + 1)} />;

  return (
    <main className="child-home">
      <div className="hud">
        <span className={progress?.litToday ? 'flame on' : 'flame'} title="Jours de magie">
          🔥 {progress?.flameDays ?? 0}
        </span>
        <span className="gold" title="Points">
          ✦ {progress?.totalPoints ?? 0}
        </span>
      </div>
      <h1 className="title-gold">L’Académie des Mots</h1>
      <p className="muted">La Tour des meilleures amies et d’Ada</p>
      <button className="primary big" onClick={() => setSession(1)}>
        {progress?.litToday ? frTypo('Encore une séance !') : 'Commencer la séance'}
      </button>
      {progress?.litToday && <p className="muted small-text">{frTypo(`Flamme du jour allumée · ${progress.todayPoints} points aujourd’hui`)}</p>}
      <button className="ghost small parent-link" onClick={() => navigate('parent')} aria-label="Mode parent">
        🔒 Parent
      </button>
    </main>
  );
}
