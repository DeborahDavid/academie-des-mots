import { type ConstellationShape, moonLitPath, shapeById } from '../../domain/constellations';

const W = 1000;
const H = 300;
/** Emplacements des constellations dans le ciel (centre x, centre y, taille). */
const SLOTS: [number, number, number][] = [
  [130, 95, 120], [330, 170, 110], [540, 90, 115], [740, 175, 105], [230, 235, 85], [640, 240, 85], [880, 230, 80], [440, 230, 80],
];

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function starPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
}

export function ConstellationArt({ shape, x, y, size, title }: { shape: ConstellationShape; x: number; y: number; size: number; title?: string }) {
  const k = size / 100;
  const p = (i: number) => [x - size / 2 + shape.stars[i][0] * k, y - size / 2 + shape.stars[i][1] * k];
  return (
    <g className="constellation">
      {title && <title>{title}</title>}
      {shape.lines.map(([a, b], i) => {
        const [x1, y1] = p(a);
        const [x2, y2] = p(b);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f2c879" strokeOpacity="0.55" strokeWidth="1.6" />;
      })}
      {shape.stars.map((_, i) => {
        const [cx, cy] = p(i);
        return <polygon key={i} points={starPoints(cx, cy, 4.2)} fill="#f8dc8e" />;
      })}
    </g>
  );
}

/**
 * Ciel derrière la fenêtre de la tour. Sur l'écran principal, les étoiles gagnées scintillent très lentement
 * (désactivé si l'appareil demande moins d'animations) ; ce ciel n'apparaît jamais pendant un exercice.
 */
export function Sky({ stars, moonPhase, constellations }: { stars: number; moonPhase: number; constellations: { shapeId: string; notion: string }[] }) {
  const r = rng(7);
  const background = Array.from({ length: 70 }, () => [r() * W, r() * H, r() * 1.1 + 0.3, r() * 0.5 + 0.2]);
  const earned = Array.from({ length: Math.min(stars, 300) }, () => [r() * W, r() * H * 0.95 + 6]);
  const moon = moonLitPath(moonPhase, 30);
  return (
    <svg className="sky-band" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
      {background.map(([x, y, s, o], i) => (
        <circle key={`b${i}`} cx={x} cy={y} r={s} fill="#fff" opacity={o} />
      ))}
      {earned.map(([x, y], i) => (
        <polygon key={`e${i}`} className="earned-star" style={{ animationDelay: `${(i * 0.73) % 6}s` }} points={starPoints(x, y, 5)} fill="#f2c879" />
      ))}
      {constellations.slice(0, SLOTS.length).map((c, i) => {
        const shape = shapeById(c.shapeId);
        const [x, y, size] = SLOTS[i];
        return shape ? <ConstellationArt key={c.shapeId + i} shape={shape} x={x} y={y} size={size} title={`${shape.name} — ${c.notion}`} /> : null;
      })}
      <g transform="translate(905 70)">
        <circle r="44" fill="#fff6d0" opacity="0.08" />
        <circle r="30" fill="#2b3566" />
        {moon.d && <path d={moon.d} fill="#fff4cc" transform={moon.mirror ? 'scale(-1 1)' : undefined} />}
      </g>
    </svg>
  );
}
