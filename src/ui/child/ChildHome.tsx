import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getProgress } from '../../db/sessionRepo';
import { updateSettings } from '../../db/repo';
import { getSky, getWardrobe, syncUnlocks } from '../../db/rewardsRepo';
import { WindowSky } from './home/WindowSky';
import { Sparkles } from './home/Sparkles';
import { AdaSleeping } from './home/AdaSleeping';
import { HELLO_LINES, randomLine } from '../../domain/lines';
import { startTheme, stopTheme } from '../../speech/music';
import { audio } from '../../speech/sfx';
import { syncExplorerRank } from '../../db/vocabRepo';
import { nextReward } from '../../domain/rewards';
import { frTypo } from '../../domain/typo';
import { navigate } from '../../router';
import { Avatar } from '../components/Avatar';
import { Portrait, usePortraitUrl } from '../components/Portrait';
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
  const sky = useLiveQuery(() => getSky(), [session]);
  const settings = useSettings();
  const duoUrl = usePortraitUrl('duo');
  const leyuFace = usePortraitUrl('leyu');
  const elsaFace = usePortraitUrl('elsa');
  // Arrivée (~2 s) : le ciel s'illumine, Elsa dit bonjour, Ada ouvre un œil puis se rendort.
  const [arrival, setArrival] = useState<'sky' | 'hello' | 'eye' | 'idle'>('sky');
  useEffect(() => {
    if (session > 0 || screen !== 'home') return;
    setArrival('sky');
    const t = [setTimeout(() => setArrival('hello'), 700), setTimeout(() => setArrival('eye'), 1100), setTimeout(() => setArrival('idle'), 1900)];
    return () => t.forEach(clearTimeout);
  }, [session, screen]);
  const [hello] = useState(() => randomLine(HELLO_LINES));
  // Grand écran : fenêtre panoramique.
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Thème musical : écran principal et lieux calmes ; silence pendant la dictée et la quête.
  const working = session > 0 || screen === 'quest';
  const musicWanted = !!settings && !settings.muted && settings.musicOn !== false && !working;
  useEffect(() => {
    if (!musicWanted) {
      stopTheme();
      return;
    }
    // Le navigateur n'autorise le son qu'après un geste : on démarre au premier toucher si besoin.
    const ac = audio();
    if (ac?.state === 'running') {
      startTheme();
      return stopTheme;
    }
    const start = () => startTheme();
    window.addEventListener('pointerdown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      stopTheme();
    };
  }, [musicWanted]);

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
  const motion = settings?.animations !== false;

  return (
    <main className={`home2 ${motion ? '' : 'no-motion'} arrive-${arrival}`}>
      <div className="h2-wall" aria-hidden>
        <span className="lamp-glow left" />
        <span className="lamp-glow right" />
        <Garland />
      </div>

      <header className="h2-bar">
        <button className="h2-icon" onClick={() => navigate('parent')} aria-label="Mode parent" title="Mode parent">
          🔒
        </button>
        <div className="h2-pills">
          <span className={`h2-pill ${progress?.litToday ? 'lit' : ''}`} title="Jours de magie">
            🔥 {progress?.flameDays ?? 0}
          </span>
          <span className="h2-pill" title="Points">
            ✦ {progress?.totalPoints ?? 0}
          </span>
        </div>
        <div className="h2-icons">
          <button
            className={`h2-icon ${settings?.musicOn === false ? 'off' : ''}`}
            onClick={() => updateSettings({ musicOn: settings?.musicOn === false })}
            aria-label={settings?.musicOn === false ? 'Activer la musique' : 'Couper la musique'}
            title={settings?.musicOn === false ? 'Activer la musique' : 'Couper la musique'}
          >
            🎵
          </button>
          <button
            className={`h2-icon ${settings?.muted ? 'off' : ''}`}
            onClick={() => updateSettings({ muted: !settings?.muted })}
            aria-label={settings?.muted ? 'Activer les sons' : 'Couper les sons'}
            title={settings?.muted ? 'Activer les sons' : 'Couper les sons'}
          >
            {settings?.muted ? '🔕' : '🔔'}
          </button>
        </div>
      </header>

      <div className="h2-title">
        <h1>L’Académie des Mots</h1>
      </div>

      <section className="h2-room">
        <div className="h2-window">
          <div className="h2-plaque">La Tour des meilleures amies et d’Ada</div>
          <div className="h2-glass">
            {sky && <WindowSky stars={sky.stars} moonPhase={sky.moonPhase} constellations={sky.constellations} wide={wide} />}
            {motion && <Sparkles count={16} seed={5} />}
          </div>
          <div className="h2-sill" />
        </div>
        <div className="h2-ada">
          <AdaSleeping awake={arrival === 'eye'} />
        </div>
        <div className={`h2-friends ${duoUrl ? '' : 'faces'}`}>
          {duoUrl ? (
            <img src={duoUrl} alt="Leyu et Elsa, les meilleures amies" />
          ) : (
            <div className="h2-faces">
              {leyuFace ? <img src={leyuFace} alt="Leyu" /> : <Avatar worn={wardrobe?.worn ?? []} size={150} />}
              {elsaFace ? <img src={elsaFace} alt="Elsa" className="elsa" /> : <Portrait who="elsa" size={110} fallback="😊" />}
            </div>
          )}
          <div className={`h2-bubble ${arrival === 'sky' ? 'hidden' : ''}`}>{frTypo(hello)}</div>
          <span className="h2-title-chip">{settings?.titles[0] ?? 'Titre 1'}</span>
        </div>
      </section>

      <nav className="h2-quests" aria-label="Les deux parcours">
        <button className="h2-quest spells" onClick={() => setSession(1)}>
          <span className="h2-medal">🪄</span>
          <span className="h2-quest-text">
            <strong>La Salle des Sortilèges</strong>
            <span>{progress?.litToday ? frTypo('Encore une séance !') : 'Dictée du jour'}</span>
          </span>
        </button>
        <button className="h2-quest words" onClick={() => setScreen('quest')}>
          <span className="h2-medal">🔭</span>
          <span className="h2-quest-text">
            <strong>L’Exploratrice des mots</strong>
            <span>{rankName || 'Quête de vocabulaire'}</span>
          </span>
        </button>
      </nav>

      <nav className="h2-more" aria-label="Autres lieux">
        <button onClick={() => setScreen('path')}>
          <span className="h2-badge">🗺️</span>
          <span>Parcours</span>
        </button>
        <button onClick={() => setScreen('grimoire')}>
          <span className="h2-badge">📖</span>
          <span>Grimoire</span>
        </button>
        <button onClick={() => setScreen('wardrobe')} title={next && np ? `Prochaine récompense : ${next.name} (${np.current}/${np.target})` : undefined}>
          <span className="h2-badge">
            👗
            {next && np && (
              <span className="h2-ring" style={{ ['--p' as string]: `${(100 * np.current) / np.target}%` }} aria-hidden />
            )}
          </span>
          <span>Garde-robe</span>
        </button>
      </nav>
      {progress?.litToday && <p className="h2-note">{frTypo(`Flamme du jour allumée · ${progress.todayPoints} points aujourd’hui`)}</p>}
    </main>
  );
}

/** Guirlande lumineuse : petites ampoules chaudes accrochées en haut de la pièce (couleurs de la palette). */
function Garland() {
  const colors = ['#FFC85C', '#F7A8BE', '#8FDCD7', '#FFE08A', '#C4B2F2'];
  return (
    <div className="h2-garland" aria-hidden>
      {Array.from({ length: 19 }, (_, i) => (
        <span
          key={i}
          className="bulb"
          style={{
            left: `${3 + i * 5.2}%`,
            top: `${14 + Math.sin((i / 18) * Math.PI * 3) * 8 + 8}px`,
            background: colors[i % colors.length],
            color: colors[i % colors.length],
            animationDelay: `${((i * 0.37) % 4).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}
