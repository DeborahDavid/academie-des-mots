import { useId } from 'react';

/**
 * Ada endormie en boule sur sa pile de grimoires (en attendant l'illustration A3).
 * `awake` : elle ouvre un œil vert (arrivée, constellation), puis se rendort.
 */
export function AdaSleeping({ awake }: { awake: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="ada-sleeping" viewBox="0 0 200 150" role="img" aria-label="Ada, la chatte noire de la tour, dort sur ses livres">
      <defs>
        <radialGradient id={`${id}fur`} cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#4A4466" />
          <stop offset="0.45" stopColor="#2A2540" />
          <stop offset="1" stopColor="#17142A" />
        </radialGradient>
        <linearGradient id={`${id}b1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8E80D0" />
          <stop offset="1" stopColor="#6F60B4" />
        </linearGradient>
        <linearGradient id={`${id}b2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E98FA8" />
          <stop offset="1" stopColor="#CF7090" />
        </linearGradient>
        <linearGradient id={`${id}b3`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FB98A" />
          <stop offset="1" stopColor="#5E9A6C" />
        </linearGradient>
      </defs>

      {/* ombre portée sur le rebord */}
      <ellipse cx="100" cy="144" rx="86" ry="5" fill="#5a3320" opacity="0.25" />

      {/* pile de grimoires : tranche de pages crème, dos colorés, filets dorés */}
      <g>
        <rect x="20" y="118" width="160" height="24" rx="4" fill={`url(#${id}b3)`} />
        <rect x="28" y="122" width="148" height="14" rx="2" fill="#FFF3DC" />
        <path d="M30 126h144M30 130h144" stroke="#E8D4B0" strokeWidth="1" />
        <rect x="20" y="118" width="12" height="24" rx="3" fill="#4F8A5D" />
        <path d="M24 122v16M28 122v16" stroke="#F7C65B" strokeWidth="1.4" />

        <rect x="32" y="98" width="142" height="21" rx="4" fill={`url(#${id}b2)`} />
        <rect x="32" y="102" width="132" height="13" rx="2" fill="#FFF6E6" />
        <path d="M34 106h128M34 110h128" stroke="#EBD9BC" strokeWidth="1" />
        <rect x="162" y="98" width="12" height="21" rx="3" fill="#B85C7C" />
        <path d="M166 102v13M170 102v13" stroke="#F7C65B" strokeWidth="1.4" />

        <rect x="24" y="79" width="146" height="20" rx="4" fill={`url(#${id}b1)`} />
        <rect x="36" y="83" width="134" height="12" rx="2" fill="#FFF3DC" />
        <path d="M38 87h130M38 91h130" stroke="#E8D4B0" strokeWidth="1" />
        <rect x="24" y="79" width="13" height="20" rx="3" fill="#5A4C9E" />
        <path d="M28.5 83v12M32.5 83v12" stroke="#F7C65B" strokeWidth="1.4" />
      </g>

      <g className="ada-body">
        {/* corps en boule */}
        <path d="M46 80 C40 52 74 30 112 31 C148 32 170 50 166 72 C164 82 150 84 112 84 C80 84 49 86 46 80 Z" fill={`url(#${id}fur)`} />
        {/* lueur chaude de la lampe sur le dos */}
        <path d="M70 41 C92 32 128 31 152 45" stroke="#FFC98A" strokeOpacity="0.55" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* patte avant repliée */}
        <path d="M56 80 C62 74 80 74 90 79 C90 84 60 86 56 80 Z" fill="#221E36" />
        <path d="M70 78 v4 M78 78 v4" stroke="#3B3558" strokeWidth="1.2" strokeLinecap="round" />
        {/* queue qui fait le tour */}
        <path d="M163 68 C176 84 150 92 112 88 C96 86 88 84 84 82" stroke={`url(#${id}fur)`} strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M86 81 C82 80 78 79 76 78" stroke="#2A2540" strokeWidth="11" strokeLinecap="round" />

        {/* tête posée */}
        <path d="M30 74 C25 56 37 44 53 44 C70 44 81 55 78 69 C75 82 35 88 30 74 Z" fill={`url(#${id}fur)`} />
        {/* oreilles + intérieur rose */}
        <path d="M33 56 L28 34 L47 46 Z" fill="#221E36" />
        <path d="M34 51 L32 39 L42 46 Z" fill="#F4B9C8" opacity="0.6" />
        <path d="M58 45 L70 28 L74 51 Z" fill="#221E36" />
        <path d="M62 46 L69 35 L71 49 Z" fill="#F4B9C8" opacity="0.6" />
        <path d="M44 47 C50 45 58 45 64 48" stroke="#FFC98A" strokeOpacity="0.5" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {awake ? (
          <>
            <ellipse cx="44" cy="63" rx="5" ry="3.6" fill="#8FE0A8" />
            <ellipse cx="44" cy="63" rx="1.4" ry="3.1" fill="#14111F" />
            <circle cx="45.6" cy="61.8" r="0.9" fill="#fff" />
            <path d="M57 64 q5.5 3.5 11 0" stroke="#8D86B0" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M38 63 q5.5 3.5 11 0" stroke="#8D86B0" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M57 64 q5.5 3.5 11 0" stroke="#8D86B0" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}
        <path d="M51 70.5 l2.4 1.8 l2.4 -1.8 z" fill="#F4A3B8" />
        <path d="M53.4 72.3 v1.6 M53.4 73.9 q-2.4 2 -4.6 0.6 M53.4 73.9 q2.4 2 4.6 0.6" stroke="#8D86B0" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {/* moustaches */}
        <path d="M36 72 l-12 -1 M36 75 l-11 2 M71 72 l12 -2 M71 75 l11 1" stroke="#8D86B0" strokeOpacity="0.7" strokeWidth="0.9" strokeLinecap="round" />
      </g>

      {!awake && (
        <g className="ada-z" fill="#7A6AB8" fontFamily="Fredoka, sans-serif" fontWeight="600">
          <text x="84" y="26" fontSize="15">z</text>
          <text x="97" y="14" fontSize="11">z</text>
        </g>
      )}
    </svg>
  );
}
