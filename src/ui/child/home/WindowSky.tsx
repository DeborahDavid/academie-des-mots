import { moonLitPath, shapeById } from '../../../domain/constellations';
import { ConstellationArt } from '../../components/Sky';

const H = 520;
/** Emplacements des constellations dans la fenêtre (centre x, centre y, taille). */
const SLOTS: [number, number, number][] = [
  [150, 150, 125], [330, 105, 110], [455, 230, 105], [215, 285, 95], [400, 330, 85], [105, 330, 78], [300, 215, 75], [520, 360, 70],
];

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function star4(cx: number, cy: number, r: number) {
  const k = r * 0.28;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

/**
 * Le ciel du soir vu par la grande fenêtre ronde : bleu du soir → lavande → rose près de l'horizon,
 * une étoile dorée par mot acquis, une constellation par notion maîtrisée, la lune de la semaine,
 * et les toits du village qui s'allument au loin.
 */
export function WindowSky({ stars, moonPhase, constellations, wide = false }: { stars: number; moonPhase: number; constellations: { shapeId: string; notion: string }[]; wide?: boolean }) {
  // Fenêtre panoramique : le ciel s'étire en largeur (les formes gardent leurs proportions).
  const W = wide ? 960 : 600;
  const sx = W / 600;
  const r = rng(11);
  const dust = Array.from({ length: 90 }, () => [r() * W, Math.pow(r(), 1.6) * H * 0.78, r() * 1.2 + 0.3, r() * 0.6 + 0.25]);
  const earned = Array.from({ length: Math.min(stars, 160) }, () => [r() * W, 20 + Math.pow(r(), 1.3) * H * 0.62]);
  const moon = moonLitPath(moonPhase, 34);
  return (
    <svg className="window-sky" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="h2sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E3477" />
          <stop offset="0.42" stopColor="#4F58A3" />
          <stop offset="0.72" stopColor="#9F94DA" />
          <stop offset="0.9" stopColor="#E9B4CC" />
          <stop offset="1" stopColor="#FFD3B5" />
        </linearGradient>
        <radialGradient id="h2moonglow">
          <stop offset="0" stopColor="#FFF4D2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFF4D2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="h2starglow">
          <stop offset="0" stopColor="#FFE7A3" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE7A3" stopOpacity="0" />
        </radialGradient>
        <filter id="h2soft">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#h2sky)" />
      {/* nuages roses du soir, très doux */}
      <g filter="url(#h2soft)" opacity="0.55" transform={`scale(${sx} 1)`}>
        <ellipse cx="120" cy="380" rx="150" ry="22" fill="#F6C3D6" />
        <ellipse cx="470" cy="355" rx="170" ry="20" fill="#E6C3EE" />
        <ellipse cx="300" cy="420" rx="220" ry="18" fill="#FFD9C2" />
      </g>
      {dust.map(([x, y, s, o], i) => (
        <circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity={o} />
      ))}
      {earned.map(([x, y], i) => (
        <g key={`e${i}`} className="sky-earned" style={{ animationDelay: `${(i * 0.61) % 7}s` }}>
          <circle cx={x} cy={y} r="9" fill="url(#h2starglow)" />
          <path d={star4(x, y, 6)} fill="#FFE08A" />
        </g>
      ))}
      {constellations.slice(0, SLOTS.length).map((c, i) => {
        const shape = shapeById(c.shapeId);
        const [x, y, size] = SLOTS[i];
        return shape ? <ConstellationArt key={c.shapeId + i} shape={shape} x={x * sx} y={y} size={size} title={`${shape.name} — ${c.notion}`} /> : null;
      })}
      <g transform={`translate(${Math.round(W * 0.76)} 128)`}>
        <circle r="70" fill="url(#h2moonglow)" />
        <circle r="34" fill="#4A4F92" opacity="0.65" />
        {moon.d && <path d={moon.d} fill="#FFF3CC" transform={moon.mirror ? 'scale(-1 1)' : undefined} />}
      </g>
      {/* collines et toits du village au loin, fenêtres allumées */}
      <g transform={`scale(${sx} 1)`}>
        <path d="M0 470 Q90 438 180 456 T360 450 T600 452 V520 H0 Z" fill="#7E6BB0" opacity="0.75" />
        <path d="M0 492 Q120 470 240 486 T480 480 T600 486 V520 H0 Z" fill="#6A5A9E" />
      </g>
      {[[70, 478], [96, 482], [268, 470], [292, 474], [430, 476], [470, 470], [540, 480]].map(([x, y], i) => (
        <rect key={i} x={x * sx} y={y} width="5" height="6" rx="1.5" fill="#FFD27A" opacity="0.95" />
      ))}
    </svg>
  );
}
