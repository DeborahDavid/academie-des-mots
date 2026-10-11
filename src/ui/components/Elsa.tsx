export type ElsaExpression = 'contente' | 'concentree' | 'grimace' | 'fiere';

const FACE: Record<ElsaExpression, string> = { contente: '😊', concentree: '🙂', grimace: '😜', fiere: '🤩' };

/**
 * Elsa, version provisoire (étape 4 : personnage SVG chibi).
 * Image statique : aucune animation.
 */
export function Elsa({ expression, line }: { expression: ElsaExpression; line?: string }) {
  return (
    <div className="elsa">
      <div className="elsa-face" aria-hidden>
        {FACE[expression]}
      </div>
      {line && <div className="bubble">{line}</div>}
    </div>
  );
}
