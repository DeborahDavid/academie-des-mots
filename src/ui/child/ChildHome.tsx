import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getProgress } from '../../db/sessionRepo';
import { updateSettings } from '../../db/repo';
import { getWardrobe, syncUnlocks } from '../../db/rewardsRepo';
import { syncExplorerRank } from '../../db/vocabRepo';
import { nextReward } from '../../domain/rewards';
import { frTypo } from '../../domain/typo';
import { navigate } from '../../router';
import { Avatar } from '../components/Avatar';
import { MangaPanel, Portrait, usePortraitUrl } from '../components/Portrait';
import { RewardIcon } from '../components/Avatar';
import { useSettings } from '../hooks';
import { Session } from './Session';
import { Wardrobe } from './Wardrobe';
import { VocabQuest } from './VocabQuest';
import { Grimoire } from './Grimoire';
import { WeekPath } from './WeekPath';

/** Écran principal provisoire : la tour et le ciel arrivent avec les illustrations. */
export function ChildHome() {
  const [session, setSession] = useState(0);
  const [screen, setScreen] = useState<'home' | 'wardrobe' | 'quest' | 'grimoire' | 'path'>('home');
  const progress = useLiveQuery(() => getProgress(), [session]);
  const wardrobe = useLiveQuery(() => getWardrobe(), [session]);
  const settings = useSettings();
  const hasLeyuArt = !!usePortraitUrl('leyu-pied');
  const hasElsaArt = !!usePortraitUrl('elsa-buste');

  const [rankName, setRankName] = useState('');
  useEffect(() => {
    syncUnlocks();
    syncExplorerRank().then((r) => setRankName(r.rank.name));
  }, [session, screen]);

  if (session > 0) return <Session key={session} onExit={() => setSession(0)} onAgain={() => setSession((k) => k + 1)} />;
  if (screen === 'wardrobe') return <Wardrobe onBack={() => setScreen('home')} />;
  if (screen === 'quest') return <VocabQuest onExit={() => setScreen('home')} onGrimoire={() => setScreen('grimoire')} />;
  if (screen === 'grimoire') return <Grimoire onBack={() => setScreen('home')} />;
  if (screen === 'path') return <WeekPath onBack={() => setScreen('home')} />;

  const next = wardrobe && nextReward(wardrobe.unlocked, wardrobe.stats);
  const np = next && wardrobe ? next.progress(wardrobe.stats) : null;

  return (
    <main className="child-home">
      <div className="hud">
        <span className={progress?.litToday ? 'flame on' : 'flame'} title="Jours de magie">
          🔥 {progress?.flameDays ?? 0}
        </span>
        <span className="gold" title="Points">
          ✦ {progress?.totalPoints ?? 0}
        </span>
        <button
          className="ghost small"
          onClick={() => updateSettings({ muted: !settings?.muted })}
          aria-label={settings?.muted ? 'Activer les sons' : 'Couper les sons'}
          title={settings?.muted ? 'Activer les sons' : 'Couper les sons'}
        >
          {settings?.muted ? '🔕' : '🔔'}
        </button>
      </div>
      <h1 className="title-gold">L’Académie des Mots</h1>
      <p className="muted">La Tour des meilleures amies et d’Ada</p>
      <div className="friends">
        <div className="friend">
          {hasLeyuArt ? (
            <MangaPanel slot="leyu-pied" height={400}>
              <span className="panel-caption">{settings?.titles[0] ?? 'Titre 1'}</span>
              {!!wardrobe?.unlocked.size && (
                <span className="charms" aria-label="Mes trésors">
                  {[...wardrobe.unlocked].map((id) => (
                    <span key={id} className="charm">
                      <RewardIcon id={id} />
                    </span>
                  ))}
                </span>
              )}
            </MangaPanel>
          ) : (
            <>
              <Avatar worn={wardrobe?.worn ?? []} size={190} />
              <span className="title-chip">{settings?.titles[0] ?? 'Titre 1'}</span>
            </>
          )}
        </div>
        <div className="friend tilt">
          {hasElsaArt ? (
            <MangaPanel slot="elsa-buste" height={300}>
              <span className="panel-caption">Elsa</span>
            </MangaPanel>
          ) : (
            <>
              <Portrait who="elsa" size={130} fallback="😊" />
              <span className="muted small-text">Elsa</span>
            </>
          )}
        </div>
      </div>
      <div className="places">
        <button className="place" onClick={() => setSession(1)}>
          <span className="place-icon">🪄</span>
          <span className="place-name">La Salle des Sortilèges</span>
          <span className="small-text muted">{progress?.litToday ? frTypo('Encore une séance !') : 'Dictée du jour'}</span>
        </button>
        <button className="place" onClick={() => setScreen('quest')}>
          <span className="place-icon">🔭</span>
          <span className="place-name">L’Exploratrice des mots</span>
          <span className="small-text muted">{rankName || 'Quête de vocabulaire'}</span>
        </button>
        <button className="place small-place" onClick={() => setScreen('path')}>
          <span className="place-icon">🗺️</span>
          <span className="place-name">Mon parcours</span>
        </button>
        <button className="place small-place" onClick={() => setScreen('grimoire')}>
          <span className="place-icon">📖</span>
          <span className="place-name">Mon grimoire</span>
        </button>
      </div>
      {progress?.litToday && <p className="muted small-text">{frTypo(`Flamme du jour allumée · ${progress.todayPoints} points aujourd’hui`)}</p>}
      <button className="next-reward" onClick={() => setScreen('wardrobe')}>
        <span>👗 Garde-robe</span>
        {next && np && (
          <span className="small-text">
            {frTypo(`Prochaine récompense : ${next.name} — ${np.current}/${np.target} ${np.unit}`)}
            <span className="bar">
              <span style={{ width: `${(100 * np.current) / np.target}%` }} />
            </span>
          </span>
        )}
      </button>
      <button className="ghost small parent-link" onClick={() => navigate('parent')} aria-label="Mode parent">
        🔒 Parent
      </button>
    </main>
  );
}
