import { useLiveQuery } from 'dexie-react-hooks';
import { getWardrobe, setWorn } from '../../db/rewardsRepo';
import { REWARDS, type RewardId, wearNew } from '../../domain/rewards';
import { frTypo } from '../../domain/typo';
import { Avatar, RewardIcon } from '../components/Avatar';
import { MangaPanel, usePortraitUrl } from '../components/Portrait';

/** Garde-robe : tout ce qui est gagné est combinable. Rien ne s'achète, tout se gagne par la maîtrise. */
export function Wardrobe({ onBack }: { onBack: () => void }) {
  // liveQuery suit les tables lues : se met à jour quand la tenue portée change.
  const wardrobe = useLiveQuery(() => getWardrobe(), []);
  const hasArt = !!usePortraitUrl('leyu-pied');
  if (!wardrobe) return null;
  const { unlocked, worn, stats } = wardrobe;

  function toggle(id: RewardId) {
    setWorn(worn.includes(id) ? worn.filter((w) => w !== id) : wearNew(worn, id));
  }

  return (
    <main className="wardrobe">
      <header className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <button className="ghost" onClick={onBack}>
          ← Retour
        </button>
        <h1 className="title-gold" style={{ fontSize: '2rem' }}>
          Garde-robe
        </h1>
        <span style={{ width: 90 }} />
      </header>
      <div className="wardrobe-body">
        <div className="wardrobe-avatar">
          {hasArt ? (
            <MangaPanel slot="leyu-pied" height={380}>
              <span className="charms">
                {worn.map((id) => (
                  <span key={id} className="charm">
                    <RewardIcon id={id} />
                  </span>
                ))}
              </span>
            </MangaPanel>
          ) : (
            <>
              <Avatar worn={worn} size={260} />
              <p className="muted small-text">Maillot et cape toujours portés</p>
            </>
          )}
        </div>
        <div className="wardrobe-items">
          {REWARDS.map((r) => {
            const got = unlocked.has(r.id);
            const p = r.progress(stats);
            return (
              <button key={r.id} className={`reward ${got ? 'got' : 'locked'} ${worn.includes(r.id) ? 'worn' : ''}`} disabled={!got} onClick={() => toggle(r.id)}>
                <span className="reward-icon">{got ? <RewardIcon id={r.id} /> : '🔒'}</span>
                <span className="reward-text">
                  <strong>{r.name}</strong>
                  {got ? (
                    <span className="small-text">{worn.includes(r.id) ? 'Portée · touche pour l’enlever' : 'Touche pour la mettre'}</span>
                  ) : (
                    <>
                      <span className="small-text muted">{frTypo(r.goal)}</span>
                      <span className="bar">
                        <span style={{ width: `${(100 * p.current) / p.target}%` }} />
                      </span>
                      <span className="small-text muted">
                        {p.current} / {p.target} {p.unit}
                      </span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
