import { useId } from 'react';
import type { RewardId } from '../../domain/rewards';
import { useSettings } from '../hooks';
import { usePortraitUrl } from './Portrait';
import { Icon, type IconName } from './Icon';

function star(cx: number, cy: number, r: number) {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return p.join(' ');
}

const GOLD = '#f2c879';
const INK = '#2a2347';

/**
 * Leyu en tenue : cape, maillot (couleurs et numéro du mode parent), tête = portrait importé (sinon dessin simple).
 * Les objets gagnés se superposent. Image fixe, aucune animation.
 */
export function Avatar({ worn, size = 240, silhouette }: { worn: RewardId[]; size?: number; silhouette?: boolean }) {
  const settings = useSettings();
  const url = usePortraitUrl('leyu');
  const uid = useId().replace(/:/g, '');
  const j = settings?.jersey ?? { shirt: '#2ec4d6', shorts: '#1b2a5c', text: '#ffffff', name: 'LEYU', number: 11 };
  const has = (id: RewardId) => worn.includes(id);
  const cx = 120, hy = 125, hr = 66;

  return (
    <svg viewBox="0 0 240 340" width={size} height={(size * 340) / 240} role="img" aria-label="Leyu en tenue" style={silhouette ? { filter: 'brightness(0) opacity(0.35)' } : undefined}>
      <defs>
        <clipPath id={`${uid}head`}>
          <circle cx={cx} cy={hy} r={hr} />
        </clipPath>
      </defs>

      {/* Cape */}
      <path d="M62 190 C 30 240 22 300 26 330 L 214 330 C 218 300 210 240 178 190 Z" fill="#1d2a66" stroke={INK} strokeWidth="2.5" />
      {[
        [48, 300], [70, 258], [190, 296], [176, 250], [40, 322], [204, 320],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill={GOLD} opacity="0.8" />
      ))}
      {has('cape-star') && <polygon points={star(52, 276, 15)} fill={GOLD} stroke="#c58f2a" strokeWidth="1.5" />}
      {has('cape-moon') && <path d="M190 262 a16 16 0 1 0 0 32 a12 16 0 1 1 0 -32 z" fill="#fff3c4" stroke="#c58f2a" strokeWidth="1.5" />}

      {/* Jambes, short, chaussures */}
      <rect x="98" y="290" width="16" height="34" rx="7" fill="#c98f6b" />
      <rect x="126" y="290" width="16" height="34" rx="7" fill="#c98f6b" />
      <path d="M90 268 L150 268 L152 298 L124 298 L120 290 L116 298 L88 298 Z" fill={j.shorts} stroke={INK} strokeWidth="2" />
      {has('sneakers') ? (
        <>
          <path d="M90 334 q0 -14 16 -14 h8 q6 0 6 8 v6 z" fill={GOLD} stroke="#a8741c" strokeWidth="2" />
          <path d="M120 334 v-6 q0 -8 6 -8 h8 q16 0 16 14 z" fill={GOLD} stroke="#a8741c" strokeWidth="2" />
          <polygon points={star(104, 327, 3.5)} fill="#fff" />
          <polygon points={star(136, 327, 3.5)} fill="#fff" />
        </>
      ) : (
        <>
          <path d="M92 334 q0 -12 14 -12 h8 q6 0 6 6 v6 z" fill="#fff" stroke={INK} strokeWidth="2" />
          <path d="M120 334 v-6 q0 -6 6 -6 h8 q14 0 14 12 z" fill="#fff" stroke={INK} strokeWidth="2" />
        </>
      )}

      {/* Maillot */}
      <path d="M78 196 Q120 182 162 196 L168 272 Q120 280 72 272 Z" fill={j.shirt} stroke={INK} strokeWidth="2.5" />
      <path d="M106 190 L120 206 L134 190" fill="none" stroke={j.shorts} strokeWidth="5" strokeLinejoin="round" />
      <text x={cx} y="252" textAnchor="middle" fontSize="30" fontWeight="800" fill={j.text} fontFamily="Andika, sans-serif">
        {j.number}
      </text>

      {/* Écharpe */}
      {has('scarf') && (
        <>
          <path d="M84 192 Q120 210 156 192 L158 204 Q120 222 82 204 Z" fill={GOLD} stroke="#a8741c" strokeWidth="2" />
          <path d="M140 206 l10 34 l-14 -2 z" fill={GOLD} stroke="#a8741c" strokeWidth="2" />
        </>
      )}
      {/* Broche Ada */}
      {has('ada-brooch') && (
        <g transform="translate(150 222)">
          <circle r="11" fill={GOLD} stroke="#a8741c" strokeWidth="1.5" />
          <path d="M-6 5 C -7 -2 -4 -6 0 -6 C 4 -6 7 -2 6 5 Z M-6 -2 l-1 -6 l4 3 Z M6 -2 l1 -6 l-4 3 Z" fill="#1b1b2e" />
        </g>
      )}

      {/* Tête */}
      {url ? (
        <image href={url} x={cx - hr} y={hy - hr} width={hr * 2} height={hr * 2} clipPath={`url(#${uid}head)`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <g clipPath={`url(#${uid}head)`}>
          <rect x={cx - hr} y={hy - hr} width={hr * 2} height={hr * 2} fill="#4a2c1a" />
          <ellipse cx={cx} cy={hy + 10} rx="44" ry="50" fill="#d9a07a" />
          <path d={`M${cx - 50} ${hy - 6} C ${cx - 44} ${hy - 60} ${cx + 44} ${hy - 60} ${cx + 50} ${hy - 6} C ${cx + 30} ${hy - 30} ${cx - 30} ${hy - 30} ${cx - 50} ${hy - 6} Z`} fill="#4a2c1a" />
          <ellipse cx={cx - 16} cy={hy + 10} rx="7" ry="9" fill="#6b5a2e" />
          <ellipse cx={cx + 16} cy={hy + 10} rx="7" ry="9" fill="#6b5a2e" />
          <circle cx={cx - 18} cy={hy + 7} r="2.5" fill="#fff" />
          <circle cx={cx + 14} cy={hy + 7} r="2.5" fill="#fff" />
          <path d={`M${cx - 9} ${hy + 32} Q ${cx} ${hy + 40} ${cx + 9} ${hy + 32}`} stroke="#7a3b2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      <circle cx={cx} cy={hy} r={hr} fill="none" stroke={GOLD} strokeWidth="5" />

      {/* Chapeau ou couronne */}
      {has('hat') && (
        <g>
          <path d={`M${cx - 52} ${hy - 50} L ${cx + 18} 2 L ${cx + 46} ${hy - 54} Z`} fill="#1d2a66" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx={cx - 2} cy={hy - 52} rx="74" ry="14" fill="#1d2a66" stroke={INK} strokeWidth="2.5" />
          <path d={`M${cx - 44} ${hy - 58} Q ${cx} ${hy - 66} ${cx + 40} ${hy - 60}`} stroke={GOLD} strokeWidth="5" fill="none" />
          <polygon points={star(cx - 4, 38, 7)} fill={GOLD} />
          <polygon points={star(cx + 14, 20, 5)} fill={GOLD} />
          <polygon points={star(cx - 22, 58, 4.5)} fill={GOLD} />
        </g>
      )}
      {has('crown') && (
        <g>
          <path d={`M${cx - 46} ${hy - 50} L ${cx - 40} ${hy - 84} L ${cx - 20} ${hy - 64} L ${cx} ${hy - 96} L ${cx + 20} ${hy - 64} L ${cx + 40} ${hy - 84} L ${cx + 46} ${hy - 50} Z`} fill={GOLD} stroke="#a8741c" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points={star(cx, hy - 100, 9)} fill="#fff6c9" stroke="#a8741c" strokeWidth="1.5" />
          <polygon points={star(cx - 40, hy - 88, 6)} fill="#fff6c9" stroke="#a8741c" strokeWidth="1.5" />
          <polygon points={star(cx + 40, hy - 88, 6)} fill="#fff6c9" stroke="#a8741c" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

/** Icône d'un objet de la garde-robe (pour les vignettes). */
export function RewardIcon({ id, size = 36 }: { id: RewardId; size?: number }) {
  const name = ({ 'cape-star': 'star', scarf: 'scarf', 'ada-brooch': 'cat', 'cape-moon': 'moon', hat: 'hat', sneakers: 'sneakers', crown: 'crown' } as const satisfies Record<RewardId, IconName>)[id];
  return <Icon name={name} size={size} />;
}
