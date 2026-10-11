import { useId } from 'react';

/** Rideau de velours rose poudré, plis en volume, retenu par une embrasse dorée. Le côté droit est le miroir du gauche. */
export function Curtain({ side }: { side: 'left' | 'right' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`h2-curtain ${side}`} viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}f`} x1="0" x2="1">
          <stop offset="0" stopColor="#E99AB0" />
          <stop offset="0.14" stopColor="#FBD3DD" />
          <stop offset="0.3" stopColor="#EFA8BB" />
          <stop offset="0.46" stopColor="#FCDCE4" />
          <stop offset="0.62" stopColor="#F0AEC0" />
          <stop offset="0.8" stopColor="#FAD0DA" />
          <stop offset="1" stopColor="#DC8AA2" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a3550" stopOpacity="0.28" />
          <stop offset="0.12" stopColor="#7a3550" stopOpacity="0" />
          <stop offset="0.85" stopColor="#7a3550" stopOpacity="0" />
          <stop offset="1" stopColor="#7a3550" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFEFB8" />
          <stop offset="0.5" stopColor="#F7C65B" />
          <stop offset="1" stopColor="#C98A2B" />
        </linearGradient>
      </defs>
      {/* tissu : large en haut, resserré par l'embrasse, évasé en bas */}
      <path
        d="M0 0 H100 C96 70 74 150 46 214 C70 260 86 330 92 400 H0 Z"
        fill={`url(#${id}f)`}
      />
      <path d="M0 0 H100 C96 70 74 150 46 214 C70 260 86 330 92 400 H0 Z" fill={`url(#${id}s)`} />
      {/* ourlet du bord intérieur */}
      <path d="M100 0 C96 70 74 150 46 214 C70 260 86 330 92 400" fill="none" stroke="#C9738E" strokeWidth="3" />
      <path d="M95 4 C91 70 70 148 43 212" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
      {/* embrasse dorée */}
      <path d="M-4 204 C18 196 38 200 52 210 C40 222 18 226 -4 222 Z" fill={`url(#${id}g)`} stroke="#A9701F" strokeWidth="1.5" />
      <circle cx="50" cy="214" r="7" fill={`url(#${id}g)`} stroke="#A9701F" strokeWidth="1.5" />
      <path d="M50 221 C48 236 52 246 47 258 M50 221 C54 236 58 244 56 256" stroke="#C98A2B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
