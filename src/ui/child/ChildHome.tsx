import { useState } from 'react';
import { navigate } from '../../router';
import { Session } from './Session';

/** Écran provisoire : la tour, le ciel et les personnages arrivent à l'étape 4. */
export function ChildHome() {
  const [inSession, setInSession] = useState(false);
  if (inSession) return <Session onExit={() => setInSession(false)} />;
  return (
    <main className="child-home">
      <h1 className="title-gold">L’Académie des Mots</h1>
      <p className="muted">La Tour des meilleures amies et d’Ada</p>
      <button className="primary big" onClick={() => setInSession(true)}>
        Commencer la séance
      </button>
      <button className="ghost small parent-link" onClick={() => navigate('parent')} aria-label="Mode parent">
        🔒 Parent
      </button>
    </main>
  );
}
