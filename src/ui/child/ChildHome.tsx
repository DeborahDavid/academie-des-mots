import { navigate } from '../../router';

/** Écran provisoire : la tour, le ciel et la séance arrivent aux étapes 2 à 4. */
export function ChildHome() {
  return (
    <main className="child-home">
      <h1 className="title-gold">L’Académie des Mots</h1>
      <p className="muted">La Tour des meilleures amies et d’Ada ouvre bientôt ses portes…</p>
      <button className="ghost small parent-link" onClick={() => navigate('parent')} aria-label="Mode parent">
        🔒 Parent
      </button>
    </main>
  );
}
