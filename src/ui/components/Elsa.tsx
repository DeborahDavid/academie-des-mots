import { frTypo } from '../../domain/typo';
import { usePortraitUrl } from './Portrait';

export type ElsaExpression = 'contente' | 'concentree' | 'grimace' | 'fiere';

const FACE: Record<ElsaExpression, string> = { contente: '😊', concentree: '🙂', grimace: '😜', fiere: '🤩' };

/**
 * Elsa, version provisoire (étape 4 : personnage SVG chibi).
 * Image statique : aucune animation.
 */
export function Elsa({ expression, line }: { expression: ElsaExpression; line?: string }) {
  const url = usePortraitUrl('elsa');
  return (
    <div className="elsa">
      {url ? (
        <div className="portrait" style={{ width: 96, height: 96 }} aria-hidden>
          <img src={url} alt="" />
        </div>
      ) : (
        <div className="elsa-face" aria-hidden>
          {FACE[expression]}
        </div>
      )}
      {line && <div className="bubble">{frTypo(line)}</div>}
    </div>
  );
}
